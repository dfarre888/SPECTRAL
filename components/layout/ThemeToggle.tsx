'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { applyTheme, readStoredTheme, toggleTheme, type SpectralTheme } from '@/lib/ui/theme'

export function ThemeToggle({ labeled = false }: { labeled?: boolean }) {
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
      className={
        labeled
          ? 'map-press h-7 px-2 rounded-lg inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold border border-[var(--store-line)] store-text-body hover:border-[var(--store-accent-border)] hover:text-[var(--store-ink)]'
          : 'map-press w-7 h-7 rounded-lg flex items-center justify-center store-text-muted hover:text-[var(--store-ink)] hover:bg-[var(--store-surface-2)]'
      }
    >
      {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
      {labeled ? <span>{theme === 'dark' ? 'Light' : 'Dark'}</span> : null}
    </button>
  )
}
