'use client'

import { useMemo, useState } from 'react'
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
  { id: 'constellations', label: 'Constellations' },
  { id: 'vulnerability', label: 'Platform vulnerability' },
  { id: 'incidents', label: 'Jamming incidents' },
]

export function GnssIntelClient({ constellations, dependencies, incidents }: GnssIntelClientProps) {
  const [tab, setTab] = useState<Tab>('constellations')

  const inst = useMemo(() => {
    const active = constellations.reduce((n, c) => n + (c.satellites_active ?? 0), 0)
    const nominal = constellations.reduce((n, c) => n + (c.satellites_nominal ?? 0), 0)
    const confirmed = incidents.filter((i) => i.confirmed)
    const jammedIds = new Set(confirmed.flatMap((i) => i.affected_constellations))
    const degraded = constellations.filter((c) => c.status !== 'operational').length
    return { active, nominal, confirmed: confirmed.length, jammed: jammedIds.size, degraded }
  }, [constellations, incidents])

  return (
    <div className="space-y-4 bg-[var(--store-bg)]">
      <div className="fc-inst border-b fc-hair" aria-label="GNSS instruments">
        <div><div className="k">Constellations</div><div className="v">{constellations.length}</div><div className="d">{inst.degraded ? `${inst.degraded} not fully operational` : 'all operational'}</div></div>
        <div><div className="k">Space vehicles active</div><div className="v">{inst.active}<small>/{inst.nominal}</small></div><div className="d">across all constellations</div></div>
        <div><div className="k">Constellations under confirmed jamming</div><div className="v glow">{inst.jammed}</div><div className="d">{inst.confirmed} confirmed incidents</div></div>
        <div><div className="k">Platforms tracked</div><div className="v">{dependencies.length}</div><div className="d">GNSS dependency assessed</div></div>
        <div><div className="k">Incidents on record</div><div className="v">{incidents.length}</div><div className="d">{incidents.length - inst.confirmed} unconfirmed</div></div>
      </div>
      <div className="flex flex-wrap gap-2 border-b border-[var(--store-line)] pb-3" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className="fc-tab">
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
