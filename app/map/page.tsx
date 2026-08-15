import { Suspense } from 'react'
import { getMapAssets } from '@/lib/map/queries'
import MapIntelView from '@/app/map/MapIntelView'
import { GlobeSkeleton } from '@/components/ui/loading-skeleton'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Map Intel — Spectral',
  description: 'Terrain-anchored UAS/C-UAS placement and defeat overlap visualisation',
}

export default async function MapPage() {
  const assets = await getMapAssets()

  return (
    <Suspense fallback={<GlobeSkeleton className="h-full min-h-[320px]" />}>
      <MapIntelView initialAssets={assets} />
    </Suspense>
  )
}
