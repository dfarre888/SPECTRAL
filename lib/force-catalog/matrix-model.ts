/**
 * Callers: ForceCatalogMatrix.tsx, _test_matrix-model.test.ts
 * Purpose: Pure capability×platform matrix model — normalise keys, counters, OrBat impact
 * API/schema: ForceCatalogPlatformFull.comms / .sensors (read-only; no writes)
 * User instruction: execute PROMPT-CAPABILITY-MATRIX.md (industry-leader OrBat matrix tab)
 */

import type { ForceCatalogPlatformFull } from '@/lib/bmi/bmi-types'

export type CapabilityKind = 'comms' | 'sensors'
export type MatrixSort = 'coverage' | 'az' | 'rarest'
export type KindFilter = 'all' | 'comms' | 'sensors'

export interface CapabilityMeta {
  id: string
  kind: CapabilityKind
  label: string
  subtitle: string | null
  sovereign: boolean
}

export interface MatrixRow {
  capability: CapabilityMeta
  hasCount: number
  platformCount: number
  /** platformId → has */
  hasByPlatform: Record<string, boolean>
}

export interface OrBatImpact {
  removed: { id: string; short_name: string }[]
  lostEntirely: CapabilityMeta[]
  degraded: { capability: CapabilityMeta; before: number; after: number }[]
  /** % of capability rows with ≥1 HAS (eligible columns) */
  coverageBefore: number
  /** % of capability rows with ≥1 HAS (visible columns) */
  coverageAfter: number
}

export interface MatrixView {
  columns: ForceCatalogPlatformFull[]
  pinnedIds: string[]
  rows: MatrixRow[]
  impact: OrBatImpact | null
  stats: {
    capabilityCount: number
    platformCount: number
    hiddenCount: number
    coveragePct: number
  }
}

const STANDARD_LABELS: Record<string, string> = {
  link16: 'Link 16',
  link11: 'Link 11',
  link22: 'Link 22',
  madl: 'MADL',
  ifdl: 'IFDL',
  sadl: 'SADL',
  national: 'National datalink',
  none: 'None',
}

/** Collapse whitespace / punctuation; map common bearer aliases to stable ids. */
export function normaliseCapabilityId(raw: string): string {
  const s = raw
    .toLowerCase()
    .trim()
    .replace(/[_./]+/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')

  if (!s) return 'unknown'

  if (/^link\s*16$/.test(s) || s === 'l16' || s === 'jtids' || s === 'mids') return 'link16'
  if (/^link\s*11$/.test(s)) return 'link11'
  if (/^link\s*22$/.test(s)) return 'link22'
  if (s === 'madl') return 'madl'
  if (s === 'ifdl') return 'ifdl'
  if (s === 'sadl') return 'sadl'

  if (s === 'voice uhf' || s === 'uhf voice') return 'voice_uhf'
  if (s === 'voice vhf' || s === 'vhf voice') return 'voice_vhf'
  if (s === 'hf voice' || s === 'voice hf') return 'voice_hf'
  if (s === 'satcom' || s === 'voice satcom' || s === 'satcom voice') return 'voice_satcom'
  if (s === 'data satcom') return 'data_satcom'

  return s.replace(/\s+/g, '_')
}

export function displayLabelForCapability(id: string, fallback: string): string {
  if (STANDARD_LABELS[id]) return STANDARD_LABELS[id]
  const voice: Record<string, string> = {
    voice_uhf: 'UHF voice',
    voice_vhf: 'VHF voice',
    voice_hf: 'HF voice',
    voice_satcom: 'SATCOM voice',
    data_satcom: 'SATCOM data',
  }
  if (voice[id]) return voice[id]
  if (fallback.trim()) return fallback.trim()
  return id
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function bearerCapability(c: ForceCatalogPlatformFull['comms'][number]): CapabilityMeta {
  const raw = c.standard && c.standard !== 'none' ? c.standard : c.label
  const id = normaliseCapabilityId(raw || c.kind)
  const label = displayLabelForCapability(id, c.label || c.standard || c.kind)
  const parts = [c.band, c.kind].filter(Boolean) as string[]
  return {
    id: `comms:${id}`,
    kind: 'comms',
    label,
    subtitle: parts.length ? parts.join(' · ') : null,
    sovereign: false,
  }
}

function sensorCapability(s: ForceCatalogPlatformFull['sensors'][number]): CapabilityMeta {
  const id = normaliseCapabilityId(s.label || s.kind || 'sensor')
  const sovereign = s.performance_ref === 'SOVEREIGN_CORE_BOUNDARY'
  const parts = [s.band, s.kind].filter(Boolean) as string[]
  if (sovereign) parts.push('resolved in defence IDE')
  return {
    id: `sensors:${id}`,
    kind: 'sensors',
    label: displayLabelForCapability(id, s.label || s.kind || 'Sensor'),
    subtitle: parts.length ? parts.join(' · ') : null,
    sovereign,
  }
}

/** Union of capabilities + possession sets for a platform list. */
export function buildPossession(platforms: ForceCatalogPlatformFull[]): {
  capabilities: Map<string, CapabilityMeta>
  possession: Map<string, Set<string>>
} {
  const capabilities = new Map<string, CapabilityMeta>()
  const possession = new Map<string, Set<string>>()

  for (const p of platforms) {
    const set = new Set<string>()
    for (const c of p.comms) {
      const meta = bearerCapability(c)
      const prev = capabilities.get(meta.id)
      if (!prev) capabilities.set(meta.id, meta)
      else if (!prev.subtitle && meta.subtitle) capabilities.set(meta.id, meta)
      set.add(meta.id)
    }
    for (const s of p.sensors) {
      const meta = sensorCapability(s)
      const prev = capabilities.get(meta.id)
      if (!prev) capabilities.set(meta.id, meta)
      else if (meta.sovereign && !prev.sovereign) capabilities.set(meta.id, meta)
      else if (!prev.subtitle && meta.subtitle) capabilities.set(meta.id, meta)
      set.add(meta.id)
    }
    possession.set(p.id, set)
  }

  return { capabilities, possession }
}

export function platformsWithAllCapabilities(
  platforms: ForceCatalogPlatformFull[],
  possession: Map<string, Set<string>>,
  requiredIds: string[],
): ForceCatalogPlatformFull[] {
  if (!requiredIds.length) return platforms
  return platforms.filter((p) => {
    const set = possession.get(p.id)
    if (!set) return false
    return requiredIds.every((id) => set.has(id))
  })
}

/** Coverage = % of capability rows with ≥1 HAS among the given platform ids. */
export function coveragePercent(
  capabilityIds: string[],
  platformIds: string[],
  possession: Map<string, Set<string>>,
): number {
  if (!capabilityIds.length || !platformIds.length) return 0
  let withAny = 0
  for (const capId of capabilityIds) {
    let has = false
    for (const pid of platformIds) {
      if (possession.get(pid)?.has(capId)) {
        has = true
        break
      }
    }
    if (has) withAny += 1
  }
  return Math.round((withAny / capabilityIds.length) * 100)
}

function countHas(
  capId: string,
  platformIds: string[],
  possession: Map<string, Set<string>>,
): number {
  let n = 0
  for (const pid of platformIds) {
    if (possession.get(pid)?.has(capId)) n += 1
  }
  return n
}

export function computeImpact(args: {
  capabilities: CapabilityMeta[]
  eligible: ForceCatalogPlatformFull[]
  visible: ForceCatalogPlatformFull[]
  possession: Map<string, Set<string>>
}): OrBatImpact | null {
  const { capabilities, eligible, visible, possession } = args
  const visibleIdsSet = new Set(visible.map((p) => p.id))
  const hidden = eligible.filter((p) => !visibleIdsSet.has(p.id))
  if (!hidden.length) return null

  const eligibleIds = eligible.map((p) => p.id)
  const visibleIds = visible.map((p) => p.id)
  const capIds = capabilities.map((c) => c.id)

  const lostEntirely: CapabilityMeta[] = []
  const degraded: OrBatImpact['degraded'] = []

  for (const cap of capabilities) {
    const before = countHas(cap.id, eligibleIds, possession)
    const after = countHas(cap.id, visibleIds, possession)
    if (before >= 1 && after === 0) lostEntirely.push(cap)
    else if (after < before && after > 0) {
      degraded.push({ capability: cap, before, after })
    }
  }

  return {
    removed: hidden.map((p) => ({ id: p.id, short_name: p.short_name })),
    lostEntirely,
    degraded,
    coverageBefore: coveragePercent(capIds, eligibleIds, possession),
    coverageAfter: coveragePercent(capIds, visibleIds, possession),
  }
}

export function buildMatrixView(args: {
  platforms: ForceCatalogPlatformFull[]
  hiddenPlatformIds: ReadonlySet<string>
  pinnedPlatformIds: readonly string[]
  capabilityFilterIds: readonly string[]
  kindFilter: KindFilter
  capabilitySearch: string
  sort: MatrixSort
}): MatrixView {
  const {
    platforms,
    hiddenPlatformIds,
    pinnedPlatformIds,
    capabilityFilterIds,
    kindFilter,
    capabilitySearch,
    sort,
  } = args

  const { capabilities, possession } = buildPossession(platforms)
  const eligible = platformsWithAllCapabilities(platforms, possession, [...capabilityFilterIds])

  const pinnedSet = new Set(pinnedPlatformIds.slice(0, 3))
  const visibleUnsorted = eligible.filter((p) => !hiddenPlatformIds.has(p.id))
  const pinned = visibleUnsorted.filter((p) => pinnedSet.has(p.id))
  const rest = visibleUnsorted
    .filter((p) => !pinnedSet.has(p.id))
    .sort((a, b) => {
      const side = a.force_side.localeCompare(b.force_side)
      if (side !== 0) return side
      return a.short_name.localeCompare(b.short_name)
    })
  const columns = [...pinned, ...rest]

  const q = capabilitySearch.trim().toLowerCase()
  const capList = [...capabilities.values()].filter((c) => {
    if (kindFilter !== 'all' && c.kind !== kindFilter) return false
    if (!q) return true
    return (
      c.label.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      (c.subtitle?.toLowerCase().includes(q) ?? false)
    )
  })

  const rows: MatrixRow[] = capList.map((capability) => {
    const hasByPlatform: Record<string, boolean> = {}
    let hasCount = 0
    for (const p of columns) {
      const has = possession.get(p.id)?.has(capability.id) ?? false
      hasByPlatform[p.id] = has
      if (has) hasCount += 1
    }
    return {
      capability,
      hasCount,
      platformCount: columns.length,
      hasByPlatform,
    }
  })

  rows.sort((a, b) => {
    if (a.capability.kind !== b.capability.kind) {
      return a.capability.kind === 'comms' ? -1 : 1
    }
    if (sort === 'az') return a.capability.label.localeCompare(b.capability.label)
    if (sort === 'rarest') {
      if (a.hasCount !== b.hasCount) return a.hasCount - b.hasCount
      return a.capability.label.localeCompare(b.capability.label)
    }
    if (a.hasCount !== b.hasCount) return b.hasCount - a.hasCount
    return a.capability.label.localeCompare(b.capability.label)
  })

  const impactCaps = rows.map((r) => r.capability)
  const impact = computeImpact({
    capabilities: impactCaps,
    eligible,
    visible: columns,
    possession,
  })

  const coveragePct = coveragePercent(
    impactCaps.map((c) => c.id),
    columns.map((p) => p.id),
    possession,
  )

  return {
    columns,
    pinnedIds: pinned.map((p) => p.id),
    rows,
    impact,
    stats: {
      capabilityCount: rows.length,
      platformCount: columns.length,
      hiddenCount: eligible.filter((p) => hiddenPlatformIds.has(p.id)).length,
      coveragePct,
    },
  }
}


/** Densest-first column budget: platforms with most HAS cells first (pins handled by buildMatrixView). */
export function applyColumnBudget(
  columns: ForceCatalogPlatformFull[],
  rows: MatrixRow[],
  budget: number,
  showAll: boolean,
): { visible: ForceCatalogPlatformFull[]; truncated: boolean; total: number } {
  const total = columns.length
  if (showAll || total <= budget) {
    return { visible: columns, truncated: false, total }
  }
  const density = new Map<string, number>()
  for (const p of columns) {
    let n = 0
    for (const r of rows) {
      if (r.hasByPlatform[p.id]) n += 1
    }
    density.set(p.id, n)
  }
  const ranked = [...columns].sort((a, b) => {
    const d = (density.get(b.id) ?? 0) - (density.get(a.id) ?? 0)
    if (d !== 0) return d
    return a.short_name.localeCompare(b.short_name)
  })
  return { visible: ranked.slice(0, budget), truncated: true, total }
}

export function toggleIdInList(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
}
