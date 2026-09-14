'use client'

/** Roster: who is in the package. Benching is the primary gesture. */
import { useState, type MouseEvent } from 'react'
import { RotateCcw, X } from 'lucide-react'
import type { ForceCatalogPlatformFull } from '@/lib/bmi/bmi-types'
import type { ConnTier } from '@/lib/coalition/datalink-matrix'
import type { SensorsStatus } from '@/lib/force-catalog/spectrum-bands'

const TIER_MARK: Record<ConnTier, string> = { track: 'T', data: 'D', voice: 'V', none: '–' }
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
const TIER_COLOR: Record<ConnTier, string> = { track: 'var(--wb-track)', data: 'var(--wb-data)', voice: 'var(--wb-voice)', none: 'var(--store-ink-faint)' }

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
    <section className="border-r fc-hair last:border-r-0 flex flex-col min-h-0 wb-pane" aria-label="Roster">
      <header className="flex items-center gap-2 px-3 py-2 border-b store-line">
        <span className="wb-pane-title">Roster</span>
        <span className="text-[11px] font-mono tabular-nums store-text-muted">{active.length}</span>
        <div className="ml-auto gap-1 shrink-0 wb-pane-tools" role="group" aria-label="Sort roster">
          {(['name', 'nation', 'tier'] as const).map((k) => (
            <button key={k} type="button" aria-pressed={sort === k} onClick={() => setSort(k)}
              className="btn-e xs font-mono capitalize">
              {k}
            </button>
          ))}
        </div>
      </header>

      <ul className="flex-1 overflow-y-auto min-h-0 py-1" role="list">
        {sorted.map((p) => {
          const tier = tierById[p.id] ?? 'none'
          const gap = statusById[p.id] === 'gap'
          const sel = selectedId === p.id
          const inMulti = multi.has(p.id)
          return (
            <li key={p.id}
              className={`group flex items-center gap-2 px-3 h-9 transition-[background-color,opacity] duration-200 ${sel ? 'bg-[var(--store-surface-2)] shadow-[inset_2px_0_0_var(--wb-blue)]' : inMulti ? 'bg-[var(--store-surface-2)]' : 'hover:bg-[var(--store-surface-2)]'}`}>
              <button type="button" onClick={(e) => click(e, p)} className="flex-1 min-w-0 flex items-center gap-2 text-left cursor-pointer" title={`${p.designation} · ${p.nation_name}`}>
                <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: sideDot(p.force_side) }} aria-hidden />
                <span className={`text-[12px] truncate ${sel ? 'text-[var(--store-ink)]' : 'store-text-body'}`}>{p.short_name}</span>
                <span className="text-[11px] font-mono store-text-muted shrink-0">{p.nation_code}</span>
                {gap ? <span className="h-2 w-2 rounded-full border shrink-0" style={{ borderColor: 'var(--store-ink-mute)' }} title="No sensors listed (OSINT gap)" aria-label="No sensors listed" /> : null}
                <span className="ml-auto text-[11px] font-mono w-3 text-center shrink-0" style={{ color: TIER_COLOR[tier] }} title={TIER_TITLE[tier]}>{TIER_MARK[tier]}</span>
              </button>
              <button type="button" onClick={() => onBench([p.id])} aria-label={`Bench ${p.short_name}`}
                className="h-7 w-7 inline-flex items-center justify-center rounded store-text-muted opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:store-text-body hover:bg-[var(--store-surface-3)] transition-opacity duration-150">
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </li>
          )
        })}
        {sorted.length === 0 ? <li className="px-3 py-6 text-[11px] font-mono store-text-muted text-center">Everything is benched.</li> : null}
      </ul>

      {multi.size > 0 ? (
        <div className="px-3 py-2 border-t store-line flex items-center gap-2">
          <span className="text-[11px] font-mono store-text-muted">{multi.size} selected</span>
          <button type="button" onClick={() => { onBench([...multi]); setMulti(new Set()) }} className="ml-auto text-[11px] font-mono px-2.5 py-1 min-h-8 rounded border border-[var(--wb-blue)] text-[var(--wb-blue)]">Bench selected</button>
        </div>
      ) : null}

      <details className="border-t store-line" open={out.length > 0 || undefined}>
        <summary className="flex items-center gap-2 px-3 min-h-10 cursor-pointer list-none [&::-webkit-details-marker]:hidden select-none">
          <span className="wb-pane-title">Benched</span>
          <span className="text-[11px] font-mono tabular-nums store-text-muted">{out.length}</span>
          {out.length ? (
            <button type="button" onClick={(e) => { e.preventDefault(); onRestore(out.map((p) => p.id)) }} className="ml-auto inline-flex items-center gap-1 text-[11px] font-mono store-text-muted hover:store-text-body">
              <RotateCcw className="h-3 w-3" aria-hidden /> Restore all
            </button>
          ) : null}
        </summary>
        <ul className="max-h-40 overflow-y-auto pb-1" role="list">
          {out.map((p) => (
            <li key={p.id} className="flex items-center gap-2 px-3 h-8 opacity-70">
              <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: sideDot(p.force_side) }} aria-hidden />
              <span className="text-[12px] truncate line-through decoration-[var(--store-ink-mute)] store-text-muted">{p.short_name}</span>
              <span className="text-[11px] font-mono store-text-muted">{p.nation_code}</span>
              <button type="button" onClick={() => onRestore([p.id])} aria-label={`Restore ${p.short_name}`} className="ml-auto text-[11px] font-mono text-[var(--wb-blue)] hover:underline">Restore</button>
            </li>
          ))}
        </ul>
      </details>
    </section>
  )
}
