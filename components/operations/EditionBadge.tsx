'use client'

import { isOperationsEditionClient } from '@/lib/operations/edition-client'
import { cn } from '@/lib/utils'

type EditionBadgeProps = {
  className?: string
  size?: 'sm' | 'md'
}

/** Edition marker. A `.tag`: text plus hairline, cyan when the Operations edition is live. */
export function EditionBadge({ className, size = 'sm' }: EditionBadgeProps) {
  const operations = isOperationsEditionClient()

  return (
    <span
      className={cn(
        'tag',
        size === 'md' && '!h-6 !px-2.5 !text-[12px]',
        operations && '!border-[rgba(6,182,212,0.45)] !bg-[rgba(6,182,212,0.08)] !text-[#67E8F9]',
        className,
      )}
      title={
        operations
          ? 'Server-side ITU-R propagation and tenant adjudication enabled'
          : 'OSINT band overlap only, no server propagation'
      }
    >
      <span
        aria-hidden
        className={cn(
          'rounded-full shrink-0',
          size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2',
          operations ? 'bg-[#06B6D4]' : 'bg-[var(--store-ink-mute)]',
        )}
      />
      {operations ? 'Operations' : 'Training'}
    </span>
  )
}
