'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export type HomeDashboardTab = 'command' | 'modules'

const TAB_KEY = 'spectral_dashboard_tab'

function getSavedTab(defaultTab: HomeDashboardTab): HomeDashboardTab {
  if (typeof window === 'undefined') return defaultTab
  const saved = window.localStorage.getItem(TAB_KEY)
  return saved === 'command' || saved === 'modules' ? saved : defaultTab
}

interface DashboardHomeTabsProps {
  defaultTab: HomeDashboardTab
  commandCenter: React.ReactNode
  moduleCatalog: React.ReactNode
}

export function DashboardHomeTabs({
  defaultTab,
  commandCenter,
  moduleCatalog,
}: DashboardHomeTabsProps) {
  const [tab, setTab] = useState<HomeDashboardTab>(defaultTab)

  useEffect(() => {
    setTab(getSavedTab(defaultTab))
  }, [defaultTab])

  const handleTabChange = (id: HomeDashboardTab) => {
    setTab(id)
    localStorage.setItem(TAB_KEY, id)
  }

  return (
    <div className="mb-8">
      <div
        className="flex gap-2 border-b fc-hair pb-3 mb-6"
        role="tablist"
        aria-label="Dashboard view"
      >
        {(
          [
            { id: 'command' as const, label: 'Command centre' },
            { id: 'modules' as const, label: 'Module catalogue' },
          ] as const
        ).map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => handleTabChange(id)}
            className="fc-tab"
          >
            {label}
          </button>
        ))}
      </div>

      <div role="tabpanel" hidden={tab !== 'command'} className={tab === 'command' ? undefined : 'hidden'}>
        {commandCenter}
      </div>
      <div role="tabpanel" hidden={tab !== 'modules'} className={tab === 'modules' ? undefined : 'hidden'}>
        {moduleCatalog}
      </div>
    </div>
  )
}
