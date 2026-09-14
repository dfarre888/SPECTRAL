'use client'

/**
 * Spectrum ribbon: two lanes over the workbench.
 *   comms   — log-scale MHz, one bar per net, height = share of the active roster on it
 *   sensing — ordered categorical bands (RF → IR → optical), same fill rule
 * Hover a band to focus matching coverage rows; click to filter.
 */
import { useMemo } from 'react'
import { spectrumForNet } from '@/lib/coalition/comms-spectrum'
import { BAND_KIND, SENSING_BANDS, type BandFill, type SensorBand } from '@/lib/force-catalog/spectrum-bands'
import type { ConnTier } from '@/lib/coalition/datalink-matrix'

export interface NetFill {
  key: string
  label: string
  active: number
  total: number
  tier: ConnTier
}
const TIER_COLOR: Record<ConnTier, string> = { track: 'var(--wb-track)', data: 'var(--wb-data)', voice: 'var(--wb-voice)', none: 'var(--wb-voice)' }
const TIER_GLOW: Record<ConnTier, string> = { track: 'wb-glow-blue', data: 'wb-glow-cyan', voice: '', none: '' }
const KIND_COLOR = { rf: 'var(--wb-rf)', ir: 'var(--wb-ir)', optical: 'var(--wb-optical)' } as const
const KIND_GLOW = { rf: 'wb-glow-blue', ir: 'wb-glow-ir', optical: 'wb-glow-optical' } as const

const LO = 2
const HI = 40_000
const W = 1000
const H = 44
// Rounded so server and client agree to the digit (float drift caused a hydration warning).
const xOf = (mhz: number) => Math.round((Math.log10(Math.max(LO, Math.min(HI, mhz)) / LO) / Math.log10(HI / LO)) * W * 100) / 100
const TICKS: [number, string][] = [
  [3, 'HF'], [30, 'VHF'], [300, 'UHF'], [1000, 'L'], [2000, 'S'], [4000, 'C'], [8000, 'X'], [12_000, 'Ku'], [27_000, 'Ka'],
]

function state(band: string | null, focus: string | null): 'focused' | 'dimmed' | 'neutral' {
  if (!focus) return 'neutral'
  return band === focus ? 'focused' : 'dimmed'
}

export function SpectrumRibbon({
  nets,
  sensing,
  focusBand,
  activeBands,
  onHoverBand,
  onToggleBand,
}: {
  nets: NetFill[]
  sensing: BandFill[]
  focusBand: string | null
  activeBands: Set<string>
  onHoverBand: (b: string | null) => void
  onToggleBand: (b: string) => void
}) {
  const bars = useMemo(() => {
    const out: { key: string; label: string; x: number; w: number; h: number; band: string; tier: ConnTier }[] = []
    for (const n of nets) {
      const spec = spectrumForNet(n.key.replace(/\/.*$/, ''))
      if (!spec || !n.total) continue
      for (const sp of spec.spans) {
        const x = xOf(sp.loMhz)
        const w = Math.max(3, xOf(sp.hiMhz) - x)
        const h = n.active ? Math.round(Math.max(2, (H - 6) * (n.active / n.total)) * 100) / 100 : 0
        const tick = TICKS.filter((t) => t[0] <= sp.hiMhz).pop()
        out.push({ key: `${n.key}:${sp.loMhz}`, label: n.label, x, w, h, band: tick?.[1] ?? 'HF', tier: n.tier })
      }
    }
    return out
  }, [nets])

  return (
    <div className="store-panel rounded-2xl px-4 py-3 space-y-2" aria-label="Spectrum ribbon">
      <div className="flex items-baseline justify-between">
        <span className="wb-pane-title">Comms</span>
        <span className="text-[11px] font-mono store-text-muted flex items-center gap-3">
          <span className="inline-flex items-center gap-1"><i className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--wb-track)' }} />track</span>
          <span className="inline-flex items-center gap-1"><i className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--wb-data)' }} />data</span>
          <span className="inline-flex items-center gap-1"><i className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--wb-voice)' }} />voice</span>
          <span>2 MHz → 40 GHz, log</span>
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H + 16}`} className="w-full h-[60px] block" role="img" aria-label="Comms nets by frequency">
        {TICKS.map(([mhz, label]) => (
          <g key={label} data-band-state={state(label, focusBand)} onMouseEnter={() => onHoverBand(label)} onMouseLeave={() => onHoverBand(null)} onClick={() => onToggleBand(label)} className="cursor-pointer">
            <line x1={xOf(mhz)} x2={xOf(mhz)} y1={0} y2={H} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
            <text x={xOf(mhz) + 4} y={H + 12} fontSize={11} fontFamily="JetBrains Mono, monospace" fill={activeBands.has(label) ? 'var(--store-ink)' : 'var(--store-ink-mute)'}>{label}</text>
            <rect x={xOf(mhz)} y={0} width={xOf(TICKS[TICKS.indexOf(TICKS.find((t) => t[1] === label)!) + 1]?.[0] ?? HI) - xOf(mhz)} height={H} fill="transparent" />
          </g>
        ))}
        {bars.map((b) => (
          <g key={b.key} data-band-state={state(b.band, focusBand)} className={`rb-bar ${b.h > 0 ? TIER_GLOW[b.tier] : ''}`}>
            <rect x={b.x} y={2} width={b.w} height={H - 4} fill="var(--store-surface-2)" rx={3} />
            <rect x={b.x} y={H - 2 - b.h} width={b.w} height={b.h} fill={TIER_COLOR[b.tier]} opacity={0.9} rx={3} style={{ transition: 'y 250ms cubic-bezier(0.22,1,0.36,1), height 250ms cubic-bezier(0.22,1,0.36,1)' }}>
              <title>{`${b.label} · ${b.tier}`}</title>
            </rect>
          </g>
        ))}
      </svg>

      <div className="flex items-baseline justify-between pt-1">
        <span className="wb-pane-title">Sensing</span>
        <span className="text-[11px] font-mono store-text-muted flex items-center gap-3">
          <span className="inline-flex items-center gap-1"><i className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--wb-rf)' }} />RF</span>
          <span className="inline-flex items-center gap-1"><i className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--wb-ir)' }} />IR</span>
          <span className="inline-flex items-center gap-1"><i className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--wb-optical)' }} />optical</span>
        </span>
      </div>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${SENSING_BANDS.length}, minmax(0, 1fr))` }} role="group" aria-label="Sensing bands">
        {sensing.map((f) => {
          const pct = f.total ? f.active / f.total : 0
          const has = f.total > 0
          const kind = BAND_KIND[f.band]
          return (
            <button
              key={f.band}
              type="button"
              data-band-state={state(f.band, focusBand)}
              aria-pressed={activeBands.has(f.band)}
              onMouseEnter={() => onHoverBand(f.band)}
              onMouseLeave={() => onHoverBand(null)}
              onClick={() => onToggleBand(f.band)}
              title={has ? `${f.band}: ${f.active} of ${f.total} platforms` : `${f.band}: no platform in scope lists it`}
              className={`group flex flex-col items-stretch gap-1.5 rounded-md px-1 pt-1 pb-1 min-h-10 transition-colors duration-150 ${activeBands.has(f.band) ? 'bg-[var(--store-surface-2)] ring-1 ring-[var(--store-line-strong)]' : 'hover:bg-[var(--store-surface-2)]'}`}
            >
              <span className="relative block h-7 rounded-full mx-auto w-1.5" style={{ background: has ? 'var(--store-surface-3)' : 'transparent', outline: has ? 'none' : '1px dashed var(--store-line)' }}>
                <span
                  className={`absolute inset-x-0 bottom-0 rounded-full ${pct > 0 ? KIND_GLOW[kind] : ''}`}
                  style={{ height: `${Math.max(pct > 0 ? 12 : 0, pct * 100)}%`, background: KIND_COLOR[kind], transition: 'height 250ms cubic-bezier(0.22,1,0.36,1)' }}
                />
              </span>
              <span className={`text-[11px] font-mono tabular-nums text-center ${activeBands.has(f.band) ? 'text-[var(--store-ink)]' : has ? 'store-text-body' : 'store-text-muted'}`}>{f.band}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export type { SensorBand }
