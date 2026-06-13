/**
 * Maps PCM world-state platforms to Spectrum / Operations adjudication inputs.
 * Training-tier: OSINT catalogue + grid-heuristic geometry only.
 */

import { PLATFORMS } from '@/data/seed-platforms';
import { PLATFORM_ID_ALIASES } from '@/data/osint-platform-enrichment';
import { capsNavalCiws, capsRfJammer } from '@/data/capability-templates';
import { resolveCapabilities } from '@/lib/spectrum/fallback';
import { assessEngagement } from '@/lib/spectrum/engagement';
import { analyzePropagation } from '@/lib/propagation/analyze';
import type { PCM } from '@/lib/pcm/spectral.types';
import type { Platform as SpectrumPlatform } from '@/lib/spectrum/types';

type PcmPlatform = PCM.Platform;

const TYPE_TO_PLATFORM_ID: Record<string, string> = {
  'Shahed-136': 'shahed-136',
  'Shahed-238': 'shahed-238',
  'Lancet-3': 'lancet-3',
  'Gerbera': 'gerbera-parody',
  'Bayraktar TB2': 'bayraktar-tb2',
  'Coyote Block 2': 'coyote-block-2',
  'FPV_fibre_optic': 'fpv-fibre-optic',
  'Magura V5': 'magura-v5',
  'GJ-11': 'gj-11-sharp-sword',
};

/** Pedagogical kinetic Pk defaults (OSINT training — not classified). */
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
  const key = TYPE_TO_PLATFORM_ID[typeName] ?? typeName.toLowerCase().replace(/\s+/g, '-');
  const normalized = PLATFORM_ID_ALIASES[key] ?? key;
  const found = PLATFORMS.find((p) => p.id === normalized || p.name === typeName);
  return found?.id ?? null;
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
  };

  const matrixPk =
    defeatMatrixPk ??
    lookupKineticPk(threat.type, defender.type);

  const propagation = analyzePropagation({
    emitter: {
      position: { ...gridToLatLon(defenderGrid), alt_m: 102 },
      freq_hz: 2.4e9,
      erp_dbm: defender.group === 'c_uas_defeat_ew' ? 40 : 0,
    },
    receiver: {
      position: { ...gridToLatLon(threatGrid), alt_m: threat.altitude_m ?? 200 },
      sensitivity_dbm: -90,
    },
    environment: { urban_density: 'suburban', terrain_obstructed: false },
    jammer_erp_dbm: defender.group === 'c_uas_defeat_ew' ? 40 : undefined,
  });

  const spectrumScore =
    spectrum.verdict === 'defeat_likely'
      ? 82
      : spectrum.verdict === 'partial'
        ? 48
        : spectrum.verdict === 'detect_only'
          ? 22
          : 12;

  let combined = inRange
    ? Math.round(matrixPk * 0.4 + spectrumScore * 0.35 + 50 * 0.25)
    : 0;

  if (defender.group === 'c_uas_defeat_ew' && propagation.los_state === 'NLOS') {
    combined = Math.round(combined * 0.55);
  }

  return {
    combinedBlueSuccessPct: Math.max(0, Math.min(100, combined)),
    spectrumVerdict: spectrum.verdict,
    inRange,
  };
}
