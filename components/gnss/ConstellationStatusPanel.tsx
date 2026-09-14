'use client'

import type { GnssConstellation, GnssJammingIncident, GnssSystemCategory } from '@/lib/gnss/gnss-types'
import { formatSignalFreqMhz, LEO_COMMS_IDS } from '@/lib/gnss/constellation-meta'

const CATEGORY_LABEL: Record<GnssSystemCategory, string> = {
  global_gnss: 'Global GNSS',
  regional_gnss: 'Regional GNSS',
  augmentation: 'Augmentation',
  leo_pnt_comms: 'LEO PNT / Comms',
}

interface ConstellationStatusPanelProps {
  constellations: GnssConstellation[]
  incidents: GnssJammingIncident[]
}

function jammedBandIds(incidents: GnssJammingIncident[]): Set<string> {
  const ids = new Set<string>()
  for (const inc of incidents) {
    if (!inc.confirmed) continue
    for (const c of inc.affected_constellations) ids.add(c)
  }
  return ids
}

export function ConstellationStatusPanel({ constellations, incidents }: ConstellationStatusPanelProps) {
  const jammed = jammedBandIds(incidents)

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-10">
      {constellations.map((c) => {
        const active = c.satellites_active ?? 0
        const nominal = c.satellites_nominal ?? 0
        const pct = nominal ? Math.round((active / nominal) * 100) : 0
        const inJamZone = jammed.has(c.id)
        const statusColor = c.status === 'operational' ? 'var(--wb-data)' : c.status === 'degraded' ? 'var(--wb-ir)' : 'var(--store-ink-mute)'
        return (
          <section key={c.id} className="py-4 border-b fc-hair grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-2">
            <div className="min-w-0">
              <h3 className="text-[15px] store-display font-semibold tracking-[-0.01em] text-[var(--store-ink)] m-0 leading-tight">
                {c.display_name}
                {LEO_COMMS_IDS.has(c.id) ? <span className="ml-2 text-[11px] font-mono font-normal text-[var(--wb-optical)]">LEO SATCOM</span> : null}
              </h3>
              <p className="text-[12px] store-text-muted mt-0.5">
                {c.operator} · {CATEGORY_LABEL[c.system_category]}
                {inJamZone ? <span className="text-[var(--wb-ir)]"> · under confirmed jamming</span> : null}
              </p>
            </div>
            <div className="text-right">
              <div className="text-[22px] store-display font-semibold tracking-[-0.01em] tabular-nums leading-none">
                <span className="text-[var(--store-ink)]">{c.satellites_active ?? '—'}</span>
                <span className="store-text-muted text-[13px]">/{c.satellites_nominal ?? '—'} SV</span>
              </div>
              <div className="inline-flex items-center gap-1.5 text-[11px] mt-1" style={{ color: statusColor }}>
                <i className="h-1.5 w-1.5 rounded-full" style={{ background: statusColor }} />{c.status}
              </div>
            </div>
            <div className="col-span-2 h-1 rounded-full bg-[var(--store-surface-3)] overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: statusColor, transition: 'width 250ms cubic-bezier(.22,1,.36,1)' }} />
            </div>
            <p className="col-span-2 text-[11px] font-mono flex flex-wrap gap-x-4 gap-y-1 m-0">
              {c.signal_bands.map((b) => (
                <span key={`${c.id}-${b.band}`} className={inJamZone ? 'text-[var(--wb-ir)]' : 'store-text-body'}>
                  <span className={inJamZone ? '' : 'store-text-muted'}>{b.band}</span> {formatSignalFreqMhz(b.freq_mhz)}
                </span>
              ))}
            </p>
            {c.notes ? <p className="col-span-2 text-[12px] store-text-muted leading-relaxed m-0 max-w-[70ch] text-pretty">{c.notes}</p> : null}
          </section>
        )
      })}
    </div>
  )
}
