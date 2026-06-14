/**
 * Maps PCM world-state platforms to Spectrum / Operations adjudication inputs.
 * Training-tier: OSINT catalogue + grid-heuristic geometry only.
 */

import { PLATFORMS } from '@/data/seed-platforms';
import { capsHel, capsNavalCiws, capsRfJammer } from '@/data/capability-templates';
import { resolveCapabilities } from '@/lib/spectrum/fallback';
import {
  resolvePcmPlatformId,
} from '@/lib/pcm/pcm-platform-ids';
import { assessEngagement, propagationEngagementViable } from '@/lib/spectrum/engagement';
import { resolveJamFromEngagement } from '@/lib/spectrum/erp-resolve';
import { analyzePropagation } from '@/lib/propagation/analyze';
import type { PCM } from '@/lib/pcm/spectral.types';
import type { Platform as SpectrumPlatform } from '@/lib/spectrum/types';

type PcmPlatform = PCM.Platform;

/** Pedagogical kinetic Pk fallback when DB row missing. */
const KINETIC_PK_DEFAULTS: Record<string, Record<string, number>> = {
  'coyote-block-2': {
    'shahed-136': 72,
    'gerbera-parody': 68,
    'lancet-3': 55,
    'fpv-fibre-optic': 48,
    default: 50,
  },
};

export function gridToLatLon(grid: string): { lat: number; lon: number } {
  const letter = (grid.charAt(0) || 'E').toUpperCase();
  const letterIndex = letter.charCodeAt(0) - 'A'.charCodeAt(0);
  const numMatch = grid.match(/\d+/);
  const num = numMatch ? parseInt(numMatch[0], 10) : 5;
  return {
    lat: 48.0 + letterIndex * 0.08 + num * 0.002,
    lon: 11.0 + letterIndex * 0.12 + num * 0.003,
  };
}

export function estimateGridRangeKm(gridA: string, gridB: string): number {
  const a = gridToLatLon(gridA);
  const b = gridToLatLon(gridB);
  const dLat = (b.lat - a.lat) * 111;
  const dLon = (b.lon - a.lon) * 111 * Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180));
  return Math.sqrt(dLat * dLat + dLon * dLon);
}

export function gridRef(platform: PcmPlatform): string {
  return Array.isArray(platform.location_grid)
    ? platform.location_grid[0]
    : platform.location_grid || 'ECHO-7';
}

function resolvePlatformId(typeName: string): string | null {
  return resolvePcmPlatformId(typeName);
}

export function pcmToSpectrumRed(platform: PcmPlatform): SpectrumPlatform | null {
  const id = resolvePlatformId(platform.type);
  if (!id) return null;
  const seed = PLATFORMS.find((p) => p.id === id);
  if (!seed) return null;
  return {
    ...seed,
    side: 'red',
    capabilities: resolveCapabilities({ ...seed, capabilities: [] }),
  };
}

export function pcmToSpectrumBlue(platform: PcmPlatform): SpectrumPlatform | null {
  if (platform.group === 'c_uas_defeat_kinetic') {
    const rangeKm = platform.range_km || 10;
    return {
      id: platform.id,
      name: platform.type,
      side: 'blue',
      category: 'counter_uas',
      capabilities: capsNavalCiws(platform.id, rangeKm),
    };
  }
  if (platform.group === 'c_uas_defeat_ew') {
    const rangeKm = platform.range_km || 0.5;
    return {
      id: platform.id,
      name: platform.type,
      side: 'blue',
      category: 'counter_uas',
      capabilities: capsRfJammer(platform.id, rangeKm),
    };
  }
  if (platform.group === 'c_uas_defeat_dew') {
    const rangeKm = platform.range_km || 2;
    return {
      id: platform.id,
      name: platform.type,
      side: 'blue',
      category: 'counter_uas',
      capabilities: capsHel(platform.id, rangeKm),
    };
  }
  return pcmToSpectrumRed(platform);
}

export function lookupKineticPk(redType: string, blueType: string): number {
  const redId = resolvePlatformId(redType) ?? 'unknown';
  const blueId = resolvePlatformId(blueType) ?? 'coyote-block-2';
  const table = KINETIC_PK_DEFAULTS[blueId] ?? KINETIC_PK_DEFAULTS['coyote-block-2'];
  return table[redId] ?? table.default ?? 50;
}

export interface PcmPairAdjudication {
  combinedBlueSuccessPct: number;
  spectrumVerdict: string;
  inRange: boolean;
}

/** Sync pedagogical pair adjudication (no Supabase / buildings). */
export function adjudicatePcmPair(
  threat: PcmPlatform,
  defender: PcmPlatform,
  defeatMatrixPk: number | null,
): PcmPairAdjudication {
  const threatGrid = gridRef(threat);
  const defenderGrid = gridRef(defender);
  const rangeKm = estimateGridRangeKm(defenderGrid, threatGrid);
  const inRange = rangeKm <= (defender.range_km || 10);

  const red = pcmToSpectrumRed(threat);
  const blue = pcmToSpectrumBlue(defender);
  const spectrum = red && blue ? assessEngagement(red, blue) : {
    verdict: 'no_engagement' as const,
    headline: '',
    detail: '',
    overlaps: [],
    uncovered: [],
    recommendations: [],
    effectiveCoverage: 0,
  };

  const matrixPk =
    defeatMatrixPk ??
    lookupKineticPk(threat.type, defender.type);

  // P0-A: resolve actual jam freq/ERP from the spectrum overlap, not hardcoded constants
  const isRfJammer = defender.group === 'c_uas_defeat_ew';
  const jamTransmit = blue && isRfJammer
    ? resolveJamFromEngagement(blue, spectrum.overlaps)
    : null;

  // P0-C: Red GCS transmit ERP is the signal the jammer must overpower (J/S denominator).
  // Using GCS co-located with jammer = maximally conservative training approximation.
  const redControl = red?.capabilities?.find((c) => c.fn === 'control');
  const gcsErp_dbm = redControl?.power_dbm ?? 23; // 200 mW GCS EIRP default

  const propagation = analyzePropagation({
    emitter: {
      position: { ...gridToLatLon(defenderGrid), alt_m: 102 },
      freq_hz: jamTransmit?.freq_hz ?? 2.4e9,
      erp_dbm: gcsErp_dbm, // GCS control-link ERP — J/S signal baseline (P0-C)
    },
    receiver: {
      position: { ...gridToLatLon(threatGrid), alt_m: threat.altitude_m ?? 200 },
      sensitivity_dbm: -90,
    },
    environment: { urban_density: 'suburban', terrain_obstructed: false },
    jammer_erp_dbm: jamTransmit?.erp_dbm, // actual jammer ERP for J/S numerator (P0-A)
  });

  const jts = propagation.jam_to_signal_db ?? 0;
  // P0-A: gate on propagation viability — NLOS or J/S < 3 dB means band overlap is irrelevant
  const rfViable = isRfJammer
    ? propagationEngagementViable(spectrum.overlaps, propagation)
    : true;
  // jamBonus only applies to RF jammers; kinetic/DEW use neutral 0 (50 * 0.25 component)
  const jamBonus = isRfJammer
    ? (rfViable ? (jts > 10 ? 15 : jts > 0 ? 5 : -10) : -10)
    : 0;

  // Continuous spectrum score gated on RF link viability (P0-A)
  const spectrumScore = rfViable
    ? spectrum.verdict === 'defeat_likely' || spectrum.verdict === 'partial'
      ? Math.round(spectrum.effectiveCoverage * 90)
      : spectrum.verdict === 'detect_only'
        ? 22
        : 12
    : 12; // NLOS or J/S < 3 dB → band overlap is irrelevant; use kinetic floor

  let combined = inRange
    ? Math.round(matrixPk * 0.4 + spectrumScore * 0.35 + Math.min(100, 50 + jamBonus) * 0.25)
    : 0;

  // RF jammer with no viable propagation path — sharply reduce effectiveness (P0-A)
  if (!rfViable && isRfJammer) {
    combined = Math.round(combined * 0.55);
  }

  return {
    combinedBlueSuccessPct: Math.max(0, Math.min(100, combined)),
    spectrumVerdict: spectrum.verdict,
    inRange,
  };
}
