import { describe, expect, it } from 'vitest'
import { buildOverlapVolume } from '@/lib/map/overlap'
import {
  buildLaydownEvaluation,
  evaluateCuas,
  evaluateEffector,
  evaluateRadar,
  evaluateUas,
  isSameLaydownItem,
  listPlacedLaydownItems,
  mapUasToTargetClass,
  parseEntityLaydownPick,
  type LaydownState,
  type SelectedLaydownItem,
} from '@/lib/map/laydown-evaluation'
import { getSpectraMapAssets } from '@/lib/map/spectra-assets'
import type { MapCuasAsset, MapUasAsset, PlacedCuas, PlacedEffector, PlacedRadar, PlacedUas } from '@/lib/map/types'

const shahedAsset: MapUasAsset = {
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

const fpvAsset: MapUasAsset = {
  id: 'fpv-analog-5800',
  name: 'Analog FPV',
  slug: 'fpv-analog-5800',
  category: 'FPV',
  categoryLabel: 'FPV',
  image_url: null,
  max_altitude_agl_m: 500,
  altitude_reference: 'AGL',
  max_range_km: 5,
  max_speed_kmh: 120,
  endurance_min: 15,
  climb_rate_mpm: 600,
}

const maleAsset: MapUasAsset = {
  id: 'mq-9-reaper',
  name: 'MQ-9 Reaper',
  slug: 'mq-9-reaper',
  category: 'MALE',
  categoryLabel: 'MALE',
  image_url: null,
  max_altitude_agl_m: 15000,
  altitude_reference: 'AMSL',
  max_range_km: 1850,
  max_speed_kmh: 480,
  endurance_min: 1440,
  climb_rate_mpm: 800,
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

function baseState(overrides: Partial<LaydownState> = {}): LaydownState {
  return {
    placedUas: [],
    placedCuas: [],
    placedRadars: [],
    placedEffectors: [],
    catalogUas: [shahedAsset, fpvAsset, maleAsset],
    catalogCuas: [cuasAsset],
    ...overrides,
  }
}

function placedShahed(): PlacedUas {
  return {
    instanceId: 'uas-1',
    asset: shahedAsset,
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

function placedFpv(): PlacedUas {
  return {
    ...placedShahed(),
    instanceId: 'uas-fpv',
    asset: fpvAsset,
    discAltitude_m: 120,
    ceilingAMSL_m: 510,
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

describe('laydown-evaluation', () => {
  it('mapUasToTargetClass maps FPV and OWA correctly', () => {
    expect(mapUasToTargetClass(fpvAsset)).toBe('small_uas')
    expect(mapUasToTargetClass(shahedAsset)).toBe('large_uas')
  })

  it('parseEntityLaydownPick and isSameLaydownItem', () => {
    const pick = parseEntityLaydownPick('map-radar-mark-radar-1')
    expect(pick).toEqual({ kind: 'radar', instanceId: 'radar-1' })
    expect(isSameLaydownItem(pick, { kind: 'radar', instanceId: 'radar-1' })).toBe(true)
    expect(isSameLaydownItem(pick, { kind: 'uas', instanceId: 'radar-1' })).toBe(false)
  })

  it('UAS evaluation lists Giraffe in can-detect and complement excludes engaged assets', () => {
    const evalResult = evaluateUas(placedShahed(), baseState())
    const canDetect = evalResult.sections.find((s) => s.title === 'Radars — can detect')!
    const complement = evalResult.sections.find((s) => s.title === 'Cannot detect or shoot')!

    expect(canDetect.items.some((i) => i.assetId === 'radar-giraffe-amb')).toBe(true)
    expect(canDetect.items.some((i) => i.assetId === 'radar-91n6e-big-bird')).toBe(true)

    const canDetectIds = new Set(canDetect.items.map((i) => i.assetId))
    const canShootIds = new Set(
      evalResult.sections.find((s) => s.title === 'Can shoot down')!.items.map((i) => i.assetId),
    )
    for (const item of complement.items) {
      if (item.assetId.startsWith('radar-')) {
        expect(canDetectIds.has(item.assetId)).toBe(false)
      }
      expect(canShootIds.has(item.assetId)).toBe(false)
    }
  })

  it('FPV UAS puts Big Bird in cannot-detect radars', () => {
    const evalResult = evaluateUas(placedFpv(), baseState())
    const cannotDetect = evalResult.sections.find((s) => s.title === 'Radars — cannot detect')!
    expect(cannotDetect.items.some((i) => i.assetId === 'radar-91n6e-big-bird')).toBe(true)
  })

  it('Giraffe radar detects FPV at boundary', () => {
    const { radars } = getSpectraMapAssets()
    const giraffe = radars.find((r) => r.id === 'radar-giraffe-amb')!
    const placed: PlacedRadar = {
      instanceId: 'radar-1',
      asset: giraffe,
      lon: 55.5,
      lat: 26.99,
      terrainAMSL: 10,
    }
    const evalResult = evaluateRadar(placed, baseState())
    const canDetect = evalResult.sections.find((s) => s.title === 'Can detect')!
    expect(canDetect.items.some((i) => i.assetId === fpvAsset.id)).toBe(true)
  })

  it('co-located C-UAS can defeat FPV in catalog', () => {
    const uas = placedFpv()
    const cuas = placedCuas()
    const vol = buildOverlapVolume(uas, cuas, 65, false)
    expect(vol.isDefeat).toBe(true)

    const evalResult = evaluateCuas(cuas, {
      ...baseState(),
      catalogUas: [fpvAsset],
    })
    const canShoot = evalResult.sections.find((s) => s.title === 'Can shoot down')!
    expect(canShoot.items.some((i) => i.assetId === fpvAsset.id)).toBe(true)
  })

  it('THAAD cannot shoot small UAS class at co-located geometry', () => {
    const { effectors } = getSpectraMapAssets()
    const thaad = effectors.find((e) => e.id === 'eff-thaad')!
    const placed: PlacedEffector = {
      instanceId: 'eff-1',
      asset: thaad,
      lon: 55.5,
      lat: 26.99,
      terrainAMSL: 10,
    }
    const evalResult = evaluateEffector(placed, baseState())
    const cannotShoot = evalResult.sections.find((s) => s.title === 'Cannot shoot down')!
    expect(cannotShoot.items.some((i) => i.assetId === fpvAsset.id)).toBe(true)
    expect(cannotShoot.items.some((i) => i.assetId === shahedAsset.id)).toBe(true)
  })

  it('buildLaydownEvaluation dispatches by selected kind', () => {
    const uas = placedShahed()
    const state = baseState({ placedUas: [uas] })
    const selected: SelectedLaydownItem = { kind: 'uas', instanceId: uas.instanceId }
    const evalResult = buildLaydownEvaluation(selected, state)
    expect(evalResult?.subject.kind).toBe('uas')
    expect(listPlacedLaydownItems(state)).toHaveLength(1)
  })

  it('evaluateUas items include kind on every row', () => {
    const evalResult = evaluateUas(placedShahed(), baseState())
    for (const section of evalResult.sections) {
      for (const item of section.items) {
        expect(item.kind).toBeDefined()
        expect(['uas', 'cuas', 'radar', 'effector']).toContain(item.kind)
      }
    }
    const canDetect = evalResult.sections.find((s) => s.title === 'Radars — can detect')!
    expect(canDetect.items.every((i) => i.kind === 'radar')).toBe(true)
  })
})
