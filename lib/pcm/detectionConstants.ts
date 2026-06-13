/**
 * SPECTRAL Persistent Combat Model
 * Phase 2 — Detection Model Constants
 *
 * Single source of truth for all detection probability values.
 * Every number here is derived from the SPECTRAL Programme Specification v1.0
 * and validated by the Phase 1 unit tests.
 *
 * DO NOT modify these values without a corresponding update to the spec
 * and a sign-off from the lead systems analyst.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BASE DETECTION PROBABILITIES (Pd) — clear weather, no EW, optimal altitude
// ─────────────────────────────────────────────────────────────────────────────

export const BASE_PD = {

  // ── RADAR DETECTION ────────────────────────────────────────────────────────
  RADAR: {
    GROUP_5_MALE:         0.95,   // MQ-9B, Global Hawk — large RCS, predictable altitude
    GROUP_4_MALE:         0.91,   // Gray Eagle, Heron TP
    GROUP_3_UCAV:         0.82,   // Bayraktar TB2/TB3 — moderate RCS
    GROUP_3_ISR:          0.85,   // Hermes 900, Orbiter 4
    GROUP_2:              0.74,   // ScanEagle, Altius 600
    OWA_HIGH_ALT:         0.68,   // Shahed-136 at >1000m AGL
    OWA_MID_ALT:          0.44,   // Shahed-136 at 500–1000m AGL
    OWA_LOW_ALT:          0.31,   // Shahed-136 at 200–500m AGL — CRITICAL BAND
    OWA_ULTRALOW_ALT:     0.18,   // Shahed-136 at <200m AGL — standard profile
    LOITERING_MUNITION:   0.22,   // Lancet-3 — very low RCS, small
    FPV_LOW:              0.08,   // FPV at 50m AGL — ground clutter dominant
    FPV_ULTRALOW:         0.03,   // FPV at <20m AGL — effectively undetectable
    STEALTH_UCAV:         0.09,   // GJ-11 Sharp Sword — B-2-class RCS
    DECOY:                0.55,   // Gerbera decoy — designed to look like OWA
    USV:                  0.88,   // Magura V5 — surface vessel, strong return
    GROUP_1_NANO:         0.12,   // Black Hornet, Skydio X10D
  },

  // ── EO/IR DETECTION ────────────────────────────────────────────────────────
  EO_IR: {
    ANY_DAY_CLEAR:        0.78,   // Daylight, clear sky
    ANY_DAY_HAZE:         0.61,
    ANY_NIGHT_THERMAL:    0.45,   // × thermal_contrast_modifier
    STEALTH_LOW_THERMAL:  0.21,   // low thermal signature (fibre-optic FPV — minimal motor heat)
    CHAFF_FLARE_ACTIVE:   0.35,   // countermeasures active
    // Thermal contrast modifiers — applied as multiplier to night Pd
    THERMAL_CONTRAST: {
      JET_EXHAUST:        1.40,   // hot exhaust — actually easier to detect at night
      TURBOPROP:          1.15,
      PISTON:             1.00,
      ELECTRIC:           0.45,   // low heat signature — much harder at night
      FIBRE_OPTIC_FPV:    0.35,   // minimal electronics heat
    }
  },

  // ── RF / SIGINT DETECTION ──────────────────────────────────────────────────
  RF_SIGINT: {
    EMITTING_DATALINK:    0.97,   // any platform transmitting on RF
    EMITTING_RADAR:       0.98,   // active radar emitter — nearly certain detection
    EMITTING_COMMS:       0.89,   // voice/data comms
    EO_IR_PASSIVE:        0.05,   // passive sensor — minimal emissions
    FIBRE_OPTIC_FPV:      0.02,   // near-zero RF emissions — EW blind spot
    AUTONOMOUS_AI:        0.08,   // AI-guided terminal — minimal RF emissions
    ENCRYPTED_HOPPING:    0.41,   // frequency-hopping encrypted datalink
    SATCOM_BLOS:          0.71,   // SATCOM uplink — detectable by space/SIGINT
  },

  // ── ACOUSTIC DETECTION ────────────────────────────────────────────────────
  ACOUSTIC: {
    SMALL_UAS_2KM:        0.81,
    SMALL_UAS_5KM:        0.65,
    SMALL_UAS_10KM:       0.32,
    LARGE_TURBOPROP:      0.90,   // very audible
    ELECTRIC_SMALL:       0.55,   // quieter than piston
    FIBRE_OPTIC_FPV:      0.48,   // still audible — props are the giveaway
    URBAN_NOISE_PENALTY:  0.35,   // subtract from acoustic Pd in dense urban
  },

  // ── VISUAL / OPTICAL ──────────────────────────────────────────────────────
  VISUAL: {
    ANY_WITHIN_3KM:       0.45,   // daylight, trained observer
    ANY_WITHIN_1KM:       0.72,
    SMALL_WITHIN_500M:    0.88,
    BEYOND_5KM:           0.12,
    NIGHT_ANY:            0.05,   // near-impossible without NVG/FLIR
  },

  // ── AIS (Automatic Identification System) ─────────────────────────────────
  AIS: {
    COOPERATIVE_VESSEL:   0.99,   // broadcasting AIS — certain detection
    NON_COOPERATIVE:      0.02,   // not broadcasting (USV, submarine)
  },

} as const;

// ─────────────────────────────────────────────────────────────────────────────
// WEATHER MODIFIERS — multiplied against base Pd
// ─────────────────────────────────────────────────────────────────────────────

export const WEATHER_MOD = {

  RADAR: {
    CLEAR:          1.00,
    HAZE:           0.93,
    LIGHT_RAIN:     0.82,   // rain absorbs radar energy, increases clutter
    MODERATE_RAIN:  0.67,
    HEAVY_RAIN:     0.44,
    SNOW:           0.71,
    FOG:            0.95,   // radar mostly unaffected by fog
    DUST_STORM:     0.73,   // dust causes radar clutter
    THUNDERSTORM:   0.51,   // severe clutter + attenuation
  },

  EO_DAYLIGHT: {
    CLEAR:          1.00,
    HAZE:           0.85,
    LIGHT_RAIN:     0.71,
    MODERATE_RAIN:  0.52,
    HEAVY_RAIN:     0.31,
    SNOW:           0.61,
    FOG:            0.18,
    DUST_STORM:     0.09,
    THUNDERSTORM:   0.22,
    CLOUD_COVER:    0.74,   // partial cloud
    OVERCAST:       0.55,
  },

  EO_IR_NIGHT: {
    CLEAR:          1.00,
    LIGHT_CLOUD:    0.88,
    OVERCAST:       0.71,
    RAIN:           0.52,
    FOG:            0.28,
    DUST_STORM:     0.19,
  },

  RF_SIGINT: {
    CLEAR:          1.00,
    RAIN:           0.91,   // slight attenuation at higher frequencies
    THUNDERSTORM:   0.78,   // lightning noise floor elevated
    IONOSPHERIC:    0.65,   // ionospheric disturbance event
  },

  ACOUSTIC: {
    CLEAR:          1.00,
    WIND_LIGHT:     0.92,
    WIND_MODERATE:  0.74,   // wind noise masks UAV sound
    WIND_STRONG:    0.51,
    RAIN:           0.68,
    THUNDERSTORM:   0.31,
  },

} as const;

// ─────────────────────────────────────────────────────────────────────────────
// EW DEGRADATION MODIFIERS — applied when EW assets are active
// ─────────────────────────────────────────────────────────────────────────────

export const EW_MOD = {

  // Affects radar and RF/SIGINT sensors
  RADAR_JAMMING: {
    NONE:           1.00,
    LIGHT:          0.74,   // standoff jammer, edge of coverage
    MODERATE:       0.52,
    HEAVY:          0.41,   // within main lobe of jammer
    KRASUKHA_CLASS: 0.19,   // Krasukha-4 / S-400 EW component — very effective
    BARRAGE:        0.11,   // broadband barrage jamming
  },

  RF_COMMS_JAMMING: {
    NONE:           1.00,
    LIGHT:          0.81,
    MODERATE:       0.61,
    HEAVY:          0.38,
    SEVERED:        0.05,   // comms effectively severed — only residual noise
  },

  // Countermeasures active on the target platform
  COUNTERMEASURES: {
    NONE:           1.00,
    CHAFF:          0.62,   // radar chaff deployed
    FLARE:          0.71,   // IR flares — reduces EO/IR Pd
    CHAFF_AND_FLARE: 0.51,
    TERRAIN_MASKING: 0.24,  // platform using terrain to mask radar
    STEALTH_PROFILE: 0.31,  // LO aircraft in optimal aspect
  },

} as const;

// ─────────────────────────────────────────────────────────────────────────────
// ALTITUDE MODIFIERS — radar detection of OWA/small UAS
// ─────────────────────────────────────────────────────────────────────────────

export const ALTITUDE_MOD = {

  // Ground-based radar vs OWA/small UAS altitude bands
  // Lower altitude = more ground clutter = lower Pd
  RADAR_VS_SMALL_UAS: {
    ABOVE_3000M_AGL:  1.00,
    '1000_3000M':     0.91,
    '500_1000M':      0.71,
    '200_500M':       0.44,
    '100_200M':       0.31,   // Shahed standard operational profile (200m)
    '50_100M':        0.18,
    BELOW_50M:        0.08,   // ultra-low — sea-skimming, nap of earth
  },

  // Airborne radar vs ground targets — no altitude degradation issue
  AIRBORNE_RADAR_VS_GROUND: {
    OPTIMAL:          1.00,
    CLOUD_BETWEEN:    0.71,
    HEAVY_CLOUD:      0.44,
  },

} as const;

// ─────────────────────────────────────────────────────────────────────────────
// RCS MODIFIERS — Radar Cross Section class multipliers
// ─────────────────────────────────────────────────────────────────────────────

export const RCS_MOD = {
  VERY_HIGH:    1.40,   // large transport-class aircraft, ships
  HIGH:         1.00,   // reference — commercial airliner, Group 5 MALE
  MEDIUM:       0.71,   // TB2-class MALE UCAV
  LOW:          0.41,   // OWA (Shahed), loitering munition
  VERY_LOW:     0.14,   // Lancet-3, FPV, stealth-optimised
  STEALTH:      0.06,   // GJ-11 Sharp Sword, F-35 class
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// INFORMATION DELAY MODEL — reporting chain latency (seconds)
// ─────────────────────────────────────────────────────────────────────────────

export const REPORTING_DELAY_SEC = {

  // Sensor to operator
  UAS_SENSOR_TO_GCS:        { min: 15, max: 45, mean: 25 },
  GROUND_RADAR_TO_OPERATOR: { min: 5, max: 20, mean: 10 },
  ACOUSTIC_TO_OPERATOR:     { min: 10, max: 30, mean: 18 },

  // Operator to commander
  GCS_OPERATOR_TO_UNIT_CDR: { min: 120, max: 300, mean: 180 },   // 2–5 min
  UNIT_CDR_TO_HIGHER_HQ:    { min: 300, max: 900, mean: 480 },   // 5–15 min

  // Intelligence processing
  HQ_INTEL_ASSESSMENT:      { min: 600, max: 1800, mean: 900 },  // 10–30 min
  SIGINT_SINGLE_SENSOR_FIX: { min: 900, max: 2400, mean: 1500 }, // 15–40 min
  SIGINT_MULTI_SENSOR_FIX:  { min: 180, max: 480, mean: 300 },   // 3–8 min

  // EW comms degradation multipliers
  COMMS_DEGRADATION_MULTIPLIER: {
    NOMINAL:            1.0,
    DEGRADED_LIGHT:     1.2,
    DEGRADED_MODERATE:  1.6,
    DEGRADED_HEAVY:     2.4,
    DEGRADED_CRITICAL:  5.0,
    SEVERED:            99,     // effectively no reporting
  },

  // Message loss probability under EW
  MESSAGE_LOSS_PROBABILITY: {
    NOMINAL:            0.00,
    DEGRADED_LIGHT:     0.02,
    DEGRADED_MODERATE:  0.08,
    DEGRADED_HEAVY:     0.22,
    DEGRADED_CRITICAL:  0.45,
    SEVERED:            0.85,
  },

} as const;

// ─────────────────────────────────────────────────────────────────────────────
// MISCLASSIFICATION MODEL — probability of incorrect target type assessment
// ─────────────────────────────────────────────────────────────────────────────

export const MISCLASSIFICATION = {

  // When a radar detects a contact, what is the probability it is
  // classified as something other than its true type?

  OWA_AS_COMMERCIAL_DRONE:    0.28,  // OWA misidentified as civilian DJI etc.
  OWA_AS_BIRD:                0.12,  // low-flying OWA misidentified as large bird
  OWA_AS_DECOY:               0.35,  // real OWA classified as decoy (inverted error)
  DECOY_AS_REAL_OWA:          0.51,  // Gerbera decoy classified as real Shahed
  FPV_AS_BIRD:                0.41,  // FPV at low altitude misidentified as bird
  MALE_UAV_AS_MANNED:         0.08,  // MALE UAV misidentified as manned aircraft
  MALE_UAV_CORRECT:           0.91,  // correctly classified
  LOITERING_MUNITION_AS_FPV:  0.33,  // Lancet misidentified as basic FPV
  USV_AS_DEBRIS:              0.19,  // USV at low profile misidentified as sea debris

  // Classification improves significantly with multi-modal confirmation
  MULTI_MODAL_IMPROVEMENT:    0.65,  // multiply misclassification rate by this factor
  // i.e. if radar alone gives 0.35 misclass rate,
  // radar + EO/IR gives 0.35 × 0.65 = 0.23 misclass rate

} as const;

// ─────────────────────────────────────────────────────────────────────────────
// TERRAIN MASKING CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

export const TERRAIN = {

  // Minimum sensor elevation angles for detection over terrain features
  MIN_ELEVATION_ANGLE_DEG: {
    OPEN_FLAT:      0.5,   // almost any elevation angle works
    ROLLING:        2.0,
    URBAN_LOW:      5.0,
    URBAN_DENSE:    8.0,
    MOUNTAINOUS:    15.0,
    RIDGE_LINE:     25.0,
  },

  // Probability that terrain masks target at different altitude bands
  MASKING_PROBABILITY: {
    ABOVE_TERRAIN_BY_200M: 0.05,  // rarely masked
    ABOVE_BY_100M:         0.12,
    ABOVE_BY_50M:          0.28,
    NEARING_GROUND:        0.51,  // nap of earth — frequently masked
    AT_OR_BELOW_RIDGE:     0.78,
  },

} as const;

// ─────────────────────────────────────────────────────────────────────────────
// TURNS-TO-IMPACT — how many game turns until OWA impacts at different ranges
// Used by FWE to compute time_to_impact_turns on detected contacts
// ─────────────────────────────────────────────────────────────────────────────

export const IMPACT_TIMING = {
  // Shahed-136 at 185 km/h (100 kt) approaches at:
  SHAHED_136: {
    KM_PER_TURN: 185 / 4,    // 4 turns per hour = 46.25 km/turn
    TURNS_FROM_50KM:  Math.ceil(50 / (185 / 4)),    // ~1 turn
    TURNS_FROM_100KM: Math.ceil(100 / (185 / 4)),   // ~3 turns
    TURNS_FROM_200KM: Math.ceil(200 / (185 / 4)),   // ~5 turns
  },
  // Shahed-238 turbojet at 520 km/h
  SHAHED_238: {
    KM_PER_TURN: 520 / 4,    // 130 km/turn
    TURNS_FROM_50KM:  1,
    TURNS_FROM_200KM: Math.ceil(200 / 130),   // ~2 turns vs ~5 for -136
  },
  // FPV at 120 km/h
  FPV: {
    KM_PER_TURN: 120 / 4,    // 30 km/turn
    TURNS_FROM_5KM: 1,
    TURNS_FROM_15KM: 1,
  },
} as const;
