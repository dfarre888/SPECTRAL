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

// Pk is data: colour the number, not the box. A 2px hairline under the value
// carries the band so the grid scans as a field, not a wall of tiles.
const COLOUR_CLASSES = {
  red: 'text-[var(--wb-red)] shadow-[inset_0_-2px_0_var(--wb-red)]',
  amber: 'text-[#FBBF24] shadow-[inset_0_-2px_0_#FBBF24]',
  green: 'text-[#4ADE80] shadow-[inset_0_-2px_0_#4ADE80]',
} as const

interface MatrixCellProps {
  platform: Platform
  system: AntiDroneSystem
  row: DefeatEffectiveness | undefined
  defeatTypeFilter: DefeatTypeFilter
  onSelect: (platformId: string, systemId: string) => void
  accreditedPkMap?: Record<string, AccreditedDefeatPkRow>
  computedSamPkMap?: Record<string, number>
  focused?: boolean
  isFocused?: boolean
  tabIndex?: number
  cellRef?: (el: HTMLButtonElement | null) => void
  onFocus?: () => void
}

export function MatrixCell({
  platform,
  system,
  row,
  defeatTypeFilter,
  onSelect,
  accreditedPkMap,
  computedSamPkMap,
  focused = false,
  isFocused = false,
  tabIndex = -1,
  cellRef,
  onFocus,
}: MatrixCellProps) {
  const isActive = focused || isFocused
  const session = readLaydownSession()
  const laydownPair = findSessionPair(session, platform.id, system.id)
  const computedSamPk = computedSamPkMap?.[`${platform.id}:${system.id}`]
  const value = resolveCellValue(platform, system, row, defeatTypeFilter, laydownPair, computedSamPk)
  const accKey = `${platform.id}:${system.id}`
  const accRow = accreditedPkMap?.[accKey]

  return (
    <td className="border-b border-r border-[var(--store-line)] p-0 min-w-[88px]">
      <button
        ref={cellRef}
        type="button"
        tabIndex={tabIndex}
        onFocus={onFocus}
        aria-selected={isActive}
        onClick={() => onSelect(platform.id, system.id)}
        aria-label={`${platform.name} vs ${system.name}`}
        className={cn(
          'w-full h-full min-h-[44px] flex items-center justify-center transition-colors duration-150 cursor-pointer hover:bg-[var(--store-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wb-blue)]',
          isActive && 'bg-[rgba(41,151,255,0.10)] ring-1 ring-[var(--wb-blue)] z-10 relative',
          value.kind === 'immune' && 'shadow-[inset_0_-2px_0_var(--wb-red)]',
          value.kind === 'pct' && value.colour !== 'none' && value.colour !== 'immune' && COLOUR_CLASSES[value.colour],
          value.kind === 'empty' && 'store-text-muted'
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
      <span className="font-mono text-[11px] font-medium tracking-[0.02em] text-[var(--wb-red)]">IMMUNE</span>
    )
  }
  if (value.kind === 'immune') return <ImmuneBadge />
  if (value.kind === 'empty') {
    return <span className="font-mono text-[13px] store-text-muted">—</span>
  }
  const colour = value.colour
  const accPk = accRow ? accreditedPkForSystem(accRow, system) : null
  if (accPk != null) {
    return (
      <div className="flex flex-col items-center gap-0.5 px-1">
        <span className="font-mono text-[13px] text-[var(--store-ink)] tabular-nums">
          {accPk}%<sup className="text-[11px] ml-0.5 text-[var(--wb-blue)]">A</sup>
        </span>
      </div>
    )
  }
  if (colour === 'red' || colour === 'amber' || colour === 'green') {
    return (
      <div className="flex flex-col items-center gap-0.5 px-1">
        <span className={cn('font-mono text-[13px] tabular-nums', COLOUR_CLASSES[colour].split(' ')[0])}>
          {value.value}%
        </span>
        {value.laydown?.operationsPk != null && (
          <span className="text-[11px] font-mono text-cyan leading-none">
            Ops {value.laydown.operationsPk}% · {value.laydown.los_state}
          </span>
        )}
      </div>
    )
  }
  return <span className="font-mono text-[13px] tabular-nums">{value.value}%</span>
}
