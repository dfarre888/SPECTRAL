'use client'

/**
 * Callers: ForceCatalogClient
 * Purpose: Selected platform detail aside with Escape / focus management
 * API/schema: ForceCatalogPlatformFull (read-only display)
 * User: Force Catalogue UI polish v2 — React review HIGH fixes (focus steal / return)
 */

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import type { ForceCatalogPlatformFull } from '@/lib/bmi/bmi-types'
import { ConfidenceBadge } from '@/components/platforms/ConfidenceBadge'
import { StorePanel } from '@/components/ui/store-surface'
import { CommsChip, SensorChip, sideEdgeClass } from '@/components/force-catalog/force-catalog-ui'

export function ForceCatalogDetail({
  platform,
  onClose,
}: {
  platform: ForceCatalogPlatformFull
  onClose: () => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [platform.id])

  return (
    <aside
      className="w-full lg:w-[320px] shrink-0 lg:sticky lg:top-4 lg:self-start"
      aria-label="Platform detail"
    >
      <StorePanel className={`p-4 space-y-3 ${sideEdgeClass(platform.force_side)}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold store-display store-text-body text-balance">
              {platform.short_name}
            </p>
            <p className="text-[10px] font-mono store-text-muted">{platform.designation}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close platform detail"
            className="shrink-0 rounded border store-line p-2 min-h-10 min-w-10 inline-flex items-center justify-center store-text-muted hover:store-text-body transition-[color,border-color] duration-150 ease-out"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border store-line store-panel-inner">
            {platform.service_status}
          </span>
          <span className="text-[9px] font-mono store-text-muted">
            {platform.nation_code} · {platform.domain} · {platform.role} · {platform.force_side}
          </span>
          <ConfidenceBadge confidence={platform.data_confidence} />
        </div>

        <p className="text-[11px] store-text-muted leading-relaxed text-pretty">
          {platform.open_source_summary}
        </p>

        {platform.manufacturer ? (
          <p className="text-[10px] font-mono store-text-muted">OEM · {platform.manufacturer}</p>
        ) : null}
        {platform.ioc_year != null ? (
          <p className="text-[10px] font-mono store-text-muted tabular-nums">IOC · {platform.ioc_year}</p>
        ) : null}

        <div className="space-y-1">
          <h2 className="text-[10px] font-mono uppercase tracking-widest store-text-muted">Comms</h2>
          <div className="flex flex-wrap gap-1">
            {platform.comms.length ? (
              platform.comms.map((c) => <CommsChip key={c.id} label={c.standard ?? c.label} />)
            ) : (
              <span className="text-[10px] font-mono store-text-muted">None listed</span>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <h2 className="text-[10px] font-mono uppercase tracking-widest store-text-muted">Sensors</h2>
          <div className="flex flex-wrap gap-1">
            {platform.sensors.length ? (
              platform.sensors.map((s) => <SensorChip key={s.id} sensor={s} />)
            ) : (
              <span className="text-[10px] font-mono store-text-muted">None listed</span>
            )}
          </div>
        </div>

        {platform.sources?.length ? (
          <div className="space-y-1">
            <h2 className="text-[10px] font-mono uppercase tracking-widest store-text-muted">Sources</h2>
            <ul className="space-y-1">
              {platform.sources.map((s) => (
                <li key={s} className="text-[10px] font-mono store-text-muted text-pretty">
                  {s}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {platform.future ? (
          <div className="space-y-1 border-t store-line pt-3">
            <h2 className="text-[10px] font-mono uppercase tracking-widest store-text-muted">
              Future program
            </h2>
            <p className="text-sm store-display store-text-body text-balance">
              {platform.future.program_name}
            </p>
            <p className="text-[10px] font-mono store-text-muted">
              {platform.future.lead_contractor ?? '—'} · IOC {platform.future.ioc_est ?? 'TBD'}
            </p>
            {platform.future.partner_nations?.length ? (
              <p className="text-[10px] font-mono store-text-muted">
                Partners: {platform.future.partner_nations.join(', ')}
              </p>
            ) : null}
            {platform.future.status_note ? (
              <p className="text-[11px] store-text-muted text-pretty">{platform.future.status_note}</p>
            ) : null}
          </div>
        ) : null}

        <p className="text-[9px] font-mono store-text-muted break-all">{platform.id}</p>
      </StorePanel>
    </aside>
  )
}
