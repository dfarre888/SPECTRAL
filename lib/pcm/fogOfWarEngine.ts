/**
 * SPECTRAL Persistent Combat Model
 * Phase 2 — Fog of War Engine (FWE)
 *
 * The FWE is the physics layer that sits between the World State Engine
 * and each force's sensor picture. It is the most operationally critical
 * module in Phase 1–2: get it wrong and the entire training value of SPECTRAL
 * collapses — students will see things they shouldn't, miss things they should
 * detect, and the physics of the battlespace will feel wrong.
 *
 * Architecture:
 *   1. calculatePd()       — Master Pd calculator. Takes platform + sensor environment.
 *   2. generateSensorPicture() — Produces filtered contact list per force.
 *   3. applyDelay()        — Applies reporting chain latency.
 *   4. applyMisclassification() — Applies target type error probability.
 *   5. computeLineOfSight() — Terrain masking for ground-based sensors.
 *   6. computeTimeToImpact() — For OWA/LM — how many turns to impact.
 *
 * Called by WorldStateEngine after each turn to generate sensor pictures.
 * Called by SPECTRAL-REF (Phase 3) to validate AI orders against detection state.
 */

import {
  BASE_PD,
  WEATHER_MOD,
  EW_MOD,
  ALTITUDE_MOD,
  RCS_MOD,
  REPORTING_DELAY_SEC,
  MISCLASSIFICATION,
  TERRAIN,
  IMPACT_TIMING,
} from './detectionConstants';

import type { PCM } from '@/lib/pcm/spectral.types';

type WorldState = PCM.WorldState;
type Platform = PCM.Platform;
type Weather = PCM.Weather;
type EWAsset = PCM.EWAsset;
type Contact = PCM.Contact;
type ForceId = PCM.ForceId;
type ContactConfidence = PCM.ContactConfidence;
type DetectionMethod = PCM.DetectionMethod;

// ─────────────────────────────────────────────────────────────────────────────
// HELPER TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface SensorEnvironment {
  weather: Weather;
  ew_assets_active: EWAsset[];
  time_of_day: WorldState['time_of_day'];
  terrain_type: string;
  detecting_force: ForceId;
}

export interface DetectionResult {
  detected: boolean;
  pd: number;                        // final computed detection probability
  method: DetectionMethod;           // which sensor type detected
  confidence: ContactConfidence;     // translated from pd
  misclassified: boolean;
  true_classification: string;
  reported_classification: string;
  report_delay_turns: number;
}

export interface PdComponents {
  base_pd: number;
  sensor_type: DetectionMethod;
  weather_modifier: number;
  ew_modifier: number;
  altitude_modifier: number;
  rcs_modifier: number;
  terrain_masking_modifier: number;
  countermeasures_modifier: number;
  final_pd: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// FOG OF WAR ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export class FogOfWarEngine {

  // ── MASTER Pd CALCULATOR ──────────────────────────────────────────────────

  /**
   * calculatePd
   * Computes the probability of detection for a given platform
   * by a given sensor type in a given environment.
   *
   * Formula: Pd = BasePd × WeatherMod × EWMod × AltitudeMod × RCSMod × TerrainMod × CounterMod
   *
   * Returns the full component breakdown for transparency and
   * instructor debriefing use.
   */
  calculatePd(
    platform: Platform,
    sensorType: DetectionMethod,
    env: SensorEnvironment,
    rangeKm: number,
  ): PdComponents {

    const basePd = this.getBasePd(platform, sensorType, rangeKm);
    const weatherMod = this.getWeatherModifier(sensorType, env.weather);
    const ewMod = this.getEWModifier(sensorType, platform, env.ew_assets_active, rangeKm);
    const altitudeMod = this.getAltitudeModifier(sensorType, platform);
    const rcsMod =
      sensorType === 'radar' && this.usesRCSModifier(platform)
        ? this.getRCSModifier(platform)
        : 1.0;
    const terrainMod =
      sensorType === 'radar' ? this.getTerrainMaskingModifier(platform, env.terrain_type) : 1.0;
    const counterMod = this.getCountermeasuresModifier(platform, sensorType);

    // Final Pd — clamped 0.0–1.0
    let rawPd = basePd * weatherMod * ewMod * altitudeMod * rcsMod * terrainMod * counterMod;
    if (
      sensorType === 'visual' &&
      (env.time_of_day === 'night' ||
        env.time_of_day === 'night_transition' ||
        env.time_of_day === 'pre_dawn')
    ) {
      rawPd = Math.min(rawPd, BASE_PD.VISUAL.NIGHT_ANY);
    }
    const finalPd = Math.max(0, Math.min(1, rawPd));

    return {
      base_pd: basePd,
      sensor_type: sensorType,
      weather_modifier: weatherMod,
      ew_modifier: ewMod,
      altitude_modifier: altitudeMod,
      rcs_modifier: rcsMod,
      terrain_masking_modifier: terrainMod,
      countermeasures_modifier: counterMod,
      final_pd: finalPd,
    };
  }

  // ── GENERATE SENSOR PICTURE ───────────────────────────────────────────────

  /**
   * generateSensorPicture
   * Produces the complete filtered contact list for a force.
   * This is what the player actually sees — never the raw world state.
   *
   * Process:
   * 1. For each enemy platform, attempt detection by each available sensor type
   * 2. Use the highest Pd across all sensor types (best available picture)
   * 3. Roll against Pd to determine if detected this turn
   * 4. Apply misclassification — what does the sensor think it is?
   * 5. Apply reporting delay — how many turns before commander sees it?
   * 6. Compute time-to-impact for OWA/LM contacts
   */
  generateSensorPicture(
    worldState: WorldState,
    detectingForce: ForceId,
    options?: { rng?: () => number },
  ): Contact[] {
    const contacts: Contact[] = [];
    const roll = options?.rng ?? (() => Math.random());

    const detectingOrbat = detectingForce === 'RED'
      ? worldState.red_force
      : worldState.blue_force;

    const enemyOrbat = detectingForce === 'RED'
      ? worldState.blue_force
      : worldState.red_force;

    const env: SensorEnvironment = {
      weather: worldState.weather,
      ew_assets_active: this.getActiveEWAssets(worldState, detectingForce),
      time_of_day: worldState.time_of_day,
      terrain_type: worldState.terrain.primary_feature,
      detecting_force: detectingForce,
    };

    for (const platform of enemyOrbat.platforms) {
      // Destroyed platforms cannot be detected as new contacts
      if (platform.status === 'destroyed') continue;

      // Pre-launch platforms on the ground — very limited detection options
      if (platform.status === 'pre_launch' && !this.isPlatformEmitting(platform)) {
        // Only detect via HUMINT/OSINT (not modelled in Phase 2)
        continue;
      }

      // Determine range from detecting force C2 node to platform
      const rangeKm = this.estimateRange(worldState, detectingForce, platform);

      // Try each available sensor type — take best result
      const sensorTypes = this.getAvailableSensors(detectingOrbat.platforms, platform);
      let bestPdComponents: PdComponents | null = null;

      for (const sensorType of sensorTypes) {
        const pdComponents = this.calculatePd(platform, sensorType, env, rangeKm);
        if (!bestPdComponents || pdComponents.final_pd > bestPdComponents.final_pd) {
          bestPdComponents = pdComponents;
        }
      }

      if (!bestPdComponents) continue;

      // Monte Carlo detection roll
      const detectionRoll = roll();
      if (detectionRoll > bestPdComponents.final_pd) continue; // Not detected this turn

      // Platform detected — now apply classification and delay
      const misclassResult = this.applyMisclassification(platform, bestPdComponents.sensor_type, roll);
      const delayTurns = this.applyDelay(detectingOrbat.c2.comms_status, bestPdComponents.sensor_type);
      const timeToImpact = this.computeTimeToImpact(platform, rangeKm);
      const confidence = this.pdToConfidence(bestPdComponents.final_pd);

      // Check if this contact already exists from a previous turn
      const existingContactId = this.findExistingContact(
        worldState, detectingForce, platform.id
      );

      contacts.push({
        contact_id: existingContactId || `CONTACT-${detectingForce}-${platform.id}-T${worldState.turn}`,
        true_platform_id: platform.id,    // SPECTRAL-REF only — stripped before sending to player
        detected_by: detectingForce,
        confidence,
        classification: misclassResult.reported_classification,
        true_type: platform.type,          // SPECTRAL-REF only
        bearing_deg: this.estimateBearing(worldState, detectingForce, platform),
        range_km: rangeKm + this.rangeError(bestPdComponents.final_pd, roll),
        altitude_m: platform.altitude_m !== null
          ? platform.altitude_m + this.altitudeError(bestPdComponents.final_pd, roll)
          : null,
        speed_kt: platform.speed_kt
          ? platform.speed_kt + this.speedError(bestPdComponents.final_pd, roll)
          : null,
        detection_method: bestPdComponents.sensor_type,
        detection_probability: bestPdComponents.final_pd,
        first_detected_turn: worldState.turn,
        last_updated_turn: worldState.turn,
        time_to_impact_turns: timeToImpact,
        location_grid: this.gridFromRange(worldState, detectingForce, platform),
        misclassified: misclassResult.misclassified,
        report_delay_turns: delayTurns,
      });
    }

    // Retain contacts from previous turns that weren't re-detected this turn
    // (fading track — confidence degrades each turn without redetection)
    const retainedContacts = this.retainFadingTracks(
      worldState, detectingForce, contacts, worldState.turn
    );

    return [...contacts, ...retainedContacts];
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BASE Pd — sensor type × platform type
  // ─────────────────────────────────────────────────────────────────────────

  private getBasePd(platform: Platform, sensorType: DetectionMethod, rangeKm: number): number {
    switch (sensorType) {

      case 'radar':
        return this.getRadarBasePd(platform);

      case 'eo_ir':
        return this.getEOIRBasePd(platform);

      case 'rf_sigint':
        return this.getRFBasePd(platform);

      case 'acoustic':
        return this.getAcousticBasePd(platform, rangeKm);

      case 'visual':
        return this.getVisualBasePd(platform, rangeKm);

      case 'ais':
        // AIS only applicable to vessels
        return platform.group === 'USV' ? BASE_PD.AIS.NON_COOPERATIVE : 0;

      default:
        return 0;
    }
  }

  private getRadarBasePd(platform: Platform): number {
    // Special case: altitude-dependent for OWA and small UAS
    const altitude = platform.altitude_m ?? 0;

    if (platform.group === 'OWA') {
      if (altitude > 1000) return BASE_PD.RADAR.OWA_HIGH_ALT;
      if (altitude > 500)  return BASE_PD.RADAR.OWA_MID_ALT;
      if (altitude >= 200) return BASE_PD.RADAR.OWA_LOW_ALT;
      return BASE_PD.RADAR.OWA_ULTRALOW_ALT;
    }

    if (platform.group === 'loitering_munition') return BASE_PD.RADAR.LOITERING_MUNITION;
    if (platform.group === 'FPV') {
      if (altitude <= 20) return BASE_PD.RADAR.FPV_ULTRALOW;
      return BASE_PD.RADAR.FPV_LOW;
    }
    if (platform.group === 'decoy') return BASE_PD.RADAR.DECOY;
    if (platform.group === 'USV')   return BASE_PD.RADAR.USV;

    if (platform.group === 'UCAV' && platform.rcs_class === 'very_low') {
      return BASE_PD.RADAR.STEALTH_UCAV; // GJ-11 class
    }

    if (['MALE_strike', 'MALE_isr'].includes(platform.group)) {
      return BASE_PD.RADAR.GROUP_3_UCAV;
    }
    if (['HALE_isr', 'CCA'].includes(platform.group)) {
      return BASE_PD.RADAR.GROUP_5_MALE;
    }
    if (platform.group === 'nano_isr') return BASE_PD.RADAR.GROUP_1_NANO;

    return BASE_PD.RADAR.GROUP_3_UCAV; // default
  }

  private getEOIRBasePd(platform: Platform): number {
    // EO/IR detection depends heavily on time of day
    // Night Pd uses thermal contrast modifier
    if (platform.group === 'FPV' && platform.ew_immune) {
      // Fibre-optic FPV — minimal motor heat
      return BASE_PD.EO_IR.STEALTH_LOW_THERMAL;
    }
    return BASE_PD.EO_IR.ANY_DAY_CLEAR; // day default — weather modifier applied later
  }

  private getRFBasePd(platform: Platform): number {
    if (platform.ew_immune) return BASE_PD.RF_SIGINT.FIBRE_OPTIC_FPV;
    if (platform.guidance === 'fibre_optic_FPV') return BASE_PD.RF_SIGINT.FIBRE_OPTIC_FPV;
    if (platform.guidance === 'autonomous_swarm') return BASE_PD.RF_SIGINT.AUTONOMOUS_AI;

    // Is the platform emitting?
    if (this.isPlatformEmitting(platform)) {
      if (platform.guidance === 'GNSS_INS') return BASE_PD.RF_SIGINT.EMITTING_DATALINK;
      if (platform.guidance === 'GNSS_INS_ATR') return BASE_PD.RF_SIGINT.EMITTING_DATALINK;
      if (platform.sensor) return BASE_PD.RF_SIGINT.EMITTING_DATALINK; // ISR platform with sensor
      return BASE_PD.RF_SIGINT.EMITTING_COMMS;
    }

    return BASE_PD.RF_SIGINT.EO_IR_PASSIVE; // passive — very low
  }

  private getAcousticBasePd(platform: Platform, rangeKm: number): number {
    if (rangeKm > 10) return 0; // acoustic not effective beyond 10km
    if (rangeKm > 5)  return BASE_PD.ACOUSTIC.SMALL_UAS_10KM;
    if (rangeKm > 2)  return BASE_PD.ACOUSTIC.SMALL_UAS_5KM;

    if (platform.group === 'FPV' && platform.ew_immune) {
      // Fibre-optic FPV — still audible, props are the giveaway
      return BASE_PD.ACOUSTIC.FIBRE_OPTIC_FPV;
    }

    return BASE_PD.ACOUSTIC.SMALL_UAS_2KM;
  }

  private getVisualBasePd(platform: Platform, rangeKm: number): number {
    if (rangeKm > 5)  return BASE_PD.VISUAL.BEYOND_5KM;
    if (rangeKm > 3)  return BASE_PD.VISUAL.ANY_WITHIN_3KM;
    if (rangeKm > 1)  return BASE_PD.VISUAL.ANY_WITHIN_1KM;
    if (rangeKm > 0.5 && ['FPV', 'nano_isr', 'loitering_munition'].includes(platform.group)) {
      return BASE_PD.VISUAL.SMALL_WITHIN_500M;
    }
    return BASE_PD.VISUAL.ANY_WITHIN_1KM;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MODIFIER CALCULATORS
  // ─────────────────────────────────────────────────────────────────────────

  private getWeatherModifier(sensorType: DetectionMethod, weather: Weather): number {
    const precip = weather.precipitation;

    switch (sensorType) {
      case 'radar':
        if (precip === 'none')       return WEATHER_MOD.RADAR.CLEAR;
        if (precip === 'light_rain') return WEATHER_MOD.RADAR.LIGHT_RAIN;
        if (precip === 'heavy_rain') return WEATHER_MOD.RADAR.HEAVY_RAIN;
        if (precip === 'snow')       return WEATHER_MOD.RADAR.SNOW;
        if (precip === 'fog')        return WEATHER_MOD.RADAR.FOG;
        if (precip === 'dust')       return WEATHER_MOD.RADAR.DUST_STORM;
        if (precip === 'hail')       return WEATHER_MOD.RADAR.THUNDERSTORM;
        return weather.radar_modifier || 1.0;

      case 'eo_ir':
        // Use the pre-computed modifier from weather object if available
        if (weather.eo_ir_modifier !== undefined && weather.eo_ir_modifier !== 1.0) {
          return weather.eo_ir_modifier;
        }
        if (precip === 'none')       return WEATHER_MOD.EO_DAYLIGHT.CLEAR;
        if (precip === 'light_rain') return WEATHER_MOD.EO_DAYLIGHT.LIGHT_RAIN;
        if (precip === 'heavy_rain') return WEATHER_MOD.EO_DAYLIGHT.HEAVY_RAIN;
        if (precip === 'fog')        return WEATHER_MOD.EO_DAYLIGHT.FOG;
        if (precip === 'dust')       return WEATHER_MOD.EO_DAYLIGHT.DUST_STORM;
        if (precip === 'snow')       return WEATHER_MOD.EO_DAYLIGHT.SNOW;
        return 1.0;

      case 'rf_sigint':
        if (precip === 'hail')  return WEATHER_MOD.RF_SIGINT.THUNDERSTORM;
        if (precip === 'heavy_rain') return WEATHER_MOD.RF_SIGINT.RAIN;
        return WEATHER_MOD.RF_SIGINT.CLEAR;

      case 'acoustic':
        // Wind is the primary acoustic degrader
        if (weather.wind_speed_kt > 30) return WEATHER_MOD.ACOUSTIC.WIND_STRONG;
        if (weather.wind_speed_kt > 15) return WEATHER_MOD.ACOUSTIC.WIND_MODERATE;
        if (weather.wind_speed_kt > 5)  return WEATHER_MOD.ACOUSTIC.WIND_LIGHT;
        return WEATHER_MOD.ACOUSTIC.CLEAR;

      case 'visual':
        // Visibility drives visual detection
        if (weather.visibility_km < 0.5) return 0.08;
        if (weather.visibility_km < 2)   return 0.31;
        if (weather.visibility_km < 5)   return 0.61;
        if (weather.visibility_km < 10)  return 0.85;
        return 1.0;

      default:
        return 1.0;
    }
  }

  private getEWModifier(
    sensorType: DetectionMethod,
    platform: Platform,
    ewAssets: EWAsset[],
    rangeKm: number,
  ): number {
    if (!ewAssets.length) return EW_MOD.RADAR_JAMMING.NONE;

    let worstModifier: number = EW_MOD.RADAR_JAMMING.NONE;

    for (const ewAsset of ewAssets) {
      if (ewAsset.status !== 'active') continue;

      // Is this EW asset within effective range?
      // (simplified — Phase 3 will use actual grid distances)
      const withinRange = rangeKm <= ewAsset.effective_radius_km;
      if (!withinRange) continue;

      // What sensor type does this EW asset affect?
      const affectsRadar = ewAsset.jam_bands.some(b =>
        ['L', 'S', 'C', 'X', 'Ku', 'Ka'].includes(b)
      );

      if (sensorType === 'radar' && affectsRadar) {
        // Classify jamming intensity by asset type
        let mod: number = EW_MOD.RADAR_JAMMING.MODERATE;

        if (ewAsset.type.includes('Krasukha') || ewAsset.type.includes('krasukha')) {
          mod = EW_MOD.RADAR_JAMMING.KRASUKHA_CLASS;
        } else if (ewAsset.effective_radius_km > 100) {
          mod = EW_MOD.RADAR_JAMMING.HEAVY;
        } else if (ewAsset.effective_radius_km < 10) {
          mod = EW_MOD.RADAR_JAMMING.LIGHT;
        }

        worstModifier = Math.min(worstModifier, mod);
      }

      if (sensorType === 'rf_sigint' && affectsRadar) {
        // EW jamming also degrades SIGINT collection
        worstModifier = Math.min(worstModifier, 0.61);
      }
    }

    // Fibre-optic FPV is immune to RF jamming
    if (platform.ew_immune && (sensorType === 'radar' || sensorType === 'rf_sigint')) {
      return 1.0; // No EW effect — the platform doesn't transmit
    }

    return worstModifier;
  }

  private getAltitudeModifier(sensorType: DetectionMethod, platform: Platform): number {
    if (sensorType !== 'radar') return 1.0;

    const smallUASGroups = ['OWA', 'FPV', 'loitering_munition', 'decoy', 'nano_isr'];
    if (!smallUASGroups.includes(platform.group)) return 1.0;

    const altitude = platform.altitude_m ?? 0;

    if (altitude > 3000) return ALTITUDE_MOD.RADAR_VS_SMALL_UAS.ABOVE_3000M_AGL;
    if (altitude > 1000) return ALTITUDE_MOD.RADAR_VS_SMALL_UAS['1000_3000M'];
    if (altitude > 500) return ALTITUDE_MOD.RADAR_VS_SMALL_UAS['500_1000M'];
    if (altitude >= 200) return ALTITUDE_MOD.RADAR_VS_SMALL_UAS['200_500M'];
    if (altitude > 100) return ALTITUDE_MOD.RADAR_VS_SMALL_UAS['100_200M'];
    if (altitude > 50) return ALTITUDE_MOD.RADAR_VS_SMALL_UAS['50_100M'];
    return ALTITUDE_MOD.RADAR_VS_SMALL_UAS.BELOW_50M;
  }

  private usesRCSModifier(platform: Platform): boolean {
    const smallUASGroups = ['OWA', 'FPV', 'loitering_munition', 'decoy', 'nano_isr'];
    if (smallUASGroups.includes(platform.group)) return true;
    return platform.group === 'UCAV' && platform.rcs_class === 'very_low';
  }

  private getRCSModifier(platform: Platform): number {
    switch (platform.rcs_class) {
      case 'very_low': return RCS_MOD.VERY_LOW;
      case 'low':      return RCS_MOD.LOW;
      case 'medium':   return RCS_MOD.MEDIUM;
      case 'high':     return RCS_MOD.HIGH;
      default:         return RCS_MOD.MEDIUM;
    }
  }

  private getTerrainMaskingModifier(platform: Platform, terrainType: string): number {
    const altitude = platform.altitude_m ?? 0;

    // Airborne platforms at significant altitude — terrain rarely masks
    if (altitude > 5000) return 1 - TERRAIN.MASKING_PROBABILITY.ABOVE_TERRAIN_BY_200M;
    if (altitude > 200) return 1 - TERRAIN.MASKING_PROBABILITY.ABOVE_BY_100M;
    if (altitude > 100)  return 1 - TERRAIN.MASKING_PROBABILITY.ABOVE_BY_100M;
    if (altitude > 50)   return 1 - TERRAIN.MASKING_PROBABILITY.ABOVE_BY_50M;

    // Nap of earth / low altitude — terrain masking significant
    if (terrainType.includes('mountain') || terrainType.includes('highland')) {
      return 1 - TERRAIN.MASKING_PROBABILITY.AT_OR_BELOW_RIDGE;
    }
    if (terrainType.includes('urban') || terrainType.includes('city')) {
      return 1 - TERRAIN.MASKING_PROBABILITY.NEARING_GROUND;
    }

    return 1 - TERRAIN.MASKING_PROBABILITY.ABOVE_BY_50M;
  }

  private getCountermeasuresModifier(platform: Platform, sensorType: DetectionMethod): number {
    // Stealth platforms have built-in countermeasures
    if (platform.rcs_class === 'very_low' && sensorType === 'radar') {
      return EW_MOD.COUNTERMEASURES.STEALTH_PROFILE;
    }
    // No active countermeasures in Phase 2 (chaff/flare active is Phase 3)
    return EW_MOD.COUNTERMEASURES.NONE;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MISCLASSIFICATION ENGINE
  // ─────────────────────────────────────────────────────────────────────────

  private applyMisclassification(
    platform: Platform,
    sensorType: DetectionMethod,
    roll: () => number = () => Math.random(),
  ): { misclassified: boolean; reported_classification: string; true_classification: string } {
    const trueClassification = this.getTrueClassification(platform);

    // Multi-modal detection improves classification accuracy
    // (Single sensor has higher misclass rate)
    let misclassRate = this.getMisclassRate(platform);

    // SIGINT detection doesn't help classification — no signature library
    if (sensorType === 'acoustic') {
      misclassRate = misclassRate * 1.4; // acoustic classification is worse
    }

    const misclassRoll = roll();
    if (misclassRoll > misclassRate) {
      // Correctly classified
      return {
        misclassified: false,
        reported_classification: trueClassification,
        true_classification: trueClassification,
      };
    }

    // Misclassified — determine what it's reported as
    const reportedClassification = this.getMisclassifiedAs(platform, roll);
    return {
      misclassified: true,
      reported_classification: reportedClassification,
      true_classification: trueClassification,
    };
  }

  private getMisclassRate(platform: Platform): number {
    switch (platform.group) {
      case 'OWA':              return MISCLASSIFICATION.OWA_AS_COMMERCIAL_DRONE + MISCLASSIFICATION.OWA_AS_BIRD;
      case 'FPV':              return MISCLASSIFICATION.FPV_AS_BIRD;
      case 'decoy':            return MISCLASSIFICATION.DECOY_AS_REAL_OWA; // inverted — decoy classified as real
      case 'loitering_munition': return MISCLASSIFICATION.LOITERING_MUNITION_AS_FPV;
      case 'USV':              return MISCLASSIFICATION.USV_AS_DEBRIS;
      case 'MALE_strike':      return 1 - MISCLASSIFICATION.MALE_UAV_CORRECT; // 0.09
      default:                 return 0.10;
    }
  }

  private getMisclassifiedAs(platform: Platform, roll: () => number = () => Math.random()): string {
    switch (platform.group) {
      case 'OWA':              return roll() > 0.5 ? 'civilian_drone' : 'large_bird';
      case 'FPV':              return 'large_bird';
      case 'decoy':            return 'OWA_munition'; // decoy successfully fools sensor
      case 'loitering_munition': return 'FPV_drone';
      case 'USV':              return 'debris_or_wave';
      case 'MALE_strike':      return 'manned_aircraft';
      default:                 return 'unknown_air';
    }
  }

  private getTrueClassification(platform: Platform): string {
    const classMap: Record<string, string> = {
      'OWA':                  'OWA_munition',
      'FPV':                  'FPV_drone',
      'decoy':                'decoy',
      'loitering_munition':   'loitering_munition',
      'MALE_strike':          'MALE_UCAV',
      'MALE_isr':             'MALE_UAV_ISR',
      'HALE_isr':             'HALE_UAV_ISR',
      'UCAV':                 'UCAV',
      'CCA':                  'CCA',
      'nano_isr':             'nano_UAV',
      'EW':                   'EW_platform',
      'USV':                  'USV',
      'c_uas_detect':         'c_uas_sensor',
      'c_uas_defeat_kinetic': 'c_uas_launcher',
      'c_uas_defeat_ew':      'EW_jammer',
    };
    return classMap[platform.group] || 'unknown';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // REPORTING DELAY ENGINE
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * applyDelay
   * Converts raw reporting chain latency into game turns.
   * 1 turn = 15 minutes = 900 seconds.
   */
  applyDelay(commsStatus: string, sensorType: DetectionMethod): number {
    // Organic sensor to GCS
    const sensorDelay = REPORTING_DELAY_SEC.UAS_SENSOR_TO_GCS.mean;

    // Operator to commander
    const opDelay = REPORTING_DELAY_SEC.GCS_OPERATOR_TO_UNIT_CDR.mean;

    let baseDelaySec = sensorDelay + opDelay;

    // Special case: SIGINT takes longer to process
    if (sensorType === 'rf_sigint') {
      baseDelaySec += REPORTING_DELAY_SEC.SIGINT_SINGLE_SENSOR_FIX.mean;
    }

    // Apply comms degradation multiplier
    const multiplierKey = commsStatus.toUpperCase().replace(/-/g, '_') as keyof typeof REPORTING_DELAY_SEC.COMMS_DEGRADATION_MULTIPLIER;
    const multiplier = REPORTING_DELAY_SEC.COMMS_DEGRADATION_MULTIPLIER[multiplierKey] || 1.0;

    const totalDelaySec = baseDelaySec * multiplier;

    // Convert to game turns (900 seconds per turn)
    // Minimum 0 turns (detected and reported within the same turn)
    return Math.max(0, Math.floor(totalDelaySec / 900));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TIME TO IMPACT
  // ─────────────────────────────────────────────────────────────────────────

  computeTimeToImpact(platform: Platform, rangeKm: number): number | null {
    if (!['OWA', 'loitering_munition', 'FPV'].includes(platform.group)) return null;

    let kmPerTurn: number;

    if (platform.type.includes('Shahed-238') || platform.type.includes('Geran-3')) {
      kmPerTurn = IMPACT_TIMING.SHAHED_238.KM_PER_TURN;
    } else if (platform.group === 'OWA') {
      kmPerTurn = IMPACT_TIMING.SHAHED_136.KM_PER_TURN;
    } else if (platform.group === 'FPV') {
      kmPerTurn = IMPACT_TIMING.FPV.KM_PER_TURN;
    } else {
      // Loitering munition — assume similar to FPV terminal speed
      kmPerTurn = 50 / 4; // 50 km/h terminal
    }

    const turnsToImpact = Math.ceil(rangeKm / kmPerTurn);
    return Math.max(1, turnsToImpact);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TRACK MANAGEMENT — fading contacts from previous turns
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * retainFadingTracks
   * Contacts that were detected in previous turns but not re-detected this turn
   * are retained with degraded confidence for 1–3 turns before dropping off.
   * This replicates the "track age" concept in real C2 systems.
   */
  private retainFadingTracks(
    worldState: WorldState,
    detectingForce: ForceId,
    newContacts: Contact[],
    currentTurn: number,
  ): Contact[] {
    // Get previous turn's contacts for this force
    const previousContacts = worldState.all_contacts.filter(
      c => c.detected_by === detectingForce
    );

    const newContactPlatformIds = new Set(newContacts.map(c => c.true_platform_id));

    const fadingContacts: Contact[] = [];

    for (const prevContact of previousContacts) {
      // Skip if re-detected this turn
      if (newContactPlatformIds.has(prevContact.true_platform_id)) continue;

      // Calculate track age
      const trackAge = currentTurn - prevContact.last_updated_turn;
      if (trackAge > 3) continue; // Drop track after 3 turns without redetection

      // Degrade confidence
      const degradedConfidence = this.degradeConfidence(prevContact.confidence, trackAge);
      if (degradedConfidence === null) continue;

      fadingContacts.push({
        ...prevContact,
        confidence: degradedConfidence,
        last_updated_turn: prevContact.last_updated_turn,
        // Update time to impact estimate
        time_to_impact_turns: prevContact.time_to_impact_turns !== null
          ? Math.max(0, prevContact.time_to_impact_turns - trackAge)
          : null,
      });
    }

    return fadingContacts;
  }

  private degradeConfidence(confidence: ContactConfidence, age: number): ContactConfidence | null {
    const ladder: ContactConfidence[] = ['confirmed', 'high', 'medium', 'low', 'possible'];
    const currentIdx = ladder.indexOf(confidence);

    const newIdx = currentIdx + age;
    if (newIdx >= ladder.length) return null; // track dropped

    return ladder[newIdx];
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CONFIDENCE MAPPING
  // ─────────────────────────────────────────────────────────────────────────

  pdToConfidence(pd: number): ContactConfidence {
    if (pd >= 0.90) return 'confirmed';
    if (pd >= 0.70) return 'high';
    if (pd >= 0.45) return 'medium';
    if (pd >= 0.20) return 'low';
    return 'possible';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MEASUREMENT ERROR — realistic sensor imprecision
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Sensor measurements are never exact.
   * Error bands are applied to range, altitude, and speed estimates.
   * Lower Pd = more uncertainty = larger error band.
   */

  private rangeError(pd: number, roll: () => number = () => Math.random()): number {
    const maxError = pd < 0.5 ? 8 : pd < 0.8 ? 3 : 1;
    return (roll() * 2 - 1) * maxError;
  }

  private altitudeError(pd: number, roll: () => number = () => Math.random()): number {
    const maxError = pd < 0.5 ? 200 : pd < 0.8 ? 100 : 30;
    return (roll() * 2 - 1) * maxError;
  }

  private speedError(pd: number, roll: () => number = () => Math.random()): number {
    const maxError = pd < 0.5 ? 30 : pd < 0.8 ? 15 : 5;
    return (roll() * 2 - 1) * maxError;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // UTILITY HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  private isPlatformEmitting(platform: Platform): boolean {
    // Platforms that are transmitting and therefore detectable by SIGINT
    if (platform.ew_immune) return false;
    if (platform.guidance === 'fibre_optic_FPV') return false;
    if (platform.guidance === 'pre_programmed') return false;
    if (platform.status === 'pre_launch') return false;

    // Most airborne platforms are emitting
    return ['airborne_tasked', 'airborne_loiter', 'airborne_returning'].includes(platform.status);
  }

  private getAvailableSensors(
    friendlyPlatforms: Platform[],
    _targetPlatform: Platform,
  ): DetectionMethod[] {
    // Determine what sensors the detecting force has available
    // Phase 2: simplified — all sensor types always available
    // Phase 3: will check specific c-UAS detect assets and their operational status
    const sensors: DetectionMethod[] = ['radar', 'eo_ir', 'acoustic', 'visual'];

    // SIGINT available if any SIGINT-capable platform is airborne
    const hasSIGINT = friendlyPlatforms.some(p =>
      ['MALE_isr', 'HALE_isr', 'EW'].includes(p.group) &&
      ['airborne_tasked', 'airborne_loiter'].includes(p.status)
    );
    if (hasSIGINT) sensors.push('rf_sigint');

    // AIS available for maritime scenarios
    sensors.push('ais');

    return sensors;
  }

  private getActiveEWAssets(worldState: WorldState, detectingForce: ForceId): EWAsset[] {
    // Return adversary EW assets that could degrade the detecting force's sensors
    const adversaryForce = detectingForce === 'RED'
      ? worldState.blue_force
      : worldState.red_force;

    return adversaryForce.ew_assets.filter(a => a.status === 'active');
  }

  private estimateRange(worldState: WorldState, detectingForce: ForceId, platform: Platform): number {
    // Phase 2: simplified range estimate from force C2 node to platform grid
    // Phase 3: will use actual CesiumJS coordinates from world state
    // For now: derive a plausible range from platform location grid character
    const grid = Array.isArray(platform.location_grid)
      ? platform.location_grid[0]
      : platform.location_grid || 'ECHO-7';

    // Map grid letters to rough distances (A = close, Z = far)
    // This is a placeholder — Phase 3 replaces with actual coordinate math
    const gridLetter = grid.charAt(0).toUpperCase();
    const letterIndex = gridLetter.charCodeAt(0) - 'A'.charCodeAt(0); // 0=A, 25=Z
    const baseRange = 20 + letterIndex * 5; // A=20km, E=40km, H=55km, Z=145km

    return baseRange + (Math.random() * 10 - 5); // ±5km variation
  }

  private estimateBearing(
    worldState: WorldState,
    detectingForce: ForceId,
    platform: Platform,
  ): number {
    // Phase 2: return a plausible bearing — Phase 3 will compute from coordinates
    // Red typically attacks from East/NE in IRON CROW, Blue defends from West/NW
    const grid = Array.isArray(platform.location_grid)
      ? platform.location_grid[0]
      : platform.location_grid || '';

    if (detectingForce === 'BLUE') {
      // Red platforms typically come from east/north
      return 47 + (Math.random() * 40 - 20);
    }
    // Blue platforms typically to the west/south from Red's perspective
    return 247 + (Math.random() * 40 - 20);
  }

  private gridFromRange(
    worldState: WorldState,
    detectingForce: ForceId,
    platform: Platform,
  ): string {
    // Phase 2: return platform's true grid as approximate reported position
    // Phase 3: will apply position error based on sensor accuracy
    return Array.isArray(platform.location_grid)
      ? platform.location_grid[0]
      : platform.location_grid || 'UNKNOWN';
  }

  private findExistingContact(
    worldState: WorldState,
    detectingForce: ForceId,
    truePlatformId: string,
  ): string | null {
    const existing = worldState.all_contacts.find(
      c => c.detected_by === detectingForce && c.true_platform_id === truePlatformId
    );
    return existing?.contact_id || null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC UTILITIES (used by SPECTRAL-REF for DS briefing generation)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * explainDetection
   * Generates a human-readable explanation of why a platform was or was not detected.
   * Used by SPECTRAL-REF to generate the DS briefing and the SPECTRAL suggestion engine.
   */
  explainDetection(
    platform: Platform,
    pdComponents: PdComponents,
    detected: boolean,
  ): string {
    const lines: string[] = [];

    lines.push(`Platform: ${platform.type} (${platform.group})`);
    lines.push(`Final Pd: ${(pdComponents.final_pd * 100).toFixed(1)}% — ${detected ? 'DETECTED' : 'NOT DETECTED'}`);
    lines.push('');
    lines.push('Component breakdown:');
    lines.push(`  Base Pd (${pdComponents.sensor_type}): ${(pdComponents.base_pd * 100).toFixed(1)}%`);
    lines.push(`  Weather modifier:    ×${pdComponents.weather_modifier.toFixed(2)}`);
    lines.push(`  EW modifier:         ×${pdComponents.ew_modifier.toFixed(2)}`);
    lines.push(`  Altitude modifier:   ×${pdComponents.altitude_modifier.toFixed(2)}`);
    lines.push(`  RCS modifier:        ×${pdComponents.rcs_modifier.toFixed(2)}`);
    lines.push(`  Terrain masking:     ×${pdComponents.terrain_masking_modifier.toFixed(2)}`);
    lines.push(`  Countermeasures:     ×${pdComponents.countermeasures_modifier.toFixed(2)}`);

    if (platform.group === 'OWA' && platform.altitude_m !== null && platform.altitude_m < 300) {
      lines.push('');
      lines.push('⚠ INSTRUCTOR NOTE: OWA at low altitude is the most common Blue Force');
      lines.push('  detection failure. At 200m AGL under EW conditions, Pd approaches');
      lines.push('  0.019 — effectively undetectable by radar alone. Multi-sensor');
      lines.push('  confirmation and ISR asset pre-positioning is the only reliable counter.');
    }

    return lines.join('\n');
  }

  /**
   * getDetectionSummary
   * Returns a summary of what each force can and cannot see.
   * Used by SPECTRAL-REF DS briefing.
   */
  getDetectionSummary(worldState: WorldState): {
    redSees: number;
    blueSees: number;
    redMissing: string[];
    blueMissing: string[];
  } {
    const redContacts = worldState.all_contacts.filter(c => c.detected_by === 'RED');
    const blueContacts = worldState.all_contacts.filter(c => c.detected_by === 'BLUE');

    const redMissing = worldState.blue_force.platforms
      .filter(p => p.status !== 'destroyed')
      .filter(p => !redContacts.some(c => c.true_platform_id === p.id))
      .map(p => `${p.type} (${p.group})`);

    const blueMissing = worldState.red_force.platforms
      .filter(p => p.status !== 'destroyed')
      .filter(p => !blueContacts.some(c => c.true_platform_id === p.id))
      .map(p => `${p.type} (${p.group})`);

    return {
      redSees: redContacts.length,
      blueSees: blueContacts.length,
      redMissing,
      blueMissing,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SINGLETON EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export const fogOfWarEngine = new FogOfWarEngine();
