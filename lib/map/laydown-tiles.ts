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

export { VB_W as LAYDOWN_TILE_VB_W }
