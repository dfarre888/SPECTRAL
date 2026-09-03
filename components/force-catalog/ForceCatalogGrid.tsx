'use client'

/**
 * Callers: ForceCatalogClient.tsx
 * Purpose: Nation-grouped Force / By Nation grid
 * API/schema: none
 * User: Force Catalogue — $10B OrBat workstation (UI polish v2)
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
    <div className="space-y-6">
      {groups.map(([code, plats]) => {
        const meta = nationByCode.get(code)
        return (
          <div key={code} className="space-y-2">
            <div
              className={`flex items-baseline justify-between gap-2 ${showRegion ? 'border-b store-line pb-2' : ''}`}
            >
              <h2
                className={`${showRegion ? 'text-sm' : 'text-xs'} store-display store-text-body tracking-wide text-balance`}
              >
                {meta?.name ?? code}
              </h2>
              <p className="text-[10px] font-mono uppercase tracking-widest store-text-muted tabular-nums">
                {code} · {meta?.force_side}
                {showRegion && meta?.region ? ` · ${meta.region}` : ''} · {plats.length}
              </p>
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
