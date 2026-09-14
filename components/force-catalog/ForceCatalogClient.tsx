'use client'

/**
 * Callers: app/(main)/force-catalog/page.tsx
 * Purpose: Platform Capability Matrix — Battle Picture (default) → Compare → Dossier
 * Spec: docs/force-catalog/PROMPT-BATTLE-PICTURE.md
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Crosshair,
  ExternalLink,
  LayoutGrid,
  List,
  Globe2,
  Grid3x3,
  Rocket,
  Shield,
  SlidersHorizontal,
} from 'lucide-react'
import type {
  Bloc,
  Domain,
  ForceCatalogBundle,
  ForceCatalogPlatformFull,
  ForceSideCatalog,
  PlatformRole,
  ProgramStage,
  ServiceStatus,
} from '@/lib/bmi/bmi-types'
import type { DataConfidence } from '@/lib/types'
import { CATALOG_NATIONS, FUTURE_PROGRAMS } from '@/data/force-catalog'
import { useHubTab, type HubTabDef } from '@/components/hub/HubUrlTabBar'
import { InstrumentRow } from '@/components/force-catalog/InstrumentRow'
import { buildForceInstruments } from '@/lib/force-catalog/force-instruments'
import { ForceCatalogFilters } from '@/components/force-catalog/ForceCatalogFilters'
import { ForceCatalogOverview } from '@/components/force-catalog/ForceCatalogOverview'
import { ForceCatalogGrid } from '@/components/force-catalog/ForceCatalogGrid'
import { ForceCatalogFuture } from '@/components/force-catalog/ForceCatalogFuture'
import { Workbench } from '@/components/force-catalog/workbench/Workbench'
import { ForceCatalogDetail } from '@/components/force-catalog/ForceCatalogDetail'
import { ForceCatalogBattlePicture } from '@/components/force-catalog/ForceCatalogBattlePicture'
import {
  getPreset,
  type EffectId,
  type ScenarioPresetId,
} from '@/lib/force-catalog/battle-picture-model'
import { toggle } from '@/components/force-catalog/force-catalog-ui'
import type { CatalogDensity } from '@/components/force-catalog/PlatformCard'

const TABS: HubTabDef[] = [
  { key: 'battle', label: 'Battle Picture', icon: Crosshair },
  { key: 'force', label: 'Force', icon: Shield },
  { key: 'compare', label: 'Compare', icon: Grid3x3 },
  { key: 'future', label: 'Future', icon: Rocket },
  { key: 'nation', label: 'By Nation', icon: Globe2 },
  { key: 'overview', label: 'Overview', icon: LayoutGrid },
]

interface Props {
  bundle: ForceCatalogBundle
}

export function ForceCatalogClient({ bundle }: Props) {
  const { activeTab, setTab, searchParams } = useHubTab('/force-catalog', TABS, 'battle')
  const isPopout = searchParams.get('popout') === '1'

  const [search, setSearch] = useState('')
  const [density, setDensity] = useState<CatalogDensity>('grid')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedIdRef = useRef<string | null>(null)
  const cardRefs = useRef(new Map<string, HTMLButtonElement>())
  selectedIdRef.current = selectedId
  const [forceSides, setForceSides] = useState<ForceSideCatalog[]>([])
  const [blocs, setBlocs] = useState<Bloc[]>([])
  const [nationCodes, setNationCodes] = useState<string[]>([])
  const [domains, setDomains] = useState<Domain[]>([])
  const [roles, setRoles] = useState<PlatformRole[]>([])
  const [statuses, setStatuses] = useState<ServiceStatus[]>([])
  const [stages, setStages] = useState<ProgramStage[]>([])
  const [confidence, setConfidence] = useState<DataConfidence[]>([])
  const [activePreset, setActivePreset] = useState<ScenarioPresetId | null>(null)
  const [compareScopeIds, setCompareScopeIds] = useState<string[] | null>(null)

  const nationByCode = useMemo(() => {
    return new Map(CATALOG_NATIONS.map((n) => [n.code, n]))
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return bundle.platforms.filter((p) => {
      if (forceSides.length && !forceSides.includes(p.force_side)) return false
      if (nationCodes.length && !nationCodes.includes(p.nation_code)) return false
      if (domains.length && !domains.includes(p.domain)) return false
      if (roles.length && !roles.includes(p.role)) return false
      if (statuses.length && !statuses.includes(p.service_status)) return false
      if (stages.length && !stages.includes(p.program_stage)) return false
      if (confidence.length && !confidence.includes(p.data_confidence)) return false
      if (blocs.length) {
        const n = nationByCode.get(p.nation_code)
        if (!n || !n.blocs.some((b) => blocs.includes(b))) return false
      }
      if (q) {
        const hay =
          `${p.short_name} ${p.designation} ${p.nation_code} ${p.id} ${p.open_source_summary} ${p.future?.program_name ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [
    bundle.platforms,
    forceSides,
    nationCodes,
    domains,
    roles,
    statuses,
    stages,
    confidence,
    blocs,
    nationByCode,
    search,
  ])

  const comparePlatforms = useMemo(() => {
    if (!compareScopeIds?.length) return filtered
    const allow = new Set(compareScopeIds)
    return filtered.filter((p) => allow.has(p.id))
  }, [filtered, compareScopeIds])

  const instruments = useMemo(() => buildForceInstruments(filtered), [filtered])

  const filteredFuture = useMemo(() => {
    const ids = new Set(filtered.map((p) => p.id))
    return FUTURE_PROGRAMS.filter((p) => ids.has(p.id))
  }, [filtered])

  const byNation = useMemo(() => {
    const groups = new Map<string, ForceCatalogPlatformFull[]>()
    for (const p of filtered) {
      const list = groups.get(p.nation_code) ?? []
      list.push(p)
      groups.set(p.nation_code, list)
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])


  const roleOptions = useMemo(
    () => [...new Set(bundle.platforms.map((p) => p.role))].sort(),
    [bundle.platforms],
  )
  const statusOptions = useMemo(
    () => [...new Set(bundle.platforms.map((p) => p.service_status))].sort(),
    [bundle.platforms],
  )
  const stageOptions = useMemo(
    () => [...new Set(bundle.platforms.map((p) => p.program_stage))].sort(),
    [bundle.platforms],
  )
  const confOptions = useMemo(
    () => [...new Set(bundle.platforms.map((p) => p.data_confidence))].sort(),
    [bundle.platforms],
  )

  const activeChips = [
    ...forceSides.map((v) => ({ type: 'side', value: v })),
    ...blocs.map((v) => ({ type: 'bloc', value: v })),
    ...nationCodes.map((v) => ({ type: 'nation', value: v })),
    ...domains.map((v) => ({ type: 'domain', value: v })),
    ...roles.map((v) => ({ type: 'role', value: v })),
    ...statuses.map((v) => ({ type: 'status', value: v })),
    ...stages.map((v) => ({ type: 'stage', value: v })),
    ...confidence.map((v) => ({ type: 'conf', value: v })),
  ]
  if (search.trim()) activeChips.push({ type: 'search', value: search.trim() })

  const customFiltersActive = activeChips.length > 0 && activePreset == null

  const clearChip = useCallback(
    (type: string, value: string) => {
      if (type === 'side') toggle(value as ForceSideCatalog, forceSides, setForceSides)
      if (type === 'bloc') toggle(value as Bloc, blocs, setBlocs)
      if (type === 'nation') toggle(value, nationCodes, setNationCodes)
      if (type === 'domain') toggle(value as Domain, domains, setDomains)
      if (type === 'role') toggle(value as PlatformRole, roles, setRoles)
      if (type === 'status') toggle(value as ServiceStatus, statuses, setStatuses)
      if (type === 'stage') toggle(value as ProgramStage, stages, setStages)
      if (type === 'conf') toggle(value as DataConfidence, confidence, setConfidence)
      if (type === 'search') setSearch('')
      setActivePreset(null)
    },
    [forceSides, blocs, nationCodes, domains, roles, statuses, stages, confidence],
  )

  const clearAll = useCallback(() => {
    setForceSides([])
    setBlocs([])
    setNationCodes([])
    setDomains([])
    setRoles([])
    setStatuses([])
    setStages([])
    setConfidence([])
    setSearch('')
    setActivePreset(null)
    setCompareScopeIds(null)
  }, [])

  const applyPreset = useCallback((id: ScenarioPresetId) => {
    const preset = getPreset(id)
    setActivePreset(id)
    setNationCodes([...preset.nationCodes])
    setForceSides([...preset.forceSides])
    setBlocs([])
    setDomains([])
    setRoles([])
    setStatuses([])
    setStages([])
    setConfidence([])
    setSearch(preset.searchHints[0] ?? '')
    setCompareScopeIds(null)
  }, [])

  const clearPreset = useCallback(() => {
    clearAll()
  }, [clearAll])

  const drillEffect = useCallback(
    (effectId: EffectId, platformIds: string[]) => {
      void effectId
      setCompareScopeIds(platformIds)
        setTab('compare')
    },
    [setTab],
  )

  const openPopout = useCallback(() => {
    const tab = activeTab === 'compare' ? 'compare' : 'battle'
    window.open(
      `/force-catalog?tab=${tab}&popout=1`,
      'spectral-pcm-popout',
      'noopener,noreferrer,width=1280,height=800',
    )
  }, [activeTab])

  const selected = useMemo(
    () => (selectedId ? filtered.find((p) => p.id === selectedId) ?? null : null),
    [filtered, selectedId],
  )

  useEffect(() => {
    if (selectedId && !selected) setSelectedId(null)
  }, [selectedId, selected])

  const onSelect = useCallback((p: ForceCatalogPlatformFull) => {
    setSelectedId((prev) => (prev === p.id ? null : p.id))
  }, [])

  const onCloseDetail = useCallback(() => {
    const id = selectedIdRef.current
    setSelectedId(null)
    requestAnimationFrame(() => {
      if (id) cardRefs.current.get(id)?.focus()
    })
  }, [])

  const registerCardRef = useCallback((id: string, el: HTMLButtonElement | null) => {
    if (el) cardRefs.current.set(id, el)
    else cardRefs.current.delete(id)
  }, [])

  // Compare needs the width for three panes; the rail collapses to a strip there.
  const [railOpen, setRailOpen] = useState(false)
  const hideFilterRail = activeTab === 'battle' || isPopout || (activeTab === 'compare' && !railOpen)

  return (
    <div className="flex flex-col lg:flex-row gap-4 min-h-0" data-testid="force-catalog-client">
      {activeTab === 'compare' && !isPopout ? (
        <button
          type="button"
          onClick={() => setRailOpen((v) => !v)}
          aria-expanded={railOpen}
          aria-controls="force-catalog-filter-rail"
          className="hidden lg:flex shrink-0 w-9 self-start sticky top-4 flex-col items-center gap-2 py-3 rounded-2xl store-panel store-text-muted hover:store-text-body transition-colors duration-150"
          title={railOpen ? 'Hide filters' : 'Show filters'}
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          {activeChips.length > 0 ? <span className="text-[11px] font-mono tabular-nums store-accent">{activeChips.length}</span> : null}
          <span className="text-[11px] font-mono [writing-mode:vertical-rl] rotate-180">Filters</span>
        </button>
      ) : null}
      {!hideFilterRail ? (
        <ForceCatalogFilters
          search={search}
          forceSides={forceSides}
          blocs={blocs}
          nationCodes={nationCodes}
          domains={domains}
          roles={roles}
          statuses={statuses}
          stages={stages}
          confidence={confidence}
          roleOptions={roleOptions}
          statusOptions={statusOptions}
          stageOptions={stageOptions}
          confOptions={confOptions}
          activeCount={activeChips.length}
          onSearch={(v) => {
            setSearch(v)
            setActivePreset(null)
          }}
          setForceSides={(v) => {
            setForceSides(v)
            setActivePreset(null)
          }}
          setBlocs={(v) => {
            setBlocs(v)
            setActivePreset(null)
          }}
          setNationCodes={(v) => {
            setNationCodes(v)
            setActivePreset(null)
          }}
          setDomains={(v) => {
            setDomains(v)
            setActivePreset(null)
          }}
          setRoles={(v) => {
            setRoles(v)
            setActivePreset(null)
          }}
          setStatuses={(v) => {
            setStatuses(v)
            setActivePreset(null)
          }}
          setStages={(v) => {
            setStages(v)
            setActivePreset(null)
          }}
          setConfidence={(v) => {
            setConfidence(v)
            setActivePreset(null)
          }}
          onClearAll={clearAll}
        />
      ) : null}

      <div className="flex-1 min-w-0 space-y-3">
        {!isPopout ? <InstrumentRow inst={instruments} /> : null}
        <div className="flex items-end border-b fc-hair gap-6">
        <nav className="fc-tabs" role="tablist" aria-label="Force catalogue sections">
          {TABS.filter((t) => t.visible !== false).map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={activeTab === t.key}
                data-testid={`force-catalog-tab-${t.key}`}
                onClick={() => {
                  if (t.key !== 'compare') setCompareScopeIds(null)
                  setTab(t.key)
                }}
                className="fc-tab"
              >
                {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden /> : null}
                {t.label}
              </button>
            )
          })}
        </nav>
        <div className="ml-auto flex items-center gap-5 pb-2">
          {activeTab === 'force' || activeTab === 'nation' ? (
            <div className="flex items-center gap-3" role="group" aria-label="Card density">
              <button type="button" aria-pressed={density === 'grid'} aria-label="Comfortable grid density" onClick={() => setDensity('grid')} className="fc-action">
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
              </button>
              <button type="button" aria-pressed={density === 'compact'} aria-label="Compact list density" onClick={() => setDensity('compact')} className="fc-action">
                <List className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          ) : null}
          {activeTab === 'compare' || isPopout ? (
            <button type="button" onClick={openPopout} className="fc-action" aria-label={isPopout ? 'Re-open pop out window' : 'Pop out current tab into a second window'} data-testid="pcm-popout">
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              Pop out
            </button>
          ) : null}
        </div>
        </div>

        {activeChips.length > 0 && activeTab !== 'battle' ? (
          <div className="flex flex-wrap gap-1 items-center">
            {activeChips.map((c) => (
              <button
                key={`${c.type}-${c.value}`}
                type="button"
                onClick={() => clearChip(c.type, c.value)}
                aria-label={`Remove ${c.type} filter ${c.value}`}
                className="text-[11px] font-mono px-2 py-1 min-h-10 rounded border store-line store-text-muted hover:store-text-body transition-[color,border-color] duration-150 ease-out"
              >
                {c.type}:{c.value} ×
              </button>
            ))}
            <button
              type="button"
              onClick={clearAll}
              className="text-[11px] font-mono px-2 py-1 min-h-10 rounded border store-accent-border store-accent"
            >
              Clear all
            </button>
          </div>
        ) : null}

        <div className="flex flex-col xl:flex-row gap-4 min-h-0">
          <div
            className="flex-1 min-w-0"
            role="tabpanel"
            id={`force-catalog-tab-panel-${activeTab}`}
            aria-labelledby={`force-catalog-tab-${activeTab}`}
          >
            {activeTab === 'battle' ? (
              <ForceCatalogBattlePicture
                platforms={filtered}
                instruments={instruments}
                activePreset={activePreset}
                customFiltersActive={customFiltersActive}
                onApplyPreset={applyPreset}
                onClearPreset={clearPreset}
                onDrillEffect={drillEffect}
                onPopout={isPopout ? undefined : openPopout}
              />
            ) : null}
            {activeTab === 'overview' ? (
              <ForceCatalogOverview
                platforms={filtered}
                nations={bundle.nations}
                futureCount={filteredFuture.length}
              />
            ) : null}
            {activeTab === 'force' ? (
              <ForceCatalogGrid
                groups={byNation}
                nationByCode={nationByCode}
                density={density}
                selectedId={selectedId}
                onSelect={onSelect}
                onClear={clearAll}
                registerCardRef={registerCardRef}
              />
            ) : null}
            {activeTab === 'compare' ? (
              <Workbench
                platforms={comparePlatforms}
                onSelect={onSelect}
                scopedFromBattle={Boolean(compareScopeIds?.length)}
                onClearScope={() => setCompareScopeIds(null)}
              />
            ) : null}
            {activeTab === 'future' ? (
              <ForceCatalogFuture
                programs={filteredFuture}
                selectedId={selectedId}
                onSelect={onSelect}
                onClear={clearAll}
                registerCardRef={registerCardRef}
              />
            ) : null}
            {activeTab === 'nation' ? (
              <ForceCatalogGrid
                groups={byNation}
                nationByCode={nationByCode}
                density={density}
                selectedId={selectedId}
                onSelect={onSelect}
                onClear={clearAll}
                registerCardRef={registerCardRef}
                showRegion
              />
            ) : null}
          </div>

          {selected ? (
            <ForceCatalogDetail platform={selected} onClose={onCloseDetail} />
          ) : null}
        </div>
      </div>
    </div>
  )
}
