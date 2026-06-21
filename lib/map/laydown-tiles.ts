import { BAND_TILES, type BandTile } from '@/components/spectrum/band-tile-data'
import { BLUE_RADARS } from '@/data/seed-radars-blue'
import { RED_RADARS } from '@/data/seed-radars-red'
import { EXTRA_RADARS } from '@/data/seed-radars-extra'
import { BLUE_EFFECTORS } from '@/data/seed-effectors-blue'
import { RED_EFFECTORS } from '@/data/seed-effectors-red'
import { cuasAssetToSpectrumBlue, resolveSpectrumUas } from '@/lib/map/spectrum-bridge'
import type { ThreatAssessment } from '@/lib/map/threat-assessment'
import type {
  MapCuasAsset,
  PlacedCuas,
  PlacedEffector,
  PlacedRadar,
  PlacedUas,
} from '@/lib/map/types'
import type { EffectorSystem } from '@/lib/spectrum/effector-types'
import { radarToCapability, type RadarSystem } from '@/lib/spectrum/radar-types'
import { capabilityExtent, hzToUm, makeLogScale, umToHz } from '@/lib/spectrum/scale'
import type { CSSProperties } from 'react'
import type { Side, SpectrumCapability } from '@/lib/spectrum/types'

export type LaydownAssetKind =
  | 'uas'
  | 'cuas'
  | 'radar'
  | 'effector'
  | 'recommended_detect'
  | 'recommended_defeat'

export interface LaydownEmission {
  id: string
  label: string
  kind: LaydownAssetKind
  unit: 'hz' | 'um'
  lo: number
  hi: number
  instanceId?: string
  recommended?: boolean
  side?: Side
  capabilityLabel?: string
}

const VB_W = 680

const ALL_RADAR_SEEDS: RadarSystem[] = [...BLUE_RADARS, ...RED_RADARS, ...EXTRA_RADARS]
const RADAR_BY_ID = new Map(ALL_RADAR_SEEDS.map((r) => [r.id, r]))
const ALL_EFFECTOR_SEEDS: EffectorSystem[] = [...BLUE_EFFECTORS, ...RED_EFFECTORS]
const EFFECTOR_BY_ID = new Map(ALL_EFFECTOR_SEEDS.map((e) => [e.id, e]))

const DEW_UM: [number, number] = [0.35, 20]

function isRecommendedKind(kind: LaydownAssetKind): boolean {
  return kind === 'recommended_detect' || kind === 'recommended_defeat'
}

function radarSeedForAsset(radarId: string): RadarSystem | null {
  return RADAR_BY_ID.get(radarId) ?? null
}

function emissionFromCapability(
  cap: SpectrumCapability,
  meta: Omit<LaydownEmission, 'unit' | 'lo' | 'hi' | 'id'> & { idPrefix: string },
): LaydownEmission | null {
  const axisUnit = cap.axis === 'eo_ir' || cap.axis === 'cbrn' ? 'um' : 'hz'
  const ext = capabilityExtent(cap, axisUnit)
  if (!ext) return null
  let lo = ext[0]
  let hi = ext[1]
  if (lo > hi) [lo, hi] = [hi, lo]
  return {
    id: `${meta.idPrefix}-${cap.id}`,
    label: meta.label,
    kind: meta.kind,
    unit: axisUnit,
    lo,
    hi: lo === hi ? hi * 1.02 : hi,
    instanceId: meta.instanceId,
    recommended: meta.recommended,
    side: meta.side,
    capabilityLabel: cap.label,
  }
}

function pushCapabilityEmissions(
  out: LaydownEmission[],
  caps: SpectrumCapability[],
  meta: Omit<LaydownEmission, 'unit' | 'lo' | 'hi' | 'id'> & { idPrefix: string },
) {
  for (const cap of caps) {
    const e = emissionFromCapability(cap, meta)
    if (e) out.push(e)
  }
}

function uasEmissions(placed: PlacedUas[]): LaydownEmission[] {
  const out: LaydownEmission[] = []
  for (const p of placed) {
    const platform = resolveSpectrumUas(p.asset.id)
    if (!platform) continue
    pushCapabilityEmissions(out, platform.capabilities ?? [], {
      idPrefix: p.instanceId,
      label: p.asset.name,
      kind: 'uas',
      instanceId: p.instanceId,
      side: 'red',
    })
  }
  return out
}

function cuasEmissions(placed: PlacedCuas[], kind: LaydownAssetKind = 'cuas'): LaydownEmission[] {
  const out: LaydownEmission[] = []
  for (const p of placed) {
    const blue = cuasAssetToSpectrumBlue(p.asset)
    pushCapabilityEmissions(out, blue.capabilities ?? [], {
      idPrefix: p.instanceId,
      label: p.asset.name,
      kind,
      instanceId: p.instanceId,
      recommended: isRecommendedKind(kind),
      side: 'blue',
    })
  }
  return out
}

function radarEmissions(placed: PlacedRadar[]): LaydownEmission[] {
  const out: LaydownEmission[] = []
  for (const p of placed) {
    const seed = radarSeedForAsset(p.asset.id)
    if (!seed) continue
    const cap = radarToCapability(seed)
    const e = emissionFromCapability(cap, {
      idPrefix: p.instanceId,
      label: p.asset.name,
      kind: 'radar',
      instanceId: p.instanceId,
      side: seed.side,
    })
    if (e) out.push(e)
  }
  return out
}

function effectorEmissions(placed: PlacedEffector[]): LaydownEmission[] {
  const out: LaydownEmission[] = []
  for (const p of placed) {
    const seed = EFFECTOR_BY_ID.get(p.asset.id)
    const effect = seed?.effect ?? p.asset.effect

    if (effect === 'laser' || effect === 'hpm') {
      const [lo, hi] = effect === 'laser' ? [1.0, 1.07] : DEW_UM
      out.push({
        id: `${p.instanceId}-dew`,
        label: p.asset.name,
        kind: 'effector',
        unit: 'um',
        lo,
        hi,
        instanceId: p.instanceId,
        side: p.asset.side,
        capabilityLabel: effect === 'laser' ? 'HEL / laser' : 'HPM',
      })
      continue
    }

    for (const linked of p.asset.linkedRadars) {
      const rSeed = radarSeedForAsset(linked.id)
      if (!rSeed) continue
      const cap = radarToCapability(rSeed)
      const e = emissionFromCapability(cap, {
        idPrefix: `${p.instanceId}-${linked.id}`,
        label: `${p.asset.name} · ${linked.name}`,
        kind: 'effector',
        instanceId: p.instanceId,
        side: p.asset.side,
      })
      if (e) out.push(e)
    }
  }
  return out
}

export function resolveLaydownEmissions(
  placedUas: PlacedUas[],
  placedCuas: PlacedCuas[],
  placedRadars: PlacedRadar[],
  placedEffectors: PlacedEffector[],
): LaydownEmission[] {
  return [
    ...uasEmissions(placedUas),
    ...cuasEmissions(placedCuas),
    ...radarEmissions(placedRadars),
    ...effectorEmissions(placedEffectors),
  ]
}

export function resolveRecommendationEmissions(
  threatAssessments: ThreatAssessment[],
  catalogCuas: MapCuasAsset[],
): LaydownEmission[] {
  const byId = new Map(catalogCuas.map((c) => [c.id, c]))
  const seen = new Set<string>()
  const out: LaydownEmission[] = []

  for (const ta of threatAssessments) {
    const recs: Array<[typeof ta.recommendedDefeat, LaydownAssetKind]> = [
      [ta.recommendedDefeat, 'recommended_defeat'],
      [ta.recommendedDetection, 'recommended_detect'],
    ]
    for (const [rec, kind] of recs) {
      if (!rec) continue
      const key = `${kind}-${ta.uasInstanceId}-${rec.assetId}`
      if (seen.has(key)) continue
      seen.add(key)
      const asset = byId.get(rec.assetId)
      if (!asset) continue
      const virtual: PlacedCuas = {
        instanceId: `rec-${key}`,
        asset,
        lon: 0,
        lat: 0,
        terrainAMSL: 0,
        hasTerrainMasking: false,
      }
      out.push(...cuasEmissions([virtual], kind))
    }
  }

  return out
}

export function mergeLaydownEmissions(
  placed: LaydownEmission[],
  recommended: LaydownEmission[],
): LaydownEmission[] {
  if (recommended.length === 0) return placed
  const ids = new Set(placed.map((e) => e.id))
  const extra = recommended.filter((e) => !ids.has(e.id))
  return [...placed, ...extra]
}

function emissionRangeInTileUnit(
  emission: LaydownEmission,
  tile: BandTile,
): [number, number] | null {
  let lo = emission.lo
  let hi = emission.hi
  if (lo > hi) [lo, hi] = [hi, lo]

  if (emission.unit === tile.unit) {
    return [lo, hi]
  }

  if (tile.unit === 'hz' && emission.unit === 'um') {
    const a = umToHz(hi)
    const b = umToHz(lo)
    return [Math.min(a, b), Math.max(a, b)]
  }

  if (tile.unit === 'um' && emission.unit === 'hz') {
    const a = hzToUm(hi)
    const b = hzToUm(lo)
    return [Math.min(a, b), Math.max(a, b)]
  }

  return null
}

export function emissionIntersectsTile(emission: LaydownEmission, tile: BandTile): boolean {
  const ext = emissionRangeInTileUnit(emission, tile)
  if (!ext) return false
  return ext[0] <= tile.hi && ext[1] >= tile.lo
}

export function emissionsForTile(tile: BandTile, emissions: LaydownEmission[]): LaydownEmission[] {
  return emissions.filter((e) => emissionIntersectsTile(e, tile))
}

export function activeTileIds(emissions: LaydownEmission[]): string[] {
  return BAND_TILES.filter((t) =>
    emissions.some((e) => !isRecommendedKind(e.kind) && emissionIntersectsTile(e, t)),
  ).map((t) => t.id)
}

export function activeTiles(emissions: LaydownEmission[]): BandTile[] {
  const ids = new Set(activeTileIds(emissions))
  return BAND_TILES.filter((t) => ids.has(t.id))
}

export function kindChipLabel(kind: LaydownAssetKind): string {
  switch (kind) {
    case 'uas':
      return 'RED UAS'
    case 'cuas':
      return 'C-UAS'
    case 'radar':
      return 'RADAR'
    case 'effector':
      return 'EFFECTOR'
    case 'recommended_detect':
      return 'REC DETECT'
    case 'recommended_defeat':
      return 'REC DEFEAT'
    default:
      return kind
  }
}

export function emissionClipInTile(
  emission: LaydownEmission,
  tile: BandTile,
): { lo: number; hi: number } | null {
  const ext = emissionRangeInTileUnit(emission, tile)
  if (!ext) return null
  const clipLo = Math.max(ext[0], tile.lo)
  const clipHi = Math.min(ext[1], tile.hi)
  if (clipLo > clipHi) return null
  return { lo: clipLo, hi: clipHi }
}


export type TileZoneKind = 'overlap' | 'red_gap'

export interface TileSpectrumZone {
  kind: TileZoneKind
  lo: number
  hi: number
}

type FreqInterval = { lo: number; hi: number }

function normaliseInterval(interval: FreqInterval): FreqInterval {
  return interval.lo <= interval.hi
    ? interval
    : { lo: interval.hi, hi: interval.lo }
}

function mergeIntervals(intervals: FreqInterval[]): FreqInterval[] {
  if (intervals.length === 0) return []
  const sorted = intervals.map(normaliseInterval).sort((a, b) => a.lo - b.lo)
  const out: FreqInterval[] = []
  let cur = { ...sorted[0] }
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].lo <= cur.hi) {
      cur.hi = Math.max(cur.hi, sorted[i].hi)
    } else {
      out.push(cur)
      cur = { ...sorted[i] }
    }
  }
  out.push(cur)
  return out
}

function intersectIntervalPair(a: FreqInterval, b: FreqInterval): FreqInterval | null {
  const lo = Math.max(a.lo, b.lo)
  const hi = Math.min(a.hi, b.hi)
  if (lo > hi) return null
  return { lo, hi }
}

function intersectIntervals(a: FreqInterval[], b: FreqInterval[]): FreqInterval[] {
  const raw: FreqInterval[] = []
  for (const ia of a) {
    for (const ib of b) {
      const x = intersectIntervalPair(ia, ib)
      if (x) raw.push(x)
    }
  }
  return mergeIntervals(raw)
}

function subtractIntervals(a: FreqInterval[], b: FreqInterval[]): FreqInterval[] {
  const mergedB = mergeIntervals(b)
  let result = mergeIntervals(a)
  for (const sub of mergedB) {
    const next: FreqInterval[] = []
    for (const iv of result) {
      if (sub.hi <= iv.lo || sub.lo >= iv.hi) {
        next.push(iv)
      } else {
        if (iv.lo < sub.lo) next.push({ lo: iv.lo, hi: sub.lo })
        if (sub.hi < iv.hi) next.push({ lo: sub.hi, hi: iv.hi })
      }
    }
    result = next
  }
  return result
}

function isRedEmissionKind(kind: LaydownAssetKind): boolean {
  return kind === 'uas'
}

function isBlueEmissionKind(kind: LaydownAssetKind): boolean {
  return (
    kind === 'cuas' ||
    kind === 'radar' ||
    kind === 'effector' ||
    kind === 'recommended_detect' ||
    kind === 'recommended_defeat'
  )
}

function clippedIntervalsForKinds(
  tile: BandTile,
  emissions: LaydownEmission[],
  kindFilter: (kind: LaydownAssetKind) => boolean,
): FreqInterval[] {
  const raw: FreqInterval[] = []
  for (const emission of emissions) {
    if (!kindFilter(emission.kind)) continue
    const clip = emissionClipInTile(emission, tile)
    if (clip) raw.push(clip)
  }
  return mergeIntervals(raw)
}

export function computeTileSpectrumZones(
  tile: BandTile,
  emissions: LaydownEmission[],
): TileSpectrumZone[] {
  const red = clippedIntervalsForKinds(tile, emissions, isRedEmissionKind)
  const blue = clippedIntervalsForKinds(tile, emissions, isBlueEmissionKind)
  if (red.length === 0) return []

  const overlaps = intersectIntervals(red, blue)
  const gaps = subtractIntervals(red, blue)

  const zones: TileSpectrumZone[] = []
  for (const iv of overlaps) {
    zones.push({ kind: 'overlap', lo: iv.lo, hi: iv.hi })
  }
  for (const iv of gaps) {
    zones.push({ kind: 'red_gap', lo: iv.lo, hi: iv.hi })
  }
  return zones
}

export function spectrumZoneStyle(zone: TileSpectrumZone, tile: BandTile): CSSProperties {
  const scale = makeLogScale([tile.lo, tile.hi], [30, 650])
  const x0 = scale(zone.lo)
  const x1 = scale(Math.max(zone.hi, zone.lo * 1.001))
  const leftPct = (x0 / VB_W) * 100
  const widthPct = Math.max(((x1 - x0) / VB_W) * 100, 0.6)

  const topPct = (tile.rowTopY / tile.viewBoxH) * 100
  const heightPct = ((tile.rowBotY + tile.rowH - tile.rowTopY) / tile.viewBoxH) * 100

  if (zone.kind === 'overlap') {
    return {
      position: 'absolute',
      left: `${leftPct}%`,
      width: `${widthPct}%`,
      top: `${topPct}%`,
      height: `${heightPct}%`,
      background: `repeating-linear-gradient(
        45deg,
        rgba(6,182,212,0.22),
        rgba(6,182,212,0.22) 3px,
        rgba(16,185,129,0.28) 3px,
        rgba(16,185,129,0.28) 6px
      )`,
      border: '1px solid rgba(6,182,212,0.65)',
      borderRadius: 2,
      pointerEvents: 'none',
      zIndex: 5,
      boxSizing: 'border-box',
      animation: 'spectrum-zone-overlap-pulse 2.5s ease-in-out infinite',
    }
  }

  return {
    position: 'absolute',
    left: `${leftPct}%`,
    width: `${widthPct}%`,
    top: `${topPct}%`,
    height: `${heightPct}%`,
    background: 'rgba(249,115,22,0.1)',
    border: '1px dashed rgba(249,115,22,0.8)',
    borderRadius: 2,
    pointerEvents: 'none',
    zIndex: 5,
    boxSizing: 'border-box',
    animation: 'spectrum-zone-gap-pulse 2.5s ease-in-out infinite',
  }
}

export function emissionBarStyle(
  emission: LaydownEmission,
  tile: BandTile,
  row: 'top' | 'bot' = 'top',
): CSSProperties | null {
  const clip = emissionClipInTile(emission, tile)
  if (!clip) return null

  const scale = makeLogScale([tile.lo, tile.hi], [30, 650])
  const x0 = scale(clip.lo)
  const x1 = scale(Math.max(clip.hi, clip.lo * 1.001))
  const leftPct = (x0 / VB_W) * 100
  const widthPct = Math.max(((x1 - x0) / VB_W) * 100, 0.6)

  const y = row === 'top' ? tile.rowTopY : tile.rowBotY
  const topPct = (y / tile.viewBoxH) * 100
  const heightPct = (tile.rowH / tile.viewBoxH) * 100

  const colour =
    emission.kind === 'uas'
      ? 'rgba(6,182,212,0.55)'
      : isRecommendedKind(emission.kind)
        ? 'rgba(250,204,21,0.45)'
        : emission.kind === 'radar'
          ? 'rgba(168,85,247,0.55)'
          : 'rgba(249,115,22,0.55)'

  return {
    position: 'absolute',
    left: `${leftPct}%`,
    width: `${widthPct}%`,
    top: `${topPct}%`,
    height: `${heightPct}%`,
    background: colour,
    border:
      emission.recommended || isRecommendedKind(emission.kind)
        ? '1px dashed rgba(250,204,21,0.9)'
        : '1px solid rgba(255,255,255,0.25)',
    borderRadius: 2,
    pointerEvents: 'none',
    zIndex: 3,
    boxSizing: 'border-box',
  }
}

export const STACKED_BRICK_H = 14
export const STACKED_BRICK_GAP = 3
export const STACKED_SECTION_GAP = 8
export const STACKED_GUTTER_W = 72

export function resolveEmissionSide(em: LaydownEmission): 'red' | 'blue' {
  if (em.side === 'red' || em.side === 'blue') return em.side
  return isRedEmissionKind(em.kind) ? 'red' : 'blue'
}

function stackedEmissionSortKey(em: LaydownEmission): string {
  return `${em.label}\0${em.capabilityLabel ?? ''}\0${em.id}`
}

export interface StackedBrick {
  emission: LaydownEmission
  side: 'red' | 'blue'
  y: number
  height: number
}

export interface StackedTileMetrics {
  bricks: StackedBrick[]
  rowTopY: number
  rowBotY: number
  viewBoxH: number
  gutterW: number
}

const STACKED_START_Y = 6

export function computeStackedTileMetrics(
  tile: BandTile,
  emissions: LaydownEmission[],
  options: { showRed: boolean; showBlue: boolean },
): StackedTileMetrics {
  const inTile = emissionsForTile(tile, emissions)
  const visible = inTile.filter((em) => {
    const side = resolveEmissionSide(em)
    return side === 'red' ? options.showRed : options.showBlue
  })

  const redEmissions = visible
    .filter((em) => resolveEmissionSide(em) === 'red')
    .sort((a, b) => stackedEmissionSortKey(a).localeCompare(stackedEmissionSortKey(b)))
  const blueEmissions = visible
    .filter((em) => resolveEmissionSide(em) === 'blue')
    .sort((a, b) => stackedEmissionSortKey(a).localeCompare(stackedEmissionSortKey(b)))

  const brickUnit = STACKED_BRICK_H + STACKED_BRICK_GAP
  const redHeight =
    redEmissions.length > 0 ? redEmissions.length * brickUnit - STACKED_BRICK_GAP : 0
  const blueHeight =
    blueEmissions.length > 0 ? blueEmissions.length * brickUnit - STACKED_BRICK_GAP : 0
  const sectionBetween =
    redEmissions.length > 0 && blueEmissions.length > 0 ? STACKED_SECTION_GAP : 0
  const stackHeight = redHeight + sectionBetween + blueHeight
  const paddingBeforeAlloc = stackHeight > 0 ? STACKED_SECTION_GAP : 0
  const extraHeight = stackHeight + paddingBeforeAlloc

  const bricks: StackedBrick[] = []
  let y = STACKED_START_Y

  for (const em of redEmissions) {
    bricks.push({ emission: em, side: 'red', y, height: STACKED_BRICK_H })
    y += brickUnit
  }

  if (sectionBetween > 0) {
    y += sectionBetween - STACKED_BRICK_GAP
  }

  for (const em of blueEmissions) {
    bricks.push({ emission: em, side: 'blue', y, height: STACKED_BRICK_H })
    y += brickUnit
  }

  return {
    bricks,
    rowTopY: tile.rowTopY + extraHeight,
    rowBotY: tile.rowBotY + extraHeight,
    viewBoxH: tile.viewBoxH + extraHeight,
    gutterW: STACKED_GUTTER_W,
  }
}

export function applyStackedLayout(tile: BandTile, metrics: StackedTileMetrics): BandTile {
  return {
    ...tile,
    viewBoxH: metrics.viewBoxH,
    rowTopY: metrics.rowTopY,
    rowBotY: metrics.rowBotY,
  }
}

export function stackedBrickStyle(brick: StackedBrick, tile: BandTile): CSSProperties | null {
  const clip = emissionClipInTile(brick.emission, tile)
  if (!clip) return null

  const gutter = STACKED_GUTTER_W
  const scale = makeLogScale([tile.lo, tile.hi], [30 + gutter, 650])
  const x0 = scale(clip.lo)
  const x1 = scale(Math.max(clip.hi, clip.lo * 1.001))
  const leftPct = (x0 / VB_W) * 100
  const widthPct = Math.max(((x1 - x0) / VB_W) * 100, 0.6)
  const topPct = (brick.y / tile.viewBoxH) * 100
  const heightPct = (brick.height / tile.viewBoxH) * 100

  const colour =
    brick.side === 'red' ? 'rgba(248,113,113,0.6)' : 'rgba(74,158,255,0.6)'
  const border =
    brick.emission.recommended || isRecommendedKind(brick.emission.kind)
      ? '1px dashed rgba(250,204,21,0.9)'
      : '1px solid rgba(255,255,255,0.25)'

  return {
    position: 'absolute',
    left: `${leftPct}%`,
    width: `${widthPct}%`,
    top: `${topPct}%`,
    height: `${heightPct}%`,
    background: colour,
    border,
    borderRadius: 2,
    pointerEvents: 'none',
    zIndex: 4,
    boxSizing: 'border-box',
  }
}

export { VB_W as LAYDOWN_TILE_VB_W }
