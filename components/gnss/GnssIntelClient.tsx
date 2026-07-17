'use client'

import { useState } from 'react'
import type {
  GnssConstellation,
  GnssJammingIncident,
  GnssPlatformDependency,
} from '@/lib/gnss/gnss-types'
import { ConstellationStatusPanel } from '@/components/gnss/ConstellationStatusPanel'
import { GnssVulnerabilityMatrix } from '@/components/gnss/GnssVulnerabilityMatrix'
import { JammingIncidentsPanel } from '@/components/gnss/JammingIncidentsPanel'

type Tab = 'constellations' | 'vulnerability' | 'incidents'

interface GnssIntelClientProps {
  constellations: GnssConstellation[]
  dependencies: GnssPlatformDependency[]
  incidents: GnssJammingIncident[]
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'constellations', label: 'Constellation Status' },
  { id: 'vulnerability', label: 'Platform Vulnerability' },
  { id: 'incidents', label: 'Jamming Incidents' },
]

export function GnssIntelClient({ constellations, dependencies, incidents }: GnssIntelClientProps) {
  const [tab, setTab] = useState<Tab>('constellations')

  return (
    <div className="space-y-4 bg-[#0A0A0F]">
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-md ${
              tab === t.id
                ? 'bg-orange-500/15 text-orange-400 border border-orange-500/40'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'constellations' ? (
        <ConstellationStatusPanel constellations={constellations} incidents={incidents} />
      ) : null}
      {tab === 'vulnerability' ? (
        <GnssVulnerabilityMatrix constellations={constellations} dependencies={dependencies} />
      ) : null}
      {tab === 'incidents' ? <JammingIncidentsPanel incidents={incidents} /> : null}
    </div>
  )
}
