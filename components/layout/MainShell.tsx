'use client'

import { AppChrome } from '@/components/layout/AppChrome'

interface MainShellProps {
  proposedCurrencyCount: number
  platformCount: number
  children: React.ReactNode
  /** Full-bleed modules (map, spectrum) — no main padding */
  fullBleed?: boolean
  moduleLabel?: string
}

export function MainShell({
  proposedCurrencyCount,
  platformCount,
  children,
  fullBleed = false,
  moduleLabel,
}: MainShellProps) {
  return (
    <AppChrome
      proposedCurrencyCount={proposedCurrencyCount}
      platformCount={platformCount}
      fullBleed={fullBleed}
      moduleLabel={moduleLabel}
    >
      {children}
    </AppChrome>
  )
}
