'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { EditionBadge } from '@/components/operations/EditionBadge'
import { AdjudicationSourceBanner } from '@/components/operations/AdjudicationSourceBanner'
import { StorePanel } from '@/components/ui/store-surface'
import { isOperationsEditionClient } from '@/lib/operations/edition-client'
import { TRAINING_WOPR_SCENARIOS } from '@/lib/wopr/training-scenarios'
import type { SensorTrack, TickResult, WoprScenario } from '@/lib/wopr/types'
import { clsx } from 'clsx'
import { Play, Plus, Radio, Swords } from 'lucide-react'

export interface WoprScenarioPanelProps {
  onScenarioChange?: (scenario: WoprScenario | null) => void
  onTickChange?: (tick: TickResult | null) => void
  /**
   * `stacked` (default) renders the sensor pictures and tick events inside the
   * panel. `rail` leaves them to the host, which can render them wide beside
   * the COP and follow the replay scrubber.
   */
  layout?: 'stacked' | 'rail'
}

function countActivePlatforms(scenario: WoprScenario | null): { red: number; blue: number } {
  if (!scenario) return { red: 0, blue: 0 }
  const red = scenario.world_state.red_orbat.platforms.filter((p) => !p.destroyed).length
  const blue = scenario.world_state.blue_orbat.platforms.filter((p) => !p.destroyed).length
  return { red, blue }
}

export function WoprScenarioPanel({ onScenarioChange, onTickChange, layout = 'stacked' }: WoprScenarioPanelProps) {
  const operations = isOperationsEditionClient()
  const [scenarios, setScenarios] = useState<WoprScenario[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tick, setTick] = useState<TickResult | null>(null)
  const [events, setEvents] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [apiStatus, setApiStatus] = useState<'idle' | 'loading' | 'ok' | 'fallback'>('idle')
  const [sseConnected, setSseConnected] = useState(false)
  const [newName, setNewName] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [templates, setTemplates] = useState<{ id: string; name: string }[]>([])
  const streamRef = useRef<EventSource | null>(null)

  const selected = scenarios.find((s) => s.id === selectedId) ?? null
  const orbatCounts = countActivePlatforms(selected)

  const selectScenario = useCallback(
    (id: string, list: WoprScenario[] = scenarios) => {
      setSelectedId(id)
      setTick(null)
      setEvents([])
      onTickChange?.(null)
      const scenario = list.find((s) => s.id === id) ?? null
      onScenarioChange?.(scenario)
    },
    [scenarios, onScenarioChange, onTickChange],
  )

  const refresh = useCallback(async () => {
    if (!operations) return
    setApiStatus('loading')
    setError(null)
    try {
      const res = await fetch('/api/v1/wopr/scenarios')
      if (res.status === 403) {
        setApiStatus('fallback')
        setScenarios(TRAINING_WOPR_SCENARIOS)
        setError(null)
        return
      }
      if (!res.ok) {
        setApiStatus('fallback')
        setScenarios(TRAINING_WOPR_SCENARIOS)
        setError(`Live WOPR unavailable (${res.status}). OSINT scenario library loaded.`)
        return
      }
      const json = await res.json()
      const list: WoprScenario[] = json.data ?? []
      setScenarios(list)
      setApiStatus('ok')
    } catch {
      setApiStatus('fallback')
      setScenarios(TRAINING_WOPR_SCENARIOS)
      setError('Network error. OSINT scenario library loaded.')
    }
  }, [operations])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!operations && TRAINING_WOPR_SCENARIOS.length > 0 && !selectedId) {
      setScenarios(TRAINING_WOPR_SCENARIOS)
      selectScenario(TRAINING_WOPR_SCENARIOS[0].id, TRAINING_WOPR_SCENARIOS)
    }
  }, [operations, selectedId, selectScenario])

  useEffect(() => {
    if (!operations) return
    fetch('/api/v1/wopr/templates')
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((json) => setTemplates(json.data ?? []))
      .catch(() => setTemplates([]))
  }, [operations])

  useEffect(() => {
    if (scenarios.length === 0) return
    const stillSelected = selectedId && scenarios.some((s) => s.id === selectedId)
    if (!stillSelected) {
      selectScenario(scenarios[0].id, scenarios)
    }
  }, [scenarios, selectedId, selectScenario])

  useEffect(() => {
    if (!selectedId || !operations) {
      setSseConnected(false)
      return
    }

    streamRef.current?.close()
    const es = new EventSource(`/api/v1/wopr/scenarios/${selectedId}/stream`)
    streamRef.current = es

    es.onopen = () => setSseConnected(true)
    es.onerror = () => setSseConnected(false)

    es.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as { type: string; payload?: TickResult & { events?: string[] } }
        if (msg.type === 'tick' && msg.payload) {
          setTick(msg.payload)
          onTickChange?.(msg.payload)
          if (msg.payload.events?.length) {
            setEvents((prev) => [...msg.payload!.events!, ...prev].slice(0, 20))
          }
        }
      } catch {
        // ignore malformed SSE
      }
    }

    return () => {
      es.close()
      streamRef.current = null
      setSseConnected(false)
    }
  }, [selectedId, operations, onTickChange])

  useEffect(() => {
    onScenarioChange?.(selected)
  }, [selected, onScenarioChange])

  async function createScenario(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/wopr/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          templateId: templateId || undefined,
        }),
      })
      if (!res.ok) {
        setError(`Create scenario failed (${res.status}).`)
        setLoading(false)
        return
      }
      const json = await res.json()
      const created: WoprScenario = json.data
      setScenarios((prev) => {
        const next = [created, ...prev]
        selectScenario(created.id, next)
        return next
      })
      setNewName('')
    } catch {
      setError('Network error creating scenario.')
    }
    setLoading(false)
  }

  async function runTick() {
    if (!selectedId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/wopr/scenarios/${selectedId}/tick`, { method: 'POST' })
      if (!res.ok) {
        setError(`Advance tick failed (${res.status}).`)
        setLoading(false)
        return
      }
      const json = await res.json()
      const nextTick: TickResult = json.data.tick
      const nextScenario: WoprScenario = json.data.scenario
      setTick(nextTick)
      onTickChange?.(nextTick)
      setEvents((prev) => [...(nextTick.events ?? []), ...prev].slice(0, 20))
      setScenarios((prev) => prev.map((s) => (s.id === selectedId ? nextScenario : s)))
      onScenarioChange?.(nextScenario)
    } catch {
      setError('Network error advancing tick.')
    }
    setLoading(false)
  }

  if (!operations) {
    return (
      <StorePanel className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--store-line)] px-4 py-3">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[var(--store-ink)]">
            <Swords className="h-4 w-4 text-[var(--wb-blue)]" aria-hidden />
            Scenarios
          </h2>
          <EditionBadge />
        </div>
        <p className="px-4 pt-3 text-[13px] leading-relaxed store-text-body">
          Training tier: OSINT vignettes with a static ORBAT. Enable the Operations edition for the live COP stream and
          the fog-of-war tick engine.
        </p>
        <div className="p-3">
          <ScenarioList
            items={TRAINING_WOPR_SCENARIOS}
            selectedId={selectedId}
            onSelect={(id) => selectScenario(id, TRAINING_WOPR_SCENARIOS)}
            meta={(s) => <span className="font-mono">{s.classification}</span>}
          />
        </div>
      </StorePanel>
    )
  }

  return (
    <div className="space-y-5">
      <StorePanel className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--store-line)] px-4 py-3">
          <h2 className="text-[15px] font-semibold text-[var(--store-ink)]">Scenarios</h2>
          <EditionBadge />
        </div>

        <div className="space-y-3 p-3">
          {/* Loading is said by the list itself; the banner only speaks up for the OSINT fallback. */}
          <AdjudicationSourceBanner
            source={apiStatus === 'fallback' ? 'fallback' : 'client'}
            fallbackReason="WOPR API unavailable: authenticate and enable the Operations edition"
          />

          {error && (
            <p role="alert" className="rounded-xl border border-[rgba(255,92,110,0.35)] px-3 py-2 text-[12px] leading-relaxed text-[#FF8A98]">
              {error}
            </p>
          )}

          {scenarios.length === 0 ? (
            <p className="px-1 py-2 text-[13px] store-text-muted">
              {apiStatus === 'idle' || apiStatus === 'loading'
                ? 'Loading scenarios…'
                : 'No scenarios yet. Create one below to start WOPR.'}
            </p>
          ) : (
            <ScenarioList
              items={scenarios}
              selectedId={selectedId}
              onSelect={(id) => selectScenario(id)}
              meta={(s) => (
                <>
                  <span className={clsx('tag capitalize', STATUS_TONE[s.status])}>{s.status}</span>
                  <span className="font-mono tabular-nums">T+{s.elapsed_min} min</span>
                </>
              )}
            />
          )}
        </div>

        <form onSubmit={createScenario} className="space-y-2.5 border-t border-[var(--store-line)] p-4">
          <label htmlFor="wopr-new-name" className="block text-[12px] font-medium store-text-body">
            New scenario
          </label>
          <input
            id="wopr-new-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Scenario name"
            autoComplete="off"
            className="glass-field h-9 w-full px-3 text-[13px]"
          />
          <select
            value={templates.length === 0 ? '' : templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="glass-field h-9 w-full px-2.5 text-[13px]"
            aria-label="Scenario template"
          >
            {templates.length === 0 ? (
              <option value="" disabled>
                No templates loaded
              </option>
            ) : (
              <>
                <option value="">Empty ORBAT</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </>
            )}
          </select>
          <button type="submit" disabled={loading || !newName.trim()} className="btn-glass w-full disabled:opacity-50">
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Create scenario
          </button>
        </form>
      </StorePanel>

      {!selected ? (
        <StorePanel className="px-4 py-6 text-center text-[13px] store-text-muted">
          Select or create a scenario to open the COP.
        </StorePanel>
      ) : (
        <>
          <StorePanel className="p-4">
            <p className="text-[12px] store-text-muted">Selected scenario</p>
            <h3 className="mt-0.5 text-[16px] font-semibold text-[var(--store-ink)]">{selected.name}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="tag font-mono">{selected.classification}</span>
              <span className={clsx('tag capitalize', STATUS_TONE[selected.status])}>{selected.status}</span>
              <span className={clsx('tag', sseConnected ? 'green' : '')}>
                <span
                  aria-hidden
                  className={clsx('h-1.5 w-1.5 rounded-full', sseConnected ? 'bg-[#4ADE80]' : 'bg-[var(--store-ink-mute)]')}
                />
                {sseConnected ? 'Stream live' : 'Stream offline'}
              </span>
            </div>
            <dl className="mt-4 grid grid-cols-3 border-y border-[var(--store-line)] py-3 text-center">
              <div>
                <dt className="text-[11.5px] store-text-muted">ORBAT red</dt>
                <dd className="mt-0.5 font-mono text-[20px] font-semibold tabular-nums text-[var(--wb-red)]">{orbatCounts.red}</dd>
              </div>
              <div className="border-x border-[var(--store-line)]">
                <dt className="text-[11.5px] store-text-muted">ORBAT blue</dt>
                <dd className="mt-0.5 font-mono text-[20px] font-semibold tabular-nums text-[var(--wb-blue)]">{orbatCounts.blue}</dd>
              </div>
              <div>
                <dt className="text-[11.5px] store-text-muted">Elapsed</dt>
                <dd className="mt-0.5 font-mono text-[20px] font-semibold tabular-nums text-[var(--store-ink)]">
                  {tick?.elapsed_min ?? selected.elapsed_min}
                  <span className="ml-0.5 text-[12px] font-normal store-text-muted">min</span>
                </dd>
              </div>
            </dl>
            <button type="button" onClick={runTick} disabled={loading} className="btn-glass primary mt-4 w-full disabled:opacity-60">
              <Play className="h-3.5 w-3.5" aria-hidden />
              Advance tick (+15 min)
            </button>
          </StorePanel>

          {layout === 'stacked' ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <CopPicture title="Blue sensor picture" force="blue" tracks={tick?.blue_picture ?? []} />
                <CopPicture title="Red sensor picture (fog of war)" force="red" tracks={tick?.red_picture ?? []} />
              </div>

              <StorePanel className="p-4">
                <p className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-[var(--store-ink)]">
                  <Radio className="h-3.5 w-3.5 text-[#06B6D4]" aria-hidden />
                  Tick events
                </p>
                {events.length === 0 ? (
                  <p className="text-[13px] store-text-muted">No events yet. Advance a tick.</p>
                ) : (
                  <ul className="max-h-40 space-y-1 overflow-y-auto">
                    {events.map((ev, i) => (
                      <li key={`${ev}-${i}`} className="font-mono text-[12px] store-text-body">
                        {ev}
                      </li>
                    ))}
                  </ul>
                )}
                {tick && (
                  <p className="mt-3 font-mono text-[12px] store-text-muted">
                    Turn {tick.turn} · T+{tick.elapsed_min} min
                    {tick.propagation_refreshed ? ' · propagation refreshed' : ''}
                  </p>
                )}
              </StorePanel>
            </>
          ) : null}
        </>
      )}
    </div>
  )
}

const STATUS_TONE: Record<string, string> = {
  running: 'green',
  paused: 'amber',
  draft: '',
  complete: 'blue',
}

function ScenarioList<T extends { id: string; name: string }>({
  items,
  selectedId,
  onSelect,
  meta,
}: {
  items: readonly T[]
  selectedId: string | null
  onSelect: (id: string) => void
  meta: (item: T) => React.ReactNode
}) {
  return (
    <ul className="max-h-[252px] space-y-1 overflow-y-auto" aria-label="Scenarios">
      {items.map((s) => {
        const on = selectedId === s.id
        return (
          <li key={s.id}>
            <button
              type="button"
              aria-pressed={on}
              onClick={() => onSelect(s.id)}
              className={clsx(
                'w-full rounded-xl px-3 py-2.5 text-left transition-[background-color,box-shadow] duration-150 ease-out',
                on
                  ? 'bg-[rgba(41,151,255,0.16)] shadow-[inset_0_0_0_1px_rgba(41,151,255,0.45)]'
                  : 'hover:bg-white/[0.04]',
              )}
            >
              <p className="truncate text-[13px] font-medium text-[var(--store-ink)]">{s.name}</p>
              <p className="mt-1 flex items-center gap-2 text-[12px] store-text-muted">{meta(s)}</p>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function CopPicture({
  title,
  force,
  tracks,
}: {
  title: string
  force: 'red' | 'blue'
  tracks: SensorTrack[]
}) {
  return (
    <StorePanel className="p-4">
      <p className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-[var(--store-ink)]">
        <span
          aria-hidden
          className={clsx('h-2 w-2 rounded-full', force === 'red' ? 'bg-[var(--wb-red)]' : 'bg-[var(--wb-blue)]')}
        />
        {title}
      </p>
      {tracks.length === 0 ? (
        <p className="text-[13px] store-text-muted">No tracks: fog of war, or no detections.</p>
      ) : (
        <ul className="space-y-2">
          {tracks.map((t) => (
            <li key={t.id} className="flex justify-between gap-2 font-mono text-[12px] store-text-body">
              <span className="truncate">{t.name}</span>
              <span className="shrink-0 store-text-muted">
                {t.lat.toFixed(2)}°, {t.lon.toFixed(2)}° · {t.confidence}
              </span>
            </li>
          ))}
        </ul>
      )}
    </StorePanel>
  )
}

