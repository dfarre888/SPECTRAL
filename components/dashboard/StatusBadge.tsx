import { cn } from '@/lib/utils'
import type { CurrencyDot, OperationalStatus } from '@/lib/dashboard/types'

const STATUS_STYLES: Record<OperationalStatus, string> = {
  'in-flight': 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
  'pre-flight': 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300',
  idle: 'border-slate-500/40 bg-slate-500/10 text-slate-300',
  grounded: 'border-red-500/40 bg-red-500/10 text-red-400',
  pending: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
  alert: 'border-red-500/50 bg-red-500/15 text-red-300',
}

const STATUS_LABEL: Record<OperationalStatus, string> = {
  'in-flight': 'In-Flight',
  'pre-flight': 'Pre-Flight',
  idle: 'Idle',
  grounded: 'Grounded',
  pending: 'Pending',
  alert: 'Alert',
}

export function StatusBadge({ status, className }: { status: OperationalStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wide',
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
