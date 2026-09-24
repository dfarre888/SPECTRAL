import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { CompareButton } from '@/components/platforms/CompareButton'
import { ConfidenceBadge } from '@/components/platforms/ConfidenceBadge'
import { PlatformImage } from '@/components/platforms/PlatformImage'
import { CountermeasuresPanel } from '@/components/platforms/CountermeasuresPanel'
import { PayloadCompatPanel } from '@/components/platforms/PayloadCompatPanel'
import { PlatformSpecSheet, formatDateOfInformation } from '@/components/platforms/PlatformSpecSheet'
import { SamDefeatPanel } from '@/components/platforms/SamDefeatPanel'
import { categoryLabel, fmtNum, keyFigures, knownFlag, publishedSpecs } from '@/components/platforms/platform-display'
import { payloadsForPlatform } from '@/lib/a3dm/catalog'
import { hasResolvedPlatformImage } from '@/lib/platforms/image-resolve'
import { getPlatformById, getPlatformCountermeasures } from '@/lib/platforms/queries'
import { cn } from '@/lib/utils'

interface PlatformDetailPageProps {
  params: { id: string }
}

/** Grid columns for the instrument row when fewer than five figures exist. */
const INST_COLS: Record<number, string> = {
  1: 'min-[901px]:[grid-template-columns:repeat(1,minmax(0,1fr))]',
  2: 'min-[901px]:[grid-template-columns:repeat(2,minmax(0,1fr))]',
  3: 'min-[901px]:[grid-template-columns:repeat(3,minmax(0,1fr))]',
  4: 'min-[901px]:[grid-template-columns:repeat(4,minmax(0,1fr))]',
  5: '',
}

export default async function PlatformDetailPage({ params }: PlatformDetailPageProps) {
  const [rawPlatform, countermeasures] = await Promise.all([
    getPlatformById(params.id),
    getPlatformCountermeasures(params.id),
  ])

  if (!rawPlatform) notFound()
  const platform = publishedSpecs(rawPlatform)

  const flag = knownFlag(platform.country_of_origin)
  const hasImage = hasResolvedPlatformImage(platform.id)
  const figures = keyFigures(platform)
    .filter((f) => f.value != null)
    .slice(0, 5)
  const hasPayloads = payloadsForPlatform(platform.id).length > 0
  const combat = platform.conflict_deployments?.length ?? 0

  const jump = [
    ['#dossier-overview', 'Identity'],
    ['#dossier-performance', 'Performance'],
    ['#dossier-airframe', 'Airframe'],
    ['#dossier-ew', 'Guidance and EW'],
    ['#countermeasures', 'Countermeasures'],
    ['#sam', 'SAM Pk'],
    ...(hasPayloads ? [['#payloads', 'Payloads']] : []),
    ['#dossier-sources', 'Sources'],
  ] as const

  return (
    <div className="pb-8">
      <Link href="/platforms" className="fc-action -ml-1">
        <ChevronLeft size={15} aria-hidden />
        Platform Library
      </Link>

      <header className="mt-3 flex flex-col-reverse gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 max-w-[820px]">
          <h1 className="page-title">{platform.name}</h1>
          <p className="page-lede">
            {flag ? (
              <span className="mr-1.5" aria-hidden>
                {flag}
              </span>
            ) : null}
            {platform.country_of_origin ?? 'Unknown origin'}
            {platform.manufacturer ? ` · ${platform.manufacturer}` : ''}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="tag">{categoryLabel(platform.category)}</span>
            <ConfidenceBadge confidence={platform.data_confidence} />
            {combat > 0 ? (
              <span className="tag" title={platform.conflict_deployments.join(', ')}>
                Combat proven
              </span>
            ) : null}
            {platform.retired ? <span className="tag">Retired</span> : null}
            <span className="ml-1 text-[12px] store-text-muted">
              Date of information: {formatDateOfInformation(platform)}
            </span>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <CompareButton platformId={platform.id} />
            <Link href="/defeat" className="fc-action">
              Defeat matrix
            </Link>
          </div>
        </div>
        {hasImage ? (
          <div className="relative w-full max-w-[360px] aspect-[16/10] shrink-0 rounded-2xl overflow-hidden border border-[var(--lacquer-line)] shadow-[var(--lacquer-shadow)]">
            <PlatformImage id={platform.id} name={platform.name} className="h-full w-full border-0 rounded-none" priority />
          </div>
        ) : null}
      </header>

      {figures.length > 0 ? (
        <div className="mt-7 store-panel rounded-2xl px-6">
          <div className={cn('fc-inst', INST_COLS[figures.length])}>
            {figures.map((f) => (
              <div key={f.key}>
                <div className="k">{f.label}</div>
                <div className="v">
                  {fmtNum(f.value)}
                  <small>{f.unit}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <nav aria-label="Dossier sections" className="mt-6 mb-4 flex flex-wrap items-center gap-x-5 gap-y-1">
        {jump.map(([href, label]) => (
          <a key={href} href={href} className="fc-action">
            {label}
          </a>
        ))}
      </nav>

      <div id="specs">
        <PlatformSpecSheet platform={platform} />
      </div>

      <section id="countermeasures" className="mt-6 scroll-mt-24">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-3">
          <h2 className="text-[15px] font-semibold text-[var(--store-ink)]">
            Countermeasures{' '}
            {countermeasures.length > 0 ? (
              <span className="font-normal font-mono text-[13px] store-text-muted">{countermeasures.length}</span>
            ) : null}
          </h2>
          {countermeasures.length > 0 ? (
            <p className="text-[12px] store-text-muted">
              OSINT pairings. Green above 70 percent, amber above 30, red 30 or below.
            </p>
          ) : null}
        </div>
        <CountermeasuresPanel countermeasures={countermeasures} />
      </section>

      <div className={cn('mt-6 grid gap-4', hasPayloads ? 'xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]' : '')}>
        <div id="sam" className="scroll-mt-24">
          <SamDefeatPanel platformId={platform.id} />
        </div>
        {hasPayloads ? <PayloadCompatPanel platform={platform} /> : null}
      </div>
    </div>
  )
}
