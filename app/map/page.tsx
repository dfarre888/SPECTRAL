import { Suspense } from 'react'
import { getMapAssets } from '@/lib/map/queries'
import MapIntelView from '@/app/map/MapIntelView'

export const metadata = {
  title: 'Map Intel — Spectral',
  description: 'Terrain-anchored UAS/C-UAS placement and defeat overlap visualisation',
}

export default async function MapPage() {
  const assets = await getMapAssets()

  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center text-t-muted font-mono text-sm">
          Loading Map Intel…
        </div>
      }
    >
      <MapIntelView initialAssets={assets} />
    </Suspense>
  )
}
