import { BLUE_RADARS } from '@/data/seed-radars-blue'
import { RED_RADARS } from '@/data/seed-radars-red'
import { EXTRA_RADARS } from '@/data/seed-radars-extra'
import { BLUE_EFFECTORS } from '@/data/seed-effectors-blue'
import { RED_EFFECTORS } from '@/data/seed-effectors-red'
import { analyzeLaydown } from '@/lib/map/laydown-analysis'
import { buildOverlapVolume, uasToCuasDistance3dM } from '@/lib/map/overlap'
import { resolveSpectrumUas } from '@/lib/map/spectrum-bridge'
import { computeDetectionPct } from '@/lib/map/threat-assessment'
import type {
  MapCuasAsset,
  MapUasAsset,
  PlacedCuas,
  PlacedEffector as MapPlacedEffector,
  PlacedRadar,
  PlacedUas,
} from '@/lib/map/types'
import { canEngage } from '@/lib/spectrum/killchain'
import {
  buildEnvelopeRing,
  pointInEnvelope,
  type EffectorSystem,
} from '@/lib/spectrum/effector-types'
import type { RadarSystem, TargetClass } from '@/lib/spectrum/radar-types'

export type LaydownKind = 'uas' | 'cuas' | 'radar' | 'effector'

export type SelectedLaydownItem =
  | { kind: 'uas'; instanceId: string }
  | { kind: 'cuas'; instanceId: string }
  | { kind: 'radar'; instanceId: string }
  | { kind: 'effector'; instanceId: string }

export interface EvaluatedItem {
  assetId: string
  name: string
  reason: string
  pct?: number
  placed?: boolean
}

export interface EvaluationSection {
  title: string
  tone: 'can' | 'cannot'
  items: EvaluatedItem[]
}

export interface LaydownEvaluationSubject {
  kind: LaydownKind
  instanceId: string
  name: string
  lon: number
  lat: number
}

export interface LaydownEvaluation {
  subject: LaydownEvaluationSubject
  sections: EvaluationSection[]
}

export interface LaydownState {
  placedUas: PlacedUas[]
  placedCuas: PlacedCuas[]
  placedRadars: PlacedRadar[]
  placedEffectors: MapPlacedEffector[]
  catalogUas: MapUasAsset[]
  catalogCuas: MapCuasAsset[]
}

const ALL_RADARS: RadarSystem[] = [...RED_RADARS, ...BLUE_RADARS, ...EXTRA_RADARS]
const ALL_EFFECTORS: EffectorSystem[] = [...BLUE_EFFECTORS, ...RED_EFFECTORS]
const RADAR_BY_ID = new Map(ALL_RADARS.map((r) => [r.id, r]))
const EFFECTOR_BY_ID = new Map(ALL_EFFECTORS.map((e) => [e.id, e]))

export function catalogRadars(): RadarSystem[] {
  return ALL_RADARS
}

export function catalogEffectors(): EffectorSystem[] {
  return ALL_EFFECTORS
}

export function mapUasToTargetClass(asset: MapUasAsset): TargetClass {
  const cat = asset.category.toLowerCase()
  if (cat.includes('cruise')) return 'cruise_missile'
  if (cat.includes('ballistic')) return 'ballistic_missile'
  if (cat === 'fpv') return 'small_uas'
  if (
    cat === 'male' ||
    cat === 'hale' ||
    cat === 'loitering_munition' ||
    cat === 'tube_launched_lm' ||
    cat === 'tactical' ||
    cat === 'fixed_wing_tactical' ||
    cat === 'vtol' ||
    cat === 'interceptor_uas'
  ) {
    return 'large_uas'
  }
  return 'small_uas'
}

export function classRangeKm(radar: RadarSystem, tc: TargetClass): number {
  if (tc === 'small_uas') {
    return radar.range_vs_small_uas_km ?? radar.instrumented_range_km ?? 0
  }
  if (
    tc === 'large_uas' ||
    tc === 'aircraft' ||
    tc === 'helicopter' ||
    tc === 'stealth'
  ) {
    return radar.range_vs_fighter_km ?? radar.instrumented_range_km ?? 0
  }
  return radar.instrumented_range_km ?? 0
}

function defaultMatrixPk(asset: MapCuasAsset): number {
  const methods = asset.defeat_methods ?? []
  if (methods.includes('laser') || methods.includes('directed_energy')) return 72
  if (methods.includes('kinetic') || methods.includes('net')) return 68
  if (methods.includes('RF_jamming')) return 58
  return 50
}

function uasOperatingAltKm(uas: PlacedUas): number {
  const altM = Number.isFinite(uas.discAltitude_m)
    ? uas.discAltitude_m
    : uas.terrainAMSL + uas.asset.max_altitude_agl_m * 0.5
  return altM / 1000
}

function typicalCatalogUasAltKm(asset: MapUasAsset, terrainAMSL = 10): number {
  return (terrainAMSL + asset.max_altitude_agl_m * 0.5) / 1000
}

function virtualCuasAt(
  uas: PlacedUas,
  asset: MapCuasAsset,
  lon: number,
  lat: number,
  terrainAMSL: number,
): PlacedCuas {
  return {
    instanceId: `virtual-${asset.id}-${uas.instanceId}`,
    asset,
    lon,
    lat,
    terrainAMSL,
    hasTerrainMasking: false,
  }
}

export function scoreCuasVsUas(
  uas: PlacedUas,
  cuasAsset: MapCuasAsset,
  cuasLon: number,
  cuasLat: number,
  cuasTerrainAMSL: number,
) {
  const virtual = virtualCuasAt(uas, cuasAsset, cuasLon, cuasLat, cuasTerrainAMSL)
  const inRange = uasToCuasDistance3dM(uas, virtual) <= cuasAsset.defeat_range_m
  const pk = defaultMatrixPk(cuasAsset)
  const vol = buildOverlapVolume(uas, virtual, pk, false)
  const analysis = analyzeLaydown([uas], [virtual], inRange ? [vol] : [])
  const pair = analysis.pairs[0]
  if (!pair) {
    return { inRange: false, canShoot: false, defeatPct: 0, detectionPct: 8, pair: null }
  }
  const detectionPct = computeDetectionPct(
    pair.spectrum,
    pair.inDefeatRange,
    cuasAsset.defeat_methods,
  )
  const defeatPct = pair.inDefeatRange ? pair.blueSuccessPct : 0
  const canShoot = pair.inDefeatRange && !pair.isImmune && defeatPct >= 50
  return { inRange: pair.inDefeatRange, canShoot, defeatPct, detectionPct, pair }
}

function placedSet(state: LaydownState) {
  return {
    uas: new Set(state.placedUas.map((u) => u.asset.id)),
    cuas: new Set(state.placedCuas.map((c) => c.asset.id)),
    radar: new Set(state.placedRadars.map((r) => r.asset.id)),
    effector: new Set(state.placedEffectors.map((e) => e.asset.id)),
  }
}

function radarCanDetectClass(
  radar: RadarSystem,
  tc: TargetClass,
  distanceKm: number,
  altKm: number,
): boolean {
  if (radar.cannot_detect.includes(tc)) return false
  if (!radar.can_detect.includes(tc)) return false
  if (distanceKm > classRangeKm(radar, tc)) return false
  if (radar.altitude_ceiling_km != null && altKm > radar.altitude_ceiling_km) return false
  return true
}

function radarRow(
  radar: RadarSystem,
  tc: TargetClass,
  distanceKm: number,
  placed: boolean,
): EvaluatedItem {
  const rangeKm = classRangeKm(radar, tc)
  return {
    assetId: radar.id,
    name: radar.name,
    placed,
    reason: `${tc.replace(/_/g, ' ')} in can_detect · ${rangeKm.toFixed(0)} km class range · ${distanceKm.toFixed(1)} km`,
  }
}

function effectorCanShootUas(
  effector: EffectorSystem,
  uas: PlacedUas,
  effLon: number,
  effLat: number,
): { can: boolean; pct?: number; reason: string } {
  const platform = resolveSpectrumUas(uas.asset.id)
  if (!platform) {
    return { can: false, reason: 'No spectrum profile for threat' }
  }
  const engage = canEngage(effector, platform)
  if (engage.verdict === 'cannot') {
    return { can: false, reason: engage.reasons[0] ?? 'Target class not in effector set' }
  }
  const ring = buildEnvelopeRing(
    { effectorId: effector.id, origin: { lat: effLat, lon: effLon }, heading_deg: 0 },
    effector,
  )
  const altKm = uasOperatingAltKm(uas)
  const inEnvelope = pointInEnvelope(ring, { lat: uas.lat, lon: uas.lon }, altKm)
  if (!inEnvelope) {
    return {
      can: false,
      reason: `Outside ${effector.envelope.min_alt_km}–${effector.envelope.max_alt_km} km alt / ${effector.envelope.max_range_km} km envelope`,
    }
  }
  const pk = engage.pk != null ? Math.round(engage.pk * 100) : undefined
  const marginal = engage.verdict === 'marginal' ? ' (marginal — cost exchange)' : ''
  return {
    can: true,
    pct: pk,
    reason: `${engage.reasons[0] ?? 'In engagement envelope'}${marginal}`,
  }
}

export function evaluateUas(uas: PlacedUas, state: LaydownState): LaydownEvaluation {
  const tc = mapUasToTargetClass(uas.asset)
  const altKm = uasOperatingAltKm(uas)
  const placed = placedSet(state)

  const canDetectRadars: EvaluatedItem[] = []
  const cannotDetectRadars: EvaluatedItem[] = []
  for (const radar of ALL_RADARS) {
    const row = radarRow(radar, tc, 0, placed.radar.has(radar.id))
    if (radarCanDetectClass(radar, tc, 0, altKm)) {
      canDetectRadars.push(row)
    } else {
      cannotDetectRadars.push({
        ...row,
        reason: radar.cannot_detect.includes(tc)
          ? `${tc.replace(/_/g, ' ')} in cannot_detect`
          : !radar.can_detect.includes(tc)
            ? `${tc.replace(/_/g, ' ')} not in can_detect set`
            : `Altitude ${altKm.toFixed(1)} km exceeds ceiling`,
      })
    }
  }

  const canShoot: EvaluatedItem[] = []
  const canShootIds = new Set<string>()

  for (const cuasAsset of state.catalogCuas) {
    const scored = scoreCuasVsUas(uas, cuasAsset, uas.lon, uas.lat, uas.terrainAMSL)
    if (scored.canShoot) {
      canShootIds.add(cuasAsset.id)
      canShoot.push({
        assetId: cuasAsset.id,
        name: cuasAsset.name,
        pct: scored.defeatPct,
        placed: placed.cuas.has(cuasAsset.id),
        reason: `Co-located virtual C-UAS · P(defeat) ${scored.defeatPct}%`,
      })
    }
  }

  for (const effector of ALL_EFFECTORS) {
    const shot = effectorCanShootUas(effector, uas, uas.lon, uas.lat)
    if (shot.can) {
      canShootIds.add(effector.id)
      canShoot.push({
        assetId: effector.id,
        name: effector.name,
        pct: shot.pct,
        placed: placed.effector.has(effector.id),
        reason: shot.reason,
      })
    }
  }

  canShoot.sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0))

  const canDetectIds = new Set(canDetectRadars.map((r) => r.assetId))
  const complement: EvaluatedItem[] = []

  for (const radar of ALL_RADARS) {
    if (canDetectIds.has(radar.id)) continue
    complement.push({
      assetId: radar.id,
      name: radar.name,
      placed: placed.radar.has(radar.id),
      reason: 'Neither detects nor engages this threat (radar layer)',
    })
  }
  for (const cuasAsset of state.catalogCuas) {
    if (canShootIds.has(cuasAsset.id)) continue
    complement.push({
      assetId: cuasAsset.id,
      name: cuasAsset.name,
      placed: placed.cuas.has(cuasAsset.id),
      reason: 'No co-located defeat path for this threat',
    })
  }
  for (const effector of ALL_EFFECTORS) {
    if (canShootIds.has(effector.id)) continue
    complement.push({
      assetId: effector.id,
      name: effector.name,
      placed: placed.effector.has(effector.id),
      reason: 'Cannot engage threat class or outside envelope',
    })
  }

  return {
    subject: {
      kind: 'uas',
      instanceId: uas.instanceId,
      name: uas.asset.name,
      lon: uas.lon,
      lat: uas.lat,
    },
    sections: [
      { title: 'Radars — can detect', tone: 'can', items: canDetectRadars },
      { title: 'Radars — cannot detect', tone: 'cannot', items: cannotDetectRadars },
      { title: 'Can shoot down', tone: 'can', items: canShoot },
      { title: 'Cannot detect or shoot', tone: 'cannot', items: complement },
    ],
  }
}

export function evaluateRadar(radar: PlacedRadar, state: LaydownState): LaydownEvaluation {
  const seed = RADAR_BY_ID.get(radar.asset.id)
  const placed = placedSet(state)
  const canDetect: EvaluatedItem[] = []
  const cannotDetect: EvaluatedItem[] = []

  for (const asset of state.catalogUas) {
    const tc = mapUasToTargetClass(asset)
    const classRange = seed ? classRangeKm(seed, tc) : radar.asset.detection_range_km
    const boundaryKm = Math.min(classRange, radar.asset.detection_range_km)
    const altKm = typicalCatalogUasAltKm(asset, radar.terrainAMSL)

    const row: EvaluatedItem = {
      assetId: asset.id,
      name: asset.name,
      placed: placed.uas.has(asset.id),
      reason: `${tc.replace(/_/g, ' ')} at ${boundaryKm.toFixed(0)} km boundary · ${altKm.toFixed(1)} km alt`,
    }

    if (seed && radarCanDetectClass(seed, tc, boundaryKm, altKm)) {
      canDetect.push(row)
    } else {
      cannotDetect.push({
        ...row,
        reason: seed?.cannot_detect.includes(tc)
          ? `${tc.replace(/_/g, ' ')} in cannot_detect`
          : `Out of range or above ${seed?.altitude_ceiling_km ?? '?'} km ceiling`,
      })
    }
  }

  return {
    subject: {
      kind: 'radar',
      instanceId: radar.instanceId,
      name: radar.asset.name,
      lon: radar.lon,
      lat: radar.lat,
    },
    sections: [
      { title: 'Can detect', tone: 'can', items: canDetect },
      { title: 'Cannot detect', tone: 'cannot', items: cannotDetect },
    ],
  }
}

export function evaluateCuas(cuas: PlacedCuas, state: LaydownState): LaydownEvaluation {
  const placed = placedSet(state)
  const canShoot: EvaluatedItem[] = []
  const cannotShoot: EvaluatedItem[] = []

  for (const asset of state.catalogUas) {
    const virtualUas: PlacedUas = {
      instanceId: `virtual-uas-${asset.id}`,
      asset,
      lon: cuas.lon,
      lat: cuas.lat,
      terrainAMSL: cuas.terrainAMSL,
      discAltitude_m: typicalCatalogUasAltKm(asset, cuas.terrainAMSL) * 1000,
      lateralRadius_m: 5000,
      ceilingAMSL_m: cuas.terrainAMSL + asset.max_altitude_agl_m,
      annotationTime_min: 60,
      effectiveRange_km: asset.max_range_km,
      infoPanelClosed: true,
    }
    const scored = scoreCuasVsUas(virtualUas, cuas.asset, cuas.lon, cuas.lat, cuas.terrainAMSL)
    const row: EvaluatedItem = {
      assetId: asset.id,
      name: asset.name,
      pct: scored.defeatPct,
      placed: placed.uas.has(asset.id),
      reason: scored.canShoot
        ? `Co-located · P(defeat) ${scored.defeatPct}%`
        : scored.inRange
          ? `In envelope but survivable (${scored.defeatPct}%)`
          : `Outside ${cuas.asset.defeat_range_km.toFixed(1)} km defeat sphere`,
    }
    if (scored.canShoot) canShoot.push(row)
    else cannotShoot.push(row)
  }

  canShoot.sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0))

  return {
    subject: {
      kind: 'cuas',
      instanceId: cuas.instanceId,
      name: cuas.asset.name,
      lon: cuas.lon,
      lat: cuas.lat,
    },
    sections: [
      { title: 'Can shoot down', tone: 'can', items: canShoot },
      { title: 'Cannot shoot down', tone: 'cannot', items: cannotShoot },
    ],
  }
}

export function evaluateEffector(effector: MapPlacedEffector, state: LaydownState): LaydownEvaluation {
  const seed = EFFECTOR_BY_ID.get(effector.asset.id)
  const placed = placedSet(state)
  const canShoot: EvaluatedItem[] = []
  const cannotShoot: EvaluatedItem[] = []

  if (!seed) {
    return {
      subject: {
        kind: 'effector',
        instanceId: effector.instanceId,
        name: effector.asset.name,
        lon: effector.lon,
        lat: effector.lat,
      },
      sections: [
        { title: 'Can shoot down', tone: 'can', items: [] },
        {
          title: 'Cannot shoot down',
          tone: 'cannot',
          items: [{ assetId: effector.asset.id, name: effector.asset.name, reason: 'No effector seed data' }],
        },
      ],
    }
  }

  for (const asset of state.catalogUas) {
    const virtualUas: PlacedUas = {
      instanceId: `virtual-uas-${asset.id}`,
      asset,
      lon: effector.lon,
      lat: effector.lat,
      terrainAMSL: effector.terrainAMSL,
      discAltitude_m: typicalCatalogUasAltKm(asset, effector.terrainAMSL) * 1000,
      lateralRadius_m: 5000,
      ceilingAMSL_m: effector.terrainAMSL + asset.max_altitude_agl_m,
      annotationTime_min: 60,
      effectiveRange_km: asset.max_range_km,
      infoPanelClosed: true,
    }
    const shot = effectorCanShootUas(seed, virtualUas, effector.lon, effector.lat)
    const row: EvaluatedItem = {
      assetId: asset.id,
      name: asset.name,
      pct: shot.pct,
      placed: placed.uas.has(asset.id),
      reason: shot.reason,
    }
    if (shot.can) canShoot.push(row)
    else cannotShoot.push(row)
  }

  canShoot.sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0))

  return {
    subject: {
      kind: 'effector',
      instanceId: effector.instanceId,
      name: effector.asset.name,
      lon: effector.lon,
      lat: effector.lat,
    },
    sections: [
      { title: 'Can shoot down', tone: 'can', items: canShoot },
      { title: 'Cannot shoot down', tone: 'cannot', items: cannotShoot },
    ],
  }
}

export function buildLaydownEvaluation(
  selected: SelectedLaydownItem | null,
  state: LaydownState,
): LaydownEvaluation | null {
  if (!selected) return null

  switch (selected.kind) {
    case 'uas': {
      const uas = state.placedUas.find((u) => u.instanceId === selected.instanceId)
      return uas ? evaluateUas(uas, state) : null
    }
    case 'cuas': {
      const cuas = state.placedCuas.find((c) => c.instanceId === selected.instanceId)
      return cuas ? evaluateCuas(cuas, state) : null
    }
    case 'radar': {
      const r = state.placedRadars.find((x) => x.instanceId === selected.instanceId)
      return r ? evaluateRadar(r, state) : null
    }
    case 'effector': {
      const e = state.placedEffectors.find((x) => x.instanceId === selected.instanceId)
      return e ? evaluateEffector(e, state) : null
    }
    default:
      return null
  }
}

export function listPlacedLaydownItems(state: LaydownState): SelectedLaydownItem[] {
  return [
    ...state.placedUas.map((u) => ({ kind: 'uas' as const, instanceId: u.instanceId })),
    ...state.placedCuas.map((c) => ({ kind: 'cuas' as const, instanceId: c.instanceId })),
    ...state.placedRadars.map((r) => ({ kind: 'radar' as const, instanceId: r.instanceId })),
    ...state.placedEffectors.map((e) => ({ kind: 'effector' as const, instanceId: e.instanceId })),
  ]
}

export function parseEntityLaydownPick(entityId: string): SelectedLaydownItem | null {
  const prefixes: { prefix: string; kind: LaydownKind }[] = [
    { prefix: 'map-uas-mark-', kind: 'uas' },
    { prefix: 'map-cuas-mark-', kind: 'cuas' },
    { prefix: 'map-radar-mark-', kind: 'radar' },
    { prefix: 'map-effector-mark-', kind: 'effector' },
  ]
  for (const { prefix, kind } of prefixes) {
    if (entityId.startsWith(prefix)) {
      return { kind, instanceId: entityId.slice(prefix.length) }
    }
  }
  return null
}

export function isSameLaydownItem(
  a: SelectedLaydownItem | null,
  b: SelectedLaydownItem | null,
): boolean {
  if (!a || !b) return false
  return a.kind === b.kind && a.instanceId === b.instanceId
}
