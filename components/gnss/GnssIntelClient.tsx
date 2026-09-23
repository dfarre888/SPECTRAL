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

export function GnssIntelClient({ constellations, dependencies, incidents }: GnssIntelClientProps) {
  const [tab, setTab] = useState<Tab>('constellations')

  const inst = useMemo(() => {
    const active = constellations.reduce((n, c) => n + (c.satellites_active ?? 0), 0)
    const nominal = constellations.reduce((n, c) => n + (c.satellites_nominal ?? 0), 0)
    const confirmed = incidents.filter((i) => i.confirmed)
    const jammedIds = new Set(confirmed.flatMap((i) => i.affected_constellations))
    const degraded = constellations.filter((c) => c.status !== 'operational').length
    const platforms = new Set(dependencies.map((d) => d.platform_id)).size
    return { active, nominal, confirmed: confirmed.length, jammed: jammedIds.size, degraded, platforms }
  }, [constellations, incidents, dependencies])

  const tabs: { id: Tab; label: string; n: number }[] = [
    { id: 'constellations', label: 'Constellations', n: constellations.length },
    { id: 'vulnerability', label: 'Platform vulnerability', n: inst.platforms },
    { id: 'incidents', label: 'Jamming incidents', n: incidents.length },
  ]

  return (
    <div className="mt-6">
      <div className="fc-inst border-y fc-hair" aria-label="GNSS instruments">
        <div><div className="k">Constellations</div><div className="v">{constellations.length}</div><div className="d">{inst.degraded ? `${inst.degraded} not fully operational` : 'all operational'}</div></div>
        <div><div className="k">Space vehicles active</div><div className="v">{inst.active.toLocaleString('en-AU')}<small>/{inst.nominal.toLocaleString('en-AU')}</small></div><div className="d">across all constellations</div></div>
        <div><div className="k">Under confirmed jamming</div><div className="v glow">{inst.jammed}</div><div className="d">constellations, from {inst.confirmed} confirmed incidents</div></div>
        <div><div className="k">Platforms tracked</div><div className="v">{inst.platforms}</div><div className="d">{dependencies.length} dependency records</div></div>
        <div><div className="k">Incidents on record</div><div className="v">{incidents.length}</div><div className="d">{incidents.length - inst.confirmed} unconfirmed</div></div>
      </div>

      <div className="mt-6 mb-5">
        <div className="seg" role="tablist" aria-label="GNSS views">
          {tabs.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
              {t.label} <span className="font-mono tabular-nums opacity-70">{t.n}</span>
            </button>
          ))}
        </div>
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
