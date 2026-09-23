'use client'

import { getCellColour, resolveCellValue, type CellValue } from '@/lib/defeat/cell-value'
import {
  findSessionPair,
  readLaydownSession,
  type LaydownSession,
} from '@/lib/map/laydown-session'
import type { DefeatTypeFilter } from '@/lib/defeat/defeat-types'
import { getPrimaryDefeatType } from '@/lib/defeat/defeat-types'
import type {
  AccreditedDefeatPkRow,
  AntiDroneSystem,
  DefeatEffectiveness,
  Platform,
} from '@/lib/types'
import { cn } from '@/lib/utils'

// Pk is data: colour the number, never the box and never a stripe under it.
// Bands match lib/defeat/cell-value getCellColour (<=30 red, <=70 amber, >70 green).
export const BAND_TEXT = {
  red: 'text-[var(--wb-red)]',
  amber: 'text-[#FBBF24]',
  green: 'text-[#4ADE80]',
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
  /** Fixed width so virtualised rows keep the same columns as the header. */
  widthPx?: number
  /** Zero-based effector column, for aria-colindex (the platform column is 1). */
  colIndex?: number
  /**
   * Map Intel laydown session, read once by the grid. When omitted the cell
   * reads it itself (one sessionStorage parse per cell).
   */
  laydownSession?: LaydownSession | null
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
  widthPx,
  colIndex,
  laydownSession,
}: MatrixCellProps) {
  const isActive = focused || isFocused
  const session = laydownSession !== undefined ? laydownSession : readLaydownSession()
  const laydownPair = findSessionPair(session, platform.id, system.id)
  const computedSamPk = computedSamPkMap?.[`${platform.id}:${system.id}`]
  const value = resolveCellValue(platform, system, row, defeatTypeFilter, laydownPair, computedSamPk)
  const accRow = accreditedPkMap?.[`${platform.id}:${system.id}`]
  const summary = describeCell(value, accRow, system, row)

  return (
    <td
      role="gridcell"
      aria-colindex={colIndex != null ? colIndex + 2 : undefined}
      aria-selected={isActive}
      style={{ width: widthPx, flex: 'none', display: 'block' }}
      className="!p-0"
    >
      <button
        ref={cellRef}
        type="button"
        tabIndex={tabIndex}
        onFocus={onFocus}
        onClick={() => onSelect(platform.id, system.id)}
        aria-label={`${platform.name} vs ${system.name}: ${summary}`}
        title={`${platform.name} vs ${system.name}: ${summary}`}
        className={cn(
          'relative flex h-full w-full flex-col items-center justify-center gap-[3px] cursor-pointer focus-visible:outline-none',
          'transition-colors duration-150 hover:bg-[rgba(255,255,255,0.07)]',
          'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--wb-blue)]',
          isActive && 'bg-[rgba(41,151,255,0.16)] ring-1 ring-inset ring-[rgba(41,151,255,0.85)]',
        )}
      >
        <CellContent value={value} accRow={accRow} system={system} estimate={!row} />
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

/** Plain-language value for the tooltip and screen readers. */
function describeCell(
  value: CellValue,
  accRow: AccreditedDefeatPkRow | undefined,
  system: AntiDroneSystem,
  row: DefeatEffectiveness | undefined,
): string {
  if (accRow?.is_immune) return 'immune'
  if (value.kind === 'immune') return value.reason ? `immune (${value.reason})` : 'immune'
  if (value.kind === 'empty') return 'no finding'
  const accPk = accRow ? accreditedPkForSystem(accRow, system) : null
  if (accPk != null) return `Pk ${accPk}%, accredited`
  return row ? `Pk ${value.value}%` : `Pk ${value.value}%, estimate (no pair-specific finding)`
}

function CellContent({
  value,
  accRow,
  system,
  estimate,
}: {
  value: CellValue
  accRow?: AccreditedDefeatPkRow
  system: AntiDroneSystem
  estimate: boolean
}) {
  if (accRow?.is_immune || value.kind === 'immune') {
    return <span className="font-sans text-[11.5px] font-medium text-[var(--wb-red)]">Immune</span>
  }
  if (value.kind === 'empty') {
    return <span className="font-mono text-[13px] text-[rgba(255,255,255,0.2)]" aria-hidden>–</span>
  }
  const accPk = accRow ? accreditedPkForSystem(accRow, system) : null
  if (accPk != null) {
    return (
      <span className={cn('font-mono text-[13px] font-medium tabular-nums leading-none', BAND_TEXT[getCellColour(accPk)])}>
        {accPk}%
        <span className="ml-[2px] align-[3px] font-sans text-[11px] font-semibold text-[var(--wb-blue)]">A</span>
      </span>
    )
  }
  const colour = value.colour
  const band = colour === 'red' || colour === 'amber' || colour === 'green' ? BAND_TEXT[colour] : 'text-[var(--store-ink-soft)]'
  return (
    <>
      <span
        className={cn(
          'font-mono text-[13px] tabular-nums leading-none',
          band,
          // No pair-specific finding: the value is a model or catalogue
          // estimate, so it steps back and the adjudicated findings lead.
          estimate ? 'opacity-[0.62]' : 'font-medium',
        )}
      >
        {value.value}%
      </span>
      {value.laydown?.operationsPk != null && (
        <span
          className="font-mono text-[11px] leading-none text-cyan"
          title={`Map Intel laydown: ${value.laydown.los_state}`}
        >
          Ops {value.laydown.operationsPk}%
        </span>
      )}
    </>
  )
}
