import Link from 'next/link'
import { GitCompare } from 'lucide-react'
import { HubPageShell } from '@/components/hub/HubPageShell'
import { StorePanel } from '@/components/ui/store-surface'
import { Badge } from '@/components/ui/badge'
import { getPlatformsByIds } from '@/lib/platforms/queries'

interface ComparePageProps {
  searchParams: { ids?: string }
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const ids = searchParams.ids?.split(',').filter(Boolean) ?? []
  const platforms = ids.length > 0 ? await getPlatformsByIds(ids) : []

  return (
    <HubPageShell
      eyebrow="Engagement Analysis"
      title="1v1 Overlay"
      subtitle="Head-to-head platform comparison"
    >
      {platforms.length === 0 ? (
        <StorePanel className="p-12 flex flex-col items-center justify-center text-center">
          <GitCompare className="h-10 w-10 store-text-muted mb-4" />
          <p className="text-white font-medium">No platforms selected</p>
          <p className="store-text-body text-sm mt-1 font-mono mb-4">
            Add platforms from the Platform Library using the Compare button.
          </p>
          <Link href="/platforms" className="text-[var(--store-accent)] text-sm hover:opacity-80">
            Go to Platform Library →
          </Link>
        </StorePanel>
      ) : (
        <div className="space-y-4">
          <p className="text-xs font-mono store-text-muted">
            {platforms.length} platform{platforms.length !== 1 ? 's' : ''} selected
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {platforms.map((p) => (
              <StorePanel key={p.id} className="p-4 space-y-2">
                <h2 className="font-bold text-white">{p.name}</h2>
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
          <p className="text-xs font-mono store-text-muted">
            Full engagement analysis UI — coming in 1v1 Overlay module.
          </p>
        </div>
      )}
    </HubPageShell>
  )
}
