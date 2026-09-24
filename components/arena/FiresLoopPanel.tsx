'use client'

/**
 * Drone-to-shooter loop panel: voice net vs digital tasking on the same targets.
 * Model and assumptions: lib/wopr/fires-loop.ts. Every input is editable and
 * labelled as a planning assumption; two defaults cite their source.
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */

import { useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { RotateCcw } from 'lucide-react'
import { clsx } from 'clsx'
import { StorePanel } from '@/components/ui/store-surface'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { DataTable, type DataColumn } from '@/components/ui/DataTable'
import {
  DEFAULT_SHARED,
  DIGITAL_TASKING,
  OUTCOME_LABEL,
  SOURCED_PARAMS,
  VOICE_NET,
  percentile,
  runFiresLoopBatch,
  type C2Params,
  type FiresLoopSummary,
  type ShooterClassParams,
  type ShooterKind,
  type SharedParams,
  type TargetOutcome,
} from '@/lib/wopr/fires-loop'

// Validated for both themes (dataviz validator, dark and light surfaces).
const HUE = { voice: '#B98016', digital: '#0E9FB9' } as const
type PresetId = keyof typeof HUE

const DEFAULT_RUNS = 100
const DEFAULT_SEED = 2026

// ── Number field that tolerates partial input ("0.", "") ───────────────────

function NumField({
  value,
  onChange,
  min,
  max,
  step,
  label,
  className,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  label: string
  className?: string
}) {
  const [draft, setDraft] = useState(String(value))
  useEffect(() => setDraft(String(value)), [value])
  return (
    <input
      type="number"
      inputMode="decimal"
      aria-label={label}
      value={draft}
      min={min}
      max={max}
      step={step ?? 'any'}
      onChange={(e) => {
        setDraft(e.target.value)
        const n = Number(e.target.value)
        if (e.target.value.trim() !== '' && Number.isFinite(n)) {
          const clamped = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n))
          onChange(clamped)
        }
      }}
      onBlur={() => setDraft(String(value))}
      className={clsx(
        'glass-field h-7 w-[78px] px-2 text-right font-mono text-[12px] tabular-nums',
        className,
      )}
    />
  )
}

// ── Assumption rows ─────────────────────────────────────────────────────────

type SharedKey = Exclude<keyof SharedParams, ShooterKind>

interface SharedRow {
  kind: 'shared'
  id: string
  label: string
  unit: string
  get: (s: SharedParams) => number
  set: (s: SharedParams, v: number) => SharedParams
  min?: number
  max?: number
  step?: number
}
interface C2Row {
  kind: 'c2'
  id: string
  label: string
  unit: string
  field: keyof C2Params
  min?: number
  max?: number
  step?: number
}
interface GroupRow {
  kind: 'group'
  id: string
  label: string
}
type AssumptionRow = SharedRow | C2Row | GroupRow

const sharedField = (key: SharedKey, label: string, unit: string, min = 0, max?: number, step?: number): SharedRow => ({
  kind: 'shared',
  id: key,
  label,
  unit,
  get: (s) => s[key] as number,
  set: (s, v) => ({ ...s, [key]: v }),
  min,
  max,
  step,
})

const shooterField = (
  kind: ShooterKind,
  key: keyof ShooterClassParams,
  label: string,
  unit: string,
  min = 0,
  max?: number,
  step?: number,
): SharedRow => ({
  kind: 'shared',
  id: `${kind}.${key}`,
  label,
  unit,
  get: (s) => s[kind][key],
  set: (s, v) => ({ ...s, [kind]: { ...s[kind], [key]: v } }),
  min,
  max,
  step,
})

const ROWS: AssumptionRow[] = [
  { kind: 'group', id: 'g-targets', label: 'Targets' },
  sharedField('windowMin', 'Targets appear over', 'min', 10, 720),
  sharedField('arrivalsPerHour', 'Arrival rate', 'per hour', 0, 120),
  sharedField('dwellMinMin', 'Dwell, shortest', 'min', 0, 240),
  sharedField('dwellMaxMin', 'Dwell, longest', 'min', 0, 240),
  sharedField('depthMinKm', 'Depth, nearest', 'km', 0, 60),
  sharedField('depthMaxKm', 'Depth, farthest', 'km', 0, 60),
  sharedField('frontageKm', 'Frontage', 'km', 0, 60),
  sharedField('detectMeanMin', 'Recon detection, mean', 'min', 0, 120),
  sharedField('bdaMin', 'Damage assessment', 'min', 0, 60),
  { kind: 'group', id: 'g-c2', label: 'Command and control' },
  { kind: 'c2', id: 'nominateMin', field: 'nominateMin', label: 'Nomination', unit: 'min', min: 0, max: 60 },
  { kind: 'c2', id: 'approveMin', field: 'approveMin', label: 'Approval per target', unit: 'min', min: 0, max: 60 },
  { kind: 'c2', id: 'approvalLanes', field: 'approvalLanes', label: 'Approvals at once', unit: 'lanes', min: 1, max: 20, step: 1 },
  { kind: 'c2', id: 'assignMin', field: 'assignMin', label: 'Tasking a shooter', unit: 'min', min: 0, max: 60 },
  { kind: 'c2', id: 'assignUsesApprovalNet', field: 'assignUsesApprovalNet', label: 'Tasking uses approval net', unit: '' },
  { kind: 'c2', id: 'assignRule', field: 'assignRule', label: 'Shooter choice', unit: '' },
  { kind: 'group', id: 'g-fpv', label: 'FPV attack teams' },
  shooterField('fpv', 'count', 'Teams', 'teams', 0, 20, 1),
  shooterField('fpv', 'munitionsEach', 'Drones per team', 'drones', 0, 60, 1),
  shooterField('fpv', 'prepMin', 'Prepare and launch', 'min', 0, 60),
  shooterField('fpv', 'speedKmh', 'Flight speed', 'km/h', 0, 400),
  shooterField('fpv', 'rangeKm', 'Reach with relay', 'km', 0, 100),
  shooterField('fpv', 'turnaroundMin', 'Turnaround', 'min', 0, 60),
  shooterField('fpv', 'pk', 'Kill chance per attack', '0 to 1', 0, 1, 0.05),
  { kind: 'group', id: 'g-lm', label: 'Loitering munitions' },
  shooterField('loiter', 'count', 'Launchers', 'launchers', 0, 20, 1),
  shooterField('loiter', 'munitionsEach', 'Rounds per launcher', 'rounds', 0, 60, 1),
  shooterField('loiter', 'prepMin', 'Prepare and launch', 'min', 0, 60),
  shooterField('loiter', 'speedKmh', 'Flight speed', 'km/h', 0, 400),
  shooterField('loiter', 'rangeKm', 'Reach', 'km', 0, 200),
  shooterField('loiter', 'turnaroundMin', 'Turnaround', 'min', 0, 60),
  shooterField('loiter', 'pk', 'Kill chance per attack', '0 to 1', 0, 1, 0.05),
  { kind: 'group', id: 'g-arty', label: 'Artillery' },
  shooterField('artillery', 'count', 'Fire units', 'units', 0, 20, 1),
  shooterField('artillery', 'munitionsEach', 'Fire missions per unit', 'missions', 0, 200, 1),
  shooterField('artillery', 'prepMin', 'Mission processing', 'min', 0, 60),
  shooterField('artillery', 'flightMin', 'Time of flight', 'min', 0, 10),
  shooterField('artillery', 'rangeKm', 'Reach', 'km', 0, 300),
  shooterField('artillery', 'turnaroundMin', 'Between missions', 'min', 0, 60),
  shooterField('artillery', 'pk', 'Kill chance per mission', '0 to 1', 0, 1, 0.05),
]

function Basis({ id }: { id: string }) {
  const source = SOURCED_PARAMS[id]
  if (source) {
    return (
      <span className="block text-[11.5px] leading-snug store-text-muted" title={source}>
        <span className="block whitespace-nowrap">Planning assumption</span>
        <span className="block truncate text-[var(--store-ink-soft)] underline decoration-dotted underline-offset-2">
          Source: Defence Connect
        </span>
      </span>
    )
  }
  return <span className="block whitespace-nowrap text-[11.5px] store-text-muted">Planning assumption</span>
}

// ── Distribution strip ──────────────────────────────────────────────────────

interface StripSeries {
  id: PresetId
  label: string
  samples: number[]
  median: number | null
  p90: number | null
}

const fmt = (n: number | null | undefined, dp = 1) => (n == null || !Number.isFinite(n) ? 'n/a' : n.toFixed(dp))

/** Width of an element in CSS px, so SVG text renders at its true size (no viewBox scaling). */
function useWidth<T extends HTMLElement>(fallback: number): [React.RefObject<T>, number] {
  const ref = useRef<T>(null)
  const [w, setW] = useState(fallback)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([entry]) => setW(Math.max(280, Math.round(entry.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w]
}

function DistributionStrip({ series }: { series: StripSeries[] }) {
  const [hover, setHover] = useState<{ id: PresetId; bin: number } | null>(null)
  const [wrapRef, W] = useWidth<HTMLElement>(560)
  const ROW = 64 // per series: 18 label band + bars
  const LABEL = 18
  const AXIS = 20
  const LEFT = 8
  const RIGHT = 12
  // Round geometry so server and client render identical attributes.
  const r1 = (n: number) => Math.round(n * 10) / 10

  const p99 = Math.max(10, ...series.map((s) => percentile(s.samples, 99) ?? 0))
  const xMax = Math.ceil(p99 / 5) * 5
  const binW = xMax <= 30 ? 1 : 2
  const bins = Math.ceil(xMax / binW)
  const plotW = W - LEFT - RIGHT
  const x = (m: number) => r1(LEFT + (Math.min(m, xMax) / xMax) * plotW)

  const hist = series.map((s) => {
    const counts = new Array(bins).fill(0) as number[]
    for (const v of s.samples) counts[Math.min(bins - 1, Math.max(0, Math.floor(v / binW)))]++
    const n = s.samples.length || 1
    return counts.map((c) => c / n)
  })
  const peak = Math.max(0.0001, ...hist.flat())
  const H = series.length * ROW + AXIS
  const slot = plotW / bins
  const barW = r1(Math.max(1, Math.min(24, slot - 2)))
  const ticks: number[] = []
  const tickStep = xMax <= 30 ? 5 : 10
  for (let t = 0; t <= xMax; t += tickStep) ticks.push(t)

  const readout = hover
    ? (() => {
        const si = series.findIndex((x) => x.id === hover.id)
        const share = hist[si][hover.bin]
        return `${series[si].label}: ${hover.bin * binW} to ${(hover.bin + 1) * binW} min, ${(share * 100).toFixed(0)}% of engagements`
      })()
    : 'Share of engagements by minutes from detection to first effect. Hover a bar for its value.'

  return (
    <figure ref={wrapRef} className="min-w-0">
      <p aria-live="polite" className="mb-1 min-h-[18px] text-[12px] store-text-muted">
        {readout}
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        className="block max-w-full"
        role="img"
        aria-label={series
          .map((s) => `${s.label}: median ${fmt(s.median)} minutes, 90th percentile ${fmt(s.p90)} minutes`)
          .join('. ')}
        onMouseLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={LABEL} y2={H - AXIS} stroke="var(--store-line)" strokeWidth={1} />
            <text x={x(t)} y={H - 5} textAnchor="middle" className="fill-[var(--store-ink-mute)] font-mono" fontSize={11}>
              {t}
            </text>
          </g>
        ))}
        {series.map((s, si) => {
          const rowTop = si * ROW
          const top = rowTop + LABEL + 2
          const base = rowTop + ROW - 4
          const hScale = (share: number) => (share / peak) * (base - top)
          const markers = ([['median', s.median], ['90th', s.p90]] as const).filter(([, v]) => v != null) as ReadonlyArray<
            readonly ['median' | '90th', number]
          >
          return (
            <g key={s.id}>
              <circle cx={LEFT + 4} cy={rowTop + 9} r={4} fill={HUE[s.id]} />
              <text x={LEFT + 13} y={rowTop + 13} className="fill-[var(--store-ink)]" fontSize={12} fontWeight={500}>
                {s.label}
              </text>
              <line x1={LEFT} x2={W - RIGHT} y1={base} y2={base} stroke="var(--store-line)" strokeWidth={1} />
              {hist[si].map((share, b) => {
                if (share <= 0) return null
                const h = r1(Math.max(1.5, hScale(share)))
                const bx = r1(LEFT + b * slot + (slot - barW) / 2)
                const rr = r1(Math.min(4, barW / 2, h))
                const yTop = r1(base - h)
                const d = `M${bx},${base} V${r1(yTop + rr)} Q${bx},${yTop} ${r1(bx + rr)},${yTop} H${r1(bx + barW - rr)} Q${r1(bx + barW)},${yTop} ${r1(bx + barW)},${r1(yTop + rr)} V${base} Z`
                const on = hover?.id === s.id && hover.bin === b
                return (
                  <g key={b} onMouseEnter={() => setHover({ id: s.id, bin: b })}>
                    <rect x={r1(LEFT + b * slot)} y={top} width={r1(slot)} height={base - top} fill="transparent" />
                    <path d={d} fill={HUE[s.id]} opacity={hover && !on ? 0.55 : 1} />
                  </g>
                )
              })}
              {markers.map(([k, v]) => {
                const mx = x(v)
                // Labels sit in the row's label band, to the right of the series name.
                const anchorEnd = k === 'median'
                return (
                  <g key={k} pointerEvents="none">
                    <line x1={mx} x2={mx} y1={rowTop + LABEL - 2} y2={base} stroke="var(--store-ink-soft)" strokeWidth={1} />
                    <text
                      x={anchorEnd ? mx - 4 : mx + 4}
                      y={rowTop + 13}
                      textAnchor={anchorEnd ? 'end' : 'start'}
                      className="fill-[var(--store-ink-soft)] font-mono"
                      fontSize={11}
                    >
                      {k} {fmt(v)}
                    </text>
                  </g>
                )
              })}
            </g>
          )
        })}
      </svg>
      <figcaption className="mt-0.5 text-right text-[11.5px] store-text-muted">Minutes from detection to first effect</figcaption>
    </figure>
  )
}

// ── Results table ───────────────────────────────────────────────────────────

interface MetricRow {
  key: string
  label: string
  voice: number | null
  digital: number | null
  dp: number
  unit?: string
  /** Which direction is better, for colouring the change. */
  better?: 'lower' | 'higher'
  indent?: boolean
}

function buildMetrics(v: FiresLoopSummary, d: FiresLoopSummary): MetricRow[] {
  const outcomes: TargetOutcome[] = ['escaped_undetected', 'escaped_awaiting_approval', 'escaped_awaiting_shooter', 'escaped_under_attack']
  return [
    { key: 's2e-med', label: 'Sensor to effect, median', unit: 'min', voice: v.sensorToEffect.median, digital: d.sensorToEffect.median, dp: 1, better: 'lower' },
    { key: 's2e-p90', label: 'Sensor to effect, 90th percentile', unit: 'min', voice: v.sensorToEffect.p90, digital: d.sensorToEffect.p90, dp: 1, better: 'lower' },
    { key: 'appeared', label: 'Targets appearing', voice: v.appeared, digital: d.appeared, dp: 1 },
    { key: 'detected', label: 'Detected by recon', voice: v.detected, digital: d.detected, dp: 1 },
    { key: 'engaged', label: 'Engaged (a munition arrived)', voice: v.engaged, digital: d.engaged, dp: 1, better: 'higher' },
    { key: 'destroyed', label: 'Destroyed', voice: v.destroyed, digital: d.destroyed, dp: 1, better: 'higher' },
    { key: 'escaped', label: 'Escaped', voice: v.escaped, digital: d.escaped, dp: 1, better: 'lower' },
    ...outcomes.map((o) => ({
      key: o,
      label: OUTCOME_LABEL[o].replace(/^Escaped /, ''),
      voice: v.outcomes[o],
      digital: d.outcomes[o],
      dp: 1,
      better: 'lower' as const,
      indent: true,
    })),
    { key: 'q-peak', label: 'Approval queue, peak', unit: 'targets', voice: v.approvalQueuePeak, digital: d.approvalQueuePeak, dp: 1, better: 'lower' },
    { key: 'q-mean', label: 'Approval queue, mean', unit: 'targets', voice: v.approvalQueueMean, digital: d.approvalQueueMean, dp: 2, better: 'lower' },
    { key: 'q-wait', label: 'Wait for approval, mean', unit: 'min', voice: v.approvalWaitMeanMin, digital: d.approvalWaitMeanMin, dp: 1, better: 'lower' },
    { key: 'u-fpv', label: 'FPV team utilisation', unit: '%', voice: v.utilisation.fpv * 100, digital: d.utilisation.fpv * 100, dp: 0 },
    { key: 'u-lm', label: 'Loitering munition utilisation', unit: '%', voice: v.utilisation.loiter * 100, digital: d.utilisation.loiter * 100, dp: 0 },
    { key: 'u-arty', label: 'Artillery utilisation', unit: '%', voice: v.utilisation.artillery * 100, digital: d.utilisation.artillery * 100, dp: 0 },
    { key: 'l-fpv', label: 'FPV drones used', voice: v.launches.fpv, digital: d.launches.fpv, dp: 1 },
    { key: 'l-lm', label: 'Loitering munitions used', voice: v.launches.loiter, digital: d.launches.loiter, dp: 1 },
    { key: 'l-arty', label: 'Artillery missions fired', voice: v.launches.artillery, digital: d.launches.artillery, dp: 1 },
  ]
}

function changeTone(row: MetricRow): string {
  if (row.voice == null || row.digital == null || !row.better) return 'store-text-muted'
  const delta = row.digital - row.voice
  if (Math.abs(delta) < 10 ** -row.dp / 2) return 'store-text-muted'
  const improved = row.better === 'lower' ? delta < 0 : delta > 0
  return improved ? 'text-[#4ADE80]' : 'text-[#FBBF24]'
}

const METRIC_COLUMNS: DataColumn<MetricRow>[] = [
  {
    key: 'label',
    header: 'Result (mean per run)',
    cell: (r) => (
      <span className={clsx('block truncate', r.indent ? 'pl-4 store-text-muted' : 'primary')} title={r.label}>
        {r.label}
        {r.unit ? <span className="store-text-muted"> ({r.unit})</span> : null}
      </span>
    ),
  },
  { key: 'voice', header: 'Voice net', align: 'right', width: 84, cell: (r) => <span className="font-mono tabular-nums">{fmt(r.voice, r.dp)}</span> },
  { key: 'digital', header: 'Digital', align: 'right', width: 76, cell: (r) => <span className="font-mono tabular-nums">{fmt(r.digital, r.dp)}</span> },
  {
    key: 'change',
    header: 'Change',
    align: 'right',
    width: 76,
    cell: (r) => {
      if (r.voice == null || r.digital == null) return <span className="store-text-muted">n/a</span>
      const delta = r.digital - r.voice
      const s = `${delta > 0 ? '+' : delta < 0 ? '−' : ''}${Math.abs(delta).toFixed(r.dp)}`
      return <span className={clsx('font-mono tabular-nums', changeTone(r))}>{s}</span>
    },
  },
]

// ── Panel ───────────────────────────────────────────────────────────────────

function clone<T>(v: T): T {
  return structuredClone(v)
}

export function FiresLoopPanel({ id = 'fires-loop' }: { id?: string }) {
  const [shared, setShared] = useState<SharedParams>(() => clone(DEFAULT_SHARED))
  const [c2, setC2] = useState<Record<PresetId, C2Params>>(() => ({
    voice: clone(VOICE_NET.c2),
    digital: clone(DIGITAL_TASKING.c2),
  }))
  const [runs, setRuns] = useState(DEFAULT_RUNS)
  const [seed, setSeed] = useState(DEFAULT_SEED)

  const inputs = useDeferredValue({ shared, c2, runs, seed })
  const results = useMemo(() => {
    const opts = { seed: inputs.seed, runs: inputs.runs }
    return {
      voice: runFiresLoopBatch(inputs.shared, inputs.c2.voice, opts),
      digital: runFiresLoopBatch(inputs.shared, inputs.c2.digital, opts),
    }
  }, [inputs])

  const metrics = useMemo(() => buildMetrics(results.voice, results.digital), [results])
  const edited =
    JSON.stringify({ shared, c2, runs, seed }) !==
    JSON.stringify({ shared: DEFAULT_SHARED, c2: { voice: VOICE_NET.c2, digital: DIGITAL_TASKING.c2 }, runs: DEFAULT_RUNS, seed: DEFAULT_SEED })

  const reset = () => {
    setShared(clone(DEFAULT_SHARED))
    setC2({ voice: clone(VOICE_NET.c2), digital: clone(DIGITAL_TASKING.c2) })
    setRuns(DEFAULT_RUNS)
    setSeed(DEFAULT_SEED)
  }

  const setC2Field = (preset: PresetId, field: keyof C2Params, value: C2Params[keyof C2Params]) =>
    setC2((prev) => ({ ...prev, [preset]: { ...prev[preset], [field]: value } }))

  const c2Cell = (row: C2Row, preset: PresetId): ReactNode => {
    const v = c2[preset][row.field]
    const label = `${row.label}, ${preset === 'voice' ? VOICE_NET.label : DIGITAL_TASKING.label}`
    if (row.field === 'assignUsesApprovalNet') {
      return (
        <input
          type="checkbox"
          aria-label={label}
          checked={Boolean(v)}
          onChange={(e) => setC2Field(preset, row.field, e.target.checked)}
          className="h-4 w-4 accent-[var(--wb-blue)]"
        />
      )
    }
    if (row.field === 'assignRule') {
      return (
        <select
          aria-label={label}
          value={String(v)}
          onChange={(e) => setC2Field(preset, row.field, e.target.value as C2Params['assignRule'])}
          className="glass-field h-7 w-[108px] px-1.5 text-[12px]"
        >
          <option value="call_order">Calling order</option>
          <option value="fastest">Nearest free</option>
        </select>
      )
    }
    return (
      <NumField
        label={label}
        value={Number(v)}
        min={row.min}
        max={row.max}
        step={row.step}
        onChange={(n) => setC2Field(preset, row.field, row.step === 1 ? Math.round(n) : n)}
      />
    )
  }

  const series: StripSeries[] = [
    { id: 'voice', label: VOICE_NET.label, ...pick(results.voice) },
    { id: 'digital', label: DIGITAL_TASKING.label, ...pick(results.digital) },
  ]

  return (
    <StorePanel className="overflow-hidden" data-testid="fires-loop-panel">
      <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24">
        {/* Glass header over a lacquer body */}
        <header className="lg-glass flex flex-wrap items-start justify-between gap-3 !rounded-none !border-x-0 !border-t-0 px-4 py-3">
          <div className="min-w-0 max-w-[76ch]">
            <h2 id={`${id}-title`} className="text-[15px] font-semibold text-[var(--store-ink)]">
              Drone-to-shooter loop
            </h2>
            <p className="mt-0.5 text-[12px] leading-relaxed store-text-muted">
              A target goes in, a battle captain approves it, and it routes to whichever drone team or gun is
              free. Both ways of running the loop see the same targets. Army describes Ukraine&apos;s version as
              almost Uber for fires (Defence Connect, 24 Sep 2026).
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="tag amber">Planning assumptions</span>
            <button type="button" onClick={reset} disabled={!edited} className="fc-action disabled:opacity-40" title="Restore the default assumptions">
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Reset
            </button>
          </div>
        </header>

        <div className="grid min-w-0 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* Results */}
          <div className="min-w-0 space-y-4 border-[var(--store-line)] p-4 xl:border-r">
            <div className="grid grid-cols-2 gap-3">
              {(['voice', 'digital'] as const).map((pid) => {
                const r = results[pid]
                const preset = pid === 'voice' ? VOICE_NET : DIGITAL_TASKING
                return (
                  <div key={pid} className="min-w-0">
                    <p className="flex items-center gap-2 text-[12px] font-medium text-[var(--store-ink)]">
                      <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: HUE[pid] }} />
                      {preset.label}
                    </p>
                    <p className="mt-1 font-mono text-[26px] font-semibold leading-none tabular-nums text-[var(--store-ink)]">
                      {fmt(r.sensorToEffect.median)}
                      <span className="ml-1 text-[12px] font-normal store-text-muted">min median</span>
                    </p>
                    <p className="mt-1.5 flex flex-wrap gap-x-3 text-[12px] store-text-muted">
                      <span>
                        90th percentile <span className="font-mono tabular-nums text-[var(--store-ink-soft)]">{fmt(r.sensorToEffect.p90)}</span> min
                      </span>
                      <span>
                        <span className="font-mono tabular-nums text-[var(--store-ink-soft)]">{fmt(r.destroyed)}</span> of{' '}
                        <span className="font-mono tabular-nums">{fmt(r.appeared)}</span> destroyed
                      </span>
                    </p>
                    <p className="mt-1 text-[12px] leading-snug store-text-muted">{preset.summary}</p>
                  </div>
                )
              })}
            </div>

            <DistributionStrip series={series} />

            <DataTable
              rows={metrics}
              columns={METRIC_COLUMNS}
              rowKey={(r) => r.key}
              compact
              layout="fixed"
              maxHeight="360px"
              caption="Drone-to-shooter loop results, voice net and digital tasking"
            />
            <p className="text-[12px] leading-relaxed store-text-muted">
              Sensor to effect runs from detection to the first munition arriving. Means are over{' '}
              <span className="font-mono tabular-nums">{results.voice.runs}</span> seeded runs; the same seed always
              gives the same answer. Change is digital minus voice; green is better, amber worse.
            </p>
          </div>

          {/* Assumptions */}
          <div className="min-w-0 p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[13px] font-semibold text-[var(--store-ink)]">Assumptions</h3>
              <div className="flex items-center gap-3 text-[12px] store-text-muted">
                <label className="flex items-center gap-1.5">
                  Runs
                  <NumField label="Seeded runs" value={runs} min={1} max={1000} step={1} onChange={(n) => setRuns(Math.round(n))} className="!w-[64px]" />
                </label>
                <label className="flex items-center gap-1.5">
                  Seed
                  <NumField label="Random seed" value={seed} min={0} max={2 ** 31} step={1} onChange={(n) => setSeed(Math.round(n))} className="!w-[72px]" />
                </label>
              </div>
            </div>
            <ScrollArea frame maxHeight="560px">
              <table className="dt compact" style={{ tableLayout: 'fixed' }}>
                <caption className="sr-only">Drone-to-shooter loop assumptions</caption>
                <colgroup>
                  <col />
                  <col style={{ width: 92 }} />
                  <col style={{ width: 92 }} />
                  <col style={{ width: 136 }} />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">Parameter</th>
                    <th scope="col" className="text-right">Voice net</th>
                    <th scope="col" className="text-right">Digital</th>
                    <th scope="col">Basis</th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row) =>
                    row.kind === 'group' ? (
                      <tr key={row.id}>
                        <th scope="rowgroup" colSpan={4} className="!pt-3 text-left text-[12px] font-semibold text-[var(--store-ink)]">
                          {row.label}
                        </th>
                      </tr>
                    ) : (
                      <tr key={row.id}>
                        <td>
                          <span className="block truncate text-[12.5px] text-[var(--store-ink-soft)]" title={row.unit ? `${row.label} (${row.unit})` : row.label}>
                            {row.label}
                            {row.unit ? <span className="store-text-muted"> ({row.unit})</span> : null}
                          </span>
                        </td>
                        {row.kind === 'shared' ? (
                          <td colSpan={2} className="text-right">
                            <span className="inline-flex items-center gap-2">
                              <span className="text-[11.5px] store-text-muted">both</span>
                              <NumField
                                label={row.label}
                                value={row.get(shared)}
                                min={row.min}
                                max={row.max}
                                step={row.step}
                                onChange={(n) => setShared((s) => row.set(s, row.step === 1 ? Math.round(n) : n))}
                              />
                            </span>
                          </td>
                        ) : (
                          <>
                            <td className="text-right">{c2Cell(row, 'voice')}</td>
                            <td className="text-right">{c2Cell(row, 'digital')}</td>
                          </>
                        )}
                        <td>
                          <Basis id={row.id} />
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </ScrollArea>
            <p className="mt-2 text-[12px] leading-relaxed store-text-muted">
              Targets appear at random (Poisson) across the sector; shooters are spaced evenly along its front. A miss
              goes back for re-attack after BDA without a second approval. Sourced defaults: drones staged per team and
              FPV reach (Defence Connect, 24 Sep 2026). Everything else is an estimate to argue with.
            </p>
          </div>
        </div>
      </section>
    </StorePanel>
  )
}

function pick(r: FiresLoopSummary) {
  return { samples: r.sensorToEffect.samples, median: r.sensorToEffect.median, p90: r.sensorToEffect.p90 }
}
