'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { SlidersHorizontal, X } from 'lucide-react'
import { isOperationsEditionClient } from '@/lib/operations/edition-client'
import { StoreCatalogLayout } from '@/components/catalog/StoreCatalogLayout'
import { AdjudicationPanel } from '@/components/defeat/AdjudicationPanel'
import { DefeatFilterSidebar } from '@/components/defeat/DefeatFilterSidebar'
import { DefeatHeatmap } from '@/components/defeat/DefeatHeatmap'
import { DefeatMatrixTable } from '@/components/defeat/DefeatMatrixTable'
import { DefeatMatrixFullscreen } from '@/components/defeat/DefeatMatrixFullscreen'
import { SamInterceptPanel } from '@/components/defeat/SamInterceptPanel'
import { exportMatrixCsv } from '@/lib/defeat/export-csv'
import {
  DEFEAT_TYPE_FILTERS,
  systemMatchesDefeatType,
  type DefeatTypeFilter,
} from '@/lib/defeat/defeat-types'
import { CATEGORY_PILLS, matchesCategoryPill, type CategoryPill } from '@/lib/platforms/constants'
import { cn } from '@/lib/utils'
import type { DefeatMatrixPayload } from '@/lib/types'

interface DefeatMatrixProps {
  data: DefeatMatrixPayload
}

type MatrixView = 'table' | 'heatmap'

/** Per-viewer convenience only: whether the filter sidebar is open. */
const FILTERS_KEY = 'spectral.defeat.filters-open'

/** Overlay: 100vh less the banner (20), the overlay bar (57) and its padding (32). */
const OVERLAY_FRAME_HEIGHT = 'calc(100vh - 110px)'
/** Pop-out has no page head, so the toolbar sits at the top padding (72) instead of under the bar. */
const POPOUT_FRAME_HEIGHT = 'max(440px, calc(100vh - 224px))'

export function DefeatMatrix({ data }: DefeatMatrixProps) {
  const searchParams = useSearchParams()
  const initialView = searchParams.get('view') === 'heatmap' ? 'heatmap' : 'table'
  const isPopout = searchParams.get('popout') === '1'
  const operations = isOperationsEditionClient()
  const [categoryPill, setCategoryPill] = useState<CategoryPill>('all')
  const [defeatType, setDefeatType] = useState<DefeatTypeFilter>('all')
  const [view, setView] = useState<MatrixView>(initialView)
  const [fullscreen, setFullscreen] = useState(false)
  const [showSamCalc, setShowSamCalc] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [selectedCell, setSelectedCell] = useState<{
    platformId: string
    systemId: string
  } | null>(null)
  const [focusRow, setFocusRow] = useState(0)
  const [focusCol, setFocusCol] = useState(0)

  useEffect(() => {
    try {
      if (window.localStorage.getItem(FILTERS_KEY) === '0') setFiltersOpen(false)
    } catch {
      /* storage unavailable: keep the default */
    }
  }, [])

  const toggleFilters = () => {
    setFiltersOpen((open) => {
      const next = !open
      try {
        window.localStorage.setItem(FILTERS_KEY, next ? '1' : '0')
      } catch {
        /* storage unavailable */
      }
      return next
    })
  }

  const filteredPlatforms = useMemo(
    () =>
      data.platforms.filter((p) => matchesCategoryPill(p.category, categoryPill)),
    [data.platforms, categoryPill],
  )

  const filteredSystems = useMemo(
    () => data.systems.filter((s) => systemMatchesDefeatType(s, defeatType)),
    [data.systems, defeatType],
  )

  const coveragePct = useMemo(() => {
    const total = data.platforms.length * data.systems.length
    return total ? Math.round((data.effectiveness.length / total) * 100) : 0
  }, [data])
  const accreditedCount = useMemo(() => Object.keys(data.accreditedPkMap ?? {}).length, [data])
  const immuneCount = useMemo(
    () => Object.values(data.accreditedPkMap ?? {}).filter((r) => (r as { is_immune?: boolean }).is_immune).length,
    [data],
  )

  const selectedPlatform = selectedCell
    ? data.platforms.find((p) => p.id === selectedCell.platformId) ?? null
    : null

  const selectedSystem = selectedCell
    ? data.systems.find((s) => s.id === selectedCell.systemId) ?? null
    : null

  const selectedEffectiveness = selectedCell
    ? data.effectiveness.find(
        (e) =>
          e.platform_id === selectedCell.platformId &&
          e.defeat_system_id === selectedCell.systemId,
      ) ?? null
    : null

  const openPopout = () => {
    window.open(`/defeat?popout=1&view=${view}`, 'spectral-defeat-popout', 'noopener,noreferrer,width=1400,height=900')
  }

  const handleExport = () => {
    exportMatrixCsv(
      filteredPlatforms,
      filteredSystems,
      data.effectiveness,
      defeatType,
    )
  }

  const onCellSelect = (platformId: string, systemId: string) =>
    setSelectedCell({ platformId, systemId })

  // The page and the full-screen overlay each get their own instance, sized to
  // where it sits.
  const renderMatrix = (where: 'page' | 'overlay') =>
    view === 'table' ? (
      <DefeatMatrixTable
        platforms={filteredPlatforms}
        systems={filteredSystems}
        effectiveness={data.effectiveness}
        defeatTypeFilter={defeatType}
        onCellSelect={onCellSelect}
        accreditedPkMap={data.accreditedPkMap}
        computedSamPkMap={data.computedSamPkMap}
        variant={where === 'overlay' || isPopout ? 'fullscreen' : 'default'}
        height={where === 'overlay' ? OVERLAY_FRAME_HEIGHT : isPopout ? POPOUT_FRAME_HEIGHT : undefined}
        dockScroll={where === 'page'}
        focusRow={focusRow}
        focusCol={focusCol}
        onFocusChange={(row, col) => {
          setFocusRow(row)
          setFocusCol(col)
        }}
      />
    ) : (
      <DefeatHeatmap
        platforms={filteredPlatforms}
        systems={filteredSystems}
        effectiveness={data.effectiveness}
        defeatTypeFilter={defeatType}
        onCellSelect={onCellSelect}
        accreditedPkMap={data.accreditedPkMap}
        computedSamPkMap={data.computedSamPkMap}
        height={where === 'overlay' ? OVERLAY_FRAME_HEIGHT : isPopout ? POPOUT_FRAME_HEIGHT : undefined}
        dockScroll={where === 'page'}
      />
    )

  const showSidebar = !isPopout && filtersOpen
  const categoryLabel = CATEGORY_PILLS.find((p) => p.id === categoryPill)?.label
  const defeatTypeLabel = DEFEAT_TYPE_FILTERS.find((f) => f.id === defeatType)?.label

  return (
    <div className="relative">
      {!isPopout ? (<>
      <header className="mb-2">
        <h1 className="page-title m-0">Defeat Matrix</h1>
        <p className="page-lede mb-0 text-pretty">
          Platform × effector. OSINT adjudication of vulnerability to RF, kinetic, DEW and net defeat; intel update 2026-06-07, conflict-validated where available. Click a cell for the rationale.
          {operations ? ' Static OSINT grid here; propagation-aware adjudication runs on Map Intel Spectral Analysis.' : ''}
        </p>
      </header>

      <div className="fc-inst border-b fc-hair mb-5" aria-label="Defeat matrix instruments">
        <div><div className="k">Platforms in view</div><div className="v">{filteredPlatforms.length}</div><div className="d">of {data.platforms.length} catalogued</div></div>
        <div><div className="k">Defeat systems</div><div className="v">{filteredSystems.length}</div><div className="d">of {data.systems.length} · RF, kinetic, DEW, net</div></div>
        <div><div className="k">Adjudicated pairs</div><div className="v glow">{coveragePct}<small>%</small></div><div className="d">{data.effectiveness.length} of {data.platforms.length * data.systems.length} cells have a finding</div></div>
        <div><div className="k">Accredited Pk</div><div className="v">{accreditedCount}</div><div className="d">operations tier · marked A in the grid</div></div>
        <div><div className="k">Immune pairings</div><div className="v red">{immuneCount}</div><div className="d">fibre-optic or otherwise unaffected</div></div>
      </div>
      </>) : null}

      <div className="mb-3 flex min-h-[36px] flex-wrap items-center gap-x-3 gap-y-2">
        {!isPopout ? (
          <button
            type="button"
            data-filters-toggle
            onClick={toggleFilters}
            aria-pressed={filtersOpen}
            aria-label={filtersOpen ? 'Hide filters' : 'Show filters'}
            className="fc-action hidden lg:inline-flex"
          >
            <SlidersHorizontal size={14} aria-hidden />
            Filters
          </button>
        ) : null}
        <div className="seg sm" role="group" aria-label="Matrix view">
          <button type="button" aria-pressed={view === 'table'} onClick={() => setView('table')}>Table</button>
          <button type="button" aria-pressed={view === 'heatmap'} onClick={() => setView('heatmap')}>Heat map</button>
        </div>
        <span className="font-mono text-[12px] store-text-muted tabular-nums">
          {filteredPlatforms.length} platforms × {filteredSystems.length} effectors
        </span>
        {!showSidebar && !isPopout && categoryPill !== 'all' ? (
          <FilterTag label={categoryLabel ?? categoryPill} onClear={() => setCategoryPill('all')} />
        ) : null}
        {!showSidebar && !isPopout && defeatType !== 'all' ? (
          <FilterTag label={defeatTypeLabel ?? defeatType} onClear={() => setDefeatType('all')} />
        ) : null}
        <div className="ml-auto flex flex-wrap items-center gap-x-5 gap-y-1">
          <button type="button" onClick={() => setShowSamCalc((v) => !v)} aria-pressed={showSamCalc} className="fc-action">SAM Pk calc</button>
          <Link href="/economics" className="fc-action">Economics</Link>
          <button type="button" onClick={handleExport} className="fc-action">Export CSV</button>
          <button type="button" onClick={() => setFullscreen(true)} className="fc-action" aria-label="Expand defeat matrix to full screen">Expand</button>
          <button type="button" onClick={openPopout} className="fc-action" aria-label={isPopout ? 'Open another pop-out window' : 'Pop out the matrix into a second window'}>Pop out</button>
        </div>
      </div>

      <StoreCatalogLayout
        className={cn('pb-0 lg:gap-6', !showSidebar && 'lg:grid-cols-1')}
        sidebar={showSidebar ? (
          <DefeatFilterSidebar
            platforms={data.platforms}
            systems={data.systems}
            categoryPill={categoryPill}
            onCategoryPillChange={setCategoryPill}
            defeatType={defeatType}
            onDefeatTypeChange={setDefeatType}
          />
        ) : null}
      >
        <div
          className="min-w-0"
          role="region"
          aria-label={`Defeat matrix: ${filteredPlatforms.length} platforms by ${filteredSystems.length} effectors`}
        >
          {renderMatrix('page')}
        </div>
      </StoreCatalogLayout>

      <DefeatMatrixFullscreen
        open={fullscreen}
        onClose={() => setFullscreen(false)}
        view={view}
        onViewChange={setView}
        platformCount={filteredPlatforms.length}
        systemCount={filteredSystems.length}
        onExport={handleExport}
      >
        {fullscreen ? renderMatrix('overlay') : null}
      </DefeatMatrixFullscreen>

      {showSamCalc && (
        <div className="fixed right-4 top-24 z-50">
          <SamInterceptPanel onClose={() => setShowSamCalc(false)} />
        </div>
      )}

      <AdjudicationPanel
        open={selectedCell !== null}
        onOpenChange={(open) => !open && setSelectedCell(null)}
        platform={selectedPlatform}
        system={selectedSystem}
        effectiveness={selectedEffectiveness}
      />
    </div>
  )
}

function FilterTag({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="tag blue">
      {label}
      <button
        type="button"
        onClick={onClear}
        aria-label={`Clear filter ${label}`}
        className="-mr-1 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-[rgba(41,151,255,0.2)]"
      >
        <X size={11} aria-hidden />
      </button>
    </span>
  )
}
