'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

const RAIL_KEY = 'spectral-sidebar-rail'

interface MobileNavContextValue {
  /** Mobile drawer open. */
  open: boolean
  toggle: () => void
  close: () => void
  /** Desktop sidebar collapsed to an icon rail. */
  rail: boolean
  toggleRail: () => void
}

const MobileNavContext = createContext<MobileNavContextValue | null>(null)

export function MobileNavProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [rail, setRail] = useState(false)
  useEffect(() => {
    try {
      setRail(window.localStorage.getItem(RAIL_KEY) === '1')
    } catch {
      /* storage blocked: the rail is a convenience */
    }
  }, [])
  const toggle = useCallback(() => setOpen((v) => !v), [])
  const close = useCallback(() => setOpen(false), [])
  const toggleRail = useCallback(() => {
    setRail((v) => {
      const next = !v
      try {
        window.localStorage.setItem(RAIL_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  // Cmd+\ / Ctrl+\ toggles the sidebar, the macOS convention.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault()
        toggleRail()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleRail])

  return (
    <MobileNavContext.Provider value={{ open, toggle, close, rail, toggleRail }}>
      {children}
    </MobileNavContext.Provider>
  )
}

export function useMobileNav() {
  const ctx = useContext(MobileNavContext)
  if (!ctx) throw new Error('useMobileNav must be used within MobileNavProvider')
  return ctx
}
