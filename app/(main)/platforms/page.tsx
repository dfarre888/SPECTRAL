import { Suspense } from 'react'
import { PlatformLibrary } from '@/components/platforms/PlatformLibrary'
import { PlatformGridSkeleton } from '@/components/platforms/PlatformGrid'
import { getAllPlatforms, getDistinctCountries } from '@/lib/platforms/queries'
import { createClient } from '@/lib/supabase/server'
import type { SovereignPlatform } from '@/lib/platforms/sovereign-types'

async function fetchSovereignPlatforms(): Promise<SovereignPlatform[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('spectral_sovereign_platforms')
    .select('*')
    .order('origin_country')
  return (data ?? []) as SovereignPlatform[]
}

export default async function PlatformsPage() {
  const [platforms, countries, sovereignPlatforms] = await Promise.all([
    getAllPlatforms(),
    getDistinctCountries(),
    fetchSovereignPlatforms(),
  ])

  return (
    <Suspense fallback={<PlatformGridSkeleton />}>
      <PlatformLibrary
        platforms={platforms}
        countries={countries}
        sovereignPlatforms={sovereignPlatforms}
      />
    </Suspense>
  )
}
