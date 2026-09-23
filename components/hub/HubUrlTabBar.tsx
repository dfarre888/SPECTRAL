'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface HubTabDef {
  key: string
  label: string
  icon: LucideIcon
  visible?: boolean
}

interface HubUrlTabBarProps {
  basePath: string
  tabs: HubTabDef[]
  defaultTab?: string
  paramKey?: string
  className?: string
  testIdPrefix?: string
}

export interface HubTabBarProps {
  tabs: HubTabDef[]
  activeTab: string
  onTabChange: (key: string) => void
  className?: string
  testIdPrefix?: string
}

export function useHubTab(
  basePath: string,
  tabs: HubTabDef[],
  defaultTab?: string,
  paramKey = 'tab',
) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fallback = defaultTab ?? tabs.find((t) => t.visible !== false)?.key ?? tabs[0]?.key ?? 'overview'
  const raw = searchParams.get(paramKey)
  const activeTab = tabs.some((t) => t.key === raw && t.visible !== false) ? raw! : fallback

  const setTab = (key: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (key === fallback) params.delete(paramKey)
    else params.set(paramKey, key)
    const qs = params.toString()
    router.replace(`${basePath}${qs ? `?${qs}` : ''}`, { scroll: false })
  }

  return { activeTab, setTab, searchParams }
}

/**
 * Presentational, controlled tab bar. Use when the caller needs to run its own
 * logic on tab change (see ForceCatalogClient, which clears compare scope).
 */
export function HubTabBar({
  tabs,
  activeTab,
  onTabChange,
  className,
  testIdPrefix = 'hub-tab',
}: HubTabBarProps) {
  const visibleTabs = tabs.filter((t) => t.visible !== false)

  return (
    <div
      className={cn('seg max-w-full overflow-x-auto', className)}
      role="tablist"
      aria-label="Section navigation"
    >
      {visibleTabs.map(({ key, label }) => {
        const active = activeTab === key
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active}
            data-testid={`${testIdPrefix}-${key}`}
            onClick={() => onTabChange(key)}
            className="inline-flex items-center"
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

/** URL-bound tab bar — reads and writes the active tab as a query parameter. */
export function HubUrlTabBar({
  basePath,
  tabs,
  defaultTab,
  paramKey = 'tab',
  className,
  testIdPrefix = 'hub-tab',
}: HubUrlTabBarProps) {
  const { activeTab, setTab } = useHubTab(basePath, tabs, defaultTab, paramKey)

  return (
    <HubTabBar
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setTab}
      className={className}
      testIdPrefix={testIdPrefix}
    />
  )
}
