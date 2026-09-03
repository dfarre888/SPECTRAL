'use client'

import { useMemo, useState } from 'react'
import { clsx } from 'clsx'
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
  track: 'var(--store-accent)',
  data: '#22d3ee',
  voice: '#4ade80',
  none: '#71717a',
}

const TIER_LABEL: Record<ConnTier, string> = {
  track: 'Track',
  data: 'Data',
  voice: 'Voice',
  none: 'None',
}

// Log axis over the military comms span: HF through Ku.
const F_MIN = 2
const F_MAX = 20_000
const PAD_L = 8
const PAD_R = 4

function xPct(mhz: number): number {
  const clamped = Math.min(Math.max(mhz, F_MIN), F_MAX)
  const t = (Math.log10(clamped) - Math.log10(F_MIN)) / (Math.log10(F_MAX) - Math.log10(F_MIN))
  return PAD_L + t * (100 - PAD_L - PAD_R)
}

const AXIS_TICKS = [3, 30, 300, 1_000, 3_000, 10_000, 20_000]

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

  return (
    <div className="store-panel rounded-2xl p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--store-accent)]">
            Comms linkage · {side === 'red' ? 'Red' : 'Blue'} force
          </p>
          <h3 className="store-display text-sm font-semibold text-white mt-0.5">
            {title ?? 'Coalition connectivity'}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setDenied((v) => !v)}
          className={clsx(
            'px-2.5 py-1 rounded-lg text-[10px] font-mono border transition-colors',
            denied
              ? 'border-red-500/50 text-red-300 bg-red-500/10'
              : 'store-panel-inner store-text-body hover:border-[var(--store-accent-border)]',
          )}
        >
          {denied ? '⚠ GNSS DENIED' : 'GNSS nominal'}
        </button>
      </div>

      {/* Tier summary — reach is the honest headline, cohesion alongside it. */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {([result.track, result.data, result.voice] as const).map((t) => (
          <div key={t.tier} className="store-panel-inner rounded-xl p-2.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: TIER_COLOR[t.tier] }} />
              <span className="text-[10px] font-mono uppercase store-text-muted">{TIER_LABEL[t.tier]}</span>
            </div>
            <p className="text-lg font-bold text-white font-mono tabular-nums mt-1">{t.reachPct}%</p>
            <p className="text-[10px] store-text-muted font-mono">
              reach · {t.coveragePct}% fitted · {t.islands.length} net{t.islands.length === 1 ? '' : 's'}
            </p>
          </div>
        ))}
      </div>

      {/* Spectral placement — every net on the frequency axis. */}
      <div className="relative mb-1" style={{ height: rows.length * 26 + 26 }}>
        {/* Contention shading behind the bars. */}
        {contention.map((c, i) => (
          <div
            key={`c${i}`}
            title={`${c.netKeys.length} nets share ${formatMhz(c.loMhz)}–${formatMhz(c.hiMhz)}`}
            className="absolute top-0 bottom-6 pointer-events-none"
            style={{
              left: `${xPct(c.loMhz)}%`,
              width: `${Math.max(0.4, xPct(c.hiMhz) - xPct(c.loMhz))}%`,
              background:
                'repeating-linear-gradient(45deg, rgba(248,113,113,0.16) 0 4px, transparent 4px 8px)',
              borderLeft: '1px solid rgba(248,113,113,0.35)',
              borderRight: '1px solid rgba(248,113,113,0.35)',
            }}
          />
        ))}

        {rows.map(({ net, spec }, i) => {
          const isSel = selectedNet === net.key
          const island = islandOf.get(net.key) ?? 0
          return (
            <div key={net.key} className="absolute left-0 right-0" style={{ top: i * 26, height: 24 }}>
              <span className="absolute left-0 top-1 text-[9px] font-mono store-text-muted truncate" style={{ width: `${PAD_L}%` }}>
                {island === 0 ? '' : `#${island + 1}`}
              </span>
              {spec!.spans.map((sp, j) => (
                <button
                  key={j}
                  type="button"
                  onClick={() => setSelectedNet(isSel ? null : net.key)}
                  title={`${spec!.label} · ${formatMhz(sp.loMhz)}–${formatMhz(sp.hiMhz)} · ${net.memberIds.length} platforms\n${spec!.note}`}
                  className={clsx(
                    'absolute top-0 h-5 rounded transition-all',
                    isSel ? 'ring-2 ring-white' : 'hover:brightness-125',
                  )}
                  style={{
                    left: `${xPct(sp.loMhz)}%`,
                    width: `${Math.max(1.2, xPct(sp.hiMhz) - xPct(sp.loMhz))}%`,
                    background: TIER_COLOR[net.tier],
                    opacity: isSel ? 1 : 0.35 + Math.min(0.5, net.memberIds.length / 120),
                  }}
                />
              ))}
              <span className="absolute top-0.5 text-[10px] font-mono text-white pointer-events-none"
                style={{ left: `${xPct(spec!.spans[0].loMhz) + 0.6}%` }}>
                {spec!.label}
                <span className="store-text-muted"> · {net.memberIds.length}</span>
              </span>
            </div>
          )
        })}

        {/* Frequency axis */}
        <div className="absolute left-0 right-0 bottom-0 h-5 border-t border-[var(--store-line)]">
          {AXIS_TICKS.map((t) => (
            <span key={t} className="absolute top-0.5 text-[9px] font-mono store-text-muted -translate-x-1/2"
              style={{ left: `${xPct(t)}%` }}>
              {formatMhz(t)}
            </span>
          ))}
        </div>
      </div>

      <p className="text-[10px] store-text-muted font-mono mb-3">
        Hatched stretches carry more than one net — shared spectrum is where friendly links contend,
        and where one jammer reaches several at once.
      </p>

      {/* Selected net membership */}
      {selected && (
        <div className="store-panel-inner rounded-xl p-3">
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-xs font-semibold text-white">{spectrumForNet(selected.key)?.label}</p>
            <p className="text-[10px] font-mono store-text-muted">{selected.memberIds.length} platforms</p>
          </div>
          <p className="text-[10px] store-text-body mb-2">{spectrumForNet(selected.key)?.note}</p>
          <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
            {selected.memberIds.slice(0, 80).map((id) => (
              <span key={id} className="px-1.5 py-0.5 rounded text-[9px] font-mono store-panel border border-[var(--store-line)] store-text-body">
                {byId.get(id)?.label ?? id}
                <span className="store-text-muted"> {byId.get(id)?.nationCode}</span>
              </span>
            ))}
            {selected.memberIds.length > 80 && (
              <span className="text-[9px] font-mono store-text-muted self-center">
                +{selected.memberIds.length - 80} more
              </span>
            )}
          </div>
        </div>
      )}

      {denied && (
        <p className="mt-3 text-[10px] font-mono text-red-300">
          {delta.lostTrackIds.length} platforms lose machine tracks · track reach{' '}
          {delta.nominal.track.reachPct}% → {delta.denied.track.reachPct}%. Pessimistic bound:
          terminals hold net time for a period after GNSS loss.
        </p>
      )}
    </div>
  )
}
