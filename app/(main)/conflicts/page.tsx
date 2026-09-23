'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ConflictCaseStudyMap } from '@/components/conflict/ConflictCaseStudyMap'
import { CaseStudyDetail } from '@/components/conflict/CaseStudyDetail'
import { DataTable, type DataColumn } from '@/components/ui/DataTable'
import { getConflictCaseStudies, getConflictCaseStudy } from '@/lib/conflicts/seed-queries'
import { CONFLICT_DIGEST, type ConflictDigestEntry } from '@/lib/conflicts/digest'

const THREAT_TONE: Record<ConflictDigestEntry['threatLevel'], string> = {
  LOW: '',
  MEDIUM: 'amber',
  HIGH: 'red',
  CRITICAL: 'red',
}

const THREAT_RANK: Record<ConflictDigestEntry['threatLevel'], number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 }

export default function ConflictsPage() {
  const cases = getConflictCaseStudies()
  const [tab, setTab] = useState<'cases' | 'digest'>('cases')
  const [selectedId, setSelectedId] = useState<string | null>(cases[0]?.id ?? null)
  const selected = selectedId ? getConflictCaseStudy(selectedId) : null

  const digestColumns = useMemo<DataColumn<ConflictDigestEntry>[]>(() => [
    {
      key: 'date',
      header: 'Source Date',
      width: 116,
      sortValue: (d) => d.sourceDate,
      cell: (d) => <span className="font-mono text-[12px] tabular-nums store-text-body">{d.sourceDate}</span>,
    },
    {
      key: 'title',
      header: 'Pattern',
      width: '22%',
      sortValue: (d) => d.title,
      cell: (d) => <span className="text-[13px] font-medium text-[var(--store-ink)]">{d.title}</span>,
    },
    {
      key: 'employment',
      header: 'Employment',
      cell: (d) => <span className="block text-[13px] leading-relaxed store-text-body whitespace-normal">{d.employmentPattern}</span>,
    },
    {
      key: 'counter',
      header: 'Countermeasure',
      cell: (d) => <span className="block text-[13px] leading-relaxed store-text-body whitespace-normal">{d.countermeasure}</span>,
    },
    {
      key: 'threat',
      header: 'Threat',
      width: 108,
      sortValue: (d) => THREAT_RANK[d.threatLevel],
      cell: (d) => <span className={`tag ${THREAT_TONE[d.threatLevel]}`}>{d.threatLevel.charAt(0) + d.threatLevel.slice(1).toLowerCase()}</span>,
    },
    {
      key: 'confidence',
      header: 'Confidence',
      width: 116,
      sortValue: (d) => d.confidence,
      cell: (d) => <span className={`tag ${d.confidence === 'Confirmed' ? 'green' : ''}`}>{d.confidence}</span>,
    },
  ], [])

  return (
    <div className="max-w-[100rem] mx-auto">
      <header>
        <h1 className="page-title m-0">Conflict Intel</h1>
        <p className="page-lede">
          Named engagements and the lessons they carry. OSINT case studies, date of information Jul 2026.
        </p>
      </header>

      <div className="mt-6 mb-6 flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="seg" role="tablist" aria-label="Conflict Intel views">
          <button type="button" role="tab" aria-selected={tab === 'cases'} onClick={() => setTab('cases')}>
            Case studies <span className="font-mono tabular-nums opacity-70">{cases.length}</span>
          </button>
          <button type="button" role="tab" aria-selected={tab === 'digest'} onClick={() => setTab('digest')}>
            OSINT digest <span className="font-mono tabular-nums opacity-70">{CONFLICT_DIGEST.length}</span>
          </button>
        </div>
        <Link href="/conflict" className="fc-action ml-auto">Open the Incident Timeline</Link>
      </div>

      {tab === 'digest' ? (
        <DataTable
          rows={CONFLICT_DIGEST}
          columns={digestColumns}
          rowKey={(d) => d.id}
          defaultSort={{ key: 'date', dir: 'desc' }}
          caption="Curated OSINT conflict digest"
          empty="No digest entries on this instance."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] items-start">
          <nav className="store-panel rounded-2xl overflow-hidden lg:sticky lg:top-0" aria-label="Case studies">
            <div className="px-4 pt-3.5 pb-3 border-b border-[var(--lacquer-line)] flex items-baseline justify-between">
              <h2 className="wb-pane-title text-[15px] m-0">Case studies</h2>
              <span className="text-[12px] font-mono tabular-nums store-text-muted">{cases.length}</span>
            </div>
            <ul className="m-0 p-0 list-none">
              {cases.map((c) => {
                const on = selectedId === c.id
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(c.id)}
                      aria-pressed={on}
                      className={`block w-full text-left px-4 py-3 border-b border-[var(--lacquer-line)] transition-colors duration-150 ${
                        on ? 'bg-[rgba(41,151,255,0.16)]' : 'hover:bg-[rgba(142,142,147,0.10)]'
                      }`}
                    >
                      <span className="flex items-baseline gap-3">
                        <span className={`min-w-0 text-[13px] leading-snug ${on ? 'text-white font-medium' : 'text-[var(--store-ink)]'}`}>{c.name}</span>
                        <span
                          className="ml-auto shrink-0 font-mono tabular-nums text-[12px] store-text-muted"
                          title={`${c.incidents.length} ${c.incidents.length === 1 ? 'incident' : 'incidents'}`}
                        >
                          {c.incidents.length}
                        </span>
                      </span>
                      <span className="block text-[12px] store-text-muted mt-1">
                        {c.region} · <span className="font-mono tabular-nums">{c.period}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>

          {selected ? (
            <div className="min-w-0 flex flex-col gap-6">
              <div>
                <ConflictCaseStudyMap key={selected.id} study={selected} />
              </div>
              <article className="store-panel rounded-2xl p-6 md:p-7">
                <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 mb-5">
                  <div className="min-w-0">
                    <p className="text-[12px] store-text-muted m-0">
                      {selected.region} · <span className="font-mono tabular-nums">{selected.period}</span> · source date <span className="font-mono tabular-nums">{selected.source_date}</span>
                    </p>
                    <h2 className="text-[22px] store-display font-semibold tracking-[-0.015em] leading-tight text-[var(--store-ink)] mt-1.5 mb-0 text-balance">{selected.name}</h2>
                  </div>
                  <Link href={`/conflicts/${selected.id}`} className="btn-glass shrink-0">Open case study</Link>
                </div>
                <CaseStudyDetail study={selected} headingLevel={3} />
              </article>
            </div>
          ) : (
            <p className="store-text-muted text-[13px]">Select a case study.</p>
          )}
        </div>
      )}
    </div>
  )
}
