'use client'

import { Search, Database, Plane, Crosshair, Satellite, Shield } from 'lucide-react'
import { useRouter } from 'next/navigation'
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
import type { Platform } from '@/lib/types'

const PILL_ICONS: Partial<Record<CategoryPill, React.ReactNode>> = {
  all: <Database size={13} />,
  male_hale: <Plane size={13} />,
  fpv: <Crosshair size={13} />,
  owa: <Crosshair size={13} />,
  gnss_shortcut: <Satellite size={13} />,
  cuas_shortcut: <Shield size={13} />,
}

interface PlatformFilterSidebarProps {
  platforms: Platform[]
  categoryPill: CategoryPill
  onCategoryPillChange: (pill: CategoryPill) => void
  country: string
  onCountryChange: (country: string) => void
  search: string
  onSearchChange: (search: string) => void
  countries: string[]
}

function pillCount(platforms: Platform[], pill: CategoryPill): number {
  if (pill === 'gnss_shortcut' || pill === 'cuas_shortcut') return 0
  return platforms.filter((p) => matchesCategoryPill(p.category, pill)).length
}

export function PlatformFilterSidebar(props: PlatformFilterSidebarProps) {
  const router = useRouter()
  const {
    platforms,
    categoryPill,
    onCategoryPillChange,
    country,
    onCountryChange,
    search,
    onSearchChange,
    countries,
  } = props

  const handlePill = (pill: CategoryPill) => {
    if (pill === 'gnss_shortcut') {
      router.push('/gnss')
      return
    }
    if (pill === 'cuas_shortcut') {
      router.push('/defeat')
      return
    }
    onCategoryPillChange(pill)
  }

  return (
    <StoreFilterSidebar>
      <StoreFilterSection label="Search">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 store-text-muted"
          />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search platforms, NATO name…"
            className="w-full text-[13px] pl-9 pr-3 py-2.5 rounded-xl text-white store-panel-inner focus:outline-none focus:border-[var(--store-accent-border)]"
          />
        </div>
      </StoreFilterSection>

      <StoreFilterSection label="Categories">
        <nav className="space-y-0.5">
          {CATEGORY_PILLS.map((pill) => (
            <StoreFilterNavItem
              key={pill.id}
              active={categoryPill === pill.id}
              label={pill.label}
              count={
                pill.id === 'all'
                  ? platforms.length
                  : pillCount(platforms, pill.id) || undefined
              }
              icon={PILL_ICONS[pill.id]}
              onClick={() => handlePill(pill.id)}
            />
          ))}
        </nav>
      </StoreFilterSection>

      <StoreFilterSection label="Country of origin">
        <select
          value={country}
          onChange={(e) => onCountryChange(e.target.value)}
          className="w-full text-[13px] px-3 py-2.5 rounded-xl text-white store-panel-inner focus:outline-none focus:border-[var(--store-accent-border)]"
        >
          <option value="all">All countries</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </StoreFilterSection>
    </StoreFilterSidebar>
  )
}

/** Compact filters for viewports below lg. */
export function PlatformMobileFilters({
  categoryPill,
  onCategoryPillChange,
  search,
  onSearchChange,
}: Pick<
  PlatformFilterSidebarProps,
  'categoryPill' | 'onCategoryPillChange' | 'search' | 'onSearchChange'
>) {
  const router = useRouter()
  const rowPills = CATEGORY_PILLS.filter(
    (p) => p.id !== 'gnss_shortcut' && p.id !== 'cuas_shortcut',
  )

  return (
    <div className="lg:hidden space-y-3 mb-4">
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 store-text-muted"
        />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search platforms…"
          className="w-full text-sm pl-9 pr-3 py-2 rounded-xl text-white store-panel-inner"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {rowPills.map((pill) => (
          <button
            key={pill.id}
            type="button"
            onClick={() => onCategoryPillChange(pill.id)}
            className={
              categoryPill === pill.id
                ? 'text-xs px-3 py-1.5 rounded-full font-semibold bg-[var(--store-accent-glow)] border border-[var(--store-accent-border)] text-[var(--store-accent)]'
                : 'text-xs px-3 py-1.5 rounded-full store-panel-inner store-text-body border border-[var(--store-line)]'
            }
          >
            {pill.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => router.push('/defeat')}
          className="text-xs px-3 py-1.5 rounded-full store-panel-inner store-text-body border border-[var(--store-line)]"
        >
          C-UAS →
        </button>
      </div>
    </div>
  )
}
