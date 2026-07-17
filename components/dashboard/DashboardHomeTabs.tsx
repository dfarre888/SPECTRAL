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
        className="inline-flex rounded-xl border border-[var(--store-line)] bg-[var(--store-surface-2)] p-1 mb-6"
        role="tablist"
        aria-label="Dashboard view"
      >
        {(
          [
            { id: 'command' as const, label: 'Command Center' },
            { id: 'modules' as const, label: 'Module Catalog' },
          ] as const
        ).map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => handleTabChange(id)}
            className={cn(
              'px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-colors',
              tab === id
                ? 'bg-[var(--store-accent-glow)] text-[var(--store-accent)] border border-[var(--store-accent-border)]'
                : 'store-text-muted hover:text-white border border-transparent',
            )}
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
