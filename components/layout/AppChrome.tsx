'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { MobileNavProvider } from '@/components/layout/MobileNavContext'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { moduleByHref } from '@/lib/navigation/modules'
import { cn } from '@/lib/utils'

interface AppChromeProps {
  proposedCurrencyCount?: number
  platformCount?: number
  children: ReactNode
  /** Full-bleed modules (map, spectrum) — no main padding */
  fullBleed?: boolean
  moduleLabel?: string
}

/** Scroll distance at which the top bar turns to glass. */
const EDGE_AT = 6
/** Scroll distance at which the page's large title has left the frame. */
const TITLE_AT = 96

/**
 * Unified application chrome. A floating glass sidebar, and a top bar that
 * sits over the page: transparent at rest, glass once content scrolls under
 * it (the HIG scroll-edge effect), picking up the page title as the large
 * title scrolls away.
 */
export function AppChrome({
  proposedCurrencyCount = 0,
  platformCount = 0,
  children,
  fullBleed = false,
}: AppChromeProps) {
  const pathname = usePathname()
  const title = moduleByHref(pathname)?.label
  const mainRef = useRef<HTMLElement | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const [titleOut, setTitleOut] = useState(false)

  const onScroll = useCallback(() => {
    const y = mainRef.current?.scrollTop ?? 0
    setScrolled((prev) => (prev === y > EDGE_AT ? prev : y > EDGE_AT))
    setTitleOut((prev) => (prev === y > TITLE_AT ? prev : y > TITLE_AT))
  }, [])

  // A new page starts at the top with a clear bar.
  useEffect(() => {
    setScrolled(false)
    setTitleOut(false)
  }, [pathname])

  return (
    <MobileNavProvider>
      <div
        className="app-shell flex h-[calc(100vh-20px)] md:p-2.5 md:gap-2.5"
        data-scrolled={fullBleed ? 'true' : scrolled ? 'true' : 'false'}
        data-scrolled-title={fullBleed ? 'true' : titleOut ? 'true' : 'false'}
      >
        <Sidebar proposedCurrencyCount={proposedCurrencyCount} platformCount={platformCount} />
        <div className="relative flex-1 min-w-0 overflow-hidden md:rounded-[18px]">
          <Topbar title={title} />
          <main
            ref={mainRef}
            onScroll={fullBleed ? undefined : onScroll}
            className={cn(
              'h-full min-h-0',
              fullBleed
                ? 'overflow-hidden pt-14'
                : 'overflow-auto px-4 pt-[72px] pb-16 md:px-7 lg:px-10',
            )}
          >
            {children}
          </main>
        </div>
      </div>
    </MobileNavProvider>
  )
}
