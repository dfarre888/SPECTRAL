'use client'

import { useMemo, useState } from 'react'
import { clsx } from 'clsx'
import {
  COST_ENTRIES,
  allExchanges,
  costById,
  formatRatio,
  formatUsd,
  recommendedAgainst,
  type ExchangeVerdict,
} from '@/lib/planner/cost-model'

const VERDICT_TONE: Record<ExchangeVerdict, { text: string; bg: string; border: string }> = {
  favourable: { text: '#86efac', bg: 'rgba(74,222,128,0.10)', border: 'rgba(74,222,128,0.30)' },
  acceptable: { text: '#fde047', bg: 'rgba(250,204,21,0.10)', border: 'rgba(250,204,21,0.30)' },
  unfavourable: { text: '#fdba74', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.35)' },
  catastrophic: { text: '#fca5a5', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.40)' },
}

const CONF_LABEL: Record<string, string> = {
  consensus: 'sources agree',
  contested: 'sources disagree',
  order_of_magnitude: 'order of magnitude only',
}

export function CostExchangeMatrix() {
  const threats = useMemo(() => COST_ENTRIES.filter((c) => c.side === 'threat'), [])
  const [threatId, setThreatId] = useState(threats[0]?.id ?? 'shahed-136')
  const [showAll, setShowAll] = useState(false)

  const threat = costById(threatId)
  const layered = useMemo(() => recommendedAgainst(threatId, 99), [threatId])
  const everything = useMemo(() => allExchanges(), [])

  return (
    <div className="space-y-4">
      {/* ── Layering recommendation for one threat ───────────────────────── */}
      <div className="store-panel rounded-2xl p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--store-accent)]">
              Layering
            </p>
            <h3 className="store-display text-sm font-semibold text-white mt-0.5">
              What to shoot it with, cheapest first
            </h3>
          </div>
          <div className="flex flex-wrap gap-1">
            {threats.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setThreatId(t.id)}
                className={clsx(
                  'px-2 py-1 rounded-lg text-[10px] font-mono border transition-colors',
                  threatId === t.id
                    ? 'nav-item-active'
                    : 'store-panel-inner store-text-body hover:border-[var(--store-accent-border)]',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {threat && (
          <p className="text-[11px] store-text-body mb-3">
            <span className="font-mono text-white">
              {formatUsd(threat.perEngagementUsd.loUsd)}–{formatUsd(threat.perEngagementUsd.hiUsd)}
            </span>{' '}
            per {threat.label} · {CONF_LABEL[threat.confidence]}. {threat.note}
          </p>
        )}

        <div className="space-y-1.5">
          {layered.map((x) => {
            const tone = VERDICT_TONE[x.verdict]
            return (
              <div
                key={x.effector.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2"
                style={{ background: tone.bg, borderColor: tone.border }}
              >
                <span className="text-[12px] text-slate-100 font-medium min-w-[210px] flex-1">
                  {x.effector.label}
                  {x.effector.reusable && (
                    <span className="ml-1.5 text-[9px] font-mono store-text-muted">reusable</span>
                  )}
                </span>
                <span className="text-[11px] font-mono store-text-muted w-[110px]">
                  {formatUsd(x.effector.perEngagementUsd.loUsd)}–
                  {formatUsd(x.effector.perEngagementUsd.hiUsd)}
                </span>
                <span className="text-[12px] font-mono font-semibold w-[150px]" style={{ color: tone.text }}>
                  {formatRatio(x.loRatio)} – {formatRatio(x.hiRatio)}
                </span>
                <span className="text-[10px] font-mono uppercase" style={{ color: tone.text }}>
                  {x.verdict}
                </span>
              </div>
            )
          })}
        </div>

        <p className="mt-3 text-[10px] store-text-muted leading-relaxed">
          Ratio is cost per shot over cost per threat, shown as a band because published costs
          disagree. Reusable effects are priced at marginal cost per engagement, not acquisition —
          that asymmetry is the whole argument for putting them first against cheap mass. The verdict
          is judged on the optimistic end: if even the best reading is bad, the exchange is bad.
        </p>
      </div>

      {/* ── Full matrix ──────────────────────────────────────────────────── */}
      <div className="store-panel rounded-2xl p-4">
        <div className="flex items-baseline justify-between gap-2 mb-3">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--store-accent)]">
              Full matrix
            </p>
            <h3 className="store-display text-sm font-semibold text-white mt-0.5">
              {everything.length} pairings, worst exchange first
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="px-2.5 py-1 rounded-lg text-[10px] font-mono store-panel-inner store-text-body border border-transparent hover:border-[var(--store-accent-border)]"
          >
            {showAll ? 'Show worst 12' : `Show all ${everything.length}`}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '30%' }} />
              <col style={{ width: '26%' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '22%' }} />
            </colgroup>
            <thead>
              <tr className="border-b border-[var(--store-line)]">
                {['Effector', 'Threat', 'Exchange band', 'Verdict'].map((h) => (
                  <th key={h} className="py-1.5 text-[10px] font-mono uppercase tracking-wider store-text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(showAll ? everything : everything.slice(0, 12)).map((x) => {
                const tone = VERDICT_TONE[x.verdict]
                return (
                  <tr
                    key={`${x.effector.id}-${x.threat.id}`}
                    className="border-b border-[var(--store-line)]/50"
                    title={`${x.effector.note}\n\n${x.threat.note}`}
                  >
                    <td className="py-1.5 pr-2 text-[12px] text-slate-100 truncate">{x.effector.label}</td>
                    <td className="py-1.5 pr-2 text-[12px] store-text-body truncate">{x.threat.label}</td>
                    <td className="py-1.5 pr-2 text-[11px] font-mono" style={{ color: tone.text }}>
                      {formatRatio(x.loRatio)} – {formatRatio(x.hiRatio)}
                    </td>
                    <td className="py-1.5 text-[10px] font-mono uppercase" style={{ color: tone.text }}>
                      {x.verdict}
                      <span className="ml-1.5 store-text-muted normal-case">
                        {x.confidence === 'consensus' ? '' : '·'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[10px] store-text-muted leading-relaxed">
          Costs are OSINT: US budget documents where published, press reporting and manufacturer
          statements otherwise. Hover a row for the basis. No cost here is a procurement figure and
          none should be quoted as one.
        </p>
      </div>
    </div>
  )
}
