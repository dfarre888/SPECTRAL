'use client'

/**
 * Gate facts: called by ForceCatalogClient; filter rail for Force Catalogue;
 * no API/schema.
 *
 * Progressive disclosure: search, force side and domain are always visible.
 * Everything else sits behind a native <details> disclosure that opens by
 * itself only when it carries an active value, so the rail reads as one
 * short column instead of nine chip clouds.
 */

import { useMemo, useState, type ReactNode } from 'react'
import { ChevronRight, Search } from 'lucide-react'
import type {
  Bloc,
  Domain,
  ForceSideCatalog,
  PlatformRole,
  ProgramStage,
  ServiceStatus,
} from '@/lib/bmi/bmi-types'
import type { DataConfidence } from '@/lib/types'
import { CATALOG_NATIONS } from '@/data/force-catalog'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { StorePanel } from '@/components/ui/store-surface'
import { Chip, SideDot, toggle } from '@/components/force-catalog/force-catalog-ui'

const FORCE_SIDES: ForceSideCatalog[] = ['blue', 'red', 'neutral']
const DOMAINS: Domain[] = ['air', 'ground', 'maritime']
const BLOCS: Bloc[] = [
  'NATO',
  'FiveEyes',
  'Indo-Pacific',
  'CRINK',
  'EU',
  'Non-aligned',
  'Non-state',
]

export interface ForceCatalogFilterState {
  search: string
  forceSides: ForceSideCatalog[]
  blocs: Bloc[]
  nationCodes: string[]
  domains: Domain[]
  roles: PlatformRole[]
  statuses: ServiceStatus[]
  stages: ProgramStage[]
  confidence: DataConfidence[]
  roleOptions: PlatformRole[]
  statusOptions: ServiceStatus[]
  stageOptions: ProgramStage[]
  confOptions: DataConfidence[]
  activeCount: number
  onSearch: (v: string) => void
  setForceSides: (v: ForceSideCatalog[]) => void
  setBlocs: (v: Bloc[]) => void
  setNationCodes: (v: string[]) => void
  setDomains: (v: Domain[]) => void
  setRoles: (v: PlatformRole[]) => void
  setStatuses: (v: ServiceStatus[]) => void
  setStages: (v: ProgramStage[]) => void
  setConfidence: (v: DataConfidence[]) => void
  onClearAll: () => void
}

/** Enum values whose plain-English form is an acronym. */
const PRETTY: Record<string, string> = {
  aew_c: 'AEW&C',
  isr: 'ISR',
  ew: 'EW',
  c2_ground: 'Ground C2',
  radar_ground: 'Ground radar',
  trainer_lead_in: 'Lead-in trainer',
  lrip: 'LRIP',
  emd: 'EMD',
  r_and_d: 'R&D',
}

/** 'technology_demonstrator' reads as 'Technology demonstrator'. */
export function pretty(s: string): string {
  if (PRETTY[s]) return PRETTY[s]
  const t = s.replace(/_/g, ' ')
  return t.charAt(0).toUpperCase() + t.slice(1)
}

function ChipRow<T extends string>({
  legend,
  options,
  value,
  onChange,
  sideOf,
  showLegend = false,
}: {
  legend: string
  showLegend?: boolean
  options: readonly T[]
  value: T[]
  onChange: (v: T[]) => void
  sideOf?: (o: T) => ForceSideCatalog | undefined
}) {
  return (
    <fieldset className="m-0 space-y-2 border-0 p-0">
      <legend className={showLegend ? 'mb-2 px-0 text-[12px] store-text-muted' : 'sr-only'}>{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const side = sideOf?.(o)
          return (
            <Chip key={o} active={value.includes(o)} onClick={() => toggle(o, value, onChange)}>
              {side ? <SideDot side={side} /> : null}
              {pretty(o)}
            </Chip>
          )
        })}
      </div>
    </fieldset>
  )
}

/** Native disclosure. Opens itself when it holds an active value. */
function Disclosure({
  label,
  count,
  children,
}: {
  label: string
  count: number
  children: ReactNode
}) {
  return (
    <details className="group border-t border-[var(--store-line)]" open={count > 0 || undefined}>
      <summary className="flex min-h-10 cursor-pointer list-none select-none items-center gap-2 [&::-webkit-details-marker]:hidden">
        <ChevronRight
          className="h-3.5 w-3.5 store-text-muted transition-transform duration-150 ease-out group-open:rotate-90"
          aria-hidden
        />
        <span className="text-[13px] store-text-body group-hover:text-[var(--store-ink)]">{label}</span>
        {count > 0 ? (
          <span className="ml-auto font-mono text-[12px] tabular-nums text-[var(--wb-blue)]">{count}</span>
        ) : null}
      </summary>
      <div className="pb-3 pl-5">{children}</div>
    </details>
  )
}

export function ForceCatalogFilters(props: ForceCatalogFilterState) {
  const {
    search,
    forceSides,
    blocs,
    nationCodes,
    domains,
    roles,
    statuses,
    stages,
    confidence,
    roleOptions,
    statusOptions,
    stageOptions,
    confOptions,
    activeCount,
    onSearch,
    setForceSides,
    setBlocs,
    setNationCodes,
    setDomains,
    setRoles,
    setStatuses,
    setStages,
    setConfidence,
    onClearAll,
  } = props

  const [nationQuery, setNationQuery] = useState('')
  const nations = useMemo(() => {
    const q = nationQuery.trim().toLowerCase()
    if (!q) return CATALOG_NATIONS
    return CATALOG_NATIONS.filter(
      (n) =>
        n.code.toLowerCase().includes(q) ||
        n.name.toLowerCase().includes(q) ||
        nationCodes.includes(n.code),
    )
  }, [nationQuery, nationCodes])

  return (
    <aside
      id="force-catalog-filter-rail"
      className="w-full shrink-0 lg:sticky lg:top-2 lg:w-[260px] lg:self-start"
      aria-label="Catalogue filters"
    >
      <StorePanel className="space-y-4 p-4">
        <div className="flex min-h-7 items-center justify-between gap-2">
          <p className="wb-pane-title">
            Filters
            {activeCount > 0 ? (
              <span className="ml-2 font-mono text-[12px] font-normal tabular-nums text-[var(--wb-blue)]">{activeCount}</span>
            ) : null}
          </p>
          {activeCount > 0 ? (
            <button type="button" onClick={onClearAll} className="fc-action">
              Clear all
            </button>
          ) : null}
        </div>

        <label className="relative block">
          <span className="sr-only">Search platforms</span>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 store-text-muted" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Name, designation, nation"
            className="glass-field h-9 w-full pl-8 pr-2.5 text-[13px]"
          />
        </label>

        <ChipRow
          legend="Force side"
          showLegend
          options={FORCE_SIDES}
          value={forceSides}
          onChange={setForceSides}
          sideOf={(s) => s}
        />
        <ChipRow legend="Domain" showLegend options={DOMAINS} value={domains} onChange={setDomains} />

        <div>
          <Disclosure label="Nation" count={nationCodes.length}>
            <input
              type="search"
              value={nationQuery}
              onChange={(e) => setNationQuery(e.target.value)}
              placeholder="Find nation"
              aria-label="Find nation"
              className="glass-field mb-2 h-8 w-full px-2.5 text-[12px]"
            />
            <ScrollArea frame={false} maxHeight="200px">
              <div className="flex flex-wrap gap-1.5 pr-1">
                {nations.map((n) => (
                  <span key={n.code} title={n.name}>
                    <Chip active={nationCodes.includes(n.code)} onClick={() => toggle(n.code, nationCodes, setNationCodes)}>
                      <SideDot side={n.force_side} />
                      <span className="font-mono">{n.code}</span>
                    </Chip>
                  </span>
                ))}
              </div>
            </ScrollArea>
          </Disclosure>
          <Disclosure label="Bloc" count={blocs.length}>
            <ChipRow legend="Bloc" options={BLOCS} value={blocs} onChange={setBlocs} />
          </Disclosure>
          <Disclosure label="Role" count={roles.length}>
            <ChipRow legend="Role" options={roleOptions} value={roles} onChange={setRoles} />
          </Disclosure>
          <Disclosure label="Service status" count={statuses.length}>
            <ChipRow legend="Service status" options={statusOptions} value={statuses} onChange={setStatuses} />
          </Disclosure>
          <Disclosure label="Program stage" count={stages.length}>
            <ChipRow legend="Program stage" options={stageOptions} value={stages} onChange={setStages} />
          </Disclosure>
          <Disclosure label="Confidence" count={confidence.length}>
            <ChipRow legend="Confidence" options={confOptions} value={confidence} onChange={setConfidence} />
          </Disclosure>
        </div>
      </StorePanel>
    </aside>
  )
}
