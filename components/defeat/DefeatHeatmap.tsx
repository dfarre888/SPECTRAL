'use client'

import { useMemo, useState } from 'react'
import {
  getSamSystemGroup,
  isSamSystemId,
  type SamSystemGroup,
} from '@/lib/defeat/sam-matrix-bridge'
import type { DefeatTypeFilter } from '@/lib/defeat/defeat-types'
import { resolveCellValue } from '@/lib/defeat/cell-value'
import { resolveSamKineticPct } from '@/lib/defeat/resolve-sam-pk'
import type {
  AccreditedDefeatPkRow,
  AntiDroneSystem,
  DefeatEffectiveness,
  Platform,
} from '@/lib/types'
import { cn } from '@/lib/utils'
import { matchesCategoryPill, type CategoryPill } from '@/lib/platforms/constants'
import {
  THREAT_CLASSES,
  aggregateCell,
  coveragePct,
  describeCell,
  heatColor,
  heatTextColor,
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
}

function sortSystems(systems: AntiDroneSystem[]): AntiDroneSystem[] {
  return [...systems].sort((a, b) => {
    const aSa = a.id.startsWith('sa-')
    const bSa = b.id.startsWith('sa-')
    if (aSa && !bSa) return -1
    if (!aSa && bSa) return 1
    return a.name.localeCompare(b.name)
  })
}

function confidenceDot(confidence: string | undefined): string {
  if (confidence === 'high') return '#06B6D4'
  if (confidence === 'estimated') return '#EAB308'
  return '#6b7280'
}

const GROUP_PILLS: { id: SystemGroupFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'manpads', label: 'MANPADS' },
  { id: 'short_range', label: 'Short' },
  { id: 'medium', label: 'Medium' },
  { id: 'long_range', label: 'Long' },
  { id: 'legacy', label: 'Legacy' },
  { id: 'other', label: 'Other' },
]


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
  defeatTypeFilter,
  onCellSelect,
  accreditedPkMap,
  computedSamPkMap,
  samOnly = false,
}: DefeatHeatmapProps) {
  const [effectMode, setEffectMode] = useState<EffectMode>('kinetic')
  const [systemGroup, setSystemGroup] = useState<SystemGroupFilter>('all')
  const [samOnlyFilter, setSamOnlyFilter] = useState(Boolean(samOnly))

  const filteredSystems = useMemo(() => {
    let list = systems
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

  if (platforms.length === 0 || filteredSystems.length === 0) {
    return (
      <div className="store-panel rounded-2xl p-12 text-center">
        <p className="store-text-body text-sm">No data matches current filters.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(['kinetic', 'rf_jamming', 'dew', 'swarm'] as EffectMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setEffectMode(mode)}
            className={cn(
              'rounded-full px-3 py-1 text-[10px] font-mono uppercase border',
              effectMode === mode
                ? 'bg-[#F97316] border-[#F97316] text-white'
                : 'border-white/10 text-slate-400',
            )}
          >
            {mode.replace(/_/g, ' ')}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 items-center">
      <button
            type="button"
            onClick={() => setSamOnlyFilter((v) => !v)}
            className={cn(
              'rounded-full px-3 py-1 text-[10px] font-mono border',
              samOnlyFilter
                ? 'bg-cyan/20 border-cyan text-cyan'
                : 'border-white/10 text-slate-400',
            )}
          >
            SAM only
          </button>
        {GROUP_PILLS.map((pill) => (
          <button
            key={pill.id}
            type="button"
            onClick={() => setSystemGroup(pill.id)}
            className={cn(
              'rounded-full px-3 py-1 text-[10px] font-mono border',
              systemGroup === pill.id
                ? 'bg-[#F97316] border-[#F97316] text-white'
                : 'border-white/10 text-slate-400',
            )}
          >
            {pill.label}
          </button>
        ))}
      </div>

      <div className="overflow-auto max-h-[calc(100vh-260px)] rounded-xl border border-[var(--store-line)]">
        <table className="border-collapse w-full" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: 260 }} />
            {THREAT_CLASSES.map((c) => (
              <col key={c.id} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-40 bg-[#111118] border border-white/5 px-3 py-2 text-left text-[10px] uppercase text-slate-400">
                Effector
              </th>
              {THREAT_CLASSES.map((c) => (
                <th
                  key={c.id}
                  className="sticky top-0 z-30 bg-[#111118] border border-white/5 px-2 py-2 text-center"
                  title={c.label}
                >
                  <span className="block text-[11px] font-semibold text-slate-200 leading-tight">
                    {c.label}
                  </span>
                  <span className="block text-[9px] font-mono text-slate-500">
                    {classCounts[c.id] ?? 0} platforms
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredSystems.map((system) => (
              <tr key={system.id}>
                <td className="sticky left-0 z-20 bg-[var(--store-bg)] border border-white/5 px-3 py-2 overflow-hidden">
                  <span className="text-xs text-slate-200 truncate block" title={system.name}>
                    {system.name}
                  </span>
                  <span className="text-[9px] font-mono text-slate-500 truncate block">
                    {system.country}
                  </span>
                </td>
                {THREAT_CLASSES.map((c) => {
                  const cell = cellFor(system, c.id)
                  const cov = coveragePct(cell)
                  return (
                    <td key={c.id} className="border border-white/5 p-0">
                      <button
                        type="button"
                        title={describeCell(cell, system.name, c.label)}
                        onClick={() => {
                          const first = classPlatforms[c.id]?.[0]
                          if (first) onCellSelect(first.id, system.id)
                        }}
                        className="relative w-full min-h-[46px] flex flex-col items-center justify-center font-mono hover:ring-1 hover:ring-orange/40"
                        style={{ background: heatColor(cell.medianPct), color: heatTextColor(cell.medianPct) }}
                      >
                        <span className="text-[13px] font-semibold">
                          {cell.medianPct == null ? '—' : `${cell.medianPct}%`}
                        </span>
                        {/* Coverage bar: how much of the class this median rests on. */}
                        <span className="absolute bottom-0 left-0 h-[2px] bg-current opacity-50" style={{ width: `${cov}%` }} />
                        {cell.immuneCount > 0 && (
                          <span className="absolute top-0.5 right-1 text-[8px] opacity-70">
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
      </div>

      <div className="text-[10px] font-mono text-slate-500 space-y-1">
        <p className="flex flex-wrap gap-3 items-center">
          <span className="text-slate-400">Median Pk</span>
          {[10, 25, 40, 55, 70, 90].map((v) => (
            <span key={v} className="inline-flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: heatColor(v) }} />
              {v < 15 ? '<15' : v >= 75 ? '75+' : `${v}`}%
            </span>
          ))}
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: heatColor(null) }} />
            no data
          </span>
          <span>N✕ = immune in class</span>
        </p>
        <p>
          Each cell is the median across platforms in that class, so one outlier cannot move it.
          Immune platforms are excluded from the median and counted separately — scoring them
          zero would read as a weak effector rather than one that cannot apply. The bar under each
          value shows how much of the class carries an assessment.
        </p>
      </div>
    </div>
  )
}
