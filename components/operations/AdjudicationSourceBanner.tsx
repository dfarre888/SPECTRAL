'use client'

import { AlertTriangle, Loader2, Server } from 'lucide-react'
import { cn } from '@/lib/utils'

export type AdjudicationSource = 'client' | 'loading' | 'server' | 'fallback'

interface AdjudicationSourceBannerProps {
  source: AdjudicationSource
  fallbackReason?: string
  className?: string
}

export function AdjudicationSourceBanner({
  source,
  fallbackReason,
  className,
}: AdjudicationSourceBannerProps) {
  if (source === 'client') return null

  const config = {
    loading: {
      icon: Loader2,
      spin: true,
      label: 'Running server adjudication…',
      tone: 'border-[rgba(6,182,212,0.30)] bg-[rgba(6,182,212,0.05)] text-[#67E8F9]',
    },
    server: {
      icon: Server,
      spin: false,
      label: 'Operations adjudication: ITU-R propagation and defeat matrix',
      tone: 'border-[rgba(6,182,212,0.30)] bg-[rgba(6,182,212,0.05)] text-[#67E8F9]',
    },
    fallback: {
      icon: AlertTriangle,
      spin: false,
      label: fallbackReason ?? 'Training fallback: client band overlap only',
      tone: 'border-[rgba(251,191,36,0.32)] bg-[rgba(251,191,36,0.05)] text-[#FCD34D]',
    },
  }[source]

  const Icon = config.icon

  return (
    <div
      role="status"
      className={cn(
        'flex items-start gap-2 rounded-xl border px-3 py-2 text-[12px] leading-snug',
        config.tone,
        className,
      )}
    >
      <Icon
        aria-hidden
        className={cn('w-3.5 h-3.5 shrink-0 mt-px', config.spin && 'animate-spin motion-reduce:animate-none')}
      />
      <div className="min-w-0">
        <p>{config.label}</p>
        {source === 'fallback' && (
          <p className="mt-1 text-[11.5px] store-text-muted">
            Set <span className="font-mono">NEXT_PUBLIC_SPECTRAL_EDITION=operations</span> and authenticate for server
            propagation.
          </p>
        )}
      </div>
    </div>
  )
}
