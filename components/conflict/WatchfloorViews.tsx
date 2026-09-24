'use client'

import { useEffect, useState, type ReactNode } from 'react'

export type WatchfloorView = 'incidents' | 'reporting' | 'leads'

const VIEWS: { id: WatchfloorView; label: string }[] = [
  { id: 'incidents', label: 'Incidents' },
  { id: 'reporting', label: 'Reporting' },
  { id: 'leads', label: 'OSINT leads' },
]

interface Props {
  counts: Partial<Record<WatchfloorView, number>>
  incidents: ReactNode
  reporting: ReactNode
  leads: ReactNode
}

/**
 * Three views of the same feed. The choice lives in ?view= so a presenter can
 * bookmark or link straight to a view. Panes stay mounted: the Cesium map in
 * Incidents is expensive to rebuild.
 */
export function WatchfloorViews({ counts, incidents, reporting, leads }: Props) {
  const [view, setView] = useState<WatchfloorView>('incidents')

  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get('view')
    if (v === 'reporting' || v === 'leads' || v === 'incidents') setView(v)
  }, [])

  const choose = (v: WatchfloorView) => {
    setView(v)
    const url = new URL(window.location.href)
    if (v === 'incidents') url.searchParams.delete('view')
    else url.searchParams.set('view', v)
    window.history.replaceState(null, '', url.toString())
  }

  return (
    <>
      <div className="seg mt-5 mb-5" role="tablist" aria-label="Watchfloor view">
        {VIEWS.map((v) => (
          <button key={v.id} type="button" role="tab" aria-selected={view === v.id} onClick={() => choose(v.id)}>
            {v.label}
            {counts[v.id] != null ? <span className="font-mono text-[11px] opacity-70">{counts[v.id]}</span> : null}
          </button>
        ))}
      </div>
      <div role="tabpanel" hidden={view !== 'incidents'}>{incidents}</div>
      <div role="tabpanel" hidden={view !== 'reporting'}>{reporting}</div>
      <div role="tabpanel" hidden={view !== 'leads'}>{leads}</div>
    </>
  )
}
