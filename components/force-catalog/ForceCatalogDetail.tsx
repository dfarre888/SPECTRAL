'use client'

/**
 * Callers: ForceCatalogClient
 * Purpose: Selected platform detail aside with Escape / focus management
 * API/schema: ForceCatalogPlatformFull (read-only display)
 */

import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import type { ForceCatalogPlatformFull } from '@/lib/bmi/bmi-types'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { StorePanel } from '@/components/ui/store-surface'
import { ConfidenceTag } from '@/components/force/ConfidenceTag'
import { CommsChip, SensorChip, SideDot } from '@/components/force-catalog/force-catalog-ui'
import { pretty } from '@/components/force-catalog/ForceCatalogFilters'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 py-1.5">
      <dt className="w-20 shrink-0 text-[12px] store-text-muted">{label}</dt>
      <dd className="min-w-0 text-[13px] text-[var(--store-ink)]">{children}</dd>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2 border-t border-[var(--store-line)] pt-4">
      <h2 className="text-[12px] font-medium store-text-muted">{title}</h2>
      {children}
    </section>
  )
}

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
      className="w-full shrink-0 lg:sticky lg:top-2 lg:w-[340px] lg:self-start"
      aria-label="Platform detail"
    >
      <StorePanel className="overflow-hidden">
        <div className="flex items-start gap-3 border-b border-[var(--store-line)] px-5 py-4">
          <SideDot side={platform.force_side} className="mt-2" />
          <div className="min-w-0 flex-1">
            <p className="store-display text-[17px] font-semibold leading-tight tracking-[-0.01em] text-[var(--store-ink)] text-balance">
              {platform.short_name}
            </p>
            <p className="mt-1 font-mono text-[12px] store-text-muted">{platform.designation}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close platform detail"
            className="glass-icon-btn shrink-0"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <ScrollArea frame={false} maxHeight="calc(100vh - 190px)">
          <div className="space-y-4 px-5 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="tag">{pretty(platform.service_status)}</span>
              <ConfidenceTag confidence={platform.data_confidence} />
              <span className={`tag ${platform.force_side === 'blue' ? 'blue' : platform.force_side === 'red' ? 'red' : ''}`}>
                {pretty(platform.force_side)}
              </span>
            </div>

            <p className="text-[13px] leading-relaxed store-text-body text-pretty">{platform.open_source_summary}</p>

            <dl>
              <Field label="Nation">
                <span className="font-mono">{platform.nation_code}</span>
                <span className="store-text-muted"> · {platform.nation_name}</span>
              </Field>
              <Field label="Domain">{pretty(platform.domain)}</Field>
              <Field label="Role">{pretty(platform.role)}</Field>
              {platform.manufacturer ? <Field label="OEM">{platform.manufacturer}</Field> : null}
              {platform.ioc_year != null ? (
                <Field label="IOC">
                  <span className="font-mono tabular-nums">{platform.ioc_year}</span>
                </Field>
              ) : null}
            </dl>

            <Section title={`Comms · ${platform.comms.length}`}>
              <div className="flex flex-wrap gap-1.5">
                {platform.comms.length ? (
                  platform.comms.map((c) => <CommsChip key={c.id} label={c.standard ?? c.label} />)
                ) : (
                  <span className="text-[12px] store-text-muted">None listed</span>
                )}
              </div>
            </Section>

            <Section title={`Sensors · ${platform.sensors.length}`}>
              <div className="flex flex-wrap gap-1.5">
                {platform.sensors.length ? (
                  platform.sensors.map((s) => <SensorChip key={s.id} sensor={s} />)
                ) : (
                  <span className="text-[12px] store-text-muted">None listed in the open-source dossier</span>
                )}
              </div>
            </Section>

            {platform.future ? (
              <Section title="Future program">
                <p className="text-[14px] font-medium text-[var(--store-ink)] text-balance">{platform.future.program_name}</p>
                <dl>
                  <Field label="Lead">{platform.future.lead_contractor ?? 'Not stated'}</Field>
                  <Field label="IOC">
                    <span className="font-mono">{platform.future.ioc_est ?? 'TBD'}</span>
                  </Field>
                  {platform.future.partner_nations?.length ? (
                    <Field label="Partners">
                      <span className="font-mono">{platform.future.partner_nations.join(', ')}</span>
                    </Field>
                  ) : null}
                </dl>
                {platform.future.status_note ? (
                  <p className="text-[12px] leading-relaxed store-text-body text-pretty">{platform.future.status_note}</p>
                ) : null}
              </Section>
            ) : null}

            {platform.sources?.length ? (
              <Section title="Sources">
                <ul className="space-y-1">
                  {platform.sources.map((s) => (
                    <li key={s} className="break-words font-mono text-[11.5px] leading-relaxed store-text-muted">
                      {s}
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}

            <p className="break-all border-t border-[var(--store-line)] pt-3 font-mono text-[11px] store-text-muted">{platform.id}</p>
          </div>
        </ScrollArea>
      </StorePanel>
    </aside>
  )
}
