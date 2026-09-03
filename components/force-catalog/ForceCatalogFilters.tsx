'use client'

/**
 * Gate facts: called by ForceCatalogClient; filter rail for Force Catalogue;
 * no API/schema; user asked Force Catalogue UI polish v2 with attached skills.
 */

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

  return (
    <aside
      className="w-full lg:w-[260px] shrink-0 space-y-3 lg:sticky lg:top-4 lg:self-start"
      aria-label="Catalogue filters"
    >
      <StorePanel className="p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] uppercase tracking-widest store-text-muted">Filters</p>
          {activeCount > 0 ? (
            <button
              type="button"
              onClick={onClearAll}
              className="text-[9px] font-mono store-accent hover:underline min-h-10 px-1"
            >
              Clear all
            </button>
          ) : null}
        </div>

        <label className="block space-y-1">
          <span className="text-[9px] font-mono store-text-muted">Search</span>
          <input
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="name · designation · nation · id"
            className="w-full rounded-lg border store-line bg-[var(--store-surface-2)] px-2 py-2 text-[11px] font-mono store-text-body placeholder:store-text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--store-accent)]"
          />
        </label>

        <fieldset className="space-y-1 border-0 p-0 m-0">
          <legend className="text-[9px] font-mono store-text-muted px-0">Force side</legend>
          <div className="flex flex-wrap gap-1">
            {FORCE_SIDES.map((s) => (
              <Chip
                key={s}
                side={s}
                active={forceSides.includes(s)}
                onClick={() => toggle(s, forceSides, setForceSides)}
              >
                {s}
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-1 border-0 p-0 m-0">
          <legend className="text-[9px] font-mono store-text-muted px-0">Bloc</legend>
          <div className="flex flex-wrap gap-1">
            {BLOCS.map((b) => (
              <Chip key={b} active={blocs.includes(b)} onClick={() => toggle(b, blocs, setBlocs)}>
                {b}
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-1 border-0 p-0 m-0">
          <legend className="text-[9px] font-mono store-text-muted px-0">Nation</legend>
          <div className="flex flex-wrap gap-1">
            {CATALOG_NATIONS.map((n) => (
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
        </fieldset>

        <fieldset className="space-y-1 border-0 p-0 m-0">
          <legend className="text-[9px] font-mono store-text-muted px-0">Domain</legend>
          <div className="flex flex-wrap gap-1">
            {DOMAINS.map((d) => (
              <Chip key={d} active={domains.includes(d)} onClick={() => toggle(d, domains, setDomains)}>
                {d}
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-1 border-0 p-0 m-0">
          <legend className="text-[9px] font-mono store-text-muted px-0">Role</legend>
          <div className="flex flex-wrap gap-1">
            {roleOptions.map((r) => (
              <Chip key={r} active={roles.includes(r)} onClick={() => toggle(r, roles, setRoles)}>
                {r}
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-1 border-0 p-0 m-0">
          <legend className="text-[9px] font-mono store-text-muted px-0">Service status</legend>
          <div className="flex flex-wrap gap-1">
            {statusOptions.map((s) => (
              <Chip key={s} active={statuses.includes(s)} onClick={() => toggle(s, statuses, setStatuses)}>
                {s}
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-1 border-0 p-0 m-0">
          <legend className="text-[9px] font-mono store-text-muted px-0">Program stage</legend>
          <div className="flex flex-wrap gap-1">
            {stageOptions.map((s) => (
              <Chip key={s} active={stages.includes(s)} onClick={() => toggle(s, stages, setStages)}>
                {s}
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-1 border-0 p-0 m-0">
          <legend className="text-[9px] font-mono store-text-muted px-0">Confidence</legend>
          <div className="flex flex-wrap gap-1">
            {confOptions.map((c) => (
              <Chip
                key={c}
                active={confidence.includes(c)}
                onClick={() => toggle(c, confidence, setConfidence)}
              >
                {c}
              </Chip>
            ))}
          </div>
        </fieldset>
      </StorePanel>
    </aside>
  )
}
