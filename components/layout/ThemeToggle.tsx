'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { applyTheme, readStoredTheme, toggleTheme, type SpectralTheme } from '@/lib/ui/theme'

export function ThemeToggle() {
  const [theme, setTheme] = useState<SpectralTheme>('dark')

  useEffect(() => {
    const stored = readStoredTheme()
    setTheme(stored)
    applyTheme(stored)
  }, [])

  return (
    <button
      type="button"
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-pressed={theme === 'light'}
      title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
      onClick={() => setTheme((current) => toggleTheme(current))}
      className="w-7 h-7 rounded-lg flex items-center justify-center store-text-muted hover:text-[var(--store-ink)] hover:bg-[var(--store-surface-2)] transition-colors"
    >
      {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  )
}
