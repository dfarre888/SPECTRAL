// SPECTRAL — Risk Calculation Types
// CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
//
// Implements simplified NATO/US CDE methodology for training purposes.
// All population density and casualty estimates are illustrative — not drawn
// from classified sources. Methodology references:
//   • US Army FM 3-34.214 (Explosives and Demolitions) — Hopkinson-Cranz scaling
//   • STANAG 2526 — Collateral Damage Estimation (open methodology)
//   • UK JDP 0-01.1 — Rules of Engagement and LOAC proportionality

// ─── Blast / Effect Radii ────────────────────────────────────────────────────

export type EffectZone =
  | 'lethal'         // >50% PK personnel, open area
  | 'injury'         // blast lung / tertiary fragment — incapacitation likely
  | 'structural'     // light structures / vehicles destroyed/damaged
  | 'hazard'         // glass / debris hazard, hearing damage

export interface BlastRadii {
  weapon_id: string
  weapon_name: string
  warhead_kg: number               // net explosive weight (NEW) in kg
  tnt_equivalent_kg: number        // after applying TNT equivalence factor
  lethal_m: number                 // Hopkinson-Cranz K=3.6 open field
  injury_m: number                 // K=11.5
  structural_m: number             // K=35
  hazard_m: number                 // K=85 (glass / debris scatter)
  fragmentation_m: number | null   // pre-fragmented / shaped-charge add-on
  notes: string
}

// ─── EW Jamming ──────────────────────────────────────────────────────────────

export type JammerClass =
  | 'manpack'          // handheld / man-portable, <10 W ERP
  | 'vehicle'          // vehicle-mounted, 10–200 W ERP
  | 'fixed_static'     // fixed site, 200–2000 W ERP
  | 'airborne_pod'     // airborne EW pod
  | 'uas_carried'      // small jammer on UAS platform

export interface JammingFrequencyBand {
  label: string
  freq_mhz_low: number
  freq_mhz_high: number
  primary_target: string           // "GPS L1" | "2.4GHz RC" etc.
}

export interface JammingRadii {
  jammer_id: string
  jammer_name: string
  jammer_class: JammerClass
  erp_watts: number
  bands: JammingFrequencyBand[]
  /** Effective jamming radius per frequency band, in metres */
  radius_by_band: Record<string, number>
  /** GPS L1 jamming radius (most requested) */
  gps_l1_radius_m: number
  /** RC / drone C2 link radius (2.4 GHz typical) */
  rc_link_radius_m: number
  /** Overall maximum jamming radius across all bands */
  max_radius_m: number
  terrain_factor: 'LOS_only' | 'extended'
  notes: string
}

// ─── Collateral Damage Estimation (CDE) ──────────────────────────────────────

export type PopulationDensityTier =
  | 'remote'           // <5 / km²
  | 'rural'            // 5–100 / km²
  | 'suburban'         // 100–2000 / km²
  | 'urban'            // 2000–10000 / km²
  | 'dense_urban'      // >10000 / km²

export type TimeOfDay =
  | 'early_hours'      // 0200–0500 local — low outdoor pop
  | 'morning_peak'     // 0600–0900 — transit
  | 'business_day'     // 0900–1700 — full activity
  | 'evening_peak'     // 1700–2100 — elevated outdoor
  | 'night'            // 2100–0200 — reduced

export type BuildingProtection =
  | 'open'             // personnel in open, vehicles
  | 'light'            // timber/masonry, minimal blast protection
  | 'reinforced'       // reinforced concrete — significant attenuation

export type RiskCategory =
  | 'GREEN'            // <1 expected civilian casualty — low risk
  | 'AMBER'            // 1–10 expected — requires authority approval
  | 'RED'              // >10 expected — senior authority required or no-strike
  | 'BLACK'            // civilian casualty expectation catastrophic — no-strike

export type CriticalInfraType =
  | 'hospital'
  | 'school'
  | 'power_grid'
  | 'water_treatment'
  | 'comms_node'
  | 'fuel_depot'
  | 'bridge'
  | 'none'

export interface CdeInput {
  /** Position of planned weapon impact */
  impact_lon: number
  impact_lat: number
  /** Weapon being employed */
  blast: BlastRadii
  /** Population density tier at impact point */
  population_tier: PopulationDensityTier
  /** Local time of planned strike */
  time_of_day: TimeOfDay
  /** Dominant building type in lethal radius */
  building_protection: BuildingProtection
  /** Critical infrastructure within blast hazard radius */
  nearby_infrastructure: CriticalInfraType[]
  /** Proportion of lethal zone expected to contain civilians (0–1) */
  civilian_exposure_fraction?: number
}

export interface CdeResult {
  input: CdeInput
  /** Population density used (persons/km²) */
  pop_density_pkm2: number
  /** Area of lethal zone (m²) */
  lethal_area_m2: number
  /** Civilians estimated within lethal zone */
  civilians_in_lethal_zone: number
  /** Building protection factor applied (0–1 reduction) */
  protection_factor: number
  /** Time-of-day factor applied (0–1 modifier) */
  time_factor: number
  /** Civilian exposure / occupancy fraction used */
  exposure_fraction: number
  /** Estimated persons physically within hazard disk (before lethality) */
  population_in_hazard_disk: number
  /** Expected civilian casualties (ECCas) — fatalities */
  expected_casualties: number
  /** Risk category — determines engagement authority */
  risk_category: RiskCategory
  /** Injury zone civilian count (wider radius) */
  expected_injured: number
  /** Infrastructure risk flags */
  infrastructure_flags: string[]
  /** Proportionality assessment narrative */
  proportionality_summary: string
  /** Recommended engagement authority */
  authority_required: string
  /** Optimal strike window to minimise ECCas */
  recommended_time_window: TimeOfDay
  /** EW blast/structural effect radius — used to size visual rings on map */
  rings: {
    lethal_m: number
    injury_m: number
    structural_m: number
    hazard_m: number
  }
}

// ─── Map Overlay ─────────────────────────────────────────────────────────────

export type RiskOverlayMode = 'blast' | 'jamming' | 'none'

export interface RiskOverlayState {
  mode: RiskOverlayMode
  lon: number
  lat: number
  /** Blast: populated from CdeResult.rings.  Jamming: from JammingRadii. */
  rings: RiskRing[]
  /** Whether the overlay anchor is being dragged */
  dragging: boolean
  /** Tooltip label displayed on hover */
  label: string
}

export interface RiskRing {
  radius_m: number
  color_rgba: [number, number, number, number]   // Cesium Color RGBA (0–255)
  label: string
  zone: EffectZone | 'jamming_effective' | 'jamming_margin'
}
