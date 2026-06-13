'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { EditionBadge } from '@/components/operations/EditionBadge'
import { AdjudicationSourceBanner } from '@/components/operations/AdjudicationSourceBanner'
import { StorePanel } from '@/components/ui/store-surface'
import { isOperationsEditionClient } from '@/lib/operations/edition-client'
import type { SensorTrack, TickResult, WoprScenario } from '@/lib/wopr/types'
import { clsx } from 'clsx'
import { Play, Plus, Radio, Pause, Swords } from 'lucide-react'

export function WoprScenarioPanel() {
  const operations = isOperationsEditionClient()
  const [scenarios, setScenarios] = useState<WoprScenario[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tick, setTick] = useState<TickResult | null>(null)
  const [events, setEvents] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [apiStatus, setApiStatus] = useState<'idle' | 'loading' | 'ok' | 'fallback'>('idle')
  const [newName, setNewName] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [templates, setTemplates] = useState<{ id: string; name: string }[]>([])
  const streamRef = useRef<EventSource | null>(null)

  const selected = scenarios.find((s) => s.id === selectedId) ?? null

  const refresh = useCallback(async () => {
    if (!operations) return
    setApiStatus('loading')
    const res = await fetch('/api/v1/wopr/scenarios')
    if (res.status === 403 || !res.ok) {
      setApiStatus('fallback')
      return
    }
    const json = await res.json()
    setScenarios(json.data ?? [])
    setApiStatus('ok')
  }, [operations])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!operations) return
    fetch('/api/v1/wopr/templates')
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((json) => setTemplates(json.data ?? []))
      .catch(() => setTemplates([]))
  }, [operations])

  useEffect(() => {
    if (!selectedId || !operations) return

    streamRef.current?.close()
    const es = new EventSource(`/api/v1/wopr/scenarios/${selectedId}/stream`)
    streamRef.current = es

    es.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as { type: string; payload?: TickResult & { events?: string[] } }
        if (msg.type === 'tick' && msg.payload) {
          setTick(msg.payload)
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
    }
  }, [selectedId, operations])

  async function createScenario(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setLoading(true)
    const res = await fetch('/api/v1/wopr/scenarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newName.trim(),
        templateId: templateId || undefined,
      }),
    })
    if (res.ok) {
      const json = await res.json()
      setScenarios((prev) => [json.data, ...prev])
      setSelectedId(json.data.id)
      setNewName('')
    }
    setLoading(false)
  }

  async function runTick() {
    if (!selectedId) return
    setLoading(true)
    const res = await fetch(`/api/v1/wopr/scenarios/${selectedId}/tick`, { method: 'POST' })
    if (res.ok) {
      const json = await res.json()
      setTick(json.data.tick)
      setEvents((prev) => [...(json.data.tick.events ?? []), ...prev].slice(0, 20))
      setScenarios((prev) =>
        prev.map((s) => (s.id === selectedId ? json.data.scenario : s)),
      )
    }
    setLoading(false)
  }

  if (!operations) {
    return (
      <StorePanel className="p-8 space-y-4">
        <div className="flex items-center gap-3">
          <Swords className="w-5 h-5 text-[var(--store-accent)]" />
          <EditionBadge />
        </div>
        <p className="store-text-body text-sm max-w-lg">
          Red/Blue Arena (WOPR) requires Spectral Operations edition. Training tier provides
          static scenario templates only — no live SSE COP or fog-of-war tick engine.
        </p>
        <p className="text-[10px] font-mono store-text-muted">
          Set NEXT_PUBLIC_SPECTRAL_EDITION=operations to enable WOPR client.
        </p>
      </StorePanel>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <StorePanel inner className="p-4 space-y-4 h-fit">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider store-text-muted">Scenarios</p>
          <EditionBadge />
        </div>

        <AdjudicationSourceBanner
          source={apiStatus === 'loading' ? 'loading' : apiStatus === 'fallback' ? 'fallback' : 'client'}
          fallbackReason="WOPR API unavailable — authenticate and enable Operations edition"
        />

        <form onSubmit={createScenario} className="space-y-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Scenario name"
            className="w-full store-panel-inner rounded-xl px-3 py-2 text-xs text-white placeholder:store-text-muted focus:outline-none focus:border-[var(--store-accent-border)]"
          />
          {templates.length > 0 && (
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="w-full store-panel-inner rounded-xl px-3 py-2 text-xs text-white"
            >
              <option value="">Empty ORBAT</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="submit"
            disabled={loading}
            className="store-btn-primary w-full px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            New scenario
          </button>
        </form>

        {scenarios.length === 0 ? (
          <p className="text-xs store-text-body">No scenarios — create one to start WOPR.</p>
        ) : (
          <ul className="space-y-1">
            {scenarios.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  className={clsx(
                    'w-full text-left rounded-xl px-3 py-2 text-xs border transition-colors',
                    selectedId === s.id
                      ? 'nav-item-active'
                      : 'store-panel-inner store-text-body hover:border-[var(--store-accent-border)]',
                  )}
                >
                  <p className="font-semibold text-white truncate">{s.name}</p>
                  <p className="font-mono text-[10px] store-text-muted mt-0.5">
                    {s.status} · T+{s.elapsed_min} min
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </StorePanel>

      <div className="space-y-4">
        {!selected ? (
          <StorePanel className="p-8 text-center store-text-muted text-sm">
            Select or create a scenario to open the COP.
          </StorePanel>
        ) : (
          <>
            <StorePanel inner className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{selected.name}</p>
                <p className="text-[10px] font-mono store-text-muted mt-0.5">
                  {selected.classification} · {selected.status} · SSE{' '}
                  {streamRef.current ? 'connected' : '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={runTick}
                disabled={loading}
                className="store-btn-primary px-4 py-2 rounded-xl text-xs flex items-center gap-2"
              >
                {selected.status === 'running' ? (
                  <Pause className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                Advance tick
              </button>
            </StorePanel>

            <div className="grid gap-4 md:grid-cols-2">
              <CopPicture
                title="Blue sensor picture"
                force="blue"
                tracks={tick?.blue_picture ?? []}
              />
              <CopPicture
                title="Red sensor picture (fog of war)"
                force="red"
                tracks={tick?.red_picture ?? []}
              />
            </div>

            <StorePanel inner className="p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider store-text-muted mb-2 flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-cyan" />
                Tick events
              </p>
              {events.length === 0 ? (
                <p className="text-xs store-text-body">No events yet — advance a tick.</p>
              ) : (
                <ul className="space-y-1 max-h-40 overflow-y-auto">
                  {events.map((ev, i) => (
                    <li key={`${ev}-${i}`} className="text-[10px] font-mono store-text-body">
                      {ev}
                    </li>
                  ))}
                </ul>
              )}
              {tick && (
                <p className="text-[9px] font-mono store-text-muted mt-3">
                  Turn {tick.turn} · T+{tick.elapsed_min} min
                  {tick.propagation_refreshed ? ' · propagation flag set' : ''}
                </p>
              )}
            </StorePanel>
          </>
        )}
      </div>
    </div>
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
  const accent = force === 'red' ? 'text-red-400 border-red-400/30' : 'text-blue-400 border-blue-400/30'

  return (
    <StorePanel inner className={clsx('p-4 border', accent)}>
      <p className={clsx('text-[10px] font-semibold uppercase tracking-wider mb-3', accent.split(' ')[0])}>
        {title}
      </p>
      {tracks.length === 0 ? (
        <p className="text-xs store-text-muted font-mono">No tracks — fog of war / no detections</p>
      ) : (
        <ul className="space-y-2">
          {tracks.map((t) => (
            <li key={t.id} className="text-[10px] font-mono store-text-body flex justify-between gap-2">
              <span className="truncate">{t.name}</span>
              <span className="store-text-muted shrink-0">
                {t.lat.toFixed(2)}°, {t.lon.toFixed(2)}° · {t.confidence}
              </span>
            </li>
          ))}
        </ul>
      )}
    </StorePanel>
  )
}
