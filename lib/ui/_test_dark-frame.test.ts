import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(__dirname, '../../app/globals.css'), 'utf8')

/** Value of a custom property inside the bare :root block. */
function rootToken(name: string): string {
  const root = css.slice(css.indexOf(':root {'), css.indexOf('/* ---- The rationed gloss'))
  const m = root.match(new RegExp(`${name}:\\s*([^;]+);`))
  return m ? m[1].trim() : ''
}

function srgbToLinear(c: number): number {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}

function luminance(hex: string): number {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b)
}

function contrast(fg: string, bg: string): number {
  const a = luminance(fg)
  const b = luminance(bg)
  const [hi, lo] = a > b ? [a, b] : [b, a]
  return (hi + 0.05) / (lo + 0.05)
}

describe('Dark Frame — ground and elevation', () => {
  it('paints the ground true black, not a lifted near-black', () => {
    expect(rootToken('--store-bg')).toBe('#000000')
  })

  it('makes the ground-to-card step large and the rest small', () => {
    const ground = luminance('#000000')
    const s1 = luminance(rootToken('--store-surface'))
    const s2 = luminance(rootToken('--store-surface-2'))
    const s3 = luminance(rootToken('--store-surface-3'))
    // The only jump that has to be obvious.
    expect(s1 - ground).toBeGreaterThan(0.008)
    // Above it, increments stay small.
    expect(s2 - s1).toBeLessThan(s1 - ground)
    expect(s3 - s2).toBeLessThan(s1 - ground)
    // And the ladder only ever climbs.
    expect(s1).toBeLessThan(s2)
    expect(s2).toBeLessThan(s3)
  })

  it('draws edges in alpha white so they sit on any surface', () => {
    expect(rootToken('--store-line')).toMatch(/^rgba\(255,\s*255,\s*255/)
    expect(rootToken('--store-line-strong')).toMatch(/^rgba\(255,\s*255,\s*255/)
  })
})

describe('Dark Frame — text', () => {
  it('stops primary text short of pure white', () => {
    const ink = rootToken('--store-ink').toUpperCase()
    expect(ink).toBe('#F5F5F7')
    expect(ink).not.toBe('#FFFFFF')
  })

  it('keeps every text token that carries small copy above AA', () => {
    // 4.5:1 is AA for normal-size text. These tokens are spent on 10-13px.
    for (const t of ['--store-ink', '--store-ink-soft', '--store-ink-mute']) {
      const c = contrast(rootToken(t), '#000000')
      expect(c, `${t} contrast ${c.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('quarantines the sub-AA tone rather than using it for labels', () => {
    // The brief's #6E6E73 is ~4.1:1. It is kept, but named so its limits are
    // explicit and it cannot be reached for by habit.
    const faint = contrast(rootToken('--store-ink-faint'), '#000000')
    expect(faint).toBeLessThan(4.5)
    expect(css).toContain('large text only')
  })

  it('holds muted text above AA where the source brief did not', () => {
    // Documented departure: the brief's tertiary tone fails at the sizes this
    // app actually uses it.
    expect(contrast(rootToken('--store-ink-mute'), '#000000')).toBeGreaterThan(5)
  })
})

describe('Dark Frame — material', () => {
  it('keeps the working palette — hue is load-bearing in a data app', () => {
    expect(rootToken('--store-accent').toUpperCase()).toBe('#F97316')
    expect(rootToken('--cyan').toUpperCase()).toBe('#06B6D4')
    expect(css).toContain('COLOUR BELONGS TO THE DATA, NOT TO THE CHROME')
  })

  it('carries the single link hue from the brief', () => {
    expect(rootToken('--store-link').toUpperCase()).toBe('#2997FF')
  })

  it('turns grain off — it flattens true black', () => {
    expect(rootToken('--store-grain')).toBe('0')
  })

  it('ships the three-layer gloss recipe, masked border and all', () => {
    expect(css).toContain('.gloss-tile')
    expect(css).toContain('radial-gradient(125% 125% at 50% 135%')
    expect(css).toContain('mask-composite: exclude')
    expect(css).toMatch(/box-shadow:\s*0 0 70px -22px/)
  })

  it('ramps scrims to the ground, not to a mid surface', () => {
    const scrim = css.slice(css.indexOf('.scrim-to-ground'))
    expect(scrim).toContain('rgba(0, 0, 0, 0.98)')
    expect(scrim).not.toContain('29, 29, 31')
  })

  it('respects reduced motion', () => {
    expect(css).toContain('prefers-reduced-motion')
  })

  it('leaves the dark canvas unwashed', () => {
    // An accent radial on the shell lifts the ground off true black and spends
    // the accent as decoration. Both are the failures this system exists to avoid.
    // Match the bare selector at line start — not the [data-theme="light"]
    // variant, which legitimately keeps its warm wash.
    const m = css.match(/\n\.hub-page-canvas \{([^}]*)\}/)
    const decl = m ? m[1] : ''
    expect(m, 'bare .hub-page-canvas rule not found').not.toBeNull()
    expect(decl).not.toContain('radial-gradient')
    expect(decl).toContain('var(--store-bg)')
  })
})
