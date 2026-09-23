'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type HomeDashboardTab = 'command' | 'modules'

const TAB_KEY = 'spectral_dashboard_tab'

function getSavedTab(defaultTab: HomeDashboardTab): HomeDashboardTab {
  if (typeof window === 'undefined') return defaultTab
  try {
    const saved = window.localStorage.getItem(TAB_KEY)
    return saved === 'command' || saved === 'modules' ? saved : defaultTab
  } catch {
    return defaultTab
  }
}

const TABS = [
  { id: 'command' as const, label: 'Command centre' },
  { id: 'modules' as const, label: 'Module catalogue' },
] as const

const HomeTabContext = createContext<{ tab: HomeDashboardTab; setTab: (t: HomeDashboardTab) => void } | null>(null)

/**
 * The view switch. Rendered wherever the page puts it (the hero, on home),
 * reading tab state from DashboardHomeTabs through context so a server page
 * can place it without passing functions across the boundary.
 */
export function HomeTabSwitch() {
  const ctx = useContext(HomeTabContext)
  if (!ctx) return null
  return (
    <div className="seg" role="tablist" aria-label="Dashboard view">
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={ctx.tab === id}
          onClick={() => ctx.setTab(id)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

interface DashboardHomeTabsProps {
  defaultTab: HomeDashboardTab
  /** Rendered above both panels; should contain a HomeTabSwitch. */
  hero?: ReactNode
  commandCenter: ReactNode
  moduleCatalog: ReactNode
}

export function DashboardHomeTabs({ defaultTab, hero, commandCenter, moduleCatalog }: DashboardHomeTabsProps) {
  const [tab, setTabState] = useState<HomeDashboardTab>(defaultTab)

  useEffect(() => {
    setTabState(getSavedTab(defaultTab))
  }, [defaultTab])

  const setTab = (id: HomeDashboardTab) => {
    setTabState(id)
    try {
      localStorage.setItem(TAB_KEY, id)
    } catch {
      /* storage blocked: the choice just is not remembered */
    }
  }

  return (
    <HomeTabContext.Provider value={{ tab, setTab }}>
      <div className="mb-8">
        {hero ?? (
          <div className="mb-6">
            <HomeTabSwitch />
          </div>
        )}
        <div role="tabpanel" hidden={tab !== 'command'} className={tab === 'command' ? undefined : 'hidden'}>
          {commandCenter}
        </div>
        <div role="tabpanel" hidden={tab !== 'modules'} className={tab === 'modules' ? undefined : 'hidden'}>
          {moduleCatalog}
        </div>
      </div>
    </HomeTabContext.Provider>
  )
}
