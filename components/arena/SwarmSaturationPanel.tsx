'use client'

/**
 * SwarmSaturationPanel: interactive swarm overload modeller
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 *
 * Computes leak-through probability vs magazine depth across the full inbound
 * count range, showing the saturation threshold at which leakers first appear.
 * All Pk figures are OSINT-derived training estimates, not accredited.
 */

import { useMemo, useState } from 'react'
import { computeSwarmSaturation } from '@/lib/planner/swarm-saturation'
import {
  SWARM_DEFEAT_GROUPS,
  SWARM_DEFEAT_SYSTEMS,
  getSwarmDefeatSystem,
} from '@/lib/planner/swarm-defeat-systems'
import { StorePanel } from '@/components/ui/store-surface'
import { cn } from '@/lib/utils'

const TYPE_LABEL: Record<string, string> = {
  missile: 'Kinetic',
  dew: 'DEW',
  hpm: 'HPM',
  cannon: 'Cannon',
  rf: 'RF',
}

// Data hues (DESIGN.md): green = nominal, amber = caution, red = threat.
const KILL = '#4ADE80'
const KILL_DIM = 'rgba(74, 222, 128, 0.32)'
const LEAK = '#FF5C6E'
const LEAK_DIM = 'rgba(255, 92, 110, 0.38)'
const THRESHOLD = '#FBBF24'

// ---------------------------------------------------------------------------
// Chart constants
// ---------------------------------------------------------------------------
const MAX_INBOUND = 40
const CHART_W = 280
const CHART_H = 96
const BAR_SLOT = Math.floor(CHART_W / MAX_INBOUND)   // px per bar slot
const BAR_W    = BAR_SLOT - 1                          // bar width with 1px gap

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function SwarmSaturationPanel() {
  const [systemId, setSystemId]         = useState('skynex')
  const [inbound, setInbound]           = useState(12)
  const [salvo, setSalvo]               = useState(1)
  const [pkPct, setPkPct]               = useState<number | null>(null) // null = use system default

  const sys = getSwarmDefeatSystem(systemId)
  const effectivePk = pkPct !== null ? pkPct / 100 : sys.pk

  // Rebuild on any input change
  const curve = useMemo(() => {
    const points = []
    for (let n = 1; n <= MAX_INBOUND; n++) {
      const r = computeSwarmSaturation({
        inboundCount:   n,
        magazineRounds: sys.magazine,
        reloadMin:      0,
        interceptPk:    effectivePk,
        salvoPerTarget: salvo,
        windowMin:      10,
      })
      points.push({
        n,
        kills:    r.expectedKills,
        leakers:  r.leakers,
        exhausted: r.magazineExhausted,
        leakProb: r.leakThroughProbability,
      })
    }
    const threshold = points.find(p => p.leakers > 0)?.n ?? null
    return { points, threshold }
  }, [sys, effectivePk, salvo])

  const current = curve.points[inbound - 1]

  // Magazine label
  const magLabel = sys.magazine >= 999 ? '∞' : String(sys.magazine)

  const leakTone = (v: number, caution: number) =>
    v === 0 ? 'text-[#4ADE80]' : v <= caution ? 'text-[#FBBF24]' : 'text-[#FF5C6E]'

  return (
    <StorePanel className="overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="border-b border-[var(--store-line)] px-4 py-3">
        <h3 className="text-[15px] font-semibold text-[var(--store-ink)]">Swarm saturation</h3>
        <p className="mt-0.5 text-[12px] store-text-muted">Where a defeat system’s magazine first lets drones through.</p>
      </div>

      <div className="space-y-4 p-4">
        {/* ── Defeat system selector ─────────────────────────────────── */}
        <div>
          <label htmlFor="swarm-system" className="mb-1.5 block text-[12px] font-medium store-text-body">
            Defeat system
          </label>
          <select
            id="swarm-system"
            className="glass-field h-9 w-full px-2.5 text-[13px]"
            value={systemId}
            onChange={e => {
              setSystemId(e.target.value)
              setPkPct(null) // reset override when changing system
            }}
          >
            {SWARM_DEFEAT_GROUPS.map((group) => (
              <optgroup key={group} label={group}>
                {SWARM_DEFEAT_SYSTEMS.filter((s) => s.group === group).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className={cn('tag', sys.side === 'red' ? 'red' : 'blue')}>{sys.side === 'red' ? 'Red' : 'Blue'}</span>
            <span className="tag">{TYPE_LABEL[sys.type] ?? sys.type}</span>
            <span className="tag font-mono">Magazine {magLabel}</span>
          </div>
          {sys.note ? <p className="mt-1.5 text-[12px] leading-relaxed store-text-muted">{sys.note}</p> : null}
        </div>

        {/* ── Inbound count slider ───────────────────────────────────── */}
        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <label htmlFor="swarm-inbound" className="text-[12px] font-medium store-text-body">
              Inbound drones
            </label>
            <span className="font-mono text-[18px] font-semibold tabular-nums leading-none text-[var(--store-ink)]">
              {inbound}
            </span>
          </div>
          <input
            id="swarm-inbound"
            type="range"
            min={1}
            max={MAX_INBOUND}
            value={inbound}
            onChange={e => setInbound(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer accent-[var(--wb-blue)]"
            aria-label="Inbound drone count"
          />
          <div className="mt-0.5 flex justify-between font-mono text-[11px] tabular-nums store-text-muted">
            <span>1</span>
            <span>{MAX_INBOUND}</span>
          </div>
        </div>

        {/* ── Salvo + Pk row ─────────────────────────────────────────── */}
        <div className="flex items-end gap-4">
          {/* Shots per target */}
          <div className="shrink-0">
            <p id="swarm-salvo" className="mb-1.5 text-[12px] font-medium store-text-body">Shots per target</p>
            <div className="seg sm" role="group" aria-labelledby="swarm-salvo">
              {([1, 2] as const).map(v => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={salvo === v}
                  onClick={() => setSalvo(v)}
                  className="font-mono"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Pk override */}
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <label htmlFor="swarm-pk" className="text-[12px] font-medium store-text-body">
                Pk per shot
              </label>
              {pkPct !== null ? (
                <button
                  type="button"
                  onClick={() => setPkPct(null)}
                  className="fc-action !py-0"
                  title="Reset to system default"
                >
                  Reset
                </button>
              ) : (
                <span className="text-[11.5px] store-text-muted">OSINT default</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                id="swarm-pk"
                type="range"
                min={10}
                max={99}
                value={Math.round(effectivePk * 100)}
                onChange={e => setPkPct(Number(e.target.value))}
                className="h-1.5 min-w-0 flex-1 cursor-pointer accent-[var(--wb-blue)]"
                aria-label="Probability of kill override"
              />
              <span className="w-10 text-right font-mono text-[13px] font-semibold tabular-nums text-[var(--store-ink)]">
                {Math.round(effectivePk * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* ── Saturation curve chart ─────────────────────────────────── */}
        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <span className="text-[12px] font-medium store-text-body">Saturation curve</span>
            {curve.threshold ? (
              <span className="text-[12px] store-text-muted">
                Leakers from <span className="font-mono font-semibold tabular-nums text-[#FBBF24]">{curve.threshold}</span> inbound
              </span>
            ) : (
              <span className="text-[12px] text-[#4ADE80]">
                Holds across 1 to {MAX_INBOUND}
              </span>
            )}
          </div>

          <div className="overflow-hidden rounded-lg border border-[var(--lacquer-line)] bg-[var(--store-bg)] p-1.5">
            <svg
              viewBox={`0 0 ${CHART_W} ${CHART_H}`}
              width={CHART_W}
              height={CHART_H}
              className="block w-full"
              style={{ height: CHART_H }}
              role="img"
              aria-label="Saturation curve: kills (green) vs leakers (red) per inbound count"
            >
              {/* Bars */}
              {curve.points.map(pt => {
                const x         = (pt.n - 1) * BAR_SLOT
                const killFrac  = pt.n > 0 ? pt.kills   / pt.n : 0
                const leakFrac  = pt.n > 0 ? pt.leakers / pt.n : 0
                const killH     = Math.round(killFrac * (CHART_H - 4))
                const leakH     = Math.round(leakFrac * (CHART_H - 4))
                const isSelected = pt.n === inbound
                return (
                  <g key={pt.n}>
                    {/* Kill segment */}
                    {killH > 0 && (
                      <rect
                        x={x}
                        y={CHART_H - 2 - killH}
                        width={BAR_W}
                        height={killH}
                        fill={isSelected ? KILL : KILL_DIM}
                      />
                    )}
                    {/* Leak segment, stacked above kills */}
                    {leakH > 0 && (
                      <rect
                        x={x}
                        y={CHART_H - 2 - killH - leakH}
                        width={BAR_W}
                        height={leakH}
                        fill={isSelected ? LEAK : LEAK_DIM}
                      />
                    )}
                  </g>
                )
              })}

              {/* Saturation threshold: amber dashed vertical */}
              {curve.threshold && (() => {
                const tx = (curve.threshold - 1) * BAR_SLOT + BAR_W / 2
                return (
                  <line
                    x1={tx} y1={0} x2={tx} y2={CHART_H}
                    stroke={THRESHOLD}
                    strokeWidth={1.5}
                    strokeDasharray="3 2"
                    opacity={0.9}
                  />
                )
              })()}

              {/* Selected inbound: white hairline */}
              {(() => {
                const sx = (inbound - 1) * BAR_SLOT + BAR_W / 2
                return (
                  <line
                    x1={sx} y1={0} x2={sx} y2={CHART_H}
                    stroke="white"
                    strokeWidth={1}
                    opacity={0.3}
                  />
                )
              })()}

              {/* Baseline */}
              <line
                x1={0} y1={CHART_H - 1} x2={CHART_W} y2={CHART_H - 1}
                stroke="rgba(255,255,255,0.14)"
                strokeWidth={1}
              />
            </svg>
          </div>

          <div className="mt-1.5 flex items-center justify-between text-[11px] store-text-muted">
            <span className="font-mono tabular-nums">1</span>
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="inline-block h-2 w-2 rounded-sm" style={{ background: KILL }} />
                Kills
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="inline-block h-2 w-2 rounded-sm" style={{ background: LEAK }} />
                Leakers
              </span>
            </span>
            <span className="font-mono tabular-nums">{MAX_INBOUND}</span>
          </div>
        </div>

        {/* ── Key metrics ────────────────────────────────────────────── */}
        {current && (
          <dl className="grid grid-cols-3 border-y border-[var(--store-line)] py-3 text-center">
            <div>
              <dt className="text-[11.5px] store-text-muted">Kills</dt>
              <dd className="mt-1 font-mono text-[22px] font-semibold tabular-nums leading-none text-[#4ADE80]">
                {current.kills}
              </dd>
            </div>
            <div className="border-x border-[var(--store-line)]">
              <dt className="text-[11.5px] store-text-muted">Leakers</dt>
              <dd className={cn('mt-1 font-mono text-[22px] font-semibold tabular-nums leading-none', leakTone(current.leakers, 2))}>
                {current.leakers}
              </dd>
            </div>
            <div>
              <dt className="text-[11.5px] store-text-muted">Leak</dt>
              <dd className={cn('mt-1 font-mono text-[22px] font-semibold tabular-nums leading-none', leakTone(current.leakProb, 0.2999))}>
                {Math.round(current.leakProb * 100)}
                <span className="ml-0.5 text-[12px] font-normal store-text-muted">%</span>
              </dd>
            </div>
          </dl>
        )}

        {/* ── Magazine status ────────────────────────────────────────── */}
        {current && (
          <div className="flex items-start gap-2.5">
            <span
              aria-hidden
              className={cn('mt-[5px] h-2 w-2 shrink-0 rounded-full', current.exhausted ? 'bg-[#FF5C6E]' : 'bg-[#4ADE80]')}
            />
            <div>
              <p className={cn('text-[13px] font-medium', current.exhausted ? 'text-[#FF8A98]' : 'text-[#6EE7A0]')}>
                {current.exhausted ? 'Magazine exhausted' : 'Magazine adequate'}
              </p>
              <p className="mt-0.5 text-[12px] leading-relaxed store-text-muted">
                {current.exhausted
                  ? `Add point defence or an RF layer before ${inbound}+ inbound.`
                  : `${magLabel} rounds sufficient for ${inbound} inbound at ${Math.round(effectivePk * 100)}% Pk.`}
              </p>
            </div>
          </div>
        )}

        {/* ── Doctrine note ──────────────────────────────────────────── */}
        {current && current.leakers > 0 && (
          <div className="rounded-xl border border-[rgba(251,191,36,0.35)] bg-[rgba(251,191,36,0.05)] px-3 py-2.5">
            <p className="text-[12px] font-medium text-[#FCD34D]">Doctrine</p>
            <p className="mt-0.5 text-[12px] leading-relaxed store-text-body">
              {current.exhausted
                ? 'Magazine exhausted before the swarm is neutralised. Shift the lowest-cost effector (RF or HPM) to the lead layer and preserve kinetic rounds for terminal-phase threats.'
                : `${current.leakers} leaker${current.leakers === 1 ? '' : 's'} at ${inbound} inbound. Tighten cueing geometry or add an RF suppression layer uprange of the engagement zone.`}
            </p>
          </div>
        )}

        <p className="border-t border-[var(--store-line)] pt-3 font-mono text-[11px] leading-relaxed store-text-muted">
          UNCLASSIFIED // TRAINING · Pk figures OSINT-derived · Confidence: Assessed · Jul 2026
        </p>
      </div>
    </StorePanel>
  )
}
