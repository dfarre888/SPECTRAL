'use client'

/** Coverage: one bar per capability, ghosted against its pre-bench length. */
import type { CoverageResult, CoverageRow, CoverageSort } from '@/lib/force-catalog/coverage-model'

const TIER_LABEL = { track: 'track', data: 'data', voice: 'voice', none: '' } as const

function bandState(row: CoverageRow, focus: string | null): 'focused' | 'dimmed' | 'neutral' {
  if (!focus) return 'neutral'
  return row.band === focus ? 'focused' : 'dimmed'
}

export function Coverage({
  result,
  sort,
  onSort,
  focusBand,
  filterBands,
  selectedRowId,
  onSelectRow,
}: {
  result: CoverageResult
  sort: CoverageSort
  onSort: (s: CoverageSort) => void
  focusBand: string | null
  filterBands: Set<string>
  selectedRowId: string | null
  onSelectRow: (row: CoverageRow) => void
}) {
  const max = Math.max(1, ...result.sections.flatMap((s) => s.rows.map((r) => r.ghost)))
  const sections = filterBands.size
    ? result.sections.map((s) => ({ ...s, rows: s.rows.filter((r) => r.band && filterBands.has(r.band)) })).filter((s) => s.rows.length)
    : result.sections

  return (
    <section className="border-r fc-hair last:border-r-0 flex flex-col min-h-0" aria-label="Coverage">
      <header className="flex items-center gap-3 px-3 py-2 border-b store-line whitespace-nowrap overflow-hidden">
        <span className="wb-pane-title">Coverage</span>
        <span className="text-[11px] font-mono tabular-nums store-text-muted truncate" title="Share of rows with at least one active holder">
          <span className="text-[var(--store-ink)]">{result.coveragePct}%</span> · {result.activeCount} active
          {result.benchedCount ? <> · <span className="text-[var(--wb-ir)]">{result.benchedCount} benched</span></> : null}
          {result.sensorGapCount ? <> · {result.sensorGapCount} without sensor data</> : null}
        </span>
        <div className="ml-auto flex gap-1 shrink-0" role="group" aria-label="Sort rows">
          {([['coverage', 'Coverage'], ['rarest', 'Rarest'], ['az', 'A–Z']] as const).map(([k, label]) => (
            <button key={k} type="button" aria-pressed={sort === k} onClick={() => onSort(k)}
              className="btn-e xs font-mono">
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto min-h-0">
        {sections.map((s) => (
          <div key={s.kind}>
            <div className="sticky top-0 z-[1] bg-[var(--store-surface)] px-3 pt-3 pb-1 text-[11px] uppercase tracking-wider store-text-muted flex items-baseline gap-2">
              {s.label}
              <span className="font-mono tabular-nums normal-case tracking-normal">{s.rows.filter((r) => !r.noData).length}</span>
            </div>
            <ul role="list">
              {s.rows.map((row) => {
                const lost = row.active === 0 && row.ghost > 0
                const sel = selectedRowId === row.id
                const w = (n: number) => `${(n / max) * 100}%`
                return (
                  <li key={row.id} data-band-state={bandState(row, focusBand)} className={`px-2 ${lost ? 'py-1' : ''}`}>
                    <button
                      type="button"
                      onClick={() => onSelectRow(row)}
                      disabled={row.noData}
                      aria-pressed={sel}
                      className={`w-full text-left grid grid-cols-[minmax(140px,1fr)_minmax(160px,3fr)_76px] items-center gap-3 px-2 rounded-lg min-h-10 transition-colors duration-150 ${
                        lost ? 'gloss-tile purple' : sel ? 'bg-[var(--store-surface-2)] ring-1 ring-[var(--store-line-strong)]' : row.noData ? 'cursor-default' : 'hover:bg-[var(--store-surface-2)]'
                      }`}
                    >
                      <span className="min-w-0">
                        <span className={`block truncate text-[12px] ${lost ? 'text-[var(--store-ink)]' : 'store-text-body'}`} title={row.label}>{row.label}</span>
                        <span className="block truncate text-[11px] font-mono store-text-muted">
                          {row.tier ? TIER_LABEL[row.tier] : ''}
                          {row.tier && row.gateways ? ` · ${row.gateways} gw` : ''}
                          {!row.tier && row.subtitle ? row.subtitle : ''}
                          {lost ? <span className="text-[var(--store-ink-soft)]"> · lost with {row.lostWith.slice(0, 3).join(', ')}{row.lostWith.length > 3 ? ` +${row.lostWith.length - 3}` : ''}</span> : null}
                        </span>
                      </span>
                      <span className="relative block h-1.5 rounded-full" style={{ background: row.noData ? 'transparent' : 'var(--store-surface-3)' }}>
                        {row.noData ? (
                          <span className="absolute inset-0 rounded-sm" style={{ background: 'repeating-linear-gradient(45deg, transparent 0 4px, var(--store-line) 4px 5px)' }} />
                        ) : (
                          <>
                            <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: w(row.ghost), background: lost ? 'rgba(255,255,255,0.22)' : 'var(--store-line-strong)', transition: 'width 250ms cubic-bezier(0.22,1,0.36,1)' }} />
                            <span className={`absolute inset-y-0 left-0 flex rounded-full overflow-hidden ${sel ? 'wb-glow-blue' : ''}`} style={{ width: w(row.active), transition: 'width 250ms cubic-bezier(0.22,1,0.36,1)' }}>
                              <span style={{ flex: row.bySide.blue, background: 'var(--wb-blue)' }} />
                              <span style={{ flex: row.bySide.red, background: 'var(--wb-red)' }} />
                              <span style={{ flex: row.bySide.neutral, background: 'var(--wb-neutral)' }} />
                            </span>
                          </>
                        )}
                      </span>
                      <span className={`text-right text-[12px] font-mono tabular-nums ${lost ? 'text-[var(--store-ink)]' : 'store-text-body'}`}>
                        {row.noData ? <span className="store-text-muted text-[11px]">no data</span> : (
                          <>{row.active}{row.ghost !== row.active ? <span className="store-text-muted">/{row.ghost}</span> : null}</>
                        )}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
        {sections.length === 0 ? <p className="px-3 py-8 text-center text-[11px] font-mono store-text-muted">No rows in the selected bands.</p> : null}
      </div>
    </section>
  )
}
