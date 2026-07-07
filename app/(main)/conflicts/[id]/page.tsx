import Link from 'next/link'
import { HubPageShell } from '@/components/hub/HubPageShell'
import { StorePanel } from '@/components/ui/store-surface'

interface ConflictDetailPageProps {
  params: { id: string }
}

export default function ConflictDetailPage({ params }: ConflictDetailPageProps) {
  const slug = params.id.replace(/-/g, ' ')

  return (
    <HubPageShell
      eyebrow="Case Studies"
      title={slug}
      subtitle="Conflict incident detail — OSINT timeline"
    >
      <StorePanel className="p-8 space-y-4 max-w-2xl">
        <p className="text-sm store-text-body leading-relaxed">
          Full conflict timeline — coming in next release.
        </p>
        <p className="text-[10px] font-mono store-text-muted">
          Incident ID: {params.id}
        </p>
        <Link
          href="/conflicts"
          className="inline-flex text-xs font-mono text-cyan hover:underline underline-offset-2"
        >
          ← Back to Conflict Intel
        </Link>
      </StorePanel>
    </HubPageShell>
  )
}
