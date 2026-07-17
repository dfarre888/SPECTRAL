import Link from 'next/link'
import { notFound } from 'next/navigation'
import { HubPageShell } from '@/components/hub/HubPageShell'
import { OpsPanel } from '@/components/ui/ops-panel'
import { StorePanel } from '@/components/ui/store-surface'
import { getConflictCaseStudy } from '@/lib/conflicts/seed-queries'

interface ConflictDetailPageProps {
  params: { id: string }
}

export default function ConflictDetailPage({ params }: ConflictDetailPageProps) {
  const study = getConflictCaseStudy(params.id)
  if (!study) notFound()

  return (
    <HubPageShell
      eyebrow="Case Studies"
      title={study.name}
      subtitle={`${study.region} · ${study.period} · OSINT case study`}
    >
      <div className="space-y-4 max-w-4xl">
        <OpsPanel title="Threat assessment" kicker={study.classification}>
          <p className="text-sm store-text-body leading-relaxed">{study.summary}</p>
        </OpsPanel>
        <OpsPanel title="ORBAT note" kicker="Employment">
          <p className="text-sm store-text-body font-mono">{study.orbat_note}</p>
        </OpsPanel>
        <StorePanel className="p-6 space-y-5">
        <div>
          <h3 className="text-xs font-semibold store-text-muted uppercase mb-2">Key lessons</h3>
          <ul className="list-disc list-inside space-y-1 text-sm store-text-body">
            {study.key_lessons.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-xs font-semibold store-text-muted uppercase mb-2">Related platforms</h3>
          <div className="flex flex-wrap gap-2">
            {study.related_platform_ids.map((id) => (
              <Link
                key={id}
                href={`/platforms/${id}`}
                className="px-2 py-0.5 rounded-lg store-panel-inner text-[11px] font-mono text-cyan hover:border-[var(--store-accent-border)]"
              >
                {id}
              </Link>
            ))}
          </div>
        </div>
        {study.incidents.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold store-text-muted uppercase mb-2">Incidents</h3>
            {study.incidents.map((inc) => (
              <div key={inc.id} className="store-panel-inner rounded-xl p-3 mb-2">
                <p className="text-sm font-medium text-white">
                  {inc.title}{' '}
                  <span className="store-text-muted font-mono text-xs">({inc.date})</span>
                </p>
                <p className="text-xs store-text-body mt-1">{inc.summary}</p>
                <p className="text-xs font-mono text-[var(--store-accent)] mt-2">So what: {inc.lesson}</p>
                <p className="text-[10px] store-text-muted mt-1">
                  Confidence: {inc.confidence} · {inc.sources.join('; ')}
                </p>
              </div>
            ))}
          </div>
        )}
        <Link
          href="/conflicts"
          className="inline-flex text-xs font-mono text-cyan hover:underline underline-offset-2"
        >
          ← Back to Conflict Intel
        </Link>
      </StorePanel>
      </div>
    </HubPageShell>
  )
}
