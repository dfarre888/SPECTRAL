'use client'

import {
  StoreFilterNavItem,
  StoreFilterSection,
  StoreFilterSidebar,
} from '@/components/catalog/StoreFilterSidebar'
import {
  CATEGORY_PILLS,
  matchesCategoryPill,
  type CategoryPill,
} from '@/lib/platforms/constants'
import {
  DEFEAT_TYPE_FILTERS,
  systemMatchesDefeatType,
  type DefeatTypeFilter,
} from '@/lib/defeat/defeat-types'
import type { AntiDroneSystem, Platform } from '@/lib/types'
import { cn } from '@/lib/utils'

interface DefeatFilterSidebarProps {
  platforms: Platform[]
  systems: AntiDroneSystem[]
  categoryPill: CategoryPill
  onCategoryPillChange: (pill: CategoryPill) => void
  defeatType: DefeatTypeFilter
  onDefeatTypeChange: (type: DefeatTypeFilter) => void
  className?: string
}

export function DefeatFilterSidebar({
  platforms,
  systems,
  categoryPill,
  onCategoryPillChange,
  defeatType,
  onDefeatTypeChange,
  className,
}: DefeatFilterSidebarProps) {
  const rowPills = CATEGORY_PILLS.filter(
    (p) => p.id !== 'gnss_shortcut' && p.id !== 'cuas_shortcut',
  )

  return (
    // Never taller than the matrix beside it, so the sidebar cannot lengthen
    // the page past the point where the matrix docks under the top bar.
    // Sticky offsets are measured inside the page scroller's 72px top
    // padding, so top-0 already clears the top bar.
    <StoreFilterSidebar className={cn('lg:top-0 lg:max-h-[max(440px,calc(100vh_-_216px))]', className)}>
      <StoreFilterSection label="Platform rows">
        <nav className="space-y-0.5">
          {rowPills.map((pill) => (
            <StoreFilterNavItem
              key={pill.id}
              active={categoryPill === pill.id}
              label={pill.label}
              count={
                pill.id === 'all'
                  ? platforms.length
                  : platforms.filter((p) => matchesCategoryPill(p.category, pill.id)).length
              }
              onClick={() => onCategoryPillChange(pill.id)}
            />
          ))}
        </nav>
      </StoreFilterSection>

      <StoreFilterSection label="Defeat type (columns)">
        <nav className="space-y-0.5">
          {DEFEAT_TYPE_FILTERS.map((filter) => (
            <StoreFilterNavItem
              key={filter.id}
              active={defeatType === filter.id}
              label={filter.label}
              count={
                filter.id === 'all'
                  ? systems.length
                  : systems.filter((s) => systemMatchesDefeatType(s, filter.id)).length
              }
              onClick={() => onDefeatTypeChange(filter.id)}
            />
          ))}
        </nav>
      </StoreFilterSection>
    </StoreFilterSidebar>
  )
}
