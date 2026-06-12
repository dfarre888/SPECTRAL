// ─── Platform (UAS) ───────────────────────────────────────────────────────────
export type PlatformCategory =
  | 'MALE' | 'HALE' | 'tactical' | 'loitering_munition'
  | 'FPV' | 'naval' | 'VTOL' | 'fixed_wing_tactical'
  | 'interceptor_uas' | 'combat_hexacopter' | 'carrier_uas' | 'tube_launched_lm'
  // C-UAS / effector categories (Blue systems in the defeat layer)
  | 'c_uas_gun' | 'c_uas_laser' | 'c_uas_rf' | 'manpads' | 'c_uas_system'

export type DataConfidence = 'high' | 'medium' | 'estimated' | 'classified'

export type GuidanceType =
  | 'INS+GPS' | 'INS+EO' | 'RF_command' | 'fibre_optic'
  | 'autonomous' | 'INS_only' | 'mesh' | 'preprogrammed' | 'unknown'

export type NatoConfidence = 'Confirmed' | 'Assessed' | 'Estimated' | 'Reported'

/** GNSS dependency level — mirrors lib/spectrum/types GnssDependency */
export type GnssDependency = 'high' | 'medium' | 'low' | 'none'

/** Provenance confidence of the OSINT record — mirrors lib/spectrum/types SourceConfidence */
export type SourceConfidenceLevel = 'curated' | 'derived' | 'estimated'

/** Side in engagement model — mirrors lib/spectrum/types Side */
export type PlatformSide = 'red' | 'blue' | 'neutral'

/** DoD UAS Group categorisation — mirrors lib/spectrum/types UASGroup */
export type UASGroup = 1 | 2 | 3 | 4 | 5 | null

export interface Platform {
  id: string
  name: string
  manufacturer: string | null
  country_of_origin: string | null
  nato_reporting_name: string | null
  category: PlatformCategory
  guidance_type: GuidanceType | null
  gnss_independent: boolean
  ai_autonomous: boolean
  swarm_capable: boolean
  intel_update_date: string | null
  max_speed_kmh: number | null
  service_ceiling_m: number | null
  range_km: number | null
  endurance_hrs: number | null
  mtow_kg: number | null
  warhead_kg: number | null
  /** OSINT airframe dimensions (metres). */
  length_m: number | null
  wingspan_m: number | null
  height_m: number | null
  /** Unit flyaway cost USD — OSINT estimate. */
  unit_cost_usd: number | null
  /** Initial operational capability year. */
  ioc_year: number | null
  /** Terminal attack speed (loitering munitions). */
  terminal_speed_kmh: number | null
  /** Armour penetration (mm RHA) — loitering munitions. */
  armor_piercing_mm: number | null
  engine_type: string | null
  radar_cross_section_m2: number | null
  rcs_notes: string | null
  c2_uplink_mhz: number[] | null
  c2_downlink_mhz: number[] | null
  data_link_mhz: number[] | null
  frequency_hopping: boolean | null
  gnss_used: string[]
  rtk_capable: boolean
  nav_backup: string[]
  stealth_features: string[]
  payload_hardpoints: number | null
  weapon_types: string[]
  sensor_suite: string[]
  known_operators: string[]
  conflict_deployments: string[]
  itar_controlled: boolean
  data_confidence: DataConfidence
  sources: string[]
  created_at: string
  updated_at: string
  // ── OSINT enrichment fields (added in migration 20260612_osint_fields) ──────
  /** Year platform entered service / was publicly announced */
  year_introduced: number | null
  /** Propulsion description: 'electric' | 'piston' | 'turboprop' | 'turbofan' | 'jet' | 'N/A' */
  propulsion: string | null
  /** Recommended defeat approach for training purposes (OSINT) */
  defeat_note: string | null
  /** Control link frequency description, e.g. '2.4/5.8 GHz ISM' | 'Ku-band SATCOM' | 'fiber-optic' */
  control_link_freq: string | null
  /** GNSS dependency level — determines jamming/spoofing viability */
  gnss_dependency: GnssDependency | null
  // ── Engagement model fields for Arena ────────────────────────────────────────
  /** Side: 'red' | 'blue' — used by Arena and ThreatLibrary */
  side: PlatformSide | null
  /** DoD UAS Group (1–5) — null for Blue effectors */
  uas_group: UASGroup
}

// ─── GNSS ─────────────────────────────────────────────────────────────────────
export interface GnssConstellation {
  id: string
  full_name: string
  operator_country: string
  frequency_bands: FrequencyBand[]
  constellation_size: number
  accuracy_standard_m: number
  accuracy_rtk_m: number | null
  military_signal: boolean
  military_signal_details: string | null
  spoofing_resistance: string
  jamming_vulnerability: string
  notes: string | null
}

export interface FrequencyBand {
  name: string
  mhz: number
  bandwidth_mhz?: number
  signal_type: string
  military_only?: boolean
}

// ─── Jammers ──────────────────────────────────────────────────────────────────
export type JammerTier = 'tier_1_military' | 'tier_2_sdr' | 'tier_3_cots'
export type JammerType = 'portable' | 'vehicle' | 'fixed' | 'airborne' | 'man-portable'

export interface GnssJammer {
  id: string
  name: string
  manufacturer: string | null
  country_of_origin: string
  type: JammerType
  vehicle_platform: string | null
  jammer_tier: JammerTier
  procurement: string
  cost_usd_approx: number | null
  frequency_bands_jammed_mhz: Record<string, string | number>
  effective_radius_km: number
  power_watts: number | null
  spoofing_capable: boolean
  spoofing_software: string | null
  also_jams: string[]
  defeat_drones: string[]
  does_not_defeat: string[]
  known_operators: string[]
  conflict_use: string[]
  skill_required: string
  self_jamming_risk: string
  legal_status: string
  notes: string | null
  data_confidence: DataConfidence
}

// ─── Anti-Drone Systems ────────────────────────────────────────────────────────
export type DefeatMethod =
  | 'RF_jamming' | 'kinetic' | 'laser' | 'net'
  | 'cyber' | 'spoofing' | 'combined' | 'EMP' | 'directed_energy'
  | 'directed_energy_laser' | 'kinetic_interceptor_uas' | 'cyber_takeover' | 'ai_ew_adaptive'

export type Portability = 'man-portable' | 'vehicle' | 'fixed' | 'airborne' | 'naval'

export interface AntiDroneSystem {
  id: string
  name: string
  manufacturer: string
  country: string
  defeat_method: DefeatMethod[]
  frequency_bands_covered_mhz: Record<string, string | number>
  effective_range_m: number
  power_output_w: number | null
  weight_kg: number | null
  portability: Portability
  price_usd_approx: number | null
  platforms_can_defeat: string[]
  conflict_validated: boolean
  conflict_notes: string | null
  sources: string[]
  data_confidence: DataConfidence
}

export interface AdjudicationModifier {
  type: 'weather' | 'emcon' | 'altitude' | 'swarm' | 'terrain' | 'other'
  label: string
  impact: string
}

export interface DefeatEffectiveness {
  id: string
  platform_id: string
  defeat_system_id: string
  rf_jamming_pct: number | null
  kinetic_pct: number | null
  dew_pct: number | null
  data_confidence: DataConfidence
  is_immune: boolean
  immune_reason: string | null
  adjudication_rationale: string | null
  modifiers: AdjudicationModifier[]
  recommended_response: string | null
  weather_limited: boolean
  swarm_engagement_pct: number | null
  special_notes: string | null
  defeat_system?: AntiDroneSystem
}

/** OSINT intelligence update metadata — docs/SPECTRAL_INTEL_UPDATE_2025.md */
export const INTEL_UPDATE_2025 = {
  date: '2026-06-07',
  source: 'docs/SPECTRAL_INTEL_UPDATE_2025.md',
  classification: 'UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY',
} as const

export interface DefeatMatrixPayload {
  platforms: Platform[]
  systems: AntiDroneSystem[]
  effectiveness: DefeatEffectiveness[]
}

// ─── Conflict Incidents ───────────────────────────────────────────────────────
export interface ConflictIncident {
  id: string
  conflict: string
  date_range: string
  location: string
  platform_used: string | null
  mission_type: string
  result: 'success' | 'partial' | 'defeat' | 'unknown'
  defeat_system_used: string | null
  defeat_method: string | null
  tactical_notes: string
  lessons_learned: string
  sources: string[]
  data_confidence: DataConfidence
}

// ─── Navigation Countermeasures ───────────────────────────────────────────────
export interface NavCountermeasure {
  id: string
  name: string
  type: string
  accuracy_m: number
  jamming_resistance: 'none' | 'low' | 'medium' | 'high' | 'immune'
  spoofing_resistance: string
  cost_tier: 'low' | 'medium' | 'high' | 'very_high'
  weight_g: number | null
  military_suitable: boolean
  max_speed_suitable_kmh: number | null
  altitude_range_m: string | null
  limitations: string
  notes: string | null
}

// ─── Scenario Engine ──────────────────────────────────────────────────────────
export type TerrainType = 'urban' | 'desert' | 'mountainous' | 'coastal' | 'jungle' | 'arctic' | 'flat_open'
export type EWEnvironment = 'clean' | 'degraded' | 'contested' | 'denied'
export type GnssAvailability = 'full' | 'multi_constellation' | 'rtk_only' | 'denied'

export interface ScenarioConfig {
  id?: string
  name: string
  terrain_type: TerrainType
  ew_environment: EWEnvironment
  gnss_availability: GnssAvailability
  weather: 'clear' | 'overcast' | 'rain' | 'fog' | 'high_wind'
  time_of_day: 'day' | 'night' | 'dawn_dusk'
  red_platforms: Platform[]
  red_quantity: number[]
  red_mission: string
  blue_systems: AntiDroneSystem[]
  blue_personnel: number
  roe: string
  duration_mins: number
}

export interface ScenarioInject {
  id: string
  timing_mins: number
  title: string
  description: string
  type: 'environmental' | 'threat' | 'friendly' | 'comms' | 'roe' | 'logistics'
  severity: 'low' | 'medium' | 'high' | 'critical'
}

// ─── API responses ────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T | null
  error: string | null
}
