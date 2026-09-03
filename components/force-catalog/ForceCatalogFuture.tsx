'use client'

/**
 * Callers: ForceCatalogClient.tsx
 * Purpose: Future programs sorted by IOC
 * API/schema: ForceCatalogPlatformFull
 * User: Force Catalogue UI polish v2 — React review HIGH fixes (native button + labels)
 */

import { useMemo } from 'react'
import type { ForceCatalogPlatformFull } from '@/lib/bmi/bmi-types'
import { ConfidenceBadge } from '@/components/platforms/ConfidenceBadge'
import { StorePanel } from '@/components/ui/store-surface'
import { EmptyState, sideEdgeClass } from '@/components/force-catalog/force-catalog-ui'

function iocSortKey(ioc: string | null | undefined): number {
  if (!ioc) return 9999
  const m = /(\d{4})/.exec(ioc)
  return m ? Number(m[1]) : 9999
}

export function ForceCatalogFuture({
  programs,
  onSelect,
  selectedId,
  onClear,
  registerCardRef,
}: {
  programs: ForceCatalogPlatformFull[]
  onSelect: (p: ForceCatalogPlatformFull) => void
  selectedId: string | null
  onClear: () => void
  registerCardRef?: (id: string, el: HTMLButtonElement | null) => void
}) {
  const sorted = useMemo(() => {
    return [...programs].sort((a, b) => {
      const ka = iocSortKey(a.future?.ioc_est)
      const kb = iocSortKey(b.future?.ioc_est)
      if (ka !== kb) return ka - kb
      const na = (a.future?.program_name ?? a.short_name).toLowerCase()
      const nb = (b.future?.program_name ?? b.short_name).toLowerCase()
      return na.localeCompare(nb)
    })
  }, [programs])

  if (sorted.length === 0) {
    return <EmptyState message="No future programs in the current filter." onClear={onClear} />
  }

  return (
    <div className="space-y-2">
      <h2 className="text-[10px] font-mono uppercase tracking-widest store-text-muted tabular-nums">
        Future programs · {sorted.length}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {sorted.map((p) => {
          const selected = selectedId === p.id
          const name = p.future?.program_name ?? p.short_name
          return (
            <button
              key={p.id}
              type="button"
              ref={(el) => registerCardRef?.(p.id, el)}
              aria-pressed={selected}
              aria-label={selected ? `Close detail for ${name}` : `Open detail for ${name}`}
              onClick={() => onSelect(p)}
              className="w-full text-left cursor-pointer rounded-2xl border-0 bg-transparent p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--store-accent)] focus-visible:outline-offset-2"
            >
              <StorePanel
                className={[
                  'p-3 space-y-1 transition-[border-color,background-color] duration-150 ease-out',
                  'hover:border-[var(--store-accent-border)]',
                  selected ? 'border-[var(--store-accent-border)] bg-[var(--store-accent-glow)]' : '',
                  sideEdgeClass(p.force_side),
                ].join(' ')}
              >
                <div className="flex justify-between gap-2">
                  <p className="text-sm store-display store-text-body text-balance">
                    {p.future?.program_name ?? p.short_name}
                  </p>
                  <ConfidenceBadge confidence={p.future?.data_confidence ?? p.data_confidence} />
                </div>
                <p className="text-[10px] font-mono store-text-muted">
                  {`${p.designation} · ${p.nation_code} · ${p.future?.lead_contractor ?? p.manufacturer ?? '—'} · IOC ${p.future?.ioc_est ?? 'TBD'}`}
                </p>
                {p.future?.partner_nations?.length ? (
                  <p className="text-[10px] font-mono store-text-muted">
                    Partners: {p.future.partner_nations.join(', ')}
                  </p>
                ) : null}
                {p.future?.status_note ? (
                  <p className="text-[11px] store-text-muted line-clamp-3 text-pretty">
                    {p.future.status_note}
                  </p>
                ) : null}
              </StorePanel>
            </button>
          )
        })}
      </div>
    </div>
  )
}
