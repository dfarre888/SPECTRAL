'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'

const INSPECTOR_CSS = `
        @media (prefers-reduced-motion: no-preference) {
          .bp-inspector { animation: bp-inspector-in 200ms var(--ease-out); }
          @keyframes bp-inspector-in { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: none; } }
        }
      `

/** Wide enough to keep a table and a 420px pane side by side without clipping key columns. */
export const WIDE_QUERY = '(min-width: 1680px)'

/** undefined until hydrated, so server HTML never guesses the viewport. */
export function useWide(): boolean | undefined {
  const [wide, setWide] = useState<boolean | undefined>(undefined)
  useEffect(() => {
    const mq = window.matchMedia(WIDE_QUERY)
    const on = () => setWide(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return wide
}

/**
 * Right-hand inspector for narrower screens. Non-modal: the table behind it
 * stays live, so selecting another row swaps the content. Escape or the close
 * button dismisses it and returns focus to where it came from.
 */
export function Inspector({
  open,
  onClose,
  label,
  children,
  focusKey,
}: {
  open: boolean
  onClose: () => void
  label: string
  children: ReactNode
  /** Changing this moves focus into the inspector (new selection). */
  focusKey?: string
}) {
  const ref = useRef<HTMLElement>(null)
  const returnTo = useRef<HTMLElement | null>(null)
  // Callers pass inline closures; a ref keeps the effect from re-running (and
  // moving focus) on every parent render.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    returnTo.current = (document.activeElement as HTMLElement) ?? null
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('.bp-print-root')) onCloseRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      returnTo.current?.focus?.({ preventScroll: true })
    }
  }, [open])

  useEffect(() => {
    if (open) ref.current?.focus({ preventScroll: true })
  }, [open, focusKey])

  if (!open) return null
  return (
    <aside
      ref={ref}
      tabIndex={-1}
      aria-label={label}
      className="bp-inspector fixed bottom-3 right-3 top-[84px] z-[60] flex w-[min(440px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl store-panel outline-none focus-visible:!outline-none"
      style={{ boxShadow: 'var(--lacquer-shadow), 0 24px 80px -12px rgba(0,0,0,0.85)' }}
    >
      <style dangerouslySetInnerHTML={{ __html: INSPECTOR_CSS }} />
      <button
        type="button"
        onClick={onClose}
        className="glass-icon-btn absolute right-3 top-3 z-10 !h-9 !w-9 !bg-[var(--bp-btn-bg)] hover:!bg-[var(--bp-btn-bg-hover)]"
        aria-label={`Close ${label}`}
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="p-5">{children}</div>
      </div>
    </aside>
  )
}
