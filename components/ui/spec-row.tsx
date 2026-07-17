import { ConfidenceBadge } from '@/components/platforms/ConfidenceBadge'
import type { DataConfidence } from '@/lib/types'
import { cn } from '@/lib/utils'

interface SpecRowProps {
  label: string
  value: React.ReactNode
  unit?: string
  mono?: boolean
  confidence?: DataConfidence | null
  className?: string
}

/** Jane's-style spec row — aligned label + mono value. */
export function SpecRow({ label, value, unit, mono = true, confidence, className }: SpecRowProps) {
  return (
    <div
      className={cn(
        'flex items-baseline justify-between gap-4 py-1.5 border-b border-[var(--store-line)] last:border-0',
        className,
      )}
    >
      <span className="text-[11px] store-text-muted shrink-0">{label}</span>
      <span
        className={cn(
          'text-xs text-white text-right flex items-center gap-2 justify-end min-w-0',
          mono && 'font-mono tabular-nums',
        )}
      >
        {confidence != null ? (
          <ConfidenceBadge confidence={confidence} className="shrink-0 scale-[0.85] origin-right" />
        ) : null}
        <span className="min-w-0">
          {value}
          {unit ? <span className="store-text-muted ml-1">{unit}</span> : null}
        </span>
      </span>
    </div>
  )
}

interface SpecGridProps {
  children: React.ReactNode
  className?: string
}

export function SpecGrid({ children, className }: SpecGridProps) {
  return <div className={cn('divide-y divide-[var(--store-line)]', className)}>{children}</div>
}
