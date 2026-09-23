'use client'

import { useEffect } from 'react'

/** Nearest ancestor that scrolls vertically: the page scroller. */
function findPageScroller(from: HTMLElement): HTMLElement | null {
  let el = from.parentElement
  while (el && el !== document.body) {
    const oy = getComputedStyle(el).overflowY
    if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1) return el
    el = el.parentElement
  }
  return null
}

/**
 * The matrix is a scroller inside a scrolling page. Left alone, the wheel
 * scrolls whichever box is under the pointer, so the grid starts moving while
 * its lower half is still below the fold and the page never reaches the point
 * where the whole grid is on screen.
 *
 * This hands vertical wheel input to the page until the page has scrolled to
 * its end (the matrix is docked under the top bar, its frame sized to fit),
 * and hands it back to the page when the grid is at its top. The two then
 * behave as one continuous surface. Horizontal and pinch input pass through.
 */
export function useDockScroll(scrollEl: HTMLElement | null, enabled: boolean) {
  useEffect(() => {
    if (!enabled || !scrollEl) return
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.defaultPrevented) return
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
      const page = findPageScroller(scrollEl)
      if (!page) return
      const dy =
        e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * page.clientHeight : e.deltaY
      if (dy > 0) {
        const room = page.scrollHeight - page.clientHeight - page.scrollTop
        if (room <= 1) return
        e.preventDefault()
        page.scrollTop += Math.min(dy, room)
      } else if (dy < 0) {
        if (scrollEl.scrollTop > 0 || page.scrollTop <= 0) return
        e.preventDefault()
        page.scrollTop += dy
      }
    }
    scrollEl.addEventListener('wheel', onWheel, { passive: false })
    return () => scrollEl.removeEventListener('wheel', onWheel)
  }, [scrollEl, enabled])
}
