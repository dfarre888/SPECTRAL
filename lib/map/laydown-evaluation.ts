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
  kind: LaydownKind
  assetId: string
  name: string
  reason: string
  pct?: number
  placed?: boolean
  /** Placed map instance — when set, UI can select without search. */
  instanceId?: string
  /** Parent SAM/IADS platform (e.g. S-400 Triumf). */
  parentSystem?: string
  /** NATO reporting name when applicable. */
  natoName?: string
  /** Radar role or effector tier label. */
  roleLabel?: string
  /** Kill-chain: effectors that cue this radar for engagement. */
  linkedEffectors?: string[]
  /** Kill-chain: radars that cue this effector. */
  linkedRadars?: string[]
}

export interface EvaluationSection {
  title: string
  tone: 'can' | 'cannot'
  items: EvaluatedItem[]
}

export interface IadsStackGroup {
  stackKey: string
  stackLabel: string
  items: EvaluatedItem[]
  /** Unique finish-chain effectors across radars in this stack. */
  finishChainSummary?: string
}

const STANDALONE_IADS_KEY = '__standalone__'

/** Normalise parent system strings so S-400 variants collapse into one stack. */
export function iadsStackGroupKey(parentSystem?: string | null): string {
  if (!parentSystem?.trim()) return STANDALONE_IADS_KEY
  return parentSystem
    .replace(/\s*\([^)]*\)/g, '')
    .trim()
    .toLowerCase()
}

export function iadsStackDisplayLabel(parentSystem?: string | null): string {
  if (!parentSystem?.trim()) return 'Standalone sensors'
  return parentSystem.replace(/\s*\([^)]*\)/g, '').trim()
}

function finishChainSummaryForStack(items: EvaluatedItem[]): string | undefined {
  const labels = new Set<string>()
  for (const item of items) {
    for (const effector of item.linkedEffectors ?? []) {
      labels.add(effector)
    }
  }
  if (labels.size === 0) return undefined
  const sorted = [...labels].sort((a, b) => a.localeCompare(b))
  if (sorted.length <= 4) return sorted.join(' · ')
  return `${sorted.slice(0, 4).join(' · ')} · +${sorted.length - 4} more`
}

/** Group radar evaluation rows by parent IADS / SAM stack. */
export function groupEvaluatedByIadsStack(items: EvaluatedItem[]): IadsStackGroup[] {
  const radarItems = items.filter((item) => item.kind === 'radar')
  if (radarItems.length === 0) return []

  const buckets = new Map<string, IadsStackGroup>()
  for (const item of radarItems) {
    const stackKey = iadsStackGroupKey(item.parentSystem)
    const stackLabel = iadsStackDisplayLabel(item.parentSystem)
    const bucket = buckets.get(stackKey) ?? { stackKey, stackLabel, items: [] }
    bucket.items.push(item)
    buckets.set(stackKey, bucket)
  }

  return [...buckets.values()]
    .map((group) => ({
      ...group,
      finishChainSummary: finishChainSummaryForStack(group.items),
      items: [...group.items].sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => {
      if (a.stackKey === STANDALONE_IADS_KEY) return 1
      if (b.stackKey === STANDALONE_IADS_KEY) return -1
      return b.items.length - a.items.length || a.stackLabel.localeCompare(b.stackLabel)
    })
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

export interface CommanderScoreboard {
  detect: number
  defeat: number
  detectBlind: number
  noShot: number
  bestDefeat: { name: string; pct: number } | null
  verdict: 'can_finish' | 'detect_only' | 'blind'
  verdictLine: string
  detectSection?: EvaluationSection
  defeatSection?: EvaluationSection
  detectBlindSection?: EvaluationSection
  noShotSection?: EvaluationSection
}

export interface CommanderCompareRow {
  instanceId: string
  name: string
  detect: number
  defeat: number
  verdict: CommanderScoreboard['verdict']
  bestDefeat: CommanderScoreboard['bestDefeat']
}

export function sectionByTitle(evaluation: LaydownEvaluation, title: string): EvaluationSection | undefined {
  return evaluation.sections.find((s) => s.title === title)
}

function firstSection(evaluation: LaydownEvaluation, titles: string[]): EvaluationSection | undefined {
  for (const title of titles) {
    const hit = sectionByTitle(evaluation, title)
    if (hit) return hit
  }
  return undefined
}

/** Resolve detect / defeat / gap sections across UAS, radar, C-UAS, and effector evaluations. */
export function scoreboardSections(evaluation: LaydownEvaluation) {
  return {
    detect: firstSection(evaluation, ['Radars — can detect', 'Can detect']),
    detectBlind: firstSection(evaluation, ['Radars — cannot detect', 'Cannot detect']),
    defeat: firstSection(evaluation, ['Can shoot down']),
    noShot: firstSection(evaluation, ['Cannot detect or shoot', 'Cannot shoot down']),
  }
}

/** Commander roll-up — counts only, not the 200-row catalog dump. */
export function commanderScoreboard(evaluation: LaydownEvaluation): CommanderScoreboard {
  const { detect: detectSection, detectBlind: detectBlindSection, defeat: defeatSection, noShot: noShotSection } =
    scoreboardSections(evaluation)
  const detect = detectSection?.items.length ?? 0
  const detectBlind = detectBlindSection?.items.length ?? 0
  const defeatItems = defeatSection?.items ?? []
  const defeat = defeatItems.length
  const noShot = noShotSection?.items.length ?? 0
  const ranked = [...defeatItems].sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0))
  const top = ranked[0]
  const bestDefeat = top && top.pct != null ? { name: top.name, pct: top.pct } : null

  const hasDetectAxis = detectSection != null
  const hasDefeatAxis = defeatSection != null

  let verdict: CommanderScoreboard['verdict'] = 'blind'
  let verdictLine = hasDetectAxis
    ? 'No catalog sensor sees this airframe.'
    : 'No catalog effector has a finish path.'
  if (hasDetectAxis && hasDefeatAxis && detect > 0 && defeat > 0) {
    verdict = 'can_finish'
    verdictLine = bestDefeat
      ? `Find and finish available. Best catalog Pk: ${bestDefeat.name} ${bestDefeat.pct}%.`
      : 'Find and finish available in the catalog.'
  } else if (hasDetectAxis && detect > 0 && (!hasDefeatAxis || defeat === 0)) {
    verdict = 'detect_only'
    verdictLine = hasDefeatAxis
      ? 'Sensors can find it. No catalog effector has a finish path.'
      : 'Sensors can find catalog threats in this class.'
  } else if (!hasDetectAxis && defeat > 0) {
    verdict = 'can_finish'
    verdictLine = bestDefeat
      ? `Finish path available. Best catalog Pk: ${bestDefeat.name} ${bestDefeat.pct}%.`
      : 'Finish path available in the catalog.'
  }

  return {
    detect,
    defeat,
    detectBlind,
    noShot,
    bestDefeat,
    verdict,
    verdictLine,
    detectSection,
    defeatSection,
    detectBlindSection,
    noShotSection,
  }
}

/** Side-by-side Detect / Defeat for every UAS on the map. */
export function uasCommanderCompare(state: LaydownState): CommanderCompareRow[] {
  return state.placedUas.map((uas) => {
    const board = commanderScoreboard(evaluateUas(uas, state))
    return {
      instanceId: uas.instanceId,
      name: uas.asset.name,
      detect: board.detect,
      defeat: board.defeat,
      verdict: board.verdict,
      bestDefeat: board.bestDefeat,
    }
  })
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

function buildEffectorsByRadarId(): Map<string, EffectorSystem[]> {
  const map = new Map<string, EffectorSystem[]>()
  for (const effector of ALL_EFFECTORS) {
    for (const radarId of effector.cueing_radar_ids ?? []) {
      const bucket = map.get(radarId) ?? []
      bucket.push(effector)
      map.set(radarId, bucket)
    }
  }
  return map
}

const EFFECTORS_BY_RADAR_ID = buildEffectorsByRadarId()

function effectorKillChainLabel(effector: EffectorSystem): string {
  const parent = effector.associated_system ? ` · ${effector.associated_system}` : ''
  return `${effector.name}${parent}`
}

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

export function resolvePlacedInstance(
  state: LaydownState,
  kind: LaydownKind,
  assetId: string,
): SelectedLaydownItem | null {
  switch (kind) {
    case 'uas': {
      const hit = state.placedUas.find((u) => u.asset.id === assetId)
      return hit ? { kind: 'uas', instanceId: hit.instanceId } : null
    }
    case 'cuas': {
      const hit = state.placedCuas.find((c) => c.asset.id === assetId)
      return hit ? { kind: 'cuas', instanceId: hit.instanceId } : null
    }
    case 'radar': {
      const hit = state.placedRadars.find((r) => r.asset.id === assetId)
      return hit ? { kind: 'radar', instanceId: hit.instanceId } : null
    }
    case 'effector': {
      const hit = state.placedEffectors.find((e) => e.asset.id === assetId)
      return hit ? { kind: 'effector', instanceId: hit.instanceId } : null
    }
    default:
      return null
  }
}

function enrichEvaluation(state: LaydownState, evaluation: LaydownEvaluation): LaydownEvaluation {
  return {
    ...evaluation,
    sections: evaluation.sections.map((section) => ({
      ...section,
      items: enrichEvalItems(state, section.items),
    })),
  }
}

function enrichEvalItems(state: LaydownState, items: EvaluatedItem[]): EvaluatedItem[] {
  return items.map((item) => {
    if (item.instanceId) return item
    if (!item.placed) return item
    const resolved = resolvePlacedInstance(state, item.kind, item.assetId)
    return resolved ? { ...item, instanceId: resolved.instanceId } : item
  })
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
  const linked = EFFECTORS_BY_RADAR_ID.get(radar.id) ?? []
  return {
    kind: 'radar',
    assetId: radar.id,
    name: radar.name,
    placed,
    parentSystem: radar.associated_system ?? undefined,
    natoName: radar.nato_name ?? undefined,
    roleLabel: radar.role.replace(/_/g, ' '),
    linkedEffectors: linked.map((e) => effectorKillChainLabel(e)),
    reason: `${tc.replace(/_/g, ' ')} · ${rangeKm.toFixed(0)} km class range · ${distanceKm.toFixed(1)} km virtual`,
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
        kind: 'cuas',
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
        kind: 'effector',
        assetId: effector.id,
        name: effector.name,
        pct: shot.pct,
        placed: placed.effector.has(effector.id),
        parentSystem: effector.associated_system ?? undefined,
        linkedRadars: (effector.cueing_radar_ids ?? [])
          .map((id) => RADAR_BY_ID.get(id))
          .filter((r): r is RadarSystem => r != null)
          .map((r) => (r.nato_name ? `${r.name} (${r.nato_name})` : r.name)),
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
      kind: 'radar',
      assetId: radar.id,
      name: radar.name,
      placed: placed.radar.has(radar.id),
      reason: 'Neither detects nor engages this threat (radar layer)',
    })
  }
  for (const cuasAsset of state.catalogCuas) {
    if (canShootIds.has(cuasAsset.id)) continue
    complement.push({
      kind: 'cuas',
      assetId: cuasAsset.id,
      name: cuasAsset.name,
      placed: placed.cuas.has(cuasAsset.id),
      reason: 'No co-located defeat path for this threat',
    })
  }
  for (const effector of ALL_EFFECTORS) {
    if (canShootIds.has(effector.id)) continue
    complement.push({
      kind: 'effector',
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
      kind: 'uas',
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
      kind: 'uas',
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
          items: [{
            kind: 'effector',
            assetId: effector.asset.id,
            name: effector.asset.name,
            reason: 'No effector seed data',
          }],
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
      kind: 'uas',
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
      return uas ? enrichEvaluation(state, evaluateUas(uas, state)) : null
    }
    case 'cuas': {
      const cuas = state.placedCuas.find((c) => c.instanceId === selected.instanceId)
      return cuas ? enrichEvaluation(state, evaluateCuas(cuas, state)) : null
    }
    case 'radar': {
      const r = state.placedRadars.find((x) => x.instanceId === selected.instanceId)
      return r ? enrichEvaluation(state, evaluateRadar(r, state)) : null
    }
    case 'effector': {
      const e = state.placedEffectors.find((x) => x.instanceId === selected.instanceId)
      return e ? enrichEvaluation(state, evaluateEffector(e, state)) : null
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
