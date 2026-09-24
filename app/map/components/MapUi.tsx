'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
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

export interface MapMenuItem {
  id: string
  label: ReactNode
  /** One quiet line under the label. */
  note?: ReactNode
  disabled?: boolean
}

/**
 * A glass menu button for the map chrome (Export, Presets). Opens a glass
 * popover of items, each with a one-line note. Esc and outside click close it.
 *
 * The popover renders in a portal with fixed positioning: toolbar groups are
 * themselves Liquid Glass (backdrop-filter), which would make them the backdrop
 * root and stop the popover blurring the panels behind it.
 */
export function MapMenu({
  label,
  items,
  onSelect,
  placement = 'down',
  align = 'start',
  buttonClassName,
  menuLabel,
  width = 320,
  header,
}: {
  label: ReactNode
  items: MapMenuItem[]
  onSelect: (id: string) => void
  placement?: 'down' | 'up'
  align?: 'start' | 'end'
  buttonClassName?: string
  menuLabel: string
  width?: number
  header?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number; width: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const place = () => {
      const r = buttonRef.current?.getBoundingClientRect()
      if (!r) return
      const vw = window.innerWidth
      const w = Math.min(width, vw - 32)
      const rawLeft = align === 'start' ? r.left : r.right - w
      const left = Math.max(16, Math.min(rawLeft, vw - w - 16))
      setPos(
        placement === 'down'
          ? { left, top: r.bottom + 8, width: w }
          : { left, bottom: window.innerHeight - r.top + 8, width: w },
      )
    }
    place()
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (buttonRef.current?.contains(t) || menuRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    window.addEventListener('resize', place)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('resize', place)
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open, placement, align, width])

  useEffect(() => {
    if (open && pos) menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus()
  }, [open, pos])

  const menu =
    open && pos && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={menuLabel}
            style={{ position: 'fixed', left: pos.left, top: pos.top, bottom: pos.bottom, width: pos.width, zIndex: 60 }}
            className="glass-popover p-1.5 flex flex-col gap-0.5"
            onKeyDown={(e) => {
              if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
              e.preventDefault()
              const list = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? [])]
              const i = list.indexOf(document.activeElement as HTMLButtonElement)
              const next = list[(i + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length]
              next?.focus()
            }}
          >
            {header ? <div className="px-2.5 pt-1.5 pb-1 text-[12px] store-text-muted">{header}</div> : null}
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false)
                  onSelect(item.id)
                }}
                className="text-left rounded-[10px] px-2.5 py-2 hover:bg-[rgba(255,255,255,0.07)] focus-visible:bg-[rgba(255,255,255,0.07)] disabled:opacity-40 disabled:pointer-events-none transition-colors duration-150 ease-out motion-reduce:transition-none"
              >
                <span className="block text-[13px] font-medium text-[var(--store-ink)]">{item.label}</span>
                {item.note ? <span className="block mt-0.5 text-[12px] leading-snug store-text-muted">{item.note}</span> : null}
              </button>
            ))}
          </div>,
          document.body,
        )
      : null

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        className={buttonClassName}
      >
        {label}
      </button>
      {menu}
    </>
  )
}
