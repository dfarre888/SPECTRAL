'use client'

import Link from 'next/link'
import { ChevronRight, type LucideIcon } from 'lucide-react'
import { StorePanel } from '@/components/ui/store-surface'

interface HubLinkCardProps {
  title: string
  description: string
  href: string
  icon: LucideIcon
  buttonLabel?: string
  badge?: string
  testId?: string
  secondaryHref?: string
  secondaryLabel?: string
  secondaryTestId?: string
}

export function HubLinkCard({
  title,
  description,
  href,
  icon: Icon,
  buttonLabel = 'Open',
  badge,
  testId,
  secondaryHref,
  secondaryLabel,
  secondaryTestId,
}: HubLinkCardProps) {
  return (
    <StorePanel className="p-8 max-w-2xl" data-testid={testId}>
      <div className="flex items-start gap-4">
        <div
          className="p-3 rounded-2xl shrink-0 flex items-center justify-center border"
          style={{
            background: 'var(--store-accent-glow)',
            borderColor: 'var(--store-accent-border)',
          }}
        >
          <Icon className="w-7 h-7 text-[var(--store-accent)]" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h2 className="store-display text-lg font-semibold text-white">
              {title}
            </h2>
            {badge ? (
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full border border-[var(--store-accent-border)] bg-[var(--store-accent-glow)] text-[var(--store-accent)]">
                {badge}
              </span>
            ) : null}
          </div>
          <p className="text-sm leading-relaxed mb-6 store-text-body">
            {description}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={href}
              className="store-btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm transition-all hover:opacity-90"
              data-testid={testId ? `${testId}-open` : undefined}
            >
              {buttonLabel}
              <ChevronRight className="w-4 h-4" />
            </Link>
            {secondaryHref && secondaryLabel ? (
              <Link
                href={secondaryHref}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan transition-colors hover:opacity-90"
                data-testid={secondaryTestId}
              >
                {secondaryLabel}
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </StorePanel>
  )
}
