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

      <div className="overflow-auto max-h-[calc(100vh-200px)] rounded-xl border border-[var(--store-line)]">
        <table className="border-collapse w-max min-w-full">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-40 bg-[#111118] border border-white/5 px-3 py-2 min-w-[180px] text-left text-[10px] uppercase text-slate-400">
                System
              </th>
              {platforms.map((platform) => (
                <th
                  key={platform.id}
                  className="sticky top-0 z-30 bg-[#111118] border border-white/5 px-1 py-2 min-w-[52px]"
                >
                  <span
                    className="block text-[10px] font-mono text-slate-300 whitespace-nowrap"
                    style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                  >
                    {platform.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredSystems.map((system) => (
              <tr key={system.id}>
                <td className="sticky left-0 z-20 bg-[var(--store-bg)] border border-white/5 px-3 py-2 max-w-[180px]">
                  <span className="text-xs text-slate-200 truncate block">{system.name}</span>
                </td>
                {platforms.map((platform) => {
                  const row = cellMap.get(`${platform.id}:${system.id}`)
                  const { immune, pct } = resolveHeatmapCell(
                    platform,
                    system,
                    row,
                    effectMode,
                    computedSamPkMap,
                  )
                  const displayPct = pct ?? 0
                  const bg = pkColor(displayPct, immune)
                  const fg = immune ? '#94a3b8' : pkTextColor(displayPct)
                  return (
                    <td key={platform.id} className="border border-white/5 p-0 min-w-[52px]">
                      <button
                        type="button"
                        title={
                          row
                            ? `${system.name} vs ${platform.name}: ${immune ? 'immune' : `${displayPct}%`}. Confidence: ${row.data_confidence}`
                            : `${system.name} vs ${platform.name}`
                        }
                        onClick={() => onCellSelect(platform.id, system.id)}
                        className="relative w-full min-h-[44px] flex items-center justify-center font-mono text-[11px] hover:ring-1 hover:ring-orange/40"
                        style={{ background: bg, color: fg }}
                      >
                        {row && (
                          <span
                            className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full"
                            style={{ background: confidenceDot(row.data_confidence) }}
                          />
                        )}
                        {immune ? '✕' : pct == null ? '—' : `${displayPct}%`}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] font-mono text-slate-500 flex flex-wrap gap-3">
        <span>■ 0%</span>
        <span>■ 1–14%</span>
        <span>■ 15–29%</span>
        <span>■ 30–49%</span>
        <span>■ 50–69%</span>
        <span>■ 70%+</span>
        <span>✕ Immune</span>
        <span className="text-cyan">● High</span>
        <span className="text-amber">● Estimated</span>
        <span>● Medium</span>
      </p>
    </div>
  )
}
