'use client'

/**
 * Spectrum dial. One rule across the page: comms nets rise above it on a log
 * MHz scale; sensing bands hang below it. Hover sweeps a cursor and focuses the
 * band; click filters. Replaces the boxed ribbon.
 */
import { useMemo, useState, type MouseEvent } from 'react'
import type { ConnTier } from '@/lib/coalition/datalink-matrix'
import { findContention, spectrumForNet } from '@/lib/coalition/comms-spectrum'
import { BAND_KIND, type BandFill } from '@/lib/force-catalog/spectrum-bands'

export interface NetFill { key: string; label: string; active: number; total: number; tier: ConnTier }

const W = 1200
const BASE = 72
const UP = 50
const DOWN = 34
const LO = 2
const HI = 40_000
const RF_END = 860
const xOf = (mhz: number) => Math.round((Math.log10(Math.max(LO, Math.min(HI, mhz)) / LO) / Math.log10(HI / LO)) * RF_END * 100) / 100
const RF_TICKS: [number, string][] = [[3, 'HF'], [30, 'VHF'], [300, 'UHF'], [1000, 'L'], [2000, 'S'], [4000, 'C'], [8000, 'X'], [12_000, 'Ku'], [27_000, 'Ka']]
const NON_RF = ['LWIR', 'MWIR', 'SWIR', 'NIR', 'VIS', 'UV', 'laser']
const TIER_COLOR: Record<ConnTier, string> = { track: 'var(--wb-track)', data: 'var(--wb-data)', voice: 'var(--wb-voice)', none: 'var(--wb-voice)' }
const KIND_COLOR = { rf: 'var(--wb-rf)', ir: 'var(--wb-ir)', optical: 'var(--wb-optical)' } as const

function bandX(band: string): number {
  const t = RF_TICKS.find((x) => x[1] === band)
  if (t) return xOf(t[0])
  const i = NON_RF.indexOf(band)
  return i < 0 ? 0 : RF_END + 40 + i * ((W - RF_END - 40) / NON_RF.length)
}
function bandW(band: string): number {
  const i = RF_TICKS.findIndex((x) => x[1] === band)
  if (i >= 0) return (i + 1 < RF_TICKS.length ? xOf(RF_TICKS[i + 1][0]) : RF_END) - xOf(RF_TICKS[i][0])
  return (W - RF_END - 40) / NON_RF.length
}
function bandAt(x: number): string | null {
  if (x < RF_END) {
    let hit: string | null = null
    for (const [mhz, label] of RF_TICKS) if (xOf(mhz) <= x) hit = label
    return hit
  }
  const i = Math.floor((x - RF_END - 40) / ((W - RF_END - 40) / NON_RF.length))
  return NON_RF[i] ?? null
}

export function SpectrumDial({
  nets, sensing, focusBand, activeBands, onHoverBand, onToggleBand,
}: {
  nets: NetFill[]
  sensing: BandFill[]
  focusBand: string | null
  activeBands: Set<string>
  onHoverBand: (b: string | null) => void
  onToggleBand: (b: string) => void
}) {
  const [cursor, setCursor] = useState<number | null>(null)
  const contention = useMemo(
    () => findContention(nets.filter((n) => n.active > 0).map((n) => n.key.replace(/\/.*$/, ''))),
    [nets],
  )
  const bars = useMemo(() => {
    const out: { key: string; label: string; x: number; w: number; h: number; tier: ConnTier }[] = []
    for (const n of nets) {
      const spec = spectrumForNet(n.key.replace(/\/.*$/, ''))
      if (!spec || !n.total) continue
      for (const sp of spec.spans) {
        const x = xOf(sp.loMhz)
        const w = Math.max(4, xOf(sp.hiMhz) - x)
        const h = n.active ? Math.round(Math.max(3, UP * (n.active / n.total)) * 100) / 100 : 0
        out.push({ key: `${n.key}:${sp.loMhz}`, label: n.label, x, w, h, tier: n.tier })
      }
    }
    return out.sort((a, b) => b.w - a.w)
  }, [nets])

  const move = (e: MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * W
    setCursor(x)
    onHoverBand(bandAt(x))
  }
  const leave = () => { setCursor(null); onHoverBand(null) }
  const click = (e: MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const b = bandAt(((e.clientX - r.left) / r.width) * W)
    if (b) onToggleBand(b)
  }
  const dim = (band: string) => (focusBand && focusBand !== band ? 0.35 : 1)

  return (
    <div className="py-5 border-b fc-hair">
      <div className="flex items-baseline justify-between mb-3">
        <span className="wb-pane-title">Spectrum</span>
        <span className="text-[11px] font-mono store-text-muted flex items-center gap-3.5">
          {([['track', 'var(--wb-track)'], ['data', 'var(--wb-data)'], ['voice', 'var(--wb-voice)']] as const).map(([l, c]) => (
            <span key={l} className="inline-flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />{l}</span>
          ))}
          <span className="inline-flex items-center gap-1.5" title="Stretches where more than one active net shares spectrum: friendly interference and single-jammer reach"><i className="h-1.5 w-3 rounded-sm" style={{ background: 'repeating-linear-gradient(45deg, rgba(251,191,36,.7) 0 2px, transparent 2px 4px)' }} />contention</span>
          <span className="w-px h-3 bg-[var(--store-line-strong)]" />
          {([['RF', 'var(--wb-rf)'], ['IR', 'var(--wb-ir)'], ['optical', 'var(--wb-optical)']] as const).map(([l, c]) => (
            <span key={l} className="inline-flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />{l}</span>
          ))}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} 132`} className="w-full h-auto block cursor-crosshair select-none" onMouseMove={move} onMouseLeave={leave} onClick={click} role="img" aria-label="Spectrum dial: comms above the rule, sensing below">
        <defs>
          <filter id="fc-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3" /></filter>
          <pattern id="fc-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="1.5" height="4" fill="rgba(251,191,36,0.55)" /></pattern>
        </defs>
        <text x={0} y={12} fontSize={11} fontFamily="JetBrains Mono, monospace" fill="var(--store-ink-mute)">comms ↑</text>
        <text x={W} y={12} fontSize={11} fontFamily="JetBrains Mono, monospace" fill="var(--store-ink-mute)" textAnchor="end">sensing ↓</text>
        {/* active band washes */}
        {[...activeBands].map((b) => (
          <rect key={b} x={bandX(b)} y={16} width={bandW(b)} height={BASE + DOWN - 10} fill="rgba(255,255,255,0.05)" rx={4} />
        ))}
        {/* contention: more than one active net on the same stretch */}
        {contention.map((c) => {
          const x = xOf(c.loMhz)
          const w = Math.max(3, xOf(c.hiMhz) - x)
          return (
            <g key={`${c.loMhz}-${c.hiMhz}`}>
              <rect x={x} y={BASE - UP - 2} width={w} height={UP + 2} fill="url(#fc-hatch)" opacity={0.9} />
              <title>{`${c.netKeys.length} nets share ${c.loMhz}–${c.hiMhz} MHz: ${c.netKeys.map((k) => k.replace(/^(std|voice|data):/, '')).join(', ')}`}</title>
            </g>
          )
        })}
        {/* comms */}
        {bars.map((b) => (
          <g key={b.key} opacity={dim(bandAt(b.x + 1) ?? '')} style={{ transition: 'opacity 150ms ease-out' }}>
            <rect x={b.x} y={BASE - UP} width={b.w} height={UP} fill="rgba(255,255,255,0.05)" rx={3} />
            {b.h > 0 && b.tier === 'track' ? <rect x={b.x} y={BASE - b.h} width={b.w} height={b.h} fill={TIER_COLOR[b.tier]} opacity={0.6} rx={3} filter="url(#fc-glow)" /> : null}
            <rect x={b.x} y={BASE - b.h} width={b.w} height={b.h} fill={TIER_COLOR[b.tier]} opacity={0.92} rx={3} style={{ transition: 'y 250ms cubic-bezier(.22,1,.36,1), height 250ms cubic-bezier(.22,1,.36,1)' }}>
              <title>{`${b.label} · ${b.tier}`}</title>
            </rect>
          </g>
        ))}
        {/* rule */}
        <line x1={0} x2={W} y1={BASE} y2={BASE} stroke="rgba(255,255,255,0.16)" />
        {/* sensing pins */}
        {sensing.map((f) => {
          const kind = BAND_KIND[f.band]
          const pct = f.total ? f.active / f.total : 0
          const h = f.total ? Math.max(4, DOWN * pct) : 0
          const cx = bandX(f.band) + Math.min(bandW(f.band) / 2, 14)
          return (
            <g key={f.band} opacity={dim(f.band)} style={{ transition: 'opacity 150ms ease-out' }}>
              {!f.total ? <rect x={cx - 3} y={BASE + 2} width={6} height={DOWN} rx={3} fill="none" stroke="rgba(255,255,255,0.12)" strokeDasharray="2 2" /> : null}
              {h > 0 ? <rect x={cx - 3} y={BASE + 2} width={6} height={h} rx={3} fill={KIND_COLOR[kind]} opacity={0.55} filter="url(#fc-glow)" /> : null}
              {h > 0 ? <rect x={cx - 3} y={BASE + 2} width={6} height={h} rx={3} fill={KIND_COLOR[kind]} style={{ transition: 'height 250ms cubic-bezier(.22,1,.36,1)' }}><title>{`${f.band}: ${f.active} of ${f.total}`}</title></rect> : null}
            </g>
          )
        })}
        {/* labels */}
        {[...RF_TICKS.map((t) => t[1]), ...NON_RF].map((b) => (
          <text key={b} x={bandX(b) + 2} y={128} fontSize={11} fontFamily="JetBrains Mono, monospace" fill={activeBands.has(b) || focusBand === b ? 'var(--store-ink)' : 'var(--store-ink-mute)'}>{b}</text>
        ))}
        {/* cursor */}
        {cursor != null ? <line x1={cursor} x2={cursor} y1={16} y2={BASE + DOWN + 6} stroke="rgba(255,255,255,0.35)" strokeDasharray="3 3" /> : null}
      </svg>
    </div>
  )
}
