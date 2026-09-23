'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, GitCompare } from 'lucide-react'
import toast from 'react-hot-toast'
import { PlatformImage } from '@/components/platforms/PlatformImage'
import {
  categoryLabel,
  categoryMeta,
  confidenceTag,
  fmtNum,
  initials,
  knownFlag,
} from '@/components/platforms/platform-display'
import { hasResolvedPlatformImage } from '@/lib/platforms/image-resolve'
import { MAX_COMPARE_PLATFORMS, useCompareStore } from '@/lib/stores/compare-store'
import type { Platform } from '@/lib/types'
import { cn } from '@/lib/utils'

interface PlatformCardProps {
  platform: Platform
  /** Kept for API compatibility; cards no longer stagger in. */
  index?: number
}

function confidenceChip(confidence: Platform['data_confidence']): string | null {
  switch (confidence) {
    case 'high':
      return 'Confirmed OSINT'
    case 'medium':
      return 'Assessed capability'
    case 'estimated':
      return 'Estimated, verify'
    default:
      return null
  }
}

function platformBlurb(platform: Platform): string {
  if (platform.conflict_deployments?.length) {
    return `Combat employment: ${platform.conflict_deployments.slice(0, 2).join(', ')}.`
  }
  if (platform.guidance_type) {
    return `Guidance: ${platform.guidance_type.replace(/_/g, ' ')}.`
  }
  if (platform.known_operators?.length) {
    return `Operators: ${platform.known_operators.slice(0, 2).join(', ')}.`
  }
  return 'OSINT platform entry. Open the dossier for the full specification.'
}

/** One figure: label with its unit on top, the bare number below (units never crowd the value). */
function Figure({ label, value, unit }: { label: string; value: string | null; unit?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] store-text-muted truncate">
        {label}
        {unit ? <span className="ml-1 opacity-80">{unit}</span> : null}
      </div>
      <div className="mt-0.5 font-mono tabular-nums text-[13px] text-[var(--store-ink)] truncate">
        {value ?? <span className="store-text-muted">—</span>}
      </div>
    </div>
  )
}

export function PlatformCard({ platform }: PlatformCardProps) {
  const router = useRouter()
  const { isSelected, toggle } = useCompareStore()
  const selected = isSelected(platform.id)
  const href = `/platforms/${platform.id}`
  const compliance = confidenceChip(platform.data_confidence)
  const tone = confidenceTag(platform.data_confidence).tone
  const combat = (platform.conflict_deployments?.length ?? 0) > 0
  const hasImage = hasResolvedPlatformImage(platform.id)
  const flag = knownFlag(platform.country_of_origin)
  const sub = categoryMeta(platform)

  const handleCompare = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const ok = toggle(platform.id)
    if (!ok) {
      toast.error(`Maximum ${MAX_COMPARE_PLATFORMS} platforms`)
      return
    }
    toast.success(selected ? 'Removed from compare' : 'Added to compare')
  }

  return (
    <article
      className={cn(
        'group store-panel rounded-2xl overflow-hidden flex flex-col cursor-pointer',
        'transition-[transform,border-color] duration-200 ease-out hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        selected && '!border-[rgba(41,151,255,0.55)]',
      )}
      onClick={() => router.push(href)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') router.push(href)
      }}
      role="link"
      tabIndex={0}
      aria-label={platform.name}
    >
      <div className="relative aspect-[16/10] border-b border-[var(--lacquer-line)] bg-[#050506] overflow-hidden">
        {hasImage ? (
          <PlatformImage
            id={platform.id}
            name={platform.name}
            className="h-full w-full border-0 rounded-none"
          />
        ) : (
          // No open-source image: a monogram plate instead of a grey box.
          <div className="absolute inset-0 flex items-end justify-between p-4 bg-[radial-gradient(120%_90%_at_50%_0%,rgba(255,255,255,0.06),transparent_60%)]">
            <span
              aria-hidden
              className="store-display font-semibold leading-none tracking-[-0.04em] text-[64px] text-[rgba(255,255,255,0.10)] select-none"
            >
              {initials(platform.name)}
            </span>
            <span className="text-[11px] store-text-muted">No open-source image</span>
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1 gap-2.5">
        <div className="flex items-center justify-between gap-2 text-[11.5px] store-text-muted">
          <span className="truncate">
            {categoryLabel(platform.category)}
            {sub ? ` · ${sub}` : ''}
          </span>
          {combat ? (
            <span className="shrink-0 text-[var(--store-ink-soft)]" title={platform.conflict_deployments.join(', ')}>
              Combat proven
            </span>
          ) : null}
        </div>
        <h3 className="font-semibold text-[15px] leading-snug text-[var(--store-ink)] line-clamp-2">
          <Link href={href} onClick={(e) => e.stopPropagation()} className="hover:underline underline-offset-2">
            {platform.name}
          </Link>
        </h3>
        <p className="text-[12px] store-text-muted -mt-1 truncate">
          {flag ? <span className="mr-1" aria-hidden>{flag}</span> : null}
          {platform.country_of_origin ?? 'Unknown origin'}
          {platform.manufacturer ? ` · ${platform.manufacturer}` : ''}
        </p>
        <p className="text-[13px] leading-relaxed line-clamp-2 store-text-body">{platformBlurb(platform)}</p>

        <div className="grid grid-cols-3 gap-3 pt-2.5 mt-auto border-t border-[var(--store-line)]">
          <Figure label="Range" value={fmtNum(platform.range_km)} unit="km" />
          <Figure label="Speed" value={fmtNum(platform.max_speed_kmh)} unit="km/h" />
          <Figure label="Ceiling" value={fmtNum(platform.service_ceiling_m)} unit="m" />
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1.5 min-w-0">
            {compliance ? (
              <span className={cn('tag', tone)} title={compliance}>
                {confidenceTag(platform.data_confidence).label}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleCompare}
            aria-pressed={selected}
            aria-label={selected ? `Remove ${platform.name} from compare` : `Add ${platform.name} to compare`}
            className="btn-e xs shrink-0"
          >
            {selected ? <Check size={12} /> : <GitCompare size={12} />}
            {selected ? 'Added' : 'Compare'}
          </button>
        </div>
      </div>
    </article>
  )
}
