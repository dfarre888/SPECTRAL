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

/** Standard empty module state: avoids generic centered-icon templates. */
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
      <div className="w-12 h-12 rounded-2xl lg-glass !rounded-2xl flex items-center justify-center mb-4">
        <Icon className="h-5 w-5 text-[var(--store-ink-soft)]" aria-hidden />
      </div>
      <h2 className="store-display text-[18px] font-semibold text-[var(--store-ink)]">{title}</h2>
      <p className="text-[13.5px] leading-relaxed store-text-body mt-2 max-w-md">{description}</p>
      {(primaryAction || secondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {primaryAction ? (
            <Link
              href={primaryAction.href}
              className="btn-glass primary"
            >
              {primaryAction.label}
            </Link>
          ) : null}
          {secondaryAction ? (
            <Link
              href={secondaryAction.href}
              className="text-[13px] text-[var(--wb-blue)] hover:underline underline-offset-2"
            >
              {secondaryAction.label}
            </Link>
          ) : null}
        </div>
      )}
    </StorePanel>
  )
}
