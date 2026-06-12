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

  return { activeTab, setTab }
}

export function HubUrlTabBar({
  basePath,
  tabs,
  defaultTab,
  paramKey = 'tab',
  className,
  testIdPrefix = 'hub-tab',
}: HubUrlTabBarProps) {
  const { activeTab, setTab } = useHubTab(basePath, tabs, defaultTab, paramKey)
  const visibleTabs = tabs.filter((t) => t.visible !== false)

  return (
    <div
      className={cn('hub-tab-bar', className)}
      role="tablist"
      aria-label="Section navigation"
    >
      {visibleTabs.map(({ key, label, icon: Icon }) => {
        const active = activeTab === key
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active}
            data-testid={`${testIdPrefix}-${key}`}
            onClick={() => setTab(key)}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
              active ? 'hub-tab-active' : 'hub-tab-inactive',
            )}
          >
            <Icon className="w-4 h-4 shrink-0" aria-hidden />
            {label}
          </button>
        )
      })}
    </div>
  )
}
