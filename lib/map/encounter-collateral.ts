import { computeCde } from '@/lib/risk/cde-engine'
import type {
  BlastRadii,
  BuildingProtection,
  CdeResult,
  PopulationDensityTier,
  TimeOfDay,
} from '@/lib/risk/types'
import { getWarheadsForPlatform } from '@/lib/risk/warhead-db'
import type { MissionPlan, PlacedUas } from '@/lib/map/types'

export interface EncounterCollateralAssessment {
  applicable: boolean
  warhead: BlastRadii | null
  cde: CdeResult | null
  impactLon: number
  impactLat: number
  summary: string
}

export function resolveWarheadForUas(
  uas: PlacedUas,
  warheadOverride?: BlastRadii | null,
): BlastRadii | null {
  const platformWarheads = getWarheadsForPlatform(uas.asset.id)
  if (platformWarheads.length === 0) return null
  if (
    warheadOverride &&
    platformWarheads.some((w) => w.weapon_id === warheadOverride.weapon_id)
  ) {
    return warheadOverride
  }
  return platformWarheads[0]
}

export function buildEncounterCollateral(input: {
  uas: PlacedUas
  mission: MissionPlan
  population_tier: PopulationDensityTier
  time_of_day: TimeOfDay
  building_protection: BuildingProtection
  warheadOverride?: BlastRadii | null
}): EncounterCollateralAssessment {
  const { uas, mission, population_tier, time_of_day, building_protection, warheadOverride } =
    input

  const impactLon = mission.goalLon
  const impactLat = mission.goalLat

  if (mission.goalKind !== 'target') {
    return {
      applicable: false,
      warhead: null,
      cde: null,
      impactLon,
      impactLat,
      summary: 'AOI mission — collateral damage estimate applies to target strikes only.',
    }
  }

  const warhead = resolveWarheadForUas(uas, warheadOverride)
  if (!warhead) {
    return {
      applicable: false,
      warhead: null,
      cde: null,
      impactLon,
      impactLat,
      summary:
        'No OSINT warhead mapping for this platform — open Blast tool and select a munition manually.',
    }
  }

  const cde = computeCde({
    impact_lon: impactLon,
    impact_lat: impactLat,
    blast: warhead,
    population_tier,
    time_of_day,
    building_protection,
    nearby_infrastructure: ['none'],
  })

  return {
    applicable: true,
    warhead,
    cde,
    impactLon,
    impactLat,
    summary: `${warhead.weapon_name} at target · ECCas ${cde.expected_casualties} · injured ${cde.expected_injured} · ${cde.risk_category}`,
  }
}
