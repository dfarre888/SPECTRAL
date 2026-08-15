import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { CompareButton } from '@/components/platforms/CompareButton'
import { PlatformThumbnail } from '@/components/platforms/PlatformThumbnail'
import { CountermeasuresPanel } from '@/components/platforms/CountermeasuresPanel'
import { PayloadCompatPanel } from '@/components/platforms/PayloadCompatPanel'
import { PlatformSpecSheet } from '@/components/platforms/PlatformSpecSheet'
import { SamDefeatPanel } from '@/components/platforms/SamDefeatPanel'
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
      <nav className="sticky top-0 z-20 -mx-4 px-4 py-2 mb-4 border-b border-[var(--store-line)] bg-[var(--store-bg)]/95 backdrop-blur-sm flex flex-wrap gap-2">
        <a href="#specs" className="text-[10px] font-mono px-2 py-1 rounded-lg border border-[var(--store-line)] store-text-muted hover:border-[var(--store-accent-border)]">Specifications</a>
        <a href="#countermeasures" className="text-[10px] font-mono px-2 py-1 rounded-lg border border-[var(--store-line)] store-text-muted hover:border-[var(--store-accent-border)]">Countermeasures</a>
        <a href="#payloads" className="text-[10px] font-mono px-2 py-1 rounded-lg border border-[var(--store-line)] store-text-muted hover:border-[var(--store-accent-border)]">Payloads</a>
        <a href="#sam" className="text-[10px] font-mono px-2 py-1 rounded-lg border border-[var(--store-line)] store-text-muted hover:border-[var(--store-accent-border)]">SAM defeat</a>
      </nav>
      <div className="mb-6">
        <Link
          href="/platforms"
          className="inline-flex items-center gap-1.5 text-sm store-text-body hover:text-[var(--store-accent)] transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Platform Library
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex gap-4 items-start">
            <PlatformThumbnail id={platform.id} name={platform.name} size="xl" rounded="lg" />
            <div>
            <h1 className="text-2xl font-bold text-white">{platform.name}</h1>
            <p className="store-text-body mt-1">
              {countryFlag(platform.country_of_origin)}{' '}
              {platform.country_of_origin ?? 'Unknown'}
              {platform.manufacturer && ` · ${platform.manufacturer}`}
            </p>
            <div className="mt-2">
              <Badge variant="outline">{CATEGORY_LABELS[platform.category]}</Badge>
            </div>
            </div>
          </div>
          <CompareButton platformId={platform.id} />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div id="specs"><PlatformSpecSheet platform={platform} /></div>
        <div className="space-y-6">
          <div id="countermeasures"><CountermeasuresPanel countermeasures={countermeasures} /></div>
          <PayloadCompatPanel platform={platform} />
        </div>
      </div>

      <div id="sam" className="mt-6">
        <SamDefeatPanel platformId={platform.id} />
      </div>
    </div>
  )
}
