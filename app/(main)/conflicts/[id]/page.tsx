import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ConflictCaseStudyMap } from '@/components/conflict/ConflictCaseStudyMap'
import { CaseStudyDetail } from '@/components/conflict/CaseStudyDetail'
import { getConflictCaseStudy } from '@/lib/conflicts/seed-queries'
import { caseStudyToMapIncidents } from '@/lib/conflicts/case-study-map'

interface ConflictDetailPageProps {
  params: { id: string }
}

export default function ConflictDetailPage({ params }: ConflictDetailPageProps) {
  const study = getConflictCaseStudy(params.id)
  if (!study) notFound()

  const mapIncidents = caseStudyToMapIncidents(study)

  return (
    <div className="max-w-[72rem] mx-auto">
      <nav aria-label="Breadcrumb" className="mb-3 text-[12px] store-text-muted">
        <Link href="/conflicts" className="hover:text-[var(--store-ink)] transition-colors duration-150">Case Studies</Link>
        <span aria-hidden className="mx-2">/</span>
        <span>Case study</span>
      </nav>
      <header>
        <h1 className="page-title m-0">{study.name}</h1>
        <p className="page-lede">
          {study.region} · <span className="font-mono tabular-nums">{study.period}</span> · OSINT case study, source date{' '}
          <span className="font-mono tabular-nums">{study.source_date}</span>
        </p>
      </header>

      <div className="mt-7 flex flex-col items-start gap-6">
        {mapIncidents.length > 0 ? <div className="w-full"><ConflictCaseStudyMap key={study.id} study={study} /></div> : null}
        <article className="w-full store-panel rounded-2xl p-6 md:p-8">
          <CaseStudyDetail study={study} />
        </article>
        <Link href="/conflicts" className="fc-action">Back to Case Studies</Link>
      </div>
    </div>
  )
}
