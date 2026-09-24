'use client'

import { useMemo, useState, type CSSProperties } from 'react'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { useDockScroll } from '@/components/defeat/useDockScroll'
import {
  getSamSystemGroup,
  isSamSystemId,
  type SamSystemGroup,
} from '@/lib/defeat/sam-matrix-bridge'
import { isDetectOnly, type DefeatTypeFilter } from '@/lib/defeat/defeat-types'
import { getCellColour, resolveCellValue } from '@/lib/defeat/cell-value'
import { resolveSamKineticPct } from '@/lib/defeat/resolve-sam-pk'
import type {
  AccreditedDefeatPkRow,
  AntiDroneSystem,
  DefeatEffectiveness,
  Platform,
} from '@/lib/types'
import { matchesCategoryPill, type CategoryPill } from '@/lib/platforms/constants'
import {
  THREAT_CLASSES,
  aggregateCell,
  coveragePct,
  describeCell,
  type HeatSample,
} from '@/lib/defeat/heatmap-aggregate'

export function pkColor(pct: number, isImmune: boolean): string {
  if (isImmune) return '#1a1a2e'
  if (pct === 0) return '#0f0f1a'
  if (pct < 15) return '#052e16'
  if (pct < 30) return '#14532d'
  if (pct < 50) return '#854d0e'
  if (pct < 70) return '#c2410c'
  return '#991b1b'
}

export function pkTextColor(pct: number): string {
  return pct >= 30 ? '#fef3c7' : '#6ee7b7'
}

type EffectMode = 'kinetic' | 'rf_jamming' | 'dew' | 'swarm'
type SystemGroupFilter = 'all' | SamSystemGroup

interface DefeatHeatmapProps {
  platforms: Platform[]
  systems: AntiDroneSystem[]
  effectiveness: DefeatEffectiveness[]
  defeatTypeFilter: DefeatTypeFilter
  onCellSelect: (platformId: string, systemId: string) => void
  accreditedPkMap?: Record<string, AccreditedDefeatPkRow>
  computedSamPkMap?: Record<string, number>
  samOnly?: boolean
  /** CSS height of the whole frame. Defaults to the docked-viewport height. */
  height?: string
  /** Hand wheel input to the page until the frame is docked. */
  dockScroll?: boolean
}

const HEATMAP_FRAME_HEIGHT = 'max(440px, calc(100vh - 216px))'

const HEAT_EXPLAINER =
  'Each tile is the median across the platforms in that class, so one outlier cannot move it. ' +
  'Immune platforms are left out of the median and counted separately: scoring them zero would ' +
  'read as a weak effector rather than one that cannot apply.'
const EFFECTOR_COL_PX = 300

function sortSystems(systems: AntiDroneSystem[]): AntiDroneSystem[] {
  return [...systems].sort((a, b) => {
    const aSa = a.id.startsWith('sa-')
    const bSa = b.id.startsWith('sa-')
    if (aSa && !bSa) return -1
    if (!aSa && bSa) return 1
    return a.name.localeCompare(b.name)
  })
}

const EFFECT_MODES: { id: EffectMode; label: string }[] = [
  { id: 'kinetic', label: 'Kinetic' },
  { id: 'rf_jamming', label: 'RF jamming' },
  { id: 'dew', label: 'DEW' },
  { id: 'swarm', label: 'Swarm' },
]

const GROUP_PILLS: { id: SystemGroupFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'manpads', label: 'MANPADS' },
  { id: 'short_range', label: 'Short' },
  { id: 'medium', label: 'Medium' },
  { id: 'long_range', label: 'Long' },
  { id: 'legacy', label: 'Legacy' },
  { id: 'other', label: 'Other' },
]

/**
 * Tile colour for a median Pk. Same bands and meaning as the table view
 * (lib/defeat/cell-value getCellColour): high Pk is green, low is red, so a
 * colour never means the opposite thing when you switch views. Within the
 * outer bands the tint deepens toward the extreme. No data is a flat neutral:
 * absence of an assessment must not look like a low score.
 */
function heatTile(medianPct: number | null): { bg: string; line: string; ink: string } {
  if (medianPct == null) {
    return { bg: 'rgba(255,255,255,0.025)', line: 'rgba(255,255,255,0.05)', ink: 'rgba(255,255,255,0.24)' }
  }
  const band = getCellColour(medianPct)
  if (band === 'green') {
    const a = 0.1 + (Math.min(100, medianPct) - 70) / 30 * 0.16
    return { bg: `rgba(74,222,128,${a.toFixed(3)})`, line: 'rgba(74,222,128,0.22)', ink: '#86EFAC' }
  }
  if (band === 'red') {
    const a = 0.1 + (30 - Math.max(0, medianPct)) / 30 * 0.16
    return { bg: `rgba(255,92,110,${a.toFixed(3)})`, line: 'rgba(255,92,110,0.24)', ink: '#FF9AA6' }
  }
  return { bg: 'rgba(251,191,36,0.12)', line: 'rgba(251,191,36,0.22)', ink: '#FCD34D' }
}

function effectModeToFilter(mode: EffectMode): DefeatTypeFilter {
  if (mode === 'kinetic') return 'Kinetic'
  if (mode === 'rf_jamming') return 'RF'
  if (mode === 'dew') return 'DEW'
  return 'all'
}

function resolveHeatmapCell(
  platform: Platform,
  system: AntiDroneSystem,
  row: DefeatEffectiveness | undefined,
  effectMode: EffectMode,
  computedSamPkMap?: Record<string, number>,
): { immune: boolean; pct: number | null } {
  if (effectMode === 'swarm') {
    return { immune: row?.is_immune ?? false, pct: row?.swarm_engagement_pct ?? null }
  }

  const key = `${platform.id}:${system.id}`
  let computedSamPk: number | null | undefined = computedSamPkMap?.[key]
  if (effectMode === 'kinetic' && computedSamPk == null) {
    computedSamPk = resolveSamKineticPct(system.id, platform.id, row?.kinetic_pct ?? null)
  }

  const cell = resolveCellValue(
    platform,
    system,
    row,
    effectModeToFilter(effectMode),
    null,
    computedSamPk,
  )

  if (cell.kind === 'immune') return { immune: true, pct: null }
  if (cell.kind === 'pct') return { immune: false, pct: cell.value }
  return { immune: false, pct: null }
}

export function DefeatHeatmap({
  platforms,
  systems,
  effectiveness,
  onCellSelect,
  computedSamPkMap,
  samOnly = false,
  height = HEATMAP_FRAME_HEIGHT,
  dockScroll = false,
}: DefeatHeatmapProps) {
  const [effectMode, setEffectMode] = useState<EffectMode>('kinetic')
  const [systemGroup, setSystemGroup] = useState<SystemGroupFilter>('all')
  const [samOnlyFilter, setSamOnlyFilter] = useState(Boolean(samOnly))
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)

  useDockScroll(scrollEl, dockScroll)

  const filteredSystems = useMemo(() => {
    // Sensors have no Pk, so they have no row on a Pk heat map.
    let list = systems.filter((s) => !isDetectOnly(s))
    if (samOnlyFilter) list = list.filter((s) => isSamSystemId(s.id))
    if (systemGroup !== 'all') {
      list = list.filter((s) => getSamSystemGroup(s.id) === systemGroup)
    }
    return sortSystems(list)
  }, [systems, samOnlyFilter, systemGroup])

  const cellMap = useMemo(() => {
    const map = new Map<string, DefeatEffectiveness>()
    for (const row of effectiveness) {
      map.set(`${row.platform_id}:${row.defeat_system_id}`, row)
    }
    return map
  }, [effectiveness])

  // Bucket platforms into threat classes once. 'other' catches anything the
  // named pills do not claim, so no platform is silently dropped from the grid.
  const classPlatforms = useMemo(() => {
    const buckets: Record<string, Platform[]> = {}
    for (const c of THREAT_CLASSES) buckets[c.id] = []
    for (const p of platforms) {
      const hit = THREAT_CLASSES.find(
        (c) => c.id !== 'other' && matchesCategoryPill(p.category, c.id as CategoryPill),
      )
      buckets[hit ? hit.id : 'other'].push(p)
    }
    return buckets
  }, [platforms])

  const classCounts = useMemo(() => {
    const out: Record<string, number> = {}
    for (const [k, v] of Object.entries(classPlatforms)) out[k] = v.length
    return out
  }, [classPlatforms])

  const cellFor = useMemo(() => {
    return (system: AntiDroneSystem, classId: string) => {
      const members = classPlatforms[classId] ?? []
      const samples: HeatSample[] = members.map((p) => {
        const row = cellMap.get(`${p.id}:${system.id}`)
        const { immune, pct } = resolveHeatmapCell(p, system, row, effectMode, computedSamPkMap)
        return { pct, immune, confidence: row?.data_confidence }
      })
      return aggregateCell(system.id, classId, samples)
    }
  }, [classPlatforms, cellMap, effectMode, computedSamPkMap])

  const controls = (
    <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-[rgba(255,255,255,0.08)] px-4 py-3">
      <div className="seg sm" role="group" aria-label="Effect">
        {EFFECT_MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            aria-pressed={effectMode === mode.id}
            onClick={() => setEffectMode(mode.id)}
          >
            {mode.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        aria-pressed={samOnlyFilter}
        onClick={() => setSamOnlyFilter((v) => !v)}
        className="btn-e sm"
      >
        SAM only
      </button>
      <div className="flex items-center gap-2">
        <span className="text-[12px] store-text-muted">SAM class</span>
        <div className="seg sm" role="group" aria-label="SAM class">
          {GROUP_PILLS.map((pill) => (
            <button
              key={pill.id}
              type="button"
              aria-pressed={systemGroup === pill.id}
              onClick={() => setSystemGroup(pill.id)}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  if (platforms.length === 0 || filteredSystems.length === 0) {
    return (
      <div className="dt-frame flex flex-col" style={{ minHeight: 280 }}>
        {controls}
        <div className="grid flex-1 place-items-center p-12 text-center">
          <p className="text-[13px] store-text-body">No effectors match these filters.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dt-frame flex flex-col" style={{ height }}>
      {controls}
      <ScrollArea
        frame={false}
        height="100%"
        className="flex-1 min-h-0 [&>.edge-fade.l]:left-[var(--pin-w)]"
        style={{ '--pin-w': `${EFFECTOR_COL_PX}px` } as CSSProperties}
        scrollRef={(el) => {
          if (el) setScrollEl((prev) => (prev === el ? prev : el))
        }}
      >
        <table
          className="dt"
          style={{ tableLayout: 'fixed', minWidth: EFFECTOR_COL_PX + THREAT_CLASSES.length * 96 }}
          aria-label="Defeat heat map, effector by threat class, median Pk"
        >
          <colgroup>
            <col style={{ width: EFFECTOR_COL_PX }} />
            {THREAT_CLASSES.map((c) => (
              <col key={c.id} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="stick !align-bottom">
                <span className="flex items-end justify-between gap-3">
                  <span>Effector</span>
                  <span className="text-[11.5px] font-normal store-text-muted">Origin</span>
                </span>
              </th>
              {THREAT_CLASSES.map((c) => (
                <th
                  key={c.id}
                  scope="col"
                  className="!whitespace-normal !px-2 !align-bottom text-center"
                  title={`${c.label}: ${classCounts[c.id] ?? 0} platforms`}
                >
                  <span className="block leading-[15px]">{c.label}</span>
                  <span className="mt-[3px] block text-[11px] font-normal store-text-muted">
                    <span className="font-mono tabular-nums">{classCounts[c.id] ?? 0}</span> platforms
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredSystems.map((system) => (
              <tr key={system.id}>
                <td className="stick !py-0">
                  <span className="flex h-10 items-center gap-3">
                    <span className="primary min-w-0 flex-1 truncate text-[13px]" title={system.name}>
                      {system.name}
                    </span>
                    {system.country ? (
                      <span
                        className="max-w-[96px] shrink-0 truncate text-right text-[11.5px] store-text-muted"
                        title={system.country}
                      >
                        {system.country}
                      </span>
                    ) : null}
                  </span>
                </td>
                {THREAT_CLASSES.map((c) => {
                  const cell = cellFor(system, c.id)
                  const cov = coveragePct(cell)
                  const tile = heatTile(cell.medianPct)
                  const label = describeCell(cell, system.name, c.label)
                  return (
                    <td key={c.id} className="!px-[3px] !py-[3px]">
                      <button
                        type="button"
                        title={label}
                        aria-label={label}
                        onClick={() => {
                          const first = classPlatforms[c.id]?.[0]
                          if (first) onCellSelect(first.id, system.id)
                        }}
                        className="relative flex h-[34px] w-full items-center justify-center overflow-hidden rounded-[7px] font-mono text-[13px] font-medium tabular-nums transition-[filter] duration-150 hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wb-blue)]"
                        style={{ background: tile.bg, color: tile.ink, boxShadow: `inset 0 0 0 1px ${tile.line}` }}
                      >
                        {cell.medianPct == null ? '–' : `${cell.medianPct}%`}
                        {/* Coverage: how much of the class this median rests on. */}
                        {cell.medianPct != null ? (
                          <span
                            aria-hidden
                            className="absolute bottom-[3px] left-[6px] h-[2px] rounded-full bg-current opacity-40"
                            style={{ width: `calc((100% - 12px) * ${cov / 100})` }}
                          />
                        ) : null}
                        {cell.immuneCount > 0 && (
                          <span className="absolute right-[6px] top-[3px] text-[11px] font-normal leading-none text-[var(--wb-red)]">
                            {cell.immuneCount}✕
                          </span>
                        )}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>

      <div className="shrink-0 space-y-1 border-t border-[rgba(255,255,255,0.08)] px-4 py-2.5 text-[11.5px] store-text-muted">
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span title={HEAT_EXPLAINER}>Median Pk</span>
          {[
            { v: 85, label: '>70%' },
            { v: 50, label: '31 to 70%' },
            { v: 15, label: '≤30%' },
            { v: null, label: 'No data' },
          ].map(({ v, label }) => {
            const t = heatTile(v)
            return (
              <span key={label} className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block h-3 w-5 rounded-[3px]"
                  style={{ background: t.bg, boxShadow: `inset 0 0 0 1px ${t.line}` }}
                />
                <span className={v == null ? undefined : 'font-mono'}>{label}</span>
              </span>
            )
          })}
          <span><span className="text-[var(--wb-red)]">N✕</span> immune in class</span>
          <span>Bar: share of the class assessed</span>
        </p>
        {/* On short screens the explainer yields its line to the grid; it stays on the key's tooltip. */}
        <p className="max-w-[110ch] [@media(max-height:820px)]:hidden">{HEAT_EXPLAINER}</p>
      </div>
    </div>
  )
}
