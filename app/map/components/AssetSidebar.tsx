'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ChevronDown,
  ChevronRight,
  Crosshair,
  Map,
  Radio,
  Search,
  Shield,
  Plane,
  Radar,
  Target,
  X,
} from 'lucide-react'
import { LoiterControls } from '@/app/map/components/LoiterControls'
import { MissionPathControls } from '@/app/map/components/MissionPathControls'
import { RoutePlanner } from '@/app/map/components/RoutePlanner'
import { EditionBadge } from '@/components/operations/EditionBadge'
import { PlatformThumbnail } from '@/components/platforms/PlatformThumbnail'
import { isOperationsEditionClient } from '@/lib/operations/edition-client'
import { StoreFilterSection } from '@/components/catalog/StoreFilterSidebar'
import { StoreEyebrow, StorePanel } from '@/components/ui/store-surface'
import {
  applyForceFilter,
  matchesForceFilter,
  assetSideForceSides,
  cuasForceSides,
  filterMapAssetHits,
  type MapForceFilter,
  uasForceSides,
} from '@/lib/map/force-filter'
import { filterMapAssets, type MapAssetSearchHit } from '@/lib/map/map-asset-search'
import { operationalEnvelopeRadiusKm } from '@/lib/map/range-declaration'
import type { SelectedLaydownItem } from '@/lib/map/laydown-evaluation'
import { isSameLaydownItem } from '@/lib/map/laydown-evaluation'
import type { RcsFacets } from '@/lib/spectral/detectionPhysicsConstants'
import type {
  MapAssetsPayload,
  MapCuasAsset,
  MapEffectorAsset,
  MapRadarAsset,
  MapUasAsset,
  PlacedCuas,
  PlacedEffector,
  PlacedRadar,
  PlacedUas,
  PlacementMode,
  MissionRouteObjective,
} from '@/lib/map/types'
import { cn } from '@/lib/utils'

interface AssetSidebarProps {
  assets: MapAssetsPayload
  placedUas: PlacedUas[]
  placedCuas: PlacedCuas[]
  selectedLaydownItem?: SelectedLaydownItem | null
  onSelectPlacedItem?: (item: SelectedLaydownItem) => void
  placementMode: PlacementMode
  highlightedIds?: string[]
  onSelectUas: (asset: MapUasAsset) => void
  onSelectCuas: (asset: MapCuasAsset) => void
  onPlaceLoiter: (uas: PlacedUas) => void
  onClearLoiter: (uasInstanceId: string) => void
  onReplanMission?: (uasInstanceId: string, options?: { clearManualOverride?: boolean }) => void
  onClearMission?: (uasInstanceId: string) => void
  onMissionEmcon?: (uasInstanceId: string, emcon: boolean) => void
  onMissionRouteObjective?: (uasInstanceId: string, objective: MissionRouteObjective) => void
  rcsOverrides?: Record<string, RcsFacets>
  onRcsChange?: (instanceId: string, facets: RcsFacets | undefined) => void
  onRemoveUas: (instanceId: string) => void
  onRemoveCuas: (instanceId: string) => void
  placedRadars: PlacedRadar[]
  placedEffectors: PlacedEffector[]
  onSelectRadar: (asset: MapRadarAsset) => void
  onSelectEffector: (asset: MapEffectorAsset) => void
  onRemoveRadar: (instanceId: string) => void
  onRemoveEffector: (instanceId: string) => void
  overlapLegend?: { defeat: number; survivable: number }
  overlapSource?: 'defeat-check' | 'adjudication' | 'geometry'
  heatmapEnabled?: boolean
  heatmapLoading?: boolean
  heatmapError?: string | null
  onToggleHeatmap?: () => void
  onOpenSpectralAnalysis?: () => void
}

export function AssetSidebar({
  assets,
  placedUas,
  placedCuas,
  selectedLaydownItem = null,
  onSelectPlacedItem,
  placementMode,
  highlightedIds = [],
  onSelectUas,
  onSelectCuas,
  onPlaceLoiter,
  onClearLoiter,
  onReplanMission,
  onClearMission,
  onMissionEmcon,
  onMissionRouteObjective,
  rcsOverrides,
  onRcsChange,
  onRemoveUas,
  onRemoveCuas,
  placedRadars,
  placedEffectors,
  onSelectRadar,
  onSelectEffector,
  onRemoveRadar,
  onRemoveEffector,
  overlapLegend,
  overlapSource,
  heatmapEnabled,
  heatmapLoading,
  heatmapError,
  onToggleHeatmap,
  onOpenSpectralAnalysis,
}: AssetSidebarProps) {
  const operations = isOperationsEditionClient()
  const [uasOpen, setUasOpen] = useState(false)
  const [cuasOpen, setCuasOpen] = useState(false)
  const [radarsOpen, setRadarsOpen] = useState(false)
  const [effectorsOpen, setEffectorsOpen] = useState(false)
  const [placedOpen, setPlacedOpen] = useState(false)
  const [legendOpen, setLegendOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [forceFilter, setForceFilter] = useState<MapForceFilter>('both')

  const filtered = useMemo(() => filterMapAssets(assets, search), [assets, search])
  const searchActive = search.trim().length > 0
  const baseUas = searchActive ? filtered.uas : assets.uas
  const baseCuas = searchActive ? filtered.cuas : assets.cuas
  const baseRadars = searchActive ? filtered.radars : assets.radars
  const baseEffectors = searchActive ? filtered.effectors : assets.effectors

  const visibleUas = useMemo(
    () => applyForceFilter(baseUas, forceFilter, uasForceSides),
    [baseUas, forceFilter],
  )
  const visibleCuas = useMemo(
    () => applyForceFilter(baseCuas, forceFilter, cuasForceSides),
    [baseCuas, forceFilter],
  )
  const visibleRadars = useMemo(
    () => applyForceFilter(baseRadars, forceFilter, assetSideForceSides),
    [baseRadars, forceFilter],
  )
  const visibleEffectors = useMemo(
    () => applyForceFilter(baseEffectors, forceFilter, assetSideForceSides),
    [baseEffectors, forceFilter],
  )
  const visibleHits = useMemo(
    () => filterMapAssetHits(filtered.hits, forceFilter),
    [filtered.hits, forceFilter],
  )

  const placingUasId =
    placementMode.active && placementMode.kind === 'uas' ? placementMode.asset.id : null
  const placingCuasId =
    placementMode.active && placementMode.kind === 'cuas' ? placementMode.asset.id : null
  const placingRadarId =
    placementMode.active && placementMode.kind === 'radar' ? placementMode.asset.id : null
  const placingEffectorId =
    placementMode.active && placementMode.kind === 'effector' ? placementMode.asset.id : null
  const loiterPlacingId =
    placementMode.active && placementMode.kind === 'loiter'
      ? placementMode.uasInstanceId
      : null

  useEffect(() => {
    const cuasCatalogIds = new Set(assets.cuas.map((c) => c.id))
    if (highlightedIds.some((id) => cuasCatalogIds.has(id))) {
      setCuasOpen(true)
      setPlacedOpen(true)
    }
  }, [highlightedIds, assets.cuas])

  useEffect(() => {
    if (forceFilter === 'red' && visibleUas.length > 0) setUasOpen(true)
    if (forceFilter === 'blue') {
      if (visibleCuas.length > 0) setCuasOpen(true)
      if (visibleRadars.length > 0) setRadarsOpen(true)
      if (visibleEffectors.length > 0) setEffectorsOpen(true)
    }
  }, [forceFilter, visibleUas.length, visibleCuas.length, visibleRadars.length, visibleEffectors.length])

    const dualRoleIds = new Set(
    assets.uas.filter((u) => assets.cuas.some((c) => c.id === u.id)).map((u) => u.id),
  )

  return (
    <aside
      className={cn(
        'w-72 xl:w-80 flex-shrink-0 flex flex-col h-full',
        'store-panel border-r border-[var(--store-line)] border-t-0 border-b-0 border-l-0 rounded-none',
        'bg-[var(--store-surface)]',
      )}
    >
      {/* Header — matches main Sidebar / store catalog */}
      <div className="px-5 py-4 border-b border-[var(--store-line)]">
        <Link
          href="/"
          className="text-[11px] store-text-muted hover:text-[var(--store-accent)] transition-colors mb-3 inline-block"
        >
          ← Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--store-accent-glow)] border border-[var(--store-accent-border)] flex items-center justify-center shrink-0">
            <Map className="w-4 h-4 text-[var(--store-accent)]" />
          </div>
          <div className="min-w-0">
            <p className="store-display font-bold text-white tracking-wide text-sm">Map Intel</p>
            <p className="text-[10px] store-text-muted">Terrain laydown & envelopes</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <StoreEyebrow icon={<Crosshair size={12} />}>Place assets on globe</StoreEyebrow>
          <EditionBadge />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <ForceFilterButton
            label="RED"
            active={forceFilter === 'red'}
            activeClassName="bg-red-600 text-white border-red-600"
            onClick={() => setForceFilter('red')}
          />
          <ForceFilterButton
            label="BLUE"
            active={forceFilter === 'blue'}
            activeClassName="bg-blue-600 text-white border-blue-600"
            onClick={() => setForceFilter('blue')}
          />
          <ForceFilterButton
            label="BOTH"
            active={forceFilter === 'both'}
            activeClassName="bg-orange text-[#0a0a0a] border-orange"
            onClick={() => setForceFilter('both')}
          />
        </div>
      </div>

      <div className="px-5 py-3 border-b border-[var(--store-line)]">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 store-text-muted"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search platforms, NATO name…"
            className="w-full text-[13px] pl-9 pr-9 py-2.5 rounded-xl text-white store-panel-inner focus:outline-none focus:border-[var(--store-accent-border)]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 store-text-muted hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {searchActive && (
          <StoreFilterSection label="Search results">
            <p className="text-[11px] font-mono store-text-muted mb-2">
              {visibleHits.length} {visibleHits.length === 1 ? 'match' : 'matches'}
            </p>
            {visibleHits.length === 0 ? (
              <p className="text-[13px] store-text-muted py-2">
                No assets match &ldquo;{search.trim()}&rdquo;
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
                {visibleHits.map((hit) => (
                  <MapSearchResultCard
                    key={`${hit.kind}-${hit.asset.id}`}
                    hit={hit}
                    placingUasId={placingUasId}
                    placingCuasId={placingCuasId}
                    placingRadarId={placingRadarId}
                    placingEffectorId={placingEffectorId}
                    highlightedIds={highlightedIds}
                    onSelectUas={onSelectUas}
                    onSelectCuas={onSelectCuas}
                    onSelectRadar={onSelectRadar}
                    onSelectEffector={onSelectEffector}
                  />
                ))}
              </div>
            )}
          </StoreFilterSection>
        )}

        {(!searchActive || visibleUas.length > 0) && (
          <CollapsibleSection
          open={uasOpen}
          onToggle={() => setUasOpen(!uasOpen)}
          label="Threat platforms"
          count={visibleUas.length}
          icon={<Plane size={14} className="text-[var(--store-accent)]" />}
        >
          <div className="space-y-2 max-h-52 overflow-y-auto pr-0.5">
            {visibleUas.map((asset) => (
              <MapAssetPickCard
                key={asset.id}
                id={asset.id}
                kicker="UAS"
                name={asset.name}
                sub={formatUasSubline(asset)}
                active={placingUasId === asset.id}
                highlighted={highlightedIds.includes(asset.id)}
                onClick={() => onSelectUas(asset)}
                accent="threat"
                thumbnailVariant="uas"
              />
            ))}
          </div>
        </CollapsibleSection>
        )}

        {(!searchActive || visibleCuas.length > 0) && (
        <CollapsibleSection
          open={cuasOpen}
          onToggle={() => setCuasOpen(!cuasOpen)}
          label="Defeat systems"
          count={visibleCuas.length}
          icon={<Shield size={14} className="text-[var(--store-success)]" />}
        >
          <div className="space-y-2 max-h-52 overflow-y-auto pr-0.5">
            {visibleCuas.map((asset) => (
              <MapAssetPickCard
                key={`${asset.id}-${asset.name}`}
                id={asset.id}
                kicker={asset.categoryLabel}
                name={asset.name}
                sub={`${asset.defeat_range_km.toFixed(1)} km defeat envelope`}
                active={placingCuasId === asset.id}
                highlighted={highlightedIds.includes(asset.id)}
                onClick={() => onSelectCuas(asset)}
                accent="defeat"
                thumbnailVariant="cuas"
              />
            ))}
          </div>
        </CollapsibleSection>
        )}

        {visibleRadars.length > 0 && (
          <CollapsibleSection
            open={radarsOpen}
            onToggle={() => setRadarsOpen(!radarsOpen)}
            label="Radars"
            count={visibleRadars.length}
            icon={<Radar size={14} className="text-cyan" />}
          >
            <div className="space-y-2 max-h-52 overflow-y-auto pr-0.5">
              {visibleRadars.map((asset) => (
                <MapAssetPickCard
                  key={asset.id}
                  id={asset.id}
                  kicker={asset.roleLabel}
                  name={asset.name}
                  sub={formatRadarSubline(asset)}
                  active={placingRadarId === asset.id}
                  highlighted={highlightedIds.includes(asset.id)}
                  onClick={() => onSelectRadar(asset)}
                  accent={asset.side === 'red' ? 'hostile' : 'radar'}
                  thumbnailVariant="cuas"
                />
              ))}
            </div>
          </CollapsibleSection>
        )}

        {visibleEffectors.length > 0 && (
          <CollapsibleSection
            open={effectorsOpen}
            onToggle={() => setEffectorsOpen(!effectorsOpen)}
            label="SAM / BMD / effectors"
            count={visibleEffectors.length}
            icon={<Target size={14} className="text-orange" />}
          >
            <div className="space-y-2 max-h-52 overflow-y-auto pr-0.5">
              {visibleEffectors.map((asset) => (
                <MapAssetPickCard
                  key={asset.id}
                  id={asset.id}
                  kicker={asset.tierLabel}
                  name={asset.name}
                  sub={formatEffectorSubline(asset)}
                  active={placingEffectorId === asset.id}
                  highlighted={highlightedIds.includes(asset.id)}
                  onClick={() => onSelectEffector(asset)}
                  accent={asset.side === 'red' ? 'hostile' : 'effector'}
                  thumbnailVariant="cuas"
                />
              ))}
            </div>
          </CollapsibleSection>
        )}

        {(placedUas.length > 0 ||
          placedCuas.length > 0 ||
          placedRadars.length > 0 ||
          placedEffectors.length > 0) && (
          <CollapsibleSection
            open={placedOpen}
            onToggle={() => setPlacedOpen(!placedOpen)}
            label="On map"
            count={
              placedUas.length +
              placedCuas.length +
              placedRadars.length +
              placedEffectors.length
            }

            icon={<Crosshair size={14} className="store-text-muted" />}
          >
            <div className="space-y-2">
              {placedUas.map((u) => (
                <div
                  key={u.instanceId}
                  role="button"
                  tabIndex={0}
                  className={cn(
                    'rounded-xl cursor-pointer',
                    isSameLaydownItem(selectedLaydownItem, { kind: 'uas', instanceId: u.instanceId }) &&
                      'ring-2 ring-[var(--store-accent-border)]',
                  )}
                  onClick={() => onSelectPlacedItem?.({ kind: 'uas', instanceId: u.instanceId })}
                >
                <StorePanel inner className="relative p-3 pl-9">
                  <RemoveButton
                    label={`Remove ${u.asset.name}`}
                    onClick={() => onRemoveUas(u.instanceId)}
                  />
                  <div className="flex items-start gap-3">
                    <PlatformThumbnail id={u.asset.id} name={u.asset.name} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-white truncate">{u.asset.name}</p>
                      <p className="text-[11px] store-text-muted font-mono mt-0.5">
                        {u.lat.toFixed(4)}°, {u.lon.toFixed(4)}°
                      </p>
                      <p className="text-[11px] store-text-body mt-1">
                        {(u.lateralRadius_m / 1000).toFixed(1)} km combat envelope
                      </p>
                    </div>
                  </div>
                  <div
                    className={cn(
                      'mt-2',
                      loiterPlacingId === u.instanceId && 'ring-1 ring-[var(--store-accent-border)] rounded-xl',
                    )}
                  >
                    <RoutePlanner
                      uas={u}
                      rcsOverride={rcsOverrides?.[u.instanceId]}
                      onRcsChange={(id, facets) => onRcsChange?.(id, facets)}
                    />
                    <MissionPathControls
                      uas={u}
                      onReplan={() => onReplanMission?.(u.instanceId)}
                      onClear={() => onClearMission?.(u.instanceId)}
                      onEmconChange={(v) => onMissionEmcon?.(u.instanceId, v)}
                      onRouteObjectiveChange={(objective) => onMissionRouteObjective?.(u.instanceId, objective)}
                    />
                    <LoiterControls
                      uas={u}
                      loiterPlacing={loiterPlacingId === u.instanceId}
                      onPlaceLoiter={() => onPlaceLoiter(u)}
                      onClearLoiter={() => onClearLoiter(u.instanceId)}
                    />
                  </div>
                </StorePanel>
                </div>
              ))}
              {placedCuas.map((c) => (
                <div
                  key={c.instanceId}
                  role="button"
                  tabIndex={0}
                  className={cn(
                    'rounded-xl cursor-pointer',
                    isSameLaydownItem(selectedLaydownItem, { kind: 'cuas', instanceId: c.instanceId }) &&
                      'ring-2 ring-[var(--store-accent-border)]',
                  )}
                  onClick={() => onSelectPlacedItem?.({ kind: 'cuas', instanceId: c.instanceId })}
                >
                <StorePanel inner className="relative p-3 pl-9">
                  <RemoveButton
                    label={`Remove ${c.asset.name}`}
                    onClick={() => onRemoveCuas(c.instanceId)}
                  />
                  <div className="flex items-start gap-3">
                    <PlatformThumbnail
                      id={c.asset.id}
                      name={c.asset.name}
                      size="md"
                      variant="cuas"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-white truncate">{c.asset.name}</p>
                      <p className="text-[11px] store-text-muted font-mono mt-0.5">
                        {c.lat.toFixed(4)}°, {c.lon.toFixed(4)}°
                      </p>
                      {c.hasTerrainMasking && (
                        <p className="text-[11px] text-[var(--store-accent)] mt-1">
                          Terrain masking active
                        </p>
                      )}
                    </div>
                  </div>
                </StorePanel>
                </div>
              ))}

              {placedRadars.map((r) => (
                <div
                  key={r.instanceId}
                  role="button"
                  tabIndex={0}
                  className={cn(
                    'rounded-xl cursor-pointer',
                    isSameLaydownItem(selectedLaydownItem, { kind: 'radar', instanceId: r.instanceId }) &&
                      'ring-2 ring-[var(--store-accent-border)]',
                  )}
                  onClick={() => onSelectPlacedItem?.({ kind: 'radar', instanceId: r.instanceId })}
                >
                <StorePanel inner className="relative p-3 pl-9">
                  <RemoveButton
                    label={`Remove ${r.asset.name}`}
                    onClick={() => onRemoveRadar(r.instanceId)}
                  />
                  <div className="flex items-start gap-3">
                    <PlatformThumbnail id={r.asset.id} name={r.asset.name} size="md" variant="cuas" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-white truncate">{r.asset.name}</p>
                      <p className="text-[11px] store-text-muted font-mono mt-0.5">
                        {r.lat.toFixed(4)}°, {r.lon.toFixed(4)}°
                      </p>
                      <p className="text-[11px] store-text-body mt-1">
                        {r.asset.detection_range_km.toFixed(0)} km detect
                      </p>
                    </div>
                  </div>
                </StorePanel>
                </div>
              ))}
              {placedEffectors.map((e) => (
                <div
                  key={e.instanceId}
                  role="button"
                  tabIndex={0}
                  className={cn(
                    'rounded-xl cursor-pointer',
                    isSameLaydownItem(selectedLaydownItem, { kind: 'effector', instanceId: e.instanceId }) &&
                      'ring-2 ring-[var(--store-accent-border)]',
                  )}
                  onClick={() => onSelectPlacedItem?.({ kind: 'effector', instanceId: e.instanceId })}
                >
                <StorePanel inner className="relative p-3 pl-9">
                  <RemoveButton
                    label={`Remove ${e.asset.name}`}
                    onClick={() => onRemoveEffector(e.instanceId)}
                  />
                  <div className="flex items-start gap-3">
                    <PlatformThumbnail id={e.asset.id} name={e.asset.name} size="md" variant="cuas" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-white truncate">{e.asset.name}</p>
                      <p className="text-[11px] store-text-muted font-mono mt-0.5">
                        {e.lat.toFixed(4)}°, {e.lon.toFixed(4)}°
                      </p>
                      <p className="text-[11px] store-text-body mt-1">
                        {e.asset.engagement_max_km.toFixed(0)} km engage
                      </p>
                    </div>
                  </div>
                </StorePanel>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {(placedUas.length > 0 || placedCuas.length > 0) && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={onOpenSpectralAnalysis}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl store-btn-primary text-sm"
              title="Keyboard: S"
            >
              <Radio className="w-4 h-4" />
              Spectral Analysis
            </button>
            {operations && placedCuas.length > 0 && onToggleHeatmap && (
              <button
                type="button"
                onClick={onToggleHeatmap}
                className={cn(
                  'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-mono transition-colors',
                  heatmapEnabled
                    ? 'border-cyan/40 bg-cyan/10 text-cyan'
                    : 'store-panel-inner store-text-body hover:border-cyan/30',
                )}
                title="Keyboard: H — jam coverage heatmap (Operations edition + placed RF jammer)"
              >
                {heatmapLoading ? 'Computing heatmap…' : heatmapEnabled ? 'Hide jam heatmap' : 'Show jam heatmap'}
              </button>
            )}
            {operations && placedCuas.length > 0 && (
              <p className="text-[10px] store-text-muted text-center leading-relaxed">
                Jam heatmap requires Operations edition and a placed C-UAS with RF jamming capability.
              </p>
            )}
            {heatmapEnabled && !heatmapLoading && !heatmapError && (
              <p className="text-[10px] font-mono text-cyan text-center">
                Heatmap overlay active on globe — cyan = stronger jam field, orange = weaker path loss
              </p>
            )}
            {heatmapError && (
              <p className="text-[10px] font-mono text-amber text-center">{heatmapError}</p>
            )}
            <p className="text-[11px] store-text-muted text-center leading-relaxed">
              {operations
                ? 'Server adjudication, J/S, propagation — press S'
                : 'Band overlap + defeat tactics — press S'}
            </p>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-[var(--store-line)]">
        <button
          type="button"
          onClick={() => setLegendOpen(!legendOpen)}
          className="w-full flex items-center justify-between text-[10px] font-semibold tracking-widest uppercase store-text-muted mb-2"
        >
          <span>Map legend</span>
          {legendOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        {legendOpen && (
          <StorePanel inner className="p-3 space-y-2">
            <LegendRow colour="bg-cyan/40" label="Combat envelope" />
            <LegendRow colour="bg-cyan/20" label="Ferry max / wind spec (faint)" />
            <LegendRow colour="bg-orange/40" label="C-UAS defeat dome" />
            <LegendRow colour="bg-cyan/30" label="Radar detection dome (Blue)" />
            <LegendRow colour="bg-red-500/25" label="Radar detection dome (Red)" />
            <LegendRow colour="bg-orange/35" label="SAM / BMD engagement dome" />
            <LegendRow colour="bg-slate-500/40" label="Terrain shield & dead ground" />
            <LegendRow colour="bg-red-500/40" label="Defeat adjudication (≥50%)" />
            <LegendRow colour="bg-green-500/40" label="Survivable (&lt;50%)" />
            {overlapLegend && (overlapLegend.defeat > 0 || overlapLegend.survivable > 0) && (
              <p className="text-[11px] store-text-body pt-1 border-t border-[var(--store-line)]">
                {overlapLegend.defeat} defeat · {overlapLegend.survivable} survivable
                {overlapSource === 'adjudication' && (
                  <span className="block text-[10px] font-mono text-cyan mt-0.5">
                    Dome colours: Operations adjudication
                  </span>
                )}
              </p>
            )}
            {heatmapEnabled && (
              <LegendRow colour="bg-gradient-to-r from-cyan/40 to-orange/40" label="Jam coverage heatmap (dB)" />
            )}
            {dualRoleIds.size > 0 && (
              <p className="text-[10px] store-text-muted leading-snug pt-1">
                Dual-role assets (e.g. Anvil): pick UAS for combat disc, C-UAS for defeat sphere.
              </p>
            )}
          </StorePanel>
        )}
      </div>
    </aside>
  )
}

function ForceFilterButton({
  label,
  active,
  activeClassName,
  onClick,
}: {
  label: string
  active: boolean
  activeClassName: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl border px-2 py-2 text-[10px] font-semibold tracking-widest uppercase transition-colors',
        active
          ? activeClassName
          : 'border-[var(--store-line)] bg-[var(--store-surface-2)] store-text-muted hover:text-white',
      )}
    >
      {label}
    </button>
  )
}

function CollapsibleSection({
  open,
  onToggle,
  label,
  count,
  icon,
  children,
}: {
  open: boolean
  onToggle: () => void
  label: string
  count: number
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <StoreFilterSection label={label}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-2.5 py-2 -mt-1 mb-2 rounded-lg store-text-body hover:bg-[var(--store-surface-2)] hover:text-white transition-all"
      >
        <span className="flex items-center gap-2 text-[13px]">
          {icon}
          <span>{open ? 'Collapse' : 'Expand'}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="font-mono text-[11px] store-text-muted">{count}</span>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>
      {open ? children : null}
    </StoreFilterSection>
  )
}


function MapSearchResultCard({
  hit,
  placingUasId,
  placingCuasId,
  placingRadarId,
  placingEffectorId,
  highlightedIds,
  onSelectUas,
  onSelectCuas,
  onSelectRadar,
  onSelectEffector,
}: {
  hit: MapAssetSearchHit
  placingUasId: string | null
  placingCuasId: string | null
  placingRadarId: string | null
  placingEffectorId: string | null
  highlightedIds: string[]
  onSelectUas: (asset: MapUasAsset) => void
  onSelectCuas: (asset: MapCuasAsset) => void
  onSelectRadar: (asset: MapRadarAsset) => void
  onSelectEffector: (asset: MapEffectorAsset) => void
}) {
  switch (hit.kind) {
    case "uas": {
      const asset = hit.asset as MapUasAsset
      return (
        <MapAssetPickCard
          id={asset.id}
          kicker="UAS"
          name={asset.name}
          sub={formatUasSubline(asset)}
          active={placingUasId === asset.id}
          highlighted={highlightedIds.includes(asset.id)}
          onClick={() => onSelectUas(asset)}
          accent="threat"
          thumbnailVariant="uas"
        />
      )
    }
    case "cuas": {
      const asset = hit.asset as MapCuasAsset
      return (
        <MapAssetPickCard
          id={asset.id}
          kicker={asset.categoryLabel}
          name={asset.name}
          sub={`${asset.defeat_range_km.toFixed(1)} km defeat envelope`}
          active={placingCuasId === asset.id}
          highlighted={highlightedIds.includes(asset.id)}
          onClick={() => onSelectCuas(asset)}
          accent="defeat"
          thumbnailVariant="cuas"
        />
      )
    }
    case "radar": {
      const asset = hit.asset as MapRadarAsset
      return (
        <MapAssetPickCard
          id={asset.id}
          kicker={asset.roleLabel}
          name={asset.name}
          sub={formatRadarSubline(asset)}
          active={placingRadarId === asset.id}
          highlighted={highlightedIds.includes(asset.id)}
          onClick={() => onSelectRadar(asset)}
          accent={asset.side === "red" ? "hostile" : "radar"}
          thumbnailVariant="cuas"
        />
      )
    }
    case "effector": {
      const asset = hit.asset as MapEffectorAsset
      return (
        <MapAssetPickCard
          id={asset.id}
          kicker={asset.tierLabel}
          name={asset.name}
          sub={formatEffectorSubline(asset)}
          active={placingEffectorId === asset.id}
          highlighted={highlightedIds.includes(asset.id)}
          onClick={() => onSelectEffector(asset)}
          accent={asset.side === "red" ? "hostile" : "effector"}
          thumbnailVariant="cuas"
        />
      )
    }
  }
}

function MapAssetPickCard({
  id,
  kicker,
  name,
  sub,
  active,
  highlighted,
  onClick,
  accent,
  thumbnailVariant,
}: {
  id: string
  kicker: string
  name: string
  sub: string
  active: boolean
  highlighted?: boolean
  onClick: () => void
  accent: 'threat' | 'defeat' | 'radar' | 'effector' | 'hostile'
  thumbnailVariant: 'uas' | 'cuas'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-xl overflow-hidden transition-all border',
        active
          ? 'nav-item-active'
          : highlighted
            ? 'border-[var(--store-accent-border)] bg-[var(--store-accent-glow)]'
            : 'store-panel-inner border-[var(--store-line)] hover:border-[var(--store-accent-border)]',
      )}
    >
      <div className="flex gap-3 p-2.5">
        <div
          className={cn(
            'relative w-14 h-14 rounded-lg overflow-hidden shrink-0 store-panel-inner border border-[var(--store-line)]',
            accent === 'threat' || accent === 'radar'
              ? 'shadow-[inset_0_-12px_24px_rgba(6,182,212,0.12)]'
              : accent === 'hostile'
                ? 'shadow-[inset_0_-12px_24px_rgba(239,68,68,0.15)]'
                : 'shadow-[inset_0_-12px_24px_rgba(249,115,22,0.12)]',
          )}
        >
          <PlatformThumbnail
            id={id}
            name={name}
            size="fill"
            variant={thumbnailVariant}
            className="w-full h-full"
          />
        </div>
        <div className="min-w-0 flex-1 py-0.5">
          <p className="text-[10px] font-semibold tracking-widest uppercase store-text-muted truncate">
            {kicker}
          </p>
          <p className="text-[13px] font-semibold text-white leading-snug truncate">{name}</p>
          <p className="text-[11px] store-text-body mt-0.5 line-clamp-2">{sub}</p>
        </div>
      </div>
    </button>
  )
}

function formatUasSubline(asset: MapUasAsset): string {
  const op = operationalEnvelopeRadiusKm(asset)
  const opKm = op.operationalRadiusKm
  const ferry = op.declaredSpecKm
  const rangeStr =
    ferry > opKm + 0.05
      ? `${opKm.toFixed(1)} km ops · ${ferry.toFixed(0)} km ferry`
      : `${opKm.toFixed(1)} km envelope`
  const altRef = asset.altitude_reference === 'AMSL' ? 'AMSL' : 'AGL'
  return `${rangeStr} · ${asset.max_altitude_agl_m} m ${altRef}`
}

function formatRadarSubline(asset: MapRadarAsset): string {
  const sector =
    asset.sector_deg >= 360 ? '360°' : `${asset.sector_deg.toFixed(0)}° sector`
  const nato = asset.nato_name ? ` · ${asset.nato_name}` : ''
  return `${asset.detection_range_km.toFixed(0)} km · ${asset.bandsLabel} · ${sector}${nato}`
}

function formatEffectorSubline(asset: MapEffectorAsset): string {
  const alt = `${asset.alt_min_km.toFixed(0)}–${asset.alt_max_km.toFixed(0)} km alt`
  const cue =
    asset.linkedRadars.length > 0
      ? ` · cue: ${asset.linkedRadars.map((r) => r.name).join(' + ')}`
      : ''
  return `${asset.engagement_max_km.toFixed(0)} km engage · ${alt}${cue}`
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="absolute top-2.5 left-2.5 w-6 h-6 rounded-full grid place-items-center store-panel-inner border border-[var(--store-line)] store-text-muted hover:text-red-400 hover:border-red-400/40 transition-colors"
    >
      <X className="w-3 h-3" />
    </button>
  )
}

function LegendRow({ colour, label }: { colour: string; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={cn('w-3 h-3 rounded-md border border-[var(--store-line)] shrink-0', colour)}
      />
      <span className="text-[11px] store-text-body">{label}</span>
    </div>
  )
}
