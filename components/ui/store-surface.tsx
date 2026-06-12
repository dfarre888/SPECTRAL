import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface StorePanelProps {
  children: ReactNode
  className?: string
  inner?: boolean
  'data-testid'?: string
}

/** Shop-style card surface — solid zinc panel with subtle border */
export function StorePanel({
  children,
  className,
  inner = false,
  'data-testid': testId,
}: StorePanelProps) {
  return (
    <div
      data-testid={testId}
      className={cn(
        inner ? 'store-panel-inner' : 'store-panel',
        'rounded-2xl',
        className,
      )}
    >
      {children}
    </div>
  )
}

interface StoreEyebrowProps {
  children: ReactNode
  className?: string
  icon?: ReactNode
}

export function StoreEyebrow({ children, className, icon }: StoreEyebrowProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full',
        'border border-[var(--store-accent-border)] bg-[var(--store-accent-glow)] text-[var(--store-accent)]',
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}
