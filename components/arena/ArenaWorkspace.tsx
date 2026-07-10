'use client'
import { SwarmSaturationPanel } from '@/components/arena/SwarmSaturationPanel'

import dynamic from 'next/dynamic'
import { useCallback, useMemo, useState } from 'react'
import { WoprScenarioPanel } from '@/components/arena/WoprScenarioPanel'
import { StorePanel } from '@/components/ui/store-surface'
import { worldStateToCopEntities, type CopViewMode } from '@/lib/wopr/cop-entities'
import type { TickResult, WoprScenario } from '@/lib/wopr/types'
import { clsx } from 'clsx'

const CesiumArena = dynamic(() => import('@/components/arena/CesiumArena'), {
  ssr: false,
  loading: () => (
    <div className="h-full min-h-[480px] store-text-muted text-sm font-mono flex items-center justify-center">
      Loading 3D COP…
    <SwarmSaturationPanel />
</div>
  ),
})

const COP_MODES: { id: CopViewMode; label: string }[] = [
  { id: 'orbat', label: 'ORBAT' },
  { id: 'blue_picture', label: 'Blue picture' },
  { id: 'red_fow', label: 'Red FoW' },
]

function deriveCenter(scenario: WoprScenario | null): { lon: number; lat: number } {
  if (!scenario) return { lon: 149.13, lat: -35.28 }
  const platforms = [
    ...scenario.world_state.red_orbat.platforms,
    ...scenario.world_state.blue_orbat.platforms,
  ].filter((p) => !p.destroyed)
  if (platforms.length === 0) return { lon: 149.13, lat: -35.28 }
  const lon = platforms.reduce((s, p) => s + p.lon, 0) / platforms.length
  const lat = platforms.reduce((s, p) => s + p.lat, 0) / platforms.length
  return { lon, lat }
}

export function ArenaWorkspace() {
  const [scenario, setScenario] = useState<WoprScenario | null>(null)
  const [tick, setTick] = useState<TickResult | null>(null)
  const [copMode, setCopMode] = useState<CopViewMode>('orbat')

  const onScenarioChange = useCallback((next: WoprScenario | null) => {
    setScenario(next)
  }, [])

  const onTickChange = useCallback((next: TickResult | null) => {
    setTick(next)
  }, [])

  const entities = useMemo(
    () => worldStateToCopEntities(scenario, copMode, tick),
    [scenario, copMode, tick],
  )

  const center = useMemo(() => deriveCenter(scenario), [scenario])

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-4">
      <WoprScenarioPanel onScenarioChange={onScenarioChange} onTickChange={onTickChange} />

      <StorePanel className="p-2 min-h-[520px] flex flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2 px-2 py-1 mb-1">
          <p className="text-[10px] store-text-muted font-mono uppercase">3D battlespace COP</p>
          <div className="flex gap-1" role="tablist" aria-label="COP view mode">
            {COP_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                role="tab"
                aria-selected={copMode === mode.id}
                onClick={() => setCopMode(mode.id)}
                className={clsx(
                  'px-2 py-1 rounded-lg text-[10px] font-mono border transition-colors',
                  copMode === mode.id
                    ? 'nav-item-active'
                    : 'store-panel-inner store-text-muted hover:border-[var(--store-accent-border)]',
                )}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
        <div className="relative h-[480px] w-full rounded-xl overflow-hidden shrink-0">
          <CesiumArena entities={entities} center={center} />
        </div>
      </StorePanel>
    </div>
  )
}
