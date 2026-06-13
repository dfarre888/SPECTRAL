/**
 * SPECTRAL Persistent Combat Model
 * Phase 2 — Fog of War Engine Unit Tests
 *
 * 55 tests across 10 suites.
 * Run: npx vitest run src/tests/spectral.phase2.test.ts
 *
 * Every detection probability value tested here is derived from
 * the SPECTRAL Programme Specification v1.0, Section 2.3.
 * A test failure means either the code or the spec needs to change.
 */

import { describe, it, expect } from 'vitest';
import { FogOfWarEngine } from '@/lib/pcm/fogOfWarEngine';
import {
  BASE_PD,
  WEATHER_MOD,
  EW_MOD,
  ALTITUDE_MOD,
  RCS_MOD,
  REPORTING_DELAY_SEC,
  MISCLASSIFICATION,
} from '@/lib/pcm/detectionConstants';
import type { PCM } from '@/lib/pcm/spectral.types';

type Platform = PCM.Platform;
type Weather = PCM.Weather;
type EWAsset = PCM.EWAsset;
type WorldState = PCM.WorldState;

// ─────────────────────────────────────────────────────────────────────────────
// TEST FIXTURES
// ─────────────────────────────────────────────────────────────────────────────

const fwe = new FogOfWarEngine();

const buildPlatform = (overrides: Partial<Platform> = {}): Platform => ({
  id: 'TEST-001',
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
});

const clearWeather: Weather = {
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

const lightRainWeather: Weather = {
  ...clearWeather,
  precipitation: 'light_rain',
  visibility_km: 5,
  eo_ir_modifier: 0.71,
  radar_modifier: 0.82,
};

const heavyRainWeather: Weather = {
  ...clearWeather,
  precipitation: 'heavy_rain',
  visibility_km: 1,
  eo_ir_modifier: 0.31,
  radar_modifier: 0.44,
};

const dustStormWeather: Weather = {
  ...clearWeather,
  precipitation: 'dust',
  visibility_km: 0.2,
  eo_ir_modifier: 0.09,
  radar_modifier: 0.73,
  fpv_flyable: false,
};

const krasukhaEW: EWAsset = {
  id: 'RED-EW-01',
  type: 'Krasukha-4_analogue',
  status: 'active',
  location_grid: 'HOTEL-9',
  jam_bands: ['L', 'S', 'C', 'X'],
  effective_radius_km: 40,
  affected_platform_ids: [],
};

const droneGunEW: EWAsset = {
  id: 'BLUE-EW-01',
  type: 'DroneGun_Mk4',
  status: 'active',
  location_grid: 'BRAVO-2',
  jam_bands: ['S', 'C', 'X'],
  effective_radius_km: 0.5,
  affected_platform_ids: [],
};

const buildEnv = (overrides: Record<string, unknown> = {}) => ({
  weather: clearWeather,
  ew_assets_active: [] as EWAsset[],
  time_of_day: 'morning' as const,
  terrain_type: 'coastal_littoral',
  detecting_force: 'BLUE' as const,
  ...overrides,
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1: BASE DETECTION PROBABILITY CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 2 — Base Pd Constants (from Programme Spec v1.0)', () => {

  it('Group 5 MALE radar Pd should be 0.95', () => {
    expect(BASE_PD.RADAR.GROUP_5_MALE).toBe(0.95);
  });

  it('TB2-class MALE radar Pd should be 0.82', () => {
    expect(BASE_PD.RADAR.GROUP_3_UCAV).toBe(0.82);
  });

  it('OWA at >1000m AGL radar Pd should be 0.68', () => {
    expect(BASE_PD.RADAR.OWA_HIGH_ALT).toBe(0.68);
  });

  it('OWA at 200–500m AGL radar Pd should be 0.31 — THE CRITICAL NUMBER', () => {
    // This is the number from the spec worked example.
    // Blue Force consistently fails to detect Shahed at this altitude.
    // If this test fails, the fundamental training premise breaks.
    expect(BASE_PD.RADAR.OWA_LOW_ALT).toBe(0.31);
  });

  it('OWA at <200m AGL (standard Shahed profile) radar Pd should be 0.18', () => {
    expect(BASE_PD.RADAR.OWA_ULTRALOW_ALT).toBe(0.18);
  });

  it('FPV at 50m AGL radar Pd should be 0.08 — near impossible', () => {
    expect(BASE_PD.RADAR.FPV_LOW).toBe(0.08);
  });

  it('Stealth UCAV (GJ-11) radar Pd should be 0.09', () => {
    expect(BASE_PD.RADAR.STEALTH_UCAV).toBe(0.09);
  });

  it('Fibre-optic FPV RF/SIGINT Pd should be 0.02 — near invisible', () => {
    expect(BASE_PD.RF_SIGINT.FIBRE_OPTIC_FPV).toBe(0.02);
  });

  it('Emitting platform RF/SIGINT Pd should be 0.97', () => {
    expect(BASE_PD.RF_SIGINT.EMITTING_DATALINK).toBe(0.97);
    // Critical: if you radiate, you are found. EMCON is mandatory.
  });

  it('Active radar emitter RF/SIGINT Pd should be 0.98', () => {
    expect(BASE_PD.RF_SIGINT.EMITTING_RADAR).toBe(0.98);
  });

  it('Decoy radar Pd should be higher than real OWA (designed to look real)', () => {
    expect(BASE_PD.RADAR.DECOY).toBeGreaterThan(BASE_PD.RADAR.OWA_LOW_ALT);
    // Gerbera decoy has 0.55 vs Shahed 0.31 — decoy is more detectable by design
    // but classified as real OWA, depleting Blue intercept magazine
  });

  it('USV should have high radar Pd as a surface vessel', () => {
    expect(BASE_PD.RADAR.USV).toBeGreaterThan(0.80);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2: WEATHER MODIFIERS
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 2 — Weather Modifiers', () => {

  it('Radar should be mostly unaffected by fog', () => {
    expect(WEATHER_MOD.RADAR.FOG).toBeGreaterThan(0.90);
  });

  it('Radar Pd should be significantly degraded in heavy rain', () => {
    expect(WEATHER_MOD.RADAR.HEAVY_RAIN).toBeLessThan(0.50);
  });

  it('EO/IR should be near-useless in a dust storm', () => {
    expect(WEATHER_MOD.EO_DAYLIGHT.DUST_STORM).toBeLessThan(0.12);
  });

  it('EO/IR should be useless in fog', () => {
    expect(WEATHER_MOD.EO_DAYLIGHT.FOG).toBeLessThan(0.25);
  });

  it('Acoustic should be significantly degraded by strong wind', () => {
    expect(WEATHER_MOD.ACOUSTIC.WIND_STRONG).toBeLessThan(0.60);
  });

  it('RF/SIGINT should be mostly unaffected by rain', () => {
    expect(WEATHER_MOD.RF_SIGINT.RAIN).toBeGreaterThan(0.85);
  });

  it('Light rain should only modestly degrade radar', () => {
    const degradation = 1 - WEATHER_MOD.RADAR.LIGHT_RAIN;
    expect(degradation).toBeLessThan(0.25); // less than 25% degradation
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3: EW MODIFIERS
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 2 — EW Degradation Modifiers', () => {

  it('Krasukha-class jamming should reduce radar Pd to 19%', () => {
    expect(EW_MOD.RADAR_JAMMING.KRASUKHA_CLASS).toBe(0.19);
  });

  it('No EW modifier should be 1.00 (no degradation)', () => {
    expect(EW_MOD.RADAR_JAMMING.NONE).toBe(1.00);
  });

  it('Heavy jamming should reduce Pd to below 50%', () => {
    expect(EW_MOD.RADAR_JAMMING.HEAVY).toBeLessThan(0.50);
  });

  it('Barrage jamming should be worse than heavy jamming', () => {
    expect(EW_MOD.RADAR_JAMMING.BARRAGE).toBeLessThan(EW_MOD.RADAR_JAMMING.HEAVY);
  });

  it('Severed comms should near-eliminate reporting', () => {
    expect(EW_MOD.RF_COMMS_JAMMING.SEVERED).toBeLessThan(0.10);
  });

  it('Terrain masking should significantly reduce detection Pd', () => {
    expect(EW_MOD.COUNTERMEASURES.TERRAIN_MASKING).toBeLessThan(0.30);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4: ALTITUDE MODIFIERS
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 2 — Altitude Modifiers', () => {

  it('OWA at >3000m AGL should have full radar detection', () => {
    expect(ALTITUDE_MOD.RADAR_VS_SMALL_UAS.ABOVE_3000M_AGL).toBe(1.00);
  });

  it('OWA at 200–500m AGL modifier should be 0.44', () => {
    expect(ALTITUDE_MOD.RADAR_VS_SMALL_UAS['200_500M']).toBe(0.44);
  });

  it('OWA at 100–200m AGL modifier should be 0.31', () => {
    expect(ALTITUDE_MOD.RADAR_VS_SMALL_UAS['100_200M']).toBe(0.31);
  });

  it('OWA below 50m AGL should have near-zero radar detection modifier', () => {
    expect(ALTITUDE_MOD.RADAR_VS_SMALL_UAS.BELOW_50M).toBeLessThan(0.15);
  });

  it('Altitude modifiers should decrease monotonically as altitude decreases', () => {
    const mods = [
      ALTITUDE_MOD.RADAR_VS_SMALL_UAS.ABOVE_3000M_AGL,
      ALTITUDE_MOD.RADAR_VS_SMALL_UAS['1000_3000M'],
      ALTITUDE_MOD.RADAR_VS_SMALL_UAS['500_1000M'],
      ALTITUDE_MOD.RADAR_VS_SMALL_UAS['200_500M'],
      ALTITUDE_MOD.RADAR_VS_SMALL_UAS['100_200M'],
      ALTITUDE_MOD.RADAR_VS_SMALL_UAS['50_100M'],
      ALTITUDE_MOD.RADAR_VS_SMALL_UAS.BELOW_50M,
    ];

    for (let i = 0; i < mods.length - 1; i++) {
      expect(mods[i]).toBeGreaterThan(mods[i + 1]);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5: RCS MODIFIERS
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 2 — RCS Modifiers', () => {

  it('High RCS should be the reference value (1.00)', () => {
    expect(RCS_MOD.HIGH).toBe(1.00);
  });

  it('Very low RCS (Lancet, FPV) should be below 0.20', () => {
    expect(RCS_MOD.VERY_LOW).toBeLessThan(0.20);
  });

  it('Stealth RCS (GJ-11) should be below 0.10', () => {
    expect(RCS_MOD.STEALTH).toBeLessThan(0.10);
  });

  it('Medium RCS (TB2) should be between 0.6 and 0.8', () => {
    expect(RCS_MOD.MEDIUM).toBeGreaterThan(0.60);
    expect(RCS_MOD.MEDIUM).toBeLessThan(0.80);
  });

  it('Low RCS (Shahed) should be between 0.3 and 0.5', () => {
    expect(RCS_MOD.LOW).toBeGreaterThan(0.30);
    expect(RCS_MOD.LOW).toBeLessThan(0.55);
  });

  it('RCS modifiers should decrease monotonically from very_high to stealth', () => {
    expect(RCS_MOD.VERY_HIGH).toBeGreaterThan(RCS_MOD.HIGH);
    expect(RCS_MOD.HIGH).toBeGreaterThan(RCS_MOD.MEDIUM);
    expect(RCS_MOD.MEDIUM).toBeGreaterThan(RCS_MOD.LOW);
    expect(RCS_MOD.LOW).toBeGreaterThan(RCS_MOD.VERY_LOW);
    expect(RCS_MOD.VERY_LOW).toBeGreaterThan(RCS_MOD.STEALTH);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 6: FOG OF WAR ENGINE — calculatePd
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 2 — FogOfWarEngine.calculatePd()', () => {

  it('Should compute correct Pd for TB2 in clear weather, no EW', () => {
    const platform = buildPlatform({
      type: 'Bayraktar TB2',
      group: 'MALE_strike',
      altitude_m: 15000,
      rcs_class: 'medium',
    });
    const env = buildEnv();
    const result = fwe.calculatePd(platform, 'radar', env, 30);

    expect(result.base_pd).toBe(BASE_PD.RADAR.GROUP_3_UCAV);
    expect(result.weather_modifier).toBe(WEATHER_MOD.RADAR.CLEAR);
    expect(result.ew_modifier).toBe(EW_MOD.RADAR_JAMMING.NONE);
    expect(result.final_pd).toBeGreaterThan(0.70);
    expect(result.final_pd).toBeLessThanOrEqual(1.0);
  });

  it('Should compute very low Pd for Shahed-136 at 200m AGL in clear weather no EW', () => {
    const shahed = buildPlatform({ altitude_m: 200, rcs_class: 'low' });
    const env = buildEnv();
    const result = fwe.calculatePd(shahed, 'radar', env, 40);

    // Base: 0.31 (OWA_LOW_ALT) × weather(1.0) × EW(1.0) × altitude(0.31) × RCS(0.41)
    // ≈ 0.31 × 0.31 × 0.41 ≈ 0.039
    expect(result.base_pd).toBe(BASE_PD.RADAR.OWA_LOW_ALT);
    expect(result.final_pd).toBeLessThan(0.05);
  });

  it('Should compute near-zero Pd for Shahed under Krasukha + light rain', () => {
    // The SPECTRAL Programme Spec v1.0 worked example — should be ≈ 0.019
    const shahed = buildPlatform({ altitude_m: 200, rcs_class: 'low' });
    const env = buildEnv({
      weather: lightRainWeather,
      ew_assets_active: [krasukhaEW],
    });
    const result = fwe.calculatePd(shahed, 'radar', env, 30);

    // EW modifier = 0.19 (Krasukha), range 30km < 40km effective radius
    expect(result.ew_modifier).toBe(EW_MOD.RADAR_JAMMING.KRASUKHA_CLASS);
    expect(result.final_pd).toBeLessThan(0.025);
    // This is the critical detection scenario — Blue cannot reliably detect Shahed
    // under these conditions. This is the knowledge gap that kills Blue Force in Scenario 1.
  });

  it('Should compute near-zero Pd for fibre-optic FPV via RF/SIGINT', () => {
    const fibreFPV = buildPlatform({
      type: 'FPV_fibre_optic',
      group: 'FPV',
      ew_immune: true,
      guidance: 'fibre_optic_FPV',
      altitude_m: 50,
      rcs_class: 'very_low',
    });
    const env = buildEnv();
    const result = fwe.calculatePd(fibreFPV, 'rf_sigint', env, 5);

    expect(result.base_pd).toBe(BASE_PD.RF_SIGINT.FIBRE_OPTIC_FPV);
    expect(result.final_pd).toBeLessThan(0.04);
  });

  it('Should compute high Pd for emitting platform via RF/SIGINT', () => {
    const emittingMALE = buildPlatform({
      type: 'Bayraktar TB2',
      group: 'MALE_isr',
      guidance: 'GNSS_INS',
      altitude_m: 15000,
      rcs_class: 'medium',
    });
    const env = buildEnv();
    const result = fwe.calculatePd(emittingMALE, 'rf_sigint', env, 40);

    expect(result.base_pd).toBeGreaterThan(0.85);
    expect(result.final_pd).toBeGreaterThan(0.80);
  });

  it('Should return final_pd always between 0 and 1', () => {
    const platforms = [
      buildPlatform({ group: 'OWA', altitude_m: 50, rcs_class: 'low' }),
      buildPlatform({ group: 'FPV', altitude_m: 10, rcs_class: 'very_low', ew_immune: true }),
      buildPlatform({ group: 'MALE_strike', altitude_m: 15000, rcs_class: 'medium' }),
      buildPlatform({ group: 'HALE_isr', altitude_m: 60000, rcs_class: 'high' }),
    ];
    const envs = [
      buildEnv(),
      buildEnv({ weather: dustStormWeather }),
      buildEnv({ ew_assets_active: [krasukhaEW] }),
      buildEnv({ weather: heavyRainWeather, ew_assets_active: [krasukhaEW] }),
    ];
    const sensors = ['radar', 'eo_ir', 'rf_sigint', 'acoustic', 'visual'] as const;

    for (const platform of platforms) {
      for (const env of envs) {
        for (const sensor of sensors) {
          const result = fwe.calculatePd(platform, sensor, env, 20);
          expect(result.final_pd).toBeGreaterThanOrEqual(0);
          expect(result.final_pd).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('Should return all component fields', () => {
    const platform = buildPlatform();
    const env = buildEnv();
    const result = fwe.calculatePd(platform, 'radar', env, 30);

    expect(result).toHaveProperty('base_pd');
    expect(result).toHaveProperty('sensor_type');
    expect(result).toHaveProperty('weather_modifier');
    expect(result).toHaveProperty('ew_modifier');
    expect(result).toHaveProperty('altitude_modifier');
    expect(result).toHaveProperty('rcs_modifier');
    expect(result).toHaveProperty('terrain_masking_modifier');
    expect(result).toHaveProperty('countermeasures_modifier');
    expect(result).toHaveProperty('final_pd');
  });

  it('EW modifier should be lower within Krasukha effective range vs outside', () => {
    const platform = buildPlatform({ altitude_m: 5000, rcs_class: 'medium' });
    const envInRange = buildEnv({ ew_assets_active: [krasukhaEW] });
    const envOutOfRange = buildEnv({ ew_assets_active: [krasukhaEW] });

    // Within range (30km < 40km)
    const inRangeResult = fwe.calculatePd(platform, 'radar', envInRange, 30);
    // Outside range (50km > 40km)
    const outOfRangeResult = fwe.calculatePd(platform, 'radar', envOutOfRange, 50);

    expect(inRangeResult.ew_modifier).toBeLessThan(outOfRangeResult.ew_modifier);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 7: REPORTING DELAY MODEL
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 2 — Reporting Delay Model', () => {

  it('Nominal comms should produce 0-turn delay for fast-moving threats', () => {
    const delay = fwe.applyDelay('nominal', 'radar');
    expect(delay).toBe(0); // under 900 seconds = reported within same turn
  });

  it('SIGINT detection should take longer than radar reporting', () => {
    const radarDelay = fwe.applyDelay('nominal', 'radar');
    const sigintDelay = fwe.applyDelay('nominal', 'rf_sigint');
    expect(sigintDelay).toBeGreaterThanOrEqual(radarDelay);
  });

  it('Severed comms should produce multi-turn delay', () => {
    const delay = fwe.applyDelay('severed', 'radar');
    expect(delay).toBeGreaterThan(3);
  });

  it('Degraded comms should produce longer delay than nominal', () => {
    const nominal = fwe.applyDelay('nominal', 'radar');
    const degraded = fwe.applyDelay('degraded_heavy', 'radar');
    expect(degraded).toBeGreaterThanOrEqual(nominal);
  });

  it('Delay multipliers should increase with degradation severity', () => {
    const mults = REPORTING_DELAY_SEC.COMMS_DEGRADATION_MULTIPLIER;
    expect(mults.NOMINAL).toBeLessThan(mults.DEGRADED_LIGHT);
    expect(mults.DEGRADED_LIGHT).toBeLessThan(mults.DEGRADED_MODERATE);
    expect(mults.DEGRADED_MODERATE).toBeLessThan(mults.DEGRADED_HEAVY);
    expect(mults.DEGRADED_HEAVY).toBeLessThan(mults.DEGRADED_CRITICAL);
  });

  it('Message loss probability should increase with degradation', () => {
    const loss = REPORTING_DELAY_SEC.MESSAGE_LOSS_PROBABILITY;
    expect(loss.NOMINAL).toBe(0.00);
    expect(loss.DEGRADED_LIGHT).toBeLessThan(loss.DEGRADED_MODERATE);
    expect(loss.DEGRADED_MODERATE).toBeLessThan(loss.DEGRADED_HEAVY);
    expect(loss.SEVERED).toBeGreaterThan(0.70);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 8: TIME TO IMPACT
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 2 — Time to Impact Calculator', () => {

  it('Shahed-136 at 50km should arrive in ~1 turn', () => {
    const shahed = buildPlatform({ group: 'OWA', type: 'Shahed-136' });
    const tti = fwe.computeTimeToImpact(shahed, 50);
    expect(tti).toBeLessThanOrEqual(2);
    expect(tti).toBeGreaterThanOrEqual(1);
  });

  it('Shahed-136 at 200km should take ~5 turns', () => {
    const shahed = buildPlatform({ group: 'OWA', type: 'Shahed-136' });
    const tti = fwe.computeTimeToImpact(shahed, 200);
    expect(tti).toBeGreaterThanOrEqual(4);
    expect(tti).toBeLessThanOrEqual(6);
  });

  it('Shahed-238 turbojet should arrive significantly faster than Shahed-136', () => {
    const shahed136 = buildPlatform({ group: 'OWA', type: 'Shahed-136' });
    const shahed238 = buildPlatform({ group: 'OWA', type: 'Shahed-238' });

    const tti136 = fwe.computeTimeToImpact(shahed136, 200);
    const tti238 = fwe.computeTimeToImpact(shahed238, 200);

    expect(tti136).not.toBeNull();
    expect(tti238).not.toBeNull();
    expect(tti238!).toBeLessThan(tti136!);
    // This is the teaching point for the Shahed-238 module:
    // the turbojet variant halves the intercept window
  });

  it('Non-OWA platform should return null time to impact', () => {
    const tb2 = buildPlatform({ group: 'MALE_strike', type: 'Bayraktar TB2' });
    const tti = fwe.computeTimeToImpact(tb2, 50);
    expect(tti).toBeNull();
  });

  it('Time to impact should always be at least 1 turn', () => {
    const shahed = buildPlatform({ group: 'OWA', type: 'Shahed-136' });
    const tti = fwe.computeTimeToImpact(shahed, 1); // very close range
    expect(tti).toBeGreaterThanOrEqual(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 9: CONFIDENCE MAPPING
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 2 — Pd to Confidence Mapping', () => {

  it('Pd >= 0.90 should give confirmed confidence', () => {
    expect(fwe.pdToConfidence(0.95)).toBe('confirmed');
    expect(fwe.pdToConfidence(0.90)).toBe('confirmed');
  });

  it('Pd 0.70–0.89 should give high confidence', () => {
    expect(fwe.pdToConfidence(0.85)).toBe('high');
    expect(fwe.pdToConfidence(0.70)).toBe('high');
  });

  it('Pd 0.45–0.69 should give medium confidence', () => {
    expect(fwe.pdToConfidence(0.60)).toBe('medium');
    expect(fwe.pdToConfidence(0.45)).toBe('medium');
  });

  it('Pd 0.20–0.44 should give low confidence', () => {
    expect(fwe.pdToConfidence(0.30)).toBe('low');
  });

  it('Pd < 0.20 should give possible confidence', () => {
    expect(fwe.pdToConfidence(0.10)).toBe('possible');
    expect(fwe.pdToConfidence(0.019)).toBe('possible');
    // 0.019 is the Pd from the worked example in the spec
    // Blue Force Commander sees "possible contact — low confidence"
    // and dismisses it. That is the kill that defines Exercise IRON CROW.
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 10: MISCLASSIFICATION MODEL
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 2 — Misclassification Rates', () => {

  it('Decoy should be misclassified as real OWA at a high rate', () => {
    expect(MISCLASSIFICATION.DECOY_AS_REAL_OWA).toBeGreaterThan(0.40);
    // Teaching point: Gerbera decoy is designed to look like real Shahed
    // A 51% misclassification rate means Blue will waste intercepts on decoys
  });

  it('OWA misclassification rate should be meaningful (>15%)', () => {
    const totalOWAMisclass = MISCLASSIFICATION.OWA_AS_COMMERCIAL_DRONE +
      MISCLASSIFICATION.OWA_AS_BIRD;
    expect(totalOWAMisclass).toBeGreaterThan(0.15);
  });

  it('Fibre-optic FPV should have a high bird-misclassification rate', () => {
    expect(MISCLASSIFICATION.FPV_AS_BIRD).toBeGreaterThan(0.35);
    // At low altitude and small size, FPV looks like a bird to most sensors
  });

  it('Multi-modal detection should improve classification accuracy', () => {
    const singleSensorRate = MISCLASSIFICATION.OWA_AS_COMMERCIAL_DRONE;
    const multiModalRate = singleSensorRate * MISCLASSIFICATION.MULTI_MODAL_IMPROVEMENT;
    expect(multiModalRate).toBeLessThan(singleSensorRate);
    // Teaching point: commit ISR asset to confirm before engaging
  });

  it('MALE UAV correct classification rate should be > 90%', () => {
    expect(MISCLASSIFICATION.MALE_UAV_CORRECT).toBeGreaterThan(0.90);
    // Large recognisable platforms are rarely misidentified
  });

  it('USV misclassification as debris should be meaningful at long range', () => {
    expect(MISCLASSIFICATION.USV_AS_DEBRIS).toBeGreaterThan(0.10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 11: CORE SCENARIO VALIDATION — OPERATION IRON CROW DETECTION SCENARIOS
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 2 — Operation IRON CROW: Critical Detection Scenarios', () => {

  /**
   * These tests validate the specific detection scenarios
   * that drive the training value of Operation IRON CROW.
   * If these fail, the scenario doesn't teach the right lessons.
   */

  it('SCENARIO: Shahed-136 approaching at 200m AGL under Krasukha + light rain — should be VERY HARD to detect', () => {
    // This is the Blue Force Commander's primary kill shot — they miss it.
    // Pd should be so low that "possible contact" is the typical result.
    const shahed = buildPlatform({
      altitude_m: 200,
      rcs_class: 'low',
      ew_immune: false,
    });
    const env = buildEnv({
      weather: lightRainWeather,
      ew_assets_active: [krasukhaEW],
    });
    const result = fwe.calculatePd(shahed, 'radar', env, 35);

    expect(result.final_pd).toBeLessThan(0.025);
    expect(fwe.pdToConfidence(result.final_pd)).toBe('possible');
    // Blue Force Commander will see "possible contact" and dismiss it
    // That dismissal is Turn 12 — the key decision point
  });

  it('SCENARIO: Gerbera decoy at 200m AGL — should appear more detectable than real OWA', () => {
    const decoy = buildPlatform({
      type: 'Gerbera',
      group: 'decoy',
      altitude_m: 200,
      rcs_class: 'low', // same apparent RCS as Shahed
    });
    const shahed = buildPlatform({ altitude_m: 200, rcs_class: 'low' });
    const env = buildEnv();

    const decoyResult = fwe.calculatePd(decoy, 'radar', env, 40);
    const shahedResult = fwe.calculatePd(shahed, 'radar', env, 40);

    expect(decoyResult.base_pd).toBeGreaterThan(shahedResult.base_pd);
    // Gerbera is designed to attract intercepts — it works
  });

  it('SCENARIO: Fibre-optic FPV swarm — EW useless, acoustic/visual only', () => {
    const fibreFPV = buildPlatform({
      type: 'FPV_fibre_optic',
      group: 'FPV',
      ew_immune: true,
      guidance: 'fibre_optic_FPV',
      altitude_m: 30,
      rcs_class: 'very_low',
    });
    const env = buildEnv({ ew_assets_active: [krasukhaEW] });

    // RF/SIGINT useless
    const rfResult = fwe.calculatePd(fibreFPV, 'rf_sigint', env, 5);
    expect(rfResult.final_pd).toBeLessThan(0.05);

    // Radar barely useful
    const radarResult = fwe.calculatePd(fibreFPV, 'radar', env, 5);
    expect(radarResult.final_pd).toBeLessThan(0.10);

    // Acoustic still works at close range
    const acousticResult = fwe.calculatePd(fibreFPV, 'acoustic', env, 2);
    expect(acousticResult.final_pd).toBeGreaterThan(0.40);

    // Lesson: fibre-optic FPV can only be stopped by kinetics or acoustic-cued interceptors
  });

  it('SCENARIO: TB2 at altitude — Blue Force should detect it reliably', () => {
    const tb2 = buildPlatform({
      type: 'Bayraktar TB2',
      group: 'MALE_strike',
      altitude_m: 15000,
      rcs_class: 'medium',
    });
    const env = buildEnv();
    const result = fwe.calculatePd(tb2, 'radar', env, 40);

    // TB2 should be reliably detected at operational altitude
    expect(result.final_pd).toBeGreaterThan(0.60);
    expect(fwe.pdToConfidence(result.final_pd)).not.toBe('possible');
  });

  it('SCENARIO: GJ-11 Sharp Sword stealth UCAV — should be near-undetectable by radar', () => {
    const gj11 = buildPlatform({
      type: 'GJ-11',
      group: 'UCAV',
      altitude_m: 15000,
      rcs_class: 'very_low',
    });
    const env = buildEnv();
    const result = fwe.calculatePd(gj11, 'radar', env, 80);

    expect(result.final_pd).toBeLessThan(0.15);
    // EMCON discipline lesson: if GJ-11 is emitting (unlikely), SIGINT can find it
    // If it's passive, radar is near-blind
  });

  it('SCENARIO: Magura V5 USV at night approaching coastal node', () => {
    const magura = buildPlatform({
      type: 'Magura V5',
      group: 'USV',
      altitude_m: 0,
      rcs_class: 'low',
    });
    const env = buildEnv({ time_of_day: 'night' as const });

    // Radar should still detect it (surface vessel)
    const radarResult = fwe.calculatePd(magura, 'radar', env, 20);
    expect(radarResult.base_pd).toBeGreaterThan(0.80);

    // Visual is near-zero at night
    const visualResult = fwe.calculatePd(magura, 'visual', env, 5);
    expect(visualResult.final_pd).toBeLessThan(0.15);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 12: DETECTION EXPLANATION GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 2 — explainDetection()', () => {

  it('Should produce a non-empty explanation string', () => {
    const platform = buildPlatform();
    const env = buildEnv();
    const pdComponents = fwe.calculatePd(platform, 'radar', env, 30);
    const explanation = fwe.explainDetection(platform, pdComponents, false);

    expect(explanation).toBeTruthy();
    expect(explanation.length).toBeGreaterThan(100);
  });

  it('Should include OWA instructor note for low-altitude OWA', () => {
    const shahed = buildPlatform({ altitude_m: 150 });
    const env = buildEnv();
    const pdComponents = fwe.calculatePd(shahed, 'radar', env, 30);
    const explanation = fwe.explainDetection(shahed, pdComponents, false);

    expect(explanation).toContain('INSTRUCTOR NOTE');
  });

  it('Should include all component modifiers in explanation', () => {
    const platform = buildPlatform();
    const env = buildEnv();
    const pdComponents = fwe.calculatePd(platform, 'radar', env, 30);
    const explanation = fwe.explainDetection(platform, pdComponents, true);

    expect(explanation).toContain('Weather modifier');
    expect(explanation).toContain('EW modifier');
    expect(explanation).toContain('Altitude modifier');
    expect(explanation).toContain('RCS modifier');
  });
});
