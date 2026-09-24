import Link from 'next/link'

interface ConflictDetailPageProps {
  params: { id: string }
}

export default function ConflictIncidentDetailPage({ params }: ConflictDetailPageProps) {
  const slug = params.id.replace(/-/g, ' ')

  return (
    <div className="max-w-[72rem] mx-auto">
      <nav aria-label="Breadcrumb" className="mb-3 text-[12px] store-text-muted">
        <Link href="/conflict" className="hover:text-[var(--store-ink)] transition-colors duration-150">Watchfloor</Link>
        <span aria-hidden className="mx-2">/</span>
        <span>Incident</span>
      </nav>
      <header>
        <h1 className="page-title m-0 capitalize">{slug}</h1>
        <p className="page-lede">Conflict incident, OSINT.</p>
      </header>

      <div className="store-panel rounded-2xl p-7 mt-7 max-w-2xl space-y-4">
        <p className="text-[14px] store-text-body leading-relaxed m-0">
          Incidents do not have a standalone page yet. Every imported incident, with its sources and engagement brief, is on the Incident Timeline.
        </p>
        <p className="text-[12px] store-text-muted m-0">
          Incident ID <span className="font-mono text-[var(--store-ink-soft)]">{params.id}</span>
        </p>
        <Link href="/conflict" className="btn-glass">Open the Watchfloor</Link>
      </div>
    </div>
  )
}
