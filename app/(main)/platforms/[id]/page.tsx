import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { CompareButton } from '@/components/platforms/CompareButton'
import { CountermeasuresPanel } from '@/components/platforms/CountermeasuresPanel'
import { PlatformSpecSheet } from '@/components/platforms/PlatformSpecSheet'
import { CATEGORY_LABELS } from '@/lib/platforms/constants'
import { countryFlag } from '@/lib/platforms/flags'
import {
  getPlatformById,
  getPlatformCountermeasures,
} from '@/lib/platforms/queries'

interface PlatformDetailPageProps {
  params: { id: string }
}

export default async function PlatformDetailPage({ params }: PlatformDetailPageProps) {
  const [platform, countermeasures] = await Promise.all([
    getPlatformById(params.id),
    getPlatformCountermeasures(params.id),
  ])

  if (!platform) notFound()

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="mb-6">
        <Link
          href="/platforms"
          className="inline-flex items-center gap-1.5 text-sm text-t-secondary hover:text-orange transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Platform Library
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-t-primary">{platform.name}</h1>
            <p className="text-t-secondary mt-1">
              {countryFlag(platform.country_of_origin)}{' '}
              {platform.country_of_origin ?? 'Unknown'}
              {platform.manufacturer && ` · ${platform.manufacturer}`}
            </p>
            <div className="mt-2">
              <Badge variant="outline">{CATEGORY_LABELS[platform.category]}</Badge>
            </div>
          </div>
          <CompareButton platformId={platform.id} />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <PlatformSpecSheet platform={platform} />
        <CountermeasuresPanel countermeasures={countermeasures} />
      </div>
    </div>
  )
}
