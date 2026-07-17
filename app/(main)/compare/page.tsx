import Link from 'next/link'
import { GitCompare } from 'lucide-react'
import { redirect } from 'next/navigation'
import { HubPageShell } from '@/components/hub/HubPageShell'
import { EmptyState } from '@/components/ui/empty-state'
import { StorePanel } from '@/components/ui/store-surface'
import { Badge } from '@/components/ui/badge'
import { CompareEngagement } from '@/components/compare/CompareEngagement'
import { PlatformThumbnail } from '@/components/platforms/PlatformThumbnail'
import { getPlatformsByIds } from '@/lib/platforms/queries'

interface ComparePageProps {
  searchParams: { ids?: string; a?: string; b?: string }
}

const DEFAULT_COMPARE_PAIR = ['shahed-136', 'mq-9-reaper'] as const

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
    <HubPageShell
      eyebrow="Engagement Analysis"
      title="Platform Compare"
      subtitle="Head-to-head OSINT dossier comparison — Shahed vs MALE ISR default; override with ?ids= or ?a=&b=."
    >
      {platforms.length === 0 ? (
        <EmptyState
          icon={GitCompare}
          title="No platforms selected"
          description="Open Platform Library and add up to two platforms with the Compare tray at the bottom of the grid."
          primaryAction={{ href: '/platforms', label: 'Open Platform Library' }}
          secondaryAction={{ href: '/overlay', label: 'SAM engagement analysis →' }}
        />
      ) : (
        <div className="space-y-4">
          <p className="text-xs font-mono store-text-muted">
            {platforms.length} platform{platforms.length !== 1 ? 's' : ''} selected
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {platforms.map((p) => (
              <StorePanel key={p.id} className="p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <PlatformThumbnail id={p.id} name={p.name} size="lg" />
                  <h2 className="font-bold text-white">{p.name}</h2>
                </div>
                <p className="text-sm store-text-body">{p.country_of_origin}</p>
                <Badge variant="outline">{p.category}</Badge>
                <div className="text-xs font-mono store-text-body space-y-1 pt-2">
                  <p>Range: {p.range_km ?? '—'} km</p>
                  <p>Ceiling: {p.service_ceiling_m ?? '—'} m</p>
                  <p>Speed: {p.max_speed_kmh ?? '—'} km/h</p>
                </div>
                <Link
                  href={`/platforms/${p.id}`}
                  className="text-[var(--store-accent)] text-xs hover:opacity-80 inline-block pt-2"
                >
                  View full spec →
                </Link>
              </StorePanel>
            ))}
          </div>
          <CompareEngagement platforms={platforms} />
        </div>
      )}
    </HubPageShell>
  )
}
