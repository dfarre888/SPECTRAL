import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { MAP_THEME } from '@/lib/ui/store-theme'
import { parseTheme, THEME_BOOT_SCRIPT, THEME_STORAGE_KEY } from '@/lib/ui/theme'

describe('spectral theme', () => {
  it('defaults unknown values to dark', () => {
    expect(parseTheme(null)).toBe('dark')
    expect(parseTheme('')).toBe('dark')
    expect(parseTheme('sepia')).toBe('dark')
  })

  it('accepts light as an explicit choice', () => {
    expect(parseTheme('light')).toBe('light')
  })

  it('uses a stable localStorage key', () => {
    expect(THEME_STORAGE_KEY).toBe('spectral-theme')
  })

  it('boot script writes data-theme and color-scheme before paint', () => {
    expect(THEME_BOOT_SCRIPT).toContain("localStorage.getItem('spectral-theme')")
    expect(THEME_BOOT_SCRIPT).toContain("setAttribute('data-theme'")
    expect(THEME_BOOT_SCRIPT).toContain('colorScheme')
    expect(THEME_BOOT_SCRIPT).toContain("classList.toggle('dark'")
    expect(THEME_BOOT_SCRIPT).toContain("classList.toggle('light'")
  })

  it('ships map materials, press feedback, and reduced-motion gates', () => {
    const css = readFileSync(resolve(__dirname, '../../app/globals.css'), 'utf8')
    expect(css).toContain(`.${MAP_THEME.material}`)
    expect(css).toContain(`.${MAP_THEME.float}`)
    expect(css).toContain(`.${MAP_THEME.press}:active`)
    expect(css).toContain('prefers-reduced-motion')
    expect(css).toContain('prefers-reduced-transparency')
    expect(css).toContain('--store-material-float')
    expect(css).toContain('--store-status-ok')
    expect(css).toContain("Space Grotesk")
    expect(css).not.toContain('IBM Plex Sans')
    expect(css).not.toContain('blur(20px)')
    expect(css).not.toContain('blur(24px)')
  })
})
