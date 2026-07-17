import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { StorePanel } from '@/components/ui/store-surface'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: ReactNode
  primaryAction?: { href: string; label: string }
  secondaryAction?: { href: string; label: string }
  className?: string
}

/** Standard empty module state — avoids generic centered-icon templates. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <StorePanel className={cn('p-10 flex flex-col items-center text-center', className)}>
      <div className="w-12 h-12 rounded-2xl border border-[var(--store-line)] bg-[var(--store-surface-2)] flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-[var(--store-accent)]" aria-hidden />
      </div>
      <h2 className="store-display text-lg font-semibold text-white">{title}</h2>
      <p className="text-sm store-text-body mt-2 max-w-md font-mono">{description}</p>
      {(primaryAction || secondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {primaryAction ? (
            <Link
              href={primaryAction.href}
              className="store-btn-primary px-4 py-2 text-sm inline-flex items-center gap-2"
            >
              {primaryAction.label}
            </Link>
          ) : null}
          {secondaryAction ? (
            <Link
              href={secondaryAction.href}
              className="text-sm font-mono text-cyan hover:opacity-80"
            >
              {secondaryAction.label}
            </Link>
          ) : null}
        </div>
      )}
    </StorePanel>
  )
}
