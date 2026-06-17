'use client'

import { useMemo, useState } from 'react'
import { BadgeCheck, Database, ShieldCheck } from 'lucide-react'
import {
  StoreCatalogHeader,
  StoreCatalogLayout,
} from '@/components/catalog/StoreCatalogLayout'
import { StoreHero } from '@/components/catalog/StoreHero'
import { CompareTray } from '@/components/platforms/CompareTray'
import {
  PlatformFilterSidebar,
  PlatformMobileFilters,
} from '@/components/platforms/PlatformFilterSidebar'
import { PlatformGrid } from '@/components/platforms/PlatformGrid'
import { CATEGORY_PILLS, matchesCategoryPill, type CategoryPill } from '@/lib/platforms/constants'
import type { Platform } from '@/lib/types'
import type { SovereignPlatform } from '@/lib/platforms/sovereign-types'
import { SovereignPlatformCard } from '@/components/platforms/SovereignPlatformCard'

interface PlatformLibraryProps {
  platforms: Platform[]
  countries: string[]
  sovereignPlatforms?: SovereignPlatform[]
}

function sectionTitle(pill: CategoryPill): string {
  if (pill === 'all') return 'All Platforms'
  return CATEGORY_PILLS.find((p) => p.id === pill)?.label ?? 'Platforms'
}

export function PlatformLibrary({ platforms, countries, sovereignPlatforms = [] }: PlatformLibraryProps) {
  const [categoryPill, setCategoryPill] = useState<CategoryPill>('all')
  const [country, setCountry] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return platforms.filter((p) => {
      if (!matchesCategoryPill(p.category, categoryPill)) return false
      if (country !== 'all' && p.country_of_origin !== country) return false
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        (p.manufacturer?.toLowerCase().includes(q) ?? false) ||
        (p.nato_reporting_name?.toLowerCase().includes(q) ?? false) ||
        (p.country_of_origin?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [platforms, categoryPill, country, search])

  return (
    <div className="pb-24">
      <StoreHero
        eyebrow="OSINT Database"
        title={
          <>
            Military UAS Platforms,
            <br />
            Curated for Threat Analysis
          </>
        }
        subtitle="World UAS order of battle from open sources — specifications, EW bands, combat employment, and defeat cross-reference. Built for instructor-led UNCLASSIFIED training."
        trustChip={
          <>
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                background: 'var(--store-success)',
                boxShadow: '0 0 8px var(--store-success)',
              }}
            />
            Intel update 2026-06-07 — {platforms.length} platforms catalogued from OSINT
          </>
        }
        trustItems={[
          { icon: ShieldCheck, label: 'ITAR-compliant data only' },
          { icon: BadgeCheck, label: 'NATO confidence language' },
          { icon: Database, label: 'Defeat matrix cross-linked' },
        ]}
      />

      <StoreCatalogLayout
        sidebar={
          <PlatformFilterSidebar
            platforms={platforms}
            categoryPill={categoryPill}
            onCategoryPillChange={setCategoryPill}
            country={country}
            onCountryChange={setCountry}
            search={search}
            onSearchChange={setSearch}
            countries={countries}
            sovereignCount={sovereignPlatforms.length}
          />
        }
      >
        <PlatformMobileFilters
          categoryPill={categoryPill}
          onCategoryPillChange={setCategoryPill}
          search={search}
          onSearchChange={setSearch}
          sovereignCount={sovereignPlatforms.length}
        />

        <StoreCatalogHeader
          title={sectionTitle(categoryPill)}
          meta={
            categoryPill === 'sovereign'
              ? `${sovereignPlatforms.length} sovereign programmes`
              : `Showing ${filtered.length} of ${platforms.length}`
          }
        />

        {categoryPill === 'sovereign' ? (
          <div className="space-y-10">
            {(['Australia', 'UK', 'USA'] as const).map((country) => {
              const group = sovereignPlatforms.filter((s) => s.origin_country === country)
              if (!group.length) return null
              return (
                <section key={country}>
                  <h2 className="text-sm font-mono store-text-muted uppercase tracking-wider mb-4">{country}</h2>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {group.map((sp) => (
                      <SovereignPlatformCard key={sp.id} platform={sp} />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        ) : (
          <PlatformGrid platforms={filtered} />
        )}
      </StoreCatalogLayout>

      <CompareTray platforms={platforms} />
    </div>
  )
}
