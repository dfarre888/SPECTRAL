'use client'

import { useMemo, useState } from 'react'
import { Waves } from 'lucide-react'
import { EwPropagationEngine } from '@/lib/ew/ewPropagationEngine'
import { SpectrumDeconflictionEngine } from '@/lib/ew/spectrumDeconflictionEngine'
import { BAND_REFERENCE, type GnssBand } from '@/lib/gnss/types'
import type { PlacedCuas, PlacedUas } from '@/lib/map/types'
import { CardSection, Field, KV, MapCard, rangeClass, selectClass } from '@/app/map/components/MapUi'

interface EwFootprintAnalyserProps {
  placedUas: PlacedUas[]
  placedCuas: PlacedCuas[]
  emitterLon: number
  emitterLat: number
  onClose: () => void
  className?: string
}

const BAND_OPTIONS: GnssBand[] = [
  'GPS_L1',
  'GPS_L5',
  'GLONASS_L1',
  'control_link_2_4ghz',
  'control_link_900mhz',
  'control_link_5_8ghz',
]

const VERDICT_TAG: Record<string, string> = { clear: 'green', contested: 'amber' }

function formatRange(m: number): string {
  return m >= 10_000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m).toLocaleString()} m`
}

export function EwFootprintAnalyser({
  placedUas,
  placedCuas,
  emitterLon,
  emitterLat,
  onClose,
  className,
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
  const w = 300
  const h = 96
  const points = chart
    .map((p, i) => {
      const x = (p.range_m / maxR) * w
      const y = h - (p.effect_pct / 100) * h
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  const area = chart.length > 0 ? `${points} L${w},${h} L0,${h} Z` : ''
  const halfX = maxR > 0 ? Math.min(w, (footprint.effective_radius_m / maxR) * w) : 0

  return (
    <MapCard
      className={className}
      title="EW footprint and deconfliction"
      icon={<Waves className="w-4 h-4" />}
      onClose={onClose}
    >
      <div className="space-y-3">
        <Field label="Band">
          <select className={selectClass} value={band} onChange={(e) => setBand(e.target.value as GnssBand)}>
            {BAND_OPTIONS.map((b) => (
              <option key={b} value={b}>
                {BAND_REFERENCE[b].label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="ERP" hint={`${erpWatts} W`}>
          <input
            type="range"
            min={1}
            max={500}
            value={erpWatts}
            onChange={(e) => setErpWatts(Number(e.target.value))}
            className={rangeClass}
            aria-label="Effective radiated power in watts"
          />
        </Field>

        <dl>
          <KV label="50% effect radius" value={formatRange(footprint.effective_radius_m)} tone="cyan" />
          <KV label="ERP" value={`${footprint.erp_dbm} dBm`} />
        </dl>

        <CardSection title="Effect by range" aside={<span className="text-[11.5px] store-text-muted">% effect</span>}>
          <div className="rounded-lg store-panel-inner px-2 pt-2 pb-1.5">
            <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="block w-full h-24" aria-hidden>
              <line x1="0" y1={h / 2} x2={w} y2={h / 2} stroke="rgba(255,255,255,0.10)" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
              {halfX > 0 ? (
                <line x1={halfX} y1="0" x2={halfX} y2={h} stroke="rgba(6,182,212,0.45)" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
              ) : null}
              <path d={area} fill="rgba(6,182,212,0.12)" />
              <path d={points} fill="none" stroke="#06B6D4" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            </svg>
            <div className="flex justify-between font-mono text-[11px] store-text-muted mt-1">
              <span>0</span>
              <span>{formatRange(maxR)}</span>
            </div>
          </div>
        </CardSection>

        <CardSection
          title="Deconfliction"
          aside={
            <span className={`tag font-mono font-semibold ${VERDICT_TAG[deconflict.verdict] ?? 'red'}`}>
              {deconflict.verdict.toUpperCase()}
            </span>
          }
        >
          <p className="text-[12px] store-text-body leading-relaxed">{deconflict.summary}</p>
          <p className="mt-2 font-mono text-[11px] store-text-muted break-words">{deconflict.adversary_effectiveness_ref}</p>
        </CardSection>
      </div>
    </MapCard>
  )
}
