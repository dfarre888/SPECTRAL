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
import { GuidedTour } from '@/components/tour/GuidedTour'
import { ARENA_FOG_OF_WAR_TOUR, tourSeenKey, type TourAction } from '@/lib/tour/tours'
import { ScenarioBriefSheet } from '@/components/wopr/ScenarioBriefSheet'
import { TickScrubber } from '@/components/wopr/TickScrubber'
import { appendFrame, clampIndex, frameAt, isLive, type TickFrame } from '@/lib/wopr/tick-history'

import { GlobeSkeleton } from '@/components/ui/loading-skeleton'

const CesiumArena = dynamic(() => import('@/components/arena/CesiumArena'), {
  ssr: false,
  loading: () => <GlobeSkeleton className="h-full min-h-[480px]" />,
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

  // ── Guided walkthrough ────────────────────────────────────────────────────
  const [tourOpen, setTourOpen] = useState(false)
  const [briefOpen, setBriefOpen] = useState(false)
  const [tourSeen, setTourSeen] = useState(true) // assume seen until storage says otherwise
  useEffect(() => {
    try {
      setTourSeen(localStorage.getItem(tourSeenKey(ARENA_FOG_OF_WAR_TOUR.id)) === '1')
    } catch {
      // Private browsing / blocked storage — just don't highlight the button.
      setTourSeen(true)
    }
  }, [])

  const closeTour = useCallback(() => {
    setTourOpen(false)
    setTourSeen(true)
    try {
      localStorage.setItem(tourSeenKey(ARENA_FOG_OF_WAR_TOUR.id), '1')
    } catch {
      // Non-fatal: the tour simply offers itself again next visit.
    }
  }, [])

  const runTourAction = useCallback((action: TourAction) => {
    if (action.type === 'cop-mode') setCopMode(action.value)
  }, [])

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

  // ── Replay buffer ─────────────────────────────────────────────────────────
  // Ticks used to be rendered then dropped, so the COP could only show "now".
  // Retaining them lets the instructor scrub back through the engagement.
  const [frames, setFrames] = useState<TickFrame[]>([])
  const [scrubIndex, setScrubIndex] = useState(0)
  const [following, setFollowing] = useState(true)

  const onTickChange = useCallback((next: TickResult | null) => {
    setTick(next)
    if (!next) return
    setFrames((prev) => {
      const grown = appendFrame(prev, next)
      // Only advance the playhead when the user is following live; scrubbing
      // back must not be yanked forward by an incoming tick.
      setScrubIndex((idx) => (following ? grown.length - 1 : clampIndex(grown, idx)))
      return grown
    })
  }, [following])

  const scrubTo = useCallback((idx: number) => {
    setScrubIndex((prev) => {
      const next = clampIndex(frames, idx)
      setFollowing(isLive(frames, next))
      return next
    })
  }, [frames])

  const returnToLive = useCallback(() => {
    setFollowing(true)
    setScrubIndex(Math.max(0, frames.length - 1))
  }, [frames.length])

  /** What the COP and the brief actually render — live tick, or a replayed one. */
  const activeTick = useMemo(() => {
    if (following) return tick
    return frameAt(frames, scrubIndex)?.tick ?? tick
  }, [following, tick, frames, scrubIndex])

  const entities = useMemo(
    () => worldStateToCopEntities(scenario, copMode, activeTick),
    [scenario, copMode, activeTick],
  )

  const center = useMemo(() => deriveCenter(scenario), [scenario])

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-4">
      <div className="space-y-4 min-w-0" data-tour="scenario-list">
        <WoprScenarioPanel onScenarioChange={onScenarioChange} onTickChange={onTickChange} />
        <SwarmSaturationPanel />
      </div>

      <StorePanel className="p-2 min-h-[520px] flex flex-col">
        {/* ── Control bar ──────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-2 py-1 mb-1">
          <p className="text-[10px] store-text-muted font-mono uppercase">3D battlespace COP</p>

          <div className="flex flex-wrap items-center gap-1">
            {/* COP view mode tabs */}
            <div className="flex gap-1" role="tablist" aria-label="COP view mode" data-tour="cop-tabs">
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

            {/* ── Printable commander's brief ───────────────────────────── */}
            <div className="w-px h-4 bg-[var(--store-line)] mx-1" aria-hidden />
            <button
              type="button"
              onClick={() => setBriefOpen(true)}
              disabled={!scenario}
              title={scenario ? 'Generate a printable brief for this scenario' : 'Select a scenario first'}
              className={clsx(
                'flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-mono border transition-colors',
                scenario
                  ? 'store-panel-inner store-text-body hover:border-[var(--store-accent-border)]'
                  : 'store-panel-inner store-text-muted opacity-40 cursor-not-allowed',
              )}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="8" y1="13" x2="16" y2="13" />
                <line x1="8" y1="17" x2="16" y2="17" />
              </svg>
              Brief
            </button>

            {/* ── Guided walkthrough launcher ───────────────────────────── */}
            <div className="w-px h-4 bg-[var(--store-line)] mx-1" aria-hidden />
            <button
              type="button"
              onClick={() => setTourOpen(true)}
              title="Walk through the fog-of-war demo"
              className={clsx(
                'flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-mono border transition-colors',
                tourSeen
                  ? 'store-panel-inner store-text-muted hover:border-[var(--store-accent-border)]'
                  : 'border-[var(--store-accent-border)] text-[var(--store-accent)] bg-[var(--store-accent)]/10',
              )}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Guide
            </button>

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
        <div className="relative h-[480px] w-full rounded-xl overflow-hidden shrink-0" data-tour="cop-canvas">
          <CesiumArena
            entities={entities}
            center={center}
            showAisLayer={showAisLayer}
            aisVessels={aisVessels}
          />
        </div>

        <TickScrubber
          frames={frames}
          index={scrubIndex}
          following={following}
          onScrub={scrubTo}
          onReturnToLive={returnToLive}
        />
      </StorePanel>

      <GuidedTour
        tour={ARENA_FOG_OF_WAR_TOUR}
        open={tourOpen}
        onClose={closeTour}
        onAction={runTourAction}
      />

      <ScenarioBriefSheet
        scenario={scenario}
        tick={activeTick}
        open={briefOpen}
        onClose={() => setBriefOpen(false)}
      />
    </div>
  )
}
