'use client'

import { useMemo, useState } from 'react'
import { clsx } from 'clsx'
import {
  composeOrbat,
  diffRollups,
  type ComposerPlatform,
} from '@/lib/force-catalog/orbat-composer'

interface OrbatComposerProps {
  platforms: ComposerPlatform[]
  nationLabel: string
}

const TIER_META = [
  { key: 'track', label: 'Track', hint: 'Machine track exchange', color: 'var(--store-accent)' },
  { key: 'data', label: 'Data', hint: 'Digital, not track quality', color: '#22d3ee' },
  { key: 'voice', label: 'Voice', hint: 'Human relay only', color: '#4ade80' },
  { key: 'none', label: 'No fit', hint: 'Nothing recorded', color: '#71717a' },
] as const

const BAND_TONE: Record<string, string> = {
  HF: '#f472b6', VHF: '#fb923c', UHF: '#facc15', L: '#4ade80',
  S: '#22d3ee', C: '#60a5fa', X: '#a78bfa', Ku: '#e879f9', Ka: '#f87171',
  IR: '#fb7185', EO: '#94a3b8', VIS: '#cbd5e1', UV: '#c084fc',
}

function bandTone(b: string): string {
  return BAND_TONE[b] ?? '#94a3b8'
}

export function OrbatComposer({ platforms, nationLabel }: OrbatComposerProps) {
  const allIds = useMemo(() => new Set(platforms.map((p) => p.id)), [platforms])
  const [selected, setSelected] = useState<Set<string>>(allIds)

  const full = useMemo(() => composeOrbat(platforms, allIds), [platforms, allIds])
  const current = useMemo(() => composeOrbat(platforms, selected), [platforms, selected])
  const delta = useMemo(() => diffRollups(full, current), [full, current])

  const maxBandCount = Math.max(1, ...current.commsBands.map((b) => b.platformCount))
  const maxSensorCount = Math.max(1, ...current.sensorBands.map((b) => b.platformCount))

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const byDomain = useMemo(() => {
    const m = new Map<string, ComposerPlatform[]>()
    for (const p of platforms) {
      if (!m.has(p.domain)) m.set(p.domain, [])
      m.get(p.domain)!.push(p)
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [platforms])

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      {/* ── Package composition ───────────────────────────────────────────── */}
      <div className="store-panel rounded-2xl p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--store-accent)]">
              Package composition
            </p>
            <h3 className="store-display text-sm font-semibold text-white mt-0.5">
              {nationLabel} ORBAT
            </h3>
          </div>
          <div className="flex gap-1.5">
            <button type="button" onClick={() => setSelected(new Set(allIds))}
              className="px-2 py-1 rounded-lg text-[10px] font-mono store-panel-inner text-slate-200 hover:border-[var(--store-accent-border)] border border-transparent">
              All
            </button>
            <button type="button" onClick={() => setSelected(new Set())}
              className="px-2 py-1 rounded-lg text-[10px] font-mono store-panel-inner text-slate-200 hover:border-[var(--store-accent-border)] border border-transparent">
              None
            </button>
          </div>
        </div>

        <div className="max-h-[520px] overflow-y-auto pr-1 space-y-3">
          {byDomain.map(([domain, list]) => (
            <div key={domain}>
              <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1 sticky top-0 bg-[var(--store-surface)] py-1">
                {domain} · {list.filter((p) => selected.has(p.id)).length}/{list.length}
              </p>
              <div className="space-y-1">
                {list.map((p) => {
                  const on = selected.has(p.id)
                  const bands = [
                    ...new Set(
                      p.comms
                        .map((c) => c.band ?? c.kind.replace(/^voice_/, '').toUpperCase())
                        .filter(Boolean),
                    ),
                  ]
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggle(p.id)}
                      className={clsx(
                        'w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 border text-left transition-colors',
                        on
                          ? 'border-[var(--store-accent-border)] bg-[var(--store-accent)]/10'
                          : 'border-[var(--store-line)] opacity-45 hover:opacity-70',
                      )}
                    >
                      <span
                        className={clsx(
                          'w-3.5 h-3.5 rounded-[3px] border shrink-0 flex items-center justify-center text-[9px]',
                          on
                            ? 'bg-[var(--store-accent)] border-[var(--store-accent)] text-black'
                            : 'border-slate-500',
                        )}
                      >
                        {on ? '✓' : ''}
                      </span>
                      <span className="min-w-0 flex-1">
                        {/* Readability: names are near-white, not muted grey. */}
                        <span className="block text-[13px] text-slate-100 font-medium truncate" title={p.label}>
                          {p.label}
                        </span>
                        <span className="block text-[10px] font-mono text-slate-400 truncate">
                          {p.role} · {p.comms.length} comms · {p.sensors.length} sensors
                        </span>
                      </span>
                      <span className="flex gap-0.5 shrink-0">
                        {bands.slice(0, 4).map((b) => (
                          <span key={b} className="w-1.5 h-4 rounded-sm" style={{ background: bandTone(b) }} title={b} />
                        ))}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Live rollup ───────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="store-panel rounded-2xl p-4">
          <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--store-accent)] mb-2">
            Connectivity
          </p>
          <p className="text-2xl font-bold text-white font-mono tabular-nums">
            {current.selectedCount}
            <span className="text-sm text-slate-400"> / {current.totalCount}</span>
          </p>
          <div className="grid grid-cols-4 gap-1.5 mt-3">
            {TIER_META.map((t) => (
              <div key={t.key} className="store-panel-inner rounded-lg p-2 text-center" title={t.hint}>
                <p className="text-base font-bold font-mono tabular-nums" style={{ color: t.color }}>
                  {current.tiers[t.key]}
                </p>
                <p className="text-[9px] font-mono text-slate-400">{t.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="store-panel rounded-2xl p-4">
          <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--store-accent)] mb-2">
            Platforms per comms band
          </p>
          {current.commsBands.length === 0 ? (
            <p className="text-xs text-slate-400">No comms fit in the current package.</p>
          ) : (
            <div className="space-y-1.5">
              {current.commsBands.map((b) => {
                const spof = current.singlePointBands.includes(b.band)
                return (
                  <div key={b.band} className="flex items-center gap-2" title={b.kinds.join(', ')}>
                    <span className="w-10 text-[11px] font-mono text-slate-200 shrink-0">{b.band}</span>
                    <div className="flex-1 h-4 rounded bg-black/30 overflow-hidden">
                      <div className="h-full rounded" style={{
                        width: `${(b.platformCount / maxBandCount) * 100}%`,
                        background: bandTone(b.band),
                        opacity: 0.75,
                      }} />
                    </div>
                    <span className="w-7 text-right text-[11px] font-mono text-slate-100">{b.platformCount}</span>
                    {spof && <span className="text-[9px] font-mono text-amber-400" title="Only one platform holds this band">⚠</span>}
                  </div>
                )
              })}
            </div>
          )}
          {current.singlePointBands.length > 0 && (
            <p className="mt-2 text-[10px] text-amber-300 leading-snug">
              ⚠ {current.singlePointBands.join(', ')} held by a single platform — losing it removes the band.
            </p>
          )}
        </div>

        <div className="store-panel rounded-2xl p-4">
          <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--store-accent)] mb-2">
            Sensor bands covered
          </p>
          {current.sensorBands.length === 0 ? (
            <p className="text-xs text-slate-400">No sensor fit recorded in the current package.</p>
          ) : (
            <div className="space-y-1.5">
              {current.sensorBands.map((b) => (
                <div key={b.band} className="flex items-center gap-2" title={b.kinds.join(', ')}>
                  <span className="w-10 text-[11px] font-mono text-slate-200 shrink-0">{b.band}</span>
                  <div className="flex-1 h-4 rounded bg-black/30 overflow-hidden">
                    <div className="h-full rounded" style={{
                      width: `${(b.platformCount / maxSensorCount) * 100}%`,
                      background: bandTone(b.band),
                      opacity: 0.75,
                    }} />
                  </div>
                  <span className="w-7 text-right text-[11px] font-mono text-slate-100">{b.platformCount}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {(delta.bandsLost.length > 0 || delta.trackDelta !== 0) && (
          <div className="store-panel rounded-2xl p-4 border border-red-500/25">
            <p className="text-[10px] font-mono uppercase tracking-wider text-red-300 mb-1.5">
              Versus full ORBAT
            </p>
            {delta.bandsLost.length > 0 && (
              <p className="text-xs text-red-200 leading-snug">
                Lost bands: <span className="font-mono">{delta.bandsLost.join(', ')}</span>
              </p>
            )}
            {delta.trackDelta !== 0 && (
              <p className="text-xs text-slate-300 mt-1">
                Track-capable platforms {delta.trackDelta > 0 ? '+' : ''}{delta.trackDelta}
              </p>
            )}
          </div>
        )}

        {(current.noCommsIds.length > 0 || current.noSensorIds.length > 0) && (
          <p className="text-[10px] font-mono text-slate-400 leading-relaxed">
            {current.noCommsIds.length} selected with no comms fit ·{' '}
            {current.noSensorIds.length} with no sensor fit. Absent data, not absent capability.
          </p>
        )}
      </div>
    </div>
  )
}
