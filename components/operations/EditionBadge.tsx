'use client'

import { isOperationsEditionClient } from '@/lib/operations/edition-client'
import { cn } from '@/lib/utils'

type EditionBadgeProps = {
  className?: string
  size?: 'sm' | 'md'
}

export function EditionBadge({ className, size = 'sm' }: EditionBadgeProps) {
  const operations = isOperationsEditionClient()

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border font-mono font-semibold uppercase tracking-wider',
        size === 'sm' ? 'px-2 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]',
        operations
          ? 'border-cyan/40 bg-cyan/10 text-cyan'
          : 'border-[var(--store-line)] bg-[var(--store-surface-2)] store-text-muted',
        className,
      )}
      title={
        operations
          ? 'Server-side ITU-R propagation and tenant adjudication enabled'
          : 'OSINT band overlap only — no server propagation'
      }
    >
      <span
        className={cn(
          'rounded-full shrink-0',
          size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2',
          operations ? 'bg-cyan' : 'bg-[var(--store-ink-mute)]',
        )}
      />
      {operations ? 'Operations' : 'Training'}
    </span>
  )
}
