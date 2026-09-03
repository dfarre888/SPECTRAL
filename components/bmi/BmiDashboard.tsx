'use client'

import { useMemo, useState } from 'react'
import type {
  BmiExerciseBundle,
  Domain,
  ExercisePlatformFull,
  PlatformRole,
} from '@/lib/bmi/bmi-types'
import { toCommsFits } from '@/data/seed-bmi-pitchblack2026'
import { interopSolver } from '@/lib/bmi/interopSolver'
import { pacePlanner } from '@/lib/bmi/pacePlanner'
import { spectrumPlanner } from '@/lib/bmi/spectrumPlanner'
import { ConfidenceBadge } from '@/components/platforms/ConfidenceBadge'
import { CommsSpectrumCanvas } from '@/components/bmi/CommsSpectrumCanvas'
import { InteropMatrix } from '@/components/bmi/InteropMatrix'
import { PaceCard } from '@/components/bmi/PaceCard'
import { StorePanel } from '@/components/ui/store-surface'

type Tab = 'force' | 'interop' | 'pace' | 'spectrum'

const TABS: { id: Tab; label: string }[] = [
  { id: 'force', label: 'Force' },
  { id: 'interop', label: 'Interop' },
  { id: 'pace', label: 'PACE' },
  { id: 'spectrum', label: 'Spectrum' },
]

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

  const flyingCount = bundle.meta.nations.filter((n) => n.participation === 'flying').length
  const embeddedCount = bundle.meta.nations.filter((n) => n.participation === 'embedded_personnel').length

  function toggleFilter<T extends string>(
    value: T,
    current: T[],
    setter: (v: T[]) => void,
  ) {
    setter(current.includes(value) ? current.filter((x) => x !== value) : [...current, value])
  }

  const activeChips = [
    ...nations.map((n) => ({ type: 'nation', value: n })),
    ...domains.map((d) => ({ type: 'domain', value: d })),
    ...roles.map((r) => ({ type: 'role', value: r })),
  ]

  return (
    <div className="flex flex-col lg:flex-row gap-4 min-h-0">
      {/* Filter rail */}
      <aside className="w-full lg:w-[260px] shrink-0 space-y-3">
        <StorePanel className="p-3 space-y-3 ring-gradient glass">
          <p className="eyebrow text-[10px]">Filters</p>

          <div>
            <p className="text-[10px] store-text-muted mb-1">Force</p>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setForceSide('blue')}
                className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
                  forceSide === 'blue'
                    ? 'border-[var(--store-accent-border)] bg-[var(--store-accent-glow)] text-[var(--store-accent)]'
                    : 'store-btn-secondary px-2 py-1 store-text-muted'
                }`}
              >
                Blue
              </button>
              <button
                type="button"
                disabled
                title="Red Force — extension hook (Phase 6)"
                className="store-btn-secondary text-xs px-2 py-1 store-text-muted opacity-40 cursor-not-allowed"
              >
                Red
              </button>
            </div>
          </div>

          <FilterSection
            label="Nation"
            options={[...new Set(bundle.platforms.map((p) => p.nation_code))]}
            selected={nations}
            onToggle={(v) => toggleFilter(v, nations, setNations)}
          />
          <FilterSection
            label="Domain"
            options={['air', 'ground', 'maritime'] as Domain[]}
            selected={domains}
            onToggle={(v) => toggleFilter(v, domains, setDomains)}
          />
          <FilterSection
            label="Role"
            options={[...new Set(bundle.platforms.map((p) => p.role))] as PlatformRole[]}
            selected={roles}
            onToggle={(v) => toggleFilter(v, roles, setRoles)}
          />
        </StorePanel>

        {activeChips.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {activeChips.map((c) => (
              <button
                key={`${c.type}-${c.value}`}
                type="button"
                className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-[var(--store-gold-border)] bg-[var(--store-gold-glow)] text-[var(--store-gold)] hover:brightness-110 transition-colors"
                onClick={() => {
                  if (c.type === 'nation') toggleFilter(c.value, nations, setNations)
                  if (c.type === 'domain') toggleFilter(c.value as Domain, domains, setDomains)
                  if (c.type === 'role') toggleFilter(c.value as PlatformRole, roles, setRoles)
                }}
              >
                {c.value} ×
              </button>
            ))}
          </div>
        ) : null}
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 space-y-4">
        <div className="ring-gradient glass flex flex-wrap gap-1 rounded-xl px-3 py-2">
          {[
            { value: bundle.meta.nations.length, label: 'Nations' },
            { value: flyingCount, label: 'Flying' },
            { value: embeddedCount, label: 'Embedded' },
            { value: filteredPlatforms.length, label: 'Platforms' },
            { value: gateways.length, label: 'Gateways' },
          ].map((stat, i, arr) => (
            <div key={stat.label} className="flex items-center">
              <div className="text-center px-2">
                <div className="hero-number text-sm text-[#F7F9FC] tabular-nums">{stat.value}</div>
                <div className="text-[9px] uppercase tracking-wider store-text-muted">{stat.label}</div>
              </div>
              {i < arr.length - 1 ? <div className="w-px h-8 bg-[var(--store-line)]" /> : null}
            </div>
          ))}
          <div className="w-px h-8 bg-[var(--store-line)]" />
          <div className="text-center px-2">
            <div className="hero-number text-xs text-[var(--store-accent)] tabular-nums">ap-southeast-2</div>
            <div className="text-[9px] uppercase tracking-wider store-text-muted">Region</div>
          </div>
        </div>

        <div className="hub-tab-bar" role="tablist" aria-label="BMI views">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                tab === t.id ? 'hub-tab-active' : 'hub-tab-inactive'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'force' ? (
          <ForceGrid platforms={filteredPlatforms} nations={bundle.meta.nations} />
        ) : null}
        {tab === 'interop' ? (
          <InteropMatrix
            platformIds={filteredPlatforms.map((p) => p.id)}
            platformLabels={platformLabels}
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
            <div className="flex flex-wrap gap-2">
              <select
                className="text-xs font-mono glass rounded-lg px-2 py-1.5 border border-[var(--store-line)] bg-[var(--store-surface)] text-[#F7F9FC]"
                value={paceA ?? ''}
                onChange={(e) => setPaceA(e.target.value || null)}
              >
                <option value="">From platform…</option>
                {filteredPlatforms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.short_name} ({p.nation_code})
                  </option>
                ))}
              </select>
              <select
                className="text-xs font-mono glass rounded-lg px-2 py-1.5 border border-[var(--store-line)] bg-[var(--store-surface)] text-[#F7F9FC]"
                value={paceB ?? ''}
                onChange={(e) => setPaceB(e.target.value || null)}
              >
                <option value="">To platform…</option>
                {filteredPlatforms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.short_name} ({p.nation_code})
                  </option>
                ))}
              </select>
            </div>
            <PaceCard
              plan={pacePlan}
              fromLabel={paceA ? platformLabels[paceA] : undefined}
              toLabel={paceB ? platformLabels[paceB] : undefined}
            />
          </div>
        ) : null}
        {tab === 'spectrum' ? (
          <CommsSpectrumCanvas plan={spectrumPlan} points={plotPoints} />
        ) : null}
      </div>
    </div>
  )
}

function FilterSection<T extends string>({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string
  options: T[]
  selected: T[]
  onToggle: (v: T) => void
}) {
  return (
    <div>
      <p className="text-[10px] store-text-muted mb-1">{label}</p>
      <div className="flex flex-wrap gap-1">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded-lg border transition-colors ${
              selected.includes(o)
                ? 'border-[var(--store-accent-border)] bg-[var(--store-accent-glow)] text-[var(--store-accent)]'
                : 'border-transparent store-text-muted hover:bg-[var(--store-surface-2)] hover:text-[var(--store-ink-soft)]'
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}

function ForceGrid({
  platforms,
  nations,
}: {
  platforms: ExercisePlatformFull[]
  nations: BmiExerciseBundle['meta']['nations']
}) {
  const byNation = useMemo(() => {
    const m = new Map<string, ExercisePlatformFull[]>()
    for (const p of platforms) {
      const list = m.get(p.nation_code) ?? []
      list.push(p)
      m.set(p.nation_code, list)
    }
    return m
  }, [platforms])

  const embedded = nations.filter((n) => n.participation === 'embedded_personnel')

  return (
    <div className="space-y-6">
      {[...byNation.entries()].map(([code, plats]) => (
        <div key={code}>
          <h3 className="text-xs font-semibold text-[#F7F9FC] mb-2 store-display text-gradient">{code}</h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {plats.map((p) => (
              <StorePanel key={p.id} className="p-3 space-y-2 ring-gradient glass hover-lift">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[#F7F9FC]">{p.short_name}</p>
                    <p className="text-[10px] store-text-muted">{p.designation}</p>
                  </div>
                  <ConfidenceBadge confidence={p.data_confidence} />
                </div>
                <p className="text-xs store-text-body line-clamp-2">{p.open_source_summary}</p>
                <div className="flex flex-wrap gap-1">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-lg store-panel-inner store-text-muted">
                    {p.domain}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-lg store-panel-inner store-text-muted">
                    {p.role}
                  </span>
                  {p.qty ? (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-lg store-panel-inner hero-number text-[var(--store-gold)]">
                      ×{p.qty}
                    </span>
                  ) : null}
                </div>
                {p.comms.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {p.comms.slice(0, 4).map((c) => (
                      <span
                        key={c.id}
                        className="text-[9px] font-mono px-1 py-0.5 rounded-lg border border-[var(--cyan)]/25 text-[var(--cyan)] bg-[var(--cyan)]/5"
                      >
                        {c.label.split(' ')[0]}
                      </span>
                    ))}
                    {p.comms.length > 4 ? (
                      <span className="text-[9px] store-text-muted">+{p.comms.length - 4}</span>
                    ) : null}
                  </div>
                ) : null}
                {p.sensors.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {p.sensors.map((s) => (
                      <span
                        key={s.id}
                        className="text-[9px] px-1 py-0.5 rounded border border-[var(--store-line)] store-text-muted"
                        title={s.intel_note ?? s.label}
                      >
                        {s.kind}: {s.label.split(' ')[0]}
                      </span>
                    ))}
                  </div>
                ) : null}
              </StorePanel>
            ))}
          </div>
        </div>
      ))}

      {embedded.length > 0 ? (
        <div>
          <h3 className="text-xs font-semibold text-[#F7F9FC] mb-2 store-display">
            Embedded personnel (liaison)
          </h3>
          <div className="flex flex-wrap gap-2">
            {embedded.map((n) => (
              <span
                key={n.code}
                className="text-xs font-mono px-2 py-1 rounded-lg border border-[var(--store-gold-border)] bg-[var(--store-gold-glow)] text-[var(--store-gold)]"
              >
                {n.name}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
