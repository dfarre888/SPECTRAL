'use client'
import { SwarmSaturationPanel } from '@/components/arena/SwarmSaturationPanel'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Anchor, CircleHelp, FileText, Radio } from 'lucide-react'
import { WoprScenarioPanel } from '@/components/arena/WoprScenarioPanel'
import { StorePanel } from '@/components/ui/store-surface'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { worldStateToCopEntities, type CopViewMode } from '@/lib/wopr/cop-entities'
import type { SensorTrack, TickResult, WoprScenario } from '@/lib/wopr/types'
import { aisBboxSearchParams, type AisVessel } from '@/lib/ais/types'
import { clsx } from 'clsx'
import { GuidedTour } from '@/components/tour/GuidedTour'
import { ARENA_FOG_OF_WAR_TOUR, tourSeenKey, type TourAction } from '@/lib/tour/tours'
import { ScenarioBriefSheet } from '@/components/wopr/ScenarioBriefSheet'
import { TickScrubber } from '@/components/wopr/TickScrubber'
import { appendFrame, clampIndex, eventsThrough, frameAt, isLive, type TickFrame } from '@/lib/wopr/tick-history'

import { GlobeSkeleton } from '@/components/ui/loading-skeleton'

const CesiumArena = dynamic(() => import('@/components/arena/CesiumArena'), {
  ssr: false,
  loading: () => <GlobeSkeleton className="h-full min-h-[420px] rounded-none" />,
})

const COP_MODES: { id: CopViewMode; label: string; hint: string }[] = [
  { id: 'orbat', label: 'ORBAT', hint: 'Ground truth' },
  { id: 'blue_picture', label: 'Blue picture', hint: 'What Blue holds' },
  { id: 'red_fow', label: 'Red FoW', hint: 'What Red holds' },
]

/** What each COP view calls the entities it draws, per force. */
const LEGEND: Record<CopViewMode, { blue: string; red: string }> = {
  orbat: { blue: 'Blue units', red: 'Red units' },
  blue_picture: { blue: 'Blue units', red: 'Red tracks' },
  red_fow: { blue: 'Blue tracks', red: 'Red units' },
}

// How often to refresh AIS data while the layer is active (ms)
const AIS_POLL_MS = 2 * 60 * 1000 // 2 minutes, matches server cache TTL

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
      // Private browsing / blocked storage: just don't highlight the button.
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
  /** Layer toggle: OFF by default for faster initial load */
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

  // ── Replay buffer ─────────────────────────────────────────────────────────
  // Ticks used to be rendered then dropped, so the COP could only show "now".
  // Retaining them lets the instructor scrub back through the engagement.
  const [frames, setFrames] = useState<TickFrame[]>([])
  const [scrubIndex, setScrubIndex] = useState(0)
  const [following, setFollowing] = useState(true)

  // A different scenario starts a fresh replay buffer; ticks from the last one
  // must not appear on this one's scrubber or event log.
  const scenarioIdRef = useRef<string | null>(null)
  const onScenarioChange = useCallback((next: WoprScenario | null) => {
    setScenario(next)
    const id = next?.id ?? null
    if (id !== scenarioIdRef.current) {
      scenarioIdRef.current = id
      setFrames([])
      setScrubIndex(0)
      setFollowing(true)
    }
  }, [])

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

  /** What the COP and the brief actually render: live tick, or a replayed one. */
  const activeTick = useMemo(() => {
    if (following) return tick
    return frameAt(frames, scrubIndex)?.tick ?? tick
  }, [following, tick, frames, scrubIndex])

  /** The event log as it stood at the playhead, newest first. */
  const events = useMemo(() => {
    const at = following ? frames.length - 1 : scrubIndex
    return eventsThrough(frames, at).reverse()
  }, [frames, following, scrubIndex])

  const entities = useMemo(
    () => worldStateToCopEntities(scenario, copMode, activeTick),
    [scenario, copMode, activeTick],
  )

  const forceCounts = useMemo(() => {
    let blue = 0
    let red = 0
    for (const e of entities) {
      if (e.force === 'blue') blue++
      else red++
    }
    return { blue, red }
  }, [entities])

  const center = useMemo(() => deriveCenter(scenario), [scenario])
  const mode = COP_MODES.find((m) => m.id === copMode) ?? COP_MODES[0]
  const legend = LEGEND[copMode]

  return (
    <div className="arena-cop grid grid-cols-1 gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
      {/* Cesium ships its attribution at 10px; lift it to the 11px floor without hiding it. */}
      <style jsx global>{`
        .arena-cop .cesium-widget-credits,
        .arena-cop .cesium-widget-credits * { font-size: 11px !important; }
      `}</style>
      <div className="min-w-0 space-y-5" data-tour="scenario-list">
        <WoprScenarioPanel onScenarioChange={onScenarioChange} onTickChange={onTickChange} layout="rail" />
        <SwarmSaturationPanel />
      </div>

      <div className="min-w-0 space-y-5">
        <StorePanel className="overflow-hidden">
          {/* ── Header: what this is, and which view of it ──────────────────── */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-[var(--store-line)] px-4 py-3">
            <div className="mr-auto min-w-0">
              <h2 className="text-[15px] font-semibold text-[var(--store-ink)]">Battlespace COP</h2>
              <p className="mt-0.5 truncate text-[12px] store-text-muted">
                {scenario ? (
                  <>
                    {scenario.name}
                    <span className="font-mono"> · T+{activeTick?.elapsed_min ?? scenario.elapsed_min} min</span>
                    {!following ? <span className="text-[#FBBF24]"> · replaying</span> : null}
                  </>
                ) : (
                  'No scenario selected'
                )}
              </p>
            </div>

            <div className="seg sm" role="tablist" aria-label="COP view mode" data-tour="cop-tabs">
              {COP_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="tab"
                  aria-selected={copMode === m.id}
                  title={m.hint}
                  onClick={() => setCopMode(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── AIS error banner ─────────────────────────────────────────────── */}
          {showAisLayer && aisError && (
            <p role="alert" className="border-b border-[var(--store-line)] px-4 py-2 text-[12px] text-[#FF8A98]">
              AIS unavailable: {aisError}
            </p>
          )}

          {/* ── 3D canvas with glass HUD ─────────────────────────────────────── */}
          <div className="relative h-[min(64vh,620px)] min-h-[420px] w-full" data-tour="cop-canvas">
            <CesiumArena
              entities={entities}
              center={center}
              showAisLayer={showAisLayer}
              aisVessels={aisVessels}
            />

            <div className="lg-glass pointer-events-none absolute left-3 top-3 z-10 px-3.5 py-2.5">
              <p className="text-[12px] font-medium text-[var(--store-ink)]">{mode.hint}</p>
              <div className="mt-1.5 flex items-center gap-4 text-[12px]">
                <span className="flex items-center gap-1.5 store-text-body">
                  <span aria-hidden className="h-2 w-2 rounded-full bg-[var(--wb-blue)]" />
                  {legend.blue}
                  <span className="font-mono tabular-nums text-[var(--store-ink)]">{forceCounts.blue}</span>
                </span>
                <span className="flex items-center gap-1.5 store-text-body">
                  <span aria-hidden className="h-2 w-2 rounded-full bg-[var(--wb-red)]" />
                  {legend.red}
                  <span className="font-mono tabular-nums text-[var(--store-ink)]">{forceCounts.red}</span>
                </span>
              </div>
            </div>

            <div className="lg-glass absolute right-3 top-3 z-10 flex items-center gap-0.5 p-1">
              <button
                type="button"
                onClick={() => setBriefOpen(true)}
                disabled={!scenario}
                title={scenario ? 'Generate a printable brief for this scenario' : 'Select a scenario first'}
                className="lg-btn"
              >
                <FileText className="h-3.5 w-3.5" aria-hidden />
                Brief
              </button>
              <button
                type="button"
                onClick={() => setTourOpen(true)}
                title="Walk through the fog-of-war demo"
                className="lg-btn relative"
              >
                <CircleHelp className="h-3.5 w-3.5" aria-hidden />
                Guide
                {!tourSeen ? (
                  <span aria-label="New" className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[var(--wb-blue)]" />
                ) : null}
              </button>
              <span className="lg-sep" aria-hidden />
              <button
                type="button"
                aria-pressed={showAisLayer}
                title={
                  aisError
                    ? `AIS error: ${aisError}`
                    : showAisLayer
                    ? `AIS live: ${aisVessels.length} vessels, refreshed every 2 min`
                    : 'Show AIS marine traffic'
                }
                onClick={() => setShowAisLayer((v) => !v)}
                className={clsx('lg-btn cyan', showAisLayer && !aisError && 'on', aisError && '!text-[#FF8A98]')}
              >
                <Anchor className="h-3.5 w-3.5" aria-hidden />
                AIS
                {showAisLayer && !aisFetching && !aisError && (
                  <span className="font-mono tabular-nums opacity-80">{aisVessels.length}</span>
                )}
                {aisFetching && (
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-current animate-pulse motion-reduce:animate-none" aria-label="Fetching" />
                )}
              </button>
            </div>
          </div>

          <TickScrubber
            frames={frames}
            index={scrubIndex}
            following={following}
            onScrub={scrubTo}
            onReturnToLive={returnToLive}
          />
        </StorePanel>

        <div className="grid gap-5 lg:grid-cols-2">
          <SensorPicture
            force="blue"
            title="Blue sensor picture"
            caption="What Blue holds on Red"
            tracks={activeTick?.blue_picture ?? []}
            hasTick={Boolean(activeTick)}
          />
          <SensorPicture
            force="red"
            title="Red sensor picture"
            caption="What Red holds on Blue, fog of war"
            tracks={activeTick?.red_picture ?? []}
            hasTick={Boolean(activeTick)}
          />
        </div>

        <EventLog events={events} tick={activeTick} />
      </div>

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

const CONFIDENCE_TONE: Record<SensorTrack['confidence'], string> = {
  high: 'green',
  medium: 'amber',
  low: '',
}

const SOURCE_LABEL: Record<SensorTrack['source'], string> = {
  radar: 'Radar',
  eo_ir: 'EO/IR',
  sigint: 'SIGINT',
  report: 'Report',
}

function SensorPicture({
  force,
  title,
  caption,
  tracks,
  hasTick,
}: {
  force: 'red' | 'blue'
  title: string
  caption: string
  tracks: SensorTrack[]
  hasTick: boolean
}) {
  return (
    <StorePanel className="min-w-0 overflow-hidden">
      <div className="flex items-baseline justify-between gap-3 border-b border-[var(--store-line)] px-4 py-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-[14px] font-semibold text-[var(--store-ink)]">
            <span
              aria-hidden
              className={clsx('h-2 w-2 rounded-full', force === 'blue' ? 'bg-[var(--wb-blue)]' : 'bg-[var(--wb-red)]')}
            />
            {title}
          </h3>
          <p className="mt-0.5 text-[12px] store-text-muted">{caption}</p>
        </div>
        <span className="shrink-0 font-mono text-[12px] tabular-nums store-text-muted">
          {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}
        </span>
      </div>
      {tracks.length === 0 ? (
        <p className="px-4 py-6 text-[13px] store-text-muted">
          {hasTick ? 'No detections at this tick.' : 'No tick yet. Advance a tick to build the picture.'}
        </p>
      ) : (
        <ScrollArea frame={false} maxHeight="280px">
          <table className="dt compact">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr>
                <th scope="col">Track</th>
                <th scope="col">Confidence</th>
                <th scope="col">Source</th>
              </tr>
            </thead>
            <tbody>
              {tracks.map((t) => (
                <tr key={t.id}>
                  <td>
                    <span className="primary block max-w-[220px] truncate" title={t.name}>{t.name}</span>
                    <span className="meta font-mono tabular-nums">
                      {t.lat.toFixed(2)}°, {t.lon.toFixed(2)}°
                    </span>
                  </td>
                  <td>
                    <span className={clsx('tag capitalize', CONFIDENCE_TONE[t.confidence])}>{t.confidence}</span>
                  </td>
                  <td>{SOURCE_LABEL[t.source] ?? t.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>
      )}
    </StorePanel>
  )
}

function EventLog({ events, tick }: { events: string[]; tick: TickResult | null }) {
  return (
    <StorePanel className="overflow-hidden">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[var(--store-line)] px-4 py-3">
        <h3 className="flex items-center gap-2 text-[14px] font-semibold text-[var(--store-ink)]">
          <Radio className="h-3.5 w-3.5 text-[#06B6D4]" aria-hidden />
          Tick events
        </h3>
        {tick ? (
          <p className="font-mono text-[12px] tabular-nums store-text-muted">
            Turn {tick.turn} · T+{tick.elapsed_min} min
            {tick.propagation_refreshed ? ' · propagation refreshed' : ''}
          </p>
        ) : null}
      </div>
      {events.length === 0 ? (
        <p className="px-4 py-6 text-[13px] store-text-muted">No events yet. Advance a tick to start the log.</p>
      ) : (
        <ScrollArea frame={false} maxHeight="240px">
          <ol className="divide-y divide-[var(--store-line)]">
            {events.map((ev, i) => (
              <li key={`${i}-${ev}`} className="flex gap-3 px-4 py-2 font-mono text-[12.5px] leading-relaxed store-text-body">
                <span aria-hidden className="w-8 shrink-0 text-right tabular-nums store-text-muted">
                  {events.length - i}
                </span>
                <span className="min-w-0">{ev}</span>
              </li>
            ))}
          </ol>
        </ScrollArea>
      )}
    </StorePanel>
  )
}
