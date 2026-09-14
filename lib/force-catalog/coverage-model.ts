/**
 * Coverage model for the capability workbench.
 *
 * Pure: platforms + a bench set → sections of rows. Every row carries its
 * pre-bench count (`ghost`) so the UI can show loss without a diff panel, and
 * a `noData` flag so OSINT gaps never render as zero capability.
 */
import type { ForceCatalogPlatformFull, ForceSideCatalog } from '@/lib/bmi/bmi-types'
import { analyseInterop, type InteropNet, type InteropResult } from '@/lib/coalition/interop'
import { toInteropPlatforms } from '@/lib/coalition/catalog-adapter'
import type { ConnTier } from '@/lib/coalition/datalink-matrix'
import { buildPossession, type CapabilityMeta } from '@/lib/force-catalog/matrix-model'
import { BAND_KIND, sensorBands, sensorsStatus, type SensorBand } from '@/lib/force-catalog/spectrum-bands'

export type CoverageSectionKind = 'nets' | 'radar' | 'eoir' | 'esm' | 'other'
export type CoverageSort = 'coverage' | 'rarest' | 'az'

export interface SideCount {
  blue: number
  red: number
  neutral: number
}

export interface CoverageRow {
  id: string
  kind: CoverageSectionKind
  label: string
  subtitle: string | null
  /** Sensing band for sensor rows, null for nets and other. */
  band: SensorBand | null
  active: number
  /** Count before benching. */
  ghost: number
  bySide: SideCount
  holderIds: string[]
  /** Short names of benched holders when the row fell to zero. */
  lostWith: string[]
  /** No platform in scope carries data for this row's kind. */
  noData: boolean
  tier?: ConnTier
  gateways?: number
}

export interface CoverageSection {
  kind: CoverageSectionKind
  label: string
  rows: CoverageRow[]
}

export interface CoverageResult {
  sections: CoverageSection[]
  activeCount: number
  benchedCount: number
  /** Share of rows with ≥1 active holder, 0–100. */
  coveragePct: number
  /** Platforms in scope with no sensors listed. */
  sensorGapCount: number
  interop: InteropResult
  interopGhost: InteropResult
}

const SECTION_LABEL: Record<CoverageSectionKind, string> = {
  nets: 'Comms nets',
  radar: 'Radar bands',
  eoir: 'EO/IR bands',
  esm: 'ESM',
  other: 'Other capabilities',
}

function emptySide(): SideCount {
  return { blue: 0, red: 0, neutral: 0 }
}

function addSide(c: SideCount, side: ForceSideCatalog) {
  c[side] += 1
}

function sortRows(rows: CoverageRow[], sort: CoverageSort): CoverageRow[] {
  const byLabel = (a: CoverageRow, b: CoverageRow) => a.label.localeCompare(b.label)
  if (sort === 'az') return rows.sort(byLabel)
  if (sort === 'rarest') return rows.sort((a, b) => a.ghost - b.ghost || byLabel(a, b))
  return rows.sort((a, b) => b.active - a.active || b.ghost - a.ghost || byLabel(a, b))
}

function finishRow(
  base: Omit<CoverageRow, 'active' | 'ghost' | 'bySide' | 'holderIds' | 'lostWith'>,
  holders: ForceCatalogPlatformFull[],
  benched: Set<string>,
): CoverageRow {
  const bySide = emptySide()
  const holderIds: string[] = []
  const lost: string[] = []
  for (const p of holders) {
    if (benched.has(p.id)) lost.push(p.short_name)
    else {
      holderIds.push(p.id)
      addSide(bySide, p.force_side)
    }
  }
  return {
    ...base,
    active: holderIds.length,
    ghost: holders.length,
    bySide,
    holderIds,
    lostWith: holderIds.length === 0 && holders.length > 0 ? lost : [],
  }
}

function netRows(
  platforms: ForceCatalogPlatformFull[],
  benched: Set<string>,
  ghost: InteropResult,
): CoverageRow[] {
  const byId = new Map(platforms.map((p) => [p.id, p]))
  const rows: CoverageRow[] = []
  const tiers: (keyof Pick<InteropResult, 'track' | 'data' | 'voice'>)[] = ['track', 'data', 'voice']
  for (const tier of tiers) {
    for (const net of ghost[tier].nets) {
      const holders = net.memberIds.map((id) => byId.get(id)).filter(Boolean) as ForceCatalogPlatformFull[]
      const gateways = holders.filter(
        (p) => !benched.has(p.id) && p.comms.some((c) => c.gateway_capable),
      ).length
      rows.push(
        finishRow(
          {
            id: net.key,
            kind: 'nets',
            label: net.label,
            subtitle: net.scope ? `${net.scope} only` : null,
            band: null,
            noData: false,
            tier: net.tier,
            gateways,
          },
          holders,
          benched,
        ),
      )
    }
  }
  return rows
}

function sensorRows(
  platforms: ForceCatalogPlatformFull[],
  benched: Set<string>,
): Record<'radar' | 'eoir' | 'esm', CoverageRow[]> {
  const buckets: Record<'radar' | 'eoir' | 'esm', Map<string, { meta: Omit<CoverageRow, 'active' | 'ghost' | 'bySide' | 'holderIds' | 'lostWith'>; holders: ForceCatalogPlatformFull[] }>> = {
    radar: new Map(),
    eoir: new Map(),
    esm: new Map(),
  }
  for (const p of platforms) {
    const seen = new Set<string>()
    for (const s of p.sensors) {
      const section: 'radar' | 'eoir' | 'esm' | null =
        s.kind === 'radar' ? 'radar' : s.kind === 'eo_ir' ? 'eoir' : s.kind === 'esm' ? 'esm' : null
      if (!section) continue
      const bands = sensorBands(s)
      const keys: (SensorBand | 'unknown')[] = bands.length ? bands : ['unknown']
      for (const band of keys) {
        const id = `${section}:${band}`
        if (seen.has(id)) continue
        seen.add(id)
        const bucket = buckets[section]
        if (!bucket.has(id)) {
          const kindWord = section === 'radar' ? 'radar' : section === 'eoir' ? 'EO/IR' : 'ESM'
          const label = band === 'unknown' ? `${kindWord} (band not stated)` : `${band} ${kindWord}`
          bucket.set(id, {
            meta: {
              id,
              kind: section,
              label,
              subtitle: band !== 'unknown' ? (BAND_KIND[band] ?? null) : null,
              band: band === 'unknown' ? null : band,
              noData: false,
            },
            holders: [],
          })
        }
        bucket.get(id)!.holders.push(p)
      }
    }
  }
  const out = { radar: [] as CoverageRow[], eoir: [] as CoverageRow[], esm: [] as CoverageRow[] }
  for (const section of ['radar', 'eoir', 'esm'] as const) {
    for (const { meta, holders } of buckets[section].values()) out[section].push(finishRow(meta, holders, benched))
  }
  return out
}

function otherRows(platforms: ForceCatalogPlatformFull[], benched: Set<string>): CoverageRow[] {
  const { capabilities, possession } = buildPossession(platforms)
  const rows: CoverageRow[] = []
  for (const meta of capabilities.values()) {
    // Datalinks are already nets; radar/EO-IR/ESM are already band rows.
    if (meta.kind === 'sensors') continue
    if (meta.id.startsWith('comms:link') || meta.id.startsWith('comms:madl') || meta.id.startsWith('comms:ifdl')) continue
    const holders = platforms.filter((p) => possession.get(p.id)?.has(meta.id))
    rows.push(
      finishRow(
        { id: meta.id, kind: 'other', label: meta.label, subtitle: meta.subtitle, band: null, noData: false },
        holders,
        benched,
      ),
    )
  }
  return rows
}

export function buildCoverage(args: {
  platforms: ForceCatalogPlatformFull[]
  benched: Set<string>
  sort: CoverageSort
}): CoverageResult {
  const { platforms, benched, sort } = args
  const active = platforms.filter((p) => !benched.has(p.id))
  const interopGhost = analyseInterop(toInteropPlatforms(platforms))
  const interop = analyseInterop(toInteropPlatforms(active))

  const nets = netRows(platforms, benched, interopGhost)
  const sensors = sensorRows(platforms, benched)
  const other = otherRows(platforms, benched)

  const sensorGapCount = platforms.filter((p) => sensorsStatus(p) === 'gap').length
  const allSensorsGap = platforms.length > 0 && sensorGapCount === platforms.length

  const sections: CoverageSection[] = [
    { kind: 'nets', label: SECTION_LABEL.nets, rows: sortRows(nets, sort) },
    { kind: 'radar', label: SECTION_LABEL.radar, rows: sortRows(sensors.radar, sort) },
    { kind: 'eoir', label: SECTION_LABEL.eoir, rows: sortRows(sensors.eoir, sort) },
    { kind: 'esm', label: SECTION_LABEL.esm, rows: sortRows(sensors.esm, sort) },
    { kind: 'other', label: SECTION_LABEL.other, rows: sortRows(other, sort) },
  ]
  // A sensor section with no rows because nobody in scope lists sensors is a
  // data gap, not an absence. Surface one hatched row so the pane says so.
  for (const s of sections) {
    if ((s.kind === 'radar' || s.kind === 'eoir' || s.kind === 'esm') && s.rows.length === 0 && allSensorsGap) {
      s.rows.push({
        id: `${s.kind}:nodata`, kind: s.kind, label: 'No sensors listed for platforms in scope', subtitle: 'OSINT gap',
        band: null, active: 0, ghost: 0, bySide: emptySide(), holderIds: [], lostWith: [], noData: true,
      })
    }
  }

  const rows = sections.flatMap((s) => s.rows).filter((r) => !r.noData)
  const covered = rows.filter((r) => r.active > 0).length
  return {
    sections,
    activeCount: active.length,
    benchedCount: platforms.length - active.length,
    coveragePct: rows.length ? Math.round((covered / rows.length) * 100) : 0,
    sensorGapCount,
    interop,
    interopGhost,
  }
}

/** Convenience for the inspector: the net a row id refers to, from the ghost result. */
export function findNet(result: InteropResult, key: string): InteropNet | null {
  for (const tier of ['track', 'data', 'voice'] as const) {
    const n = result[tier].nets.find((x) => x.key === key)
    if (n) return n
  }
  return null
}

export type { CapabilityMeta }
