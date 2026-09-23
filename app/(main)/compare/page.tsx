import Link from 'next/link'
import { GitCompare, Plus } from 'lucide-react'
import { redirect } from 'next/navigation'
import { EmptyState } from '@/components/ui/empty-state'
import { CompareEngagement } from '@/components/compare/CompareEngagement'
import { CompareTable } from '@/components/compare/CompareTable'
import { getPlatformsByIds } from '@/lib/platforms/queries'

interface ComparePageProps {
  searchParams: { ids?: string; a?: string; b?: string }
}

const DEFAULT_COMPARE_PAIR = ['shahed-136', 'mq-9-reaper'] as const
/**
 * Mirrors MAX_COMPARE_PLATFORMS in lib/stores/compare-store. That module is a
 * client module, so a server component cannot read the value from it.
 */
const MAX_COMPARE_PLATFORMS = 4

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const fromPair = [searchParams.a, searchParams.b].filter(Boolean) as string[]
  const ids =
    searchParams.ids?.split(',').filter(Boolean) ??
    (fromPair.length > 0 ? fromPair : [])

  if (ids.length === 0) {
    redirect(`/compare?ids=${DEFAULT_COMPARE_PAIR.join(',')}`)
  }

  const platforms = await getPlatformsByIds(ids)

  return (
    <div className="pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="page-title">Platform Compare</h1>
          <p className="page-lede">
            Side-by-side OSINT dossiers. Opens on Shahed-136 and MQ-9 Reaper; pick up to {MAX_COMPARE_PLATFORMS} platforms
            in the Platform Library, or set them with ?ids= in the address.
          </p>
        </div>
        {platforms.length > 0 && platforms.length < MAX_COMPARE_PLATFORMS ? (
          <Link href="/platforms" className="btn-glass shrink-0">
            <Plus size={15} aria-hidden />
            Add platform
          </Link>
        ) : null}
      </header>

      <div className="mt-6">
        {platforms.length === 0 ? (
          <EmptyState
            icon={GitCompare}
            title="No platforms selected"
            description="Open Platform Library and tick up to four platforms, then press Compare in the tray."
            primaryAction={{ href: '/platforms', label: 'Open Platform Library' }}
            secondaryAction={{ href: '/overlay', label: 'SAM engagement analysis' }}
          />
        ) : (
          <div className="space-y-6">
            <CompareTable platforms={platforms} ids={ids} />
            <CompareEngagement platforms={platforms} />
          </div>
        )}
      </div>
    </div>
  )
}
