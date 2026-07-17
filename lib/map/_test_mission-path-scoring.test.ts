import { describe, expect, it } from 'vitest'
import {
  collectPdThreats,
  estimatePdAtPoint,
  pathMetricColorHex,
  scorePathSegment,
  subdivideSegmentForDisplay,
} from '@/lib/map/mission-path-scoring'
import type { MapEffectorAsset, MapUasAsset, PlacedEffector, PlacedRadar } from '@/lib/map/types'

const fpvAsset: MapUasAsset = {
  id: 'fpv-test', name: 'FPV Test', slug: 'fpv-test', category: 'FPV', categoryLabel: 'FPV',
  image_url: null, max_altitude_agl_m: 500, altitude_reference: 'AGL',
  max_range_km: 10, max_speed_kmh: 120, endurance_min: 20, climb_rate_mpm: 200,
}

const giraffeRadar: PlacedRadar = {
  instanceId: 'radar-giraffe',
  asset: {
    id: 'radar-giraffe-amb',
    name: 'Giraffe AMB',
    side: 'blue',
    role: 'counter_uas',
    roleLabel: 'Surveillance',
    image_url: null,
    detection_range_km: 120,
    dome_range_km: 40,
    sector_deg: 360,
    bandsLabel: 'S-band',
  },
  lon: 55.0,
  lat: 26.0,
  terrainAMSL: 50,
}

describe('mission-path-scoring', () => {
  it('collectPdThreats uses class range not display dome', () => {
    const threats = collectPdThreats([giraffeRadar], fpvAsset)
    expect(threats).toHaveLength(1)
    expect(threats[0].classRangeKm).toBe(30)
    expect(threats[0].radius_m).toBe(30_000)
    expect(threats[0].radius_m).not.toBe(giraffeRadar.asset.dome_range_km * 1000)
    expect(threats[0].radius_m).not.toBe(giraffeRadar.asset.detection_range_km * 1000)
  })

  it('estimatePdAtPoint is lower under EMCON', () => {
    const lon = 55.005
    const lat = 26.0
    const altM = 120
    const terrain = 50
    const active = estimatePdAtPoint(lon, lat, altM, terrain, fpvAsset, [giraffeRadar], false)
    const silent = estimatePdAtPoint(lon, lat, altM, terrain, fpvAsset, [giraffeRadar], true)
    expect(silent).toBeLessThan(active)
  })

  it('scorePathSegment integrates pd exposure along segment', () => {
    const score = scorePathSegment(
      55.0, 26.0, 55.01, 26.0, 120, 50, fpvAsset, [], [giraffeRadar], [], undefined, false,
    )
    expect(score.distance_km).toBeGreaterThan(0)
    expect(score.maxPd_pct).toBeGreaterThan(0)
    expect(score.pdExposure).toBeGreaterThan(0)
  })

  it('pathMetricColorHex escalates with risk', () => {
    expect(pathMetricColorHex(5)).toBe('#22C55E')
    expect(pathMetricColorHex(80)).toBe('#EF4444')
  })

  it('subdivideSegmentForDisplay varies metric along segment when threat at start only', () => {
    const effectorAsset: MapEffectorAsset = {
      id: 'eff-iron-beam',
      name: 'Iron Beam',
      side: 'blue',
      tier: 'c_uas',
      tierLabel: 'C-UAS',
      effect: 'laser',
      engagement_max_km: 2,
      engagement_min_km: 0,
      engagement_dome_km: 2,
      pk_estimate_pct: 90,
      alt_min_km: 0,
      alt_max_km: 5,
      cueing_radar_ids: [],
      linkedRadars: [],
      image_url: null,
    }
    const effector: PlacedEffector = {
      instanceId: 'eff-1',
      asset: effectorAsset,
      lon: 55.0,
      lat: 26.0,
      terrainAMSL: 10,
    }
    const loiterAsset: MapUasAsset = {
      id: 'shahed-136', name: 'Shahed-136', slug: 'shahed-136', category: 'loitering_munition',
      categoryLabel: 'OWA', image_url: null, max_altitude_agl_m: 4000, altitude_reference: 'AGL',
      max_range_km: 50, max_speed_kmh: 185, endurance_min: 120, climb_rate_mpm: 300,
    }
    const chunks = subdivideSegmentForDisplay(
      55.0, 26.0, 55.04, 26.0, 500, 10, loiterAsset, [], [], [effector], undefined, false, 'pk',
      undefined, 500, 400,
    )
    expect(chunks.length).toBeGreaterThan(2)
    const first = chunks[0].metricPct
    const last = chunks[chunks.length - 1].metricPct
    expect(first).toBeGreaterThan(last)
    expect(first).toBeGreaterThanOrEqual(80)
    expect(last).toBeLessThan(30)
  })
})
