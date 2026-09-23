'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Columns3, LayoutGrid, Rows3, Search, X } from 'lucide-react'
import { CompareTray } from '@/components/platforms/CompareTray'
import { PlatformGrid } from '@/components/platforms/PlatformGrid'
import { PlatformTable } from '@/components/platforms/PlatformTable'
import { CATEGORY_PILLS, matchesCategoryPill, type CategoryPill } from '@/lib/platforms/constants'
import { useCompareStore } from '@/lib/stores/compare-store'
import type { Platform } from '@/lib/types'
import type { SovereignPlatform } from '@/lib/platforms/sovereign-types'
import { SovereignPlatformCard } from '@/components/platforms/SovereignPlatformCard'
import { cn } from '@/lib/utils'

interface PlatformLibraryProps {
  platforms: Platform[]
  countries: string[]
  sovereignPlatforms?: SovereignPlatform[]
}

type View = 'list' | 'gallery'
type Force = 'all' | 'blue' | 'red'

const VIEW_KEY = 'spectral.platforms.view'
const COLS_KEY = 'spectral.platforms.moreColumns'

/** Segment labels, shorter than the sidebar labels they replace. */
const SEG_LABEL: Partial<Record<CategoryPill, string>> = {
  all: 'All',
  male_hale: 'MALE / HALE',
  fpv: 'FPV',
  owa: 'OWA / Loitering',
  missiles: 'Ballistic & Cruise',
  cots: 'COTS',
  sovereign: 'Sovereign',
}

/** Category pills that filter in place. GNSS and C-UAS live in other modules. */
const IN_PLACE = CATEGORY_PILLS.filter((p) => p.id !== 'gnss_shortcut' && p.id !== 'cuas_shortcut')

export function PlatformLibrary({ platforms, countries, sovereignPlatforms = [] }: PlatformLibraryProps) {
  const [categoryPill, setCategoryPill] = useState<CategoryPill>('all')
  const [country, setCountry] = useState('all')
  const [force, setForce] = useState<Force>('all')
  const [combatOnly, setCombatOnly] = useState(false)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<View>('list')
  const [moreColumns, setMoreColumns] = useState(false)
  const compareCount = useCompareStore((s) => s.ids.length)

  // Restore the last view after mount so server and client render the same markup.
  useEffect(() => {
    try {
      const v = window.localStorage.getItem(VIEW_KEY)
      if (v === 'list' || v === 'gallery') setView(v)
      if (window.localStorage.getItem(COLS_KEY) === '1') setMoreColumns(true)
    } catch {
      /* storage unavailable: keep the default */
    }
  }, [])

  const chooseView = (v: View) => {
    setView(v)
    try {
      window.localStorage.setItem(VIEW_KEY, v)
    } catch {
      /* storage unavailable */
    }
  }

  const toggleColumns = () => {
    setMoreColumns((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(COLS_KEY, next ? '1' : '0')
      } catch {
        /* storage unavailable */
      }
      return next
    })
  }

  const counts = useMemo(() => {
    const out: Partial<Record<CategoryPill, number>> = {}
    for (const pill of IN_PLACE) {
      out[pill.id] =
        pill.id === 'sovereign'
          ? sovereignPlatforms.length
          : pill.id === 'all'
            ? platforms.length
            : platforms.filter((p) => matchesCategoryPill(p.category, pill.id)).length
    }
    return out
  }, [platforms, sovereignPlatforms.length])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return platforms.filter((p) => {
      if (!matchesCategoryPill(p.category, categoryPill)) return false
      if (force === 'blue' && p.side !== 'blue' && p.catalog_tier !== 'cots' && p.side !== 'neutral') return false
      if (force === 'red' && p.side !== 'red' && p.catalog_tier !== 'cots' && p.side !== 'neutral') return false
      if (combatOnly && !p.conflict_deployments?.length) return false
      if (country !== 'all' && p.country_of_origin !== country) return false
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        (p.manufacturer?.toLowerCase().includes(q) ?? false) ||
        (p.nato_reporting_name?.toLowerCase().includes(q) ?? false) ||
        (p.country_of_origin?.toLowerCase().includes(q) ?? false) ||
        (p.a3dm_drone_id?.toLowerCase().includes(q) ?? false) ||
        (p.a3dm_category?.toLowerCase().includes(q) ?? false) ||
        (p.sub_category?.toLowerCase().includes(q) ?? false) ||
        p.id.toLowerCase().includes(q)
      )
    })
  }, [platforms, categoryPill, country, search, force, combatOnly])

  const sovereign = categoryPill === 'sovereign'
  const filtersActive = force !== 'all' || combatOnly || country !== 'all' || search.trim() !== ''

  const resetFilters = () => {
    setForce('all')
    setCombatOnly(false)
    setCountry('all')
    setSearch('')
  }

  return (
    <div className={compareCount > 0 ? 'pb-24' : 'pb-8'}>
      <header>
        <h1 className="page-title">Platform Library</h1>
        <p className="page-lede">
          {platforms.length} UAS, missiles, jammers and C-UAS systems from open sources: specifications, EW bands,
          combat employment and defeat cross-reference.
        </p>
        <p className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] store-text-muted">
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden
              className="w-1.5 h-1.5 rounded-full bg-[var(--store-success)] shadow-[0_0_8px_var(--store-success)]"
            />
            Intel update Jul 2026, {platforms.length} platforms catalogued from OSINT
          </span>
          <span aria-hidden>·</span>
          <span>ITAR-compliant data only</span>
          <span aria-hidden>·</span>
          <span>NATO confidence language</span>
          <span aria-hidden>·</span>
          <span>Defeat matrix cross-linked</span>
        </p>
      </header>

      {/* Controls: filters on the left, view on the right. */}
      <div className="mt-6 flex flex-wrap items-center gap-2.5">
        <fieldset
          disabled={sovereign}
          className={cn(
            'contents',
            sovereign && '[&>*]:opacity-40 [&>*]:pointer-events-none',
          )}
        >
          <legend className="sr-only">Filters</legend>
          <label className="relative block w-full sm:w-[280px]">
            <span className="sr-only">Search platforms</span>
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 store-text-muted pointer-events-none"
              aria-hidden
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, maker or ID"
              className="glass-field w-full h-[38px] pl-9 pr-8 text-[13px]"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center w-6 h-6 rounded-full store-text-muted hover:text-white"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            ) : null}
          </label>

          <label className="block">
            <span className="sr-only">Country of origin</span>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="glass-field h-[38px] pl-3 pr-8 text-[13px] max-w-[200px]"
            >
              <option value="all">All countries</option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <div className="seg" role="group" aria-label="Force">
            {(
              [
                ['all', 'All forces'],
                ['blue', 'Blue'],
                ['red', 'Red'],
              ] as const
            ).map(([id, label]) => (
              <button key={id} type="button" aria-pressed={force === id} onClick={() => setForce(id)}>
                {id !== 'all' ? (
                  <span
                    aria-hidden
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: id === 'red' ? 'var(--wb-red)' : 'var(--wb-blue)' }}
                  />
                ) : null}
                {label}
              </button>
            ))}
          </div>

          <button type="button" className="btn-e" aria-pressed={combatOnly} onClick={() => setCombatOnly((v) => !v)}>
            Combat proven
          </button>

          {filtersActive ? (
            <button type="button" className="fc-action px-1" onClick={resetFilters}>
              Reset
            </button>
          ) : null}
        </fieldset>

        <div className={cn('ml-auto seg sm', sovereign && 'opacity-40')} role="group" aria-label="View">
          <button type="button" aria-pressed={view === 'list'} onClick={() => chooseView('list')} disabled={sovereign}>
            <Rows3 size={14} aria-hidden />
            List
          </button>
          <button
            type="button"
            aria-pressed={view === 'gallery'}
            onClick={() => chooseView('gallery')}
            disabled={sovereign}
          >
            <LayoutGrid size={14} aria-hidden />
            Gallery
          </button>
        </div>
      </div>

      <div className="mt-3 mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* Category: segmented control on wide screens, a select on narrow ones. */}
        <div className="seg sm hidden lg:inline-flex" role="group" aria-label="Category">
          {IN_PLACE.map((pill) => (
            <button
              key={pill.id}
              type="button"
              aria-pressed={categoryPill === pill.id}
              onClick={() => setCategoryPill(pill.id)}
            >
              {SEG_LABEL[pill.id] ?? pill.label}
              {counts[pill.id] ? (
                <span className="font-mono text-[11px] tabular-nums opacity-60">{counts[pill.id]}</span>
              ) : null}
            </button>
          ))}
        </div>
        <label className="lg:hidden block">
          <span className="sr-only">Category</span>
          <select
            value={categoryPill}
            onChange={(e) => setCategoryPill(e.target.value as CategoryPill)}
            className="glass-field h-[34px] pl-3 pr-8 text-[13px]"
          >
            {IN_PLACE.map((pill) => (
              <option key={pill.id} value={pill.id}>
                {SEG_LABEL[pill.id] ?? pill.label} ({counts[pill.id] ?? 0})
              </option>
            ))}
          </select>
        </label>

        <span className="flex items-center gap-3">
          <Link href="/gnss" className="fc-action">
            GNSS jammers <ArrowUpRight size={13} aria-hidden />
          </Link>
          <Link href="/defeat" className="fc-action">
            C-UAS systems <ArrowUpRight size={13} aria-hidden />
          </Link>
        </span>

        {view === 'list' && !sovereign ? (
          <button
            type="button"
            className="ml-auto fc-action"
            aria-pressed={moreColumns}
            onClick={toggleColumns}
            title="Show Guidance, MTOW and Warhead"
          >
            <Columns3 size={14} aria-hidden />
            {moreColumns ? 'Fewer columns' : 'More columns'}
          </button>
        ) : null}
        <span
          className={cn(
            'text-[12px] store-text-muted font-mono tabular-nums',
            (view !== 'list' || sovereign) && 'ml-auto',
          )}
          aria-live="polite"
        >
          {sovereign
            ? `${sovereignPlatforms.length} sovereign programmes`
            : `${filtered.length} of ${platforms.length}`}
        </span>
      </div>

      {sovereign ? (
        <div className="space-y-8">
          {(['Australia', 'UK', 'USA'] as const).map((c) => {
            const group = sovereignPlatforms.filter((s) => s.origin_country === c)
            if (!group.length) return null
            return (
              <section key={c}>
                <h2 className="text-[15px] font-semibold text-[var(--store-ink)] mb-3">{c}</h2>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {group.map((sp) => (
                    <SovereignPlatformCard key={sp.id} platform={sp} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      ) : view === 'list' ? (
        <PlatformTable
          platforms={filtered}
          extended={moreColumns}
          reserveBottom={compareCount > 0 ? 76 : 0}
          empty={
            <span>
              No platforms match these filters.{' '}
              <button type="button" className="text-[var(--wb-blue)] hover:underline" onClick={resetFilters}>
                Reset filters
              </button>
            </span>
          }
        />
      ) : (
        <PlatformGrid platforms={filtered} />
      )}

      <CompareTray platforms={platforms} />
    </div>
  )
}
