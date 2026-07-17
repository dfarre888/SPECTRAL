'use client'
import { SwarmSaturationPanel } from '@/components/arena/SwarmSaturationPanel'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { WoprScenarioPanel } from '@/components/arena/WoprScenarioPanel'
import { StorePanel } from '@/components/ui/store-surface'
import { worldStateToCopEntities, type CopViewMode } from '@/lib/wopr/cop-entities'
import type { TickResult, WoprScenario } from '@/lib/wopr/types'
import { aisBboxSearchParams, type AisVessel } from '@/lib/ais/types'
import { clsx } from 'clsx'

const CesiumArena = dynamic(() => import('@/components/arena/CesiumArena'), {
  ssr: false,
  loading: () => (
    <div className="h-full min-h-[480px] store-text-muted text-sm font-mono flex items-center justify-center">
      Loading 3D COP…
    </div>
  ),
})

const COP_MODES: { id: CopViewMode; label: string }[] = [
  { id: 'orbat', label: 'ORBAT' },
  { id: 'blue_picture', label: 'Blue picture' },
  { id: 'red_fow', label: 'Red FoW' },
]

// How often to refresh AIS data while the layer is active (ms)
const AIS_POLL_MS = 2 * 60 * 1000 // 2 minutes — matches server cache TTL

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

  // ── AIS marine layer ──────────────────────────────────────────────────────
  /** Layer toggle — OFF by default for faster initial load */
  const [showAisLayer, setShowAisLayer] = useState(false)
  const [aisVessels, setAisVessels] = useState<AisVessel[]>([])
  const [aisFetching, setAisFetching] = useState(false)
  const [aisError, setAisError] = useState<string | null>(null)
  const aisTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchAis = useCallback(async () => {
    setAisFetching(true)
    setAisError(null)
    try {
      // Default bbox: global [[-90,-180],[90,180]].
      // Future enhancement: derive bbox from current Cesium camera view.
      const res = await fetch(`/api/ais/vessels?${aisBboxSearchParams()}`)
      const json = await res.json()
      if (json.error) {
        setAisError(json.error)
      } else {
        setAisVessels(json.vessels ?? [])
      }
    } catch (err) {
      setAisError(String(err))
    } finally {
      setAisFetching(false)
    }
  }, [])

  // Fetch on enable; poll while active; clear on disable
  useEffect(() => {
    if (!showAisLayer) {
      if (aisTimerRef.current) clearInterval(aisTimerRef.current)
      aisTimerRef.current = null
      return
    }
    fetchAis()
    aisTimerRef.current = setInterval(fetchAis, AIS_POLL_MS)
    return () => {
      if (aisTimerRef.current) clearInterval(aisTimerRef.current)
      aisTimerRef.current = null
    }
  }, [showAisLayer, fetchAis])

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
      <div className="space-y-4 min-w-0">
        <WoprScenarioPanel onScenarioChange={onScenarioChange} onTickChange={onTickChange} />
        <SwarmSaturationPanel />
      </div>

      <StorePanel className="p-2 min-h-[520px] flex flex-col">
        {/* ── Control bar ──────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-2 py-1 mb-1">
          <p className="text-[10px] store-text-muted font-mono uppercase">3D battlespace COP</p>

          <div className="flex flex-wrap items-center gap-1">
            {/* COP view mode tabs */}
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

            {/* ── AIS marine layer toggle tile ──────────────────────────── */}
            <div className="w-px h-4 bg-[var(--store-line)] mx-1" aria-hidden />
            <button
              type="button"
              title={
                aisError
                  ? `AIS error: ${aisError}`
                  : showAisLayer
                  ? `AIS live — ${aisVessels.length} vessels · refresh every 2 min`
                  : 'Enable AIS marine traffic layer'
              }
              onClick={() => setShowAisLayer((v) => !v)}
              className={clsx(
                'flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-mono border transition-colors',
                aisError
                  ? 'border-red-500/40 text-red-400 bg-red-500/10'
                  : showAisLayer
                  ? 'border-[var(--store-accent-border)] text-[var(--store-accent)] bg-[var(--store-accent)]/10'
                  : 'store-panel-inner store-text-muted hover:border-[var(--store-accent-border)]',
              )}
            >
              {/* Anchor icon */}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="5" r="3"/>
                <line x1="12" y1="8" x2="12" y2="21"/>
                <path d="M5 15l7 6 7-6"/>
                <line x1="3" y1="12" x2="9" y2="12"/>
                <line x1="15" y1="12" x2="21" y2="12"/>
              </svg>
              AIS
              {showAisLayer && !aisFetching && !aisError && (
                <span className="opacity-60">{aisVessels.length}</span>
              )}
              {aisFetching && (
                <span className="inline-block w-2 h-2 rounded-full bg-current animate-pulse" aria-label="Fetching" />
              )}
            </button>
          </div>
        </div>

        {/* ── AIS error banner ─────────────────────────────────────────────── */}
        {showAisLayer && aisError && (
          <div className="mx-2 mb-1 px-2 py-1 rounded text-[10px] font-mono text-red-400 bg-red-500/10 border border-red-500/30">
            ⚠ AIS: {aisError}
          </div>
        )}

        {/* ── 3D canvas ────────────────────────────────────────────────────── */}
        <div className="relative h-[480px] w-full rounded-xl overflow-hidden shrink-0">
          <CesiumArena
            entities={entities}
            center={center}
            showAisLayer={showAisLayer}
            aisVessels={aisVessels}
          />
        </div>
      </StorePanel>
    </div>
  )
}
