'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { GitCompare, ShieldCheck } from 'lucide-react'
import { motion } from 'framer-motion'
import { PlatformImage } from '@/components/platforms/PlatformImage'
import toast from 'react-hot-toast'
import { CATEGORY_LABELS, CATEGORY_SHORT } from '@/lib/platforms/constants'
import { countryFlag } from '@/lib/platforms/flags'
import { formatAltitudeM, formatFrequencyBand, formatRangeKm } from '@/lib/platforms/format'
import { MAX_COMPARE_PLATFORMS, useCompareStore } from '@/lib/stores/compare-store'
import type { Platform } from '@/lib/types'
import { cn } from '@/lib/utils'

interface PlatformCardProps {
  platform: Platform
  index?: number
}

function confidenceChip(confidence: Platform['data_confidence']): string | null {
  switch (confidence) {
    case 'high':
      return 'Confirmed OSINT'
    case 'medium':
      return 'Assessed capability'
    case 'estimated':
      return 'Estimated — verify'
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
  return 'OSINT platform entry — open dossier for full specification.'
}

export function PlatformCard({ platform, index = 0 }: PlatformCardProps) {
  const router = useRouter()
  const { isSelected, toggle } = useCompareStore()
  const selected = isSelected(platform.id)
  const href = `/platforms/${platform.id}`
  const kicker = CATEGORY_SHORT[platform.category] ?? CATEGORY_LABELS[platform.category]
  const compliance = confidenceChip(platform.data_confidence)
  const featured =
    (platform.conflict_deployments?.length ?? 0) > 0 || platform.gnss_independent

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
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: Math.min(index * 0.035, 0.35),
        duration: 0.32,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{ y: -4 }}
      className={cn(
        'store-panel rounded-2xl overflow-hidden flex flex-col cursor-pointer transition-colors',
        selected && 'border-[var(--store-accent-border)]',
      )}
      onClick={() => router.push(href)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') router.push(href)
      }}
      role="link"
      tabIndex={0}
    >
      <div className="relative aspect-square store-panel-inner rounded-none border-0 border-b border-[var(--store-line)]">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(60% 60% at 50% 110%, rgba(249,115,22,0.15), transparent 65%)',
          }}
        />
        <PlatformImage
          id={platform.id}
          name={platform.name}
          className="relative h-full w-full border-0 rounded-none store-panel-inner"
        />
        {featured ? (
          <span className="absolute top-2.5 left-2.5 text-[10px] font-bold font-mono tracking-wider uppercase px-2 py-1 rounded-md bg-[var(--store-accent)] text-[#0a0a0a]">
            Combat
          </span>
        ) : null}
        <button
          type="button"
          onClick={handleCompare}
          aria-label={selected ? 'Remove from compare' : 'Add to compare'}
          className={cn(
            'absolute top-2.5 right-2.5 w-8 h-8 rounded-full grid place-items-center transition-all',
            selected
              ? 'bg-[var(--store-accent)] text-[#0a0a0a]'
              : 'bg-[rgba(8,8,8,0.6)] backdrop-blur-sm text-white hover:bg-[var(--store-accent-glow)]',
          )}
        >
          <GitCompare size={14} />
        </button>
      </div>

      <div className="p-4 flex flex-col flex-1 gap-2">
        <div className="text-[10.5px] font-semibold tracking-widest uppercase store-text-muted">
          {kicker}
        </div>
        <h3 className="font-semibold text-[15px] leading-snug text-white">
          <Link href={href} onClick={(e) => e.stopPropagation()} className="hover:underline">
            {platform.name}
          </Link>
        </h3>
        <p className="text-[11px] store-text-muted">
          {countryFlag(platform.country_of_origin)}{' '}
          {platform.country_of_origin ?? 'Unknown origin'}
        </p>
        <p className="text-[13px] leading-relaxed line-clamp-2 store-text-body">
          {platformBlurb(platform)}
        </p>

        {compliance ? (
          <span className="self-start text-[11px] px-2 py-1 rounded-full flex items-center gap-1.5 border border-[rgba(74,222,128,0.20)] bg-[rgba(74,222,128,0.10)] text-[var(--store-success)]">
            <ShieldCheck size={11} />
            {compliance}
          </span>
        ) : null}

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-mono store-text-body mt-1">
          <span>{formatRangeKm(platform.range_km)}</span>
          <span>{formatAltitudeM(platform.service_ceiling_m)}</span>
          <span>{formatFrequencyBand(platform.c2_uplink_mhz, platform.data_link_mhz)}</span>
        </div>

        {platform.manufacturer ? (
          <div className="flex items-center gap-1.5 text-[10.5px] store-text-muted mt-auto pt-1">
            <span className="px-1.5 py-0.5 rounded font-mono store-panel-inner border border-[var(--store-line)]">
              {platform.manufacturer}
            </span>
            <span>·</span>
            <span>OSINT dossier</span>
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleCompare}
          className={cn(
            'mt-2 w-full py-2 rounded-xl text-xs font-semibold transition-colors',
            selected
              ? 'store-btn-primary'
              : 'store-panel-inner store-text-body hover:text-white border border-[var(--store-line)]',
          )}
        >
          {selected ? 'In compare tray' : 'Add to compare'}
        </button>
      </div>
    </motion.article>
  )
}
