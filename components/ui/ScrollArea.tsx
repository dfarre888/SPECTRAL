'use client'

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ScrollAreaProps {
  children: ReactNode
  className?: string
  /** Classes for the inner scroller. */
  scrollClassName?: string
  /** CSS max-height for the scroller. Defaults to the viewport minus page chrome. */
  maxHeight?: string
  /** Fixed height instead of max-height (virtualised grids need a definite box). */
  height?: string
  /** Draw the lacquer frame. Off when the caller already sits in a panel. */
  frame?: boolean
  scrollRef?: (el: HTMLDivElement | null) => void
  onScroll?: (el: HTMLDivElement) => void
  style?: CSSProperties
}

/**
 * One scroller with scroll-edge fades. The fades appear only on an edge that
 * has more content beyond it, so a wide table tells you it continues without
 * a label saying so. Sticky headers and first columns live inside.
 */
export function ScrollArea({
  children,
  className,
  scrollClassName,
  maxHeight,
  height,
  frame = true,
  scrollRef,
  onScroll,
  style,
}: ScrollAreaProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [edges, setEdges] = useState({ l: false, r: false, b: false })

  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    const l = el.scrollLeft > 2
    const r = el.scrollLeft + el.clientWidth < el.scrollWidth - 2
    const b = el.scrollTop + el.clientHeight < el.scrollHeight - 2
    setEdges((prev) => (prev.l === l && prev.r === r && prev.b === b ? prev : { l, r, b }))
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    if (el.firstElementChild) ro.observe(el.firstElementChild)
    return () => ro.disconnect()
  }, [measure])

  return (
    <div className={cn('relative', frame && 'dt-frame', className)} style={style}>
      <div
        ref={(el) => {
          ref.current = el
          scrollRef?.(el)
        }}
        className={cn('dt-scroll', scrollClassName)}
        style={height ? { height, maxHeight: 'none' } : maxHeight ? { maxHeight } : undefined}
        onScroll={(e) => {
          measure()
          onScroll?.(e.currentTarget)
        }}
      >
        {children}
      </div>
      <div aria-hidden className={cn('edge-fade l', edges.l && 'on')} />
      <div aria-hidden className={cn('edge-fade r', edges.r && 'on')} />
      <div aria-hidden className={cn('edge-fade b', edges.b && 'on')} />
    </div>
  )
}
