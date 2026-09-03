/**
 * Callers: BandTileFullscreenModal (and any fullscreen dialog)
 * Purpose: isolate AT/keyboard from page chrome while a modal is open.
 * Walks ancestors and marks siblings inert + aria-hidden (WAI-ARIA modal pattern).
 */

type Mark = {
  el: HTMLElement
  prevAriaHidden: string | null
  prevInert: boolean
}

/**
 * Make everything outside `dialog` non-interactive for AT and pointer/keyboard.
 * Returns a disposer that restores prior attributes.
 */
export function inertOutside(dialog: HTMLElement): () => void {
  const marks: Mark[] = []

  let current: HTMLElement | null = dialog
  while (current && current !== document.documentElement) {
    const parent: HTMLElement | null = current.parentElement
    if (!parent) break
    for (const child of Array.from(parent.children)) {
      if (child === current) continue
      if (!(child instanceof HTMLElement)) continue
      marks.push({
        el: child,
        prevAriaHidden: child.getAttribute('aria-hidden'),
        prevInert: child.inert,
      })
      child.setAttribute('aria-hidden', 'true')
      child.inert = true
    }
    current = parent
  }

  return () => {
    for (const m of marks) {
      if (m.prevAriaHidden === null) m.el.removeAttribute('aria-hidden')
      else m.el.setAttribute('aria-hidden', m.prevAriaHidden)
      m.el.inert = m.prevInert
    }
  }
}
