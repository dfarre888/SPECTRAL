// SPECTRAL — Collateral Damage Estimation Engine
// CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
//
// Multi-zone CDE model for training simulation.
// Urban / dense_urban tiers apply indoor occupancy (not outdoor-only fractions).

import type {
  BuildingProtection,
  CdeInput,
  CdeResult,
  CriticalInfraType,
  PopulationDensityTier,
  RiskCategory,
  TimeOfDay,
} from './types'

const POP_DENSITY_PKM2: Record<PopulationDensityTier, number> = {
  remote:       2,
  rural:        50,
  suburban:     600,
  urban:        5_000,
  dense_urban:  15_000,
}

const INDOOR_OCCUPANCY: Record<TimeOfDay, number> = {
  early_hours:    0.90,
  morning_peak:   0.80,
  business_day:   0.85,
  evening_peak:   0.75,
  night:          0.70,
}

const OUTDOOR_EXPOSURE: Record<TimeOfDay, number> = {
  early_hours:    0.05,
  morning_peak:   0.25,
  business_day:   0.35,
  evening_peak:   0.30,
  night:          0.15,
}

const PROTECTION_FACTOR: Record<BuildingProtection, number> = {
  open:       1.00,
  light:        0.82,
  reinforced:   0.45,
}

const ZONE_FATALITY_PK = {
  lethal:      0.55,
  injury:      0.12,
  structural:  0.025,
} as const

const ZONE_INJURY_PK = {
  injury:      0.55,
  structural:  0.28,
  hazard:      0.08,
} as const

const BUILT_UP_TIERS: ReadonlySet<PopulationDensityTier> = new Set(['urban', 'dense_urban'])

/** Training-tier spatial density modifier — deterministic from impact coordinates. */
export function locationDensityMultiplier(lon: number, lat: number): number {
  const x = Math.sin(lon * 12.9898 + lat * 78.233) * 43758.5453
  const frac = x - Math.floor(x)
  return 0.35 + frac * 1.65
}

function effectivePopDensity(
  tier: PopulationDensityTier,
  lon: number,
  lat: number,
): number {
  return POP_DENSITY_PKM2[tier] * locationDensityMultiplier(lon, lat)
}

function diskAreaM2(radius_m: number): number {
  return Math.PI * radius_m * radius_m
}

function ringAreaM2(outer_m: number, inner_m: number): number {
  return Math.PI * (outer_m * outer_m - inner_m * inner_m)
}

function popInArea(area_m2: number, density_pkm2: number, exposure: number): number {
  return area_m2 * (density_pkm2 / 1_000_000) * exposure
}

function exposureForTier(
  tier: PopulationDensityTier,
  time: TimeOfDay,
  override?: number,
): number {
  if (override !== undefined) return override
  return BUILT_UP_TIERS.has(tier) ? INDOOR_OCCUPANCY[time] : OUTDOOR_EXPOSURE[time]
}

function round1(n: number): number {
  return parseFloat(n.toFixed(1))
}

function classifyRisk(expected_casualties: number): RiskCategory {
  if (expected_casualties < 1) return 'GREEN'
  if (expected_casualties <= 10) return 'AMBER'
  if (expected_casualties <= 50) return 'RED'
  return 'BLACK'
}

function authorityFor(category: RiskCategory): string {
  switch (category) {
    case 'GREEN':
      return 'Unit commander — proportionality check complete; low ECCas.'
    case 'AMBER':
      return 'Operations centre approval required — ECCas 1–10.'
    case 'RED':
      return 'Senior commander / JFC approval required — ECCas >10.'
    case 'BLACK':
      return 'No-strike recommended — catastrophic civilian casualty expectation.'
  }
}

function infraFlags(infra: CriticalInfraType[]): string[] {
  const labels: Record<CriticalInfraType, string | null> = {
    hospital: 'Hospital within hazard footprint — medical CDE elevated',
    school: 'School within hazard footprint — child CDE factor applies',
    power_grid: 'Power grid node — cascading infrastructure risk',
    water_treatment: 'Water treatment within footprint',
    comms_node: 'Comms node — dual-use infrastructure risk',
    fuel_depot: 'Fuel depot — secondary explosion / fire risk',
    bridge: 'Bridge / choke point — mobility + civilian transit risk',
    none: null,
  }
  return infra.filter((t) => t !== 'none').map((t) => labels[t]!).filter(Boolean)
}

function computeCasualtiesOnly(input: CdeInput): number {
  const { blast, population_tier, time_of_day, building_protection, impact_lon, impact_lat } = input
  const pop_density = effectivePopDensity(population_tier, impact_lon, impact_lat)
  const exposure = exposureForTier(
    population_tier,
    time_of_day,
    input.civilian_exposure_fraction,
  )
  const protection = PROTECTION_FACTOR[building_protection]
  const { lethal_m, injury_m, structural_m } = blast

  const popLethal = popInArea(diskAreaM2(lethal_m), pop_density, exposure)
  const popInjuryRing = popInArea(ringAreaM2(injury_m, lethal_m), pop_density, exposure)
  const popStructuralRing = popInArea(ringAreaM2(structural_m, injury_m), pop_density, exposure)

  const rawFatalities =
    popLethal * ZONE_FATALITY_PK.lethal +
    popInjuryRing * ZONE_FATALITY_PK.injury +
    popStructuralRing * ZONE_FATALITY_PK.structural

  return round1(rawFatalities * protection)
}

function bestTimeWindow(input: Omit<CdeInput, 'time_of_day'>): TimeOfDay {
  const times: TimeOfDay[] = [
    'early_hours',
    'morning_peak',
    'business_day',
    'evening_peak',
    'night',
  ]
  let best: TimeOfDay = 'early_hours'
  let minCas = Infinity
  for (const t of times) {
    const expected_casualties = computeCasualtiesOnly({ ...input, time_of_day: t })
    if (expected_casualties < minCas) {
      minCas = expected_casualties
      best = t
    }
  }
  return best
}

export function computeCde(input: CdeInput): CdeResult {
  const { blast, population_tier, time_of_day, building_protection, impact_lon, impact_lat } = input
  const pop_density = effectivePopDensity(population_tier, impact_lon, impact_lat)
  const base_density = POP_DENSITY_PKM2[population_tier]
  const location_factor = locationDensityMultiplier(impact_lon, impact_lat)
  const exposure = exposureForTier(
    population_tier,
    time_of_day,
    input.civilian_exposure_fraction,
  )
  const protection = PROTECTION_FACTOR[building_protection]

  const { lethal_m, injury_m, structural_m, hazard_m } = blast

  const popLethal = popInArea(diskAreaM2(lethal_m), pop_density, exposure)
  const popInjuryRing = popInArea(ringAreaM2(injury_m, lethal_m), pop_density, exposure)
  const popStructuralRing = popInArea(ringAreaM2(structural_m, injury_m), pop_density, exposure)
  const popHazardRing = popInArea(ringAreaM2(hazard_m, structural_m), pop_density, exposure)
  const population_in_hazard_disk = round1(popInArea(diskAreaM2(hazard_m), pop_density, exposure))

  const rawFatalities =
    popLethal * ZONE_FATALITY_PK.lethal +
    popInjuryRing * ZONE_FATALITY_PK.injury +
    popStructuralRing * ZONE_FATALITY_PK.structural

  const rawInjuries =
    popInjuryRing * ZONE_INJURY_PK.injury +
    popStructuralRing * ZONE_INJURY_PK.structural +
    popHazardRing * ZONE_INJURY_PK.hazard

  const expected_casualties = round1(rawFatalities * protection)
  const expected_injured = round1(rawInjuries * protection)
  const risk_category = classifyRisk(expected_casualties)
  const infrastructure_flags = infraFlags(input.nearby_infrastructure)
  const recommended_time_window = bestTimeWindow(input)

  const builtUpNote = BUILT_UP_TIERS.has(population_tier)
    ? 'Built-up area model: indoor occupancy applied (not outdoor-only).'
    : 'Open-area model: outdoor exposure fraction applied.'

  const proportionality_summary =
    `${blast.weapon_name} (${blast.warhead_kg} kg NEW, TNT-eq ${blast.tnt_equivalent_kg} kg). ` +
    `Impact ${impact_lat.toFixed(4)}°N ${impact_lon.toFixed(4)}°E. ` +
    `Population tier ${population_tier} (~${Math.round(pop_density).toLocaleString()}/km² effective, base ${base_density.toLocaleString()}/km² × location ${location_factor.toFixed(2)}), ${time_of_day}. ` +
    `${builtUpNote} ` +
    `Protection ${building_protection} (factor ${protection}). ` +
    `ECCas ${expected_casualties}, injured ${expected_injured}. ` +
    `Hazard disk population ${population_in_hazard_disk}. ` +
    `Risk ${risk_category}.`

  return {
    input,
    pop_density_pkm2: round1(pop_density),
    lethal_area_m2: round1(diskAreaM2(lethal_m)),
    civilians_in_lethal_zone: round1(popLethal * protection),
    protection_factor: protection,
    time_factor: exposure,
    exposure_fraction: exposure,
    population_in_hazard_disk,
    expected_casualties,
    risk_category,
    expected_injured,
    infrastructure_flags,
    proportionality_summary,
    authority_required: authorityFor(risk_category),
    recommended_time_window,
    rings: {
      lethal_m: blast.lethal_m,
      injury_m: blast.injury_m,
      structural_m: blast.structural_m,
      hazard_m: blast.hazard_m,
    },
  }
}

export function assessEwCivilianImpact(
  tier: PopulationDensityTier,
  radius_km: number,
): string[] {
  const flags: string[] = []

  if (radius_km >= 0.5) {
    flags.push(`Civilian GPS / GNSS receivers degraded within ~${radius_km.toFixed(1)} km`)
  }
  if (radius_km >= 2) {
    flags.push('Automotive navigation and timing-dependent logistics affected')
  }
  if (radius_km >= 5) {
    flags.push('GNSS-dependent aviation within jamming footprint — navigation degradation likely')
  }
  if (tier === 'urban' || tier === 'dense_urban') {
    flags.push('High density of civilian GNSS-dependent systems (rideshare, delivery, SCADA timing)')
  }
  if (radius_km >= 10 && tier !== 'remote' && tier !== 'rural') {
    flags.push('Cell tower / power-grid timing nodes may lose GNSS discipline')
  }

  return flags
}
