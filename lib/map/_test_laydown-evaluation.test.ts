import { describe, expect, it } from 'vitest'
import { buildOverlapVolume } from '@/lib/map/overlap'
import {
  buildLaydownEvaluation,
  commanderScoreboard,
  evaluateCuas,
  evaluateEffector,
  evaluateRadar,
  evaluateUas,
  groupEvaluatedByIadsStack,
  iadsStackGroupKey,
  isSameLaydownItem,
  listPlacedLaydownItems,
  mapUasToTargetClass,
  parseEntityLaydownPick,
  uasCommanderCompare,
  type LaydownState,
  type SelectedLaydownItem,
} from '@/lib/map/laydown-evaluation'
import { resolveSpectrumUas } from '@/lib/map/spectrum-bridge'
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

  it('groupEvaluatedByIadsStack collapses S-400 variants and standalone bucket', () => {
    expect(iadsStackGroupKey('S-400 Triumf (SA-21)')).toBe(iadsStackGroupKey('S-400 Triumf'))
    const evalResult = evaluateUas(placedShahed(), baseState())
    const canDetect = evalResult.sections.find((s) => s.title === 'Radars — can detect')!
    const groups = groupEvaluatedByIadsStack(canDetect.items)
    expect(groups.length).toBeGreaterThan(1)
    expect(groups.every((g) => g.items.length > 0)).toBe(true)
    expect(canDetect.items.length).toBe(groups.reduce((n, g) => n + g.items.length, 0))
    const standalone = groups.find((g) => g.stackKey === '__standalone__')
    if (standalone) {
      expect(standalone.items.every((i) => !i.parentSystem?.trim())).toBe(true)
    }
  })

  it('A3DM sheet IDs outside the DJI prefix still get an Estimated finish profile', () => {
    const trinity = resolveSpectrumUas('quantum-trinity-f90-mapping')
    const volanti = resolveSpectrumUas('carbonix-volanti-mapping-vtol')
    expect(trinity?.confidence).toBe('estimated')
    expect(volanti?.confidence).toBe('estimated')
    expect(trinity?.group).toBe(1)
    expect(trinity?.capabilities?.length).toBeGreaterThan(0)

    const uas: PlacedUas = {
      ...placedFpv(),
      instanceId: 'uas-trinity',
      asset: {
        id: 'quantum-trinity-f90-mapping',
        name: 'Quantum Systems Trinity F90+',
        slug: 'quantum-trinity-f90-mapping',
        category: 'cots',
        categoryLabel: 'COTS',
        catalog_tier: 'cots',
        image_url: null,
        max_altitude_agl_m: 5500,
        altitude_reference: 'AGL',
        max_range_km: 5,
        max_speed_kmh: 43.2,
        endurance_min: 90,
        climb_rate_mpm: 300,
        rangeEstimated: true,
      },
    }
    const evalResult = evaluateUas(uas, baseState({ catalogUas: [uas.asset] }))
    const canShoot = evalResult.sections.find((s) => s.title === 'Can shoot down')!
    const canDetect = evalResult.sections.find((s) => s.title === 'Radars — can detect')!
    expect(canDetect.items.length).toBeGreaterThan(0)
    expect(canShoot.items.length).toBeGreaterThan(0)
    expect(canShoot.items.some((i) => i.pct != null && i.pct > 0)).toBe(true)
    expect(commanderScoreboard(evalResult).verdict).toBe('can_finish')
  })

  it('COTS Mavic 4 Pro gets an estimated Group 1 spectrum profile', () => {
    const profile = resolveSpectrumUas('dji-mavic-4-pro')
    expect(profile).not.toBeNull()
    expect(profile?.group).toBe(1)
    expect(profile?.confidence).toBe('estimated')
    expect(profile?.capabilities?.length).toBeGreaterThan(0)
    expect(profile?.capabilities?.some((c) => c.fn === 'control' || c.fn === 'video')).toBe(true)
  })

  it('seeded Mavic 3 keeps the curated dossier, not the COTS stand-in', () => {
    const profile = resolveSpectrumUas('dji-mavic-3')
    expect(profile?.confidence).toBe('curated')
    expect(profile?.name).toBe('DJI Mavic 3')
  })

  it('evaluateUas finishes COTS Mavic 4 Pro — can shoot is no longer empty', () => {
    const uas: PlacedUas = {
      ...placedFpv(),
      instanceId: 'uas-mavic-4',
      asset: {
        id: 'dji-mavic-4-pro',
        name: 'DJI Mavic 4 Pro',
        slug: 'dji-mavic-4-pro',
        category: 'cots',
        categoryLabel: 'COTS',
        image_url: null,
        max_altitude_agl_m: 6000,
        altitude_reference: 'AGL',
        max_range_km: 5,
        max_speed_kmh: 43.2,
        endurance_min: 30,
        climb_rate_mpm: 300,
        rangeEstimated: true,
      },
    }
    const evalResult = evaluateUas(uas, baseState({ catalogUas: [uas.asset] }))
    const canShoot = evalResult.sections.find((s) => s.title === 'Can shoot down')!
    const canDetect = evalResult.sections.find((s) => s.title === 'Radars — can detect')!
    expect(canDetect.items.length).toBeGreaterThan(0)
    expect(canShoot.items.length).toBeGreaterThan(0)
    expect(canShoot.items.some((i) => i.assetId === cuasAsset.id)).toBe(true)

    const board = commanderScoreboard(evalResult)
    expect(board.verdict).toBe('can_finish')
    expect(board.defeat).toBe(canShoot.items.length)
    expect(board.detect).toBe(canDetect.items.length)
    expect(board.bestDefeat).not.toBeNull()
  })

  it('uasCommanderCompare puts Detect / Defeat side by side for two airframes', () => {
    const mavic3: PlacedUas = {
      ...placedFpv(),
      instanceId: 'uas-mavic-3',
      asset: {
        id: 'dji-mavic-3',
        name: 'DJI Mavic 3',
        slug: 'dji-mavic-3',
        category: 'cots',
        categoryLabel: 'COTS',
        image_url: null,
        max_altitude_agl_m: 6000,
        altitude_reference: 'AGL',
        max_range_km: 15,
        max_speed_kmh: 75,
        endurance_min: 46,
        climb_rate_mpm: 300,
      },
    }
    const mavic4: PlacedUas = {
      ...mavic3,
      instanceId: 'uas-mavic-4',
      asset: {
        ...mavic3.asset,
        id: 'dji-mavic-4-pro',
        name: 'DJI Mavic 4 Pro',
        slug: 'dji-mavic-4-pro',
        max_range_km: 5,
        rangeEstimated: true,
      },
    }
    const rows = uasCommanderCompare(
      baseState({
        placedUas: [mavic3, mavic4],
        catalogUas: [mavic3.asset, mavic4.asset],
      }),
    )
    expect(rows).toHaveLength(2)
    expect(rows.every((r) => r.verdict === 'can_finish')).toBe(true)
    expect(rows.every((r) => r.detect > 0 && r.defeat > 0)).toBe(true)
  })

  it('evaluateUas names radars with spoken name first and designator second', () => {
    const evalResult = evaluateUas(placedFpv(), baseState())
    const cannotDetect = evalResult.sections.find((s) => s.title === 'Radars — cannot detect')!
    const complement = evalResult.sections.find((s) => s.title === 'Cannot detect or shoot')!
    const bigBird = cannotDetect.items.find((i) => i.assetId === 'radar-91n6e-big-bird')
    const tombstone = complement.items.find((i) => i.assetId === 'radar-64n6-tombstone')
    const s500 = complement.items.find((i) => i.assetId === 'radar-s500-91n6a')
    expect(bigBird?.name).toBe('Big Bird (91N6E)')
    expect(tombstone?.name).toBe('Tombstone (64N6E)')
    expect(s500?.name).toBe('S-500 Prometheus (91N6A(M))')
    expect(tombstone?.parentSystem).toBeTruthy()
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
