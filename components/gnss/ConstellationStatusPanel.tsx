'use client'

import type { GnssConstellation, GnssJammingIncident, GnssSystemCategory } from '@/lib/gnss/gnss-types'
import { formatSignalFreqMhz, LEO_COMMS_IDS } from '@/lib/gnss/constellation-meta'

const CATEGORY_LABEL: Record<GnssSystemCategory, string> = {
  global_gnss: 'Global GNSS',
  regional_gnss: 'Regional GNSS',
  augmentation: 'Augmentation',
  leo_pnt_comms: 'LEO PNT / Comms',
}

const STATUS_STYLES: Record<string, string> = {
  operational: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  degraded: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  testing: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
}

const OPERATOR_FLAG: Record<string, string> = {
  USA: '🇺🇸',
  Russia: '🇷🇺',
  China: '🇨🇳',
  EU: '🇪🇺',
  India: '🇮🇳',
  Japan: '🇯🇵',
  'United States': '🇺🇸',
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
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {constellations.map((c) => (
        <div
          key={c.id}
          className="rounded-xl border border-white/10 bg-[#0A0A0F] p-4 space-y-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-white">{c.display_name}</h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                {OPERATOR_FLAG[c.operator] ?? '🌐'} {c.operator}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              {LEO_COMMS_IDS.has(c.id) ? (
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border font-medium bg-violet-500/15 text-violet-300 border-violet-500/30">
                  LEO SATCOM
                </span>
              ) : null}
              <span
                className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border font-medium ${STATUS_STYLES[c.status] ?? STATUS_STYLES.testing}`}
              >
                {c.status}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-zinc-500">
                {CATEGORY_LABEL[c.system_category]}
              </span>
            </div>
          </div>
          <p className="text-xs font-mono text-cyan-400">
            {c.satellites_active ?? '—'}/{c.satellites_nominal ?? '—'} SV active
          </p>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-zinc-500 uppercase tracking-wider">
                <th className="text-left py-1">Band</th>
                <th className="text-right py-1">MHz</th>
              </tr>
            </thead>
            <tbody>
              {c.signal_bands.map((b) => {
                const inJamZone = jammed.has(c.id)
                return (
                  <tr key={`${c.id}-${b.band}`} className={inJamZone ? 'text-orange-400' : 'text-zinc-300'}>
                    <td className="py-0.5">{b.band}</td>
                    <td className="py-0.5 text-right font-mono">{formatSignalFreqMhz(b.freq_mhz)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {c.notes ? <p className="text-[10px] text-zinc-500 leading-relaxed">{c.notes}</p> : null}
        </div>
      ))}
    </div>
  )
}
