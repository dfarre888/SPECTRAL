'use client'

import { useMemo, useState } from 'react'
import { clsx } from 'clsx'
import {
  toThreatEmitters,
  type PlacedEmitter,
  type PlanningPosture,
} from '@/lib/map/engagement-envelopes'
import { planThreatRoute, scoreRoute, type RoutePoint } from '@/lib/map/threat-route'

interface ThreatRoutePanelProps {
  start: RoutePoint
  objective: RoutePoint
  placed: PlacedEmitter[]
  speedMps?: number
}

const POSTURES: PlanningPosture[] = ['optimistic', 'nominal', 'conservative']

/** Project lon/lat into the SVG box with a uniform scale so rings stay circular. */
function makeProjection(points: RoutePoint[], w: number, h: number, pad = 30) {
  const lons = points.map((p) => p.lon)
  const lats = points.map((p) => p.lat)
  const minLon = Math.min(...lons)
  const maxLon = Math.max(...lons)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const spanLon = Math.max(1e-6, maxLon - minLon)
  const spanLat = Math.max(1e-6, maxLat - minLat)
  const scale = Math.min((w - pad * 2) / spanLon, (h - pad * 2) / spanLat)
  const cx = (minLon + maxLon) / 2
  const cy = (minLat + maxLat) / 2
  return {
    x: (lon: number) => w / 2 + (lon - cx) * scale,
    y: (lat: number) => h / 2 - (lat - cy) * scale,
    /** Metres to pixels via degrees of latitude. */
    r: (m: number) => (m / 111_320) * scale,
  }
}

export function ThreatRoutePanel({ start, objective, placed, speedMps = 250 }: ThreatRoutePanelProps) {
  const [posture, setPosture] = useState<PlanningPosture>('nominal')
  const [detour, setDetour] = useState(1.6)

  const { direct, planned, threats } = useMemo(() => {
    const t = toThreatEmitters(placed, posture)
    const opts = { speedMps, gridStepM: 12_000, maxDetourFactor: detour }
    return {
      threats: t,
      direct: scoreRoute([start, objective], t, opts),
      planned: planThreatRoute(start, objective, t, opts),
    }
  }, [placed, posture, detour, start, objective, speedMps])

  const W = 560
  const H = 300
  const proj = useMemo(() => {
    // Include ring extents so a large envelope is not clipped out of frame.
    const pts: RoutePoint[] = [start, objective]
    for (const t of threats) {
      const dLat = t.detectionRangeM / 111_320
      pts.push({ lon: t.lon, lat: t.lat + dLat }, { lon: t.lon, lat: t.lat - dLat })
    }
    return makeProjection(pts, W, H)
  }, [start, objective, threats])

  const pct = (n: number) => `${(n * 100).toFixed(1)}%`
  const improved = planned.survivalProbability > direct.survivalProbability
  const path = planned.waypoints.map((p) => `${proj.x(p.lon)},${proj.y(p.lat)}`).join(' ')
  const directPath = `${proj.x(start.lon)},${proj.y(start.lat)} ${proj.x(objective.lon)},${proj.y(objective.lat)}`

  return (
    <div className="store-panel rounded-2xl p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--store-accent)]">
            Threat-aware routing
          </p>
          <h3 className="store-display text-sm font-semibold text-white mt-0.5">Minimum-exposure path</h3>
        </div>
        <div className="flex gap-1">
          {POSTURES.map((p) => (
            <button key={p} type="button" onClick={() => setPosture(p)}
              className={clsx(
                'px-2 py-1 rounded-lg text-[10px] font-mono border transition-colors capitalize',
                posture === p ? 'nav-item-active'
                  : 'store-panel-inner store-text-muted hover:border-[var(--store-accent-border)]',
              )}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl"
        style={{ background: 'var(--store-surface-2)' }}>
        {threats.map((t) => (
          <g key={t.id}>
            <circle cx={proj.x(t.lon)} cy={proj.y(t.lat)} r={proj.r(t.detectionRangeM)}
              fill="rgba(248,113,113,0.05)" stroke="rgba(248,113,113,0.25)" strokeDasharray="3 3" />
            <circle cx={proj.x(t.lon)} cy={proj.y(t.lat)} r={proj.r(t.engagementRangeM)}
              fill="rgba(248,113,113,0.14)" stroke="rgba(248,113,113,0.55)" />
            <circle cx={proj.x(t.lon)} cy={proj.y(t.lat)} r={3} fill="#f87171" />
            <text x={proj.x(t.lon) + 6} y={proj.y(t.lat) - 6} fill="#fca5a5"
              style={{ font: '9px ui-monospace, monospace' }}>{t.label}</text>
          </g>
        ))}
        <polyline points={directPath} fill="none" stroke="rgba(255,255,255,0.28)"
          strokeWidth={1.5} strokeDasharray="5 4" />
        <polyline points={path} fill="none" stroke="var(--store-accent)" strokeWidth={2.5}
          strokeLinejoin="round" strokeLinecap="round" />
        {planned.waypoints.map((p, i) => {
          const isEnd = i === 0 || i === planned.waypoints.length - 1
          return (
            <circle key={i} cx={proj.x(p.lon)} cy={proj.y(p.lat)} r={isEnd ? 4.5 : 2.5}
              fill={i === 0 ? '#4ade80' : i === planned.waypoints.length - 1 ? '#22d3ee' : 'var(--store-accent)'} />
          )
        })}
      </svg>

      <div className="grid grid-cols-3 gap-2 mt-3">
        <div className="store-panel-inner rounded-xl p-2.5">
          <p className="text-[10px] font-mono uppercase store-text-muted">Direct</p>
          <p className="text-lg font-bold font-mono tabular-nums" style={{ color: '#f87171' }}>
            {pct(direct.survivalProbability)}
          </p>
          <p className="text-[10px] store-text-muted font-mono">{(direct.lengthM / 1000).toFixed(0)} km</p>
        </div>
        <div className="store-panel-inner rounded-xl p-2.5">
          <p className="text-[10px] font-mono uppercase store-text-muted">Planned</p>
          <p className="text-lg font-bold font-mono tabular-nums"
            style={{ color: improved ? 'var(--store-success)' : '#f87171' }}>
            {pct(planned.survivalProbability)}
          </p>
          <p className="text-[10px] store-text-muted font-mono">
            {(planned.lengthM / 1000).toFixed(0)} km · +{((planned.detourFactor - 1) * 100).toFixed(0)}%
          </p>
        </div>
        <div className="store-panel-inner rounded-xl p-2.5">
          <p className="text-[10px] font-mono uppercase store-text-muted">Waypoints</p>
          <p className="text-lg font-bold text-white font-mono tabular-nums">{planned.waypoints.length}</p>
          <p className="text-[10px] store-text-muted font-mono">{planned.confidence ?? 'no threat contact'}</p>
        </div>
      </div>

      <label className="flex items-center gap-2 mt-3">
        <span className="text-[10px] font-mono store-text-muted whitespace-nowrap">
          Detour allowance {((detour - 1) * 100).toFixed(0)}%
        </span>
        <input type="range" min={1.05} max={2.5} step={0.05} value={detour}
          onChange={(e) => setDetour(Number(e.target.value))}
          className="flex-1 accent-[var(--store-accent)] h-1" />
      </label>

      {planned.penetratedThreatIds.length > 0 && (
        <p className="mt-2 text-[10px] font-mono text-red-300">
          No clear route inside the allowance — must penetrate {planned.penetratedThreatIds.length} threat
          {planned.penetratedThreatIds.length === 1 ? '' : 's'}.
        </p>
      )}

      <p className="mt-2 text-[10px] store-text-muted leading-relaxed">
        Rings use effective engagement range under the selected posture, not kinematic missile range.
        Solid ring is engagement, dashed is detection. Without an accredited Pk the route is marked estimated.
      </p>
    </div>
  )
}

/** Demo laydown so the panel is exercisable ahead of live map wiring. */
export const DEMO_LAYDOWN: PlacedEmitter[] = [
  { envelopeId: 's400-48n6', lon: 149.0, lat: -34.4, label: 'S-400' },
  { envelopeId: 'pantsir-s1', lon: 148.2, lat: -35.4, label: 'Pantsir' },
  { envelopeId: 's300-pmu2', lon: 149.8, lat: -35.4, label: 'S-300' },
]
