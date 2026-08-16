import { describe, expect, it } from 'vitest'
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
})
