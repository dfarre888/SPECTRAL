/**
 * Callers: SpectrumWorkspace, BandTileFullscreenModal, BandTileGrid density
 * Purpose: Project Spectrum Platform capabilities → LaydownEmission for band tiles
 * Honesty: capabilityExtent only — never invent centre freqs / ERP
 * Spec: docs/spectrum/PROMPT-BAND-TILE-REMODEL.md
 */

import { BAND_TILES, type BandTile } from '@/lib/spectrum/band-tile-data'
import {
  emissionIntersectsTile,
  emissionsForTile,
  kindChipLabel,
  resolveEmissionSide,
  type LaydownAssetKind,
  type LaydownEmission,
} from '@/lib/map/laydown-tiles'
import { capabilityExtent } from '@/lib/spectrum/scale'
import type { Platform, Side, SpectrumCapability, SpectrumLayer } from '@/lib/spectrum/types'

/**
 * The band-tile view keeps `neutral` as its own bucket, whereas
 * laydown-tiles' resolveEmissionSide() collapses it into blue. Without this the
 * `neutral` counter and the showNeutral filter below can never fire.
 */
function resolveTileSide(em: LaydownEmission): 'red' | 'blue' | 'neutral' {
  return em.side === 'neutral' ? 'neutral' : resolveEmissionSide(em)
}

export type BandTileAssetType =
  | 'drone'
  | 'radar'
  | 'land'
  | 'maritime'
  | 'air'
  | 'datalink'
  | 'ew'
  | 'other'

export const BAND_TILE_ASSET_TYPES: { id: BandTileAssetType; label: string }[] = [
  { id: 'drone', label: 'drone/UAS' },
  { id: 'radar', label: 'radar' },
  { id: 'land', label: 'land/GBAD' },
  { id: 'maritime', label: 'maritime' },
  { id: 'air', label: 'air combat' },
  { id: 'datalink', label: 'datalink/C2' },
  { id: 'ew', label: 'EW/jam' },
  { id: 'other', label: 'other' },
]

export const BRICK_BUDGET_DEFAULT = 40

export type SpectrumLaydownEmission = LaydownEmission & {
  derived?: boolean
  assetType?: BandTileAssetType
  platformId?: string
}

function hay(p: Platform): string {
  return `${p.name} ${p.category ?? ''} ${p.role ?? ''} ${p.origin ?? ''}`.toLowerCase()
}

/** OSINT heuristics only — role/category/group/capability fn. */
export function classifyAssetType(p: Platform): BandTileAssetType {
  const h = hay(p)
  const fns = new Set((p.capabilities ?? []).map((c) => c.fn))
  const hasRadar =
    fns.has('radar_emit') ||
    fns.has('detect_radar') ||
    (p.capabilities ?? []).some((c) => c.layer === 'radar') ||
    /radar|gbad|sam\b|patriot|s-400|sentinel/.test(h)
  const hasEw =
    [...fns].some((f) => f.startsWith('jam_') || f === 'spoof_gnss' || f === 'takeover' || f === 'hpm') ||
    /\bew\b|jammer|spoof/.test(h) ||
    p.role === 'ew'
  const hasDatalink = [...fns].some((f) =>
    ['control', 'datalink', 'telemetry', 'video'].includes(f),
  )
  const isDrone =
    (p.group != null && p.group >= 1 && p.group <= 5) ||
    /fpv|owa|male|hale|uas|uav|quad|loiter|shahed|geran|reaper|predator|switchblade|lancet/.test(h) ||
    /isr/.test(h) && /drone|uas|uav|mq-|rq-/.test(h)
  const isMaritime = /maritime|naval|ship|usv|asw|destroyer|frigate|carrier/.test(h)
  const isAir =
    /fighter|multirole|aew|awacs|interceptor|combat air/.test(h) ||
    p.role === 'fighter' ||
    p.role === 'multirole' ||
    p.role === 'aew_c' ||
    p.role === 'trainer_lead_in'
  const isLand =
    p.role === 'radar_ground' ||
    /land|gbad|ground|artillery|himars|howitzer|sam\b/.test(h)

  // Priority: specialised before other
  if (isDrone) return 'drone'
  if (hasRadar && (isLand || p.role === 'radar_ground')) return 'radar'
  if (hasRadar && !isAir) return 'radar'
  if (hasEw) return 'ew'
  if (isMaritime) return 'maritime'
  if (isAir) return 'air'
  if (isLand) return 'land'
  if (hasDatalink && !isDrone) return 'datalink'
  if (hasRadar) return 'radar'
  return 'other'
}

/**
 * Map platform → LaydownAssetKind from OSINT role/type — not force side alone.
 * Red radars must stay `radar` (not `uas`); side is carried on LaydownEmission.side.
 */
export function kindForSpectrumPlatform(p: Platform): LaydownAssetKind {
  const t = classifyAssetType(p)
  const fns = new Set((p.capabilities ?? []).map((c) => c.fn))
  const jamLike = [...fns].some(
    (f) => f.startsWith('jam_') || f === 'spoof_gnss' || f === 'takeover' || f === 'hpm',
  )

  if (t === 'radar' || fns.has('radar_emit') || fns.has('detect_radar')) return 'radar'
  if (t === 'ew' || jamLike || fns.has('laser_defeat')) return 'effector'
  if (t === 'drone') return p.side === 'blue' ? 'cuas' : 'uas'
  // Blue non-drone defence / sensing defaults to C-UAS kind for stack colouring
  if (p.side === 'blue' || p.side === 'neutral') return 'cuas'
  // Red air/maritime/land/datalink without radar/EW: threat emitter lane (uas = red threat kind)
  return 'uas'
}

function emissionFromCap(
  cap: SpectrumCapability,
  meta: {
    idPrefix: string
    label: string
    kind: LaydownAssetKind
    side?: Side
    derived?: boolean
    assetType?: BandTileAssetType
    platformId?: string
  },
): SpectrumLaydownEmission | null {
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
    side: meta.side,
    capabilityLabel: cap.label,
    derived: meta.derived ?? Boolean(cap.derived),
    assetType: meta.assetType,
    platformId: meta.platformId,
  }
}

export function platformsToLaydownEmissions(
  platforms: Platform[],
  opts?: {
    filterLayers?: ReadonlySet<SpectrumLayer>
    selectedIds?: readonly string[]
  },
): SpectrumLaydownEmission[] {
  let list = platforms
  if (opts?.selectedIds?.length) {
    const allow = new Set(opts.selectedIds)
    list = list.filter((p) => allow.has(p.id))
  }

  const out: SpectrumLaydownEmission[] = []
  for (const p of list) {
    const kind = kindForSpectrumPlatform(p)
    const assetType = classifyAssetType(p)
    const derivedPlatform = p.id.startsWith('pcm-') || p.confidence === 'derived' || p.confidence === 'estimated'
    const caps = (p.capabilities ?? []).filter((c) => {
      if (opts?.filterLayers && !opts.filterLayers.has(c.layer)) return false
      return true
    })
    for (const cap of caps) {
      const e = emissionFromCap(cap, {
        idPrefix: p.id,
        label: p.name,
        kind,
        side: p.side,
        derived: derivedPlatform || Boolean(cap.derived),
        assetType,
        platformId: p.id,
      })
      if (e) out.push(e)
    }
  }
  return out
}

export interface BandTileDensity {
  red: number
  blue: number
  neutral: number
  /** top kinds by count, max 4 */
  kindChips: { kind: LaydownAssetKind; label: string; count: number }[]
  /** top asset types by count, max 4 */
  typeChips: { type: BandTileAssetType; label: string; count: number }[]
  total: number
}

export function densityForTile(
  tile: BandTile,
  emissions: SpectrumLaydownEmission[],
): BandTileDensity {
  const inTile = emissionsForTile(tile, emissions) as SpectrumLaydownEmission[]
  let red = 0
  let blue = 0
  let neutral = 0
  const kindCounts = new Map<LaydownAssetKind, number>()
  const typeCounts = new Map<BandTileAssetType, number>()

  for (const em of inTile) {
    const side = resolveTileSide(em)
    if (side === 'neutral') neutral += 1
    else if (side === 'red') red += 1
    else blue += 1
    kindCounts.set(em.kind, (kindCounts.get(em.kind) ?? 0) + 1)
    const t = em.assetType ?? 'other'
    typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1)
  }

  const kindChips = [...kindCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([kind, count]) => ({ kind, label: kindChipLabel(kind), count }))

  const typeLabel = (t: BandTileAssetType) =>
    BAND_TILE_ASSET_TYPES.find((x) => x.id === t)?.label ?? t

  const typeChips = [...typeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([type, count]) => ({ type, label: typeLabel(type), count }))

  return { red, blue, neutral, kindChips, typeChips, total: inTile.length }
}

export interface BandTileEmissionFilters {
  showRed: boolean
  showBlue: boolean
  showNeutral: boolean
  assetTypes: ReadonlySet<BandTileAssetType>
  includeCurated: boolean
  includePcm: boolean
  search: string
}

export function defaultBandTileFilters(): BandTileEmissionFilters {
  return {
    showRed: true,
    showBlue: true,
    showNeutral: false,
    assetTypes: new Set(BAND_TILE_ASSET_TYPES.map((t) => t.id)),
    includeCurated: true,
    includePcm: true,
    search: '',
  }
}

export function filterBandTileEmissions(
  tile: BandTile,
  emissions: SpectrumLaydownEmission[],
  filters: BandTileEmissionFilters,
): SpectrumLaydownEmission[] {
  const q = filters.search.trim().toLowerCase()
  const inTile = emissionsForTile(tile, emissions) as SpectrumLaydownEmission[]

  return inTile.filter((em) => {
    const side = resolveTileSide(em)
    if (side === 'red' && !filters.showRed) return false
    if (side === 'blue' && !filters.showBlue) return false
    if (side === 'neutral' && !filters.showNeutral) return false

    const derived = Boolean(em.derived) || (em.platformId?.startsWith('pcm-') ?? false)
    if (derived && !filters.includePcm) return false
    if (!derived && !filters.includeCurated) return false

    const t = em.assetType ?? 'other'
    if (filters.assetTypes.size > 0 && !filters.assetTypes.has(t)) return false

    if (q) {
      const hay = `${em.label} ${em.capabilityLabel ?? ''} ${em.platformId ?? ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
}

/** Densest-first brick budget for pop-out chart. */
export function budgetEmissions(
  emissions: SpectrumLaydownEmission[],
  budget = BRICK_BUDGET_DEFAULT,
  showAll = false,
): { visible: SpectrumLaydownEmission[]; truncated: boolean; total: number } {
  const total = emissions.length
  if (showAll || total <= budget) {
    return { visible: emissions, truncated: false, total }
  }
  // Prefer curated, then wider span (more of the band occupied)
  const ranked = [...emissions].sort((a, b) => {
    const da = a.derived ? 1 : 0
    const db = b.derived ? 1 : 0
    if (da !== db) return da - db
    const spanA = Math.abs(Math.log10(Math.max(a.hi, a.lo * 1.001)) - Math.log10(Math.max(a.lo, 1)))
    const spanB = Math.abs(Math.log10(Math.max(b.hi, b.lo * 1.001)) - Math.log10(Math.max(b.lo, 1)))
    return spanB - spanA
  })
  return { visible: ranked.slice(0, budget), truncated: true, total }
}

export function tileById(id: string): BandTile | undefined {
  return BAND_TILES.find((t) => t.id === id)
}

export function emissionIntersectsBandTile(
  emission: LaydownEmission,
  tile: BandTile,
): boolean {
  return emissionIntersectsTile(emission, tile)
}
