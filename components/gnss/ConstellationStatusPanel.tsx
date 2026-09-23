'use client'

import type { GnssConstellation, GnssJammingIncident, GnssSystemCategory } from '@/lib/gnss/gnss-types'
import { formatSignalFreqMhz, LEO_COMMS_IDS } from '@/lib/gnss/constellation-meta'

const CATEGORY_LABEL: Record<GnssSystemCategory, string> = {
  global_gnss: 'Global GNSS',
  regional_gnss: 'Regional GNSS',
  augmentation: 'Augmentation',
  leo_pnt_comms: 'LEO PNT / Comms',
}

/** Status is data: green nominal, amber degraded, grey testing. GNSS itself reads cyan. */
const STATUS_STYLE: Record<string, { tag: string; bar: string }> = {
  operational: { tag: 'green', bar: '#06B6D4' },
  degraded: { tag: 'amber', bar: '#FBBF24' },
  testing: { tag: '', bar: 'var(--store-ink-mute)' },
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
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {constellations.map((c) => {
        const active = c.satellites_active ?? 0
        const nominal = c.satellites_nominal ?? 0
        const pct = nominal ? Math.min(100, Math.round((active / nominal) * 100)) : 0
        const inJamZone = jammed.has(c.id)
        const style = STATUS_STYLE[c.status] ?? STATUS_STYLE.testing
        return (
          <section key={c.id} className="store-panel rounded-2xl p-5 min-w-0" aria-label={c.display_name}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-[16px] store-display font-semibold tracking-[-0.01em] text-[var(--store-ink)] m-0 leading-tight flex flex-wrap items-center gap-2">
                  {c.display_name}
                  {LEO_COMMS_IDS.has(c.id) ? <span className="tag violet">LEO SATCOM</span> : null}
                </h3>
                <p className="text-[12px] store-text-muted mt-1 mb-0">
                  {c.operator} · {CATEGORY_LABEL[c.system_category]}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="store-display font-semibold tracking-[-0.01em] tabular-nums leading-none">
                  <span className="text-[24px] text-[var(--store-ink)]">{c.satellites_active?.toLocaleString('en-AU') ?? 'n/a'}</span>
                  <span className="text-[13px] store-text-muted"> / {c.satellites_nominal?.toLocaleString('en-AU') ?? 'n/a'}</span>
                </div>
                <div className="text-[11.5px] store-text-muted mt-1">space vehicles</div>
              </div>
            </div>

            <div className="mt-3.5 h-1.5 rounded-full bg-[rgba(142,142,147,0.22)] overflow-hidden" role="img" aria-label={`${pct}% of nominal space vehicles active`}>
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: style.bar, transition: 'width 250ms cubic-bezier(.22,1,.36,1)' }} />
            </div>

            <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
              <span className={`tag ${style.tag}`}>
                <i className="h-1.5 w-1.5 rounded-full" style={{ background: 'currentColor' }} aria-hidden />
                {c.status}
              </span>
              {inJamZone ? <span className="tag amber">Under confirmed jamming</span> : null}
            </div>

            {c.signal_bands.length ? (
              <dl className="mt-3.5 pt-3.5 border-t fc-hair flex flex-wrap gap-x-5 gap-y-1.5 m-0 font-mono text-[12px] tabular-nums">
                {c.signal_bands.map((b) => (
                  <div key={`${c.id}-${b.band}`} className="flex items-baseline gap-2">
                    <dt className="store-text-muted">{b.band}</dt>
                    <dd className={`m-0 ${inJamZone ? 'text-[#FCD34D]' : 'text-[var(--store-ink)]'}`}>{formatSignalFreqMhz(b.freq_mhz)}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {c.notes ? <p className="text-[13px] store-text-body leading-relaxed mt-3 mb-0 text-pretty">{c.notes}</p> : null}
          </section>
        )
      })}
    </div>
  )
}
