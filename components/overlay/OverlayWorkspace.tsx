'use client'

import dynamic from 'next/dynamic'
import { useCallback, useMemo, useState } from 'react'
import { Crosshair } from 'lucide-react'
import {
  EngagementPanel,
  PHASE_META,
  defaultEngagementScenario,
} from '@/components/overlay/EngagementPanel'
import type { OverlayPlacementMode } from '@/components/overlay/OverlayGeometryMap'
import { computeEngagement } from '@/lib/overlay/engagement-calc'
import { SAM_RING_STYLES } from '@/lib/overlay/overlay-map-entities'
import type { Platform } from '@/lib/types'
import { cn } from '@/lib/utils'

const OverlayGeometryMap = dynamic(
  () => import('@/components/overlay/OverlayGeometryMap'),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center text-[13px] store-text-muted">
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
  const phase = PHASE_META[result.phase]

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
    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
      <section
        className="store-panel rounded-2xl p-2 xl:sticky xl:top-0"
        aria-label="SAM engagement geometry"
      >
        <div className="relative h-[clamp(440px,calc(100vh-300px),760px)] w-full overflow-hidden rounded-xl">
          <OverlayGeometryMap
            scenario={scenario}
            result={result}
            placementMode={placementMode}
            onMapPlace={onMapPlace}
          />

          {/* Controls float over the globe as Liquid Glass. */}
          <div className="lg-glass absolute left-3 top-3 z-10 flex items-center gap-0.5 p-1" role="group" aria-label="Place on globe">
            <button
              type="button"
              className="lg-btn"
              aria-pressed={placementMode === 'sam'}
              onClick={() => setPlacementMode((m) => (m === 'sam' ? null : 'sam'))}
            >
              <span className="h-2 w-2 rounded-full bg-[#3B82F6]" aria-hidden />
              Place SAM
            </button>
            <button
              type="button"
              className="lg-btn"
              aria-pressed={placementMode === 'uas'}
              onClick={() => setPlacementMode((m) => (m === 'uas' ? null : 'uas'))}
            >
              <span className="h-2 w-2 rounded-full bg-[#EF4444]" aria-hidden />
              Place UAS
            </button>
          </div>

          <div className="lg-glass absolute right-3 top-3 z-10 flex items-center gap-2.5 py-1.5 pl-3 pr-1.5">
            <Crosshair className="h-3.5 w-3.5 store-text-muted" aria-hidden />
            <span className="text-xs store-text-muted">Phase</span>
            <span className={cn(phase.tag, 'font-mono')} role="status" aria-label={`Engagement phase: ${phase.label}`}>
              {phase.label}
            </span>
          </div>

          <div className="lg-glass absolute bottom-3 right-3 z-10 flex flex-wrap items-center gap-x-3.5 gap-y-1 px-3 py-2 text-xs text-[var(--store-ink)]">
            {SAM_RING_STYLES.map((r) => (
              <span key={r.key} className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: r.fill }} aria-hidden />
                {r.label}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-3 rounded-full bg-[#06B6D4]" aria-hidden />
              LOS
            </span>
          </div>
        </div>
      </section>

      <aside className="store-panel rounded-2xl">
        <EngagementPanel
          platforms={platforms}
          scenario={scenario}
          onScenarioChange={onScenarioChange}
          placementMode={placementMode}
          onStartPlacement={setPlacementMode}
        />
      </aside>
    </div>
  )
}
