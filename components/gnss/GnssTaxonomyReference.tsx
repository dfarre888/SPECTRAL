'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { StorePanel } from '@/components/ui/store-surface'
import type { AnalyticsSummary } from '@/lib/gnss/types'
import { BAND_REFERENCE, FAILURE_FAMILY_REFERENCE } from '@/lib/gnss/types'

interface GnssTaxonomyReferenceProps {
  defaultOpen?: boolean
}

export function GnssTaxonomyReference({ defaultOpen = false }: GnssTaxonomyReferenceProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border border-[var(--store-line)] rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left store-panel-inner hover:bg-[var(--store-surface-2)] transition-colors"
      >
        <span className="text-[10px] font-semibold store-text-muted uppercase tracking-wider">
          Failure families &amp; spectrum reference
        </span>
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 store-text-muted" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 store-text-muted" />
        )}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-3 text-[11px] store-text-body">
          <p>
            Not every swarm loss is jamming. Docklands 2023 (427 drones) was wind exceedance —
            ATSB confirmed GNSS healthy after a pre-show spectrum survey.
          </p>
          <table className="w-full text-[10px]">
            <thead>
              <tr className="store-text-muted text-left border-b border-[var(--store-line)]">
                <th className="py-1 pr-2">Family</th>
                <th className="py-1">Example</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(FAILURE_FAMILY_REFERENCE).map((f) => (
                <tr key={f.label} className="border-b border-[var(--store-line)]/40">
                  <td className="py-1.5 pr-2 font-mono text-white align-top">{f.label}</td>
                  <td className="py-1.5 store-text-muted">{f.example}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="store-text-muted">
            Spectrum dimension records bands a platform <em>depends on</em> (defensive survey map) —
            not a targeting catalogue. Typical show drone: GPS L1, RTK link, 2.4 GHz swarm network.
          </p>
          <ul className="font-mono text-[10px] text-cyan space-y-0.5">
            <li>GPS L1 — {BAND_REFERENCE.GPS_L1.centre_mhz} MHz</li>
            <li>RTK correction link — datalink</li>
            <li>C2 / swarm 2.4 GHz — {BAND_REFERENCE.control_link_2_4ghz.centre_mhz} MHz</li>
          </ul>
        </div>
      )}
    </div>
  )
}
