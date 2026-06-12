'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight, Crosshair, Shield, Plane } from 'lucide-react'
import { clsx } from 'clsx'
import { LoiterControls } from '@/app/map/components/LoiterControls'
import { operationalEnvelopeRadiusKm } from '@/lib/map/range-declaration'
import type {
  MapAssetsPayload,
  MapCuasAsset,
  MapUasAsset,
  PlacedCuas,
  PlacedUas,
  PlacementMode,
} from '@/lib/map/types'

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
  overlapLegend?: { defeat: number; survivable: number }
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
  overlapLegend,
}: AssetSidebarProps) {
  const [uasOpen, setUasOpen] = useState(true)
  const [cuasOpen, setCuasOpen] = useState(true)
  const [placedOpen, setPlacedOpen] = useState(true)

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
    <aside className="w-[280px] flex-shrink-0 flex flex-col bg-surf1 border-r border-border h-full">
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <Link
          href="/"
          className="text-[10px] font-mono text-t-muted hover:text-cyan transition-colors"
        >
          ← Dashboard
        </Link>
        <span className="text-[10px] font-mono text-t-muted uppercase tracking-wider">
          Map Intel
        </span>
      </div>

      <div className="flex-1 overflow-y-auto py-2 space-y-1">
        <SectionHeader
          open={uasOpen}
          onToggle={() => setUasOpen(!uasOpen)}
          icon={Plane}
          label="UAS Platforms"
          count={assets.uas.length}
        />
        {uasOpen && (
          <div className="px-2 space-y-1 max-h-48 overflow-y-auto">
            {assets.uas.map((asset) => (
              <AssetTile
                key={asset.id}
                name={asset.name}
                sub={formatUasSubline(asset)}
                active={placingUasId === asset.id}
                highlighted={highlightedIds.includes(asset.id)}
                onClick={() => onSelectUas(asset)}
              />
            ))}
          </div>
        )}

        <SectionHeader
          open={cuasOpen}
          onToggle={() => setCuasOpen(!cuasOpen)}
          icon={Shield}
          label="C-UAS Systems"
          count={assets.cuas.length}
        />
        {cuasOpen && (
          <div className="px-2 space-y-1 max-h-48 overflow-y-auto">
            {assets.cuas.map((asset) => (
              <AssetTile
                key={asset.id}
                name={asset.name}
                sub={`${asset.defeat_range_km.toFixed(1)} km · ${asset.categoryLabel}`}
                active={placingCuasId === asset.id}
                highlighted={highlightedIds.includes(asset.id)}
                onClick={() => onSelectCuas(asset)}
                variant="orange"
              />
            ))}
          </div>
        )}

        {(placedUas.length > 0 || placedCuas.length > 0) && (
          <>
            <SectionHeader
              open={placedOpen}
              onToggle={() => setPlacedOpen(!placedOpen)}
              icon={Crosshair}
              label="Placed Assets"
              count={placedUas.length + placedCuas.length}
            />
            {placedOpen && (
              <div className="px-2 space-y-2">
                {placedUas.map((u) => (
                  <div
                    key={u.instanceId}
                    className={clsx(
                      'p-2 rounded border bg-surf2 text-[10px]',
                      loiterPlacingId === u.instanceId
                        ? 'border-cyan/50 ring-1 ring-cyan/30'
                        : 'border-border',
                    )}
                  >
                    <p className="font-mono text-cyan truncate">{u.asset.name}</p>
                    <p className="font-mono text-t-muted">
                      {u.lat.toFixed(4)}°, {u.lon.toFixed(4)}°
                    </p>
                    <p className="font-mono text-t-muted">
                      {(u.lateralRadius_m / 1000).toFixed(1)} km envelope
                    </p>
                    <LoiterControls
                      uas={u}
                      loiterPlacing={loiterPlacingId === u.instanceId}
                      onPlaceLoiter={() => onPlaceLoiter(u)}
                      onClearLoiter={() => onClearLoiter(u.instanceId)}
                    />
                  </div>
                ))}
                {placedCuas.map((c) => (
                  <div
                    key={c.instanceId}
                    className="p-2 rounded border border-border bg-surf2 text-[10px]"
                  >
                    <p className="font-mono text-orange truncate">{c.asset.name}</p>
                    <p className="font-mono text-t-muted">
                      {c.lat.toFixed(4)}°, {c.lon.toFixed(4)}°
                    </p>
                    {c.hasTerrainMasking && (
                      <p className="font-mono text-t-muted mt-1">Terrain masking active</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="px-3 py-3 border-t border-border space-y-2">
        <p className="text-[10px] font-mono text-t-muted uppercase tracking-wider">Legend</p>
        <LegendRow colour="bg-cyan/40" label="Combat envelope (altitude disc)" />
        <LegendRow colour="bg-cyan/20" label="Faint disc = OSINT ferry max / wind spec" />
        <LegendRow colour="bg-orange/40" label="C-UAS defeat range (sphere)" />
        <LegendRow colour="bg-slate-500/40" label="Terrain LOS mask (hill blockers)" />
        <LegendRow colour="bg-orange/20" label="Sun shadow on defeat sphere (Cesium)" />
        <LegendRow colour="bg-red-500/40" label="Defeat overlap ≥50%" />
        <LegendRow colour="bg-green-500/40" label="Survivable overlap <50%" />
        {overlapLegend && (overlapLegend.defeat > 0 || overlapLegend.survivable > 0) && (
          <p className="text-[10px] font-mono text-t-muted pt-1">
            {overlapLegend.defeat} defeat / {overlapLegend.survivable} survivable
          </p>
        )}
        {dualRoleIds.size > 0 && (
          <p className="text-[10px] font-mono text-t-muted pt-1 leading-snug">
            Dual-role assets (e.g. Anduril Anvil): UAS list → combat disc; C-UAS list → defeat
            sphere.
          </p>
        )}
      </div>
    </aside>
  )
}

function SectionHeader({
  open,
  onToggle,
  icon: Icon,
  label,
  count,
}: {
  open: boolean
  onToggle: () => void
  icon: React.ComponentType<{ className?: string }>
  label: string
  count: number
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-surf2 transition-colors"
    >
      {open ? (
        <ChevronDown className="w-3 h-3 text-t-muted" />
      ) : (
        <ChevronRight className="w-3 h-3 text-t-muted" />
      )}
      <Icon className="w-3.5 h-3.5 text-t-muted" />
      <span className="text-xs text-t-secondary flex-1">{label}</span>
      <span className="text-[10px] font-mono text-t-muted">{count}</span>
    </button>
  )
}

function AssetTile({
  name,
  sub,
  active,
  highlighted,
  onClick,
  variant = 'cyan',
}: {
  name: string
  sub: string
  active: boolean
  highlighted?: boolean
  onClick: () => void
  variant?: 'cyan' | 'orange'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'w-full text-left px-2 py-1.5 rounded border transition-colors',
        active
          ? variant === 'cyan'
            ? 'border-cyan/50 bg-cyan/10'
            : 'border-orange/50 bg-orange/10'
          : highlighted
            ? variant === 'cyan'
              ? 'border-cyan/30 bg-cyan/5 ring-1 ring-cyan/25'
              : 'border-orange/30 bg-orange/5 ring-1 ring-orange/25'
            : 'border-transparent hover:border-border hover:bg-surf2'
      )}
    >
      <p className="text-[11px] text-t-primary truncate">{name}</p>
      <p className="text-[10px] font-mono text-t-muted truncate">{sub}</p>
    </button>
  )
}

function formatUasSubline(asset: MapUasAsset): string {
  const op = operationalEnvelopeRadiusKm(asset)
  const opKm = op.operationalRadiusKm
  const ferry = op.declaredSpecKm
  const rangeStr =
    ferry > opKm + 0.05
      ? `${opKm.toFixed(1)} km (${ferry.toFixed(0)} km ferry)`
      : `${opKm.toFixed(1)} km`
  const altRef = asset.altitude_reference === 'AMSL' ? 'AMSL' : 'AGL'
  return `${rangeStr} · ${asset.max_altitude_agl_m} m ${altRef}`
}

function LegendRow({ colour, label }: { colour: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={clsx('w-3 h-3 rounded-sm border border-border', colour)} />
      <span className="text-[10px] font-mono text-t-muted">{label}</span>
    </div>
  )
}
