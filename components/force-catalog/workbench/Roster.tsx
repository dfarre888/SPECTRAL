'use client'

/** Roster: who is in the package. Benching is the primary gesture. */
import { useState, type MouseEvent } from 'react'
import { RotateCcw, X } from 'lucide-react'
import type { ForceCatalogPlatformFull } from '@/lib/bmi/bmi-types'
import type { ConnTier } from '@/lib/coalition/datalink-matrix'
import type { SensorsStatus } from '@/lib/force-catalog/spectrum-bands'
import { ScrollArea } from '@/components/ui/ScrollArea'

const TIER_MARK: Record<ConnTier, string> = { track: 'Track', data: 'Data', voice: 'Voice', none: 'None' }
const TIER_TITLE: Record<ConnTier, string> = {
  track: 'Track tier: machine-to-machine track exchange',
  data: 'Data tier: SATCOM data, no live track picture',
  voice: 'Voice tier only',
  none: 'No bearer of any kind',
}
export type RosterSort = 'name' | 'nation' | 'tier'
const TIER_RANK: Record<ConnTier, number> = { track: 0, data: 1, voice: 2, none: 3 }

function sideDot(side: ForceCatalogPlatformFull['force_side']) {
  if (side === 'blue') return 'var(--wb-blue)'
  if (side === 'red') return 'var(--wb-red)'
  return 'var(--wb-neutral)'
}
const TIER_COLOR: Record<ConnTier, string> = {
  track: 'var(--wb-track)',
  data: 'var(--wb-data)',
  voice: 'var(--store-ink-soft)',
  none: 'var(--store-ink-mute)',
}

function SortHeader({
  k,
  label,
  sort,
  setSort,
  className = '',
}: {
  k: RosterSort
  label: string
  sort: RosterSort
  setSort: (s: RosterSort) => void
  className?: string
}) {
  return (
    <th scope="col" aria-sort={sort === k ? 'ascending' : 'none'} className={className}>
      <button type="button" onClick={() => setSort(k)} aria-label={`Sort roster by ${label}`} className="inline-flex items-center gap-1">
        {label}
        <span className="sort-ind" aria-hidden>{sort === k ? '▲' : ''}</span>
      </button>
    </th>
  )
}

export function Roster({
  platforms,
  benched,
  tierById,
  statusById,
  selectedId,
  onSelect,
  onBench,
  onRestore,
}: {
  platforms: ForceCatalogPlatformFull[]
  benched: Set<string>
  tierById: Record<string, ConnTier>
  statusById: Record<string, SensorsStatus>
  selectedId: string | null
  onSelect: (p: ForceCatalogPlatformFull) => void
  onBench: (ids: string[]) => void
  onRestore: (ids: string[]) => void
}) {
  const [sort, setSort] = useState<RosterSort>('name')
  const [multi, setMulti] = useState<Set<string>>(new Set())

  const active = platforms.filter((p) => !benched.has(p.id))
  const out = platforms.filter((p) => benched.has(p.id))
  const sorted = [...active].sort((a, b) => {
    if (sort === 'nation') return a.nation_code.localeCompare(b.nation_code) || a.short_name.localeCompare(b.short_name)
    if (sort === 'tier') return TIER_RANK[tierById[a.id] ?? 'none'] - TIER_RANK[tierById[b.id] ?? 'none'] || a.short_name.localeCompare(b.short_name)
    return a.short_name.localeCompare(b.short_name)
  })

  const click = (e: MouseEvent, p: ForceCatalogPlatformFull) => {
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      e.preventDefault()
      setMulti((prev) => {
        const next = new Set(prev)
        if (next.has(p.id)) next.delete(p.id)
        else next.add(p.id)
        return next
      })
      return
    }
    setMulti(new Set())
    onSelect(p)
  }

  return (
    <section className="store-panel flex min-h-0 flex-col overflow-hidden rounded-2xl" aria-label="Roster">
      <header className="flex min-h-12 items-center gap-2 border-b border-[var(--store-line)] px-4">
        <span className="wb-pane-title">Roster</span>
        <span className="font-mono text-[12px] tabular-nums store-text-muted">{active.length}</span>
        <span className="ml-auto truncate text-[12px] store-text-muted" title="Shift or Cmd click to select several, then bench them together">
          Shift-click to multi-select
        </span>
      </header>

      <ScrollArea frame={false} height="100%" className="min-h-0 flex-1">
        <table className="dt compact table-fixed">
          <caption className="sr-only">Platforms in the package</caption>
          <colgroup>
            <col />
            <col style={{ width: 54 }} />
            <col style={{ width: 58 }} />
            <col style={{ width: 32 }} />
          </colgroup>
          <thead>
            <tr>
              <SortHeader k="name" label="Platform" sort={sort} setSort={setSort} />
              <SortHeader k="nation" label="Nation" sort={sort} setSort={setSort} />
              <SortHeader k="tier" label="Tier" sort={sort} setSort={setSort} />
              <th scope="col"><span className="sr-only">Bench</span></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const tier = tierById[p.id] ?? 'none'
              const gap = statusById[p.id] === 'gap'
              const sel = selectedId === p.id
              const inMulti = multi.has(p.id)
              return (
                <tr key={p.id} aria-selected={sel || inMulti} className="group cursor-pointer" onClick={(e) => click(e, p)}>
                  <td>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); click(e, p) }}
                      className="flex w-full min-w-0 items-center gap-2 text-left"
                      title={`${p.designation} · ${p.nation_name}`}
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: sideDot(p.force_side) }} aria-hidden />
                      <span className={`min-w-0 truncate ${sel ? 'text-[var(--store-ink)]' : 'store-text-body'}`}>{p.short_name}</span>
                      {gap ? (
                        <span
                          className="h-2 w-2 shrink-0 rounded-full border border-[var(--store-ink-mute)]"
                          title="No sensors listed (OSINT gap)"
                          aria-label="No sensors listed"
                        />
                      ) : null}
                    </button>
                  </td>
                  <td className="mono store-text-muted">{p.nation_code}</td>
                  <td>
                    <span className="text-[12px]" style={{ color: TIER_COLOR[tier] }} title={TIER_TITLE[tier]}>
                      {TIER_MARK[tier]}
                    </span>
                  </td>
                  <td className="!px-1 text-right">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onBench([p.id]) }}
                      aria-label={`Bench ${p.short_name}`}
                      title="Bench"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md store-text-muted opacity-0 transition-opacity duration-150 hover:bg-white/[0.08] hover:text-[var(--store-ink)] focus-visible:opacity-100 group-hover:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </td>
                </tr>
              )
            })}
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={4} className="!py-8 text-center store-text-muted">Everything is benched.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </ScrollArea>

      {multi.size > 0 ? (
        <div className="flex items-center gap-2 border-t border-[var(--store-line)] px-4 py-2.5">
          <span className="text-[12px] store-text-muted">
            <span className="font-mono tabular-nums text-[var(--store-ink)]">{multi.size}</span> selected
          </span>
          <button
            type="button"
            onClick={() => { onBench([...multi]); setMulti(new Set()) }}
            className="btn-glass primary ml-auto !min-h-8 !px-3 !text-[12px]"
          >
            Bench selected
          </button>
        </div>
      ) : null}

      <details className="border-t border-[var(--store-line)]" open={out.length > 0 || undefined}>
        <summary className="flex min-h-11 cursor-pointer select-none list-none items-center gap-2 px-4 [&::-webkit-details-marker]:hidden">
          <span className="wb-pane-title">Benched</span>
          <span className="font-mono text-[12px] tabular-nums store-text-muted">{out.length}</span>
          {out.length ? (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); onRestore(out.map((p) => p.id)) }}
              className="fc-action ml-auto"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Restore all
            </button>
          ) : null}
        </summary>
        {out.length ? (
          <ScrollArea frame={false} maxHeight="160px">
            <ul className="pb-2" role="list">
              {out.map((p) => (
                <li key={p.id} className="flex h-8 items-center gap-2 px-4">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full opacity-60" style={{ background: sideDot(p.force_side) }} aria-hidden />
                  <span className="min-w-0 truncate text-[13px] line-through decoration-[var(--store-ink-mute)] store-text-muted">{p.short_name}</span>
                  <span className="font-mono text-[12px] store-text-muted">{p.nation_code}</span>
                  <button
                    type="button"
                    onClick={() => onRestore([p.id])}
                    aria-label={`Restore ${p.short_name}`}
                    className="ml-auto text-[12px] text-[var(--wb-blue)] hover:underline"
                  >
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        ) : null}
      </details>
    </section>
  )
}
