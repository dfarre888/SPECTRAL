'use client'

/** Coverage: one bar per capability, ghosted against its pre-bench length. */
import type { CoverageResult, CoverageRow, CoverageSort } from '@/lib/force-catalog/coverage-model'
import { ScrollArea } from '@/components/ui/ScrollArea'

const TIER_LABEL = { track: 'track', data: 'data', voice: 'voice', none: '' } as const
const LOST = '#C4B5FD'

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
    <section className="store-panel wb-pane flex min-h-0 flex-col overflow-hidden rounded-2xl" aria-label="Coverage">
      <header className="flex min-h-12 items-center gap-3 border-b border-[var(--store-line)] px-4 whitespace-nowrap">
        <span className="wb-pane-title">Coverage</span>
        <span className="min-w-0 truncate text-[12px] store-text-muted" title="Share of rows with at least one active holder">
          <span className="font-mono tabular-nums text-[var(--store-ink)]">{result.coveragePct}%</span>
          <span className="mx-1.5">·</span>
          <span className="font-mono tabular-nums">{result.activeCount}</span> active
          {result.benchedCount ? (
            <>
              <span className="mx-1.5">·</span>
              <span className="font-mono tabular-nums text-[#FCD34D]">{result.benchedCount}</span> benched
            </>
          ) : null}
          {result.sensorGapCount ? (
            <>
              <span className="mx-1.5">·</span>
              <span className="font-mono tabular-nums">{result.sensorGapCount}</span> without sensor data
            </>
          ) : null}
        </span>
        <div className="seg sm wb-pane-tools ml-auto shrink-0" role="group" aria-label="Sort rows">
          {([['coverage', 'Coverage'], ['rarest', 'Rarest'], ['az', 'A to Z']] as const).map(([k, label]) => (
            <button key={k} type="button" aria-pressed={sort === k} onClick={() => onSort(k)}>
              {label}
            </button>
          ))}
        </div>
      </header>

      <ScrollArea frame={false} height="100%" className="min-h-0 flex-1">
        {sections.map((s) => (
          <div key={s.kind}>
            <div className="sticky top-0 z-[2] flex items-baseline gap-2 border-b border-[var(--store-line)] bg-[rgba(12,12,15,0.86)] px-4 py-2 text-[12px] font-medium text-[var(--store-ink)] backdrop-blur-xl">
              {s.label}
              <span className="font-mono text-[12px] font-normal tabular-nums store-text-muted">{s.rows.filter((r) => !r.noData).length}</span>
            </div>
            <ul role="list" className="px-2 py-1">
              {s.rows.map((row) => {
                const lost = row.active === 0 && row.ghost > 0
                const sel = selectedRowId === row.id
                const w = (n: number) => `${(n / max) * 100}%`
                return (
                  <li key={row.id} data-band-state={bandState(row, focusBand)}>
                    <button
                      type="button"
                      onClick={() => onSelectRow(row)}
                      disabled={row.noData}
                      aria-pressed={sel}
                      className={`grid min-h-11 w-full grid-cols-[minmax(150px,3fr)_minmax(72px,2fr)_60px] items-center gap-3 rounded-lg px-2 text-left transition-colors duration-150 ${
                        sel
                          ? 'bg-[#0E2238] ring-1 ring-[rgba(41,151,255,0.45)]'
                          : row.noData
                            ? 'cursor-default'
                            : 'hover:bg-white/[0.04]'
                      }`}
                    >
                      <span className="min-w-0">
                        <span
                          className={`block truncate text-[13px] ${lost ? 'text-[var(--store-ink)]' : 'store-text-body'}`}
                          title={row.label}
                        >
                          {row.label}
                        </span>
                        <span className="block truncate text-[11.5px] store-text-muted">
                          {row.tier ? TIER_LABEL[row.tier] : ''}
                          {row.tier && row.gateways ? ` · ${row.gateways} gateways` : ''}
                          {!row.tier && row.subtitle ? row.subtitle : ''}
                          {lost ? (
                            <span style={{ color: LOST }}>
                              {row.tier || row.subtitle ? ' · ' : ''}lost with {row.lostWith.slice(0, 3).join(', ')}
                              {row.lostWith.length > 3 ? ` +${row.lostWith.length - 3}` : ''}
                            </span>
                          ) : null}
                        </span>
                      </span>
                      <span className="relative block h-1.5 rounded-full" style={{ background: row.noData ? 'transparent' : 'rgba(255,255,255,0.06)' }}>
                        {row.noData ? (
                          <span className="absolute inset-0 rounded-sm" style={{ background: 'repeating-linear-gradient(45deg, transparent 0 4px, var(--store-line) 4px 5px)' }} />
                        ) : (
                          <>
                            <span
                              className="absolute inset-y-0 left-0 rounded-full"
                              style={{
                                width: w(row.ghost),
                                background: lost ? 'rgba(196,181,253,0.35)' : 'var(--store-line-strong)',
                                transition: 'width 250ms cubic-bezier(0.22,1,0.36,1)',
                              }}
                            />
                            <span
                              className={`absolute inset-y-0 left-0 flex overflow-hidden rounded-full ${sel ? 'wb-glow-blue' : ''}`}
                              style={{ width: w(row.active), transition: 'width 250ms cubic-bezier(0.22,1,0.36,1)' }}
                            >
                              <span style={{ flex: row.bySide.blue, background: 'var(--wb-blue)' }} />
                              <span style={{ flex: row.bySide.red, background: 'var(--wb-red)' }} />
                              <span style={{ flex: row.bySide.neutral, background: 'var(--wb-neutral)' }} />
                            </span>
                          </>
                        )}
                      </span>
                      <span className="text-right font-mono text-[13px] tabular-nums">
                        {row.noData ? (
                          <span className="text-[12px] store-text-muted">no data</span>
                        ) : (
                          <>
                            <span style={{ color: lost ? LOST : 'var(--store-ink)' }}>{row.active}</span>
                            {row.ghost !== row.active ? <span className="store-text-muted">/{row.ghost}</span> : null}
                          </>
                        )}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
        {sections.length === 0 ? (
          <p className="px-4 py-10 text-center text-[13px] store-text-muted">No rows in the selected bands.</p>
        ) : null}
      </ScrollArea>
    </section>
  )
}
