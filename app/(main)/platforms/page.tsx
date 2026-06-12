import { Suspense } from 'react'
import { PlatformLibrary } from '@/components/platforms/PlatformLibrary'
import { PlatformGridSkeleton } from '@/components/platforms/PlatformGrid'
import { getAllPlatforms, getDistinctCountries } from '@/lib/platforms/queries'

export default async function PlatformsPage() {
  const [platforms, countries] = await Promise.all([
    getAllPlatforms(),
    getDistinctCountries(),
  ])

  return (
    <Suspense fallback={<PlatformGridSkeleton />}>
      <PlatformLibrary platforms={platforms} countries={countries} />
    </Suspense>
  )
}
