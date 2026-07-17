'use client'

import type { ReactNode } from 'react'
import { MobileNavProvider } from '@/components/layout/MobileNavContext'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { cn } from '@/lib/utils'

interface AppChromeProps {
  proposedCurrencyCount?: number
  platformCount?: number
  children: ReactNode
  /** Full-bleed modules (map, spectrum) — no main padding */
  fullBleed?: boolean
  moduleLabel?: string
}

/**
 * Unified application chrome — sidebar + topbar on every module.
 */
export function AppChrome({
  proposedCurrencyCount = 0,
  platformCount = 0,
  children,
  fullBleed = false,
  moduleLabel,
}: AppChromeProps) {
  return (
    <MobileNavProvider>
      <div className="flex h-[calc(100vh-20px)] hub-page-canvas">
        <Sidebar proposedCurrencyCount={proposedCurrencyCount} platformCount={platformCount} />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden md:ml-0">
          <Topbar />
          {moduleLabel ? (
            <div className="h-8 shrink-0 flex items-center px-4 border-b border-[var(--store-line)] bg-[var(--store-surface)]">
              <span className="text-[10px] font-mono store-text-muted uppercase tracking-wider">
                SPECTRAL · {moduleLabel} · UNCLASSIFIED // training
              </span>
            </div>
          ) : null}
          <main
            className={cn(
              'flex-1 min-h-0 overflow-hidden',
              !fullBleed && 'overflow-auto p-4 md:p-6 lg:p-8',
            )}
          >
            {children}
          </main>
        </div>
      </div>
    </MobileNavProvider>
  )
}
