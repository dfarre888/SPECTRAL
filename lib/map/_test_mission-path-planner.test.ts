import { describe, expect, it } from 'vitest'
import { DEFAULT_AGL_M, planMissionPath } from '@/lib/map/mission-path-planner'
import type { MapCuasAsset, MapUasAsset, PlacedCuas } from '@/lib/map/types'

const uasAsset: MapUasAsset = {
  id: 'shahed-136', name: 'Shahed-136', slug: 'shahed-136', category: 'loitering_munition',
  categoryLabel: 'OWA', image_url: null, max_altitude_agl_m: 4000, altitude_reference: 'AGL',
  max_range_km: 50, max_speed_kmh: 185, endurance_min: 120, climb_rate_mpm: 300,
}

const cuasAsset: MapCuasAsset = {
  id: 'dronegun-tactical', name: 'DroneGun Tactical', categoryLabel: 'RF JAMMING', image_url: null,
  defeat_range_m: 2000, defeat_range_km: 2, defeat_methods: ['RF_jamming'],
}

function placedCuas(lon: number, lat: number): PlacedCuas {
  return { instanceId: 'cuas-1', asset: cuasAsset, lon, lat, terrainAMSL: 10, hasTerrainMasking: false }
}

describe('mission-path-planner', () => {
  it('path detours around C-UAS sphere', () => {
    const startLon = 55.0, startLat = 26.0, goalLon = 55.04, goalLat = 26.0
    const plan = planMissionPath({
      startLon, startLat, startTerrainAMSL: 10, goalLon, goalLat, goalTerrainAMSL: 10,
      goalKind: 'target', asset: uasAsset,
      placedCuas: [placedCuas((startLon + goalLon) / 2, startLat)],
      placedRadars: [], placedEffectors: [], emcon: false,
    })
    expect(plan.waypoints.length).toBeGreaterThan(2)
  })

  it('prefers low altitude near radar', () => {
    const plan = planMissionPath({
      startLon: 55.0, startLat: 26.0, startTerrainAMSL: 100, goalLon: 55.02, goalLat: 26.0, goalTerrainAMSL: 100,
      goalKind: 'aoi', asset: uasAsset, placedCuas: [], placedEffectors: [], emcon: false,
      placedRadars: [{
        instanceId: 'radar-1',
        asset: { id: 'radar-giraffe-amb', name: 'Giraffe AMB', side: 'blue', role: 'counter_uas', roleLabel: 'Surveillance', image_url: null, detection_range_km: 120, dome_range_km: 40, sector_deg: 360, bandsLabel: 'S-band' },
        lon: 55.01, lat: 26.0, terrainAMSL: 100,
      }],
    })
    const transit = plan.waypoints.filter((wp) => wp.kind === 'start' || wp.kind === 'detour')
    for (const wp of transit) expect(wp.alt_m - wp.terrainAMSL).toBeLessThanOrEqual(DEFAULT_AGL_M + 5)
  })

  it('returns within max_range_km', () => {
    const plan = planMissionPath({
      startLon: 55.0, startLat: 26.0, startTerrainAMSL: 10, goalLon: 56.0, goalLat: 26.0, goalTerrainAMSL: 10,
      goalKind: 'target', asset: uasAsset, placedCuas: [], placedRadars: [], placedEffectors: [], emcon: false,
    })
    expect(plan.totalDistance_km).toBeLessThanOrEqual(uasAsset.max_range_km + 0.01)
  })
})
