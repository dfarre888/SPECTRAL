'use client'

import { useMemo, useState } from 'react'
import { clsx } from 'clsx'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { analyseInterop, interopUnderDenial, type InteropPlatform } from '@/lib/coalition/interop'
import { findContention, formatMhz, spectrumForNet } from '@/lib/coalition/comms-spectrum'
import type { ConnTier } from '@/lib/coalition/datalink-matrix'

interface CommsLinkageViewProps {
  platforms: InteropPlatform[]
  /** Shown above the chart, e.g. "Indo-Pacific Blue". */
  title?: string
  side?: 'blue' | 'red'
}

const TIER_COLOR: Record<ConnTier, string> = {
  track: 'var(--wb-track)',
  data: 'var(--wb-data)',
  voice: '#4ADE80',
  none: 'var(--store-ink-mute)',
}

const TIER_LABEL: Record<ConnTier, string> = {
  track: 'Track',
  data: 'Data',
  voice: 'Voice',
  none: 'None',
}

const TIER_HINT: Record<ConnTier, string> = {
  track: 'Machine-to-machine track exchange',
  data: 'Digital data, not track quality',
  voice: 'Human relay only',
  none: 'No bearer recorded',
}

// Log axis over the military comms span: HF through Ku.
const F_MIN = 2
const F_MAX = 20_000
const PAD = 1.5
const ROW_H = 40

function xPct(mhz: number): number {
  const clamped = Math.min(Math.max(mhz, F_MIN), F_MAX)
  const t = (Math.log10(clamped) - Math.log10(F_MIN)) / (Math.log10(F_MAX) - Math.log10(F_MIN))
  return PAD + t * (100 - PAD * 2)
}

const AXIS_TICKS = [3, 30, 300, 1_000, 3_000, 10_000]

export function CommsLinkageView({ platforms, title, side = 'blue' }: CommsLinkageViewProps) {
  const [selectedNet, setSelectedNet] = useState<string | null>(null)
  const [denied, setDenied] = useState(false)

  const { result, delta } = useMemo(() => {
    const d = interopUnderDenial(platforms)
    return { result: denied ? d.denied : d.nominal, delta: d }
  }, [platforms, denied])

  const nets = useMemo(
    () => [result.track, result.data, result.voice].flatMap((t) => t.nets),
    [result],
  )

  const contention = useMemo(() => findContention(nets.map((n) => n.key)), [nets])

  const islandOf = useMemo(() => {
    const m = new Map<string, number>()
    for (const tier of [result.track, result.data, result.voice]) {
      tier.islands.forEach((isl, i) => {
        for (const k of isl.netKeys) m.set(k, i)
      })
    }
    return m
  }, [result])

  const selected = selectedNet ? nets.find((n) => n.key === selectedNet) ?? null : null
  const byId = useMemo(() => new Map(platforms.map((p) => [p.id, p])), [platforms])

  const rows = nets
    .map((n) => ({ net: n, spec: spectrumForNet(n.key) }))
    .filter((r) => r.spec)
    .sort((a, b) => b.net.memberIds.length - a.net.memberIds.length)

  const plotH = rows.length * ROW_H

  return (
    <div className="store-panel overflow-hidden rounded-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--store-line)] px-5 py-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[12px] store-text-muted">
            <i
              className="h-2 w-2 rounded-full"
              style={{ background: side === 'red' ? 'var(--wb-red)' : 'var(--wb-blue)' }}
              aria-hidden
            />
            Comms linkage · {side === 'red' ? 'Red' : 'Blue'} force
          </p>
          <h2 className="mt-0.5 store-display text-[18px] font-semibold tracking-[-0.01em] text-[var(--store-ink)]">
            {title ?? 'Coalition connectivity'}
          </h2>
        </div>
        <div className="seg sm" role="group" aria-label="GNSS condition">
          <button type="button" aria-pressed={!denied} onClick={() => setDenied(false)}>
            GNSS nominal
          </button>
          <button type="button" aria-pressed={denied} onClick={() => setDenied(true)}>
            GNSS denied
          </button>
        </div>
      </div>

      {/* Tier summary: reach is the honest headline, cohesion alongside it. */}
      <div className="grid grid-cols-1 border-b border-[var(--store-line)] sm:grid-cols-3">
        {([result.track, result.data, result.voice] as const).map((t, i) => (
          <div
            key={t.tier}
            className={clsx('px-5 py-4', i > 0 && 'border-t border-[var(--store-line)] sm:border-l sm:border-t-0')}
            title={TIER_HINT[t.tier]}
          >
            <p className="flex items-center gap-2 text-[12px] store-text-muted">
              <i className="h-2 w-2 rounded-full" style={{ background: TIER_COLOR[t.tier] }} aria-hidden />
              {TIER_LABEL[t.tier]} reach
            </p>
            <p
              className="mt-1.5 store-display text-[34px] font-semibold leading-none tracking-[-0.02em] tabular-nums"
              style={{ color: TIER_COLOR[t.tier] }}
            >
              {t.reachPct}
              <span className="ml-0.5 text-[16px] font-medium store-text-muted">%</span>
            </p>
            <p className="mt-2 text-[12px] store-text-muted">
              <span className="font-mono tabular-nums text-[var(--store-ink)]">{t.coveragePct}%</span> fitted ·{' '}
              <span className="font-mono tabular-nums text-[var(--store-ink)]">{t.islands.length}</span> net
              {t.islands.length === 1 ? '' : 's'}
            </p>
          </div>
        ))}
      </div>

      {/* Spectral placement: every net on the frequency axis. */}
      <div className="px-5 pb-4 pt-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <p className="wb-pane-title">Nets on the spectrum</p>
          <p className="text-[12px] store-text-muted">Click a net to list its members</p>
        </div>

        {rows.length === 0 ? (
          <p className="py-8 text-center text-[13px] store-text-muted">No nets with a known spectrum in this selection.</p>
        ) : (
          <div className="grid grid-cols-[minmax(150px,210px)_minmax(0,1fr)] gap-x-4">
            {/* Net labels */}
            <ul className="min-w-0">
              {rows.map(({ net, spec }) => {
                const isSel = selectedNet === net.key
                const island = islandOf.get(net.key) ?? 0
                return (
                  <li key={net.key} style={{ height: ROW_H }}>
                    <button
                      type="button"
                      onClick={() => setSelectedNet(isSel ? null : net.key)}
                      aria-pressed={isSel}
                      className={clsx(
                        'flex h-full w-full min-w-0 items-center gap-2.5 rounded-lg px-2 text-left transition-colors duration-150',
                        isSel ? 'bg-[#0E2238]' : 'hover:bg-white/[0.04]',
                      )}
                    >
                      <i className="h-2 w-2 shrink-0 rounded-full" style={{ background: TIER_COLOR[net.tier] }} aria-hidden />
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] text-[var(--store-ink)]">{spec!.label}</span>
                        <span className="block truncate text-[11.5px] store-text-muted">
                          <span className="font-mono tabular-nums">{net.memberIds.length}</span> platforms
                          {island > 0 ? (
                            <span title="Not connected to the largest picture on this tier"> · island {island + 1}</span>
                          ) : null}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>

            {/* Plot */}
            <div className="min-w-0">
              <div className="relative" style={{ height: plotH }}>
                {/* Decade grid */}
                {AXIS_TICKS.map((t) => (
                  <div
                    key={`g${t}`}
                    className="absolute top-0 bottom-0 w-px bg-white/[0.05]"
                    style={{ left: `${xPct(t)}%` }}
                    aria-hidden
                  />
                ))}
                {/* Contention shading behind the bars. */}
                {contention.map((c, i) => (
                  <div
                    key={`c${i}`}
                    title={`${c.netKeys.length} nets share ${formatMhz(c.loMhz)} to ${formatMhz(c.hiMhz)}`}
                    className="absolute top-0 bottom-0"
                    style={{
                      left: `${xPct(c.loMhz)}%`,
                      width: `${Math.max(0.4, xPct(c.hiMhz) - xPct(c.loMhz))}%`,
                      background: 'repeating-linear-gradient(45deg, rgba(251,191,36,0.14) 0 4px, transparent 4px 8px)',
                      borderLeft: '1px solid rgba(251,191,36,0.35)',
                      borderRight: '1px solid rgba(251,191,36,0.35)',
                    }}
                  />
                ))}

                {rows.map(({ net, spec }, i) => {
                  const isSel = selectedNet === net.key
                  return (
                    <div key={net.key} className="absolute left-0 right-0" style={{ top: i * ROW_H, height: ROW_H }}>
                      {isSel ? <div className="absolute inset-0 rounded-lg bg-[rgba(41,151,255,0.07)]" aria-hidden /> : null}
                      {spec!.spans.map((sp, j) => (
                        <button
                          key={j}
                          type="button"
                          onClick={() => setSelectedNet(isSel ? null : net.key)}
                          aria-label={`${spec!.label}, ${formatMhz(sp.loMhz)} to ${formatMhz(sp.hiMhz)}, ${net.memberIds.length} platforms`}
                          title={`${spec!.label} · ${formatMhz(sp.loMhz)} to ${formatMhz(sp.hiMhz)} · ${net.memberIds.length} platforms\n${spec!.note}`}
                          className={clsx(
                            'absolute top-1/2 h-3.5 -translate-y-1/2 rounded-full transition-[filter,box-shadow] duration-150',
                            isSel ? 'ring-2 ring-white/80' : 'hover:brightness-125',
                          )}
                          style={{
                            left: `${xPct(sp.loMhz)}%`,
                            width: `max(8px, ${Math.max(0.6, xPct(sp.hiMhz) - xPct(sp.loMhz))}%)`,
                            background: TIER_COLOR[net.tier],
                            opacity: isSel ? 1 : 0.45 + Math.min(0.5, net.memberIds.length / 120),
                          }}
                        />
                      ))}
                    </div>
                  )
                })}
              </div>

              {/* Frequency axis */}
              <div className="relative h-7 border-t border-[var(--store-line)]">
                {AXIS_TICKS.map((t, i) => (
                  <span
                    key={t}
                    className={clsx(
                      'absolute top-1.5 whitespace-nowrap font-mono text-[11.5px] store-text-muted',
                      i === 0 ? '' : '-translate-x-1/2',
                    )}
                    style={{ left: `${xPct(t)}%` }}
                  >
                    {formatMhz(t)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        <p className="mt-3 flex items-center gap-2 text-[12px] store-text-muted">
          <i
            className="h-2.5 w-4 shrink-0 rounded-sm"
            style={{ background: 'repeating-linear-gradient(45deg, rgba(251,191,36,0.6) 0 2px, transparent 2px 4px)' }}
            aria-hidden
          />
          Hatched stretches carry more than one net. Shared spectrum is where friendly links contend, and where one
          jammer reaches several at once.
        </p>
      </div>

      {/* Selected net membership */}
      {selected && (
        <div className="border-t border-[var(--store-line)] px-5 py-4">
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <p className="text-[14px] font-medium text-[var(--store-ink)]">{spectrumForNet(selected.key)?.label}</p>
            <p className="text-[12px] store-text-muted">
              <span className="font-mono tabular-nums text-[var(--store-ink)]">{selected.memberIds.length}</span> platforms
            </p>
          </div>
          <p className="mb-3 max-w-[80ch] text-[13px] leading-relaxed store-text-body">{spectrumForNet(selected.key)?.note}</p>
          <ScrollArea frame={false} maxHeight="168px">
            <div className="flex flex-wrap gap-1.5 pr-1">
              {selected.memberIds.slice(0, 80).map((id) => (
                <span key={id} className="tag">
                  <span className="text-[var(--store-ink)]">{byId.get(id)?.label ?? id}</span>
                  <span className="font-mono store-text-muted">{byId.get(id)?.nationCode}</span>
                </span>
              ))}
              {selected.memberIds.length > 80 && (
                <span className="self-center text-[12px] store-text-muted">
                  +{selected.memberIds.length - 80} more
                </span>
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {denied && (
        <p className="border-t border-[var(--store-line)] px-5 py-3 text-[12px] leading-relaxed text-[#FF8A98]">
          <span className="font-mono tabular-nums">{delta.lostTrackIds.length}</span> platforms lose machine tracks · track
          reach <span className="font-mono tabular-nums">{delta.nominal.track.reachPct}%</span> to{' '}
          <span className="font-mono tabular-nums">{delta.denied.track.reachPct}%</span>. Pessimistic bound: terminals hold
          net time for a period after GNSS loss.
        </p>
      )}
    </div>
  )
}
