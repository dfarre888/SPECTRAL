'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { EditionBadge } from '@/components/operations/EditionBadge'
import { isOperationsEditionClient } from '@/lib/operations/edition-client'
import { StoreCatalogLayout } from '@/components/catalog/StoreCatalogLayout'
import { StoreHero } from '@/components/catalog/StoreHero'
import { AdjudicationPanel } from '@/components/defeat/AdjudicationPanel'
import { DefeatFilterSidebar } from '@/components/defeat/DefeatFilterSidebar'
import { DefeatHeatmap } from '@/components/defeat/DefeatHeatmap'
import { DefeatMatrixTable } from '@/components/defeat/DefeatMatrixTable'
import { DefeatMatrixFullscreen } from '@/components/defeat/DefeatMatrixFullscreen'
import { SamInterceptPanel } from '@/components/defeat/SamInterceptPanel'
import { exportMatrixCsv } from '@/lib/defeat/export-csv'
import { systemMatchesDefeatType, type DefeatTypeFilter } from '@/lib/defeat/defeat-types'
import { matchesCategoryPill, type CategoryPill } from '@/lib/platforms/constants'
import type { DefeatMatrixPayload } from '@/lib/types'

interface DefeatMatrixProps {
  data: DefeatMatrixPayload
}

type MatrixView = 'table' | 'heatmap'

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
  const [selectedCell, setSelectedCell] = useState<{
    platformId: string
    systemId: string
  } | null>(null)
  const [focusRow, setFocusRow] = useState(0)
  const [focusCol, setFocusCol] = useState(0)

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

  const matrixContent =
    view === 'table' ? (
      <DefeatMatrixTable
        platforms={filteredPlatforms}
        systems={filteredSystems}
        effectiveness={data.effectiveness}
        defeatTypeFilter={defeatType}
        onCellSelect={(platformId, systemId) =>
          setSelectedCell({ platformId, systemId })
        }
        accreditedPkMap={data.accreditedPkMap}
        computedSamPkMap={data.computedSamPkMap}
        variant={fullscreen || isPopout ? 'fullscreen' : 'default'}
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
        onCellSelect={(platformId, systemId) =>
          setSelectedCell({ platformId, systemId })
        }
        accreditedPkMap={data.accreditedPkMap}
        computedSamPkMap={data.computedSamPkMap}
      />
    )

  return (
    <div className="relative pb-8">
      {!isPopout ? (<>
      <header className="mb-1">
        <h1 className="store-display text-[30px] font-semibold tracking-[-0.02em] text-[var(--store-ink)] leading-none m-0">Defeat Matrix</h1>
        <p className="text-[13px] store-text-muted mt-2 mb-0 max-w-[80ch] text-pretty">
          Platform × effector. OSINT adjudication of vulnerability to RF, kinetic, DEW and net defeat; intel update 2026-06-07, conflict-validated where available. Click a cell for the rationale.
          {operations ? ' Static OSINT grid here; propagation-aware adjudication runs on Map Intel Spectral Analysis.' : ''}
        </p>
      </header>

      <div className="fc-inst border-b fc-hair mb-4" aria-label="Defeat matrix instruments">
        <div><div className="k">Platforms in view</div><div className="v">{filteredPlatforms.length}</div><div className="d">of {data.platforms.length} catalogued</div></div>
        <div><div className="k">Defeat systems</div><div className="v">{filteredSystems.length}</div><div className="d">of {data.systems.length} · RF, kinetic, DEW, net</div></div>
        <div><div className="k">Adjudicated pairs</div><div className="v glow">{coveragePct}<small>%</small></div><div className="d">{data.effectiveness.length} of {data.platforms.length * data.systems.length} cells have a finding</div></div>
        <div><div className="k">Accredited Pk</div><div className="v">{accreditedCount}</div><div className="d">operations tier · marked A in the grid</div></div>
        <div><div className="k">Immune pairings</div><div className="v red">{immuneCount}</div><div className="d">fibre-optic or otherwise unaffected</div></div>
      </div>
      </>) : null}

      <StoreCatalogLayout
        className={isPopout ? 'lg:grid-cols-1' : undefined}
        sidebar={isPopout ? null : (
          <DefeatFilterSidebar
            platforms={data.platforms}
            systems={data.systems}
            categoryPill={categoryPill}
            onCategoryPillChange={setCategoryPill}
            defeatType={defeatType}
            onDefeatTypeChange={setDefeatType}
          />
        )}
      >
        <div className="flex flex-wrap items-center gap-2 border-b fc-hair pb-3 mb-3">
          <div className="flex gap-2" role="group" aria-label="Matrix view">
            <button type="button" aria-pressed={view === 'table'} onClick={() => setView('table')} className="btn-e sm">Table</button>
            <button type="button" aria-pressed={view === 'heatmap'} onClick={() => setView('heatmap')} className="btn-e sm">Heat map</button>
          </div>
          <span className="text-[11px] font-mono store-text-muted ml-1">{filteredPlatforms.length} × {filteredSystems.length}</span>
          <div className="ml-auto flex items-center gap-5">
            <button type="button" onClick={() => setShowSamCalc((v) => !v)} aria-pressed={showSamCalc} className="fc-action">SAM Pk calc</button>
            <Link href="/economics" className="fc-action">Economics</Link>
            <button type="button" onClick={handleExport} className="fc-action">Export CSV</button>
            <button type="button" onClick={() => setFullscreen(true)} className="fc-action" aria-label="Expand defeat matrix to full screen">Expand</button>
            <button type="button" onClick={openPopout} className="fc-action" aria-label={isPopout ? 'Open another pop-out window' : 'Pop out the matrix into a second window'}>Pop out</button>
          </div>
        </div>

        <div
          className="overflow-hidden"
          role="region"
          aria-label={`Defeat matrix — ${filteredPlatforms.length} platforms by ${filteredSystems.length} effectors`}
        >
          {matrixContent}
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
        {matrixContent}
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
