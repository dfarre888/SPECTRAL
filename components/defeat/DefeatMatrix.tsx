'use client'

import { useMemo, useState } from 'react'
import { Download, ShieldCheck, BadgeCheck, Grid3x3 } from 'lucide-react'
import { EditionBadge } from '@/components/operations/EditionBadge'
import { isOperationsEditionClient } from '@/lib/operations/edition-client'
import {
  StoreCatalogHeader,
  StoreCatalogLayout,
} from '@/components/catalog/StoreCatalogLayout'
import { StoreHero } from '@/components/catalog/StoreHero'
import { AdjudicationPanel } from '@/components/defeat/AdjudicationPanel'
import { DefeatFilterSidebar } from '@/components/defeat/DefeatFilterSidebar'
import { DefeatMatrixTable } from '@/components/defeat/DefeatMatrixTable'
import { Button } from '@/components/ui/button'
import { exportMatrixCsv } from '@/lib/defeat/export-csv'
import { systemMatchesDefeatType, type DefeatTypeFilter } from '@/lib/defeat/defeat-types'
import { matchesCategoryPill, type CategoryPill } from '@/lib/platforms/constants'
import type { DefeatMatrixPayload } from '@/lib/types'

interface DefeatMatrixProps {
  data: DefeatMatrixPayload
}

export function DefeatMatrix({ data }: DefeatMatrixProps) {
  const operations = isOperationsEditionClient()
  const [categoryPill, setCategoryPill] = useState<CategoryPill>('all')
  const [defeatType, setDefeatType] = useState<DefeatTypeFilter>('all')
  const [selectedCell, setSelectedCell] = useState<{
    platformId: string
    systemId: string
  } | null>(null)

  const filteredPlatforms = useMemo(
    () =>
      data.platforms.filter((p) => matchesCategoryPill(p.category, categoryPill)),
    [data.platforms, categoryPill]
  )

  const filteredSystems = useMemo(
    () => data.systems.filter((s) => systemMatchesDefeatType(s, defeatType)),
    [data.systems, defeatType]
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
          e.defeat_system_id === selectedCell.systemId
      ) ?? null
    : null

  const handleExport = () => {
    exportMatrixCsv(
      filteredPlatforms,
      filteredSystems,
      data.effectiveness,
      defeatType
    )
  }

  return (
    <div className="pb-8">
      <StoreHero
        eyebrow="Counter-UAS"
        title={
          <>
            Defeat Matrix,
            <br />
            Platform × Effector Grid
          </>
        }
        subtitle="OSINT adjudication of platform vulnerability against RF, kinetic, DEW, and net defeat systems — click any cell for full rationale."
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
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          }
        />

        <div className="store-panel rounded-2xl overflow-hidden">
          <DefeatMatrixTable
            platforms={filteredPlatforms}
            systems={filteredSystems}
            effectiveness={data.effectiveness}
            defeatTypeFilter={defeatType}
            onCellSelect={(platformId, systemId) =>
              setSelectedCell({ platformId, systemId })
            }
          />
        </div>
      </StoreCatalogLayout>

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
