import { describe, expect, it } from 'vitest'
import { DEFAULT_AGL_M, inferDefaultMissionGoal, planMissionPath } from '@/lib/map/mission-path-planner'
import type { MapCuasAsset, MapEffectorAsset, MapUasAsset, PlacedCuas, PlacedEffector, PlacedRadar } from '@/lib/map/types'

const uasAsset: MapUasAsset = {
  id: 'shahed-136', name: 'Shahed-136', slug: 'shahed-136', category: 'loitering_munition',
  categoryLabel: 'OWA', image_url: null, max_altitude_agl_m: 4000, altitude_reference: 'AGL',
  max_range_km: 50, max_speed_kmh: 185, endurance_min: 120, climb_rate_mpm: 300,
}

const cuasAsset: MapCuasAsset = {
  id: 'dronegun-tactical', name: 'DroneGun Tactical', categoryLabel: 'RF JAMMING', image_url: null,
  defeat_range_m: 1000, defeat_range_km: 1, defeat_methods: ['RF_jamming'],
}

function placedCuas(lon: number, lat: number): PlacedCuas {
  return { instanceId: 'cuas-1', asset: cuasAsset, lon, lat, terrainAMSL: 10, hasTerrainMasking: false }
}

function placedRadar(lon: number, lat: number, detectionKm = 120): PlacedRadar {
  return {
    instanceId: 'radar-1',
    asset: {
      id: 'radar-giraffe-amb',
      name: 'Giraffe AMB',
      side: 'blue',
      role: 'counter_uas',
      roleLabel: 'Surveillance',
      image_url: null,
      detection_range_km: detectionKm,
      dome_range_km: 40,
      sector_deg: 360,
      bandsLabel: 'S-band',
    },
    lon,
    lat,
    terrainAMSL: 100,
  }
}

function shortPdRadar(lon: number, lat: number): PlacedRadar {
  return {
    instanceId: 'radar-short',
    asset: {
      id: 'test-radar-short',
      name: 'Short-range test radar',
      side: 'blue',
      role: 'counter_uas',
      roleLabel: 'Surveillance',
      image_url: null,
      detection_range_km: 1.2,
      dome_range_km: 1.2,
      sector_deg: 360,
      bandsLabel: 'X-band',
    },
    lon,
    lat,
    terrainAMSL: 10,
  }
}

function placedEffector(lon: number, lat: number, domeKm = 10): PlacedEffector {
  const asset: MapEffectorAsset = {
    id: 'eff-iron-beam',
    name: 'Iron Beam',
    side: 'blue',
    tier: 'c_uas',
    tierLabel: 'C-UAS',
    effect: 'laser',
    engagement_max_km: domeKm,
    engagement_min_km: 0,
    engagement_dome_km: domeKm,
    pk_estimate_pct: 90,
    alt_min_km: 0,
    alt_max_km: 5,
    cueing_radar_ids: [],
    linkedRadars: [],
    image_url: null,
  }
  return { instanceId: 'eff-1', asset, lon, lat, terrainAMSL: 10 }
}

describe('mission-path-planner', () => {
  it('pk route detours around effector engagement dome (Iron Beam class)', () => {
    const startLon = 55.0
    const startLat = 26.0
    const goalLon = 55.04
    const goalLat = 26.0
    const plan = planMissionPath({
      startLon,
      startLat,
      startTerrainAMSL: 10,
      goalLon,
      goalLat,
      goalTerrainAMSL: 10,
      goalKind: 'target',
      asset: uasAsset,
      placedCuas: [],
      placedRadars: [],
      placedEffectors: [placedEffector((startLon + goalLon) / 2, startLat, 2)],
      emcon: false,
      routeObjective: 'pk',
    })
    expect(plan.waypoints.length).toBeGreaterThan(2)
    expect(plan.maxPk_pct).toBeLessThanOrEqual(90)
  })

  it('pk route detours around C-UAS sphere', () => {
    const startLon = 55.0, startLat = 26.0, goalLon = 55.04, goalLat = 26.0
    const plan = planMissionPath({
      startLon, startLat, startTerrainAMSL: 10, goalLon, goalLat, goalTerrainAMSL: 10,
      goalKind: 'target', asset: uasAsset,
      placedCuas: [placedCuas((startLon + goalLon) / 2, startLat)],
      placedRadars: [], placedEffectors: [], emcon: false, routeObjective: 'pk',
    })
    expect(plan.waypoints.length).toBeGreaterThan(2)
  })

  it('A* picks a compact flank around C-UAS (not zigzag)', () => {
    const startLon = 55.0, startLat = 26.0, goalLon = 55.04, goalLat = 26.0
    const plan = planMissionPath({
      startLon, startLat, startTerrainAMSL: 10, goalLon, goalLat, goalTerrainAMSL: 10,
      goalKind: 'target', asset: uasAsset,
      placedCuas: [placedCuas((startLon + goalLon) / 2, startLat)],
      placedRadars: [], placedEffectors: [], emcon: false, routeObjective: 'pk',
    })
    expect(plan.waypoints.length).toBeLessThanOrEqual(4)
  })

  it('prefers low altitude near radar on pd route', () => {
    const plan = planMissionPath({
      startLon: 55.0, startLat: 26.0, startTerrainAMSL: 100, goalLon: 55.02, goalLat: 26.0, goalTerrainAMSL: 100,
      goalKind: 'aoi', asset: uasAsset, placedCuas: [], placedEffectors: [], emcon: false,
      placedRadars: [placedRadar(55.01, 26.0)],
      routeObjective: 'pd',
    })
    const transit = plan.waypoints.filter((wp) => wp.kind === 'start' || wp.kind === 'detour')
    for (const wp of transit) expect(wp.alt_m - wp.terrainAMSL).toBeLessThanOrEqual(DEFAULT_AGL_M + 5)
  })

  it('EMCON reduces max Pd estimate on pd route', () => {
    const base = {
      startLon: 55.0, startLat: 26.0, startTerrainAMSL: 100,
      goalLon: 55.015, goalLat: 26.0, goalTerrainAMSL: 100,
      goalKind: 'aoi' as const, asset: uasAsset,
      placedCuas: [], placedEffectors: [],
      placedRadars: [placedRadar(55.008, 26.0)],
      routeObjective: 'pd' as const,
    }
    const active = planMissionPath({ ...base, emcon: false })
    const emcon = planMissionPath({ ...base, emcon: true })
    expect(emcon.maxPd_pct).toBeLessThan(active.maxPd_pct)
  })

  it('pd vs pk objectives produce different paths when radar and cuas both present', () => {
    const startLon = 55.0, startLat = 26.0, goalLon = 55.04, goalLat = 26.0
    const midLon = (startLon + goalLon) / 2
    const shared = {
      startLon, startLat, startTerrainAMSL: 10, goalLon, goalLat, goalTerrainAMSL: 10,
      goalKind: 'target' as const, asset: uasAsset, emcon: false,
      placedCuas: [placedCuas(midLon, startLat)],
      placedRadars: [shortPdRadar(midLon, startLat + 0.008)],
      placedEffectors: [],
    }
    const pdPlan = planMissionPath({ ...shared, routeObjective: 'pd' })
    const pkPlan = planMissionPath({ ...shared, routeObjective: 'pk' })
    const pdCoords = pdPlan.waypoints.map((wp) => `${wp.lon.toFixed(5)},${wp.lat.toFixed(5)}`).join('|')
    const pkCoords = pkPlan.waypoints.map((wp) => `${wp.lon.toFixed(5)},${wp.lat.toFixed(5)}`).join('|')
    expect(pdCoords).not.toEqual(pkCoords)
  })

  it('returns within max_range_km', () => {
    const plan = planMissionPath({
      startLon: 55.0, startLat: 26.0, startTerrainAMSL: 10, goalLon: 56.0, goalLat: 26.0, goalTerrainAMSL: 10,
      goalKind: 'target', asset: uasAsset, placedCuas: [], placedRadars: [], placedEffectors: [], emcon: false,
    })
    expect(plan.totalDistance_km).toBeLessThanOrEqual(uasAsset.max_range_km + 0.01)
    expect(plan.routeObjective).toBe('pk')
    expect(plan.segmentScores?.length).toBe(plan.waypoints.length - 1)
  })

  it('inferDefaultMissionGoal points away from threat centroid', () => {
    const goal = inferDefaultMissionGoal(55.0, 26.0, 50, [{ lon: 55.02, lat: 26.0 }])
    expect(goal.goalLon).toBeLessThan(55.0)
    expect(goal.goalLat).toBeCloseTo(26.0, 1)
  })

  it('start inside effector dome produces more than two waypoints', () => {
    const startLon = 55.0
    const startLat = 26.0
    const goalLon = 55.04
    const goalLat = 26.0
    const plan = planMissionPath({
      startLon,
      startLat,
      startTerrainAMSL: 10,
      goalLon,
      goalLat,
      goalTerrainAMSL: 10,
      goalKind: 'target',
      asset: uasAsset,
      placedCuas: [],
      placedRadars: [],
      placedEffectors: [placedEffector(startLon, startLat, 2)],
      emcon: false,
      routeObjective: 'pk',
    })
    expect(plan.waypoints.length).toBeGreaterThan(2)
    const detours = plan.waypoints.filter((wp) => wp.kind === 'detour')
    expect(detours.length).toBeGreaterThan(0)
  })

  // Vitest only — covers planMissionPath / detourRouteAroundThreats regression.
  // User: "replan around threat isnt planning around the threat"
  it('replan around large effector does not route through dome centre', () => {
    const startLon = 55.0
    const startLat = 26.0
    const goalLon = 55.18
    const goalLat = 26.0
    const midLon = (startLon + goalLon) / 2
    const domeKm = 6
    const plan = planMissionPath({
      startLon,
      startLat,
      startTerrainAMSL: 10,
      goalLon,
      goalLat,
      goalTerrainAMSL: 10,
      goalKind: 'target',
      asset: uasAsset,
      placedCuas: [],
      placedRadars: [],
      placedEffectors: [placedEffector(midLon, startLat, domeKm)],
      emcon: false,
      routeObjective: 'pk',
    })
    expect(plan.waypoints.length).toBeGreaterThan(2)
    for (const wp of plan.waypoints) {
      const dM = Math.hypot(
        (wp.lon - midLon) * 111_000 * Math.cos((startLat * Math.PI) / 180),
        (wp.lat - startLat) * 111_000,
      )
      expect(dM).toBeGreaterThan(domeKm * 1000 * 0.35)
    }
    const offset = plan.waypoints.some((wp) => Math.abs(wp.lat - startLat) > 0.01)
    expect(offset).toBe(true)
  })
})
