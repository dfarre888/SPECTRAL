'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ChevronDown,
  ChevronRight,
  Crosshair,
  Map,
  Radio,
  Shield,
  Plane,
  X,
} from 'lucide-react'
import { LoiterControls } from '@/app/map/components/LoiterControls'
import { EditionBadge } from '@/components/operations/EditionBadge'
import { PlatformThumbnail } from '@/components/platforms/PlatformThumbnail'
import { isOperationsEditionClient } from '@/lib/operations/edition-client'
import { StoreFilterSection } from '@/components/catalog/StoreFilterSidebar'
import { StoreEyebrow, StorePanel } from '@/components/ui/store-surface'
import { operationalEnvelopeRadiusKm } from '@/lib/map/range-declaration'
import type {
  MapAssetsPayload,
  MapCuasAsset,
  MapUasAsset,
  PlacedCuas,
  PlacedUas,
  PlacementMode,
} from '@/lib/map/types'
import { cn } from '@/lib/utils'

interface AssetSidebarProps {
  assets: MapAssetsPayload
  placedUas: PlacedUas[]
  placedCuas: PlacedCuas[]
  placementMode: PlacementMode
  highlightedIds?: string[]
  onSelectUas: (asset: MapUasAsset) => void
  onSelectCuas: (asset: MapCuasAsset) => void
  onPlaceLoiter: (uas: PlacedUas) => void
  onClearLoiter: (uasInstanceId: string) => void
  onRemoveUas: (instanceId: string) => void
  onRemoveCuas: (instanceId: string) => void
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
  placementMode,
  highlightedIds = [],
  onSelectUas,
  onSelectCuas,
  onPlaceLoiter,
  onClearLoiter,
  onRemoveUas,
  onRemoveCuas,
  overlapLegend,
  overlapSource,
  heatmapEnabled,
  heatmapLoading,
  heatmapError,
  onToggleHeatmap,
  onOpenSpectralAnalysis,
}: AssetSidebarProps) {
  const operations = isOperationsEditionClient()
  const [uasOpen, setUasOpen] = useState(true)
  const [cuasOpen, setCuasOpen] = useState(true)
  const [placedOpen, setPlacedOpen] = useState(true)
  const [legendOpen, setLegendOpen] = useState(false)

  const placingUasId =
    placementMode.active && placementMode.kind === 'uas' ? placementMode.asset.id : null
  const placingCuasId =
    placementMode.active && placementMode.kind === 'cuas' ? placementMode.asset.id : null
  const loiterPlacingId =
    placementMode.active && placementMode.kind === 'loiter'
      ? placementMode.uasInstanceId
      : null

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
          <div className="w-9 h-9 rounded-xl bg-purple/15 border border-purple/35 flex items-center justify-center shrink-0">
            <Map className="w-4 h-4 text-purple" />
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
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        <CollapsibleSection
          open={uasOpen}
          onToggle={() => setUasOpen(!uasOpen)}
          label="Threat platforms"
          count={assets.uas.length}
          icon={<Plane size={14} className="text-[var(--store-accent)]" />}
        >
          <div className="space-y-2 max-h-52 overflow-y-auto pr-0.5">
            {assets.uas.map((asset) => (
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

        <CollapsibleSection
          open={cuasOpen}
          onToggle={() => setCuasOpen(!cuasOpen)}
          label="Defeat systems"
          count={assets.cuas.length}
          icon={<Shield size={14} className="text-[var(--store-success)]" />}
        >
          <div className="space-y-2 max-h-52 overflow-y-auto pr-0.5">
            {assets.cuas.map((asset) => (
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

        {(placedUas.length > 0 || placedCuas.length > 0) && (
          <CollapsibleSection
            open={placedOpen}
            onToggle={() => setPlacedOpen(!placedOpen)}
            label="On map"
            count={placedUas.length + placedCuas.length}
            icon={<Crosshair size={14} className="store-text-muted" />}
          >
            <div className="space-y-2">
              {placedUas.map((u) => (
                <StorePanel key={u.instanceId} inner className="relative p-3 pl-9">
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
                    <LoiterControls
                      uas={u}
                      loiterPlacing={loiterPlacingId === u.instanceId}
                      onPlaceLoiter={() => onPlaceLoiter(u)}
                      onClearLoiter={() => onClearLoiter(u.instanceId)}
                    />
                  </div>
                </StorePanel>
              ))}
              {placedCuas.map((c) => (
                <StorePanel key={c.instanceId} inner className="relative p-3 pl-9">
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
                title="Keyboard: H — jam coverage heatmap (Operations)"
              >
                {heatmapLoading ? 'Computing heatmap…' : heatmapEnabled ? 'Hide jam heatmap' : 'Show jam heatmap'}
              </button>
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
  accent: 'threat' | 'defeat'
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
            accent === 'threat'
              ? 'shadow-[inset_0_-12px_24px_rgba(6,182,212,0.12)]'
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
