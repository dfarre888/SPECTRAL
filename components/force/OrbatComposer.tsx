'use client'

import { useMemo, useState } from 'react'
import { clsx } from 'clsx'
import { AlertTriangle, Check } from 'lucide-react'
import { ScrollArea } from '@/components/ui/ScrollArea'
import {
  composeOrbat,
  diffRollups,
  type ComposerPlatform,
} from '@/lib/force-catalog/orbat-composer'
import { focusState, multiFocusState } from '@/lib/ui/band-focus'
import { pretty } from '@/components/force-catalog/ForceCatalogFilters'

interface OrbatComposerProps {
  platforms: ComposerPlatform[]
  nationLabel: string
}

const TIER_META = [
  { key: 'track', label: 'Track', hint: 'Machine track exchange', color: 'var(--wb-track)' },
  { key: 'data', label: 'Data', hint: 'Digital, not track quality', color: 'var(--wb-data)' },
  { key: 'voice', label: 'Voice', hint: 'Human relay only', color: '#4ADE80' },
  { key: 'none', label: 'No fit', hint: 'Nothing recorded', color: 'var(--store-ink-mute)' },
] as const

// Band hues are data colour. Orange is reserved for the IR family.
const BAND_TONE: Record<string, string> = {
  HF: '#f472b6', VHF: '#a3e635', UHF: '#facc15', L: '#4ade80',
  S: '#22d3ee', C: '#60a5fa', X: '#a78bfa', Ku: '#e879f9', Ka: '#f87171',
  IR: '#fb7185', EO: '#94a3b8', VIS: '#cbd5e1', UV: '#c084fc',
}

function bandTone(b: string): string {
  return BAND_TONE[b] ?? '#94a3b8'
}

function BandBars({
  rows,
  max,
  band,
  setBand,
  singlePoint = [],
}: {
  rows: { band: string; platformCount: number; kinds: string[] }[]
  max: number
  band: string | null
  setBand: (b: string | null) => void
  singlePoint?: string[]
}) {
  return (
    <div className="space-y-1">
      {rows.map((b) => {
        const spof = singlePoint.includes(b.band)
        return (
          <div
            key={b.band}
            className="band-row -mx-1.5 flex min-h-7 cursor-default items-center gap-3 rounded-md px-1.5"
            title={b.kinds.join(', ')}
            data-band-state={focusState(b.band, band)}
            onMouseEnter={() => setBand(b.band)}
            onMouseLeave={() => setBand(null)}
            onFocus={() => setBand(b.band)}
            onBlur={() => setBand(null)}
            tabIndex={0}
          >
            <span className="w-9 shrink-0 font-mono text-[12px]" style={{ color: bandTone(b.band) }}>{b.band}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full"
                style={{ width: `${(b.platformCount / max) * 100}%`, background: bandTone(b.band), opacity: 0.85 }}
              />
            </div>
            <span className="w-7 text-right font-mono text-[12px] tabular-nums text-[var(--store-ink)]">{b.platformCount}</span>
            <span className="w-4 shrink-0">
              {spof ? (
                <AlertTriangle className="h-3.5 w-3.5 text-[#FBBF24]" aria-label="Only one platform holds this band" />
              ) : null}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function OrbatComposer({ platforms, nationLabel }: OrbatComposerProps) {
  const allIds = useMemo(() => new Set(platforms.map((p) => p.id)), [platforms])
  const [selected, setSelected] = useState<Set<string>>(allIds)
  /** Signature move: pointing at a band lifts everything on it. */
  const [band, setBand] = useState<string | null>(null)

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
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      {/* Package composition */}
      <div className="store-panel flex min-h-0 flex-col overflow-hidden rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--store-line)] px-4 py-3">
          <div className="min-w-0">
            <p className="wb-pane-title">{nationLabel} ORBAT</p>
            <p className="text-[12px] store-text-muted">
              <span className="font-mono tabular-nums text-[var(--store-ink)]">{current.selectedCount}</span> of{' '}
              <span className="font-mono tabular-nums">{current.totalCount}</span> in the package
            </p>
          </div>
          <div className="flex gap-1.5">
            <button type="button" onClick={() => setSelected(new Set(allIds))} className="btn-e sm">
              Select all
            </button>
            <button type="button" onClick={() => setSelected(new Set())} className="btn-e sm">
              Clear
            </button>
          </div>
        </div>

        <ScrollArea frame={false} maxHeight="min(680px, calc(100vh - 200px))">
          {byDomain.map(([domain, list]) => (
            <div key={domain}>
              <p className="sticky top-0 z-[2] flex items-baseline gap-2 border-b border-[var(--store-line)] bg-[rgba(12,12,15,0.86)] px-4 py-2 text-[12px] font-medium capitalize text-[var(--store-ink)] backdrop-blur-xl">
                {domain}
                <span className="font-mono text-[11px] font-normal tabular-nums store-text-muted">
                  {list.filter((p) => selected.has(p.id)).length}/{list.length}
                </span>
              </p>
              <ul className="px-2 py-1.5">
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
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => toggle(p.id)}
                        aria-pressed={on}
                        data-band-state={on ? multiFocusState(bands, band) : 'neutral'}
                        className={clsx(
                          'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-[background-color,opacity] duration-150 hover:bg-white/[0.04]',
                          !on && 'opacity-50 hover:opacity-80',
                        )}
                      >
                        <span
                          className={clsx(
                            'flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border',
                            on ? 'border-[var(--wb-blue)] bg-[var(--wb-blue)] text-white' : 'border-[var(--store-ink-mute)]',
                          )}
                          aria-hidden
                        >
                          {on ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-[var(--store-ink)]" title={p.label}>
                            {p.label}
                          </span>
                          <span className="block truncate text-[11.5px] store-text-muted">
                            {pretty(p.role)} · {p.comms.length} comms · {p.sensors.length} sensors
                          </span>
                        </span>
                        <span className="flex shrink-0 gap-2 font-mono text-[11px]">
                          {bands.slice(0, 4).map((b) => (
                            <span
                              key={b}
                              style={{ color: bandTone(b) }}
                              title={`${b} band`}
                              onMouseEnter={() => setBand(b)}
                              onMouseLeave={() => setBand(null)}
                            >
                              {b}
                            </span>
                          ))}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </ScrollArea>
      </div>

      {/* Live rollup */}
      <div className="space-y-4">
        <div className="store-panel rounded-2xl p-5">
          <p className="wb-pane-title">Connectivity</p>
          <p className="mt-2 store-display text-[32px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-[var(--store-ink)]">
            {current.selectedCount}
            <span className="ml-1 text-[15px] font-medium store-text-muted">/ {current.totalCount}</span>
          </p>
          <div className="mt-4 grid grid-cols-4 border-t border-[var(--store-line)] pt-3">
            {TIER_META.map((t, i) => (
              <div key={t.key} className={clsx('px-2', i > 0 && 'border-l border-[var(--store-line)]')} title={t.hint}>
                <p className="font-mono text-[18px] font-semibold tabular-nums" style={{ color: t.color }}>
                  {current.tiers[t.key]}
                </p>
                <p className="text-[12px] store-text-muted">{t.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="store-panel rounded-2xl p-5">
          <p className="wb-pane-title mb-3">Platforms per comms band</p>
          {current.commsBands.length === 0 ? (
            <p className="text-[12px] store-text-muted">No comms fit in the current package.</p>
          ) : (
            <BandBars
              rows={current.commsBands}
              max={maxBandCount}
              band={band}
              setBand={setBand}
              singlePoint={current.singlePointBands}
            />
          )}
          {current.singlePointBands.length > 0 && (
            <p className="mt-3 text-[12px] leading-snug text-[#FCD34D]">
              <span className="font-mono">{current.singlePointBands.join(', ')}</span> held by a single platform. Losing it
              removes the band.
            </p>
          )}
        </div>

        <div className="store-panel rounded-2xl p-5">
          <p className="wb-pane-title mb-3">Sensor bands covered</p>
          {current.sensorBands.length === 0 ? (
            <p className="text-[12px] store-text-muted">No sensor fit recorded in the current package.</p>
          ) : (
            <BandBars rows={current.sensorBands} max={maxSensorCount} band={band} setBand={setBand} />
          )}
        </div>

        {(delta.bandsLost.length > 0 || delta.trackDelta !== 0) && (
          <div className="store-panel rounded-2xl p-5">
            <p className="wb-pane-title mb-2">Versus full ORBAT</p>
            {delta.bandsLost.length > 0 && (
              <p className="text-[13px] leading-snug store-text-body">
                Lost bands: <span className="font-mono text-[var(--wb-red)]">{delta.bandsLost.join(', ')}</span>
              </p>
            )}
            {delta.trackDelta !== 0 && (
              <p className="mt-1 text-[13px] store-text-body">
                Track-capable platforms{' '}
                <span className={clsx('font-mono tabular-nums', delta.trackDelta < 0 ? 'text-[var(--wb-red)]' : 'text-[var(--wb-blue)]')}>
                  {delta.trackDelta > 0 ? '+' : ''}
                  {delta.trackDelta}
                </span>
              </p>
            )}
          </div>
        )}

        {(current.noCommsIds.length > 0 || current.noSensorIds.length > 0) && (
          <p className="text-[12px] leading-relaxed store-text-muted">
            <span className="font-mono tabular-nums">{current.noCommsIds.length}</span> selected with no comms fit ·{' '}
            <span className="font-mono tabular-nums">{current.noSensorIds.length}</span> with no sensor fit. Absent data,
            not absent capability.
          </p>
        )}
      </div>
    </div>
  )
}
