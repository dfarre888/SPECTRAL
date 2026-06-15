/**
 * Map Intel laydown -> PCM adjudication provenance (Pd components + pair results).
 */

import type { PairLaydownAssessment } from '@/lib/map/laydown-analysis';
import type { LaydownSessionPair } from '@/lib/map/laydown-session';
import type { PlacedCuas, PlacedRadar, PlacedUas } from '@/lib/map/types';
import { resolveSpectrumUas } from '@/lib/map/spectrum-bridge';
import {
  fogOfWarEngine,
  type PdComponents,
  type SensorEnvironment,
} from '@/lib/pcm/fogOfWarEngine';
import type { PcmPairResult } from '@/lib/pcm/pcm-pair-adjudication';
import { resolvePlatformPerformanceView } from '@/lib/pcm/platform-performance-view';
import type { PCM } from '@/lib/pcm/spectral.types';
import { haversineM } from '@/lib/propagation/geo';
import type { Platform } from '@/lib/types';
import type { PlatformCategory } from '@/lib/types';

type PcmPlatform = PCM.Platform;
type DetectionMethod = PCM.DetectionMethod;

const DEFAULT_CLEAR_WEATHER: PCM.Weather = {
  visibility_km: 20,
  cloud_base_ft: 5000,
  wind_speed_kt: 5,
  wind_bearing_deg: 270,
  temperature_c: 18,
  precipitation: 'none',
  sea_state: 1,
  eo_ir_modifier: 1.0,
  radar_modifier: 1.0,
  rf_propagation_modifier: 1.0,
  fpv_flyable: true,
};

export function defaultSensorEnvironment(
  defenderPlatforms?: PcmPlatform[],
): SensorEnvironment {
  return {
    weather: DEFAULT_CLEAR_WEATHER,
    ew_assets_active: [],
    time_of_day: 'midday',
    terrain_type: 'open',
    detecting_force: 'BLUE',
    defender_platforms: defenderPlatforms,
  };
}

function mapUasCategoryToGroup(category: PlatformCategory): PCM.PlatformGroup {
  switch (category) {
    case 'loitering_munition':
    case 'tube_launched_lm':
      return 'OWA';
    case 'FPV':
      return 'FPV';
    case 'MALE':
      return 'MALE_strike';
    case 'HALE':
      return 'HALE_isr';
    case 'tactical':
    case 'fixed_wing_tactical':
    case 'VTOL':
      return 'MALE_isr';
    case 'interceptor_uas':
      return 'UCAV';
    default:
      return 'loitering_munition';
  }
}

function mapCatalogGuidance(
  guidance: Platform['guidance_type'],
): PCM.GuidanceType {
  if (guidance === 'fibre_optic') return 'fibre_optic_FPV';
  if (guidance === 'INS+EO') return 'optical_AI_terminal';
  if (guidance === 'autonomous') return 'autonomous_swarm';
  if (guidance === 'preprogrammed') return 'pre_programmed';
  if (guidance === 'RF_command') return 'RF_FPV';
  return 'GNSS_INS';
}

function isFibreOpticUas(assetId: string, category: PlatformCategory): boolean {
  if (category === 'FPV' && assetId.includes('fibre')) return true;
  const spec = resolveSpectrumUas(assetId);
  return (
    spec?.capabilities?.some((c) => c.defeat_resistance?.includes('rf_silent')) ?? false
  );
}

function cuasGroupFromMethods(methods: string[]): PCM.PlatformGroup {
  const lower = methods.map((m) => m.toLowerCase());
  if (lower.some((m) => m.includes('laser') || m.includes('directed_energy'))) {
    return 'c_uas_defeat_dew';
  }
  if (lower.some((m) => m.includes('kinetic') || m.includes('net'))) {
    return 'c_uas_defeat_kinetic';
  }
  return 'c_uas_defeat_ew';
}

function buildPcmPlatformFromMapCuas(placed: PlacedCuas): PcmPlatform {
  const perf = resolvePlatformPerformanceView(placed.asset.id);
  return {
    id: placed.instanceId,
    type: placed.asset.name,
    group: cuasGroupFromMethods(placed.asset.defeat_methods ?? []),
    quantity: 1,
    quantity_remaining: 1,
    location_grid: 'ECHO-7',
    altitude_m: placed.terrainAMSL,
    status: 'ground_ready',
    fuel_state_percent: 100,
    payload: '',
    guidance: 'pre_programmed',
    ew_immune: false,
    rcs_class: perf.rcs_class,
    speed_kt: 0,
    ceiling_ft: 0,
    range_km: placed.asset.defeat_range_km,
    endurance_hr: 0,
  };
}

function buildPcmPlatformFromMapRadar(placed: PlacedRadar): PcmPlatform {
  const perf = resolvePlatformPerformanceView(placed.asset.id, {
    radarId: placed.asset.id,
  });
  return {
    id: placed.instanceId,
    type: placed.asset.name,
    group: 'c_uas_detect',
    quantity: 1,
    quantity_remaining: 1,
    location_grid: 'ECHO-7',
    altitude_m: placed.terrainAMSL,
    status: 'ground_ready',
    fuel_state_percent: 100,
    payload: '',
    guidance: 'pre_programmed',
    sensor: placed.asset.id,
    ew_immune: false,
    rcs_class: perf.rcs_class,
    speed_kt: 0,
    ceiling_ft: 0,
    range_km: placed.asset.detection_range_km,
    endurance_hr: 0,
  };
}

export function buildPcmPlatformFromMapUas(placed: PlacedUas): PcmPlatform {
  const perf = resolvePlatformPerformanceView(placed.asset.id);
  const fibreOptic = isFibreOpticUas(placed.asset.id, placed.asset.category);
  return {
    id: placed.instanceId,
    type: placed.asset.name,
    group: mapUasCategoryToGroup(placed.asset.category),
    quantity: 1,
    quantity_remaining: 1,
    location_grid: 'ECHO-7',
    altitude_m: placed.discAltitude_m,
    status: 'airborne_tasked',
    fuel_state_percent: 100,
    payload: '',
    guidance: fibreOptic ? 'fibre_optic_FPV' : 'GNSS_INS',
    ew_immune: fibreOptic,
    rcs_class: perf.rcs_class,
    speed_kt: Math.round((placed.asset.max_speed_kmh ?? 100) * 0.54),
    ceiling_ft: Math.round((placed.ceilingAMSL_m ?? 4000) * 3.28084),
    range_km: placed.effectiveRange_km ?? placed.asset.max_range_km,
    endurance_hr: (placed.asset.endurance_min ?? 60) / 60,
  };
}

export function buildPcmPlatformFromCatalog(
  platform: Platform,
  altitude_m: number,
): PcmPlatform {
  const perf = resolvePlatformPerformanceView(platform.id);
  const fibreOptic = platform.guidance_type === 'fibre_optic';
  return {
    id: platform.id,
    type: platform.name,
    group: mapUasCategoryToGroup(platform.category),
    quantity: 1,
    quantity_remaining: 1,
    location_grid: 'ECHO-7',
    altitude_m,
    status: 'airborne_tasked',
    fuel_state_percent: 100,
    payload: '',
    guidance: mapCatalogGuidance(platform.guidance_type),
    ew_immune: fibreOptic || platform.gnss_independent,
    rcs_class: perf.rcs_class,
    speed_kt: Math.round((platform.max_speed_kmh ?? 100) * 0.54),
    ceiling_ft: Math.round((platform.service_ceiling_m ?? 4000) * 3.28084),
    range_km: platform.range_km ?? 100,
    endurance_hr: platform.endurance_hrs ?? 1,
  };
}

function pickDetectionMethod(
  cuas: PlacedCuas,
  radars?: PlacedRadar[],
): DetectionMethod {
  if (radars?.length) return 'radar';
  const methods = cuas.asset.defeat_methods ?? [];
  if (methods.some((m) => m.toLowerCase().includes('rf'))) return 'rf_sigint';
  return 'eo_ir';
}

export function computeMapDetectionPd(
  placedUas: PlacedUas,
  placedCuas: PlacedCuas,
  placedRadars?: PlacedRadar[],
): PdComponents {
  const threat = buildPcmPlatformFromMapUas(placedUas);
  const rangeKm = haversineM(
    placedCuas.lat,
    placedCuas.lon,
    placedUas.lat,
    placedUas.lon,
  ) / 1000;

  const defenders: PcmPlatform[] = [buildPcmPlatformFromMapCuas(placedCuas)];
  for (const radar of placedRadars ?? []) {
    defenders.push(buildPcmPlatformFromMapRadar(radar));
  }

  const sensorType = pickDetectionMethod(placedCuas, placedRadars);
  const env = defaultSensorEnvironment(defenders);
  return fogOfWarEngine.calculatePd(threat, sensorType, env, rangeKm);
}

export function computeCatalogDetectionPd(
  platform: Platform,
  rangeKm: number,
  altitude_m: number,
): PdComponents {
  const threat = buildPcmPlatformFromCatalog(platform, altitude_m);
  const env = defaultSensorEnvironment();
  return fogOfWarEngine.calculatePd(threat, 'radar', env, rangeKm);
}

export function sessionPairToPcmPairResult(entry: LaydownSessionPair): PcmPairResult {
  const combined = entry.operationsPk ?? entry.staticPk ?? 0;
  return {
    combinedBlueSuccessPct: combined,
    spectrumVerdict: entry.operationsPk != null ? 'partial' : 'no_engagement',
    inRange: !entry.propagationGated && entry.los_state !== 'blocked',
    isImmune: false,
    immuneReason: null,
    propagationGated: entry.propagationGated,
    defeatMatrixPk: entry.staticPk,
  };
}

export function laydownPairToPcmPairResult(pair: PairLaydownAssessment): PcmPairResult {
  return {
    combinedBlueSuccessPct: pair.blueSuccessPct,
    spectrumVerdict: pair.spectrum.verdict,
    inRange: pair.inDefeatRange,
    isImmune: pair.isImmune,
    immuneReason: pair.isImmune ? 'Immune to primary defeat type' : null,
    propagationGated: pair.propagation?.propagationGated ?? false,
    defeatMatrixPk: pair.defeatMatrixPk,
    spectrum: pair.spectrum,
  };
}

export interface MapPairProvenance {
  pd: PdComponents;
  pair: PcmPairResult;
}

export function resolveMapPairProvenance(
  pair: PairLaydownAssessment,
  placedUas: PlacedUas[],
  placedCuas: PlacedCuas[],
  placedRadars?: PlacedRadar[],
): MapPairProvenance | null {
  const uas = placedUas.find((u) => u.instanceId === pair.uasInstanceId);
  const cuas = placedCuas.find((c) => c.instanceId === pair.cuasInstanceId);
  if (!uas || !cuas) return null;

  return {
    pd: computeMapDetectionPd(uas, cuas, placedRadars),
    pair: laydownPairToPcmPairResult(pair),
  };
}
