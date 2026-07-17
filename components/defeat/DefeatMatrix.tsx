'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Download, Maximize2, ShieldCheck, BadgeCheck, Grid3x3, Table2, Zap } from 'lucide-react'
import { EditionBadge } from '@/components/operations/EditionBadge'
import { isOperationsEditionClient } from '@/lib/operations/edition-client'
import {
  StoreCatalogHeader,
  StoreCatalogLayout,
} from '@/components/catalog/StoreCatalogLayout'
import { StoreHero } from '@/components/catalog/StoreHero'
import { AdjudicationPanel } from '@/components/defeat/AdjudicationPanel'
import { DefeatFilterSidebar } from '@/components/defeat/DefeatFilterSidebar'
import { DefeatHeatmap } from '@/components/defeat/DefeatHeatmap'
import { DefeatMatrixTable } from '@/components/defeat/DefeatMatrixTable'
import { DefeatMatrixFullscreen } from '@/components/defeat/DefeatMatrixFullscreen'
import { SamInterceptPanel } from '@/components/defeat/SamInterceptPanel'
import { Button } from '@/components/ui/button'
import { exportMatrixCsv } from '@/lib/defeat/export-csv'
import { systemMatchesDefeatType, type DefeatTypeFilter } from '@/lib/defeat/defeat-types'
import { matchesCategoryPill, type CategoryPill } from '@/lib/platforms/constants'
import type { DefeatMatrixPayload } from '@/lib/types'
import { cn } from '@/lib/utils'

interface DefeatMatrixProps {
  data: DefeatMatrixPayload
}

type MatrixView = 'table' | 'heatmap'

export function DefeatMatrix({ data }: DefeatMatrixProps) {
  const searchParams = useSearchParams()
  const initialView = searchParams.get('view') === 'heatmap' ? 'heatmap' : 'table'
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
        variant={fullscreen ? 'fullscreen' : 'default'}
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
      <StoreHero
        variant="compact"
        eyebrow="Counter-UAS"
        title="Defeat Matrix — Platform × Effector"
        subtitle="OSINT adjudication of platform vulnerability against RF, kinetic, DEW, and net defeat — click any cell for rationale."
        trustChip={
          <>
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                background: 'var(--store-success)',
                boxShadow: '0 0 8px var(--store-success)',
              }}
            />
            Intel update 2026-06-07 — conflict-validated where available
          </>
        }
        trustItems={[
          { icon: ShieldCheck, label: 'Exchange-ratio context' },
          { icon: BadgeCheck, label: 'Immunity flags (fibre-optic)' },
          { icon: Grid3x3, label: 'CSV export for briefings' },
        ]}
      />

      {operations && (
        <div className="mb-4 flex items-center justify-between gap-3 store-panel-inner rounded-xl px-4 py-3 border border-cyan/20">
          <p className="text-xs store-text-body">
            <span className="font-mono text-cyan">Operations note:</span> static OSINT grid here —
            propagation-aware adjudication runs on Map Intel Spectral Analysis.
          </p>
          <EditionBadge />
        </div>
      )}

      <StoreCatalogLayout
        sidebar={
          <DefeatFilterSidebar
            platforms={data.platforms}
            systems={data.systems}
            categoryPill={categoryPill}
            onCategoryPillChange={setCategoryPill}
            defeatType={defeatType}
            onDefeatTypeChange={setDefeatType}
          />
        }
      >
        <StoreCatalogHeader
          title="Effectiveness Matrix"
          meta={`${filteredPlatforms.length} platforms × ${filteredSystems.length} defeat systems`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-lg border border-[var(--store-line)] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setView('table')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-mono flex items-center gap-1',
                    view === 'table' ? 'bg-[#F97316] text-white' : 'store-text-muted',
                  )}
                >
                  <Table2 className="h-3.5 w-3.5" /> Table
                </button>
                <button
                  type="button"
                  onClick={() => setView('heatmap')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-mono flex items-center gap-1',
                    view === 'heatmap' ? 'bg-[#F97316] text-white' : 'store-text-muted',
                  )}
                >
                  <Grid3x3 className="h-3.5 w-3.5" /> Heat map
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowSamCalc((v) => !v)}
              >
                <Zap className="h-4 w-4" /> SAM Pk Calc
              </Button>
              <Link href="/economics" className="px-3 py-1.5 text-xs font-mono border border-[var(--store-line)] rounded-lg hover:border-cyan/30 text-cyan">Economics</Link>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4" /> Export CSV
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFullscreen(true)}
                title="Full screen matrix"
                aria-label="Expand defeat matrix to full screen"
              >
                <Maximize2 className="h-4 w-4" /> Expand
              </Button>
            </div>
          }
        />

        <div
          className="store-panel rounded-2xl overflow-hidden"
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
