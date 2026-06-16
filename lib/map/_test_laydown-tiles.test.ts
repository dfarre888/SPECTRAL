import { describe, expect, it } from 'vitest'
import { BAND_TILES } from '@/components/spectrum/band-tile-data'
import { analyzeLaydown } from '@/lib/map/laydown-analysis'
import { buildOverlapVolume } from '@/lib/map/overlap'
import {
  activeTileIds,
  computeTileSpectrumZones,
  mergeLaydownEmissions,
  resolveLaydownEmissions,
  resolveRecommendationEmissions,
} from '@/lib/map/laydown-tiles'
import { getSpectraMapAssets } from '@/lib/map/spectra-assets'
import { buildThreatAssessments } from '@/lib/map/threat-assessment'
import type { MapCuasAsset, MapUasAsset, PlacedCuas, PlacedEffector, PlacedRadar, PlacedUas } from '@/lib/map/types'

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

describe('laydown-tiles', () => {
  it('Shahed + DroneGun activates UHF tile', () => {
    const emissions = resolveLaydownEmissions([placedUas()], [placedCuas()], [], [])
    const ids = activeTileIds(emissions)
    expect(ids).toContain('uhf')
  })

  it('Giraffe radar activates radar and SHF tiles', () => {
    const { radars } = getSpectraMapAssets()
    const giraffe = radars.find((r) => r.id === 'radar-giraffe-amb')
    expect(giraffe).toBeDefined()

    const placed: PlacedRadar = {
      instanceId: 'radar-1',
      asset: giraffe!,
      lon: 55.5,
      lat: 26.99,
      terrainAMSL: 10,
    }

    const emissions = resolveLaydownEmissions([], [], [placed], [])
    const ids = activeTileIds(emissions)
    expect(ids).toContain('radar')
    expect(ids).toContain('shf')
  })

  it('THAAD effector emits TPY-2 X-band via linkedRadars', () => {
    const { effectors } = getSpectraMapAssets()
    const thaad = effectors.find((e) => e.id === 'eff-thaad')
    expect(thaad).toBeDefined()
    expect(thaad!.linkedRadars.some((r) => r.id === 'radar-an-tpy-2')).toBe(true)

    const placed: PlacedEffector = {
      instanceId: 'eff-1',
      asset: thaad!,
      lon: 55.5,
      lat: 26.99,
      terrainAMSL: 10,
    }

    const emissions = resolveLaydownEmissions([], [], [], [placed])
    expect(emissions.some((e) => e.label.includes('TPY-2'))).toBe(true)

    const ids = activeTileIds(emissions)
    expect(ids).toContain('shf')
    expect(ids).toContain('radar')
  })

  it('merging recommendations does not change placed-only activeTileIds', () => {
    const uas = placedUas()
    const cuas = placedCuas()
    const vol = buildOverlapVolume(uas, cuas, 65, false)
    const analysis = analyzeLaydown([uas], [cuas], [vol])
    const assessments = buildThreatAssessments([uas], [cuas], analysis, [cuasAsset], [vol])

    const placed = resolveLaydownEmissions([uas], [cuas], [], [])
    const before = activeTileIds(placed)

    const rec = resolveRecommendationEmissions(assessments, [cuasAsset])
    expect(rec.length).toBeGreaterThan(0)

    const merged = mergeLaydownEmissions(placed, rec)
    expect(merged.length).toBeGreaterThan(placed.length)
    expect(activeTileIds(merged)).toEqual(before)
  })

  it('Shahed + DroneGun on UHF produces overlap zones', () => {
    const emissions = resolveLaydownEmissions([placedUas()], [placedCuas()], [], [])
    const uhf = BAND_TILES.find((t) => t.id === 'uhf')
    expect(uhf).toBeDefined()
    const zones = computeTileSpectrumZones(uhf!, emissions)
    expect(zones.some((z) => z.kind === 'overlap')).toBe(true)
  })

  it('red_gap when only uas placed', () => {
    const emissions = resolveLaydownEmissions([placedUas()], [], [], [])
    const uhf = BAND_TILES.find((t) => t.id === 'uhf')
    expect(uhf).toBeDefined()
    const zones = computeTileSpectrumZones(uhf!, emissions)
    expect(zones.length).toBeGreaterThan(0)
    expect(zones.every((z) => z.kind === 'red_gap')).toBe(true)
  })

  it('BAND_TILES catalogue is wired', () => {
    expect(BAND_TILES.length).toBeGreaterThan(10)
  })

  it('MQ-9 Reaper EO/IR activates IR optical tile', () => {
    const mq9: MapUasAsset = {
      id: 'mq-9-reaper',
      name: 'MQ-9 Reaper',
      slug: 'mq-9-reaper',
      category: 'MALE',
      categoryLabel: 'MALE',
      image_url: null,
      max_altitude_agl_m: 15000,
      altitude_reference: 'AGL',
      max_range_km: 1850,
      max_speed_kmh: 444,
      endurance_min: 1620,
      climb_rate_mpm: 500,
    }

    const placed: PlacedUas = {
      instanceId: 'uas-mq9',
      asset: mq9,
      lon: 55.5,
      lat: 26.99,
      terrainAMSL: 10,
      discAltitude_m: 5000,
      lateralRadius_m: 8000,
      ceilingAMSL_m: 15010,
      annotationTime_min: 120,
      effectiveRange_km: 1850,
      infoPanelClosed: true,
    }

    const emissions = resolveLaydownEmissions([placed], [], [], [])
    expect(emissions.some((e) => e.unit === 'um')).toBe(true)

    const ids = activeTileIds(emissions)
    expect(ids).toContain('ir')
  })
})
