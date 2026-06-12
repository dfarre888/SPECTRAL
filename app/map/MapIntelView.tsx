'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { readMapStaging, clearMapStaging } from '@/lib/spectrum/map-staging'
import { AssetSidebar } from '@/app/map/components/AssetSidebar'
import { MapNavigationWheel } from '@/app/map/components/MapNavigationWheel'
import { EntityInfoPanel } from '@/app/map/components/EntityInfoPanel'
import { useDefeatOverlap } from '@/app/map/hooks/useDefeatOverlap'
import { useLoiterPlanning } from '@/app/map/hooks/useLoiterPlanning'
import {
  usePlatformPlacement,
  type CesiumContext,
} from '@/app/map/hooks/usePlatformPlacement'
import { useTerrainMasking } from '@/app/map/hooks/useTerrainMasking'
import { useWindData } from '@/app/map/hooks/useWindData'
import { envelopeDiscAltitudeM } from '@/lib/map/range-declaration'
import type { TerrainHeightUpdate } from '@/lib/map/terrain'
import type { MapAssetsPayload, CursorPosition, PlacementMode, PlacedCuas, PlacedUas } from '@/lib/map/types'

const CesiumMapPanel = dynamic(() => import('./CesiumMapPanel'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center text-t-muted font-mono text-sm">
      Initialising Cesium globe…
    </div>
  ),
})

const MapBottomBar = dynamic(
  () => import('./CesiumMapPanel').then((m) => ({ default: m.MapBottomBar })),
  { ssr: false }
)

interface MapIntelViewProps {
  initialAssets: MapAssetsPayload
}

export default function MapIntelView({ initialAssets }: MapIntelViewProps) {
  const searchParams = useSearchParams()
  const [assets] = useState(initialAssets)
  const [placedUas, setPlacedUas] = useState<PlacedUas[]>([])
  const [placedCuas, setPlacedCuas] = useState<PlacedCuas[]>([])
  const [placementMode, setPlacementMode] = useState<PlacementMode>({ active: false })
  const [nilWind, setNilWind] = useState(true)
  const [cursor, setCursor] = useState<CursorPosition>({ lon: 0, lat: 0, terrainAMSL: null })
  const [panelScreenPos, setPanelScreenPos] = useState<{ x: number; y: number } | null>(null)
  const [stagingBanner, setStagingBanner] = useState<{
    stagedCount: number
    matchedCount: number
  } | null>(null)
  const [highlightedIds, setHighlightedIds] = useState<string[]>([])

  const cesiumCtxRef = useRef<CesiumContext | null>(null)
  const getCesium = useCallback(() => cesiumCtxRef.current, [])

  const onCesiumReady = useCallback((ctx: CesiumContext) => {
    cesiumCtxRef.current = ctx
  }, [])

  const { placeAt, startUasPlacement, startCuasPlacement, cancelPlacement } =
    usePlatformPlacement(placementMode, setPlacementMode, setPlacedUas, setPlacedCuas, getCesium)

  const { startLoiterMode, placeLoiterWaypoint, clearLoiter } = useLoiterPlanning(
    placementMode,
    setPlacementMode,
    setPlacedUas,
    getCesium
  )

  const maskingPolygons = useTerrainMasking(placedCuas, getCesium, setPlacedCuas)
  const overlaps = useDefeatOverlap(placedUas, placedCuas)
  const { windByUas, loading: windLoading } = useWindData(nilWind, placedUas, setPlacedUas)

  const panelUas = useMemo(
    () => placedUas.find((u) => !u.infoPanelClosed) ?? null,
    [placedUas]
  )

  const overlapLegend = useMemo(
    () => ({
      defeat: overlaps.filter((o) => o.isDefeat).length,
      survivable: overlaps.filter((o) => !o.isDefeat).length,
    }),
    [overlaps]
  )

  const handleGlobeClick = useCallback(
    async (lon: number, lat: number) => {
      if (placementMode.active && placementMode.kind === 'loiter') {
        await placeLoiterWaypoint(lon, lat)
        return
      }
      await placeAt(lon, lat)
    },
    [placementMode, placeAt, placeLoiterWaypoint]
  )

  const handleClearAll = useCallback(() => {
    setPlacedUas([])
    setPlacedCuas([])
    setPlacementMode({ active: false })
  }, [])

  const closePanel = useCallback((instanceId: string) => {
    setPlacedUas((prev) =>
      prev.map((u) =>
        u.instanceId === instanceId ? { ...u, infoPanelClosed: true } : u
      )
    )
  }, [])

  const handleTerrainHeightsResolved = useCallback((update: TerrainHeightUpdate) => {
    if (update.uas.length || update.loiter.length) {
      setPlacedUas((prev) =>
        prev.map((u) => {
          const uasHit = update.uas.find((h) => h.instanceId === u.instanceId)
          const loiterHit = update.loiter.find((h) => h.uasInstanceId === u.instanceId)
          if (!uasHit && !loiterHit) return u
          return {
            ...u,
            ...(uasHit
              ? {
                  terrainAMSL: uasHit.terrainAMSL,
                  ceilingAMSL_m: uasHit.terrainAMSL + u.asset.max_altitude_agl_m,
                  discAltitude_m: envelopeDiscAltitudeM(
                    uasHit.terrainAMSL,
                    u.asset.max_altitude_agl_m,
                    u.asset.altitude_reference,
                  ),
                }
              : {}),
            ...(loiterHit && u.loiter
              ? { loiter: { ...u.loiter, terrainAMSL: loiterHit.terrainAMSL } }
              : {}),
          }
        })
      )
    }
    if (update.cuas.length) {
      setPlacedCuas((prev) =>
        prev.map((c) => {
          const hit = update.cuas.find((h) => h.instanceId === c.instanceId)
          if (!hit) return c
          return { ...c, terrainAMSL: hit.terrainAMSL }
        })
      )
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelPlacement()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cancelPlacement])

  useEffect(() => {
    if (searchParams.get('from') !== 'spectra') return

    const staging = readMapStaging()
    if (!staging) return

    const stagedIds = staging.placeIds ?? staging.highlightIds ?? []
    const assetIds = new Set([
      ...assets.uas.map((a) => a.id),
      ...assets.cuas.map((a) => a.id),
    ])
    // SPECTRA effectors use 'eff-' prefixed IDs (e.g. 'eff-iron-beam').
    // Map Intel assets use bare IDs (e.g. 'iron-beam'). Strip the prefix before matching.
    const normalizeId = (id: string) => id.startsWith('eff-') ? id.slice(4) : id
    const normalizedIds = stagedIds.map(normalizeId)
    const matched = normalizedIds.filter((id) => assetIds.has(id))

    setStagingBanner({ stagedCount: stagedIds.length, matchedCount: matched.length })
    setHighlightedIds(matched)
  }, [searchParams, assets])

  const dismissStagingBanner = useCallback(() => {
    setStagingBanner(null)
    clearMapStaging()
  }, [])

  return (
    <div className="flex h-full w-full overflow-hidden">
      <AssetSidebar
        assets={assets}
        placedUas={placedUas}
        placedCuas={placedCuas}
        placementMode={placementMode}
        highlightedIds={highlightedIds}
        onSelectUas={startUasPlacement}
        onSelectCuas={startCuasPlacement}
        onPlaceLoiter={startLoiterMode}
        onClearLoiter={clearLoiter}
        overlapLegend={overlapLegend}
      />

      <div className="relative flex-1 flex flex-col min-w-0">
        {stagingBanner && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 max-w-xl w-[calc(100%-2rem)] px-4 py-2 rounded bg-surf1/95 border border-orange/40 text-[11px] font-mono text-t-secondary flex items-start justify-between gap-3">
            <span>
              AeroCopilot staged {stagingBanner.stagedCount} system
              {stagingBanner.stagedCount === 1 ? '' : 's'} — {stagingBanner.matchedCount} matched
              Map Intel asset{stagingBanner.matchedCount === 1 ? '' : 's'} (radar-only IDs remain
              in SPECTRA). Highlighted in sidebar.
            </span>
            <button
              type="button"
              onClick={dismissStagingBanner}
              className="text-t-muted hover:text-orange shrink-0"
              aria-label="Dismiss staging banner"
            >
              ✕
            </button>
          </div>
        )}
        {placementMode.active && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded bg-surf1/90 border border-cyan/30 text-[10px] font-mono text-cyan">
            {placementMode.kind === 'loiter'
              ? 'Place Loiter — click globe for loiter point · Esc to cancel'
              : placementMode.kind === 'uas'
                ? `Placing ${placementMode.asset.name} · click terrain · Esc to cancel`
                : `Placing ${placementMode.asset.name} · click terrain · Esc to cancel`}
          </div>
        )}

        <div className="relative flex-1 min-h-0">
          <CesiumMapPanel
            placedUas={placedUas}
            placedCuas={placedCuas}
            overlaps={overlaps}
            maskingPolygons={maskingPolygons}
            windByUas={windByUas}
            nilWind={nilWind}
            placementMode={placementMode}
            panelUasId={panelUas?.instanceId ?? null}
            onCesiumReady={onCesiumReady}
            onGlobeClick={handleGlobeClick}
            onCursorMove={setCursor}
            onPanelScreenPos={setPanelScreenPos}
            onTerrainHeightsResolved={handleTerrainHeightsResolved}
          />

          <MapNavigationWheel getCesium={getCesium} />

          {panelUas && panelScreenPos && (
            <EntityInfoPanel
              uas={panelUas}
              screenX={panelScreenPos.x}
              screenY={panelScreenPos.y}
              onClose={() => closePanel(panelUas.instanceId)}
            />
          )}
        </div>

        <MapBottomBar
          cursor={cursor}
          nilWind={nilWind}
          windLoading={windLoading}
          onNilWindChange={setNilWind}
          onClearAll={handleClearAll}
        />
      </div>
    </div>
  )
}
