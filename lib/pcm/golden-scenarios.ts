/**
 * PCM golden scenarios — regression anchors for detection + laydown spectrum.
 */

import { BAND_TILES } from '@/components/spectrum/band-tile-data';
import {
  emissionsForTile,
  resolveLaydownEmissions,
  type LaydownEmission,
} from '@/lib/map/laydown-tiles';
import { fogOfWarEngine, type PdComponents, type SensorEnvironment } from '@/lib/pcm/fogOfWarEngine';
import { EW_MOD } from '@/lib/pcm/detectionConstants';
import { rangePdFactor, resolveDefenderSensorRange } from '@/lib/pcm/platform-performance-view';
import type { PCM } from '@/lib/pcm/spectral.types';
import type { PlacedCuas, PlacedRadar, PlacedUas } from '@/lib/map/types';

export type GoldenScenarioId =
  | 'iron_crow_shahed_krasukha'
  | 'shahed_dronegun_uhf'
  | 'thaad_tpy2_xband'
  | 'fibre_optic_rf_blind';

export interface GoldenScenarioAssertion {
  id: GoldenScenarioId;
  label: string;
  description: string;
}

export const GOLDEN_SCENARIOS: GoldenScenarioAssertion[] = [
  {
    id: 'iron_crow_shahed_krasukha',
    label: 'IRON CROW — Shahed vs Krasukha',
    description:
      'Assessed: Krasukha-class noise collapses Shahed-136 radar Pd below engagement threshold.',
  },
  {
    id: 'shahed_dronegun_uhf',
    label: 'Shahed × DroneGun — UHF laydown overlap',
    description: 'DroneGun and Shahed emissions intersect the UHF battlespace tile.',
  },
  {
    id: 'thaad_tpy2_xband',
    label: 'THAAD AN/TPY-2 — X-band laydown + range decay',
    description: 'TPY-2 on SHF tile; rangePdFactor suppresses Pd beyond instrumented range.',
  },
  {
    id: 'fibre_optic_rf_blind',
    label: 'Fibre-optic FPV — RF blind',
    description: 'RF SIGINT Pd near zero for fibre-optic FPV.',
  },
];


const clearWeather: PCM.Weather = {
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

const krasukhaEW: PCM.EWAsset = {
  id: 'RED-EW-01',
  type: 'Krasukha-4_analogue',
  status: 'active',
  location_grid: 'HOTEL-9',
  jam_bands: ['L', 'S', 'C', 'X'],
  effective_radius_km: 40,
  affected_platform_ids: [],
};

function baseShahed(overrides: Partial<PCM.Platform> = {}): PCM.Platform {
  return {
    id: 'RED-UAS-01',
    type: 'Shahed-136',
    group: 'OWA',
    quantity: 1,
    quantity_remaining: 1,
    location_grid: 'ECHO-7',
    altitude_m: 200,
    status: 'airborne_tasked',
    fuel_state_percent: 80,
    payload: '90kg_HE',
    guidance: 'GNSS_INS',
    ew_immune: false,
    rcs_class: 'low',
    speed_kt: 100,
    ceiling_ft: 10000,
    range_km: 2500,
    endurance_hr: 5,
    ...overrides,
  };
}


function minimalUas(assetId: string, name: string, instanceId: string): PlacedUas {
  return {
    instanceId,
    asset: {
      id: assetId,
      name,
      slug: assetId,
      category: 'loitering_munition',
      categoryLabel: 'OWA',
      image_url: null,
      max_altitude_agl_m: 4000,
      altitude_reference: 'AGL',
      max_range_km: 2500,
      max_speed_kmh: 185,
      endurance_min: 300,
      climb_rate_mpm: 300,
    },
    lon: 55.5,
    lat: 26.99,
    terrainAMSL: 10,
    discAltitude_m: 500,
    lateralRadius_m: 5000,
    ceilingAMSL_m: 4010,
    annotationTime_min: 60,
    effectiveRange_km: 2500,
    infoPanelClosed: true,
  };
}

function minimalCuas(assetId: string, name: string, instanceId: string): PlacedCuas {
  return {
    instanceId,
    asset: {
      id: assetId,
      name,
      categoryLabel: 'c-UAS EW',
      image_url: null,
      defeat_range_m: 2000,
      defeat_range_km: 2,
      defeat_methods: ['rf_jamming'],
    },
    lon: 55.5,
    lat: 26.99,
    terrainAMSL: 10,
    hasTerrainMasking: false,
  };
}

function minimalRadar(instanceId: string): PlacedRadar {
  return {
    instanceId,
    asset: {
      id: 'radar-an-tpy-2',
      name: 'AN/TPY-2',
      side: 'blue',
      role: 'early_warning',
      roleLabel: 'Early warning',
      image_url: null,
      detection_range_km: 2000,
      dome_range_km: 200,
      sector_deg: 120,
      bandsLabel: 'X-band',
      associated_system: 'THAAD',
    },
    lon: 55.5,
    lat: 26.99,
    terrainAMSL: 10,
  };
}

function tileById(id: string) {
  const tile = BAND_TILES.find((t) => t.id === id);
  if (!tile) throw new Error("Missing band tile " + id);
  return tile;
}

export interface GoldenScenarioResult {
  id: GoldenScenarioId;
  passed: boolean;
  message: string;
  pd?: PdComponents;
  laydownHits?: LaydownEmission[];
}

export function assertGoldenScenario(id: GoldenScenarioId): GoldenScenarioResult {
  switch (id) {
    case 'iron_crow_shahed_krasukha':
      return assertIronCrowShahedKrasukha();
    case 'shahed_dronegun_uhf':
      return assertShahedDronegunUhf();
    case 'thaad_tpy2_xband':
      return assertThaadTpy2Xband();
    case 'fibre_optic_rf_blind':
      return assertFibreOpticRfBlind();
    default:
      return { id, passed: false, message: "Unknown scenario " + id };
  }
}


function assertIronCrowShahedKrasukha(): GoldenScenarioResult {
  const shahed = baseShahed();
  const env: SensorEnvironment = {
    weather: clearWeather,
    ew_assets_active: [krasukhaEW],
    time_of_day: 'morning',
    terrain_type: 'open',
    detecting_force: 'BLUE',
  };
  const pd = fogOfWarEngine.calculatePd(shahed, 'radar', env, 30);
  const passed = pd.ew_modifier === EW_MOD.RADAR_JAMMING.KRASUKHA_CLASS && pd.final_pd < 0.025;
  return {
    id: 'iron_crow_shahed_krasukha',
    passed,
    message: passed
      ? "Radar Pd " + pd.final_pd.toFixed(3) + " under Krasukha."
      : "Expected Krasukha collapse; ew=" + pd.ew_modifier + " final_pd=" + pd.final_pd,
    pd,
  };
}

function assertShahedDronegunUhf(): GoldenScenarioResult {
  const emissions = resolveLaydownEmissions(
    [minimalUas('shahed-136', 'Shahed-136', 'uas-shahed-1')],
    [minimalCuas('dronegun-tactical', 'DroneGun Tactical', 'cuas-dg-1')],
    [],
    [],
  );
  const hits = emissionsForTile(tileById('uhf'), emissions);
  const passed = hits.length >= 2;
  return {
    id: 'shahed_dronegun_uhf',
    passed,
    message: passed
      ? String(hits.length) + " emission(s) intersect UHF."
      : "Expected UHF overlap; hits=" + hits.length,
    laydownHits: hits,
  };
}

function assertThaadTpy2Xband(): GoldenScenarioResult {
  const emissions = resolveLaydownEmissions([], [], [minimalRadar('radar-tpy-1')], []);
  const hits = emissionsForTile(tileById('shf'), emissions);
  const tpyDefender: PCM.Platform = {
    id: 'BLUE-RADAR-01',
    type: 'AN/TPY-2',
    group: 'c_uas_defeat_kinetic',
    quantity: 1,
    quantity_remaining: 1,
    location_grid: 'BRAVO-2',
    altitude_m: 0,
    status: 'ground_ready',
    fuel_state_percent: 100,
    payload: '',
    guidance: 'pre_programmed',
    sensor: 'radar-an-tpy-2',
    ew_immune: false,
    rcs_class: 'medium',
    speed_kt: 0,
    ceiling_ft: 0,
    range_km: 2000,
    endurance_hr: 0,
  };
  const detectRange = resolveDefenderSensorRange(tpyDefender, 'radar', 'radar-an-tpy-2');
  const nearFactor = rangePdFactor(50, detectRange);
  const farFactor = rangePdFactor(detectRange * 1.5, detectRange);
  const env: SensorEnvironment = {
    weather: clearWeather,
    ew_assets_active: [],
    time_of_day: 'midday',
    terrain_type: 'open',
    detecting_force: 'BLUE',
    defender_platforms: [tpyDefender],
  };
  const shahed = baseShahed({ altitude_m: 5000, location_grid: 'HOTEL-12' });
  const pdNear = fogOfWarEngine.calculatePd(shahed, 'radar', env, 50);
  const pdFar = fogOfWarEngine.calculatePd(shahed, 'radar', env, detectRange * 1.5);
  const passed = hits.length >= 1 && nearFactor > farFactor && pdNear.base_pd > pdFar.base_pd;
  return {
    id: 'thaad_tpy2_xband',
    passed,
    message: passed
      ? "SHF hit; rangePd " + nearFactor.toFixed(2) + " > " + farFactor.toFixed(2) + "."
      : "hits=" + hits.length + " near=" + nearFactor + " far=" + farFactor,
    pd: pdNear,
    laydownHits: hits,
  };
}

function assertFibreOpticRfBlind(): GoldenScenarioResult {
  const fibreFPV = baseShahed({
    id: 'RED-FPV-01',
    type: 'FPV_fibre_optic',
    group: 'FPV',
    guidance: 'fibre_optic_FPV',
    ew_immune: true,
    altitude_m: 50,
    rcs_class: 'very_low',
  });
  const env: SensorEnvironment = {
    weather: clearWeather,
    ew_assets_active: [],
    time_of_day: 'midday',
    terrain_type: 'urban',
    detecting_force: 'BLUE',
  };
  const pd = fogOfWarEngine.calculatePd(fibreFPV, 'rf_sigint', env, 5);
  const passed = pd.final_pd < 0.04;
  return {
    id: 'fibre_optic_rf_blind',
    passed,
    message: passed ? "RF SIGINT Pd " + pd.final_pd.toFixed(3) + "." : "Pd=" + pd.final_pd,
    pd,
  };
}

export function runAllGoldenScenarios(): GoldenScenarioResult[] {
  return GOLDEN_SCENARIOS.map((s) => assertGoldenScenario(s.id));
}

export function allGoldenScenariosPass(): boolean {
  return runAllGoldenScenarios().every((r) => r.passed);
}
