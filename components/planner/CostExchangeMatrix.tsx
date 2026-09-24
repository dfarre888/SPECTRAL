'use client'

import { useMemo, useState, type ReactNode } from 'react'
import {
  COST_ENTRIES,
  allExchanges,
  costById,
  formatRatio,
  formatUsd,
  recommendedAgainst,
  type CostConfidenceBand,
  type CostInterval,
  type ExchangeRatioBand,
  type ExchangeVerdict,
} from '@/lib/planner/cost-model'
import { plainCopy } from '@/lib/planner/days-of-fire'
import { DataTable, type DataColumn } from '@/components/ui/DataTable'

/**
 * Verdict colour lives on the value (ratio text and a hairline tag), never on
 * the row. Green is a good trade, neutral is tolerable, amber is a bad trade,
 * red is one no magazine can sustain.
 */
const VERDICT: Record<ExchangeVerdict, { label: string; tag: string; ink: string }> = {
  favourable: { label: 'Favourable', tag: 'tag green', ink: '#6EE7A0' },
  acceptable: { label: 'Acceptable', tag: 'tag', ink: 'var(--store-ink)' },
  unfavourable: { label: 'Unfavourable', tag: 'tag amber', ink: '#FCD34D' },
  catastrophic: { label: 'Catastrophic', tag: 'tag red', ink: '#FF8A98' },
}

const VERDICT_RANK: Record<ExchangeVerdict, number> = {
  favourable: 0,
  acceptable: 1,
  unfavourable: 2,
  catastrophic: 3,
}

const CONF_LABEL: Record<CostConfidenceBand, string> = {
  consensus: 'Sources agree',
  contested: 'Sources disagree',
  order_of_magnitude: 'Order of magnitude',
}

/** `.dt thead th` sets text-align:left above Tailwind's `text-right`; force it for numeric headers. */
const RIGHT = '!text-right'

const usdBand = (c: CostInterval) => `${formatUsd(c.loUsd)}–${formatUsd(c.hiUsd)}`
const ratioBand = (x: ExchangeRatioBand) => `${formatRatio(x.loRatio)} – ${formatRatio(x.hiRatio)}`

function VerdictTag({ v }: { v: ExchangeVerdict }) {
  return <span className={VERDICT[v].tag}>{VERDICT[v].label}</span>
}

/**
 * Rank is the model's cheapest-first order, which is also the order of the
 * exchange-ratio column, so it rides inside the pinned effector cell instead
 * of spending a column.
 */
function layerColumns(rankOf: (x: ExchangeRatioBand) => number | undefined): DataColumn<ExchangeRatioBand>[] {
  return [
    {
      key: 'effector',
      header: 'Effector',
      sticky: true,
      sortValue: (x) => x.effector.label,
      cell: (x) => (
        <span className="flex min-w-[260px] items-center gap-3" title={`${x.effector.label}: ${plainCopy(x.effector.note)}`}>
          <span className="w-5 shrink-0 text-right font-mono text-xs tabular-nums store-text-muted">{rankOf(x)}</span>
          <span className="primary truncate">{x.effector.label}</span>
          {x.effector.reusable ? <span className="tag shrink-0">Reusable</span> : null}
        </span>
      ),
    },
    {
      key: 'cost',
      header: 'Cost per shot',
      align: 'right',
      headerClassName: RIGHT,
      width: 160,
      sortValue: (x) => x.effector.perEngagementUsd.loUsd,
      cell: (x) => <span className="text-[var(--store-ink-soft)]">{usdBand(x.effector.perEngagementUsd)}</span>,
    },
    {
      key: 'ratio',
      header: 'Exchange ratio',
      align: 'right',
      headerClassName: RIGHT,
      width: 200,
      sortValue: (x) => x.loRatio,
      cell: (x) => <span style={{ color: VERDICT[x.verdict].ink }}>{ratioBand(x)}</span>,
    },
    {
      key: 'verdict',
      header: 'Verdict',
      width: 150,
      sortValue: (x) => VERDICT_RANK[x.verdict],
      cell: (x) => <VerdictTag v={x.verdict} />,
    },
  ]
}

const MATRIX_COLUMNS: DataColumn<ExchangeRatioBand>[] = [
  {
    key: 'effector',
    header: 'Effector',
    sticky: true,
    sortValue: (x) => x.effector.label,
    // Names wrap rather than truncate: the table fits the frame by wrapping
    // these two text columns before it ever scrolls sideways.
    cell: (x) => (
      <span className="primary block min-w-[170px] leading-snug" title={plainCopy(x.effector.note)}>
        {x.effector.label}
      </span>
    ),
  },
  {
    key: 'threat',
    header: 'Threat',
    sortValue: (x) => x.threat.label,
    cell: (x) => (
      <span className="block min-w-[150px] leading-snug text-[var(--store-ink-soft)]" title={plainCopy(x.threat.note)}>
        {x.threat.label}
      </span>
    ),
  },
  {
    key: 'ecost',
    header: 'Shot cost',
    align: 'right',
    headerClassName: RIGHT,
    width: 124,
    sortValue: (x) => x.effector.perEngagementUsd.loUsd,
    cell: (x) => usdBand(x.effector.perEngagementUsd),
  },
  {
    key: 'tcost',
    header: 'Threat cost',
    align: 'right',
    headerClassName: RIGHT,
    width: 124,
    sortValue: (x) => x.threat.perEngagementUsd.loUsd,
    cell: (x) => usdBand(x.threat.perEngagementUsd),
  },
  {
    key: 'ratio',
    header: 'Exchange ratio',
    align: 'right',
    headerClassName: RIGHT,
    width: 168,
    sortValue: (x) => x.loRatio,
    cell: (x) => <span style={{ color: VERDICT[x.verdict].ink }}>{ratioBand(x)}</span>,
  },
  {
    key: 'verdict',
    header: 'Verdict',
    width: 128,
    sortValue: (x) => VERDICT_RANK[x.verdict],
    cell: (x) => <VerdictTag v={x.verdict} />,
  },
  {
    key: 'conf',
    header: 'Cost basis',
    width: 150,
    sortValue: (x) => x.confidence,
    cell: (x) => (
      <span className={x.confidence === 'consensus' ? 'store-text-muted' : 'store-text-body'}>
        {CONF_LABEL[x.confidence]}
      </span>
    ),
  },
]

function PaneHead({ title, meta, children }: { title: string; meta?: string; children?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="store-display text-[17px] font-semibold tracking-[-0.01em] text-[var(--store-ink)]">{title}</h2>
        {meta ? <p className="mt-1 text-[13px] store-text-body">{meta}</p> : null}
      </div>
      {children}
    </div>
  )
}

export function CostExchangeMatrix({ afterRanking }: { afterRanking?: ReactNode } = {}) {
  const threats = useMemo(() => COST_ENTRIES.filter((c) => c.side === 'threat'), [])
  const [threatId, setThreatId] = useState(threats[0]?.id ?? 'shahed-136')
  const [showAll, setShowAll] = useState(false)

  const threat = costById(threatId)
  const layered = useMemo(() => recommendedAgainst(threatId, 99), [threatId])
  const everything = useMemo(() => allExchanges(), [])

  const columnsForLayer = useMemo(() => {
    const order = new Map(layered.map((x, i) => [x.effector.id, i + 1]))
    return layerColumns((x) => order.get(x.effector.id))
  }, [layered])

  return (
    <div className="space-y-12">
      {/* Layering recommendation for one threat */}
      <section>
        <PaneHead
          title="What to shoot it with, cheapest first"
          meta="Pick a threat. Effectors are ranked by the best-case exchange ratio against it."
        />

        <div className="seg mb-5 max-w-full flex-wrap" role="group" aria-label="Threat">
          {threats.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={threatId === t.id}
              onClick={() => setThreatId(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {threat && (
          <div className="mb-5 grid gap-x-8 gap-y-3 md:grid-cols-[auto_minmax(0,1fr)]">
            <div>
              <p className="text-xs store-text-muted">Cost per {threat.label}</p>
              <p className="mt-1.5 font-mono text-[28px] leading-none tabular-nums text-[var(--wb-red)]">
                {usdBand(threat.perEngagementUsd)}
              </p>
              <p className="mt-2">
                <span className={threat.confidence === 'consensus' ? 'tag green' : 'tag amber'}>
                  {CONF_LABEL[threat.confidence]}
                </span>
              </p>
            </div>
            <p className="max-w-[80ch] self-center text-[13px] leading-relaxed store-text-body">{plainCopy(threat.note)}</p>
          </div>
        )}

        <DataTable
          rows={layered}
          columns={columnsForLayer}
          rowKey={(x) => x.effector.id}
          caption={`Effectors against ${threat?.label ?? threatId}, cheapest exchange first`}
          maxHeight="none"
        />

        <p className="mt-3 max-w-[100ch] text-xs leading-relaxed store-text-muted">
          Ratio is cost per shot over cost per threat, shown as a band because published costs disagree.
          Reusable effects are priced at marginal cost per engagement, not acquisition; that asymmetry is
          the argument for putting them first against cheap mass. The verdict is judged on the optimistic
          end: if even the best reading is bad, the exchange is bad.
        </p>
      </section>

      {afterRanking}

      {/* Full matrix */}
      <section>
        <PaneHead
          title="Full matrix"
          meta={`${everything.length} threat and effector pairings, worst exchange first. Click a header to sort.`}
        >
          <div className="seg sm" role="group" aria-label="Rows shown">
            <button type="button" aria-pressed={!showAll} onClick={() => setShowAll(false)}>
              Worst 12
            </button>
            <button type="button" aria-pressed={showAll} onClick={() => setShowAll(true)}>
              All {everything.length}
            </button>
          </div>
        </PaneHead>

        <DataTable
          rows={showAll ? everything : everything.slice(0, 12)}
          columns={MATRIX_COLUMNS}
          rowKey={(x) => `${x.effector.id}-${x.threat.id}`}
          caption="All threat and effector exchange pairings"
          maxHeight="calc(100vh - 180px)"
        />

        <p className="mt-3 max-w-[100ch] text-xs leading-relaxed store-text-muted">
          Costs are OSINT: US budget documents where published, press reporting and manufacturer
          statements otherwise. Hover an effector or threat for the basis. No cost here is a
          procurement figure and none should be quoted as one.
        </p>
      </section>
    </div>
  )
}
