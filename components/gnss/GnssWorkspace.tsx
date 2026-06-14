'use client'

import { StorePanel } from '@/components/ui/store-surface'
import { GnssIncidentLedger } from '@/components/gnss/GnssIncidentLedger'
import { GnssAnalyticsPanel } from '@/components/gnss/GnssAnalyticsPanel'
import type { GnssConstellation, GnssJammer, NavCountermeasure } from '@/lib/gnss/queries'
import type { AnalyticsSummary, GnssIncident } from '@/lib/gnss/types'
import Link from 'next/link'

interface GnssWorkspaceProps {
  constellations: GnssConstellation[]
  jammers: GnssJammer[]
  countermeasures: NavCountermeasure[]
  incidents: GnssIncident[]
  analytics: AnalyticsSummary
}

export function GnssWorkspace({
  constellations,
  jammers,
  countermeasures,
  incidents,
  analytics,
}: GnssWorkspaceProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StorePanel className="p-4 lg:col-span-1">
          <h2 className="text-xs store-text-muted uppercase tracking-wider font-semibold mb-3">
            Constellations ({constellations.length})
          </h2>
          <ul className="space-y-2 text-sm max-h-80 overflow-y-auto">
            {constellations.map((c) => (
              <li key={c.id} className="store-panel-inner rounded-xl px-3 py-2">
                <p className="font-medium text-white">{c.name}</p>
                <p className="text-[10px] store-text-muted font-mono">
                  {c.operator_country ?? '—'}
                  {c.jamming_vulnerability ? ` · jam: ${c.jamming_vulnerability}` : ''}
                </p>
              </li>
            ))}
          </ul>
        </StorePanel>

        <StorePanel className="p-4">
          <h2 className="text-xs store-text-muted uppercase tracking-wider font-semibold mb-3">
            GNSS jammers ({jammers.length})
          </h2>
          <ul className="space-y-2 text-sm max-h-80 overflow-y-auto">
            {jammers.map((j) => (
              <li key={j.id} className="store-panel-inner rounded-xl px-3 py-2">
                <p className="font-medium text-white">{j.name}</p>
                <p className="text-[10px] font-mono text-cyan">
                  {j.freq_summary ?? '—'} · {j.country ?? '—'}
                </p>
              </li>
            ))}
          </ul>
          <Link
            href="/spectrum"
            className="mt-4 inline-block text-xs text-[var(--store-accent)] hover:underline"
          >
            Overlay bands in Spectrum View →
          </Link>
        </StorePanel>

        <StorePanel className="p-4">
          <h2 className="text-xs store-text-muted uppercase tracking-wider font-semibold mb-3">
            Nav countermeasures ({countermeasures.length})
          </h2>
          <ul className="space-y-2 text-sm max-h-80 overflow-y-auto">
            {countermeasures.map((n) => (
              <li key={n.id} className="store-panel-inner rounded-xl px-3 py-2">
                <p className="font-medium text-white">{n.name}</p>
                <p className="text-[10px] store-text-body">{n.type ?? '—'}</p>
                <p className="text-[10px] store-text-muted mt-1">{n.notes ?? '—'}</p>
              </li>
            ))}
          </ul>
          <Link
            href="/map"
            className="mt-4 inline-block text-xs text-[var(--store-accent)] hover:underline"
          >
            Plan laydown in Map Intel →
          </Link>
        </StorePanel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GnssIncidentLedger incidents={incidents} />
        <GnssAnalyticsPanel analytics={analytics} />
      </div>
    </div>
  )
}
