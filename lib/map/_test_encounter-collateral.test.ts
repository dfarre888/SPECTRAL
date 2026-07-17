import { describe, expect, it } from 'vitest'
import { buildEncounterCollateral } from '@/lib/map/encounter-collateral'
import type { MissionPlan, PlacedUas } from '@/lib/map/types'

const shahedUas = {
  instanceId: 'uas-test',
  asset: {
    id: 'shahed-136',
    name: 'Shahed-136 / Geran-2',
    category: 'loitering_munition',
    max_altitude_agl_m: 4000,
    max_speed_kmh: 185,
    max_range_km: 2500,
  },
  lon: 55,
  lat: 25,
  terrainAMSL: 10,
  discAltitude_m: 100,
  ceilingAMSL_m: 4010,
  effectiveRange_km: 2500,
  lateralRadius_m: 2500000,
} as PlacedUas

const targetMission = {
  goalKind: 'target',
  goalLon: 55.2,
  goalLat: 25.1,
  goalTerrainAMSL: 10,
  waypoints: [],
  segmentScores: [],
  totalDistance_km: 100,
  maxPk_pct: 0,
  maxPd_pct: 0,
  pkExposure_km: 0,
  pdExposure_km: 0,
  pkThresholdExceeded: false,
  pdThresholdExceeded: false,
  pathMode: 'hard-avoid',
  routeObjective: 'combined',
  emcon: false,
  manualOverride: false,
  updatedAt: '2026-01-01T00:00:00.000Z',
} as MissionPlan

describe('buildEncounterCollateral', () => {
  it('computes CDE for target mission with mapped warhead', () => {
    const result = buildEncounterCollateral({
      uas: shahedUas,
      mission: targetMission,
      population_tier: 'urban',
      time_of_day: 'business_day',
      building_protection: 'light',
    })
    expect(result.applicable).toBe(true)
    expect(result.warhead?.weapon_id).toBe('shahed-136-warhead')
    expect(result.cde?.expected_casualties).toBeGreaterThan(0)
    expect(result.cde?.expected_injured).toBeGreaterThan(result.cde!.expected_casualties)
    expect(result.cde?.rings.lethal_m).toBeGreaterThan(0)
  })

  it('skips CDE for AOI missions', () => {
    const result = buildEncounterCollateral({
      uas: shahedUas,
      mission: { ...targetMission, goalKind: 'aoi' },
      population_tier: 'urban',
      time_of_day: 'business_day',
      building_protection: 'light',
    })
    expect(result.applicable).toBe(false)
    expect(result.cde).toBeNull()
  })
})
