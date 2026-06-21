'use client'

import { resolveCellValue, type CellValue } from '@/lib/defeat/cell-value'
import { findSessionPair, readLaydownSession } from '@/lib/map/laydown-session'
import type { DefeatTypeFilter } from '@/lib/defeat/defeat-types'
import { getPrimaryDefeatType } from '@/lib/defeat/defeat-types'
import type {
  AccreditedDefeatPkRow,
  AntiDroneSystem,
  DefeatEffectiveness,
  Platform,
} from '@/lib/types'
import { cn } from '@/lib/utils'
import { ImmuneBadge } from '@/components/defeat/ImmuneBadge'

const COLOUR_CLASSES = {
  red: 'text-red bg-red/15',
  amber: 'text-amber bg-amber/15',
  green: 'text-[#22C55E] bg-[#22C55E]/15',
} as const

interface MatrixCellProps {
  platform: Platform
  system: AntiDroneSystem
  row: DefeatEffectiveness | undefined
  defeatTypeFilter: DefeatTypeFilter
  onSelect: (platformId: string, systemId: string) => void
  accreditedPkMap?: Record<string, AccreditedDefeatPkRow>
  computedSamPkMap?: Record<string, number>
}

export function MatrixCell({
  platform,
  system,
  row,
  defeatTypeFilter,
  onSelect,
  accreditedPkMap,
  computedSamPkMap,
}: MatrixCellProps) {
  const session = readLaydownSession()
  const laydownPair = findSessionPair(session, platform.id, system.id)
  const computedSamPk = computedSamPkMap?.[`${platform.id}:${system.id}`]
  const value = resolveCellValue(platform, system, row, defeatTypeFilter, laydownPair, computedSamPk)
  const accKey = `${platform.id}:${system.id}`
  const accRow = accreditedPkMap?.[accKey]

  return (
    <td className="border border-[var(--store-line)] p-0 min-w-[88px]">
      <button
        type="button"
        onClick={() => onSelect(platform.id, system.id)}
        className={cn(
          'w-full h-full min-h-[52px] flex items-center justify-center transition-all cursor-pointer hover:ring-1 hover:ring-orange/50',
          value.kind === 'immune' && 'border-2 border-red bg-red/5',
          value.kind === 'pct' && value.colour !== 'none' && value.colour !== 'immune' && COLOUR_CLASSES[value.colour],
          value.kind === 'empty' && 'store-text-muted bg-[var(--store-surface-2)]/50'
        )}
      >
        <CellContent value={value} accRow={accRow} system={system} />
      </button>
    </td>
  )
}

function accreditedPkForSystem(row: AccreditedDefeatPkRow, system: AntiDroneSystem): number | null {
  const primary = getPrimaryDefeatType(system)
  if (primary === 'RF') return row.pk_rf_jamming_pct
  if (primary === 'DEW') return row.pk_dew_pct
  return row.pk_kinetic_pct
}

function CellContent({ value, accRow, system }: { value: CellValue; accRow?: AccreditedDefeatPkRow; system: AntiDroneSystem }) {
  if (accRow?.is_immune) {
    return (
      <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-orange">IMMUNE</span>
    )
  }
  if (value.kind === 'immune') return <ImmuneBadge />
  if (value.kind === 'empty') {
    return <span className="font-mono text-sm store-text-muted">—</span>
  }
  const colour = value.colour
  const accPk = accRow ? accreditedPkForSystem(accRow, system) : null
  if (accPk != null) {
    return (
      <div className="flex flex-col items-center gap-0.5 px-1">
        <span className="font-mono text-sm font-medium text-[#F97316]">
          {accPk}%<sup className="text-[10px] ml-0.5">A</sup>
        </span>
      </div>
    )
  }
  if (colour === 'red' || colour === 'amber' || colour === 'green') {
    return (
      <div className="flex flex-col items-center gap-0.5 px-1">
        <span className={cn('font-mono text-sm font-medium', COLOUR_CLASSES[colour].split(' ')[0])}>
          {value.value}%
        </span>
        {value.laydown?.operationsPk != null && (
          <span className="text-[9px] font-mono text-cyan leading-none">
            Ops {value.laydown.operationsPk}% · {value.laydown.los_state}
          </span>
        )}
      </div>
    )
  }
  return <span className="font-mono text-sm">{value.value}%</span>
}
