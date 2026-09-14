import { describe, expect, it } from 'vitest'
import { buildEncounterAssessment } from '@/lib/map/encounter-assessment'
import type { MissionPlan, MissionWaypoint, PlacedUas } from '@/lib/map/types'

function wp(id: string, lon: number, lat: number): MissionWaypoint {
  return { id, lon, lat, terrainAMSL: 100, alt_m: 500, speed_kmh: 200, kind: 'transit' }
}

function mission(waypoints: MissionWaypoint[]): MissionPlan {
  return {
    goalKind: 'target',
    goalLon: 149.2,
    goalLat: -35.2,
    goalTerrainAMSL: 100,
    waypoints,
    emcon: false,
    routeObjective: 'combined',
    manualOverride: false,
    totalDistance_km: 0,
    maxPk_pct: 0,
    maxPd_pct: 0,
    pdExposure_km: 0,
    pkExposure_km: 0,
    pkThresholdExceeded: false,
    pdThresholdExceeded: false,
    pathMode: 'optimized',
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Placed UAS fixture. `category` and `max_altitude_agl_m` are required on
 * MapUasAsset and are read via inferRcsCategoryFromAsset, so they have to be
 * real — an earlier version of this fixture omitted them and the cast hid it.
 */
const uas = {
  instanceId: 'u1',
  asset: {
    id: 'shahed-136',
    name: 'Shahed-136',
    slug: 'shahed-136',
    category: 'loitering_munition',
    categoryLabel: 'Loitering munition',
    side: 'red',
    image_url: null,
    max_altitude_agl_m: 4000,
    altitude_reference: 'AGL',
    max_range_km: 2500,
    max_speed_kmh: 185,
    endurance_min: 400,
    climb_rate_mpm: 120,
  },
  lon: 149.0,
  lat: -35.0,
  terrainAMSL: 100,
  infoPanelClosed: false,
} as unknown as PlacedUas

function run(waypoints: MissionWaypoint[]) {
  return buildEncounterAssessment({
    uas,
    mission: mission(waypoints),
    placedCuas: [],
    placedRadars: [],
    placedEffectors: [],
    overlaps: [],
  })
}

describe('encounter assessment — route length edge cases', () => {
  it('survives a mission with no waypoints', () => {
    // A placed asset with no route drawn yet is an ordinary state. This threw
    // during render, which took the whole React tree down: the page stopped
    // scrolling and every button stopped responding.
    expect(() => run([])).not.toThrow()
  })

  it('survives a mission with a single waypoint', () => {
    // Mid-draw: one point committed, no chord yet.
    expect(() => run([wp('a', 149.0, -35.0)])).not.toThrow()
  })

  it('still produces a usable assessment with no route', () => {
    const a = run([])
    expect(a).toBeTruthy()
    expect(a.collateral === null || typeof a.collateral === 'object').toBe(true)
  })

  it('assesses a two-waypoint route without throwing', () => {
    expect(() => run([wp('a', 149.0, -35.0), wp('b', 149.2, -35.2)])).not.toThrow()
  })

  it('assesses a multi-leg route without throwing', () => {
    const route = [
      wp('a', 149.0, -35.0),
      wp('b', 149.1, -35.05),
      wp('c', 149.2, -35.2),
    ]
    expect(() => run(route)).not.toThrow()
  })

  it('tolerates a mission whose waypoints field is missing entirely', () => {
    // Defensive: persisted laydowns from older builds may not carry the field.
    // Cast through a partial so the delete is legal — persisted laydowns from
    // older builds may genuinely lack the field.
    const m = mission([]) as Partial<MissionPlan>
    delete m.waypoints
    expect(() =>
      buildEncounterAssessment({
        uas,
        mission: m as MissionPlan,
        placedCuas: [],
        placedRadars: [],
        placedEffectors: [],
        overlaps: [],
      }),
    ).not.toThrow()
  })
})
