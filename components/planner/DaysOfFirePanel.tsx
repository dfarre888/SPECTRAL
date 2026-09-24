'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { COST_ENTRIES, costById, formatRatio, formatUsd } from '@/lib/planner/cost-model'
import {
  DOF_MAX_DAYS,
  DOF_PRESETS,
  compareReusable,
  isBurstWeapon,
  plainCopy,
  ladderOptions,
  layersFromSettings,
  raidSchedule,
  runDaysOfFire,
  settingFor,
  shortLabel,
  threatsWithLadder,
  type Band,
  type DofDay,
  type DofLayer,
  type DofLayerSetting,
  type DofResult,
  type DofSettings,
  type LadderOption,
} from '@/lib/planner/days-of-fire'
import { describeEvidence, type PkEvidence } from '@/lib/planner/days-of-fire-pk'
import { DataTable, type DataColumn } from '@/components/ui/DataTable'
import { DOF_VIZ_STYLE, DaysOfFireChart, fmtCount, seriesVar } from '@/components/planner/DaysOfFireChart'

const RIGHT = '!text-right'

function usd(v: number): string {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(v >= 10_000_000_000 ? 0 : 1)}B`
  return formatUsd(v)
}
const usdBand = (b: Band) => (Math.abs(b.hi - b.lo) < 1 ? usd(b.lo) : `${usd(b.lo)}–${usd(b.hi)}`)
const countBand = (b: Band) => {
  const lo = fmtCount(b.lo)
  const hi = fmtCount(b.hi)
  return lo === hi ? lo : `${lo}–${hi}`
}
const ratioBand = (b: Band) => (b.hi <= 0 ? 'n/a' : `${formatRatio(b.lo)} to ${formatRatio(b.hi)}`)
const pkBand = (lo: number, hi: number) => (Math.abs(hi - lo) < 0.005 ? lo.toFixed(2) : `${lo.toFixed(2)}–${hi.toFixed(2)}`)

function AssumptionTag() {
  return <span className="tag amber">Planning assumption</span>
}

function Num({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  placeholder,
  srLabel,
}: {
  label?: string
  value: number | null
  onChange: (n: number | null) => void
  min?: number
  max?: number
  step?: number
  placeholder?: string
  srLabel?: string
}) {
  const field = (
    <input
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      step={step}
      value={value ?? ''}
      placeholder={placeholder}
      aria-label={srLabel ?? label}
      onChange={(e) => {
        const raw = e.target.value
        if (raw === '') return onChange(null)
        const n = Number(raw)
        if (Number.isFinite(n)) onChange(max != null ? Math.min(max, Math.max(min, n)) : Math.max(min, n))
      }}
      className="glass-field h-9 w-full min-w-0 px-3 text-right font-mono text-[13px] tabular-nums"
    />
  )
  if (!label) return field
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[12px] store-text-muted">{label}</span>
      {field}
    </label>
  )
}

function Group({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <fieldset className={className}>
      <legend className="mb-3 flex w-full flex-wrap items-center gap-2">
        <span className="text-[13px] font-semibold text-[var(--store-ink)]">{title}</span>
        <AssumptionTag />
      </legend>
      {children}
    </fieldset>
  )
}

// ── Layer rows ──────────────────────────────────────────────────────────────

function LayerRow({
  option,
  setting,
  onChange,
}: {
  option: LadderOption
  setting: DofLayerSetting
  onChange: (next: Partial<DofLayerSetting>) => void
}) {
  const e = option.effector
  const name = shortLabel(e.id, e.label)
  const burst = isBurstWeapon(e.id)
  const cost = e.perEngagementUsd
  const costText =
    cost.loUsd === cost.hiUsd ? usd(cost.loUsd) : `${usd(cost.loUsd)}–${usd(cost.hiUsd)}`
  const dim = setting.on ? '' : 'opacity-45'
  return (
    <div
      role="row"
      className="grid grid-cols-2 items-center gap-x-3 gap-y-2 border-t border-[var(--store-line)] py-2.5 md:grid-cols-[minmax(0,1fr)_repeat(4,minmax(84px,128px))]"
    >
      <div role="cell" className="col-span-2 flex min-w-0 items-center gap-3 md:col-span-1">
        <button
          type="button"
          className="btn-e xs shrink-0"
          aria-pressed={setting.on}
          aria-label={`${setting.on ? 'Remove' : 'Add'} ${e.label}`}
          onClick={() => onChange({ on: !setting.on })}
        >
          {setting.on ? 'On' : 'Off'}
        </button>
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
              style={e.reusable ? undefined : { background: seriesVar(e.id) }}
            />
            <span className="truncate text-[13px] text-[var(--store-ink)]" title={e.label}>
              {name}
            </span>
            {e.reusable ? <span className="tag shrink-0">Reusable</span> : null}
          </span>
          <span
            className="mt-0.5 block font-mono text-[11.5px] leading-snug store-text-muted"
            title={plainCopy(`Pk records against this threat:\n${describeEvidence(option.pk.records)}\n\nCost: ${e.note}`)}
          >
            Pk {pkBand(option.pk.lo, option.pk.hi)} · {costText}{burst ? ' a round' : ''}
          </span>
        </span>
      </div>

      <div role="cell" className={dim}>
        <span className="mb-1 block text-[11.5px] store-text-muted md:sr-only">On hand, rounds</span>
        {e.reusable ? (
          <span className="block text-right text-[12px] store-text-muted">Reusable</span>
        ) : (
          <Num value={setting.magazine} onChange={(n) => onChange({ magazine: n ?? 0 })} srLabel={`${name} rounds on hand`} />
        )}
      </div>
      <div role="cell" className={dim}>
        <span className="mb-1 block text-[11.5px] store-text-muted md:sr-only">Rounds per burst</span>
        {burst ? (
          <Num
            value={setting.roundsPerEngagement}
            min={1}
            onChange={(n) => onChange({ roundsPerEngagement: Math.max(1, n ?? 1) })}
            srLabel={`${name} rounds per burst`}
          />
        ) : (
          <span className="block pr-3 text-right font-mono text-[13px] store-text-muted">1</span>
        )}
      </div>
      <div role="cell" className={dim}>
        <span className="mb-1 block text-[11.5px] store-text-muted md:sr-only">Most per night</span>
        <Num
          value={setting.maxPerNight}
          placeholder="No limit"
          onChange={(n) => onChange({ maxPerNight: n })}
          srLabel={`${name} most engagements per night`}
        />
      </div>
      <div role="cell" className={dim}>
        <span className="mb-1 block text-[11.5px] store-text-muted md:sr-only">Resupply, rounds a day</span>
        {e.reusable ? (
          <span className="block text-right text-[12px] store-text-muted">Not needed</span>
        ) : (
          <Num value={setting.resupplyPerDay} onChange={(n) => onChange({ resupplyPerDay: n ?? 0 })} srLabel={`${name} resupply rounds per day`} />
        )}
      </div>
    </div>
  )
}

// ── Tables ──────────────────────────────────────────────────────────────────

function dayColumns(result: DofResult, pkCase: 'low' | 'high'): DataColumn<DofDay>[] {
  const run = pkCase === 'low' ? result.low : result.high
  const layerCols: DataColumn<DofDay>[] = result.layers.map((l: DofLayer) => ({
    key: l.id,
    header: l.reusable ? `${shortLabel(l.id, l.label)} engaged` : `${shortLabel(l.id, l.label)} engaged, rounds left`,
    align: 'right',
    headerClassName: RIGHT,
    width: l.reusable ? 130 : 170,
    sortValue: (d) => run.nights[d.day - 1]?.layers.find((x) => x.id === l.id)?.engaged ?? 0,
    cell: (d) => {
      const ln = run.nights[d.day - 1]?.layers.find((x) => x.id === l.id)
      if (!ln) return null
      if (l.reusable) return <span>{fmtCount(ln.engaged)}</span>
      return (
        <span className="whitespace-nowrap" title={`${fmtCount(ln.roundsFired)} rounds fired, ${fmtCount(ln.roundsLeft)} rounds left`}>
          {fmtCount(ln.engaged)}
          <span className="mx-1.5 store-text-muted" aria-hidden>·</span>
          <span className={ln.dry ? 'text-[var(--wb-red)]' : 'store-text-muted'}>
            {ln.dry ? 'dry' : `${fmtCount(ln.roundsLeft)} left`}
          </span>
        </span>
      )
    },
  }))
  return [
    { key: 'day', header: 'Day', sticky: true, width: 64, sortValue: (d) => d.day, cell: (d) => <span className="primary font-mono">{d.day}</span> },
    { key: 'raid', header: 'Inbound', align: 'right', headerClassName: RIGHT, width: 90, sortValue: (d) => d.raid, cell: (d) => fmtCount(d.raid) },
    ...layerCols,
    {
      key: 'leak',
      header: 'Leakers',
      align: 'right',
      headerClassName: RIGHT,
      width: 110,
      sortValue: (d) => d.leakers.hi,
      cell: (d) => <span className={d.leakers.hi >= 0.5 ? 'text-[var(--wb-red)]' : ''}>{countBand(d.leakers)}</span>,
    },
    {
      key: 'cost',
      header: 'Spent to date',
      align: 'right',
      headerClassName: RIGHT,
      width: 150,
      sortValue: (d) => d.cumulativeCostUsd.hi,
      cell: (d) => usdBand(d.cumulativeCostUsd),
    },
    {
      key: 'exch',
      header: 'Exchange to date',
      align: 'right',
      headerClassName: RIGHT,
      width: 170,
      sortValue: (d) => d.exchange.hi,
      cell: (d) => ratioBand(d.exchange),
    },
  ]
}

interface CompareRow {
  key: string
  label: string
  result: DofResult
}

/** Planning case on the line, best case on the meta line under it. */
function DayPair({ lo, hi }: { lo: number | null; hi: number | null }) {
  return (
    <span className="block leading-snug">
      <span className="font-mono">{lo != null ? `Day ${lo}` : 'None'}</span>
      <span className="block text-[11.5px] store-text-muted">High Pk: {hi != null ? `day ${hi}` : 'none'}</span>
    </span>
  )
}

const COMPARE_COLUMNS: DataColumn<CompareRow>[] = [
  { key: 'cfg', header: 'Ladder', sticky: true, cell: (r) => <span className="primary block min-w-[200px] leading-snug">{r.label}</span> },
  {
    key: 'dry',
    header: 'First magazine dry',
    width: 170,
    cell: (r) => <DayPair lo={r.result.low.firstDry?.day ?? null} hi={r.result.high.firstDry?.day ?? null} />,
  },
  {
    key: 'leakday',
    header: 'First leaker',
    width: 170,
    cell: (r) => <DayPair lo={r.result.low.firstLeakerDay} hi={r.result.high.firstLeakerDay} />,
  },
  { key: 'leak', header: 'Leakers', align: 'right', headerClassName: RIGHT, width: 110, cell: (r) => countBand(r.result.totals.leakers) },
  { key: 'cost', header: 'Total spend', align: 'right', headerClassName: RIGHT, width: 150, cell: (r) => usdBand(r.result.totals.costUsd) },
  { key: 'exch', header: 'Exchange', align: 'right', headerClassName: RIGHT, width: 160, cell: (r) => ratioBand(r.result.totals.exchange) },
]

// ── Panel ───────────────────────────────────────────────────────────────────

interface Props {
  evidence: PkEvidence[]
  /** Defeat Matrix records behind the evidence; 0 when the database was unreachable. */
  defeatMatrixRecords: number
}

export function DaysOfFirePanel({ evidence, defeatMatrixRecords }: Props) {
  const threats = useMemo(() => threatsWithLadder(evidence), [evidence])
  const first = DOF_PRESETS.find((p) => threats.some((t) => t.id === p.threatId)) ?? null

  const [presetId, setPresetId] = useState<string | null>(first?.id ?? null)
  const [threatId, setThreatId] = useState<string>(first?.threatId ?? threats[0]?.id ?? '')
  const [opening, setOpening] = useState<number>(first?.openingNight ?? 10)
  const [each, setEach] = useState<number>(first?.eachNight ?? 5)
  const [days, setDays] = useState<number>(first?.days ?? 14)
  const [settings, setSettings] = useState<DofSettings>(first?.settings ?? {})
  const [pkCase, setPkCase] = useState<'low' | 'high'>('low')

  const threat = costById(threatId)
  const options = useMemo(() => ladderOptions(threatId, evidence), [threatId, evidence])
  const raids = useMemo(() => raidSchedule(opening, each, days), [opening, each, days])
  const layers = useMemo(() => layersFromSettings(options, settings), [options, settings])
  const result = useMemo(
    () => (threat ? runDaysOfFire({ threatCostUsd: threat.perEngagementUsd, raids, layers }) : null),
    [threat, raids, layers],
  )
  const comparison = useMemo(
    () => (threat ? compareReusable(options, settings, raids, threat.perEngagementUsd) : null),
    [threat, options, settings, raids],
  )
  const unrecorded = useMemo(
    () =>
      COST_ENTRIES.filter((c) => c.side === 'effector' && !options.some((o) => o.effector.id === c.id)).map((c) =>
        shortLabel(c.id, c.label),
      ),
    [options],
  )

  const preset = DOF_PRESETS.find((p) => p.id === presetId) ?? null
  const custom = () => setPresetId(null)

  const applyPreset = (id: string) => {
    const p = DOF_PRESETS.find((x) => x.id === id)
    if (!p) return
    setPresetId(p.id)
    setThreatId(p.threatId)
    setOpening(p.openingNight)
    setEach(p.eachNight)
    setDays(p.days)
    setSettings(p.settings)
  }

  const updateLayer = (effectorId: string, next: Partial<DofLayerSetting>) => {
    const entry = COST_ENTRIES.find((c) => c.id === effectorId)
    if (!entry) return
    setSettings((s) => ({ ...s, [effectorId]: { ...settingFor(s, entry), ...next } }))
    custom()
  }

  if (!threats.length || !threat || !result) {
    return (
      <p className="max-w-[80ch] text-[13px] store-text-body">
        No Pk is on record for any effector in the cost table, so there is nothing to run. Check the Defeat Matrix
        connection.
      </p>
    )
  }

  const expendableOn = result.layers.filter((l) => !l.reusable)
  const totals = result.totals

  const dryHeadline = (() => {
    const lo = result.low.firstDry
    const hi = result.high.firstDry
    if (!expendableOn.length) return { v: 'n/a', d: 'No expendable layer switched on' }
    if (!lo) return { v: 'None', d: `No magazine runs dry in ${days} days, even at low Pk` }
    const who = shortLabel(lo.layerId)
    const best = hi ? (hi.day === lo.day ? 'same day at high Pk' : `day ${hi.day} at high Pk`) : `none at high Pk`
    return { v: `Day ${lo.day}`, d: `${who} first, at low Pk. ${best[0].toUpperCase()}${best.slice(1)}.` }
  })()

  const leakHeadline = (() => {
    const lo = result.low.firstLeakerDay
    const hi = result.high.firstLeakerDay
    const first =
      lo == null
        ? 'No threat expected through at low Pk'
        : hi === lo
          ? `First expected through by day ${lo} at either end of the Pk band`
          : `First expected through by day ${lo} at low Pk${hi != null ? `, day ${hi} at high` : ''}`
    return { v: countBand(totals.leakers), d: first }
  })()

  const compareRows: CompareRow[] = comparison
    ? [
        {
          key: 'with',
          label: `${comparison.added ? 'Adding ' : 'With '}${comparison.reusableIds.map((id) => shortLabel(id)).join(' and ')}`,
          result: comparison.withReusable,
        },
        { key: 'without', label: 'Kinetic layers only', result: comparison.kineticOnly },
      ]
    : []

  const matrixNote =
    defeatMatrixRecords > 0
      ? `${defeatMatrixRecords} Defeat Matrix records and the swarm effector table`
      : 'the swarm effector table only (Defeat Matrix unreachable)'

  return (
    <div className="dof-viz space-y-6">
      {/* Series colours for the chart and the layer swatches, both themes. */}
      <style dangerouslySetInnerHTML={{ __html: DOF_VIZ_STYLE }} />

      {/* Presets */}
      <div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Illustrative presets">
          {DOF_PRESETS.filter((p) => threats.some((t) => t.id === p.threatId)).map((p) => (
            <button key={p.id} type="button" className="btn-e sm" aria-pressed={presetId === p.id} onClick={() => applyPreset(p.id)}>
              {p.label}
            </button>
          ))}
        </div>
        <p className="mt-2.5 flex flex-wrap items-center gap-2 text-[12px] store-text-body">
          <span className="tag amber">Illustrative inputs</span>
          {preset ? preset.note : 'Custom inputs. Every number you set here is a planning assumption, not a holding.'}
        </p>
      </div>

      {/* Threat */}
      <div className="seg max-w-full flex-wrap" role="group" aria-label="Threat">
        {threats.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={threatId === t.id}
            onClick={() => {
              setThreatId(t.id)
              custom()
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Inputs */}
      <div className="store-panel grid gap-x-8 gap-y-6 rounded-2xl p-5 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
        <Group title="Raid">
          <div className="grid grid-cols-3 items-end gap-3 lg:grid-cols-1">
            <Num
              label="Opening night, threats"
              value={opening}
              max={5_000}
              onChange={(n) => {
                setOpening(n ?? 0)
                custom()
              }}
            />
            <Num
              label="Each night after"
              value={each}
              max={5_000}
              onChange={(n) => {
                setEach(n ?? 0)
                custom()
              }}
            />
            <Num
              label="Days"
              value={days}
              min={1}
              max={DOF_MAX_DAYS}
              onChange={(n) => {
                setDays(Math.max(1, n ?? 1))
                custom()
              }}
            />
          </div>
          <p className="mt-3 text-[12px] store-text-muted">
            <span className="font-mono text-[var(--store-ink-soft)]">{totals.threats.toLocaleString('en-AU')}</span> threats in
            total, costing the attacker <span className="font-mono text-[var(--store-ink-soft)]">{usdBand({ lo: totals.attackerCostUsd.lo, hi: totals.attackerCostUsd.hi })}</span>
          </p>
        </Group>

        <div className="min-w-0" role="table" aria-label="Layers, magazines and resupply">
          <div className="mb-2 hidden grid-cols-[minmax(0,1fr)_repeat(4,minmax(84px,128px))] items-end gap-x-3 md:grid" role="row">
            <span role="columnheader" className="pb-1.5 text-[13px] font-semibold text-[var(--store-ink)]">
              Layers, cheapest first
            </span>
            <span role="columnheader" className="col-span-3 border-b border-[var(--store-line)] pb-1.5">
              <span className="block text-[13px] font-semibold text-[var(--store-ink)]">Magazines</span>
              <span className="mt-1.5 block"><AssumptionTag /></span>
            </span>
            <span role="columnheader" className="border-b border-[var(--store-line)] pb-1.5">
              <span className="block text-[13px] font-semibold text-[var(--store-ink)]">Resupply</span>
              <span className="mt-1.5 block"><AssumptionTag /></span>
            </span>
          </div>
          <div className="hidden grid-cols-[minmax(0,1fr)_repeat(4,minmax(84px,128px))] gap-x-3 pb-1.5 text-right text-[12px] store-text-muted md:grid" role="row">
            <span role="columnheader" className="text-left">Pk band and cost a shot, from data</span>
            <span role="columnheader">On hand, rounds</span>
            <span role="columnheader">Rounds per burst</span>
            <span role="columnheader">Most per night</span>
            <span role="columnheader">Rounds a day</span>
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-2 md:hidden">
            <span className="text-[13px] font-semibold text-[var(--store-ink)]">Layers, magazines and resupply</span>
            <AssumptionTag />
          </div>
          {options.map((o) => (
            <LayerRow key={o.effector.id} option={o} setting={settingFor(settings, o.effector)} onChange={(next) => updateLayer(o.effector.id, next)} />
          ))}
          <p className="mt-3 border-t border-[var(--store-line)] pt-3 text-[12px] leading-relaxed store-text-muted">
            {unrecorded.length ? `Not offered, no Pk on record against ${threat.label}: ${unrecorded.join(', ')}. ` : ''}
            One engagement per threat per layer. Survivors, and threats a layer has no rounds or time for, pass to the next
            layer up. Resupply lands before each night from day 2.
          </p>
        </div>
      </div>

      {/* Headline figures */}
      <div className="fc-inst border-y fc-hair min-[901px]:!grid-cols-3" aria-label="Days of fire headline figures">
        <div>
          <div className="k">First magazine dry</div>
          <div className="v">{dryHeadline.v}</div>
          <div className="d">{dryHeadline.d}</div>
        </div>
        <div>
          <div className="k">Total spend, USD</div>
          <div className="v" style={{ fontSize: 'clamp(24px, 2.4vw, 34px)' }}>{usdBand(totals.costUsd)}</div>
          <div className="d">
            Exchange {ratioBand(totals.exchange)} against attacker spend of {usdBand({ lo: totals.attackerCostUsd.lo, hi: totals.attackerCostUsd.hi })}
          </div>
        </div>
        <div>
          <div className="k">Expected leakers</div>
          <div className={totals.leakers.hi >= 1 ? 'v red' : 'v'}>
            {leakHeadline.v}
            <small>of {totals.threats.toLocaleString('en-AU')}</small>
          </div>
          <div className="d">{leakHeadline.d}</div>
        </div>
      </div>

      {/* Chart */}
      <div className="store-panel rounded-2xl p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[15px] font-semibold text-[var(--store-ink)]">Day by day</h3>
          <div className="seg sm" role="group" aria-label="Pk end shown">
            <button type="button" aria-pressed={pkCase === 'low'} onClick={() => setPkCase('low')}>
              Low Pk, planning case
            </button>
            <button type="button" aria-pressed={pkCase === 'high'} onClick={() => setPkCase('high')}>
              High Pk, best case
            </button>
          </div>
        </div>
        {result.layers.length ? (
          <DaysOfFireChart result={result} pkCase={pkCase} threatLabel={threat.label} />
        ) : (
          <p className="py-10 text-center text-[13px] store-text-body">Switch on at least one layer to see the magazines.</p>
        )}
        <p className="mt-3 text-[12px] leading-relaxed store-text-muted">
          Pk: lowest to highest on record against {threat.label}, from {matrixNote}. Cost: the OSINT bands above.
          Raids, magazines, limits and resupply: planning assumptions.
        </p>
      </div>

      {/* With and without the reusable layer */}
      {comparison && expendableOn.length ? (
        <div>
          <h3 className="text-[15px] font-semibold text-[var(--store-ink)]">With and without the reusable layer</h3>
          <p className="mb-3 mt-1 text-[13px] store-text-body">
            Same raids and magazines.{' '}
            {comparison.added
              ? 'No reusable layer is switched on, so this adds every one with a Pk on record at its current nightly limit.'
              : 'The second row takes the reusable layers out.'}
          </p>
          <DataTable rows={compareRows} columns={COMPARE_COLUMNS} rowKey={(r) => r.key} caption="Days of fire with and without reusable effects" maxHeight="none" />
        </div>
      ) : null}

      {/* Day table: the chart's table alternative */}
      <div>
        <h3 className="text-[15px] font-semibold text-[var(--store-ink)]">Night by night</h3>
        <p className="mb-3 mt-1 text-[13px] store-text-body">
          Each layer shows threats engaged, then rounds left in the magazine, at {pkCase === 'low' ? 'low' : 'high'} Pk.
          Leakers and spend are ranges across both ends of the Pk and cost bands.
        </p>
        <DataTable
          rows={result.days}
          columns={dayColumns(result, pkCase)}
          rowKey={(d) => String(d.day)}
          caption="Days of fire, night by night"
          maxHeight="min(520px, calc(100vh - 220px))"
          compact
        />
      </div>
    </div>
  )
}

