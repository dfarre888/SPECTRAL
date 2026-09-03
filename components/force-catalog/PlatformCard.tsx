'use client'

/**
 * Callers: ForceCatalogGrid
 * Purpose: Platform card with optional selection (native button for a11y)
 * API/schema: ForceCatalogPlatformFull
 * User: Force Catalogue UI polish v2 — React review HIGH fixes
 */

import type { ForceCatalogPlatformFull } from '@/lib/bmi/bmi-types'
import { ConfidenceBadge } from '@/components/platforms/ConfidenceBadge'
import { StorePanel } from '@/components/ui/store-surface'
import { CommsChip, SensorChip, sideEdgeClass } from '@/components/force-catalog/force-catalog-ui'

export type CatalogDensity = 'grid' | 'compact'

export function PlatformCard({
  p,
  density,
  selected,
  onSelect,
  buttonRef,
}: {
  p: ForceCatalogPlatformFull
  density: CatalogDensity
  selected?: boolean
  onSelect?: (p: ForceCatalogPlatformFull) => void
  buttonRef?: (el: HTMLButtonElement | null) => void
}) {
  const compact = density === 'compact'
  const panel = (
    <StorePanel
      className={[
        compact ? 'p-2 space-y-1' : 'p-3 space-y-2',
        'hover-lift',
        'transition-[border-color,background-color] duration-150 ease-out',
        'hover:border-[var(--store-accent-border)]',
        selected
          ? 'border-[var(--store-accent-border)] bg-[var(--store-accent-glow)] ring-1 ring-[var(--store-accent-border)]'
          : '',
        sideEdgeClass(p.force_side),
      ].join(' ')}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p
            className={`${compact ? 'text-xs' : 'text-sm'} font-semibold store-display store-text-body truncate text-balance`}
          >
            {p.short_name}
          </p>
          <p className="text-[10px] font-mono store-text-muted truncate">
            {p.designation} · {p.nation_code} · {p.domain} · {p.role}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border store-line store-panel-inner">
            {p.service_status}
          </span>
          <ConfidenceBadge confidence={p.data_confidence} />
        </div>
      </div>
      {!compact ? (
        <p className="text-[11px] store-text-muted leading-snug line-clamp-3 text-pretty">
          {p.open_source_summary}
        </p>
      ) : null}
      {p.comms.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {p.comms.slice(0, compact ? 3 : 6).map((c) => (
            <CommsChip key={c.id} label={c.standard ?? c.label} />
          ))}
        </div>
      ) : null}
      {!compact && p.sensors.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {p.sensors.slice(0, 4).map((s) => (
            <SensorChip key={s.id} sensor={s} />
          ))}
        </div>
      ) : null}
    </StorePanel>
  )

  if (!onSelect) return panel

  return (
    <button
      type="button"
      ref={buttonRef}
      aria-pressed={Boolean(selected)}
      aria-label={
        selected ? `Close detail for ${p.short_name}` : `Open detail for ${p.short_name}`
      }
      onClick={() => onSelect(p)}
      className="w-full text-left cursor-pointer rounded-2xl border-0 bg-transparent p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--store-accent)] focus-visible:outline-offset-2"
    >
      {panel}
    </button>
  )
}
