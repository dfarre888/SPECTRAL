'use client'

/**
 * Gate facts: called by ForceCatalogClient; filter rail for Force Catalogue;
 * no API/schema; user asked Force Catalogue UI polish v2 with attached skills.
 *
 * Progressive disclosure: search, force side and domain are always visible.
 * Everything else sits behind a native <details> disclosure that opens by
 * itself only when it carries an active value, so the rail reads as one
 * short column instead of nine chip clouds.
 */

import { useMemo, useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
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
import { StorePanel } from '@/components/ui/store-surface'
import { Chip, toggle } from '@/components/force-catalog/force-catalog-ui'

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
    <fieldset className="space-y-1 border-0 p-0 m-0">
      <legend className={showLegend ? 'text-[11px] font-mono store-text-muted px-0' : 'sr-only'}>
        {legend}
      </legend>
      <div className="flex flex-wrap gap-1">
        {options.map((o) => (
          <Chip
            key={o}
            side={sideOf?.(o)}
            active={value.includes(o)}
            onClick={() => toggle(o, value, onChange)}
          >
            {o}
          </Chip>
        ))}
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
    <details className="group border-t store-line pt-2" open={count > 0 || undefined}>
      <summary className="flex items-center gap-2 cursor-pointer list-none min-h-10 -my-1 select-none [&::-webkit-details-marker]:hidden">
        <ChevronRight
          className="h-3.5 w-3.5 store-text-muted transition-transform duration-150 ease-out group-open:rotate-90"
          aria-hidden
        />
        <span className="text-[11px] store-text-body">{label}</span>
        {count > 0 ? (
          <span className="ml-auto text-[11px] font-mono tabular-nums store-accent">{count}</span>
        ) : null}
      </summary>
      <div className="pt-1 pb-2 pl-5">{children}</div>
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
      className="w-full lg:w-[260px] shrink-0 lg:sticky lg:top-4 lg:self-start"
      aria-label="Catalogue filters"
    >
      <StorePanel className="p-3 space-y-3">
        <div className="flex items-center justify-between gap-2 min-h-8">
          <p className="text-[11px] store-text-body">
            Filters
            {activeCount > 0 ? (
              <span className="ml-1.5 font-mono tabular-nums store-accent">{activeCount}</span>
            ) : null}
          </p>
          {activeCount > 0 ? (
            <button
              type="button"
              onClick={onClearAll}
              className="text-[11px] font-mono store-text-muted hover:store-text-body px-1 transition-colors duration-150"
            >
              Clear all
            </button>
          ) : null}
        </div>

        <label className="block">
          <span className="sr-only">Search platforms</span>
          <input
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Name, designation, nation, id"
            className="w-full rounded-lg border store-line bg-[var(--store-surface-2)] px-2.5 py-2 text-[12px] font-mono store-text-body placeholder:text-[var(--store-ink-mute)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--wb-blue)]"
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
              className="mb-2 w-full rounded border store-line bg-[var(--store-surface-2)] px-2 py-1.5 text-[11px] font-mono store-text-body placeholder:text-[var(--store-ink-mute)]"
            />
            <div className="flex flex-wrap gap-1 max-h-48 overflow-y-auto pr-1">
              {nations.map((n) => (
                <Chip
                  key={n.code}
                  side={n.force_side}
                  active={nationCodes.includes(n.code)}
                  onClick={() => toggle(n.code, nationCodes, setNationCodes)}
                >
                  {n.code}
                </Chip>
              ))}
            </div>
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
