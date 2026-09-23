'use client'

import { useMemo, useState } from 'react'
import type {
  BmiExerciseBundle,
  BearerKind,
  CommsBearer,
  Domain,
  ExercisePlatformFull,
  PlatformRole,
  SensorKind,
} from '@/lib/bmi/bmi-types'
import { toCommsFits } from '@/data/seed-bmi-pitchblack2026'
import { interopSolver } from '@/lib/bmi/interopSolver'
import { pacePlanner } from '@/lib/bmi/pacePlanner'
import { spectrumPlanner } from '@/lib/bmi/spectrumPlanner'
import { ConfidenceBadge } from '@/components/platforms/ConfidenceBadge'
import { CommsSpectrumCanvas } from '@/components/bmi/CommsSpectrumCanvas'
import { InteropMatrix } from '@/components/bmi/InteropMatrix'
import { PaceCard } from '@/components/bmi/PaceCard'
import { DataTable, type DataColumn } from '@/components/ui/DataTable'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'

type Tab = 'force' | 'interop' | 'pace' | 'spectrum'

const TABS: { id: Tab; label: string }[] = [
  { id: 'force', label: 'Force' },
  { id: 'interop', label: 'Interop' },
  { id: 'pace', label: 'PACE' },
  { id: 'spectrum', label: 'Spectrum' },
]

export const ROLE_LABEL: Record<PlatformRole, string> = {
  fighter: 'Fighter',
  multirole: 'Multirole',
  trainer_lead_in: 'Lead-in trainer',
  aew_c: 'AEW&C',
  isr: 'ISR',
  ew: 'EW',
  tanker: 'Tanker',
  transport: 'Transport',
  c2_ground: 'Ground C2',
  radar_ground: 'Ground radar',
  comms_node: 'Comms node',
  maritime_surface: 'Surface ship',
  other: 'Other',
}

const DOMAIN_LABEL: Record<Domain, string> = { air: 'Air', ground: 'Ground', maritime: 'Maritime' }

const SENSOR_LABEL: Record<SensorKind, string> = { radar: 'Radar', eo_ir: 'EO/IR', esm: 'ESM', other: 'Other' }

const DATA_KINDS = new Set<BearerKind>(['datalink', 'data_satcom'])

/** "Link 16 (MIDS/JTIDS)" reads as "Link 16" in a tag; the full label goes in the tooltip. */
function bearerShort(b: CommsBearer): string {
  return b.label.replace(/\s*\(.*?\)\s*/g, ' ').trim()
}

function BearerTag({ b }: { b: CommsBearer }) {
  const data = DATA_KINDS.has(b.kind)
  return (
    <span
      className="tag"
      title={`${b.label} · ${b.band}${b.gateway_capable ? ' · gateway capable' : ''}`}
      style={data ? { color: '#67E8F9', borderColor: 'rgba(6,182,212,0.45)', background: 'rgba(6,182,212,0.08)' } : undefined}
    >
      {bearerShort(b)}
    </span>
  )
}

function sensorSummary(p: ExercisePlatformFull): string {
  const counts = new Map<SensorKind, number>()
  for (const s of p.sensors) counts.set(s.kind, (counts.get(s.kind) ?? 0) + 1)
  return [...counts.entries()].map(([k, n]) => (n > 1 ? `${SENSOR_LABEL[k]} ×${n}` : SENSOR_LABEL[k])).join(', ')
}

function daysInclusive(start: string, end: string): number | null {
  const a = Date.parse(`${start}T00:00:00Z`)
  const b = Date.parse(`${end}T00:00:00Z`)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null
  return Math.round((b - a) / 86_400_000) + 1
}

const DATE_FMT = new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', timeZone: 'UTC' })
function shortDate(iso: string): string {
  const t = Date.parse(`${iso}T00:00:00Z`)
  return Number.isFinite(t) ? DATE_FMT.format(new Date(t)) : iso
}

interface BmiDashboardProps {
  bundle: BmiExerciseBundle
}

export function BmiDashboard({ bundle }: BmiDashboardProps) {
  const [tab, setTab] = useState<Tab>('force')
  const [nations, setNations] = useState<string[]>([])
  const [domains, setDomains] = useState<Domain[]>([])
  const [roles, setRoles] = useState<PlatformRole[]>([])
  const [forceSide, setForceSide] = useState<'blue' | 'red'>('blue')
  const [paceA, setPaceA] = useState<string | null>(null)
  const [paceB, setPaceB] = useState<string | null>(null)
  const [inspectId, setInspectId] = useState<string | null>(null)

  const filteredPlatforms = useMemo(() => {
    return bundle.platforms.filter((p) => {
      if (p.force_side !== forceSide) return false
      if (nations.length && !nations.includes(p.nation_code)) return false
      if (domains.length && !domains.includes(p.domain)) return false
      if (roles.length && !roles.includes(p.role)) return false
      return true
    })
  }, [bundle.platforms, nations, domains, roles, forceSide])

  const commsFits = useMemo(() => {
    const all = toCommsFits()
    const ids = new Set(filteredPlatforms.map((p) => p.id))
    return all.filter((f) => ids.has(f.platform_id))
  }, [filteredPlatforms])

  const graph = useMemo(() => interopSolver.buildGraph(commsFits), [commsFits])
  const gateways = useMemo(() => interopSolver.findGateways(commsFits), [commsFits])
  const spectrumPlan = useMemo(() => spectrumPlanner.analyseSpectrum(commsFits), [commsFits])
  const plotPoints = useMemo(() => spectrumPlanner.plotPoints(commsFits), [commsFits])

  const pacePlan = useMemo(() => {
    if (!paceA || !paceB || paceA === paceB) return null
    const a = commsFits.find((f) => f.platform_id === paceA)
    const b = commsFits.find((f) => f.platform_id === paceB)
    if (!a || !b) return null
    return pacePlanner.buildPace(a, b, commsFits)
  }, [paceA, paceB, commsFits])

  const platformLabels = useMemo(() => {
    const m: Record<string, string> = {}
    for (const p of bundle.platforms) m[p.id] = p.short_name
    return m
  }, [bundle.platforms])

  const platformNations = useMemo(() => {
    const m: Record<string, string> = {}
    for (const p of bundle.platforms) m[p.id] = p.nation_code
    return m
  }, [bundle.platforms])

  const nationName = useMemo(() => {
    const m: Record<string, string> = {}
    for (const n of bundle.meta.nations) m[n.code] = n.name
    return m
  }, [bundle.meta.nations])

  const flyingCount = bundle.meta.nations.filter((n) => n.participation === 'flying').length
  const embeddedCount = bundle.meta.nations.filter((n) => n.participation === 'embedded_personnel').length
  const days = daysInclusive(bundle.meta.start_date, bundle.meta.end_date)
  const congested = spectrumPlan.occupancy.filter((o) => o.congestion === 'congested').length
  const sidePlatforms = bundle.platforms.filter((p) => p.force_side === forceSide).length

  const nationOptions = useMemo(() => [...new Set(bundle.platforms.map((p) => p.nation_code))], [bundle.platforms])
  const roleOptions = useMemo(() => [...new Set(bundle.platforms.map((p) => p.role))] as PlatformRole[], [bundle.platforms])

  function toggleFilter<T extends string>(
    value: T,
    current: T[],
    setter: (v: T[]) => void,
  ) {
    setter(current.includes(value) ? current.filter((x) => x !== value) : [...current, value])
  }

  const activeCount = nations.length + domains.length + roles.length
  const inspected = inspectId ? bundle.platforms.find((p) => p.id === inspectId) ?? null : null

  return (
    <div className="mt-6">
      <div className="fc-inst border-y fc-hair" aria-label="Exercise instruments">
        <div>
          <div className="k">Exercise window</div>
          <div className="v">{days ?? 'n/a'}<small>days</small></div>
          <div className="d font-mono tabular-nums">{shortDate(bundle.meta.start_date)} to {shortDate(bundle.meta.end_date)} {bundle.meta.end_date.slice(0, 4)}</div>
        </div>
        <div>
          <div className="k">Nations</div>
          <div className="v">{bundle.meta.nations.length}</div>
          <div className="d">{flyingCount} flying · {embeddedCount} embedded</div>
        </div>
        <div>
          <div className="k">Platforms in view</div>
          <div className="v blue">{filteredPlatforms.length}<small>/{sidePlatforms}</small></div>
          <div className="d">{activeCount ? `${activeCount} filter${activeCount === 1 ? '' : 's'} applied` : 'Blue force, unfiltered'}</div>
        </div>
        <div>
          <div className="k">Datalink gateways</div>
          <div className="v glow">{gateways.length}</div>
          <div className="d">platforms bridging datalinks</div>
        </div>
        <div>
          <div className="k">Congested bands</div>
          <div className={`v ${congested ? 'red' : ''}`}>{congested}<small>/{spectrumPlan.occupancy.length}</small></div>
          <div className="d">bands in use needing deconfliction</div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="seg" role="tablist" aria-label="BMI views">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          <span className="text-[12px] store-text-muted">Force</span>
          <div className="seg sm" role="group" aria-label="Force side">
            <button type="button" aria-pressed={forceSide === 'blue'} onClick={() => setForceSide('blue')}>Blue</button>
            <button type="button" disabled aria-disabled title="Red force is an extension hook (Phase 6)" className="opacity-40 cursor-not-allowed">
              Red
            </button>
          </div>
        </div>
      </div>

      {/* Filters: every view reads the same filtered force. */}
      <div className="mt-4 mb-6 py-3.5 border-y fc-hair flex flex-wrap items-start gap-y-3 gap-x-8" aria-label="Filters">
        <FilterGroup
          label="Nation"
          options={nationOptions}
          selected={nations}
          onToggle={(v) => toggleFilter(v, nations, setNations)}
          format={(v) => v}
          title={(v) => nationName[v] ?? v}
          mono
        />
        <FilterGroup
          label="Domain"
          options={['air', 'ground', 'maritime'] as Domain[]}
          selected={domains}
          onToggle={(v) => toggleFilter(v, domains, setDomains)}
          format={(v) => DOMAIN_LABEL[v]}
        />
        <FilterGroup
          label="Role"
          options={roleOptions}
          selected={roles}
          onToggle={(v) => toggleFilter(v, roles, setRoles)}
          format={(v) => ROLE_LABEL[v] ?? v}
        />
        {activeCount ? (
          <button
            type="button"
            className="fc-action ml-auto shrink-0 pt-1.5"
            onClick={() => { setNations([]); setDomains([]); setRoles([]) }}
          >
            Clear {activeCount} {activeCount === 1 ? 'filter' : 'filters'}
          </button>
        ) : null}
      </div>

      {tab === 'force' ? (
        <ForceTable
          platforms={filteredPlatforms}
          nations={bundle.meta.nations}
          nationName={nationName}
          onInspect={setInspectId}
          inspectId={inspectId}
        />
      ) : null}
      {tab === 'interop' ? (
        <InteropMatrix
          platformIds={filteredPlatforms.map((p) => p.id)}
          platformLabels={platformLabels}
          platformNations={platformNations}
          links={graph.links}
          gateways={gateways}
          selectedA={paceA}
          selectedB={paceB}
          onSelectCell={(a, b) => {
            setPaceA(a)
            setPaceB(b)
            setTab('pace')
          }}
        />
      ) : null}
      {tab === 'pace' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-[12px] store-text-muted">
              From
              <select
                className="glass-field h-9 px-3 text-[13px] min-w-[220px]"
                value={paceA ?? ''}
                onChange={(e) => setPaceA(e.target.value || null)}
              >
                <option value="">Choose a platform</option>
                {filteredPlatforms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.short_name} ({p.nation_code})
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="glass-icon-btn"
              aria-label="Swap from and to"
              title="Swap"
              onClick={() => { setPaceA(paceB); setPaceB(paceA) }}
            >
              ⇄
            </button>
            <label className="flex items-center gap-2 text-[12px] store-text-muted">
              To
              <select
                className="glass-field h-9 px-3 text-[13px] min-w-[220px]"
                value={paceB ?? ''}
                onChange={(e) => setPaceB(e.target.value || null)}
              >
                <option value="">Choose a platform</option>
                {filteredPlatforms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.short_name} ({p.nation_code})
                  </option>
                ))}
              </select>
            </label>
            <span className="text-[12px] store-text-muted">Or pick a pair on the Interop matrix.</span>
          </div>
          <PaceCard
            plan={pacePlan}
            fromLabel={paceA ? platformLabels[paceA] : undefined}
            toLabel={paceB ? platformLabels[paceB] : undefined}
          />
        </div>
      ) : null}
      {tab === 'spectrum' ? (
        <CommsSpectrumCanvas plan={spectrumPlan} points={plotPoints} platformLabels={platformLabels} />
      ) : null}

      <Sheet open={Boolean(inspected)} onOpenChange={(o) => { if (!o) setInspectId(null) }}>
        <SheetContent className="store-panel sm:max-w-[460px] overflow-y-auto border-l border-[var(--lacquer-line)]">
          {inspected ? <PlatformInspector p={inspected} nationName={nationName[inspected.nation_code]} /> : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function FilterGroup<T extends string>({
  label,
  options,
  selected,
  onToggle,
  format,
  title,
  mono,
}: {
  label: string
  options: T[]
  selected: T[]
  onToggle: (v: T) => void
  format: (v: T) => string
  title?: (v: T) => string
  mono?: boolean
}) {
  return (
    <div className="flex items-start gap-3 min-w-0" role="group" aria-label={label}>
      <span className="text-[12px] store-text-muted shrink-0 pt-[7px]">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            aria-pressed={selected.includes(o)}
            title={title?.(o)}
            className={`btn-e sm ${mono ? 'font-mono' : ''}`}
          >
            {format(o)}
          </button>
        ))}
      </div>
    </div>
  )
}

function ForceTable({
  platforms,
  nations,
  nationName,
  onInspect,
  inspectId,
}: {
  platforms: ExercisePlatformFull[]
  nations: BmiExerciseBundle['meta']['nations']
  nationName: Record<string, string>
  onInspect: (id: string) => void
  inspectId: string | null
}) {
  const embedded = nations.filter((n) => n.participation === 'embedded_personnel')

  const columns = useMemo<DataColumn<ExercisePlatformFull>[]>(() => [
    {
      key: 'platform',
      header: 'Platform',
      width: 230,
      sticky: true,
      sortValue: (p) => p.short_name,
      cell: (p) => (
        <span className="block min-w-0">
          <span className="block text-[13px] font-medium text-[var(--store-ink)]">{p.short_name}</span>
          <span className="meta truncate" title={p.designation}>{p.designation}</span>
        </span>
      ),
    },
    {
      key: 'nation',
      header: 'Nation',
      width: 150,
      sortValue: (p) => p.nation_code,
      cell: (p) => (
        <span className="block">
          <span className="font-mono text-[13px] text-[var(--store-ink)]">{p.nation_code}</span>
          <span className="meta">{nationName[p.nation_code] ?? ''}</span>
        </span>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      width: 150,
      sortValue: (p) => ROLE_LABEL[p.role] ?? p.role,
      cell: (p) => (
        <span className="block">
          <span className="text-[13px] store-text-body">{ROLE_LABEL[p.role] ?? p.role}</span>
          <span className="meta">{DOMAIN_LABEL[p.domain]}</span>
        </span>
      ),
    },
    {
      key: 'qty',
      header: 'Qty',
      width: 72,
      align: 'right',
      sortValue: (p) => p.qty,
      cell: (p) => (p.qty ? <span className="text-[var(--store-ink)]">{p.qty}</span> : <span className="store-text-muted">n/a</span>),
    },
    {
      key: 'comms',
      header: 'Comms and Datalinks',
      label: 'Comms and datalinks',
      sortValue: (p) => p.comms.filter((c) => DATA_KINDS.has(c.kind)).length,
      cell: (p) =>
        p.comms.length ? (
          <span className="flex flex-wrap gap-1">
            {p.comms.map((c) => <BearerTag key={c.id} b={c} />)}
          </span>
        ) : (
          <span className="store-text-muted text-[12px]">None recorded</span>
        ),
    },
    {
      key: 'sensors',
      header: 'Sensors',
      width: 170,
      sortValue: (p) => p.sensors.length,
      cell: (p) =>
        p.sensors.length ? (
          <span className="text-[12.5px] store-text-body" title={p.sensors.map((s) => s.label).join('\n')}>{sensorSummary(p)}</span>
        ) : (
          <span className="store-text-muted text-[12px]">None recorded</span>
        ),
    },
    {
      key: 'confidence',
      header: 'Confidence',
      width: 124,
      sortValue: (p) => p.data_confidence,
      cell: (p) => <ConfidenceBadge confidence={p.data_confidence} />,
    },
  ], [nationName])

  return (
    <div className="space-y-5">
      <DataTable
        rows={platforms}
        columns={columns}
        rowKey={(p) => p.id}
        onRowClick={(p) => onInspect(p.id)}
        selectedKey={inspectId}
        caption="Exercise platforms"
        empty="No platform matches these filters."
      />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-[12px] store-text-muted">Click a row for sensors, bearers and sources.</span>
        {embedded.length > 0 ? (
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <span className="text-[12px] store-text-muted mr-1.5">Embedded personnel (liaison)</span>
            {embedded.map((n) => (
              <span key={n.code} className="tag" title={n.code}>{n.name}</span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function PlatformInspector({ p, nationName }: { p: ExercisePlatformFull; nationName?: string }) {
  return (
    <div className="space-y-6 text-[13px]">
      <SheetHeader>
        <p className="text-[12px] store-text-muted m-0">
          <span className="font-mono">{p.nation_code}</span>{nationName ? ` · ${nationName}` : ''} · {ROLE_LABEL[p.role] ?? p.role} · {DOMAIN_LABEL[p.domain]}
        </p>
        <SheetTitle className="text-[22px] tracking-[-0.015em]">{p.short_name}</SheetTitle>
        <SheetDescription className="text-[13px] store-text-body m-0">{p.designation}{p.qty ? ` · ${p.qty} deployed` : ''}</SheetDescription>
        <div className="pt-1"><ConfidenceBadge confidence={p.data_confidence} /></div>
      </SheetHeader>

      <p className="store-text-body leading-relaxed m-0 text-pretty">{p.open_source_summary}</p>

      <section className="pt-5 border-t fc-hair">
        <h3 className="text-[14px] font-semibold text-[var(--store-ink)] m-0 mb-3">Comms and datalinks <span className="font-mono font-normal text-[12px] store-text-muted">{p.comms.length}</span></h3>
        {p.comms.length ? (
          <ul className="m-0 p-0 list-none space-y-3">
            {p.comms.map((c) => (
              <li key={c.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[var(--store-ink)]">{c.label}</span>
                  <span className="font-mono text-[12px] store-text-muted">{c.band}</span>
                  {c.gateway_capable ? <span className="tag violet">Gateway capable</span> : null}
                  {c.pnt_dependent ? <span className="tag amber">GNSS time dependent</span> : null}
                </div>
                {c.comsec_note || c.boundary_note ? (
                  <p className="text-[12px] store-text-muted mt-1 mb-0">{[c.comsec_note, c.boundary_note].filter(Boolean).join('. ')}</p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="store-text-muted m-0">None recorded.</p>
        )}
      </section>

      <section className="pt-5 border-t fc-hair">
        <h3 className="text-[14px] font-semibold text-[var(--store-ink)] m-0 mb-3">Sensors <span className="font-mono font-normal text-[12px] store-text-muted">{p.sensors.length}</span></h3>
        {p.sensors.length ? (
          <ul className="m-0 p-0 list-none space-y-3">
            {p.sensors.map((s) => (
              <li key={s.id}>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="tag">{SENSOR_LABEL[s.kind]}</span>
                  <span className="text-[var(--store-ink)]">{s.label}</span>
                  {(s.bands?.length ? s.bands : s.band ? [s.band] : []).map((b) => (
                    <span key={b} className="font-mono text-[12px] store-text-muted">{b}</span>
                  ))}
                </div>
                {s.intel_note ? <p className="text-[12px] store-text-muted mt-1 mb-0">{s.intel_note}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="store-text-muted m-0">None recorded.</p>
        )}
      </section>

      {p.sources.length ? (
        <section className="pt-5 border-t fc-hair">
          <h3 className="text-[14px] font-semibold text-[var(--store-ink)] m-0 mb-2">Sources</h3>
          <ul className="m-0 p-0 list-none space-y-1">
            {p.sources.map((s) => <li key={s} className="text-[12px] store-text-muted break-words">{s}</li>)}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
