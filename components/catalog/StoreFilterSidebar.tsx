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
        'store-panel rounded-2xl p-4 lg:sticky lg:top-0 hidden lg:block lg:max-h-[calc(100vh-130px)] lg:overflow-y-auto',
        className,
      )}
    >
      <div className="flex items-center gap-2 font-semibold text-[14px] mb-4 px-1 store-display text-[var(--store-ink)]">
        <SlidersHorizontal size={15} className="store-text-muted" />
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
      <div className="text-[11.5px] font-semibold mb-1.5 px-1 store-text-muted">
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
        'w-full flex items-center justify-between min-h-[32px] px-2.5 rounded-[9px] text-[13px] text-left transition-colors duration-150',
        active
          ? 'text-white bg-[linear-gradient(180deg,rgba(41,151,255,0.30),rgba(41,151,255,0.18))] shadow-[inset_0_1px_0_rgba(255,255,255,0.14),inset_0_0_0_1px_rgba(41,151,255,0.4)]'
          : 'store-text-body hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--store-ink)]',
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
            active ? 'text-white/80' : 'store-text-muted',
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  )
}
