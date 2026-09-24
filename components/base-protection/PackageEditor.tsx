'use client'

import { useMemo, useState } from 'react'
import { Minus, Plus, Search, X } from 'lucide-react'
import {
  MAX_QTY,
  formatRangeM,
  formatUsdShort,
  isAdversaryOrigin,
  publishedRangeM,
  systemRole,
  unitPriceUsd,
  type AssessedItem,
  type CatalogueSystem,
  type PackageItem,
  type SystemRole,
} from '@/lib/base-protection/coverage'
import { INK, ROLE_LABEL } from '@/components/base-protection/tokens'

type RoleFilter = 'all' | SystemRole

const ROLE_FILTERS: { id: RoleFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'sensor', label: 'Sensors' },
  { id: 'effector', label: 'Effectors' },
  { id: 'integrated', label: 'Integrated' },
]

function roleInk(role: SystemRole | null) {
  return role === 'sensor' ? INK.cyan : role ? INK.blue : 'var(--store-ink-mute)'
}

const PORTABILITY_LABEL: Record<string, string> = {
  fixed: 'Fixed',
  vehicle: 'Vehicle',
  'man-portable': 'Man-portable',
  naval: 'Naval',
  airborne: 'Airborne',
}

/** Ground systems first: a base is defended from the ground. Naval and airborne rows follow. */
function groundRank(s: CatalogueSystem): number {
  return s.portability === 'naval' || s.portability === 'airborne' ? 1 : 0
}

function priceText(sys: CatalogueSystem): string {
  const p = unitPriceUsd(sys)
  if (p.status === 'published' && p.usd != null) return formatUsdShort(p.usd)
  if (p.status === 'per_engagement_only') return 'per-shot figure only'
  return 'no public cost'
}

export function PackageEditor({
  items,
  assessed,
  systems,
  onChange,
}: {
  items: PackageItem[]
  assessed: AssessedItem[]
  systems: CatalogueSystem[]
  onChange: (items: PackageItem[]) => void
}) {
  const [query, setQuery] = useState('')
  const [role, setRole] = useState<RoleFilter>('all')
  const [includeAdversary, setIncludeAdversary] = useState(false)

  const inPackage = useMemo(() => new Set(items.map((i) => i.systemId)), [items])
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return systems.filter((s) => {
      if (inPackage.has(s.id)) return false
      if (!includeAdversary && isAdversaryOrigin(s.country)) return false
      const r = systemRole(s)
      if (!r) return false
      if (role !== 'all' && r !== role) return false
      if (!q) return true
      return `${s.name} ${s.manufacturer ?? ''} ${s.country ?? ''}`.toLowerCase().includes(q)
    }).sort((a, b) => groundRank(a) - groundRank(b) || a.name.localeCompare(b.name))
  }, [systems, query, role, includeAdversary, inPackage])

  const setQty = (systemId: string, qty: number) =>
    onChange(items.map((i) => (i.systemId === systemId ? { ...i, qty: Math.max(1, Math.min(MAX_QTY, qty)) } : i)))
  const remove = (systemId: string) => onChange(items.filter((i) => i.systemId !== systemId))
  const add = (systemId: string) => onChange([...items, { systemId, qty: 1 }])

  return (
    <div>
      {assessed.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--store-line-strong)] px-3.5 py-3 text-[13px] text-[var(--store-ink-soft)]">
          None assigned. Add systems from the catalogue below to plan this site’s coverage.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--store-line)] rounded-xl border border-[var(--lacquer-line)]" aria-label="Planned package">
          {assessed.map((it) => (
            <li key={it.systemId} className="flex items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-[var(--store-ink)]" title={it.name}>
                  {it.name}
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-2 text-[11.5px] text-[var(--store-ink-mute)]">
                  <span style={{ color: roleInk(it.role) }}>{it.role ? ROLE_LABEL[it.role] : 'Not in catalogue'}</span>
                  <span className="font-mono">{formatRangeM(it.rangeM)}</span>
                  <span className="font-mono">
                    {it.unitPriceUsd != null
                      ? `${formatUsdShort(it.unitPriceUsd)} each`
                      : it.priceStatus === 'per_engagement_only'
                        ? 'per-shot figure only'
                        : 'no public cost'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1" role="group" aria-label={`Quantity of ${it.name}`}>
                <button
                  type="button"
                  className="glass-icon-btn !h-8 !w-8"
                  onClick={() => setQty(it.systemId, it.qty - 1)}
                  disabled={it.qty <= 1}
                  aria-label={`One fewer ${it.name}`}
                >
                  <Minus className="h-3.5 w-3.5" aria-hidden />
                </button>
                <span className="w-6 text-center font-mono text-[13px] tabular-nums text-[var(--store-ink)]" aria-live="polite">
                  {it.qty}
                </span>
                <button
                  type="button"
                  className="glass-icon-btn !h-8 !w-8"
                  onClick={() => setQty(it.systemId, it.qty + 1)}
                  disabled={it.qty >= MAX_QTY}
                  aria-label={`One more ${it.name}`}
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  className="glass-icon-btn !h-8 !w-8 ml-1"
                  onClick={() => remove(it.systemId)}
                  aria-label={`Remove ${it.name}`}
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4">
        <label htmlFor="bp-sys-search" className="text-[12px] font-medium text-[var(--store-ink-soft)]">
          Add from the catalogue
        </label>
        <div className="relative mt-1.5">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--store-ink-mute)]" aria-hidden />
          <input
            id="bp-sys-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search system, maker or country"
            className="glass-field h-9 w-full pl-8 pr-3 text-[13px]"
            autoComplete="off"
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="seg sm" role="group" aria-label="Filter by role">
            {ROLE_FILTERS.map((f) => (
              <button key={f.id} type="button" aria-pressed={role === f.id} onClick={() => setRole(f.id)}>
                {f.label}
              </button>
            ))}
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] text-[var(--store-ink-soft)]">
            <input
              type="checkbox"
              checked={includeAdversary}
              onChange={(e) => setIncludeAdversary(e.target.checked)}
              className="h-3.5 w-3.5 accent-[var(--wb-blue)]"
            />
            Show Russian and Chinese systems
          </label>
        </div>

        <ul
          className="mt-2 max-h-[232px] overflow-y-auto rounded-xl border border-[var(--lacquer-line)] divide-y divide-[var(--store-line)]"
          aria-label="Catalogue results"
        >
          {systems.length === 0 ? (
            <li className="px-3 py-4 text-[12.5px] text-[var(--store-ink-mute)]">The C-UAS catalogue did not load, so nothing can be added.</li>
          ) : results.length === 0 ? (
            <li className="px-3 py-4 text-[12.5px] text-[var(--store-ink-mute)]">No catalogue systems match.</li>
          ) : (
            results.slice(0, 60).map((s) => {
              const r = systemRole(s)
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => add(s.id)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors duration-150 hover:bg-[rgba(255,255,255,0.04)] motion-reduce:transition-none"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-[var(--store-ink)]" title={s.name}>
                        {s.name}
                      </span>
                      <span className="mt-0.5 flex flex-wrap gap-x-2 text-[11.5px] text-[var(--store-ink-mute)]">
                        <span style={{ color: roleInk(r) }}>{r ? ROLE_LABEL[r] : ''}</span>
                        {s.portability ? <span>{PORTABILITY_LABEL[s.portability] ?? s.portability}</span> : null}
                        <span className="font-mono">{formatRangeM(publishedRangeM(s))}</span>
                        <span className="font-mono">{priceText(s)}</span>
                      </span>
                    </span>
                    <Plus className="h-4 w-4 shrink-0 text-[var(--store-ink-mute)]" aria-hidden />
                    <span className="sr-only">Add {s.name}</span>
                  </button>
                </li>
              )
            })
          )}
        </ul>
        {results.length > 60 ? (
          <p className="mt-1.5 text-[11.5px] text-[var(--store-ink-mute)]">Showing 60 of {results.length}. Search to narrow.</p>
        ) : null}
      </div>
    </div>
  )
}
