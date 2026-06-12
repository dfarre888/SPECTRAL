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

interface DefeatFilterSidebarProps {
  platforms: Platform[]
  systems: AntiDroneSystem[]
  categoryPill: CategoryPill
  onCategoryPillChange: (pill: CategoryPill) => void
  defeatType: DefeatTypeFilter
  onDefeatTypeChange: (type: DefeatTypeFilter) => void
}

export function DefeatFilterSidebar({
  platforms,
  systems,
  categoryPill,
  onCategoryPillChange,
  defeatType,
  onDefeatTypeChange,
}: DefeatFilterSidebarProps) {
  const rowPills = CATEGORY_PILLS.filter(
    (p) => p.id !== 'gnss_shortcut' && p.id !== 'cuas_shortcut',
  )

  return (
    <StoreFilterSidebar>
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

      <StoreFilterSection label="Matrix size">
        <p className="text-xs font-mono store-text-body">
          {platforms.filter((p) => matchesCategoryPill(p.category, categoryPill)).length}{' '}
          platforms × {systems.length} systems
        </p>
      </StoreFilterSection>
    </StoreFilterSidebar>
  )
}
