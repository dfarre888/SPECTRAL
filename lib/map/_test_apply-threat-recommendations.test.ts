import { describe, expect, it } from 'vitest'
import {
  collectRecommendedAssetIds,
  hasCuasNearThreat,
  planRecommendedPlacements,
} from '@/lib/map/apply-threat-recommendations'
import type { ThreatAssessment } from '@/lib/map/threat-assessment'
import type { MapCuasAsset, PlacedCuas, PlacedUas } from '@/lib/map/types'

const uas: PlacedUas = {
  instanceId: 'uas-1',
  asset: {
    id: 'shahed-136',
    name: 'Shahed-136',
    slug: 'shahed-136',
    category: 'loitering_munition',
    categoryLabel: 'OWA',
    image_url: null,
    max_altitude_agl_m: 4000,
    altitude_reference: 'AGL',
    max_range_km: 2500,
    max_speed_kmh: 185,
    endurance_min: 120,
    climb_rate_mpm: 300,
  },
  lon: 55.5,
  lat: 26.99,
  terrainAMSL: 10,
  discAltitude_m: 500,
  lateralRadius_m: 5000,
  ceilingAMSL_m: 4010,
  annotationTime_min: 60,
  effectiveRange_km: 2500,
  infoPanelClosed: true,
}

const detectionAsset: MapCuasAsset = {
  id: 'drone-dome',
  name: 'Drone Dome',
  categoryLabel: 'RADAR + RF',
  image_url: null,
  defeat_range_m: 3000,
  defeat_range_km: 3,
  defeat_methods: ['RF_jamming'],
}

const defeatAsset: MapCuasAsset = {
  id: 'goalkeeper-ciws',
  name: 'Goalkeeper CIWS',
  categoryLabel: 'KINETIC',
  image_url: null,
  defeat_range_m: 3000,
  defeat_range_km: 3,
  defeat_methods: ['kinetic'],
}

const assessment: ThreatAssessment = {
  uasInstanceId: 'uas-1',
  uasName: 'Shahed-136',
  detectionPct: 8,
  defeatPct: 0,
  inEngagement: false,
  bestPlacedCuas: null,
  recommendedDetection: {
    assetId: 'drone-dome',
    name: 'Drone Dome',
    pct: 72,
    reason: 'Band overlap',
  },
  recommendedDefeat: {
    assetId: 'goalkeeper-ciws',
    name: 'Goalkeeper CIWS',
    pct: 68,
    reason: 'Kinetic path',
  },
  tacticNote: 'Place a defeat system',
}

describe('apply threat recommendations', () => {
  it('collects detection then defeat asset ids without duplicates', () => {
    expect(collectRecommendedAssetIds(assessment)).toEqual(['drone-dome', 'goalkeeper-ciws'])

    const sameAsset: ThreatAssessment = {
      ...assessment,
      recommendedDefeat: assessment.recommendedDetection,
    }
    expect(collectRecommendedAssetIds(sameAsset)).toEqual(['drone-dome'])
  })

  it('detects co-located cuas near threat', () => {
    const placed: PlacedCuas[] = [
      {
        instanceId: 'cuas-1',
        asset: detectionAsset,
        lon: uas.lon,
        lat: uas.lat,
        terrainAMSL: 10,
        hasTerrainMasking: false,
      },
    ]
    expect(hasCuasNearThreat(placed, 'drone-dome', uas)).toBe(true)
    expect(hasCuasNearThreat(placed, 'goalkeeper-ciws', uas)).toBe(false)
  })

  it('plans threat position then 1 km offset for two distinct recommendations', () => {
    const planned = planRecommendedPlacements(assessment, uas, [], [detectionAsset, defeatAsset], 90)

    expect(planned).toHaveLength(2)
    expect(planned[0]).toMatchObject({ assetId: 'drone-dome', lon: uas.lon, lat: uas.lat })
    expect(planned[1].assetId).toBe('goalkeeper-ciws')
    expect(planned[1].lon).not.toBe(uas.lon)
    expect(planned[1].lat).not.toBe(uas.lat)
  })

  it('skips assets already near the threat', () => {
    const placed: PlacedCuas[] = [
      {
        instanceId: 'cuas-1',
        asset: detectionAsset,
        lon: uas.lon,
        lat: uas.lat,
        terrainAMSL: 10,
        hasTerrainMasking: false,
      },
    ]

    const planned = planRecommendedPlacements(assessment, uas, placed, [detectionAsset, defeatAsset], 90)
    expect(planned).toHaveLength(1)
    expect(planned[0].assetId).toBe('goalkeeper-ciws')
  })
})
