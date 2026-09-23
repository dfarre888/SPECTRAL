import Link from 'next/link'
import type { ConflictCaseStudy } from '@/data/seed-conflicts'

const CONFIDENCE_TONE: Record<string, string> = {
  confirmed: 'green',
  assessed: '',
  estimated: 'amber',
  reported: '',
}

/** The written body of a case study: lessons, ORBAT, platforms, incidents. Lacquer content, no chrome. */
export function CaseStudyDetail({ study, headingLevel = 2 }: { study: ConflictCaseStudy; headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? 'h2' : 'h3'
  return (
    <div className="space-y-7">
      <section>
        <p className="text-[14px] store-text-body leading-relaxed m-0 max-w-[78ch] text-pretty">{study.summary}</p>
      </section>

      <section aria-label="Key lessons">
        <H className="text-[15px] font-semibold text-[var(--store-ink)] m-0 mb-3">Key lessons</H>
        <ol className="m-0 p-0 list-none space-y-2.5 max-w-[78ch]">
          {study.key_lessons.map((l, i) => (
            <li key={l} className="grid grid-cols-[24px_minmax(0,1fr)] gap-x-2 text-[14px] leading-relaxed store-text-body">
              <span className="font-mono tabular-nums text-[12px] store-text-muted pt-[3px]">{String(i + 1).padStart(2, '0')}</span>
              <span className="text-pretty">{l}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-label="ORBAT note" className="pt-6 border-t fc-hair">
        <H className="text-[15px] font-semibold text-[var(--store-ink)] m-0 mb-2">ORBAT note</H>
        <p className="text-[13px] store-text-body leading-relaxed m-0 max-w-[78ch] text-pretty">{study.orbat_note}</p>
      </section>

      {study.related_platform_ids.length ? (
        <section aria-label="Related platforms" className="pt-6 border-t fc-hair">
          <H className="text-[15px] font-semibold text-[var(--store-ink)] m-0 mb-3">Related platforms</H>
          <div className="flex flex-wrap gap-1.5">
            {study.related_platform_ids.map((id) => (
              <Link key={id} href={`/platforms/${id}`} className="tag blue font-mono hover:brightness-125">
                {id}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {study.incidents.length > 0 ? (
        <section aria-label="Incidents" className="pt-6 border-t fc-hair">
          <H className="text-[15px] font-semibold text-[var(--store-ink)] m-0 mb-1">
            Incidents <span className="font-mono font-normal text-[13px] store-text-muted">{study.incidents.length}</span>
          </H>
          <ul className="m-0 p-0 list-none">
            {study.incidents.map((inc) => (
              <li key={inc.id} className="py-4 border-b fc-hair last:border-b-0">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-[14px] font-medium text-[var(--store-ink)]">{inc.title}</span>
                  <span className="font-mono tabular-nums text-[12px] store-text-muted">{inc.date}</span>
                  <span className={`tag ${CONFIDENCE_TONE[inc.confidence] ?? ''} ml-auto`}>{inc.confidence}</span>
                </div>
                <p className="text-[13px] store-text-body leading-relaxed mt-1.5 mb-0 max-w-[78ch] text-pretty">{inc.summary}</p>
                <p className="text-[13px] leading-relaxed mt-2 mb-0 max-w-[78ch] text-pretty">
                  <span className="text-[var(--wb-blue)] font-medium">So what: </span>
                  <span className="text-[var(--store-ink)]">{inc.lesson}</span>
                </p>
                {inc.sources.length ? (
                  <p className="text-[12px] store-text-muted mt-2 mb-0">Sources: {inc.sources.join('; ')}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-[11px] font-mono store-text-muted m-0 pt-2">
        {study.classification} · Source date {study.source_date}
      </p>
    </div>
  )
}
