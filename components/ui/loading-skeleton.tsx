import { cn } from '@/lib/utils'
import { StorePanel } from '@/components/ui/store-surface'

export function PanelSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <StorePanel className={cn('p-4 animate-pulse space-y-3', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-3 rounded bg-[var(--store-surface-2)]" style={{ width: `${90 - i * 12}%` }} />
      ))}
    </StorePanel>
  )
}

export function GridSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid gap-4 grid-cols-2 lg:grid-cols-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <StorePanel key={i} className="h-28 animate-pulse bg-[var(--store-surface-2)]">
          <span className="sr-only">Loading</span>
        </StorePanel>
      ))}
    </div>
  )
}

export function GlobeSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-xl border border-[var(--store-line)] bg-[var(--store-surface-2)] flex items-center justify-center min-h-[320px]',
        className,
      )}
    >
      <p className="text-[10px] font-mono store-text-muted">Initialising globe…</p>
    </div>
  )
}
