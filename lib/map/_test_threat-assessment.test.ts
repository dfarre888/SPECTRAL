import { describe, expect, it } from 'vitest'
import { analyzeLaydown } from '@/lib/map/laydown-analysis'
import { buildOverlapVolume } from '@/lib/map/overlap'
import { buildThreatAssessments, computeDetectionPct } from '@/lib/map/threat-assessment'
import type { MapCuasAsset, MapUasAsset, PlacedCuas, PlacedUas } from '@/lib/map/types'

const uasAsset: MapUasAsset = {
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
}

const cuasAsset: MapCuasAsset = {
  id: 'dronegun-tactical',
  name: 'DroneGun Tactical',
  categoryLabel: 'RF JAMMING',
  image_url: null,
  defeat_range_m: 2000,
  defeat_range_km: 2,
  defeat_methods: ['RF_jamming'],
}

function placedUas(): PlacedUas {
  return {
    instanceId: 'uas-1',
    asset: uasAsset,
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
}

function placedCuas(): PlacedCuas {
  return {
    instanceId: 'cuas-1',
    asset: cuasAsset,
    lon: 55.5,
    lat: 26.99,
    terrainAMSL: 10,
    hasTerrainMasking: false,
  }
}

describe('threat assessment', () => {
  it('returns detection and defeat percentages for co-located threat and effector', () => {
    const uas = placedUas()
    const cuas = placedCuas()
    const vol = buildOverlapVolume(uas, cuas, 65, false)
    const analysis = analyzeLaydown([uas], [cuas], [vol])
    const assessments = buildThreatAssessments([uas], [cuas], analysis, [cuasAsset], [vol])

    expect(assessments).toHaveLength(1)
    expect(assessments[0].detectionPct).toBeGreaterThan(40)
    expect(assessments[0].defeatPct).toBeGreaterThan(0)
    expect(assessments[0].bestPlacedCuas?.name).toBe('DroneGun Tactical')
    expect(assessments[0].recommendedDefeat?.name).toBeTruthy()
  })

  it('scores low detection when out of range', () => {
    const pct = computeDetectionPct(
      { verdict: 'no_engagement', overlaps: [], uncovered: [], headline: '', detail: '', recommendations: [], effectiveCoverage: 0 },
      false,
      ['RF_jamming'],
    )
    expect(pct).toBeLessThan(20)
  })
})
