'use client'

import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react'
import {
  ChevronRight,
  Crosshair,
  PanelLeftClose,
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
import { PlatformThumbnail } from '@/components/platforms/PlatformThumbnail'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { isOperationsEditionClient } from '@/lib/operations/edition-client'
import {
  applyForceFilter,
  assetSideForceSides,
  cuasForceSides,
  filterMapAssetHits,
  type MapForceFilter,
  uasForceSides,
} from '@/lib/map/force-filter'
import { formatEffectorDisplayName, formatRadarDisplayName } from '@/lib/map/catalog-display-name'
import { isCotsCatalog, isCotsDji } from '@/lib/map/cots-defaults'
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
  /** Collapse the panel off the globe. */
  onHide?: () => void
  className?: string
}

const FORCE_OPTIONS: { value: MapForceFilter; label: string; dot?: string }[] = [
  { value: 'red', label: 'Red', dot: 'var(--wb-red)' },
  { value: 'blue', label: 'Blue', dot: 'var(--wb-blue)' },
  { value: 'both', label: 'Both' },
]

/**
 * Asset panel: a glass control surface floating over the globe. Force filter,
 * search, then disclosure groups in one bounded scroller, legend at the foot.
 */
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
  onHide,
  className,
}: AssetSidebarProps) {
  const operations = isOperationsEditionClient()
  const [cotsOpen, setCotsOpen] = useState(false)
  const [cotsDjiOpen, setCotsDjiOpen] = useState(false)
  const [uasOpen, setUasOpen] = useState(false)
  const [cuasOpen, setCuasOpen] = useState(false)
  const [radarsOpen, setRadarsOpen] = useState(false)
  const [effectorsOpen, setEffectorsOpen] = useState(false)
  const [placedOpen, setPlacedOpen] = useState(true)
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
  const cotsAll = useMemo(
    () =>
      visibleUas
        .filter((asset) => isCotsCatalog(asset) || isCotsDji(asset))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [visibleUas],
  )
  const cotsDji = useMemo(
    () => cotsAll.filter((asset) => isCotsDji(asset)),
    [cotsAll],
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

  const placedCount = placedUas.length + placedCuas.length + placedRadars.length + placedEffectors.length
  const hasEngagement = placedUas.length > 0 || placedCuas.length > 0

  return (
    <aside
      aria-label="Map assets"
      className={cn('glass-popover pointer-events-auto flex flex-col min-h-0 overflow-hidden', className)}
    >
      {/* Filter and search: always in view. */}
      <div className="shrink-0 px-3 pt-3 pb-2.5 space-y-2.5 border-b border-[var(--glass-line)]">
        <div className="flex items-center gap-2">
          <div className="seg sm flex-1" role="group" aria-label="Force filter">
            {FORCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                aria-pressed={forceFilter === opt.value}
                onClick={() => setForceFilter(opt.value)}
                className="flex-1 justify-center"
              >
                {opt.dot ? (
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: opt.dot }} />
                ) : null}
                {opt.label}
              </button>
            ))}
          </div>
          {onHide ? (
            <button
              type="button"
              onClick={onHide}
              aria-label="Hide asset panel"
              title="Hide asset panel"
              className="glass-icon-btn !w-8 !h-8 shrink-0"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          ) : null}
        </div>
        <div className="relative">
          <Search
            size={14}
            aria-hidden
            className="absolute left-3 top-1/2 -translate-y-1/2 store-text-muted pointer-events-none"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search platforms and NATO names"
            aria-label="Search map assets"
            className="glass-field w-full h-9 pl-9 pr-9 text-[13px]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 glass-icon-btn !w-7 !h-7 !rounded-lg"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <ScrollArea
        frame={false}
        maxHeight="none"
        className="min-h-0 flex flex-col"
        scrollClassName="min-h-0 px-2"
      >
        <div className="py-2">
        {searchActive && (
          <div className="mb-2">
            <div className="flex items-baseline justify-between px-2 pt-1 pb-1.5">
              <span className="text-[12px] font-semibold store-text-muted">Search results</span>
              <span className="font-mono text-[12px] store-text-muted tabular-nums">
                {visibleHits.length} {visibleHits.length === 1 ? 'match' : 'matches'}
              </span>
            </div>
            {visibleHits.length === 0 ? (
              <p className="px-2 py-2 text-[13px] store-text-muted">
                No assets match &ldquo;{search.trim()}&rdquo;
              </p>
            ) : (
              visibleHits.map((hit) => (
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
              ))
            )}
            <div className="mx-2 mt-2 border-b border-[var(--store-line)]" />
          </div>
        )}

        {placedCount > 0 && (
          <DisclosureGroup
            open={placedOpen}
            onToggle={() => setPlacedOpen(!placedOpen)}
            label="On map"
            count={placedCount}
            icon={<Crosshair size={14} />}
          >
            <div className="space-y-1.5 px-1 pt-0.5">
              {placedUas.map((u) => (
                <PlacedCard
                  key={u.instanceId}
                  selected={isSameLaydownItem(selectedLaydownItem, { kind: 'uas', instanceId: u.instanceId })}
                  onSelect={() => onSelectPlacedItem?.({ kind: 'uas', instanceId: u.instanceId })}
                  thumb={<PlatformThumbnail id={u.asset.id} name={u.asset.name} size="sm" />}
                  name={u.asset.name}
                  coords={`${u.lat.toFixed(4)}°, ${u.lon.toFixed(4)}°`}
                  meta={`${(u.lateralRadius_m / 1000).toFixed(1)} km combat envelope`}
                  removeLabel={`Remove ${u.asset.name}`}
                  onRemove={() => onRemoveUas(u.instanceId)}
                >
                  <div
                    className={cn(
                      'mt-2 space-y-2',
                      loiterPlacingId === u.instanceId && 'rounded-xl shadow-[0_0_0_1px_rgba(41,151,255,0.55)]',
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
                </PlacedCard>
              ))}
              {placedCuas.map((c) => (
                <PlacedCard
                  key={c.instanceId}
                  selected={isSameLaydownItem(selectedLaydownItem, { kind: 'cuas', instanceId: c.instanceId })}
                  onSelect={() => onSelectPlacedItem?.({ kind: 'cuas', instanceId: c.instanceId })}
                  thumb={<PlatformThumbnail id={c.asset.id} name={c.asset.name} size="sm" variant="cuas" />}
                  name={c.asset.name}
                  coords={`${c.lat.toFixed(4)}°, ${c.lon.toFixed(4)}°`}
                  meta={c.hasTerrainMasking ? 'Terrain masking active' : undefined}
                  metaTone={c.hasTerrainMasking ? 'blue' : undefined}
                  removeLabel={`Remove ${c.asset.name}`}
                  onRemove={() => onRemoveCuas(c.instanceId)}
                />
              ))}
              {placedRadars.map((r) => (
                <PlacedCard
                  key={r.instanceId}
                  selected={isSameLaydownItem(selectedLaydownItem, { kind: 'radar', instanceId: r.instanceId })}
                  onSelect={() => onSelectPlacedItem?.({ kind: 'radar', instanceId: r.instanceId })}
                  thumb={
                    <PlatformThumbnail id={r.asset.id} name={formatRadarDisplayName(r.asset)} size="sm" variant="cuas" />
                  }
                  name={formatRadarDisplayName(r.asset)}
                  coords={`${r.lat.toFixed(4)}°, ${r.lon.toFixed(4)}°`}
                  meta={`${r.asset.detection_range_km.toFixed(0)} km detect`}
                  removeLabel={`Remove ${formatRadarDisplayName(r.asset)}`}
                  onRemove={() => onRemoveRadar(r.instanceId)}
                />
              ))}
              {placedEffectors.map((e) => (
                <PlacedCard
                  key={e.instanceId}
                  selected={isSameLaydownItem(selectedLaydownItem, { kind: 'effector', instanceId: e.instanceId })}
                  onSelect={() => onSelectPlacedItem?.({ kind: 'effector', instanceId: e.instanceId })}
                  thumb={
                    <PlatformThumbnail
                      id={e.asset.id}
                      name={formatEffectorDisplayName(e.asset)}
                      size="sm"
                      variant="cuas"
                    />
                  }
                  name={formatEffectorDisplayName(e.asset)}
                  coords={`${e.lat.toFixed(4)}°, ${e.lon.toFixed(4)}°`}
                  meta={`${e.asset.engagement_max_km.toFixed(0)} km engage`}
                  removeLabel={`Remove ${formatEffectorDisplayName(e.asset)}`}
                  onRemove={() => onRemoveEffector(e.instanceId)}
                />
              ))}
            </div>
          </DisclosureGroup>
        )}

        {cotsAll.length > 0 && (
          <DisclosureGroup
            open={cotsOpen}
            onToggle={() => setCotsOpen(!cotsOpen)}
            label="COTS catalogue"
            count={cotsAll.length}
            icon={<Plane size={14} />}
          >
            {cotsAll.map((asset) => (
              <MapAssetPickCard
                key={`cots-${asset.id}`}
                kicker={isCotsDji(asset) ? 'DJI' : undefined}
                name={asset.name}
                sub={formatUasSubline(asset)}
                active={placingUasId === asset.id}
                highlighted={highlightedIds.includes(asset.id)}
                onClick={() => onSelectUas(asset)}
                accent="threat"
              />
            ))}
          </DisclosureGroup>
        )}

        {cotsDji.length > 0 && (
          <DisclosureGroup
            open={cotsDjiOpen}
            onToggle={() => setCotsDjiOpen(!cotsDjiOpen)}
            label="COTS DJI"
            count={cotsDji.length}
            icon={<Plane size={14} />}
          >
            {cotsDji.map((asset) => (
              <MapAssetPickCard
                key={`cots-dji-${asset.id}`}
                name={asset.name}
                sub={formatUasSubline(asset)}
                active={placingUasId === asset.id}
                highlighted={highlightedIds.includes(asset.id)}
                onClick={() => onSelectUas(asset)}
                accent="threat"
              />
            ))}
          </DisclosureGroup>
        )}

        {(!searchActive || visibleUas.length > 0) && (
          <DisclosureGroup
            open={uasOpen}
            onToggle={() => setUasOpen(!uasOpen)}
            label="Threat platforms"
            count={visibleUas.length}
            icon={<Plane size={14} />}
          >
            {visibleUas.map((asset) => (
              <MapAssetPickCard
                key={asset.id}
                name={asset.name}
                sub={formatUasSubline(asset)}
                active={placingUasId === asset.id}
                highlighted={highlightedIds.includes(asset.id)}
                onClick={() => onSelectUas(asset)}
                accent="threat"
              />
            ))}
          </DisclosureGroup>
        )}

        {(!searchActive || visibleCuas.length > 0) && (
          <DisclosureGroup
            open={cuasOpen}
            onToggle={() => setCuasOpen(!cuasOpen)}
            label="Defeat systems"
            count={visibleCuas.length}
            icon={<Shield size={14} />}
          >
            {visibleCuas.map((asset) => (
              <MapAssetPickCard
                key={`${asset.id}-${asset.name}`}
                kicker={asset.categoryLabel}
                name={asset.name}
                sub={`${asset.defeat_range_km.toFixed(1)} km defeat envelope`}
                active={placingCuasId === asset.id}
                highlighted={highlightedIds.includes(asset.id)}
                onClick={() => onSelectCuas(asset)}
                accent="defeat"
              />
            ))}
          </DisclosureGroup>
        )}

        {visibleRadars.length > 0 && (
          <DisclosureGroup
            open={radarsOpen}
            onToggle={() => setRadarsOpen(!radarsOpen)}
            label="Radars"
            count={visibleRadars.length}
            icon={<Radar size={14} />}
          >
            {visibleRadars.map((asset) => (
              <MapAssetPickCard
                key={asset.id}
                kicker={asset.roleLabel}
                name={formatRadarDisplayName(asset)}
                sub={formatRadarSubline(asset)}
                active={placingRadarId === asset.id}
                highlighted={highlightedIds.includes(asset.id)}
                onClick={() => onSelectRadar(asset)}
                accent={asset.side === 'red' ? 'hostile' : 'radar'}
              />
            ))}
          </DisclosureGroup>
        )}

        {visibleEffectors.length > 0 && (
          <DisclosureGroup
            open={effectorsOpen}
            onToggle={() => setEffectorsOpen(!effectorsOpen)}
            label="SAM, BMD and effectors"
            count={visibleEffectors.length}
            icon={<Target size={14} />}
          >
            {visibleEffectors.map((asset) => (
              <MapAssetPickCard
                key={asset.id}
                kicker={asset.tierLabel}
                name={formatEffectorDisplayName(asset)}
                sub={formatEffectorSubline(asset)}
                active={placingEffectorId === asset.id}
                highlighted={highlightedIds.includes(asset.id)}
                onClick={() => onSelectEffector(asset)}
                accent={asset.side === 'red' ? 'hostile' : 'effector'}
              />
            ))}
          </DisclosureGroup>
        )}
        </div>
      </ScrollArea>

      {/* Actions and legend: pinned to the foot of the panel. */}
      <div className="shrink-0 border-t border-[var(--glass-line)]">
        {hasEngagement && (
          <div className="px-3 pt-3 space-y-2">
            <button
              type="button"
              onClick={onOpenSpectralAnalysis}
              className="btn-glass primary w-full"
              title={
                operations
                  ? 'Server adjudication, J/S and propagation (keyboard: S)'
                  : 'Band overlap and defeat tactics (keyboard: S)'
              }
            >
              <Radio className="w-4 h-4" />
              Spectral analysis
              <kbd className="ml-1 font-mono text-[11px] px-1.5 rounded-md border border-[rgba(255,255,255,0.35)] leading-[18px]">
                S
              </kbd>
            </button>
            {operations && placedCuas.length > 0 && onToggleHeatmap && (
              <button
                type="button"
                onClick={onToggleHeatmap}
                aria-pressed={!!heatmapEnabled}
                className={cn('btn-glass w-full', heatmapEnabled && '!border-[rgba(6,182,212,0.55)] !text-[#67E8F9]')}
                title="Keyboard: H. Jam coverage heatmap (Operations edition and a placed RF jammer)"
              >
                {heatmapLoading ? 'Computing heatmap…' : heatmapEnabled ? 'Hide jam heatmap' : 'Show jam heatmap'}
              </button>
            )}
            {operations && placedCuas.length > 0 && (
              <p className="text-[11.5px] store-text-muted leading-snug">
                Jam heatmap requires Operations edition and a placed C-UAS with RF jamming capability.
              </p>
            )}
            {heatmapEnabled && !heatmapLoading && !heatmapError && (
              <p className="text-[11.5px] font-mono text-[#67E8F9] leading-snug">
                Heatmap overlay active on globe: cyan = stronger jam field, orange = weaker path loss
              </p>
            )}
            {heatmapError && <p className="text-[11.5px] font-mono text-[#FCD34D] leading-snug">{heatmapError}</p>}
          </div>
        )}

        <button
          type="button"
          onClick={() => setLegendOpen(!legendOpen)}
          aria-expanded={legendOpen}
          className="w-full flex items-center gap-2 h-10 px-4 text-[13px] font-medium store-text-body hover:text-[var(--store-ink)] transition-colors"
        >
          <ChevronRight
            className={cn(
              'w-3.5 h-3.5 store-text-muted transition-transform duration-150 ease-out motion-reduce:transition-none',
              legendOpen && 'rotate-90',
            )}
          />
          <span className="flex-1 text-left">Map legend</span>
        </button>
        {legendOpen && (
          <ScrollArea frame={false} maxHeight="240px" scrollClassName="px-4 pb-3">
          <div className="space-y-1.5">
            <LegendRow colour="bg-cyan/40" label="Combat envelope" />
            <LegendRow colour="bg-cyan/20" label="Ferry max or wind spec (faint)" />
            <LegendRow colour="bg-orange/40" label="C-UAS defeat dome" />
            <LegendRow colour="bg-cyan/30" label="Radar detection dome (Blue)" />
            <LegendRow colour="bg-[rgba(239,68,68,0.3)]" label="Radar detection dome (Red)" />
            <LegendRow colour="bg-orange/35" label="SAM / BMD engagement dome" />
            <LegendRow colour="bg-[rgba(100,116,139,0.5)]" label="Terrain shield and dead ground" />
            <LegendRow colour="bg-[rgba(239,68,68,0.45)]" label="Defeat adjudication (≥50%)" />
            <LegendRow colour="bg-[rgba(34,197,94,0.45)]" label="Survivable (<50%)" />
            {heatmapEnabled && (
              <LegendRow colour="bg-gradient-to-r from-cyan/40 to-orange/40" label="Jam coverage heatmap (dB)" />
            )}
            {overlapLegend && (overlapLegend.defeat > 0 || overlapLegend.survivable > 0) && (
              <p className="text-[12px] font-mono store-text-body pt-1.5 mt-1 border-t border-[var(--store-line)]">
                {overlapLegend.defeat} defeat · {overlapLegend.survivable} survivable
                {overlapSource === 'adjudication' && (
                  <span className="block text-[11.5px] text-[#67E8F9] mt-0.5">
                    Dome colours: Operations adjudication
                  </span>
                )}
              </p>
            )}
            {dualRoleIds.size > 0 && (
              <p className="text-[11.5px] store-text-muted leading-snug pt-1">
                Dual-role assets (e.g. Anvil): pick UAS for combat disc, C-UAS for defeat sphere.
              </p>
            )}
          </div>
          </ScrollArea>
        )}
      </div>
    </aside>
  )
}

/** Disclosure row (HIG outline list): chevron, glyph, label, count. Sticks while its rows scroll. */
function DisclosureGroup({
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
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <section className="mb-0.5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          'sticky top-0 z-[2] w-full flex items-center gap-2 h-9 px-2 rounded-lg text-left',
          'text-[13px] font-medium text-[var(--store-ink)] transition-colors duration-150 ease-out',
          'hover:bg-[rgba(255,255,255,0.06)]',
          open && 'bg-[rgba(28,28,32,0.94)] backdrop-blur-xl',
        )}
      >
        <ChevronRight
          className={cn(
            'w-3.5 h-3.5 shrink-0 store-text-muted transition-transform duration-150 ease-out motion-reduce:transition-none',
            open && 'rotate-90',
          )}
        />
        <span className="shrink-0 store-text-muted flex">{icon}</span>
        <span className="flex-1 min-w-0 truncate">{label}</span>
        <span className="font-mono text-[12px] store-text-muted tabular-nums">{count}</span>
      </button>
      {open ? <div className="pt-0.5 pb-2">{children}</div> : null}
    </section>
  )
}

function PlacedCard({
  selected,
  onSelect,
  thumb,
  name,
  coords,
  meta,
  metaTone,
  removeLabel,
  onRemove,
  children,
}: {
  selected: boolean
  onSelect: () => void
  thumb: ReactNode
  name: string
  coords: string
  meta?: string
  metaTone?: 'blue'
  removeLabel: string
  onRemove: () => void
  children?: ReactNode
}) {
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect()
    }
  }
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      className={cn(
        'rounded-xl p-2.5 cursor-pointer transition-[background-color,box-shadow] duration-150 ease-out',
        selected
          ? 'bg-[rgba(41,151,255,0.14)] shadow-[inset_0_0_0_1px_rgba(41,151,255,0.55)]'
          : 'store-panel-inner hover:bg-[rgba(255,255,255,0.05)]',
      )}
    >
      <div className="flex items-start gap-2.5">
        <span className="shrink-0 mt-0.5">{thumb}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-[var(--store-ink)] leading-[18px] line-clamp-2" title={name}>
            {name}
          </p>
          <p className="font-mono text-[11.5px] store-text-muted mt-0.5">{coords}</p>
          {meta ? (
            <p
              className={cn(
                'text-[11.5px] mt-0.5',
                metaTone === 'blue' ? 'text-[var(--wb-blue)]' : 'font-mono store-text-body',
              )}
            >
              {meta}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          aria-label={removeLabel}
          title={removeLabel}
          className="glass-icon-btn !w-7 !h-7 !rounded-lg shrink-0 -mr-1 -mt-0.5 hover:!text-[var(--wb-red)]"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {children}
    </div>
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
    case 'uas': {
      const asset = hit.asset as MapUasAsset
      return (
        <MapAssetPickCard
          kicker="UAS"
          name={asset.name}
          sub={formatUasSubline(asset)}
          active={placingUasId === asset.id}
          highlighted={highlightedIds.includes(asset.id)}
          onClick={() => onSelectUas(asset)}
          accent="threat"
        />
      )
    }
    case 'cuas': {
      const asset = hit.asset as MapCuasAsset
      return (
        <MapAssetPickCard
          kicker={asset.categoryLabel}
          name={asset.name}
          sub={`${asset.defeat_range_km.toFixed(1)} km defeat envelope`}
          active={placingCuasId === asset.id}
          highlighted={highlightedIds.includes(asset.id)}
          onClick={() => onSelectCuas(asset)}
          accent="defeat"
        />
      )
    }
    case 'radar': {
      const asset = hit.asset as MapRadarAsset
      return (
        <MapAssetPickCard
          kicker={asset.roleLabel}
          name={formatRadarDisplayName(asset)}
          sub={formatRadarSubline(asset)}
          active={placingRadarId === asset.id}
          highlighted={highlightedIds.includes(asset.id)}
          onClick={() => onSelectRadar(asset)}
          accent={asset.side === 'red' ? 'hostile' : 'radar'}
        />
      )
    }
    case 'effector': {
      const asset = hit.asset as MapEffectorAsset
      return (
        <MapAssetPickCard
          kicker={asset.tierLabel}
          name={formatEffectorDisplayName(asset)}
          sub={formatEffectorSubline(asset)}
          active={placingEffectorId === asset.id}
          highlighted={highlightedIds.includes(asset.id)}
          onClick={() => onSelectEffector(asset)}
          accent={asset.side === 'red' ? 'hostile' : 'effector'}
        />
      )
    }
  }
}

/** One catalogue row: name wraps to two lines, meta in mono. Selected (placing) = blue lens. */
function MapAssetPickCard({
  kicker,
  name,
  sub,
  active,
  highlighted,
  onClick,
  accent,
}: {
  /** Category prefix for the meta line; omitted where the group already says it. */
  kicker?: string
  name: string
  sub: string
  active: boolean
  highlighted?: boolean
  onClick: () => void
  accent: 'threat' | 'defeat' | 'radar' | 'effector' | 'hostile'
}) {
  const meta = kicker ? `${kicker} · ${sub}` : sub
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={`${name}\n${meta}`}
      className={cn(
        'w-full text-left flex items-start gap-2.5 pl-[26px] pr-2 py-[7px] rounded-lg transition-[background-color,box-shadow] duration-150 ease-out',
        active
          ? 'bg-[rgba(41,151,255,0.20)] shadow-[inset_0_0_0_1px_rgba(41,151,255,0.6)]'
          : highlighted
            ? 'bg-[rgba(41,151,255,0.06)] shadow-[inset_0_0_0_1px_rgba(41,151,255,0.4)]'
            : 'hover:bg-[rgba(255,255,255,0.06)]',
      )}
    >
      <span
        aria-hidden
        className="mt-[6px] h-1.5 w-1.5 rounded-full shrink-0"
        style={{
          background:
            accent === 'hostile'
              ? 'var(--wb-red)'
              : accent === 'threat' || accent === 'radar'
                ? 'var(--wb-data)'
                : 'var(--wb-blue)',
        }}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] leading-[18px] text-[var(--store-ink)] line-clamp-2">{name}</span>
        <span className="block font-mono text-[11.5px] leading-4 store-text-muted mt-0.5 line-clamp-2">{meta}</span>
      </span>
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
      : asset.rangeEstimated
        ? `${opKm.toFixed(1)} km envelope (estimated)`
        : `${opKm.toFixed(1)} km envelope`
  const altRef = asset.altitude_reference === 'AMSL' ? 'AMSL' : 'AGL'
  const payloadN = asset.payloads?.length ?? 0
  const payloadStr =
    payloadN === 0
      ? ''
      : payloadN === 1
        ? ` · ${asset.payloads![0].name}`
        : ` · ${payloadN} payloads`
  return `${rangeStr} · ${asset.max_altitude_agl_m} m ${altRef}${payloadStr}`
}

function formatRadarSubline(asset: MapRadarAsset): string {
  const sector =
    asset.sector_deg >= 360 ? '360°' : `${asset.sector_deg.toFixed(0)}° sector`
  return `${asset.detection_range_km.toFixed(0)} km · ${asset.bandsLabel} · ${sector}`
}

function formatEffectorSubline(asset: MapEffectorAsset): string {
  const alt = `${asset.alt_min_km.toFixed(0)}–${asset.alt_max_km.toFixed(0)} km alt`
  const cue =
    asset.linkedRadars.length > 0
      ? ` · cue: ${asset.linkedRadars.map((r) => formatRadarDisplayName(r)).join(' + ')}`
      : ''
  return `${asset.engagement_max_km.toFixed(0)} km engage · ${alt}${cue}`
}

function LegendRow({ colour, label }: { colour: string; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={cn('w-3.5 h-3.5 rounded-[4px] border border-[var(--store-line)] shrink-0', colour)} />
      <span className="text-[12px] store-text-body">{label}</span>
    </div>
  )
}
