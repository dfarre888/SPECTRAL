'use client'

import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { cn } from '@/lib/utils'

export interface DataColumn<T> {
  key: string
  header: ReactNode
  /** Plain-text header for the sort button's accessible name when `header` is a node. */
  label?: string
  cell: (row: T) => ReactNode
  /** Enables click-to-sort on this column. */
  sortValue?: (row: T) => string | number | null | undefined
  align?: 'left' | 'right' | 'center'
  /** Fixed column width (px or any CSS length). */
  width?: number | string
  /** Pin the column to the leading edge while scrolling sideways. */
  sticky?: boolean
  className?: string
  headerClassName?: string
}

interface DataTableProps<T> {
  rows: readonly T[]
  columns: readonly DataColumn<T>[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  selectedKey?: string | null
  defaultSort?: { key: string; dir: 'asc' | 'desc' }
  compact?: boolean
  maxHeight?: string
  frame?: boolean
  empty?: ReactNode
  caption?: string
  className?: string
  style?: CSSProperties
}

type SortState = { key: string; dir: 'asc' | 'desc' } | null

function compare(a: string | number | null | undefined, b: string | number | null | undefined): number {
  // Blanks sort last in either direction: an unknown value is not "smallest".
  const na = a == null || a === ''
  const nb = b == null || b === ''
  if (na && nb) return 0
  if (na) return 1
  if (nb) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

/**
 * The house table. Sticky glass header, optional sticky first column,
 * alternating rows, click-to-sort headers (HIG macOS: click again to
 * reverse). Numbers right-aligned in tabular mono via `align: 'right'`.
 */
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
  selectedKey,
  defaultSort,
  compact,
  maxHeight,
  frame = true,
  empty,
  caption,
  className,
  style,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState>(defaultSort ?? null)

  const sorted = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    if (!col?.sortValue) return rows
    const get = col.sortValue
    const out = [...rows].sort((a, b) => {
      const va = get(a)
      const vb = get(b)
      const blankA = va == null || va === ''
      const blankB = vb == null || vb === ''
      if (blankA !== blankB) return blankA ? 1 : -1
      const c = compare(va, vb)
      return sort.dir === 'asc' ? c : -c
    })
    return out
  }, [rows, columns, sort])

  function toggle(key: string) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' }
      return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
    })
  }

  const alignClass = (a?: 'left' | 'right' | 'center') =>
    a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left'

  return (
    <ScrollArea maxHeight={maxHeight} frame={frame} className={className} style={style}>
      <table className={cn('dt', compact && 'compact')}>
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <colgroup>
          {columns.map((c) => (
            <col key={c.key} style={c.width != null ? { width: c.width } : undefined} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((c) => {
              const active = sort?.key === c.key
              const ariaSort = c.sortValue
                ? active
                  ? sort!.dir === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none'
                : undefined
              return (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={ariaSort}
                  className={cn(alignClass(c.align), c.sticky && 'stick', c.headerClassName)}
                >
                  {c.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggle(c.key)}
                      className={cn('inline-flex items-center gap-1', c.align === 'right' && 'flex-row-reverse')}
                      aria-label={`Sort by ${c.label ?? (typeof c.header === 'string' ? c.header : c.key)}`}
                    >
                      <span>{c.header}</span>
                      <span className="sort-ind" aria-hidden>
                        {active ? (sort!.dir === 'asc' ? '▲' : '▼') : ''}
                      </span>
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="!py-10 text-center store-text-muted">
                {empty ?? 'Nothing matches these filters.'}
              </td>
            </tr>
          ) : (
            sorted.map((row) => {
              const key = rowKey(row)
              return (
                <tr
                  key={key}
                  aria-selected={selectedKey != null ? selectedKey === key : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={onRowClick ? 'cursor-pointer' : undefined}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        alignClass(c.align),
                        c.align === 'right' && 'num',
                        c.sticky && 'stick',
                        c.className,
                      )}
                    >
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </ScrollArea>
  )
}
