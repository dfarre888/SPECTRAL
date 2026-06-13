'use client'

import { StorePanel } from '@/components/ui/store-surface'
import type { GnssConstellation, GnssJammer, NavCountermeasure } from '@/lib/gnss/queries'
import Link from 'next/link'

interface GnssWorkspaceProps {
  constellations: GnssConstellation[]
  jammers: GnssJammer[]
  countermeasures: NavCountermeasure[]
}

export function GnssWorkspace({
  constellations,
  jammers,
  countermeasures,
}: GnssWorkspaceProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <StorePanel className="p-4 lg:col-span-1">
        <h2 className="text-xs store-text-muted uppercase tracking-wider font-semibold mb-3">
          Constellations ({constellations.length})
        </h2>
        <ul className="space-y-2 text-sm">
          {constellations.map((c) => (
            <li key={c.id} className="store-panel-inner rounded-xl px-3 py-2">
              <p className="font-medium text-white">{c.name}</p>
              <p className="text-[10px] store-text-muted font-mono">{c.status}</p>
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
                {j.freq_low_mhz}–{j.freq_high_mhz} MHz · {j.country ?? '—'}
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
        <ul className="space-y-2 text-sm">
          {countermeasures.map((n) => (
            <li key={n.id} className="store-panel-inner rounded-xl px-3 py-2">
              <p className="font-medium text-white">{n.name}</p>
              <p className="text-[10px] store-text-body">{n.method}</p>
              <p className="text-[10px] store-text-muted mt-1">{n.effectiveness_notes}</p>
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
  )
}
