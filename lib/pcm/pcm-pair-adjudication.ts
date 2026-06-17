/**
 * Edition-gated PCM pair adjudication — Training grid physics or Operations laydown.
 */

import { adjudicatePair, type LaydownPairInput } from '@/lib/operations/adjudication';
import { isOperationsEdition } from '@/lib/operations/edition';
import { isPairTerrainMasked } from '@/lib/map/pair-terrain';
import { analyzePropagation } from '@/lib/propagation/analyze';
import { assessEngagement, propagationEngagementViable } from '@/lib/spectrum/engagement';
import { resolveJamFromEngagement } from '@/lib/spectrum/erp-resolve';
import type { PCM } from '@/lib/pcm/spectral.types';
import type { AdjudicationContext } from '@/lib/pcm/adjudication-context';
import type { DefeatLookupResult } from '@/lib/pcm/defeat-matrix-lookup';
import {
  estimateGridRangeKm,
  gridRef,
  gridToLatLon,
  pcmToSpectrumBlue,
  pcmToSpectrumRed,
} from '@/lib/pcm/pcm-spectrum-bridge';
import { resolveDefenderSystemId, resolvePcmPlatformId } from '@/lib/pcm/pcm-platform-ids';
import { selectAccreditedPk, type AccreditedDataLayer } from '@/lib/pcm/accredited-data-layer';
import type { AccreditedErpProfile } from '@/lib/operations/accredited-supplements-data';
import type { PropagationResult } from '@/lib/propagation/types';
import type { EngagementResult } from '@/lib/spectrum/types';

type PcmPlatform = PCM.Platform;

export interface TrainingPairOptions {
  accreditedData?: AccreditedDataLayer;
  accreditedErpRows?: AccreditedErpProfile[];
}

export interface PcmPairResult {
  combinedBlueSuccessPct: number;
  spectrumVerdict: string;
  inRange: boolean;
  isImmune: boolean;
  immuneReason: string | null;
  propagationGated: boolean;
  propagation?: PropagationResult;
  spectrum?: EngagementResult;
  defeatMatrixPk: number | null;
  /** 'accredited' if Pk came from accredited layer, 'osint' otherwise. */
  data_source?: 'accredited' | 'osint';
}

function combinedScore(
  matrixPk: number,
  spectrum: EngagementResult,
  jamBonus: number,
  inRange: boolean,
  propagationGated: boolean,
  isRfJammer: boolean,
  terrainMasked: boolean,
  ewPenalty: number,
): number {
  // Continuous spectrum score from defeat-resistance-weighted coverage (0–90).
  // Partial hardening is now penalised proportionally rather than stepped.
  // detect_only stays at 22; no_engagement / kinetic floor stays at 12.
  const spectrumScore =
    spectrum.verdict === 'defeat_likely' || spectrum.verdict === 'partial'
      ? Math.round(spectrum.effectiveCoverage * 90)
      : spectrum.verdict === 'detect_only'
        ? 22
        : 12;

  let combined = inRange
    ? Math.round(matrixPk * 0.4 + spectrumScore * 0.35 + Math.min(100, 50 + jamBonus) * 0.25)
    : 0;

  if (propagationGated && isRfJammer) combined = Math.round(combined * 0.55);
  if (terrainMasked) combined = Math.round(combined * 0.7);
  if (ewPenalty > 0) combined = Math.round(combined * (1 - ewPenalty));

  return Math.max(0, Math.min(100, combined));
}

export function recalcCombinedFromMatrixPk(base: PcmPairResult, newMatrixPk: number): number {
  const oldPk = base.defeatMatrixPk ?? 50;
  const rest = base.combinedBlueSuccessPct - Math.round(oldPk * 0.4);
  return Math.max(0, Math.min(100, Math.round(newMatrixPk * 0.4 + rest)));
}

export function applyAccreditedPkToResult(
  threat: PcmPlatform,
  defender: PcmPlatform,
  lookup: DefeatLookupResult,
  base: PcmPairResult,
  options?: TrainingPairOptions,
): PcmPairResult {
  const accRow = options?.accreditedData?.get(`${threat.id}:${defender.id}`);
  if (accRow?.is_immune) {
    return {
      combinedBlueSuccessPct: 0,
      spectrumVerdict: 'no_engagement',
      inRange: false,
      isImmune: true,
      immuneReason: accRow.immune_reason ?? 'Immune (operational accredited data)',
      propagationGated: true,
      defeatMatrixPk: null,
      data_source: 'accredited',
    };
  }
  const accreditedPk = accRow ? (selectAccreditedPk(accRow, defender.group ?? '') ?? null) : null;
  if (accreditedPk == null) return { ...base, data_source: base.data_source ?? 'osint' };
  return {
    ...base,
    defeatMatrixPk: accreditedPk,
    combinedBlueSuccessPct: recalcCombinedFromMatrixPk(base, accreditedPk),
    data_source: 'accredited',
  };
}

function trainingPairResult(
  threat: PcmPlatform,
  defender: PcmPlatform,
  lookup: DefeatLookupResult,
  worldState: PCM.WorldState,
  ewPenalty: number,
  options?: TrainingPairOptions,
): PcmPairResult {
  const accreditedData = options?.accreditedData;
  const accRow = accreditedData?.get(`${threat.id}:${defender.id}`);
  if (accRow?.is_immune) {
    return {
      combinedBlueSuccessPct: 0,
      spectrumVerdict: 'no_engagement',
      inRange: false,
      isImmune: true,
      immuneReason: accRow.immune_reason ?? 'Immune (accredited data layer)',
      propagationGated: true,
      defeatMatrixPk: null,
      data_source: 'accredited',
    };
  }

  if (lookup.isImmune) {
    return {
      combinedBlueSuccessPct: 0,
      spectrumVerdict: 'no_engagement',
      inRange: false,
      isImmune: true,
      immuneReason: lookup.immuneReason,
      propagationGated: true,
      defeatMatrixPk: null,
      data_source: 'osint',
    };
  }

  const threatGrid = gridRef(threat);
  const defenderGrid = gridRef(defender);
  const rangeKm = estimateGridRangeKm(defenderGrid, threatGrid);
  const inRange = rangeKm <= (defender.range_km || 10);

  const red = pcmToSpectrumRed(threat);
  const blue = pcmToSpectrumBlue(defender);
  const spectrum =
    red && blue
      ? assessEngagement(red, blue)
      : {
          verdict: 'no_engagement' as const,
          headline: '',
          detail: '',
          overlaps: [],
          uncovered: [],
          recommendations: [],
          effectiveCoverage: 0,
        };

  const accreditedPk = accRow
    ? (selectAccreditedPk(accRow, defender.group ?? '') ?? null)
    : null;

  const matrixPk = accreditedPk ?? lookup.defeatMatrixPk ?? 50;
  const isRfJammer = defender.group === 'c_uas_defeat_ew';

  const jamSystemId = resolveDefenderSystemId(defender.type, defender.group);
  const jamTransmit =
    blue && isRfJammer
      ? resolveJamFromEngagement(blue, spectrum.overlaps, {
          erpRows: options?.accreditedErpRows,
          systemId: jamSystemId,
        })
      : null;

  const isUrbanTerrain = Boolean(
    worldState.terrain?.urban_areas?.length &&
      worldState.terrain.primary_feature?.includes('urban'),
  );
  const urban = isUrbanTerrain ? 'urban' : 'suburban';

  // P0-C: Red GCS transmit ERP is the control-link signal the jammer must overpower.
  // GCS assumed co-located with the threat (maximally conservative training approximation).
  const redControl = red?.capabilities?.find((c) => c.fn === 'control');
  const gcsErp_dbm = redControl?.power_dbm ?? 23; // 200 mW GCS EIRP default

  const propagation = analyzePropagation({
    emitter: {
      position: { ...gridToLatLon(defenderGrid), alt_m: 102 },
      freq_hz: jamTransmit?.freq_hz ?? 2.4e9,
      erp_dbm: gcsErp_dbm, // GCS control-link ERP as J/S signal baseline (P0-C)
    },
    receiver: {
      position: { ...gridToLatLon(threatGrid), alt_m: threat.altitude_m ?? 200 },
      sensitivity_dbm: -90,
    },
    environment: {
      urban_density: urban,
      terrain_obstructed: false, // P0-B: training path has no terrain rays; precipitation ≠ terrain mask
      building_obstructed: false,
    },
    jammer_erp_dbm: jamTransmit?.erp_dbm, // actual jammer ERP for J/S numerator
  });

  const jts = propagation.jam_to_signal_db ?? 0;
  // Use propagationEngagementViable instead of the old NLOS-only check: also gates on J/S < 3 dB
  const rfViable = isRfJammer
    ? propagationEngagementViable(spectrum.overlaps, propagation)
    : true;
  const jamBonus = rfViable ? (jts > 10 ? 15 : jts > 0 ? 5 : -10) : -10;
  let propagationGated =
    !inRange || propagation.los_state === 'NLOS' || (isRfJammer && !rfViable);
  if (isUrbanTerrain) propagationGated = true;

  // When RF link is not viable, score spectrum as no_engagement — band overlap is irrelevant
  const scoringSpectrum: EngagementResult = rfViable
    ? spectrum
    : { ...spectrum, verdict: 'no_engagement' as const, effectiveCoverage: 0 };

  let combined = combinedScore(
    matrixPk,
    scoringSpectrum,
    jamBonus,
    inRange,
    propagationGated,
    isRfJammer,
    false,
    ewPenalty,
  );
  if (isUrbanTerrain) combined = Math.round(combined * 0.7);

  return {
    combinedBlueSuccessPct: combined,
    spectrumVerdict: spectrum.verdict,
    inRange,
    isImmune: false,
    immuneReason: null,
    propagationGated,
    propagation,
    spectrum,
    defeatMatrixPk: matrixPk,
    data_source: accreditedPk != null ? 'accredited' : 'osint',
  };
}

async function operationsPairResult(
  threat: PcmPlatform,
  defender: PcmPlatform,
  lookup: DefeatLookupResult,
  worldState: PCM.WorldState,
  ctx: AdjudicationContext,
): Promise<PcmPairResult> {
  const options: TrainingPairOptions = {
    accreditedData: ctx.accreditedData,
    accreditedErpRows: ctx.accreditedErpRows,
  };
  if (lookup.isImmune) {
    return trainingPairResult(threat, defender, lookup, worldState, ctx.ewInterceptPenalty, options);
  }

  const platformId = resolvePcmPlatformId(threat.type);
  const threatPos = gridToLatLon(gridRef(threat));
  const defenderPos = gridToLatLon(gridRef(defender));
  const rangeKm = estimateGridRangeKm(gridRef(defender), gridRef(threat));
  const inRange = rangeKm <= (defender.range_km || 10);

  const terrainMask = isPairTerrainMasked(
    defenderPos.lon,
    defenderPos.lat,
    threatPos.lon,
    threatPos.lat,
    undefined,
  );

  const uasAsset = {
    id: platformId ?? threat.id,
    name: threat.type,
    slug: platformId ?? threat.id,
    category: 'loitering_munition' as const,
    categoryLabel: threat.type,
    image_url: null,
    max_altitude_agl_m: threat.altitude_m ?? 200,
    altitude_reference: 'AGL' as const,
    max_range_km: threat.range_km ?? 10,
    max_speed_kmh: (threat.speed_kt ?? 100) * 1.852,
    endurance_min: Math.round((threat.endurance_hr ?? 1) * 60),
    climb_rate_mpm: 500,
  };

  const methods =
    defender.group === 'c_uas_defeat_ew'
      ? ['RF_jamming']
      : defender.group === 'c_uas_defeat_dew'
        ? ['directed_energy']
        : ['kinetic'];

  const cuasAsset = {
    id: defender.id,
    name: defender.type,
    categoryLabel: defender.type,
    image_url: null,
    defeat_range_m: (defender.range_km ?? 10) * 1000,
    defeat_range_km: defender.range_km ?? 10,
    defeat_methods: methods,
  };

  const input: LaydownPairInput = {
    uas: {
      instanceId: threat.id,
      asset: uasAsset,
      lat: threatPos.lat,
      lon: threatPos.lon,
      discAltitude_m: threat.altitude_m ?? 200,
      terrainAMSL: 100,
    },
    cuas: {
      instanceId: defender.id,
      asset: cuasAsset,
      lat: defenderPos.lat,
      lon: defenderPos.lon,
      terrainAMSL: 100,
    },
    defeatMatrixPk: lookup.defeatMatrixPk,
    inDefeatRange: inRange,
    terrainMasked: terrainMask.masked,
    tenantId: ctx.tenantId ?? 'training',
  };

  const adj = await adjudicatePair(input);
  let combined = adj.combinedBlueSuccessPct;
  if (ctx.ewInterceptPenalty > 0) combined = Math.round(combined * (1 - ctx.ewInterceptPenalty));

  const base: PcmPairResult = {
    combinedBlueSuccessPct: Math.max(0, Math.min(100, combined)),
    spectrumVerdict: adj.spectrum.verdict,
    inRange,
    isImmune: false,
    immuneReason: null,
    propagationGated: adj.propagationGated,
    propagation: adj.propagation,
    spectrum: adj.spectrum,
    defeatMatrixPk: lookup.defeatMatrixPk,
    data_source: 'osint',
  };
  return applyAccreditedPkToResult(threat, defender, lookup, base, options);
}

export async function adjudicatePcmPairAsync(
  threat: PcmPlatform,
  defender: PcmPlatform,
  lookup: DefeatLookupResult,
  worldState: PCM.WorldState,
  ctx: AdjudicationContext,
): Promise<PcmPairResult> {
  if (isOperationsEdition() && ctx.tenantId) {
    return operationsPairResult(threat, defender, lookup, worldState, ctx);
  }
  return trainingPairResult(threat, defender, lookup, worldState, ctx.ewInterceptPenalty, {
    accreditedData: ctx.accreditedData,
    accreditedErpRows: ctx.accreditedErpRows,
  });
}

/** Sync read from preloaded cache (WSE must preload before resolveTurn). */
export function getCachedPairResult(
  ctx: AdjudicationContext,
  threat: PcmPlatform,
  defender: PcmPlatform,
): PcmPairResult {
  const key = `${threat.id}:${defender.id}`;
  const cached = ctx.pairResults.get(key);
  if (cached) return cached;

  const lookup = ctx.defeatMatrix.lookup(threat, defender);
  return trainingPairResult(threat, defender, lookup, { weather: {}, terrain: {} } as PCM.WorldState, ctx.ewInterceptPenalty, {
    accreditedData: ctx.accreditedData,
    accreditedErpRows: ctx.accreditedErpRows,
  });
}

export async function preloadPairCache(
  ctx: AdjudicationContext,
  worldState: PCM.WorldState,
  threats: PcmPlatform[],
  defenders: PcmPlatform[],
): Promise<void> {
  const jobs: Promise<void>[] = [];
  for (const threat of threats) {
    for (const defender of defenders) {
      const key = `${threat.id}:${defender.id}`;
      const lookup = ctx.defeatMatrix.lookup(threat, defender);
      jobs.push(
        adjudicatePcmPairAsync(threat, defender, lookup, worldState, ctx).then((r) => {
          ctx.pairResults.set(key, r);
        }),
      );
    }
  }
  await Promise.all(jobs);
}

/** Back-compat sync wrapper using cache only. */
export function adjudicatePcmPairFromCtx(
  ctx: AdjudicationContext,
  threat: PcmPlatform,
  defender: PcmPlatform,
  worldState: PCM.WorldState,
): PcmPairResult {
  const key = `${threat.id}:${defender.id}`;
  if (ctx.pairResults.has(key)) return ctx.pairResults.get(key)!;
  const lookup = ctx.defeatMatrix.lookup(threat, defender);
  return trainingPairResult(threat, defender, lookup, worldState, ctx.ewInterceptPenalty, {
    accreditedData: ctx.accreditedData,
    accreditedErpRows: ctx.accreditedErpRows,
  });
}
