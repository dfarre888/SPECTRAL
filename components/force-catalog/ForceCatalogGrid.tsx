'use client'

/**
 * Callers: ForceCatalogClient.tsx
 * Purpose: Nation-grouped Force / By Nation grid
 * API/schema: none
 * User: Force Catalogue: $10B OrBat workstation (UI polish v2)
 */

import type { CatalogNation, ForceCatalogPlatformFull } from '@/lib/bmi/bmi-types'
import { EmptyState } from '@/components/force-catalog/force-catalog-ui'
import { PlatformCard, type CatalogDensity } from '@/components/force-catalog/PlatformCard'

export function ForceCatalogGrid({
  groups,
  nationByCode,
  density,
  selectedId,
  onSelect,
  onClear,
  showRegion,
  registerCardRef,
}: {
  groups: [string, ForceCatalogPlatformFull[]][]
  nationByCode: Map<string, CatalogNation>
  density: CatalogDensity
  selectedId: string | null
  onSelect: (p: ForceCatalogPlatformFull) => void
  onClear: () => void
  showRegion?: boolean
  registerCardRef?: (id: string, el: HTMLButtonElement | null) => void
}) {
  if (groups.length === 0) {
    return <EmptyState message="No platforms match the active filters." onClear={onClear} />
  }

  return (
    <div className="space-y-8">
      {groups.map(([code, plats]) => {
        const meta = nationByCode.get(code)
        return (
          <div key={code} className="space-y-3">
            <div className="flex items-baseline gap-3 border-b border-[var(--store-line)] pb-2">
              <h2 className="store-display text-[16px] font-semibold tracking-[-0.01em] text-[var(--store-ink)] text-balance">
                {meta?.name ?? code}
              </h2>
              <span className="font-mono text-[12px] store-text-muted">{code}</span>
              {showRegion && meta?.region ? <span className="text-[12px] store-text-muted">{meta.region}</span> : null}
              <span className="ml-auto flex items-center gap-2 text-[12px] store-text-muted">
                {meta?.force_side ? (
                  <span className={`tag ${meta.force_side === 'blue' ? 'blue' : meta.force_side === 'red' ? 'red' : ''}`}>
                    {meta.force_side.charAt(0).toUpperCase() + meta.force_side.slice(1)}
                  </span>
                ) : null}
                <span>
                  <span className="font-mono tabular-nums text-[var(--store-ink)]">{plats.length}</span> platforms
                </span>
              </span>
            </div>
            <div
              className={
                density === 'compact'
                  ? 'grid gap-2 sm:grid-cols-2 xl:grid-cols-3'
                  : 'grid gap-3 sm:grid-cols-2 xl:grid-cols-3'
              }
            >
              {plats.map((p) => (
                <PlatformCard
                  key={p.id}
                  p={p}
                  density={density}
                  selected={selectedId === p.id}
                  onSelect={onSelect}
                  buttonRef={(el) => registerCardRef?.(p.id, el)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
