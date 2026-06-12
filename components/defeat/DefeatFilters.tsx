'use client'

import { Button } from '@/components/ui/button'
import { CATEGORY_PILLS, matchesCategoryPill, type CategoryPill } from '@/lib/platforms/constants'
import { DEFEAT_TYPE_FILTERS, type DefeatTypeFilter } from '@/lib/defeat/defeat-types'
import { cn } from '@/lib/utils'

interface DefeatFiltersProps {
  categoryPill: CategoryPill
  onCategoryPillChange: (pill: CategoryPill) => void
  defeatType: DefeatTypeFilter
  onDefeatTypeChange: (type: DefeatTypeFilter) => void
}

export function DefeatFilters({
  categoryPill,
  onCategoryPillChange,
  defeatType,
  onDefeatTypeChange,
}: DefeatFiltersProps) {
  const rowPills = CATEGORY_PILLS.filter(
    (p) => p.id !== 'gnss_shortcut' && p.id !== 'cuas_shortcut'
  )

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-xs font-mono text-t-muted uppercase tracking-wider mb-2">
          Platform category (rows)
        </p>
        <div className="flex flex-wrap gap-2">
          {rowPills.map((pill) => (
            <Button
              key={pill.id}
              variant="outline"
              size="sm"
              onClick={() => onCategoryPillChange(pill.id)}
              className={cn(
                categoryPill === pill.id
                  ? 'border-orange text-orange'
                  : 'border-border text-t-secondary'
              )}
            >
              {pill.label}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-mono text-t-muted uppercase tracking-wider mb-2">
          Defeat type (columns)
        </p>
        <div className="flex flex-wrap gap-2">
          {DEFEAT_TYPE_FILTERS.map((filter) => (
            <Button
              key={filter.id}
              variant="outline"
              size="sm"
              onClick={() => onDefeatTypeChange(filter.id)}
              className={cn(
                defeatType === filter.id
                  ? 'border-cyan text-cyan'
                  : 'border-border text-t-secondary'
              )}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
