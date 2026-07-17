import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { StorePanel } from '@/components/ui/store-surface'

interface OpsPanelProps {
  title: string
  kicker?: string
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}

/** Standard operations panel — header + mono kicker + action slot. */
export function OpsPanel({
  title,
  kicker,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: OpsPanelProps) {
  return (
    <StorePanel className={cn('overflow-hidden', className)}>
      <div className="flex flex-col gap-3 border-b border-[var(--store-line)] px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {kicker ? (
            <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--store-accent)] mb-1">
              {kicker}
            </p>
          ) : null}
          <h2 className="store-display text-sm font-semibold text-white">{title}</h2>
          {description ? (
            <p className="text-xs store-text-body mt-1 max-w-2xl">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className={cn('p-4', bodyClassName)}>{children}</div>
    </StorePanel>
  )
}
