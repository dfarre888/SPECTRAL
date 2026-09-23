'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
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

const POSTURES: { id: PlanningPosture; label: string }[] = [
  { id: 'optimistic', label: 'Optimistic' },
  { id: 'nominal', label: 'Nominal' },
  { id: 'conservative', label: 'Conservative' },
]

/** Canvas colours. Red is the threat, blue is the friendly route. */
const RED = '#FF5C6E'
const RED_TEXT = '#FF8A98'
const BLUE = '#2997FF'
const GREEN = '#4ADE80'
const CYAN = '#06B6D4'

/** Canvas label size in viewBox units. The SVG renders at or above 1:1. */
const LABEL_PX = 12

const CONFIDENCE_LABEL: Record<string, string> = {
  accredited: 'Accredited Pk',
  osint: 'OSINT estimate',
  estimated: 'Estimated',
}

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

/**
 * Minimum-exposure route planner over an engagement-envelope laydown.
 * Planner-owned rendering of the routing model in `lib/map/threat-route`.
 */
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

  const W = 640
  const H = 360
  const proj = useMemo(() => {
    // Include ring extents so a large envelope is not clipped out of frame.
    const pts: RoutePoint[] = [start, objective]
    for (const t of threats) {
      const dLat = t.detectionRangeM / 111_320
      pts.push({ lon: t.lon, lat: t.lat + dLat }, { lon: t.lon, lat: t.lat - dLat })
    }
    return makeProjection(pts, W, H, 34)
  }, [start, objective, threats])

  /**
   * Label positions, pushed apart so co-located emitters stay readable.
   *
   * A laydown deliberately stacks systems (a Pantsir sits inside an S-300 ring
   * by design), so two labels landing within a line-height of each other is the
   * normal case. Walking them down in y order and enforcing a minimum gap keeps
   * the association with the marker while stopping the text overlapping.
   */
  const labelPos = useMemo(() => {
    const MIN_GAP = LABEL_PX + 5
    const rows = threats
      .map((t, i) => ({ i, x: proj.x(t.lon) + 8, y: proj.y(t.lat) - 8 }))
      .sort((a, b) => a.y - b.y)
    let lastY = -Infinity
    for (const r of rows) {
      if (r.y - lastY < MIN_GAP) r.y = lastY + MIN_GAP
      lastY = r.y
    }
    const out: Record<number, { x: number; y: number }> = {}
    for (const r of rows) out[r.i] = { x: r.x, y: r.y }
    return out
  }, [threats, proj])

  const pct = (n: number) => `${(n * 100).toFixed(1)}%`
  const improved = planned.survivalProbability > direct.survivalProbability
  const path = planned.waypoints.map((p) => `${proj.x(p.lon)},${proj.y(p.lat)}`).join(' ')
  const directPath = `${proj.x(start.lon)},${proj.y(start.lat)} ${proj.x(objective.lon)},${proj.y(objective.lat)}`
  const penetrated = planned.penetratedThreatIds.length

  /**
   * End-point labels sit on the side away from the route's first leg, so the
   * line never runs through the text: below/above the point, anchored to the
   * half of the canvas the point is in.
   */
  const endLabel = (p: RoutePoint, text: string, color: string) => {
    const x = proj.x(p.lon)
    const y = proj.y(p.lat)
    const leftHalf = x < W / 2
    const below = y < H - 28
    return (
      <text
        x={leftHalf ? x - 4 : x - 10}
        y={below ? y + 22 : y - 12}
        textAnchor={leftHalf ? 'start' : 'end'}
        fill={color}
        stroke="rgba(0,0,0,0.9)"
        strokeWidth={3}
        style={{ font: `500 ${LABEL_PX}px var(--font-mono), ui-monospace, monospace`, paintOrder: 'stroke' }}
      >
        {text}
      </text>
    )
  }

  return (
    <div className="store-panel rounded-2xl p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="store-display text-[15px] font-semibold text-[var(--store-ink)]">
            Minimum-exposure path
          </h3>
          <p className="mt-0.5 text-xs store-text-muted">
            {threats.length} emitters under the {posture} posture:{' '}
            <span className="font-mono">{threats.map((t) => t.label).join(', ')}</span>
          </p>
        </div>
        <div className="seg sm" role="group" aria-label="Planning posture">
          {POSTURES.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={posture === p.id}
              onClick={() => setPosture(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_248px]">
        <figure className="min-w-0">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="block w-full rounded-xl border border-[var(--lacquer-line)]"
            role="img"
            aria-label={`Route map: direct leg survival ${pct(direct.survivalProbability)}, planned route survival ${pct(planned.survivalProbability)}`}
          >
            <defs>
              <pattern id="route-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(255,255,255,0.045)" strokeWidth={1} />
              </pattern>
            </defs>
            <rect width={W} height={H} fill="#040406" />
            <rect width={W} height={H} fill="url(#route-grid)" />

            {threats.map((t) => (
              <g key={`${t.id}-rings`}>
                <circle cx={proj.x(t.lon)} cy={proj.y(t.lat)} r={proj.r(t.detectionRangeM)}
                  fill="rgba(255,92,110,0.035)" stroke="rgba(255,92,110,0.32)" strokeDasharray="4 4" />
                <circle cx={proj.x(t.lon)} cy={proj.y(t.lat)} r={proj.r(t.engagementRangeM)}
                  fill="rgba(255,92,110,0.12)" stroke="rgba(255,92,110,0.62)" />
              </g>
            ))}

            <polyline points={directPath} fill="none" stroke="rgba(255,255,255,0.34)"
              strokeWidth={1.5} strokeDasharray="6 5" />
            <polyline points={path} fill="none" stroke={BLUE} strokeWidth={2.75}
              strokeLinejoin="round" strokeLinecap="round" className="wb-glow-blue" />
            {planned.waypoints.map((p, i) => {
              const last = planned.waypoints.length - 1
              const isEnd = i === 0 || i === last
              return (
                <circle key={i} cx={proj.x(p.lon)} cy={proj.y(p.lat)} r={isEnd ? 5 : 2.75}
                  fill={i === 0 ? GREEN : i === last ? CYAN : BLUE}
                  stroke={isEnd ? 'rgba(0,0,0,0.9)' : 'none'} strokeWidth={1.5} />
              )
            })}

            {/* Threat markers and labels last so nothing draws over the text. */}
            {threats.map((t, ti) => {
              const lp = labelPos[ti] ?? { x: proj.x(t.lon) + 8, y: proj.y(t.lat) - 8 }
              const moved = Math.abs(lp.y - (proj.y(t.lat) - 8)) > 2
              return (
                <g key={t.id}>
                  <circle cx={proj.x(t.lon)} cy={proj.y(t.lat)} r={3.5} fill={RED}
                    stroke="rgba(0,0,0,0.9)" strokeWidth={1.25} />
                  {/* Leader line back to the marker, since the label may have moved. */}
                  {moved && (
                    <line
                      x1={proj.x(t.lon)} y1={proj.y(t.lat)}
                      x2={lp.x - 2} y2={lp.y - 4}
                      stroke="rgba(255,92,110,0.45)" strokeWidth={1}
                    />
                  )}
                  <text
                    x={lp.x}
                    y={lp.y}
                    fill={RED_TEXT}
                    stroke="rgba(0,0,0,0.9)"
                    strokeWidth={3}
                    style={{ font: `500 ${LABEL_PX}px var(--font-mono), ui-monospace, monospace`, paintOrder: 'stroke' }}
                  >
                    {t.label}
                  </text>
                </g>
              )
            })}

            {endLabel(start, 'Start', GREEN)}
            {endLabel(objective, 'Objective', CYAN)}
          </svg>

          <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs store-text-body">
            <span className="inline-flex items-center gap-2">
              <svg width="22" height="8" aria-hidden><line x1="0" y1="4" x2="22" y2="4" stroke={BLUE} strokeWidth="2.5" /></svg>
              Planned route
            </span>
            <span className="inline-flex items-center gap-2">
              <svg width="22" height="8" aria-hidden><line x1="0" y1="4" x2="22" y2="4" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeDasharray="5 4" /></svg>
              Direct leg
            </span>
            <span className="inline-flex items-center gap-2">
              <svg width="14" height="14" aria-hidden><circle cx="7" cy="7" r="6" fill="rgba(255,92,110,0.14)" stroke="rgba(255,92,110,0.7)" /></svg>
              Engagement ring
            </span>
            <span className="inline-flex items-center gap-2">
              <svg width="14" height="14" aria-hidden><circle cx="7" cy="7" r="6" fill="none" stroke="rgba(255,92,110,0.5)" strokeDasharray="3 2.5" /></svg>
              Detection ring
            </span>
          </figcaption>
        </figure>

        <aside className="flex min-w-0 flex-col gap-5">
          <dl className="divide-y divide-[var(--store-line)]">
            <div className="pb-4">
              <dt className="text-xs store-text-muted">Direct leg survival</dt>
              <dd className="mt-1.5 font-mono text-[26px] leading-none tabular-nums" style={{ color: RED }}>
                {pct(direct.survivalProbability)}
              </dd>
              <dd className="mt-1.5 font-mono text-xs store-text-muted">
                {(direct.lengthM / 1000).toFixed(0)} km great circle
              </dd>
            </div>
            <div className="py-4">
              <dt className="text-xs store-text-muted">Planned route survival</dt>
              <dd
                className="mt-1.5 font-mono text-[26px] leading-none tabular-nums"
                style={{ color: improved ? GREEN : RED }}
              >
                {pct(planned.survivalProbability)}
              </dd>
              <dd className="mt-1.5 font-mono text-xs store-text-muted">
                {(planned.lengthM / 1000).toFixed(0)} km, +{((planned.detourFactor - 1) * 100).toFixed(0)}% length
              </dd>
            </div>
            <div className="pt-4">
              <dt className="text-xs store-text-muted">Waypoints</dt>
              <dd className="mt-1.5 font-mono text-[26px] leading-none tabular-nums text-[var(--store-ink)]">
                {planned.waypoints.length}
              </dd>
              <dd className="mt-1.5 text-xs store-text-muted">
                {planned.confidence ? CONFIDENCE_LABEL[planned.confidence] ?? planned.confidence : 'No threat contact'}
              </dd>
            </div>
          </dl>

          <label className="block">
            <span className="flex items-baseline justify-between gap-2 text-xs">
              <span className="store-text-muted">Detour allowance</span>
              <span className="font-mono tabular-nums text-[var(--store-ink)]">
                {((detour - 1) * 100).toFixed(0)}%
              </span>
            </span>
            <input
              type="range" min={1.05} max={2.5} step={0.05} value={detour}
              onChange={(e) => setDetour(Number(e.target.value))}
              className="mt-2 w-full accent-[var(--wb-blue)]"
              aria-label="Detour allowance"
            />
          </label>

          {penetrated > 0 && (
            <p className="flex gap-2 text-xs leading-relaxed" style={{ color: RED_TEXT }} role="status">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>
                No clear route inside the allowance. The path must penetrate {penetrated} threat
                {penetrated === 1 ? '' : 's'}.
              </span>
            </p>
          )}
        </aside>
      </div>

      <p className="mt-4 max-w-[80ch] text-xs leading-relaxed store-text-muted">
        Rings use effective engagement range under the selected posture, not kinematic missile range.
        Without an accredited Pk the route is marked estimated.
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
