'use client'

import type { ReactNode } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StoreFilterSidebarProps {
  children: ReactNode
  className?: string
}

export function StoreFilterSidebar({ children, className }: StoreFilterSidebarProps) {
  return (
    <aside
      className={cn(
        'store-panel rounded-2xl p-5 lg:sticky lg:top-5 hidden lg:block',
        className,
      )}
    >
      <div className="flex items-center gap-2 font-semibold text-sm mb-4 store-display text-white">
        <SlidersHorizontal size={16} className="text-[var(--store-accent)]" />
        Filters
      </div>
      {children}
    </aside>
  )
}

interface StoreFilterSectionProps {
  label: string
  children: ReactNode
  className?: string
}

export function StoreFilterSection({ label, children, className }: StoreFilterSectionProps) {
  return (
    <div className={cn('mb-5 last:mb-0', className)}>
      <div className="text-[10px] font-semibold tracking-widest uppercase mb-2.5 store-text-muted">
        {label}
      </div>
      {children}
    </div>
  )
}

interface StoreFilterNavItemProps {
  active: boolean
  label: string
  count?: number
  icon?: ReactNode
  onClick: () => void
}

export function StoreFilterNavItem({
  active,
  label,
  count,
  icon,
  onClick,
}: StoreFilterNavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[13px] text-left transition-all',
        active
          ? 'bg-[var(--store-accent-glow)] text-[var(--store-accent)] font-semibold'
          : 'store-text-body hover:bg-[var(--store-surface-2)] hover:text-white',
      )}
    >
      <span className="flex items-center gap-2 min-w-0">
        {icon}
        <span className="truncate">{label}</span>
      </span>
      {count != null ? (
        <span
          className={cn(
            'font-mono text-[11px] shrink-0',
            active ? 'text-[var(--store-accent)]' : 'store-text-muted',
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  )
}
