'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { clsx } from 'clsx'
import type { Tour, TourAction, TourPlacement } from '@/lib/tour/tours'

interface GuidedTourProps {
  tour: Tour
  open: boolean
  onClose: () => void
  /** Host performs the step's UI action (e.g. switch COP view) before reveal. */
  onAction?: (action: TourAction) => void
}

interface Box {
  top: number
  left: number
  width: number
  height: number
}

const CALLOUT_W = 340
const GAP = 14

function readTarget(name: string | null): Box | null {
  if (!name) return null
  const el = document.querySelector<HTMLElement>(`[data-tour="${name}"]`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (r.width === 0 && r.height === 0) return null
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}

/** Keep the callout on screen regardless of the requested placement. */
function placeCallout(box: Box | null, placement: TourPlacement, calloutH: number) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  if (!box || placement === 'center') {
    return { top: Math.max(16, vh / 2 - calloutH / 2), left: Math.max(16, vw / 2 - CALLOUT_W / 2) }
  }
  let top: number
  let left: number
  switch (placement) {
    case 'top':
      top = box.top - calloutH - GAP
      left = box.left + box.width / 2 - CALLOUT_W / 2
      break
    case 'left':
      top = box.top + box.height / 2 - calloutH / 2
      left = box.left - CALLOUT_W - GAP
      break
    case 'right':
      top = box.top + box.height / 2 - calloutH / 2
      left = box.left + box.width + GAP
      break
    default:
      top = box.top + box.height + GAP
      left = box.left + box.width / 2 - CALLOUT_W / 2
  }
  // Clamp into the viewport.
  left = Math.min(Math.max(12, left), vw - CALLOUT_W - 12)
  top = Math.min(Math.max(12, top), vh - calloutH - 12)
  return { top, left }
}

export function GuidedTour({ tour, open, onClose, onAction }: GuidedTourProps) {
  const [index, setIndex] = useState(0)
  const [box, setBox] = useState<Box | null>(null)
  const [settling, setSettling] = useState(false)
  const [mounted, setMounted] = useState(false)
  const calloutRef = useRef<HTMLDivElement>(null)
  const [calloutH, setCalloutH] = useState(220)

  const step = tour.steps[index]
  const isLast = index === tour.steps.length - 1

  useEffect(() => setMounted(true), [])

  // Reset to the first step each time the tour is opened.
  useEffect(() => {
    if (open) setIndex(0)
  }, [open])

  // Run the step's action, wait for the UI to settle, then measure the anchor.
  useEffect(() => {
    if (!open || !step) return
    let cancelled = false
    if (step.action) onAction?.(step.action)

    const wait = step.action ? step.settleMs ?? 1200 : 0
    if (wait > 0) setSettling(true)

    const t = setTimeout(() => {
      if (cancelled) return
      setSettling(false)
      setBox(readTarget(step.target))
    }, wait)

    return () => {
      cancelled = true
      clearTimeout(t)
    }
    // onAction is a stable callback from the host; re-running on identity churn
    // would replay the action and restart the settle timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, step])

  // Keep the spotlight glued to the anchor while the page moves.
  useEffect(() => {
    if (!open || settling) return
    const sync = () => setBox(readTarget(step?.target ?? null))
    window.addEventListener('resize', sync)
    window.addEventListener('scroll', sync, true)
    return () => {
      window.removeEventListener('resize', sync)
      window.removeEventListener('scroll', sync, true)
    }
  }, [open, settling, step])

  useLayoutEffect(() => {
    if (calloutRef.current) setCalloutH(calloutRef.current.offsetHeight)
  }, [index, settling, open])

  const next = useCallback(() => {
    if (isLast) onClose()
    else setIndex((i) => i + 1)
  }, [isLast, onClose])

  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' || e.key === 'Enter') next()
      if (e.key === 'ArrowLeft') back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, next, back, onClose])

  if (!open || !mounted || !step) return null

  const pos = placeCallout(box, step.placement ?? 'bottom', calloutH)

  return createPortal(
    <div className="fixed inset-0 z-[9999]" role="dialog" aria-modal="true" aria-label={tour.label}>
      {/* Scrim. Clicking outside the callout exits — same as Escape. */}
      <button
        type="button"
        aria-label="Exit walkthrough"
        onClick={onClose}
        className="absolute inset-0 w-full h-full bg-black/55 cursor-default"
      />

      {/* Spotlight ring around the anchored element. */}
      {box && step.placement !== 'center' && !settling && (
        <div
          aria-hidden
          className="absolute rounded-xl pointer-events-none transition-all duration-200"
          style={{
            top: box.top - 6,
            left: box.left - 6,
            width: box.width + 12,
            height: box.height + 12,
            boxShadow: '0 0 0 3px var(--store-accent), 0 0 0 9999px rgba(0,0,0,0.55)',
          }}
        />
      )}

      <div
        ref={calloutRef}
        className="absolute glass-popover !rounded-[18px] p-5"
        style={{ top: pos.top, left: pos.left, width: CALLOUT_W }}
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-[12px] font-medium text-[var(--wb-blue)]">
            {tour.label}
          </p>
          <p className="text-[12px] font-mono store-text-muted tabular-nums">
            {index + 1} / {tour.steps.length}
          </p>
        </div>

        <h2 className="store-display text-[16px] font-semibold text-[var(--store-ink)]">{step.title}</h2>
        <p className="text-[13px] store-text-body leading-relaxed mt-1.5">{step.body}</p>

        {step.say && (
          <p className="mt-3 rounded-xl store-panel-inner px-3 py-2.5 text-[12.5px] leading-relaxed store-text-body">
            <span className="block text-[11px] store-text-muted mb-0.5">Say</span>
            “{step.say}”
          </p>
        )}

        {settling && (
          <p className="mt-3 text-[12px] store-text-muted flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--store-accent)] animate-pulse motion-reduce:animate-none" />
            rendering view…
          </p>
        )}

        <div className="flex items-center justify-between mt-4">
          <button
            type="button"
            onClick={onClose}
            className="text-[13px] store-text-muted hover:text-[var(--store-ink)]"
          >
            Exit
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={back}
              disabled={index === 0}
              className={clsx('btn-glass !min-h-[30px] !px-3 !text-[12px]', index === 0 && 'opacity-40 cursor-not-allowed')}
            >
              Back
            </button>
            <button
              type="button"
              onClick={next}
              className="btn-glass primary !min-h-[30px] !px-4 !text-[12px]"
            >
              {isLast ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
