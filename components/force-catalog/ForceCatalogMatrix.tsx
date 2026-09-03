'use client'

/**
 * Callers: ForceCatalogClient (Compare tab)
 * Purpose: Compare layer — capability × platform OrBat matrix
 * API/schema: ForceCatalogPlatformFull → lib/force-catalog/matrix-model (read-only)
 * User instruction: execute PROMPT-CAPABILITY-MATRIX.md
 */

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'
import { Pin, PinOff, X } from 'lucide-react'
import type { CatalogNation, ForceCatalogPlatformFull } from '@/lib/bmi/bmi-types'
import { EmptyState, sideEdgeClass } from '@/components/force-catalog/force-catalog-ui'
import { StorePanel } from '@/components/ui/store-surface'
import {
  applyColumnBudget,
  buildMatrixView,
  toggleIdInList,
  type KindFilter,
  type MatrixSort,
} from '@/lib/force-catalog/matrix-model'

const COL_W = 112
const STICKY_W = 220
const DEFAULT_COL_BUDGET = 24
const PACKAGE_MAX = 12
const ROW_WINDOW = 80

export function ForceCatalogMatrix({
  platforms,
  nations = [],
  onSelect,
  onClear,
  columnBudget = DEFAULT_COL_BUDGET,
  showAllColumns = false,
  onShowAllColumns,
  scopedFromBattle = false,
  onClearScope,
}: {
  platforms: ForceCatalogPlatformFull[]
  nations?: CatalogNation[]
  onSelect: (p: ForceCatalogPlatformFull) => void
  onClear: () => void
  columnBudget?: number
  showAllColumns?: boolean
  onShowAllColumns?: (v: boolean) => void
  scopedFromBattle?: boolean
  onClearScope?: () => void
}) {
  const [hiddenIds, setHiddenIds] = useState<string[]>([])
  const [pinnedIds, setPinnedIds] = useState<string[]>([])
  const [capFilters, setCapFilters] = useState<string[]>([])
  const [kindFilter, setKindFilter] = useState<KindFilter>('all')
  const [capSearch, setCapSearch] = useState('')
  const [deferredSearch, setDeferredSearch] = useState('')
  const [sort, setSort] = useState<MatrixSort>('coverage')
  const [focus, setFocus] = useState<{ r: number; c: number }>({ r: 0, c: 0 })
  const [rowStart, setRowStart] = useState(0)
  const [expandRows, setExpandRows] = useState(false)
  const [focusNation, setFocusNation] = useState('')
  const [bluePackage, setBluePackage] = useState<string[]>([])
  const [redPackage, setRedPackage] = useState<string[]>([])
  const [localShowAll, setLocalShowAll] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => {
      startTransition(() => setDeferredSearch(capSearch))
    }, 120)
    return () => window.clearTimeout(t)
  }, [capSearch])

  useEffect(() => {
    const ids = new Set(platforms.map((p) => p.id))
    setHiddenIds((prev) => prev.filter((id) => ids.has(id)))
    setPinnedIds((prev) => prev.filter((id) => ids.has(id)))
    setRowStart(0)
  }, [platforms])

  const showAll = onShowAllColumns ? showAllColumns : localShowAll
  const setShowAll = onShowAllColumns ?? setLocalShowAll

  const scopedPlatforms = useMemo(() => {
    let list = platforms
    if (focusNation) list = list.filter((p) => p.nation_code === focusNation)
    const pkgBlue = new Set(bluePackage)
    const pkgRed = new Set(redPackage)
    if (pkgBlue.size || pkgRed.size) {
      list = list.filter((p) => {
        if (p.force_side === 'blue' && pkgBlue.size) return pkgBlue.has(p.id)
        if (p.force_side === 'red' && pkgRed.size) return pkgRed.has(p.id)
        if (pkgBlue.size && pkgRed.size) return false
        return true
      })
    }
    return list
  }, [platforms, focusNation, bluePackage, redPackage])

  const view = useMemo(
    () =>
      buildMatrixView({
        platforms: scopedPlatforms,
        hiddenPlatformIds: new Set(hiddenIds),
        pinnedPlatformIds: pinnedIds,
        capabilityFilterIds: capFilters,
        kindFilter,
        capabilitySearch: deferredSearch,
        sort,
      }),
    [scopedPlatforms, hiddenIds, pinnedIds, capFilters, kindFilter, deferredSearch, sort],
  )

  const packageBoth = bluePackage.length > 0 && redPackage.length > 0
  const effectiveBudget = packageBoth ? Math.min(columnBudget, PACKAGE_MAX) : columnBudget

  const budgeted = useMemo(
    () => applyColumnBudget(view.columns, view.rows, effectiveBudget, showAll),
    [view.columns, view.rows, effectiveBudget, showAll],
  )

  const columns = budgeted.visible
  const rows = view.rows
  const colWindowed = budgeted.truncated
  const rowWindowed = !expandRows && rows.length > ROW_WINDOW
  const visibleColumns = columns
  const visibleRows = rowWindowed ? rows.slice(rowStart, rowStart + ROW_WINDOW) : rows

  const nationOptions = useMemo(() => {
    const codes = [...new Set(platforms.map((p) => p.nation_code))].sort()
    return codes.map((code) => ({
      code,
      label: nations.find((n) => n.code === code)?.name ?? code,
    }))
  }, [platforms, nations])

  const blueOptions = useMemo(
    () => platforms.filter((p) => p.force_side === 'blue').slice(0, 40),
    [platforms],
  )
  const redOptions = useMemo(
    () => platforms.filter((p) => p.force_side === 'red').slice(0, 40),
    [platforms],
  )

  const togglePackage = useCallback((side: 'blue' | 'red', id: string) => {
    const setter = side === 'blue' ? setBluePackage : setRedPackage
    setter((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      const otherLen = side === 'blue' ? redPackage.length : bluePackage.length
      const max = otherLen > 0 ? PACKAGE_MAX : 24
      if (prev.length + otherLen >= max && otherLen > 0) return prev
      if (prev.length >= 12) return prev
      return [...prev, id]
    })
  }, [bluePackage.length, redPackage.length])

  const resetColumns = useCallback(() => {
    setHiddenIds([])
    setPinnedIds([])
  }, [])

  const hideSide = useCallback(
    (side: 'blue' | 'red') => {
      const add = platforms.filter((p) => p.force_side === side).map((p) => p.id)
      setHiddenIds((prev) => [...new Set([...prev, ...add])])
    },
    [platforms],
  )

  const toggleCapFilter = useCallback((id: string) => {
    setCapFilters((prev) => toggleIdInList(prev, id))
  }, [])

  const hideColumn = useCallback((id: string) => {
    setHiddenIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
    setPinnedIds((prev) => prev.filter((x) => x !== id))
  }, [])

  const togglePin = useCallback((id: string) => {
    setPinnedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 3) return [...prev.slice(1), id]
      return [...prev, id]
    })
  }, [])

  const onKeyNav = useCallback(
    (e: ReactKeyboardEvent) => {
      if (!visibleRows.length || !visibleColumns.length) return
      const maxR = visibleRows.length - 1
      const maxC = visibleColumns.length - 1
      let { r, c } = focus
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        r = Math.min(maxR, r + 1)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        r = Math.max(0, r - 1)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        c = Math.min(maxC, c + 1)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        c = Math.max(0, c - 1)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const p = visibleColumns[c]
        if (p) onSelect(p)
        return
      } else {
        return
      }
      setFocus({ r, c })
    },
    [focus, onSelect, visibleColumns, visibleRows.length],
  )

  if (platforms.length === 0) {
    return <EmptyState message="No platforms match the active filters." onClear={onClear} />
  }

  if (view.stats.platformCount === 0 && hiddenIds.length) {
    return (
      <StorePanel className="p-8 text-center space-y-3">
        <p className="text-[11px] font-mono store-text-muted text-pretty">
          All platform columns hidden. Reset to restore the filtered OrBat.
        </p>
        <button
          type="button"
          onClick={resetColumns}
          className="text-[10px] font-mono px-3 py-2 min-h-10 rounded border store-accent-border store-accent bg-[var(--store-accent-glow)]"
        >
          Reset columns
        </button>
      </StorePanel>
    )
  }

  if (view.rows.length === 0) {
    return (
      <EmptyState
        message="No comms/sensors listed on filtered platforms (OSINT dossier gap)."
        onClear={onClear}
      />
    )
  }

  const impact = view.impact
  const removedPreview = impact?.removed.slice(0, 4) ?? []
  const removedExtra = impact ? Math.max(0, impact.removed.length - removedPreview.length) : 0

  let lastKind: string | null = null

  return (
    <div className="space-y-3" data-testid="force-catalog-matrix">
      {scopedFromBattle ? (
        <div className="flex flex-wrap items-center gap-2 rounded border store-accent-border bg-[var(--store-accent-glow)] px-3 py-2">
          <p className="text-[10px] font-mono store-text-body">
            Scoped from Battle Picture drill — {platforms.length} platforms
          </p>
          {onClearScope ? (
            <button
              type="button"
              onClick={onClearScope}
              className="text-[9px] font-mono px-2 py-1 min-h-10 rounded border store-line store-text-muted"
            >
              Clear drill scope
            </button>
          ) : null}
        </div>
      ) : null}

      {colWindowed ? (
        <div
          className="rounded border store-line px-3 py-2 text-[10px] font-mono store-text-muted"
          role="status"
        >
          Showing {columns.length} of {budgeted.total} columns (densest-first budget {effectiveBudget}).
          Use Show all to expand.
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 items-center">
        <label className="text-[9px] font-mono store-text-muted" htmlFor="pcm-focus-nation">
          Focus nation
        </label>
        <select
          id="pcm-focus-nation"
          value={focusNation}
          onChange={(e) => setFocusNation(e.target.value)}
          className="text-[11px] font-mono px-2 py-2 min-h-10 rounded border store-line store-panel-inner store-text-body"
        >
          <option value="">All nations in filter</option>
          {nationOptions.map((n) => (
            <option key={n.code} value={n.code}>
              {n.code} — {n.label}
            </option>
          ))}
        </select>
        <label className="text-[9px] font-mono store-text-muted" htmlFor="pcm-blue-pkg">
          Blue package
        </label>
        <select
          id="pcm-blue-pkg"
          value=""
          onChange={(e) => {
            if (e.target.value) togglePackage('blue', e.target.value)
          }}
          className="text-[11px] font-mono px-2 py-2 min-h-10 rounded border store-line store-panel-inner store-text-body max-w-[10rem]"
          aria-label="Add Blue platform to package"
        >
          <option value="">Add Blue…</option>
          {blueOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.short_name}
            </option>
          ))}
        </select>
        <label className="text-[9px] font-mono store-text-muted" htmlFor="pcm-red-pkg">
          Red package
        </label>
        <select
          id="pcm-red-pkg"
          value=""
          onChange={(e) => {
            if (e.target.value) togglePackage('red', e.target.value)
          }}
          className="text-[11px] font-mono px-2 py-2 min-h-10 rounded border store-line store-panel-inner store-text-body max-w-[10rem]"
          aria-label="Add Red platform to package"
        >
          <option value="">Add Red…</option>
          {redOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.short_name}
            </option>
          ))}
        </select>
        {packageBoth ? (
          <span className="text-[9px] font-mono store-text-muted">
            Package mode · max {PACKAGE_MAX} columns
          </span>
        ) : null}
        {(bluePackage.length > 0 || redPackage.length > 0) && (
          <button
            type="button"
            onClick={() => {
              setBluePackage([])
              setRedPackage([])
            }}
            className="text-[9px] font-mono px-2 py-1 min-h-10 rounded border store-line store-text-muted"
          >
            Clear packages
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[10px] font-mono store-text-muted tabular-nums">
          <span className="store-text-body">{view.stats.capabilityCount}</span> capabilities
        </span>
        <span className="text-[10px] font-mono store-text-muted tabular-nums">
          <span className="store-text-body">{view.stats.platformCount}</span> platforms
        </span>
        <span className="text-[10px] font-mono store-text-muted tabular-nums">
          <span className="store-text-body">{view.stats.hiddenCount}</span> hidden
        </span>
        <span
          className="text-[10px] font-mono store-text-muted tabular-nums"
          title="Share of capability rows with ≥1 HAS among visible platform columns"
        >
          coverage <span className="store-text-body">{view.stats.coveragePct}%</span>
        </span>
        <div className="ml-auto flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => hideSide('blue')}
            className="text-[9px] font-mono px-2 py-1 min-h-10 rounded border store-line store-text-muted hover:store-text-body"
          >
            Hide all Blue
          </button>
          <button
            type="button"
            onClick={() => hideSide('red')}
            className="text-[9px] font-mono px-2 py-1 min-h-10 rounded border store-line store-text-muted hover:store-text-body"
          >
            Hide all Red
          </button>
          <button
            type="button"
            onClick={resetColumns}
            disabled={!hiddenIds.length && !pinnedIds.length}
            className="text-[9px] font-mono px-2 py-1 min-h-10 rounded border store-accent-border store-accent disabled:opacity-40"
          >
            Reset columns
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1" role="group" aria-label="Capability kind">
          {(['all', 'comms', 'sensors'] as const).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kindFilter === k}
              onClick={() => setKindFilter(k)}
              className={`text-[9px] font-mono px-2 py-1 min-h-10 rounded border capitalize transition-[color,background-color,border-color] duration-150 ease-out ${
                kindFilter === k
                  ? 'store-accent-border store-accent bg-[var(--store-accent-glow)]'
                  : 'store-line store-text-muted'
              }`}
            >
              {k}
            </button>
          ))}
        </div>
        <label className="sr-only" htmlFor="matrix-cap-search">
          Search capabilities
        </label>
        <input
          id="matrix-cap-search"
          value={capSearch}
          onChange={(e) => setCapSearch(e.target.value)}
          placeholder="Search capabilities"
          className="text-[11px] font-mono px-2 py-2 min-h-10 rounded border store-line store-panel-inner store-text-body w-44"
        />
        <div className="flex gap-1" role="group" aria-label="Row sort">
          {(
            [
              ['coverage', 'Coverage'],
              ['rarest', 'Rarest'],
              ['az', 'A–Z'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={sort === key}
              onClick={() => setSort(key)}
              className={`text-[9px] font-mono px-2 py-1 min-h-10 rounded border ${
                sort === key
                  ? 'store-accent-border store-accent bg-[var(--store-accent-glow)]'
                  : 'store-line store-text-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {colWindowed ? (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="text-[9px] font-mono px-2 py-1 min-h-10 rounded border store-line store-text-muted"
          >
            Show all {budgeted.total} columns
          </button>
        ) : null}
        {showAll && budgeted.total > effectiveBudget ? (
          <button
            type="button"
            onClick={() => setShowAll(false)}
            className="text-[9px] font-mono px-2 py-1 min-h-10 rounded border store-accent-border store-accent"
          >
            Budget {effectiveBudget} densest
          </button>
        ) : null}
        {rowWindowed ? (
          <button
            type="button"
            onClick={() => setExpandRows(true)}
            className="text-[9px] font-mono px-2 py-1 min-h-10 rounded border store-line store-text-muted"
          >
            Show all {rows.length} rows
          </button>
        ) : null}
      </div>

      {capFilters.length > 0 ? (
        <div className="flex flex-wrap gap-1 items-center">
          {capFilters.map((id) => {
            const meta =
              rows.find((r) => r.capability.id === id)?.capability ??
              view.rows.find((r) => r.capability.id === id)?.capability
            const label = meta?.label ?? id
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleCapFilter(id)}
                aria-label={`Remove capability filter ${label}`}
                className="text-[9px] font-mono px-2 py-1 min-h-10 rounded border store-accent-border store-accent"
              >
                cap:{label} ×
              </button>
            )
          })}
        </div>
      ) : null}

      {impact ? (
        <StorePanel className="p-3 space-y-2 sticky top-0 z-20">
          <h2 className="text-[10px] font-mono uppercase tracking-widest store-text-muted">
            OrBat impact
          </h2>
          <p className="text-[11px] store-text-body text-pretty">
            Removed {impact.removed.length}:{' '}
            <span className="font-mono store-text-muted">
              {removedPreview.map((r) => r.short_name).join(', ')}
              {removedExtra ? ` +${removedExtra}` : ''}
            </span>
            {' · '}
            Coverage {impact.coverageBefore}% → {impact.coverageAfter}%
            <span className="store-text-muted">
              {' '}
              (% of capability rows with ≥1 HAS among visible columns)
            </span>
          </p>
          {impact.lostEntirely.length ? (
            <p className="text-[11px] store-text-body text-pretty">
              <span className="store-accent font-mono">Lost entirely:</span>{' '}
              {impact.lostEntirely.map((c) => c.label).join(', ')}
            </p>
          ) : (
            <p className="text-[11px] font-mono store-text-muted">
              No capability dropped to zero — degraded only or still covered.
            </p>
          )}
          {impact.degraded.length ? (
            <p className="text-[10px] font-mono store-text-muted text-pretty">
              Degraded:{' '}
              {impact.degraded
                .slice(0, 8)
                .map((d) => `${d.capability.label} ${d.before}→${d.after}`)
                .join(' · ')}
              {impact.degraded.length > 8 ? ` +${impact.degraded.length - 8}` : ''}
            </p>
          ) : null}
        </StorePanel>
      ) : null}

      <div
        className="overflow-auto max-h-[min(70vh,720px)] rounded-xl border store-line store-panel"
        role="region"
        aria-label="Capability platform matrix"
        tabIndex={0}
        onKeyDown={onKeyNav}
      >
        <table className="border-collapse text-left w-max min-w-full">
          <thead className="sticky top-0 z-10">
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-20 bg-[var(--store-surface)] border-b border-r store-line px-2 py-2 text-[10px] font-mono uppercase tracking-widest store-text-muted"
                style={{ width: STICKY_W, minWidth: STICKY_W }}
              >
                Capability
              </th>
              {visibleColumns.map((p) => {
                const pinned = view.pinnedIds.includes(p.id)
                return (
                  <th
                    key={p.id}
                    scope="col"
                    className={`border-b store-line px-1 py-2 align-bottom bg-[var(--store-surface)] ${sideEdgeClass(p.force_side)}`}
                    style={{ width: COL_W, minWidth: COL_W }}
                  >
                    <div className="flex flex-col gap-1 items-stretch">
                      <button
                        type="button"
                        onClick={() => onSelect(p)}
                        className="text-left text-[11px] store-display store-text-body leading-tight hover:store-accent truncate"
                        title={p.short_name}
                      >
                        {p.short_name}
                      </button>
                      <span className="text-[9px] font-mono store-text-muted truncate">
                        {p.designation}
                      </span>
                      <span className="text-[9px] font-mono store-text-muted">
                        {p.nation_code} · {p.force_side}
                      </span>
                      <div className="flex gap-0.5">
                        <button
                          type="button"
                          aria-label={pinned ? `Unpin ${p.short_name}` : `Pin ${p.short_name}`}
                          onClick={() => togglePin(p.id)}
                          className="min-h-8 min-w-8 inline-flex items-center justify-center rounded border store-line store-text-muted"
                        >
                          {pinned ? (
                            <PinOff className="h-3 w-3" aria-hidden />
                          ) : (
                            <Pin className="h-3 w-3" aria-hidden />
                          )}
                        </button>
                        <button
                          type="button"
                          aria-label={`Hide column ${p.short_name}`}
                          onClick={() => hideColumn(p.id)}
                          className="min-h-8 min-w-8 inline-flex items-center justify-center rounded border store-line store-text-muted"
                        >
                          <X className="h-3 w-3" aria-hidden />
                        </button>
                      </div>
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, ri) => {
              const showSection = row.capability.kind !== lastKind
              lastKind = row.capability.kind
              const activeFilter = capFilters.includes(row.capability.id)
              return (
                <SectionRows key={row.capability.id} showSection={showSection} kind={row.capability.kind} colSpan={visibleColumns.length + 1}>
                  <tr style={{ contentVisibility: 'auto', containIntrinsicSize: '44px' }}>
                    <th
                      scope="row"
                      className="sticky left-0 z-[1] bg-[var(--store-surface)] border-b border-r store-line px-2 py-1 align-middle"
                      style={{ width: STICKY_W, minWidth: STICKY_W }}
                    >
                      <button
                        type="button"
                        aria-pressed={activeFilter}
                        onClick={() => toggleCapFilter(row.capability.id)}
                        className={`w-full text-left rounded px-1 py-1 transition-[background-color] duration-150 ease-out ${
                          activeFilter
                            ? 'bg-[var(--store-accent-glow)]'
                            : 'hover:bg-[var(--store-surface-2)]'
                        }`}
                      >
                        <span className="text-[11px] store-text-body block truncate">
                          {row.capability.label}
                        </span>
                        <span className="text-[9px] font-mono store-text-muted tabular-nums">
                          {row.hasCount}/{row.platformCount}
                        </span>
                        {row.capability.subtitle ? (
                          <span className="text-[9px] font-mono store-text-muted block truncate">
                            {row.capability.subtitle}
                          </span>
                        ) : null}
                      </button>
                    </th>
                    {visibleColumns.map((p, ci) => {
                      const has = row.hasByPlatform[p.id] ?? false
                      const focused = focus.r === ri && focus.c === ci
                      return (
                        <td
                          key={`${row.capability.id}-${p.id}`}
                          className={`border-b store-line text-center align-middle ${
                            focused ? 'outline outline-2 outline-[var(--store-accent)]' : ''
                          }`}
                          style={{ width: COL_W, minWidth: COL_W }}
                        >
                          <button
                            type="button"
                            tabIndex={focused ? 0 : -1}
                            aria-label={`${p.short_name} ${has ? 'has' : 'lacks'} ${row.capability.label}`}
                            title={`${p.short_name} · ${row.capability.label}`}
                            onClick={() => {
                              setFocus({ r: ri, c: ci })
                              if (has) onSelect(p)
                            }}
                            onFocus={() => setFocus({ r: ri, c: ci })}
                            className={`w-full min-h-10 font-mono text-sm ${
                              has ? 'store-accent' : 'store-text-muted opacity-50'
                            }`}
                          >
                            {has ? '✓' : '✗'}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                </SectionRows>
              )
            })}
          </tbody>
        </table>
      </div>

      {colWindowed || rowWindowed ? (
        <p className="text-[9px] font-mono store-text-muted">
          {colWindowed
            ? `Column budget ${effectiveBudget} densest of ${budgeted.total}`
            : 'Windowed for performance'}
          {rowWindowed ? ` · rows ${rowStart + 1}–${rowStart + visibleRows.length} of ${rows.length}` : ''}
          {rowWindowed ? (
            <>
              {' · '}
              <button
                type="button"
                className="store-accent underline"
                onClick={() => setRowStart((s) => Math.max(0, s - ROW_WINDOW))}
                disabled={rowStart === 0}
              >
                Prev rows
              </button>
              {' / '}
              <button
                type="button"
                className="store-accent underline"
                onClick={() =>
                  setRowStart((s) => Math.min(Math.max(0, rows.length - ROW_WINDOW), s + ROW_WINDOW))
                }
                disabled={rowStart + ROW_WINDOW >= rows.length}
              >
                Next rows
              </button>
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  )
}

function SectionRows({
  showSection,
  kind,
  colSpan,
  children,
}: {
  showSection: boolean
  kind: string
  colSpan: number
  children: ReactNode
}) {
  return (
    <>
      {showSection ? (
        <tr>
          <td
            colSpan={colSpan}
            className="sticky left-0 bg-[var(--store-surface-2)] border-b store-line px-2 py-1 text-[9px] font-mono uppercase tracking-widest store-text-muted"
          >
            {kind}
          </td>
        </tr>
      ) : null}
      {children}
    </>
  )
}
