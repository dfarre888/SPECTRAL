'use client'

/**
 * SwarmSaturationPanel — interactive swarm overload modeller
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 *
 * Computes leak-through probability vs magazine depth across the full inbound
 * count range, showing the saturation threshold at which leakers first appear.
 * All Pk figures are OSINT-derived training estimates — not accredited.
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

const TYPE_TAG: Record<string, { label: string; colour: string }> = {
  missile: { label: 'KINETIC', colour: 'text-cyan-400' },
  dew:     { label: 'DEW',     colour: 'text-yellow-400' },
  hpm:     { label: 'HPM',     colour: 'text-purple-400' },
  cannon:  { label: 'CANNON',  colour: 'text-orange-300' },
  rf:      { label: 'RF',      colour: 'text-emerald-400' },
}

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

  return (
    <StorePanel className="p-4 space-y-3">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-semibold text-white uppercase tracking-widest">
          Swarm Saturation
        </h3>
        <span className="text-[8px] font-mono store-text-muted">
          UNCLASSIFIED // TRAINING
        </span>
      </div>

      {/* ── Defeat system selector ─────────────────────────────────── */}
      <div>
        <label className="text-[9px] font-mono uppercase store-text-muted mb-1 block">
          Defeat system
        </label>
        <select
          className="w-full text-[11px] font-mono store-panel-inner rounded-lg px-2 py-1.5 border border-[var(--store-line)] bg-[var(--store-surface-2)] text-white"
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
        <p className="text-[9px] font-mono store-text-muted mt-0.5 leading-relaxed">
          <span
            className={cn(
              'mr-1.5 font-semibold uppercase',
              sys.side === 'red' ? 'text-red-400' : 'text-cyan-400',
            )}
          >
            {sys.side}
          </span>
          <span className={cn('mr-1.5 font-semibold', TYPE_TAG[sys.type]?.colour)}>
            {TYPE_TAG[sys.type]?.label}
          </span>
          {sys.note}
          <span className="ml-1.5 text-white/40">· mag {magLabel}</span>
        </p>
      </div>

      {/* ── Inbound count slider ───────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-0.5">
          <label className="text-[9px] font-mono uppercase store-text-muted">
            Inbound count
          </label>
          <span className="text-[15px] font-mono font-bold text-white tabular-nums leading-none">
            {inbound}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={MAX_INBOUND}
          value={inbound}
          onChange={e => setInbound(Number(e.target.value))}
          className="w-full h-1.5 accent-[#F97316] cursor-pointer"
          aria-label="Inbound drone count"
        />
        <div className="flex justify-between text-[8px] font-mono store-text-muted mt-0.5">
          <span>1</span>
          <span>{MAX_INBOUND}</span>
        </div>
      </div>

      {/* ── Salvo + Pk row ─────────────────────────────────────────── */}
      <div className="flex gap-3 items-end">
        {/* Shots per target */}
        <div className="shrink-0">
          <label className="text-[9px] font-mono uppercase store-text-muted mb-1 block">
            Shots/tgt
          </label>
          <div className="flex rounded-lg overflow-hidden border border-[var(--store-line)]">
            {([1, 2] as const).map(v => (
              <button
                key={v}
                type="button"
                onClick={() => setSalvo(v)}
                className={cn(
                  'px-3 py-1 text-[11px] font-mono font-semibold transition-colors',
                  salvo === v
                    ? 'bg-orange-500/20 text-orange-400 border-orange-500/40'
                    : 'store-panel-inner store-text-muted hover:text-white',
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Pk override */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[9px] font-mono uppercase store-text-muted">
              Pk/shot
            </label>
            <button
              type="button"
              onClick={() => setPkPct(null)}
              className={cn(
                'text-[8px] font-mono transition-colors',
                pkPct !== null ? 'text-orange-400 hover:text-orange-300' : 'store-text-muted cursor-default',
              )}
              title="Reset to system default"
            >
              {pkPct !== null ? 'reset' : 'OSINT default'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={10}
              max={99}
              value={Math.round(effectivePk * 100)}
              onChange={e => setPkPct(Number(e.target.value))}
              className="flex-1 h-1.5 accent-[#06B6D4] cursor-pointer"
              aria-label="Probability of kill override"
            />
            <span className="text-[12px] font-mono font-bold text-cyan-400 w-9 text-right tabular-nums">
              {Math.round(effectivePk * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* ── Saturation curve chart ─────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] font-mono uppercase store-text-muted">
            Saturation curve
          </span>
          {curve.threshold ? (
            <span className="text-[9px] font-mono">
              <span className="text-orange-400">⚠ </span>
              <span className="store-text-muted">threshold @ </span>
              <span className="font-bold text-orange-400">{curve.threshold}</span>
            </span>
          ) : (
            <span className="text-[9px] font-mono text-emerald-400">
              sufficient 1–{MAX_INBOUND}
            </span>
          )}
        </div>

        <div className="rounded-lg border border-[var(--store-line)] bg-[#06060B] p-1 overflow-hidden">
          <svg
            viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            width={CHART_W}
            height={CHART_H}
            className="block w-full"
            style={{ height: CHART_H }}
            aria-label="Saturation curve: kills (green) vs leakers (orange) per inbound count"
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
                  {/* Kill segment (green) */}
                  {killH > 0 && (
                    <rect
                      x={x}
                      y={CHART_H - 2 - killH}
                      width={BAR_W}
                      height={killH}
                      fill={isSelected ? '#22c55e' : '#14532d'}
                      opacity={isSelected ? 1 : 0.85}
                    />
                  )}
                  {/* Leak segment (orange, stacked above kills) */}
                  {leakH > 0 && (
                    <rect
                      x={x}
                      y={CHART_H - 2 - killH - leakH}
                      width={BAR_W}
                      height={leakH}
                      fill={isSelected ? '#f97316' : '#7c2d12'}
                      opacity={isSelected ? 1 : 0.9}
                    />
                  )}
                </g>
              )
            })}

            {/* Saturation threshold — orange dashed vertical */}
            {curve.threshold && (() => {
              const tx = (curve.threshold - 1) * BAR_SLOT + BAR_W / 2
              return (
                <line
                  x1={tx} y1={0} x2={tx} y2={CHART_H}
                  stroke="#f97316"
                  strokeWidth={1.5}
                  strokeDasharray="3 2"
                  opacity={0.9}
                />
              )
            })()}

            {/* Selected inbound — white hairline */}
            {(() => {
              const sx = (inbound - 1) * BAR_SLOT + BAR_W / 2
              return (
                <line
                  x1={sx} y1={0} x2={sx} y2={CHART_H}
                  stroke="white"
                  strokeWidth={1}
                  opacity={0.25}
                />
              )
            })()}

            {/* Baseline */}
            <line
              x1={0} y1={CHART_H - 1} x2={CHART_W} y2={CHART_H - 1}
              stroke="#1f2937"
              strokeWidth={1}
            />
          </svg>
        </div>

        <div className="flex justify-between items-center text-[8px] font-mono store-text-muted mt-1">
          <span>1 drone</span>
          <span className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-sm bg-green-800" />
              kills
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-sm bg-orange-900" />
              leakers
            </span>
          </span>
          <span>{MAX_INBOUND} drones</span>
        </div>
      </div>

      {/* ── Key metrics ────────────────────────────────────────────── */}
      {current && (
        <div className="grid grid-cols-3 gap-1.5">
          <div className="store-panel-inner rounded-lg p-2 text-center border border-[var(--store-line)]">
            <p className="text-[8px] font-mono store-text-muted uppercase mb-1">Kills</p>
            <p className="text-[22px] font-bold font-mono text-emerald-400 tabular-nums leading-none">
              {current.kills}
            </p>
          </div>
          <div className="store-panel-inner rounded-lg p-2 text-center border border-[var(--store-line)]">
            <p className="text-[8px] font-mono store-text-muted uppercase mb-1">Leakers</p>
            <p
              className={cn(
                'text-[22px] font-bold font-mono tabular-nums leading-none',
                current.leakers === 0  ? 'text-emerald-400'
                  : current.leakers <= 2 ? 'text-orange-400'
                  : 'text-red-400',
              )}
            >
              {current.leakers}
            </p>
          </div>
          <div className="store-panel-inner rounded-lg p-2 text-center border border-[var(--store-line)]">
            <p className="text-[8px] font-mono store-text-muted uppercase mb-1">Leak %</p>
            <p
              className={cn(
                'text-[22px] font-bold font-mono tabular-nums leading-none',
                current.leakProb === 0   ? 'text-emerald-400'
                  : current.leakProb < 0.3  ? 'text-orange-400'
                  : 'text-red-400',
              )}
            >
              {Math.round(current.leakProb * 100)}
            </p>
          </div>
        </div>
      )}

      {/* ── Magazine status bar ────────────────────────────────────── */}
      {current && (
        <div
          className={cn(
            'rounded-lg border px-3 py-2 flex items-start gap-2',
            current.exhausted
              ? 'border-red-800/60 bg-red-950/25'
              : 'border-[var(--store-line)] bg-[var(--store-surface-2)]',
          )}
        >
          <span
            className={cn(
              'text-base mt-0.5 shrink-0',
              current.exhausted ? 'text-red-400' : 'text-emerald-400',
            )}
          >
            {current.exhausted ? '⬛' : '▣'}
          </span>
          <div>
            <p
              className={cn(
                'text-[10px] font-mono font-semibold leading-none mb-0.5',
                current.exhausted ? 'text-red-400' : 'text-emerald-400',
              )}
            >
              {current.exhausted ? 'MAGAZINE EXHAUSTED' : 'MAGAZINE ADEQUATE'}
            </p>
            <p className="text-[9px] font-mono store-text-muted leading-relaxed">
              {current.exhausted
                ? `Add point-defence or RF layer before ${inbound}+ inbound.`
                : `${magLabel} rounds sufficient for ${inbound}× inbound at ${Math.round(effectivePk * 100)}% Pk.`}
            </p>
          </div>
        </div>
      )}

      {/* ── Doctrine note ──────────────────────────────────────────── */}
      {current && current.leakers > 0 && (
        <div className="rounded-lg border border-orange-800/40 bg-orange-950/15 px-3 py-2">
          <p className="text-[8px] font-mono uppercase text-orange-400 mb-0.5 tracking-wider">
            Doctrine
          </p>
          <p className="text-[9px] font-mono text-orange-200/75 leading-relaxed">
            {current.exhausted
              ? 'Magazine exhausted before swarm neutralised — shift lowest-cost effector (RF/HPM) to lead layer, preserve kinetic for terminal-phase threats.'
              : `${current.leakers} leaker(s) at ${inbound} inbound — tighten cueing geometry or add RF suppression layer uprange of the engagement zone.`}
          </p>
        </div>
      )}

      <p className="text-[7px] font-mono store-text-muted pt-0.5">
        Pk figures OSINT-derived · training estimates only · not accredited or certified
      </p>
    </StorePanel>
  )
}
