/**
 * Unified OSINT platform performance view for PCM detection and adjudication.
 */

import { BLUE_RADARS } from '@/data/seed-radars-blue';
import { RED_RADARS } from '@/data/seed-radars-red';
import { EXTRA_RADARS } from '@/data/seed-radars-extra';
import { PLATFORMS } from '@/data/seed-platforms';
import { resolveSpectrumUas } from '@/lib/map/spectrum-bridge';
import { radarDetectionRangeKm } from '@/lib/map/spectra-assets';
import type { DefeatMatrixCache } from '@/lib/pcm/defeat-matrix-lookup';
import {
  resolveDefenderSystemId,
  resolvePcmPlatformId,
} from '@/lib/pcm/pcm-platform-ids';
import { pcmToSpectrumRed } from '@/lib/pcm/pcm-spectrum-bridge';
import type { PCM } from '@/lib/pcm/spectral.types';
type DetectionMethod = PCM.DetectionMethod;
import type { RadarSystem } from '@/lib/spectrum/radar-types';

export type PerformanceConfidence = 'curated' | 'estimated' | 'derived';

export interface PlatformPerformanceView {
  platformId: string;
  name: string;
  rcs_class: PCM.Platform['rcs_class'];
  sensor_detection_range_km: Partial<Record<DetectionMethod, number>>;
  defeat_matrix_pk: number | null;
  spectrum_capabilities_summary: string;
  confidence: PerformanceConfidence;
  source_notes: string[];
}

const ALL_RADARS: RadarSystem[] = [...BLUE_RADARS, ...RED_RADARS, ...EXTRA_RADARS];
const RADAR_BY_ID = new Map(ALL_RADARS.map((r) => [r.id, r]));

export interface ResolvePerformanceOptions {
  defeatMatrix?: DefeatMatrixCache;
  defender?: PCM.Platform;
  radarId?: string;
}

function rcsFromCatalogue(platformId: string, fallback: PCM.Platform['rcs_class']): PCM.Platform['rcs_class'] {
  const seed = PLATFORMS.find((p) => p.id === platformId);
  if (!seed) return fallback;
  const group = seed.group ?? 3;
  if (group === 1) return 'very_low';
  if (group === 2) return 'low';
  if (seed.category?.toLowerCase().includes('stealth')) return 'very_low';
  if (seed.category?.toLowerCase().includes('owa') || seed.id.includes('shahed')) return 'low';
  return fallback;
}

function lookupRadar(radarId: string | undefined): RadarSystem | null {
  if (!radarId) return null;
  return RADAR_BY_ID.get(radarId) ?? null;
}

function radarRangeForSensor(radar: RadarSystem, sensorType: DetectionMethod): number | undefined {
  if (sensorType === 'radar') {
    return (
      radar.range_vs_small_uas_km ??
      radar.range_vs_fighter_km ??
      radar.instrumented_range_km ??
      radarDetectionRangeKm(radar)
    );
  }
  if (sensorType === 'eo_ir' || sensorType === 'visual') {
    return Math.min(radar.instrumented_range_km ?? 80, 80);
  }
  return undefined;
}

function spectrumSummary(platformId: string): { summary: string; confidence: PerformanceConfidence; notes: string[] } {
  const spec = resolveSpectrumUas(platformId);
  if (!spec?.capabilities?.length) {
    return {
      summary: 'No spectrum capabilities resolved',
      confidence: 'estimated',
      notes: ['Capability seed missing — using PCM defaults'],
    };
  }

  const bands = spec.capabilities
    .filter((c) => c.freq_low_hz != null)
    .map((c) => c.label)
    .slice(0, 4);

  const rfSilent = spec.capabilities.some((c) => c.defeat_resistance?.includes('rf_silent'));
  const summary = rfSilent
    ? 'RF-silent / fibre-optic — no control-link emissions'
    : bands.length
      ? `Emits: ${bands.join('; ')}`
      : `${spec.capabilities.length} capability region(s)`;

  const notes: string[] = [];
  if (spec.confidence === 'curated') notes.push(`OSINT catalogue: ${spec.name}`);
  if (rfSilent) notes.push('RF SIGINT detection severely limited (assessed)');

  return {
    summary,
    confidence: spec.confidence === 'curated' ? 'curated' : 'estimated',
    notes,
  };
}

/** Logistic range decay multiplier for detection Pd. */
export function rangePdFactor(rangeKm: number, detectionRangeKm: number): number {
  if (detectionRangeKm <= 0) return 0;
  if (rangeKm <= 0) return 1;
  const ratio = rangeKm / detectionRangeKm;
  return 1 / (1 + Math.exp(8 * (ratio - 1)));
}

export function resolveDefenderSensorRange(
  defender: PCM.Platform,
  sensorType: DetectionMethod,
  radarId?: string,
): number {
  const radar =
    lookupRadar(radarId ?? defender.sensor) ??
    lookupRadar(resolveDefenderSystemId(defender.type, defender.group));

  if (radar) {
    const r = radarRangeForSensor(radar, sensorType);
    if (r != null && r > 0) return r;
  }

  switch (sensorType) {
    case 'radar':
      return defender.range_km ?? 40;
    case 'eo_ir':
    case 'visual':
      return Math.min(defender.range_km ?? 15, 15);
    case 'rf_sigint':
      return defender.range_km ?? 30;
    case 'acoustic':
      return 5;
    default:
      return defender.range_km ?? 20;
  }
}

export function resolvePlatformPerformanceView(
  platformId: string,
  options: ResolvePerformanceOptions = {},
): PlatformPerformanceView {
  const catalogueId = resolvePcmPlatformId(platformId) ?? platformId;
  const seed = PLATFORMS.find((p) => p.id === catalogueId);
  const spec = resolveSpectrumUas(catalogueId);
  const { summary, confidence: specConf, notes: specNotes } = spectrumSummary(catalogueId);

  const rcs = rcsFromCatalogue(catalogueId, 'low');
  const sensorRanges: Partial<Record<DetectionMethod, number>> = {
    radar: 35,
    eo_ir: 12,
    rf_sigint: 25,
    acoustic: 3,
    visual: 5,
  };

  const linkedRadar = lookupRadar(options.radarId);
  if (linkedRadar) {
    for (const method of ['radar', 'eo_ir', 'visual', 'rf_sigint'] as DetectionMethod[]) {
      const r = radarRangeForSensor(linkedRadar, method);
      if (r != null) sensorRanges[method] = r;
    }
  }

  let defeatPk: number | null = null;
  const sourceNotes = [...specNotes];

  if (options.defeatMatrix && options.defender) {
    const threatStub: PCM.Platform = {
      id: platformId,
      type: seed?.name ?? platformId,
      group: 'OWA',
      quantity: 1,
      quantity_remaining: 1,
      location_grid: 'ECHO-7',
      altitude_m: 200,
      status: 'airborne_tasked',
      fuel_state_percent: 100,
      payload: '',
      guidance: 'GNSS_INS',
      ew_immune: spec?.capabilities?.some((c) => c.defeat_resistance?.includes('rf_silent')) ?? false,
      rcs_class: rcs,
      speed_kt: 100,
      ceiling_ft: 10000,
      range_km: seed?.range_km ?? 100,
      endurance_hr: 1,
    };
    const lookup = options.defeatMatrix.lookup(threatStub, options.defender);
    defeatPk = lookup.defeatMatrixPk;
    if (lookup.defeatMatrixPk != null) {
      sourceNotes.push(`Defeat matrix Pk=${lookup.defeatMatrixPk}% (${lookup.defeatType})`);
    }
  }

  if (seed?.intel_note) sourceNotes.push(seed.intel_note.slice(0, 120));

  return {
    platformId: catalogueId,
    name: seed?.name ?? platformId,
    rcs_class: rcs,
    sensor_detection_range_km: sensorRanges,
    defeat_matrix_pk: defeatPk,
    spectrum_capabilities_summary: summary,
    confidence: specConf,
    source_notes: sourceNotes,
  };
}
