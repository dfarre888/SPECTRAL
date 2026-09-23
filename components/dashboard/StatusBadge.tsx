import { cn } from '@/lib/utils'
import type { CurrencyDot, OperationalStatus } from '@/lib/dashboard/types'

// Tag tones from the Obsidian system: text + hairline, never a filled slab.
const STATUS_STYLES: Record<OperationalStatus, string> = {
  'in-flight': 'green',
  'pre-flight': 'violet',
  idle: '',
  grounded: 'red',
  pending: 'amber',
  alert: 'red',
}

const STATUS_LABEL: Record<OperationalStatus, string> = {
  'in-flight': 'In flight',
  'pre-flight': 'Pre-flight',
  idle: 'Idle',
  grounded: 'Grounded',
  pending: 'Pending',
  alert: 'Alert',
}

export function StatusBadge({ status, className }: { status: OperationalStatus; className?: string }) {
  return (
    <span
      className={cn(
        'tag shrink-0',
        STATUS_STYLES[status],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-90" aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  )
}

const DOT_STYLES: Record<CurrencyDot, string> = {
  current: 'bg-emerald-400',
  due: 'bg-amber-400',
  expired: 'bg-red-500',
}

export function CurrencyDot({ status, title }: { status: CurrencyDot; title: string }) {
  return (
    <span
      className={cn('inline-block h-2 w-2 rounded-full shrink-0', DOT_STYLES[status])}
      title={title}
      aria-label={title}
    />
  )
}
