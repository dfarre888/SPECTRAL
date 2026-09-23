'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { defaultRangeExtractor, useVirtualizer, type Range } from '@tanstack/react-virtual'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { BAND_TEXT, MatrixCell } from '@/components/defeat/MatrixCell'
import { useDockScroll } from '@/components/defeat/useDockScroll'
import { getPrimaryDefeatType, type DefeatTypeFilter } from '@/lib/defeat/defeat-types'
import { readLaydownSession } from '@/lib/map/laydown-session'
import { cn } from '@/lib/utils'
import type {
  AccreditedDefeatPkRow,
  AntiDroneSystem,
  DefeatEffectiveness,
  Platform,
} from '@/lib/types'

interface DefeatMatrixTableProps {
  platforms: Platform[]
  systems: AntiDroneSystem[]
  effectiveness: DefeatEffectiveness[]
  defeatTypeFilter: DefeatTypeFilter
  onCellSelect: (platformId: string, systemId: string) => void
  accreditedPkMap?: Record<string, AccreditedDefeatPkRow>
  computedSamPkMap?: Record<string, number>
  variant?: 'default' | 'fullscreen'
  focusRow?: number
  focusCol?: number
  onFocusChange?: (row: number, col: number) => void
  /** CSS height of the whole frame (grid plus key). Defaults to docked-viewport height. */
  height?: string
  /** Hand wheel input to the page until the matrix is docked (see useDockScroll). */
  dockScroll?: boolean
}

const ROW_PX = 40
const HEADER_PX = 64
const COL_PX = 88

/**
 * Frame height on the page. Once the page has scrolled to its end the toolbar
 * sits under the top bar and this frame fills the rest of the viewport:
 * 100vh less the banner and shell inset (40), the top bar (64), the toolbar
 * (48) and the page's bottom padding (64).
 */
export const MATRIX_FRAME_HEIGHT = 'max(440px, calc(100vh - 216px))'

// Rows render from an even index so the .dt nth-child striping always matches
// the data row and does not flip as the virtual window slides.
function evenStartRange(range: Range): number[] {
  const out = defaultRangeExtractor(range)
  if (out.length > 0 && out[0] % 2 === 1) out.unshift(out[0] - 1)
  return out
}

function typeLabel(system: AntiDroneSystem, filter: DefeatTypeFilter): string {
  // The number in a column is the Pk for this defeat type.
  return filter !== 'all' ? filter : getPrimaryDefeatType(system)
}

export function DefeatMatrixTable({
  platforms,
  systems,
  effectiveness,
  defeatTypeFilter,
  onCellSelect,
  accreditedPkMap,
  computedSamPkMap,
  variant = 'default',
  focusRow = 0,
  focusCol = 0,
  onFocusChange,
  height = MATRIX_FRAME_HEIGHT,
  dockScroll = false,
}: DefeatMatrixTableProps) {
  // Rows and header cells are flex rows of exact px widths (not minimums), so
  // every virtualised row lines up with the header column for column.
  const platformColPx = variant === 'fullscreen' ? 340 : 300
  const totalWidth = platformColPx + systems.length * COL_PX

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)
  const cellRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const pendingFocus = useRef(false)
  // The active-cell ring and row highlight appear once the grid is in use,
  // not on first paint.
  const [engaged, setEngaged] = useState(false)

  useDockScroll(scrollEl, dockScroll)

  // One lookup table instead of a linear scan per cell.
  const effectivenessByPair = useMemo(() => {
    const map = new Map<string, DefeatEffectiveness>()
    for (const e of effectiveness) map.set(`${e.platform_id}:${e.defeat_system_id}`, e)
    return map
  }, [effectiveness])

  // Read the Map Intel laydown session once per render, not once per cell.
  const laydownSession = readLaydownSession()

  const rowVirtualizer = useVirtualizer({
    count: platforms.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_PX,
    overscan: 8,
    scrollMargin: HEADER_PX,
    scrollPaddingStart: HEADER_PX,
    // Keep the active row clear of the bottom scroll-edge fade.
    scrollPaddingEnd: 24,
    rangeExtractor: evenStartRange,
  })

  const colVirtualizer = useVirtualizer({
    horizontal: true,
    count: systems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => COL_PX,
    overscan: 4,
    scrollMargin: platformColPx,
    scrollPaddingStart: platformColPx,
    scrollPaddingEnd: 24,
  })

  const clampFocus = useCallback(
    (row: number, col: number) => ({
      row: Math.max(0, Math.min(platforms.length - 1, row)),
      col: Math.max(0, Math.min(systems.length - 1, col)),
    }),
    [platforms.length, systems.length],
  )

  // Arrow keys move the active cell; Enter or Space (the cell is a button)
  // opens the rationale, as the key below the grid says.
  const moveFocus = useCallback(
    (row: number, col: number) => {
      if (platforms.length === 0 || systems.length === 0) return
      const next = clampFocus(row, col)
      pendingFocus.current = true
      setEngaged(true)
      onFocusChange?.(next.row, next.col)
      rowVirtualizer.scrollToIndex(next.row, { align: 'auto' })
      colVirtualizer.scrollToIndex(next.col, { align: 'auto' })
    },
    [clampFocus, colVirtualizer, onFocusChange, platforms.length, rowVirtualizer, systems.length],
  )

  // The target cell may not be rendered until the virtualisers catch up with
  // the scroll, so retry for a few frames.
  useEffect(() => {
    if (!pendingFocus.current) return
    let tries = 0
    let raf = 0
    const attempt = () => {
      const el = cellRefs.current.get(`${focusRow}:${focusCol}`)
      if (el) {
        el.focus({ preventScroll: true })
        pendingFocus.current = false
        return
      }
      if (tries++ < 12) raf = requestAnimationFrame(attempt)
    }
    attempt()
    return () => cancelAnimationFrame(raf)
  }, [focusRow, focusCol])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (platforms.length === 0 || systems.length === 0) return
    const page = Math.max(1, Math.floor(((scrollRef.current?.clientHeight ?? 400) - HEADER_PX) / ROW_PX) - 1)
    const deltas: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
      PageUp: [-page, 0],
      PageDown: [page, 0],
      Home: [0, -focusCol],
      End: [0, systems.length - 1 - focusCol],
    }
    const delta = deltas[e.key]
    if (!delta) return
    e.preventDefault()
    moveFocus(focusRow + delta[0], focusCol + delta[1])
  }

  if (platforms.length === 0 || systems.length === 0) {
    return (
      <div className="dt-frame grid place-items-center p-12 text-center" style={{ minHeight: 280 }}>
        <p className="text-[13px] store-text-body">No platforms or effectors match these filters.</p>
      </div>
    )
  }

  const virtualRows = rowVirtualizer.getVirtualItems()
  const virtualCols = colVirtualizer.getVirtualItems()
  const leadPad = virtualCols.length > 0 ? virtualCols[0].start - platformColPx : 0
  const hasAccredited = accreditedPkMap != null && Object.keys(accreditedPkMap).length > 0

  const flexCell = (width: number): CSSProperties => ({ width, flex: 'none' })

  return (
    <div className="dt-frame flex flex-col" style={{ height }}>
      <ScrollArea
        frame={false}
        height="100%"
        className="flex-1 min-h-0 [&>.edge-fade.l]:left-[var(--pin-w)]"
        style={{ '--pin-w': `${platformColPx}px` } as CSSProperties}
        scrollRef={(el) => {
          if (!el) return
          scrollRef.current = el
          setScrollEl((prev) => (prev === el ? prev : el))
        }}
      >
        <table
          className="dt"
          role="grid"
          aria-label="Defeat matrix, platform by effector"
          aria-rowcount={platforms.length + 1}
          aria-colcount={systems.length + 1}
          onKeyDown={handleKeyDown}
          style={{ display: 'block', width: totalWidth }}
        >
          <thead style={{ display: 'block', position: 'sticky', top: 0, zIndex: 6, width: totalWidth }}>
            <tr role="row" aria-rowindex={1} style={{ display: 'flex', height: HEADER_PX }}>
              <th
                role="columnheader"
                aria-colindex={1}
                className="stick !flex items-end justify-between gap-3 !pb-[11px]"
                style={flexCell(platformColPx)}
              >
                <span>Platform</span>
                <span className="font-normal store-text-muted text-[11.5px]">Origin</span>
              </th>
              {leadPad > 0 ? (
                <th aria-hidden role="presentation" className="!p-0" style={flexCell(leadPad)} />
              ) : null}
              {virtualCols.map((vc) => {
                const system = systems[vc.index]
                const type = typeLabel(system, defeatTypeFilter)
                const active = engaged && vc.index === focusCol
                return (
                  <th
                    key={system.id}
                    role="columnheader"
                    aria-colindex={vc.index + 2}
                    title={`${system.name}${system.country ? `, ${system.country}` : ''}. Values are ${type} Pk.`}
                    className="!flex flex-col justify-end !whitespace-normal !px-2.5 !pt-2 !pb-[9px]"
                    style={flexCell(COL_PX)}
                  >
                    <span
                      className={cn(
                        'line-clamp-2 break-words text-[12px] leading-[15px]',
                        active && 'text-[#6CB8FF]',
                      )}
                    >
                      {system.name}
                    </span>
                    <span className="mt-[3px] truncate font-normal text-[11px] leading-[13px] store-text-muted">
                      {type}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody
            style={{
              display: 'block',
              position: 'relative',
              width: totalWidth,
              height: rowVirtualizer.getTotalSize(),
            }}
          >
            {virtualRows.map((virtualRow) => {
              const platform = platforms[virtualRow.index]
              const rowActive = engaged && virtualRow.index === focusRow
              return (
                <tr
                  key={platform.id}
                  role="row"
                  aria-rowindex={virtualRow.index + 2}
                  aria-selected={rowActive ? true : undefined}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    display: 'flex',
                    width: totalWidth,
                    height: ROW_PX,
                    transform: `translateY(${virtualRow.start - HEADER_PX}px)`,
                  }}
                >
                  <td
                    role="rowheader"
                    aria-colindex={1}
                    className="stick !flex items-center gap-3 !py-0"
                    style={flexCell(platformColPx)}
                  >
                    <span className="primary min-w-0 flex-1 truncate text-[13px]" title={platform.name}>
                      {platform.name}
                    </span>
                    {platform.country_of_origin ? (
                      <span
                        className="max-w-[96px] shrink-0 truncate text-right text-[11.5px] store-text-muted"
                        title={platform.country_of_origin}
                      >
                        {platform.country_of_origin}
                      </span>
                    ) : null}
                  </td>
                  {leadPad > 0 ? (
                    <td aria-hidden role="presentation" className="!p-0" style={flexCell(leadPad)} />
                  ) : null}
                  {virtualCols.map((vc) => {
                    const system = systems[vc.index]
                    const colIndex = vc.index
                    const isActive = rowActive && colIndex === focusCol
                    return (
                      <MatrixCell
                        key={system.id}
                        platform={platform}
                        system={system}
                        widthPx={COL_PX}
                        colIndex={colIndex}
                        row={effectivenessByPair.get(`${platform.id}:${system.id}`)}
                        defeatTypeFilter={defeatTypeFilter}
                        onSelect={onCellSelect}
                        accreditedPkMap={accreditedPkMap}
                        computedSamPkMap={computedSamPkMap}
                        laydownSession={laydownSession}
                        isFocused={isActive}
                        tabIndex={virtualRow.index === focusRow && colIndex === focusCol ? 0 : -1}
                        cellRef={(el) => {
                          const key = `${virtualRow.index}:${colIndex}`
                          if (el) cellRefs.current.set(key, el)
                          else cellRefs.current.delete(key)
                        }}
                        onFocus={() => {
                          setEngaged(true)
                          if (virtualRow.index !== focusRow || colIndex !== focusCol) {
                            onFocusChange?.(virtualRow.index, colIndex)
                          }
                        }}
                      />
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </ScrollArea>

      <MatrixKey hasAccredited={hasAccredited} />
    </div>
  )
}

/** The key sits inside the frame so the grid and its legend read as one object. */
function MatrixKey({ hasAccredited }: { hasAccredited: boolean }) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-1 border-t border-[rgba(255,255,255,0.08)] px-4 py-2.5 text-[11.5px] store-text-muted">
      <span className="flex items-center gap-3">
        <span>Pk</span>
        <span className={cn('font-mono', BAND_TEXT.green)}>&gt;70%</span>
        <span className={cn('font-mono', BAND_TEXT.amber)}>31 to 70%</span>
        <span className={cn('font-mono', BAND_TEXT.red)}>≤30%</span>
      </span>
      <span>
        <span className={cn('font-mono opacity-[0.62]', BAND_TEXT.amber)}>Pk</span> dimmed: estimate, no pair-specific finding
      </span>
      {hasAccredited ? (
        <span>
          <span className="font-semibold text-[var(--wb-blue)]">A</span> accredited Pk, operations tier
        </span>
      ) : null}
      <span className="ml-auto hidden md:inline">Arrow keys move, Enter opens the rationale</span>
    </div>
  )
}
