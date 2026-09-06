'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { PlatformThumbnail } from '@/components/platforms/PlatformThumbnail'
import { MatrixCell } from '@/components/defeat/MatrixCell'
import type { DefeatTypeFilter } from '@/lib/defeat/defeat-types'
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
}

function findRow(
  effectiveness: DefeatEffectiveness[],
  platformId: string,
  systemId: string
): DefeatEffectiveness | undefined {
  return effectiveness.find(
    (e) => e.platform_id === platformId && e.defeat_system_id === systemId
  )
}

const ROW_HEIGHT = 72

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
}: DefeatMatrixTableProps) {
  // Rows are absolutely positioned by the virtualiser, which takes them out of
  // normal table layout — so each row would size its own columns and nothing
  // would line up. Fixed layout plus an explicit colgroup forces identical
  // widths on every row. These are exact px, not minimums, for that reason.
  const platformColPx = variant === 'fullscreen' ? 220 : 180
  const systemColPx = variant === 'fullscreen' ? 120 : 100
  const platformColMin = variant === 'fullscreen' ? 'w-[220px]' : 'w-[180px]'
  const systemColMin = variant === 'fullscreen' ? 'w-[120px]' : 'w-[100px]'
  const scrollRef = useRef<HTMLDivElement>(null)
  const cellRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  const rowVirtualizer = useVirtualizer({
    count: platforms.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  })

  const clampFocus = useCallback(
    (row: number, col: number) => ({
      row: Math.max(0, Math.min(platforms.length - 1, row)),
      col: Math.max(0, Math.min(systems.length - 1, col)),
    }),
    [platforms.length, systems.length],
  )

  const moveFocus = useCallback(
    (row: number, col: number) => {
      if (platforms.length === 0 || systems.length === 0) return
      const next = clampFocus(row, col)
      onFocusChange?.(next.row, next.col)
      rowVirtualizer.scrollToIndex(next.row, { align: 'auto' })
      const platform = platforms[next.row]
      const system = systems[next.col]
      if (platform && system) {
        onCellSelect(platform.id, system.id)
      }
    },
    [clampFocus, onFocusChange, onCellSelect, platforms, rowVirtualizer, systems],
  )

  useEffect(() => {
    const key = `${focusRow}:${focusCol}`
    cellRefs.current.get(key)?.focus({ preventScroll: true })
  }, [focusRow, focusCol])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (platforms.length === 0 || systems.length === 0) return
    const deltas: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
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
      <div className="store-panel rounded-xl p-12 text-center">
        <p className="store-text-body text-sm">
          No data matches current filters.
        </p>
      </div>
    )
  }

  const virtualRows = rowVirtualizer.getVirtualItems()

  return (
    <div className="w-full store-panel rounded-xl overflow-hidden">
      <div
        ref={scrollRef}
        className="overflow-auto max-h-[min(70vh,720px)]"
        role="grid"
        aria-label="Defeat matrix platform by effector grid"
        aria-rowcount={platforms.length}
        aria-colcount={systems.length + 1}
        onKeyDown={handleKeyDown}
      >
        <table
          className="border-collapse"
          style={{
            tableLayout: 'fixed',
            width: platformColPx + systems.length * systemColPx,
          }}
        >
          <colgroup>
            <col style={{ width: platformColPx }} />
            {systems.map((s2) => (
              <col key={s2.id} style={{ width: systemColPx }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className={`sticky left-0 top-0 z-30 bg-[var(--store-surface)] border border-[var(--store-line)] px-4 py-3 text-left ${platformColMin}`}>
                <span className="text-xs store-text-muted uppercase tracking-wider font-semibold">
                  Platform
                </span>
              </th>
              {systems.map((system) => (
                <th
                  key={system.id}
                  className={`sticky top-0 z-20 bg-[var(--store-surface)] border border-[var(--store-line)] px-2 py-3 text-center overflow-hidden ${systemColMin}`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <PlatformThumbnail
                      id={system.id}
                      name={system.name}
                      size="sm"
                      variant="cuas"
                    />
                    <span
                      className="text-xs font-medium text-white leading-tight line-clamp-2 break-words w-full"
                      title={system.name}
                    >
                      {system.name}
                    </span>
                    <span className="text-[10px] font-mono store-text-muted">
                      {system.country}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
            {virtualRows.map((virtualRow) => {
              const platform = platforms[virtualRow.index]
              return (
                <tr
                  key={platform.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <td className={`sticky left-0 z-10 bg-[var(--store-surface)] border border-[var(--store-line)] px-4 py-3 overflow-hidden ${platformColMin}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <PlatformThumbnail id={platform.id} name={platform.name} size="sm" />
                      <p
                        className="font-semibold text-white text-sm leading-tight truncate min-w-0"
                        title={platform.name}
                      >
                        {platform.name}
                      </p>
                    </div>
                    <p className="text-xs font-mono store-text-muted mt-0.5 truncate">
                      {platform.country_of_origin ?? '—'}
                    </p>
                  </td>
                  {systems.map((system, colIndex) => (
                    <MatrixCell
                      key={`${platform.id}-${system.id}`}
                      platform={platform}
                      system={system}
                      row={findRow(effectiveness, platform.id, system.id)}
                      defeatTypeFilter={defeatTypeFilter}
                      onSelect={onCellSelect}
                      accreditedPkMap={accreditedPkMap}
                      computedSamPkMap={computedSamPkMap}
                      isFocused={virtualRow.index === focusRow && colIndex === focusCol}
                      tabIndex={virtualRow.index === focusRow && colIndex === focusCol ? 0 : -1}
                      cellRef={(el) => {
                        const key = `${virtualRow.index}:${colIndex}`
                        if (el) cellRefs.current.set(key, el)
                        else cellRefs.current.delete(key)
                      }}
                      onFocus={() => onFocusChange?.(virtualRow.index, colIndex)}
                    />
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {accreditedPkMap && Object.keys(accreditedPkMap).length > 0 ? (
        <p className="mt-3 px-4 pb-3 text-[11px] font-mono store-text-muted">
          <span className="text-[var(--store-accent)]">A</span> Accredited Pk — Operations tier only. Arrow keys navigate cells; Enter opens adjudication panel.
        </p>
      ) : (
        <p className="mt-3 px-4 pb-3 text-[11px] font-mono store-text-muted">
          Arrow keys navigate matrix cells; Enter opens adjudication panel.
        </p>
      )}
    </div>
  )
}
