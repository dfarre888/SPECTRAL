'use client'

import { AlertTriangle, Loader2, Radio, Server } from 'lucide-react'
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
      tone: 'border-cyan/30 bg-cyan/5 text-cyan',
    },
    server: {
      icon: Server,
      spin: false,
      label: 'Operations adjudication — ITU-R propagation + defeat matrix',
      tone: 'border-cyan/30 bg-cyan/5 text-cyan',
    },
    fallback: {
      icon: AlertTriangle,
      spin: false,
      label: fallbackReason ?? 'Training fallback — client band overlap only',
      tone: 'border-amber/30 bg-amber/5 text-amber',
    },
  }[source]

  const Icon = config.icon

  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-xl border px-3 py-2 text-[10px] font-mono leading-snug',
        config.tone,
        className,
      )}
    >
      <Icon className={cn('w-3.5 h-3.5 shrink-0 mt-0.5', config.spin && 'animate-spin')} />
      <div>
        <p className="flex items-center gap-1.5">
          <Radio className="w-3 h-3 opacity-70" />
          {config.label}
        </p>
        {source === 'fallback' && (
          <p className="mt-1 opacity-80">
            Set NEXT_PUBLIC_SPECTRAL_EDITION=operations and authenticate for server propagation.
          </p>
        )}
      </div>
    </div>
  )
}
