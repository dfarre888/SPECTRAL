'use client'

/**
 * Automated OSINT leads from the latest imported bundle. Every row says how
 * many independent outlets carried it; nothing here is presented as a finding.
 */
import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { ConflictIncident } from '@/lib/conflicts/types'
import type { IntelBundleManifest } from '@/lib/conflicts/intel-bundle'
import type { TheatreSnapshot } from '@/lib/conflicts/osint-harvest'
import { intelAge } from '@/lib/conflicts/intel-bundle'
import { INCIDENT_TYPE_COLOR, INCIDENT_TYPE_LABEL, normalizeIncidentType } from '@/lib/conflicts/incident-style'
import { DataTable, type DataColumn } from '@/components/ui/DataTable'

type Grade = 'all' | 'probable' | 'possible'

function sourceCount(inc: ConflictIncident): number {
  return inc.source_ref.split(' | ').length
}

export function OsintLeadsPanel({
  incidents,
  manifest,
  attribution,
  snapshots,
}: {
  incidents: ConflictIncident[]
  manifest: IntelBundleManifest
  attribution: string[]
  snapshots?: TheatreSnapshot[] | null
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

  const columns = useMemo<DataColumn<ConflictIncident>[]>(() => [
    {
      key: 'date',
      header: 'Date',
      width: 104,
      sortValue: (r) => r.occurred_at,
      cell: (r) => <span className="font-mono text-[12px] tabular-nums store-text-body">{r.occurred_at.slice(0, 10)}</span>,
    },
    {
      key: 'lead',
      header: 'Lead',
      label: 'Lead title',
      sortValue: (r) => r.incident_title,
      cell: (r) => {
        const t = normalizeIncidentType(r.incident_type)
        return (
          <span className="block min-w-0">
            <span className="block text-[13px] text-[var(--store-ink)] leading-snug line-clamp-2" title={r.incident_title}>{r.incident_title}</span>
            <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] store-text-muted">
              <span>{r.conflict_name}</span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1.5" style={{ color: INCIDENT_TYPE_COLOR[t] }}>
                <i className="h-1.5 w-1.5 rounded-full" style={{ background: INCIDENT_TYPE_COLOR[t] }} aria-hidden />
                {INCIDENT_TYPE_LABEL[t]}
              </span>
              {r.platforms_involved.length ? (
                <>
                  <span aria-hidden>·</span>
                  <span className="font-mono text-[var(--wb-blue)]">{r.platforms_involved.join(', ')}</span>
                </>
              ) : null}
            </span>
          </span>
        )
      },
    },
    {
      key: 'grade',
      header: 'Grade',
      width: 100,
      sortValue: (r) => r.confidence,
      cell: (r) => r.confidence === 'probable'
        ? <span className="tag violet">probable</span>
        : <span className="text-[12px] store-text-muted">{r.confidence}</span>,
    },
    {
      key: 'evidence',
      header: 'Evidence',
      width: 112,
      align: 'right',
      sortValue: (r) => (r.incident_type === 'gnss_denial' ? null : sourceCount(r)),
      cell: (r) => (
        <span className="block text-[12px]">
          <span className="store-text-body">{r.incident_type === 'gnss_denial' ? 'ADS-B' : `${sourceCount(r)} src`}</span>
          {r.evidence?.thermal24h ? <span className="block text-[11.5px] text-[var(--wb-ir)]">{r.evidence.thermal24h} thermal</span> : null}
        </span>
      ),
    },
  ], [])

  const liveTheatres = snapshots ? snapshots.filter((t) => t.gdeltEvents24h + t.thermal24h + t.milAirborne > 0).slice(0, 12) : []

  return (
    <section className="space-y-6" aria-label="Automated OSINT leads">
      <div className="fc-inst border-y fc-hair" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))' }}>
        <div><div className="k">Leads in bundle</div><div className="v">{incidents.length}</div><div className="d">{age.label} · produced by {manifest.producedBy}</div></div>
        <div><div className="k">Corroborated</div><div className="v glow">{counts.probable}</div><div className="d">3+ outlets, or 2 with a tier-1 wire</div></div>
        <div><div className="k">GNSS interference clusters</div><div className="v">{counts.gnss}</div><div className="d">from ADS-B integrity reports (gpsjam)</div></div>
        <div><div className="k">Theatres</div><div className="v">{counts.theatres}</div><div className="d">headline-level location, not geocoded</div></div>
      </div>

      {liveTheatres.length ? (
        <div>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-3">
            <h3 className="wb-pane-title text-[15px] m-0">Theatre picture, last 24 h</h3>
            <span className="text-[12px] store-text-muted">
              Thermal: VIIRS detections within 300 km. Events: GDELT conflict-coded. Aircraft: military ADS-B at snapshot.
            </span>
          </div>
          <div className="store-panel rounded-2xl grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 overflow-hidden">
            {liveTheatres.map((t) => (
              <div key={t.key} className="min-w-0 px-4 py-3 border-b border-r border-[var(--lacquer-line)] -mb-px -mr-px">
                <div className="text-[13px] text-[var(--store-ink)] font-medium truncate" title={t.theatre}>{t.theatre}</div>
                <div className="mt-1.5 grid grid-cols-3 gap-2 font-mono tabular-nums">
                  <span><span className="block text-[15px] text-[var(--wb-ir)]">{t.thermal24h}</span><span className="block text-[11px] store-text-muted font-sans">thermal</span></span>
                  <span><span className="block text-[15px] text-[var(--store-ink)]">{t.gdeltEvents24h}</span><span className="block text-[11px] store-text-muted font-sans">events</span></span>
                  <span><span className="block text-[15px] text-[var(--wb-blue)]">{t.milAirborne}</span><span className="block text-[11px] store-text-muted font-sans">mil ac</span></span>
                </div>
                {t.milTypes.length ? <div className="text-[11.5px] font-mono store-text-muted truncate mt-1.5" title={t.milTypes.map((x) => `${x.type}×${x.n}`).join(' ')}>{t.milTypes.slice(0, 3).map((x) => `${x.type}×${x.n}`).join(' ')}</div> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="seg" role="group" aria-label="Lead grade">
          <button type="button" aria-pressed={grade === 'all'} onClick={() => setGrade('all')}>
            All leads <span className="font-mono tabular-nums opacity-70">{incidents.length}</span>
          </button>
          <button type="button" aria-pressed={grade === 'probable'} onClick={() => setGrade('probable')}>
            Probable <span className="font-mono tabular-nums opacity-70">{counts.probable}</span>
          </button>
          <button type="button" aria-pressed={grade === 'possible'} onClick={() => setGrade('possible')}>
            Possible <span className="font-mono tabular-nums opacity-70">{counts.possible}</span>
          </button>
        </div>
        <span className="text-[12px] store-text-muted">Automated leads, unverified. Click a row for the outlets behind it.</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] items-start">
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(r) => r.id}
          onRowClick={(r) => setSelected(r.id)}
          selectedKey={selected}
          maxHeight="calc(100vh - 220px)"
          empty="No leads at this grade."
          caption="Automated OSINT leads"
        />

        <aside className="store-panel rounded-2xl p-5 min-w-0 lg:sticky lg:top-0" aria-label="Lead detail">
          {!sel ? (
            <div className="py-6 text-center">
              <p className="text-[13px] store-text-body m-0">Select a lead to see the outlets behind it.</p>
              <p className="text-[12px] store-text-muted mt-1.5 mb-0">Every lead links to the reporting that produced it.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-[16px] store-display font-semibold tracking-[-0.01em] text-[var(--store-ink)] m-0 leading-snug text-balance">{sel.incident_title}</h3>
                <p className="text-[12px] font-mono tabular-nums store-text-muted mt-1.5 mb-0">{sel.occurred_at.slice(0, 16).replace('T', ' ')}Z · {sel.confidence} · {sel.classification}</p>
              </div>
              <p className="text-[13px] store-text-body leading-relaxed text-pretty m-0">{sel.summary}</p>
              {sel.evidence ? (
                <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1.5 text-[12px] m-0 pt-3 border-t fc-hair">
                  <dt className="store-text-muted">Independent outlets</dt><dd className="text-[var(--store-ink)] m-0 font-mono tabular-nums text-right">{sel.evidence.outlets} ({sel.evidence.tier1} tier-1)</dd>
                  {sel.evidence.thermal24h != null ? <><dt className="store-text-muted">Thermal anomalies, 24 h</dt><dd className="text-[var(--wb-ir)] m-0 font-mono tabular-nums text-right">{sel.evidence.thermal24h} within {sel.evidence.thermalKm} km</dd></> : null}
                  {sel.evidence.gdeltEvents24h != null ? <><dt className="store-text-muted">GDELT conflict events, 24 h</dt><dd className="text-[var(--store-ink)] m-0 font-mono tabular-nums text-right">{sel.evidence.gdeltEvents24h} within {sel.evidence.thermalKm} km</dd></> : null}
                </dl>
              ) : null}
              {sources.length ? (
                <div className="pt-3 border-t fc-hair">
                  <div className="text-[12px] store-text-muted mb-1.5">Outlets</div>
                  <ul className="space-y-1 m-0 p-0 list-none">
                    {sources.map((u) => {
                      let host = u
                      try { host = new URL(u).hostname.replace(/^www\./, '') } catch { /* keep raw */ }
                      return <li key={u}><a href={u} target="_blank" rel="noopener noreferrer" className="text-[13px] text-[var(--wb-blue)] hover:underline break-all">{host}</a></li>
                    })}
                  </ul>
                </div>
              ) : null}
              {sel.platforms_involved.length ? (
                <div className="pt-3 border-t fc-hair">
                  <div className="text-[12px] store-text-muted mb-1.5">Catalogue platforms named</div>
                  <div className="flex flex-wrap gap-1.5">
                    {sel.platforms_involved.map((id) => (
                      <Link key={id} href={`/force-catalog?tab=force&q=${encodeURIComponent(id)}`} className="tag blue font-mono hover:brightness-125">{id}</Link>
                    ))}
                  </div>
                </div>
              ) : null}
              {sel.incident_type === 'gnss_denial' ? <Link href="/gnss" className="inline-block text-[13px] text-[var(--wb-blue)] hover:underline">Open GNSS Intelligence</Link> : null}
            </div>
          )}
        </aside>
      </div>
      <p className="text-[12px] store-text-muted m-0 max-w-[110ch] text-pretty">Sources: {attribution.join(' · ')}</p>
    </section>
  )
}
