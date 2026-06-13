/**
 * SPECTRAL PCM Phase 2 — detection validation
 *
 * Validates the core IRON CROW teaching scenario:
 * Shahed-136 at 200m AGL under Krasukha + light rain should be near-undetectable.
 *
 * Run: npx tsx scripts/spectral-detection-validation.ts
 */

import { FogOfWarEngine } from '../lib/pcm/fogOfWarEngine';
import type { PCM } from '../lib/pcm/spectral.types';

const fwe = new FogOfWarEngine();

const shahed: PCM.Platform = {
  id: 'TEST-SHAHED',
  type: 'Shahed-136',
  group: 'OWA',
  quantity: 1,
  quantity_remaining: 1,
  location_grid: 'ECHO-7',
  altitude_m: 200,
  status: 'airborne_tasked',
  fuel_state_percent: 100,
  payload: '90kg_HE',
  guidance: 'GNSS_INS',
  ew_immune: false,
  rcs_class: 'low',
  speed_kt: 100,
  ceiling_ft: 10000,
  range_km: 2500,
  endurance_hr: 5,
};

const krasukha: PCM.EWAsset = {
  id: 'RED-EW-01',
  type: 'Krasukha-4_analogue',
  status: 'active',
  location_grid: 'HOTEL-9',
  jam_bands: ['L', 'S', 'C', 'X'],
  effective_radius_km: 40,
  affected_platform_ids: [],
};

const env = {
  weather: {
    visibility_km: 5,
    cloud_base_ft: 1500,
    wind_speed_kt: 10,
    wind_bearing_deg: 270,
    temperature_c: 14,
    precipitation: 'light_rain' as const,
    sea_state: 2,
    eo_ir_modifier: 0.71,
    radar_modifier: 0.82,
    rf_propagation_modifier: 0.91,
    fpv_flyable: true,
  },
  ew_assets_active: [krasukha],
  time_of_day: 'night' as const,
  terrain_type: 'coastal_littoral',
  detecting_force: 'BLUE' as const,
};

const result = fwe.calculatePd(shahed, 'radar', env, 35);
const confidence = fwe.pdToConfidence(result.final_pd);
const explanation = fwe.explainDetection(shahed, result, false);

console.log('=== SPECTRAL PHASE 2 — DETECTION VALIDATION ===');
console.log('');
console.log('Scenario: Shahed-136 at 200m AGL, Krasukha active, light rain');
console.log('');
console.log(explanation);
console.log('');
console.log('CONFIDENCE REPORTED TO BLUE FORCE COMMANDER:', confidence.toUpperCase());
console.log('');

if (result.final_pd < 0.025 && confidence === 'possible') {
  console.log('PASS — Blue Force will likely dismiss this contact');
  console.log('   This is the Turn 12 kill shot. The training scenario works.');
  process.exit(0);
}

console.log('FAIL — Detection probability too high or confidence too strong');
console.log('   Blue Force will see this coming. Scenario 1 loses its teaching value.');
console.log('   Check the detection constant values in detectionConstants.ts');
process.exit(1);
