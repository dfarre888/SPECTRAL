'use client'

import { useMemo, useState } from 'react'
import { EwPropagationEngine } from '@/lib/ew/ewPropagationEngine'
import { SpectrumDeconflictionEngine } from '@/lib/ew/spectrumDeconflictionEngine'
import { BAND_REFERENCE, type GnssBand } from '@/lib/gnss/types'
import type { PlacedCuas, PlacedUas } from '@/lib/map/types'

interface EwFootprintAnalyserProps {
  placedUas: PlacedUas[]
  placedCuas: PlacedCuas[]
  emitterLon: number
  emitterLat: number
  onClose: () => void
}

const BAND_OPTIONS: GnssBand[] = [
  'GPS_L1',
  'GPS_L5',
  'GLONASS_L1',
  'control_link_2_4ghz',
  'control_link_900mhz',
  'control_link_5_8ghz',
]

const mono = { fontFamily: "'JetBrains Mono', monospace" } as const

export function EwFootprintAnalyser({
  placedUas,
  placedCuas,
  emitterLon,
  emitterLat,
  onClose,
}: EwFootprintAnalyserProps) {
  const [band, setBand] = useState<GnssBand>('GPS_L1')
  const [erpWatts, setErpWatts] = useState(100)

  const footprint = useMemo(() => {
    const engine = new EwPropagationEngine()
    return engine.computeFootprint({ band, erp_watts: erpWatts })
  }, [band, erpWatts])

  const deconflict = useMemo(() => {
    const engine = new SpectrumDeconflictionEngine()
    const emitters = [
      {
        id: 'cursor-ew',
        name: 'Analyser emitter',
        side: 'friendly' as const,
        lon: emitterLon,
        lat: emitterLat,
        band,
        erp_watts: erpWatts,
      },
      ...placedCuas
        .filter((c) => c.asset.defeat_methods.includes('RF_jamming'))
        .map((c) => ({
          id: c.instanceId,
          name: c.asset.name,
          side: 'friendly' as const,
          lon: c.lon,
          lat: c.lat,
          band: 'GPS_L1' as GnssBand,
          erp_watts: 80,
        })),
      ...placedUas.map((u) => ({
        id: u.instanceId,
        name: u.asset.name,
        side: 'adversary' as const,
        lon: u.lon,
        lat: u.lat,
        band: 'GPS_L1' as GnssBand,
        erp_watts: 5,
      })),
    ]
    return engine.analyseDeconfliction(emitters)
  }, [band, erpWatts, emitterLon, emitterLat, placedCuas, placedUas])

  const chart = footprint.curve
  const maxR = chart[chart.length - 1]?.range_m ?? 1
  const w = 280
  const h = 100
  const points = chart
    .map((p, i) => {
      const x = (p.range_m / maxR) * w
      const y = h - (p.effect_pct / 100) * h
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  const verdictColor =
    deconflict.verdict === 'clear' ? '#22C55E' : deconflict.verdict === 'contested' ? '#EAB308' : '#EF4444'

  return (
    <div
      className="absolute bottom-16 left-3 z-30 w-[min(100%,20rem)] rounded-xl border shadow-xl pointer-events-auto"
      style={{ background: '#0A0A0F', borderColor: 'var(--store-line)' }}
    >
      <div className="p-3 space-y-3 text-[11px] store-text-body">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#06B6D4]">EW footprint analyser</p>
          <button type="button" onClick={onClose} className="store-text-muted hover:text-white text-xs" aria-label="Close">✕</button>
        </div>
        <label className="block text-[10px] store-text-muted">
          Band
          <select
            className="mt-0.5 w-full rounded bg-black/40 border border-[var(--store-line)] px-2 py-1 text-white"
            style={mono}
            value={band}
            onChange={(e) => setBand(e.target.value as GnssBand)}
          >
            {BAND_OPTIONS.map((b) => (
              <option key={b} value={b}>{BAND_REFERENCE[b].label}</option>
            ))}
          </select>
        </label>
        <label className="block text-[10px] store-text-muted">
          ERP (W): <span style={mono}>{erpWatts}</span>
          <input
            type="range"
            min={1}
            max={500}
            value={erpWatts}
            onChange={(e) => setErpWatts(Number(e.target.value))}
            className="w-full mt-1 accent-[#F97316]"
          />
        </label>
        <p className="text-[10px]" style={mono}>
          50% effect radius: {footprint.effective_radius_m} m · {footprint.erp_dbm} dBm ERP
        </p>
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-24 bg-black/30 rounded border border-[var(--store-line)]">
          <path d={points} fill="none" stroke="#06B6D4" strokeWidth="2" />
          <text x="4" y="12" fill="#94a3b8" fontSize="8">% effect</text>
        </svg>
        <div className="rounded-lg px-2 py-2 border" style={{ borderColor: verdictColor }}>
          <p className="text-[10px] store-text-muted">Deconfliction verdict</p>
          <p className="text-xs uppercase font-semibold" style={{ color: verdictColor, ...mono }}>{deconflict.verdict}</p>
          <p className="text-[9px] store-text-muted mt-1">{deconflict.summary}</p>
          <p className="text-[8px] store-text-muted mt-1" style={mono}>{deconflict.adversary_effectiveness_ref}</p>
        </div>
      </div>
    </div>
  )
}
