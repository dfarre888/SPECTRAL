'use client'

import { useId, useMemo } from 'react'
import { formatRangeM, type SiteAssessment } from '@/lib/base-protection/coverage'
import { HUE } from '@/components/base-protection/tokens'

const SIZE = 360
const HALF = SIZE / 2
const NICE = [100, 200, 250, 500, 1_000, 2_000, 2_500, 5_000, 10_000, 20_000, 25_000, 50_000]

function niceScale(pxPerM: number): number {
  const target = 90 / pxPerM
  return NICE.reduce((best, n) => (Math.abs(n - target) < Math.abs(best - target) ? n : best), NICE[0])
}

/**
 * Plan view of one site, true to scale: the protection circle, every placed
 * unit's reach, and the area outside defeat reach hatched red. North up.
 */
export function PlanView({ assessment, siteName }: { assessment: SiteAssessment; siteName: string }) {
  const uid = useId().replace(/:/g, '')
  const R = assessment.radiusM
  const extent = R * 1.32
  const s = HALF / extent // px per metre

  const units = assessment.units
  const defeatUnits = units.filter((u) => u.layers.includes('defeat'))
  const sensorOnly = units.filter((u) => !u.layers.includes('defeat'))
  const beyond = useMemo(() => {
    const seen = new Map<string, number>()
    for (const u of units) if (Math.hypot(u.x, u.y) + u.rangeM > extent * 1.41) seen.set(u.name, u.rangeM)
    return [...seen.entries()]
  }, [units, extent])

  const scaleM = niceScale(s)
  const scalePx = scaleM * s
  const X = (m: number) => HALF + m * s
  const Y = (m: number) => HALF - m * s
  const defeatFull = assessment.layers.defeat.fraction >= 0.995

  const summary =
    `Plan view of ${siteName}. Protection radius ${formatRangeM(R)}. ` +
    (!assessment.hasPackage
      ? 'No package planned.'
      : units.length === 0
      ? 'No systems with a published range are placed.'
      : `${units.length} unit${units.length === 1 ? '' : 's'} placed. ` +
        `Defeat covers ${Math.round(assessment.layers.defeat.fraction * 100)} percent of the circle.`)

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="block w-full h-auto rounded-xl"
        style={{ background: 'var(--bp-plan-bg)', border: '1px solid var(--lacquer-line)' }}
        role="img"
        aria-label={summary}
      >
        <defs>
          <clipPath id={`clip-${uid}`}>
            <rect x="0" y="0" width={SIZE} height={SIZE} rx="12" />
          </clipPath>
          <pattern id={`hatch-${uid}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="rgba(255,92,110,0.07)" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(255,92,110,0.42)" strokeWidth="1" />
          </pattern>
          <mask id={`gap-${uid}`}>
            <rect x="0" y="0" width={SIZE} height={SIZE} fill="white" />
            {defeatUnits.map((u, i) => (
              <circle key={i} cx={X(u.x)} cy={Y(u.y)} r={u.rangeM * s} fill="black" />
            ))}
          </mask>
        </defs>

        <g clipPath={`url(#clip-${uid})`}>
          {/* Hairline cross through the site centre */}
          <line x1={HALF} y1="0" x2={HALF} y2={SIZE} style={{ stroke: 'var(--bp-plan-grid)' }} />
          <line x1="0" y1={HALF} x2={SIZE} y2={HALF} style={{ stroke: 'var(--bp-plan-grid)' }} />

          {/* Area inside the protection circle but outside defeat reach */}
          {!defeatFull && assessment.hasPackage ? (
            <circle cx={HALF} cy={HALF} r={R * s} fill={`url(#hatch-${uid})`} mask={`url(#gap-${uid})`} />
          ) : null}

          {/* Sensor reach */}
          {sensorOnly.map((u, i) => (
            <circle
              key={`s${i}`}
              cx={X(u.x)}
              cy={Y(u.y)}
              r={u.rangeM * s}
              fill="rgba(6,182,212,0.05)"
              stroke={HUE.cyan}
              strokeOpacity="0.85"
              strokeWidth="1"
              strokeDasharray="5 3"
            />
          ))}
          {/* Effector and integrated reach */}
          {defeatUnits.map((u, i) => (
            <circle
              key={`d${i}`}
              cx={X(u.x)}
              cy={Y(u.y)}
              r={u.rangeM * s}
              fill="rgba(41,151,255,0.06)"
              stroke={HUE.blue}
              strokeOpacity="0.9"
              strokeWidth="1.25"
            />
          ))}

          {/* Protection circle (planning assumption) */}
          <circle cx={HALF} cy={HALF} r={R * s} fill="none" style={{ stroke: 'var(--bp-plan-ink)' }} strokeWidth="1.25" strokeDasharray="3 4" />
          <text
            x={HALF + 6}
            y={HALF - R * s - 6}
            style={{ fill: 'var(--bp-plan-ink)' }}
            fontSize="11"
            fontFamily="var(--font-mono)"
          >
            {formatRangeM(R)}
          </text>

          {/* Unit positions */}
          {units.map((u, i) => (
            <circle
              key={`u${i}`}
              cx={X(u.x)}
              cy={Y(u.y)}
              r="3.5"
              fill={u.layers.includes('defeat') ? HUE.blue : HUE.cyan}
              style={{ stroke: 'var(--bp-plan-halo)' }}
              strokeWidth="1.5"
            />
          ))}

          {/* Site centre */}
          <g style={{ stroke: 'var(--bp-plan-ink-strong)' }} strokeWidth="1.25">
            <line x1={HALF - 6} y1={HALF} x2={HALF - 2} y2={HALF} />
            <line x1={HALF + 2} y1={HALF} x2={HALF + 6} y2={HALF} />
            <line x1={HALF} y1={HALF - 6} x2={HALF} y2={HALF - 2} />
            <line x1={HALF} y1={HALF + 2} x2={HALF} y2={HALF + 6} />
          </g>
        </g>

        {!assessment.hasPackage ? (
          <text
            x={HALF}
            y={SIZE - 40}
            textAnchor="middle"
            style={{ fill: 'var(--bp-plan-ink)' }}
            fontSize="12"
          >
            No package planned
          </text>
        ) : null}

        {/* North */}
        <g transform={`translate(${SIZE - 22}, 18)`} aria-hidden>
          <path d="M0 -8 L4 4 L0 1 L-4 4 Z" style={{ fill: 'var(--bp-plan-ink)' }} />
          <text x="0" y="17" textAnchor="middle" style={{ fill: 'var(--bp-plan-ink)' }} fontSize="11" fontFamily="var(--font-mono)">
            N
          </text>
        </g>

        {/* Scale bar */}
        <g transform={`translate(14, ${SIZE - 16})`} aria-hidden>
          <line x1="0" y1="0" x2={scalePx} y2="0" style={{ stroke: 'var(--bp-plan-ink)' }} strokeWidth="1.25" />
          <line x1="0" y1="-4" x2="0" y2="0" style={{ stroke: 'var(--bp-plan-ink)' }} strokeWidth="1.25" />
          <line x1={scalePx} y1="-4" x2={scalePx} y2="0" style={{ stroke: 'var(--bp-plan-ink)' }} strokeWidth="1.25" />
          <text x={scalePx + 6} y="4" style={{ fill: 'var(--bp-plan-ink)' }} fontSize="11" fontFamily="var(--font-mono)">
            {formatRangeM(scaleM)}
          </text>
        </g>
      </svg>

      <figcaption className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] text-[var(--store-ink-mute)]">
        <span className="inline-flex items-center gap-1.5">
          <svg width="16" height="8" aria-hidden><line x1="0" y1="4" x2="16" y2="4" style={{ stroke: 'var(--bp-plan-ink)' }} strokeDasharray="3 3" /></svg>
          Protection radius
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="16" height="8" aria-hidden><line x1="0" y1="4" x2="16" y2="4" stroke={HUE.cyan} strokeDasharray="4 2" /></svg>
          Sensor reach
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="16" height="8" aria-hidden><line x1="0" y1="4" x2="16" y2="4" stroke={HUE.blue} strokeWidth="1.5" /></svg>
          Defeat reach
        </span>
        <span className={`inline-flex items-center gap-1.5 ${assessment.hasPackage ? '' : 'hidden'}`}>
          <svg width="12" height="12" aria-hidden>
            <rect width="12" height="12" rx="2" fill="rgba(255,92,110,0.12)" stroke="rgba(255,92,110,0.55)" />
          </svg>
          Outside defeat reach
        </span>
      </figcaption>
      {beyond.length ? (
        <p className="mt-1.5 text-[11.5px] text-[var(--store-ink-mute)]">
          Reaches beyond this view:{' '}
          {beyond.map(([name, r], i) => (
            <span key={name}>
              {i ? ', ' : ''}
              {name} <span className="font-mono">{formatRangeM(r)}</span>
            </span>
          ))}
          .
        </p>
      ) : null}
    </figure>
  )
}
