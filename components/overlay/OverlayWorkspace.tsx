'use client'

import dynamic from 'next/dynamic'
import { useCallback, useMemo, useState } from 'react'
import {
  EngagementPanel,
  defaultEngagementScenario,
} from '@/components/overlay/EngagementPanel'
import type { OverlayPlacementMode } from '@/components/overlay/OverlayGeometryMap'
import { StorePanel } from '@/components/ui/store-surface'
import { computeEngagement } from '@/lib/overlay/engagement-calc'
import type { Platform } from '@/lib/types'
import { cn } from '@/lib/utils'

const OverlayGeometryMap = dynamic(
  () => import('@/components/overlay/OverlayGeometryMap'),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center store-text-muted text-sm font-mono">
        Loading engagement geometry…
      </div>
    ),
  },
)

interface OverlayWorkspaceProps {
  platforms: Platform[]
}

export function OverlayWorkspace({ platforms }: OverlayWorkspaceProps) {
  const [scenario, setScenario] = useState(() => defaultEngagementScenario(platforms))
  const [placementMode, setPlacementMode] = useState<OverlayPlacementMode>(null)

  const result = useMemo(() => computeEngagement(scenario), [scenario])

  const onScenarioChange = useCallback(
    (next: typeof scenario) => setScenario(next),
    [],
  )

  const onMapPlace = useCallback(
    (lon: number, lat: number, target: 'sam' | 'uas') => {
      if (target === 'sam') {
        setScenario((prev) => ({ ...prev, sam_lon: lon, sam_lat: lat }))
      } else {
        setScenario((prev) => ({ ...prev, uas_lon: lon, uas_lat: lat }))
      }
      setPlacementMode(null)
    },
    [],
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 min-h-[480px]">
      <StorePanel className="p-2 min-h-[520px] flex flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2 px-2 py-1 mb-1">
          <p className="text-[10px] store-text-muted font-mono uppercase">
            SAM engagement geometry
          </p>
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setPlacementMode((m) => (m === 'sam' ? null : 'sam'))}
              className={cn(
                'rounded border px-2 py-0.5 text-[10px] font-mono',
                placementMode === 'sam'
                  ? 'border-[var(--store-accent)] bg-[var(--store-accent)] text-black'
                  : 'border-[var(--store-line)] text-cyan hover:border-cyan/40',
              )}
            >
              Place SAM
            </button>
            <button
              type="button"
              onClick={() => setPlacementMode((m) => (m === 'uas' ? null : 'uas'))}
              className={cn(
                'rounded border px-2 py-0.5 text-[10px] font-mono',
                placementMode === 'uas'
                  ? 'border-[var(--store-accent)] bg-[var(--store-accent)] text-black'
                  : 'border-[var(--store-line)] text-red hover:border-red/40',
              )}
            >
              Place UAS
            </button>
            <p className="text-[10px] font-mono text-cyan ml-1">
              {result.phase.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
        <div className="relative h-[480px] w-full rounded-xl overflow-hidden shrink-0">
          <OverlayGeometryMap
            scenario={scenario}
            result={result}
            placementMode={placementMode}
            onMapPlace={onMapPlace}
          />
        </div>
      </StorePanel>

      <div className="store-panel rounded-2xl border border-[var(--store-line)]">
        <EngagementPanel
          platforms={platforms}
          scenario={scenario}
          onScenarioChange={onScenarioChange}
          placementMode={placementMode}
          onStartPlacement={setPlacementMode}
        />
      </div>
    </div>
  )
}
