/**
 * Callers: vitest
 * Purpose: inertOutside marks siblings and restores
 * @vitest-environment happy-dom
 */

import { afterEach, describe, expect, it } from 'vitest'
import { inertOutside } from './inert-outside'

describe('inertOutside', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('marks sibling branches inert and restores on dispose', () => {
    document.body.innerHTML = `
      <div id="shell">
        <nav id="nav">Nav</nav>
        <main id="main">
          <div id="band-tile-fullscreen-dialog" role="dialog">Dialog</div>
        </main>
      </div>
    `
    const dialog = document.getElementById('band-tile-fullscreen-dialog')!
    const nav = document.getElementById('nav')!
    const restore = inertOutside(dialog)

    expect(nav.getAttribute('aria-hidden')).toBe('true')
    expect(nav.inert).toBe(true)
    expect(dialog.inert).toBe(false)
    expect(dialog.getAttribute('aria-hidden')).toBeNull()

    restore()
    expect(nav.getAttribute('aria-hidden')).toBeNull()
    expect(nav.inert).toBe(false)
  })
})
