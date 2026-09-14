'use client'

/**
 * Automated OSINT leads from the latest imported bundle. Every row says how
 * many independent outlets carried it; nothing here is presented as a finding.
 */
import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { ConflictIncident } from '@/lib/conflicts/types'
import type { IntelBundleManifest } from '@/lib/conflicts/intel-bundle'
import { intelAge } from '@/lib/conflicts/intel-bundle'
import { INCIDENT_TYPE_COLOR, INCIDENT_TYPE_LABEL, normalizeIncidentType } from '@/lib/conflicts/incident-style'

type Grade = 'all' | 'probable' | 'possible'

export function OsintLeadsPanel({
  incidents,
  manifest,
  attribution,
}: {
  incidents: ConflictIncident[]
  manifest: IntelBundleManifest
  attribution: string[]
}) {
  const [grade, setGrade] = useState<Grade>('all')
  const [selected, setSelected] = useState<string | null>(null)
  const age = intelAge(manifest.generatedAt)

  const rows = useMemo(() => {
    const list = incidents.filter((i) => grade === 'all' || i.confidence === grade)
    return [...list].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
  }, [incidents, grade])

  const counts = useMemo(() => ({
    probable: incidents.filter((i) => i.confidence === 'probable').length,
    possible: incidents.filter((i) => i.confidence === 'possible').length,
    gnss: incidents.filter((i) => i.incident_type === 'gnss_denial').length,
    theatres: new Set(incidents.map((i) => i.conflict_name)).size,
  }), [incidents])

  const sel = rows.find((r) => r.id === selected) ?? null
  const sources = sel ? sel.source_ref.split(' | ').filter((s) => s.startsWith('http')) : []

  return (
    <section className="space-y-4" aria-label="Automated OSINT leads">
      <div className="fc-inst border-b fc-hair" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))' }}>
        <div><div className="k">Leads in bundle</div><div className="v">{incidents.length}</div><div className="d">{age.label} · produced by {manifest.producedBy}</div></div>
        <div><div className="k">Corroborated</div><div className="v glow">{counts.probable}</div><div className="d">≥3 outlets, or 2 with a tier-1 wire</div></div>
        <div><div className="k">GNSS interference clusters</div><div className="v">{counts.gnss}</div><div className="d">from ADS-B integrity reports (gpsjam)</div></div>
        <div><div className="k">Theatres</div><div className="v">{counts.theatres}</div><div className="d">headline-level location, not geocoded</div></div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b fc-hair pb-3" role="group" aria-label="Lead grade">
        {(['all', 'probable', 'possible'] as const).map((g) => (
          <button key={g} type="button" aria-pressed={grade === g} onClick={() => setGrade(g)} className="btn-e sm capitalize">{g === 'all' ? 'All leads' : g}</button>
        ))}
        <span className="ml-auto text-[11px] font-mono store-text-muted">Automated leads, unverified. Sources: {attribution.join(' · ')}</span>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <ul className="max-h-[560px] overflow-y-auto">
          {rows.map((inc) => {
            const t = normalizeIncidentType(inc.incident_type)
            const n = inc.source_ref.split(' | ').length
            return (
              <li key={inc.id}>
                <button type="button" onClick={() => setSelected(inc.id)} aria-pressed={selected === inc.id}
                  className={`w-full text-left px-3 py-3 border-b fc-hair grid grid-cols-[6px_minmax(0,1fr)_auto] gap-x-3 transition-colors duration-150 ${selected === inc.id ? 'bg-[rgba(41,151,255,0.08)]' : 'hover:bg-[var(--store-surface)]'}`}>
                  <i className="mt-[6px] h-1.5 w-1.5 rounded-full" style={{ background: INCIDENT_TYPE_COLOR[t] }} aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-[11px] font-mono store-text-muted">{inc.occurred_at.slice(0, 10)} · {inc.conflict_name} · <span style={{ color: INCIDENT_TYPE_COLOR[t] }}>{INCIDENT_TYPE_LABEL[t]}</span></span>
                    <span className="block text-[13px] text-[var(--store-ink)] mt-0.5 line-clamp-2">{inc.incident_title}</span>
                    {inc.platforms_involved.length ? <span className="block text-[11px] font-mono text-[var(--wb-blue)] mt-0.5">{inc.platforms_involved.join(', ')}</span> : null}
                  </span>
                  <span className="text-right">
                    <span className={`block text-[11px] ${inc.confidence === 'probable' ? 'text-[var(--store-ink)]' : 'store-text-muted'}`}>{inc.confidence}</span>
                    <span className="block text-[11px] font-mono store-text-muted mt-0.5">{inc.incident_type === 'gnss_denial' ? 'ADS-B' : `${n} src`}</span>
                  </span>
                </button>
              </li>
            )
          })}
          {rows.length === 0 ? <li className="px-3 py-8 text-[11px] font-mono store-text-muted text-center">No leads at this grade.</li> : null}
        </ul>

        <aside className="lg:border-l fc-hair lg:pl-7 min-w-0">
          {!sel ? (
            <p className="text-[11px] font-mono store-text-muted pt-2">Select a lead to see the outlets behind it.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-[15px] store-display font-semibold tracking-[-0.01em] text-[var(--store-ink)] m-0 leading-tight text-balance">{sel.incident_title}</h3>
                <p className="text-[11px] font-mono store-text-muted mt-1">{sel.occurred_at.slice(0, 16).replace('T', ' ')}Z · {sel.confidence} · {sel.classification}</p>
              </div>
              <p className="text-[12px] store-text-body leading-relaxed text-pretty m-0">{sel.summary}</p>
              {sources.length ? (
                <div>
                  <div className="text-[11px] store-text-muted mb-1.5">Outlets</div>
                  <ul className="space-y-1">
                    {sources.map((u) => {
                      let host = u
                      try { host = new URL(u).hostname.replace(/^www\./, '') } catch { /* keep raw */ }
                      return <li key={u}><a href={u} target="_blank" rel="noopener noreferrer" className="text-[12px] text-[var(--wb-blue)] hover:underline break-all">{host}</a></li>
                    })}
                  </ul>
                </div>
              ) : null}
              {sel.platforms_involved.length ? (
                <div>
                  <div className="text-[11px] store-text-muted mb-1.5">Catalogue platforms named</div>
                  <ul className="space-y-1">
                    {sel.platforms_involved.map((id) => (
                      <li key={id}><Link href={`/force-catalog?tab=force&q=${encodeURIComponent(id)}`} className="text-[12px] font-mono text-[var(--wb-blue)] hover:underline">{id}</Link></li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {sel.incident_type === 'gnss_denial' ? <Link href="/gnss" className="inline-block text-[12px] text-[var(--wb-blue)] hover:underline">Open GNSS Intelligence</Link> : null}
            </div>
          )}
        </aside>
      </div>
    </section>
  )
}
