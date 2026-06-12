'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { StoreEyebrow } from '@/components/ui/store-surface'

interface HubPageShellProps {
  title: string
  subtitle?: ReactNode
  eyebrow?: string
  eyebrowIcon?: ReactNode
  headerAction?: ReactNode
  tabs?: ReactNode
  children: ReactNode
  className?: string
  maxWidthClass?: string
}

/**
 * Standard layout for (main) hub routes — zinc canvas, orange accent, Space Grotesk titles.
 */
export function HubPageShell({
  title,
  subtitle,
  eyebrow,
  eyebrowIcon,
  headerAction,
  tabs,
  children,
  className,
  maxWidthClass = 'max-w-7xl',
}: HubPageShellProps) {
  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      <div
        className={cn(
          'mx-auto flex w-full min-w-0 flex-1 flex-col gap-6',
          maxWidthClass,
        )}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-3">
            {eyebrow ? (
              <StoreEyebrow icon={eyebrowIcon}>{eyebrow}</StoreEyebrow>
            ) : null}
            <h1
              className="store-display text-2xl font-bold tracking-tight text-white md:text-3xl"
              style={{ letterSpacing: '-0.02em' }}
              data-testid="hub-page-title"
            >
              {title}
            </h1>
            {subtitle ? (
              <p className="text-sm store-text-body max-w-2xl">{subtitle}</p>
            ) : null}
          </div>
          {headerAction ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {headerAction}
            </div>
          ) : null}
        </div>

        {tabs ? <div className="min-w-0">{tabs}</div> : null}

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}
