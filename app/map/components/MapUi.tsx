'use client'

import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { cn } from '@/lib/utils'

/**
 * Map Intel overlay primitives. Everything floating over the globe is the
 * glass control layer (DESIGN.md: map overlays and popovers are glass); the
 * popover variant is used for text so satellite imagery never fights the copy.
 */

/** A floating glass card: fixed header, one bounded scroller with edge fades. */
export function MapCard({
  title,
  icon,
  meta,
  onClose,
  closeLabel = 'Close',
  children,
  className,
  bodyClassName,
  footer,
}: {
  title: ReactNode
  icon?: ReactNode
  meta?: ReactNode
  onClose?: () => void
  closeLabel?: string
  children: ReactNode
  className?: string
  bodyClassName?: string
  footer?: ReactNode
}) {
  return (
    <section
      className={cn(
        'glass-popover pointer-events-auto flex flex-col min-h-0 max-h-full overflow-hidden',
        className,
      )}
    >
      <header className="flex items-center gap-2 shrink-0 min-h-11 pl-4 pr-2 py-1.5 border-b border-[var(--glass-line)]">
        {icon ? <span className="shrink-0 store-text-muted flex">{icon}</span> : null}
        <h2 className="flex-1 min-w-0 text-[13px] font-semibold text-[var(--store-ink)] leading-tight">{title}</h2>
        {meta ? <div className="shrink-0 flex items-center gap-1.5">{meta}</div> : null}
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="glass-icon-btn !w-7 !h-7 !rounded-lg shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </header>
      <ScrollArea
        frame={false}
        maxHeight="none"
        className="min-h-0 flex flex-col"
        scrollClassName={cn('min-h-0 px-4 py-3', bodyClassName)}
      >
        {children}
      </ScrollArea>
      {footer ? <div className="shrink-0 px-4 py-2.5 border-t border-[var(--glass-line)]">{footer}</div> : null}
    </section>
  )
}

/** Mono label / value row. Values are data, so they are JetBrains Mono and right-aligned. */
export function KV({
  label,
  value,
  tone,
  title,
}: {
  label: ReactNode
  value: ReactNode
  tone?: 'blue' | 'red' | 'amber' | 'green' | 'cyan' | 'muted'
  title?: string
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-[5px] border-b border-[var(--store-line)] last:border-b-0">
      <dt className="text-[12px] store-text-body shrink-0">{label}</dt>
      <dd
        title={title}
        className={cn(
          'font-mono text-[12px] text-right tabular-nums min-w-0 break-words',
          tone === 'blue'
            ? 'text-[var(--wb-blue)]'
            : tone === 'red'
              ? 'text-[var(--wb-red)]'
              : tone === 'amber'
                ? 'text-[#FBBF24]'
                : tone === 'green'
                  ? 'text-[#4ADE80]'
                  : tone === 'cyan'
                    ? 'text-[#06B6D4]'
                    : tone === 'muted'
                      ? 'store-text-muted'
                      : 'text-[var(--store-ink)]',
        )}
      >
        {value}
      </dd>
    </div>
  )
}

/** A quiet section heading inside a card. Sentence case, 12px, no tracking. */
export function CardSection({
  title,
  aside,
  children,
  className,
}: {
  title?: ReactNode
  aside?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      {title ? (
        <div className="flex items-baseline justify-between gap-2 mb-1.5">
          <h3 className="text-[12px] font-semibold store-text-muted">{title}</h3>
          {aside}
        </div>
      ) : null}
      {children}
    </div>
  )
}

/** Labelled form field; the control inside should use `.glass-field`. */
export function Field({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2 mb-1">
        <span className="text-[12px] store-text-body">{label}</span>
        {hint ? <span className="font-mono text-[12px] text-[var(--store-ink)]">{hint}</span> : null}
      </span>
      {children}
    </label>
  )
}

export const selectClass = 'glass-field w-full h-8 px-2.5 text-[13px] cursor-pointer'

/** Human label for an enum value such as `dense_urban`. Values are never changed. */
export function enumLabel(v: string): string {
  const s = v.replace(/_/g, ' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Blue range slider (the chrome accent; orange is reserved for the IR band). */
export const rangeClass = 'w-full h-5 cursor-pointer accent-[#2997FF]'
