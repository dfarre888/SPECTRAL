'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { syncMapEntities, type CesiumSyncState, type MaskingPolygon } from '@/lib/map/cesium-sync'
import { syncBuildingExtrusions } from '@/lib/map/building-layer'
import { syncHeatmapLayer } from '@/lib/map/heatmap-layer'
import type { BuildingFootprint } from '@/lib/buildings/types'
import type { HeatmapCell } from '@/lib/propagation/types'
import type { CesiumModule, CesiumTerrainProvider, CesiumViewer } from '@/lib/map/cesium-types'
import { loadCesium } from '@/lib/map/load-cesium'
import {
  configureMapIntelShadows,
  setTerrainShadowsActive,
} from '@/lib/map/cesium-shadows'
import {
  placementNeedsTerrainRefresh,
  sampleTerrainAMSL,
  sampleTerrainBatch,
  terrainHeightChanged,
  type TerrainHeightUpdate,
} from '@/lib/map/terrain'
import { formatCoord } from '@/lib/map/format'
import { usePlatformDrag } from '@/app/map/hooks/usePlatformDrag'
import type { CesiumContext } from '@/app/map/hooks/usePlatformPlacement'
import type {
  CursorPosition,
  OverlapVolume,
  PlacedCuas,
  PlacedUas,
  PlacementMode,
  WindSample,
} from '@/lib/map/types'

interface CesiumMapPanelProps {
  placedUas: PlacedUas[]
  placedCuas: PlacedCuas[]
  overlaps: OverlapVolume[]
  maskingPolygons: MaskingPolygon[]
  heatmapCells?: HeatmapCell[]
  heatmapGridSteps?: number
  heatmapJammer?: PlacedCuas | null
  buildingFootprints?: BuildingFootprint[]
  windByUas: Record<string, WindSample>
  nilWind: boolean
  placementMode: PlacementMode
  panelUasId: string | null
  onCesiumReady: (ctx: CesiumContext) => void
  onGlobeClick: (lon: number, lat: number) => void
  onCursorMove: (cursor: CursorPosition) => void
  onPanelScreenPos: (pos: { x: number; y: number } | null) => void
  onTerrainHeightsResolved?: (update: TerrainHeightUpdate) => void
  onTerrainEpochChange?: (epoch: number) => void
  setPlacedUas: React.Dispatch<React.SetStateAction<PlacedUas[]>>
  setPlacedCuas: React.Dispatch<React.SetStateAction<PlacedCuas[]>>
}

export default function CesiumMapPanel({
  placedUas,
  placedCuas,
  overlaps,
  maskingPolygons,
  heatmapCells = [],
  heatmapGridSteps = 0,
  heatmapJammer = null,
  buildingFootprints = [],
  windByUas,
  nilWind,
  placementMode,
  panelUasId,
  onCesiumReady,
  onGlobeClick,
  onCursorMove,
  onPanelScreenPos,
  onTerrainHeightsResolved,
  onTerrainEpochChange,
  setPlacedUas,
  setPlacedCuas,
}: CesiumMapPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<CesiumViewer | null>(null)
  const cesiumRef = useRef<CesiumModule | null>(null)
  const terrainRef = useRef<CesiumTerrainProvider | null>(null)
  const handlerRef = useRef<unknown | null>(null)
  const initRef = useRef(false)
  const [cesiumReady, setCesiumReady] = useState(false)
  const [terrainEpoch, setTerrainEpoch] = useState(0)

  const onCesiumReadyRef = useRef(onCesiumReady)
  const onGlobeClickRef = useRef(onGlobeClick)
  const onCursorMoveRef = useRef(onCursorMove)
  const onPanelScreenPosRef = useRef(onPanelScreenPos)
  const onTerrainHeightsResolvedRef = useRef(onTerrainHeightsResolved)
  const onTerrainEpochChangeRef = useRef(onTerrainEpochChange)
  const placedUasRef = useRef(placedUas)
  const placedCuasRef = useRef(placedCuas)
  const placementModeRef = useRef(placementMode)
  onCesiumReadyRef.current = onCesiumReady
  onGlobeClickRef.current = onGlobeClick
  onCursorMoveRef.current = onCursorMove
  onPanelScreenPosRef.current = onPanelScreenPos
  onTerrainHeightsResolvedRef.current = onTerrainHeightsResolved
  onTerrainEpochChangeRef.current = onTerrainEpochChange
  placedUasRef.current = placedUas
  placedCuasRef.current = placedCuas
  placementModeRef.current = placementMode

  usePlatformDrag(cesiumReady, viewerRef, cesiumRef, terrainRef, placementModeRef, setPlacedUas, setPlacedCuas)

  const stalePlacementCount =
    placedUas.filter(
      (u) =>
        placementNeedsTerrainRefresh(u.terrainAMSL) ||
        (u.loiter && placementNeedsTerrainRefresh(u.loiter.terrainAMSL))
    ).length +
    placedCuas.filter((c) => placementNeedsTerrainRefresh(c.terrainAMSL)).length

  const pickLonLat = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (viewer: CesiumViewer, Cesium: CesiumModule, position: any) => {
      const ray = viewer.camera.getPickRay(position)
      if (!ray) return null
      const cartesian = viewer.scene.globe.pick(ray, viewer.scene)
      if (!cartesian) return null
      const carto = Cesium.Cartographic.fromCartesian(cartesian)
      return {
        lon: Cesium.Math.toDegrees(carto.longitude),
        lat: Cesium.Math.toDegrees(carto.latitude),
      }
    },
    []
  )

  useEffect(() => {
    if (initRef.current || !containerRef.current) return
    initRef.current = true

    let destroyed = false

    ;(async () => {
      const Cesium = await loadCesium()
      if (destroyed || !containerRef.current) return

      Cesium.Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN ?? ''

      const terrainProvider = await Cesium.createWorldTerrainAsync({
        requestVertexNormals: true,
      })

      const viewer = new Cesium.Viewer(containerRef.current, {
        terrainProvider,
        animation: false,
        timeline: false,
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        fullscreenButton: false,
        infoBox: false,
        selectionIndicator: false,
        creditContainer: document.createElement('div'),
        shadows: true,
        terrainShadows: Cesium.ShadowMode.ENABLED,
      })

      configureMapIntelShadows(viewer, Cesium)
      // Off until a C-UAS is placed — toggled in effect below.
      setTerrainShadowsActive(viewer, Cesium, false)

      // Range domes / defeat ellipsoids must render above terrain (A3DM flight-plan pattern).
      viewer.scene.globe.depthTestAgainstTerrain = false

      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(134, -25, 2_000_000),
        orientation: {
          heading: 0,
          pitch: Cesium.Math.toRadians(-90),
          roll: 0,
        },
      })

      cesiumRef.current = Cesium
      terrainRef.current = terrainProvider
      viewerRef.current = viewer

      onCesiumReadyRef.current({ Cesium, terrainProvider, viewer })
      setCesiumReady(true)

      viewer.scene.globe.tileLoadProgressEvent.addEventListener((queued: number) => {
        if (queued === 0) {
          setTerrainEpoch((n) => {
            const next = n + 1
            onTerrainEpochChangeRef.current?.(next)
            return next
          })
          viewer.scene.requestRender()
        }
      })

      const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
      handlerRef.current = handler

      handler.setInputAction(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (movement: any) => {
          const picked = pickLonLat(viewer, Cesium, movement.endPosition)
          if (!picked) {
            onCursorMoveRef.current({ lon: 0, lat: 0, terrainAMSL: null })
            return
          }
          sampleTerrainAMSL(Cesium, terrainProvider, picked.lon, picked.lat, viewer).then(
            (terrainAMSL) => {
              onCursorMoveRef.current({ lon: picked.lon, lat: picked.lat, terrainAMSL })
            }
          )
        },
        Cesium.ScreenSpaceEventType.MOUSE_MOVE
      )

      handler.setInputAction(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (click: any) => {
          const picked = pickLonLat(viewer, Cesium, click.position)
          if (picked) onGlobeClickRef.current(picked.lon, picked.lat)
        },
        Cesium.ScreenSpaceEventType.LEFT_CLICK
      )
    })()

    return () => {
      destroyed = true
      setCesiumReady(false)
      const handler = handlerRef.current as { destroy?: () => void } | null
      handler?.destroy?.()
      const viewer = viewerRef.current
      if (viewer && !viewer.isDestroyed?.()) {
        viewer.destroy()
      }
      viewerRef.current = null
      handlerRef.current = null
      initRef.current = false
    }
    // Viewer must init once — callback refs keep handlers current without re-creating the globe.
  }, [pickLonLat])

  // Re-sample terrain when tiles finish loading or placements still hold fallback height (0).
  useEffect(() => {
    const onResolve = onTerrainHeightsResolvedRef.current
    if (!onResolve || !cesiumReady) return

    const Cesium = cesiumRef.current
    const terrainProvider = terrainRef.current
    const viewer = viewerRef.current
    if (!Cesium || !terrainProvider || !viewer || viewer.isDestroyed?.()) return

    const uas = placedUasRef.current
    const cuas = placedCuasRef.current
    if (uas.length === 0 && cuas.length === 0) return
    if (terrainEpoch === 0 && stalePlacementCount === 0) return

    type SampleKind = 'uas' | 'cuas' | 'loiter'
    const samples: { kind: SampleKind; instanceId: string; lon: number; lat: number }[] = []
    for (const u of uas) {
      samples.push({ kind: 'uas', instanceId: u.instanceId, lon: u.lon, lat: u.lat })
      if (u.loiter) {
        samples.push({
          kind: 'loiter',
          instanceId: u.instanceId,
          lon: u.loiter.lon,
          lat: u.loiter.lat,
        })
      }
    }
    for (const c of cuas) {
      samples.push({ kind: 'cuas', instanceId: c.instanceId, lon: c.lon, lat: c.lat })
    }

    let cancelled = false
    sampleTerrainBatch(Cesium, terrainProvider, samples, viewer).then((heights) => {
      if (cancelled) return

      const update: TerrainHeightUpdate = { uas: [], cuas: [], loiter: [] }
      samples.forEach((sample, i) => {
        const next = heights[i]
        if (sample.kind === 'uas') {
          const current = uas.find((u) => u.instanceId === sample.instanceId)?.terrainAMSL
          if (current !== undefined && terrainHeightChanged(current, next)) {
            update.uas.push({ instanceId: sample.instanceId, terrainAMSL: next })
          }
        } else if (sample.kind === 'cuas') {
          const current = cuas.find((c) => c.instanceId === sample.instanceId)?.terrainAMSL
          if (current !== undefined && terrainHeightChanged(current, next)) {
            update.cuas.push({ instanceId: sample.instanceId, terrainAMSL: next })
          }
        } else {
          const current = uas.find((u) => u.instanceId === sample.instanceId)?.loiter
            ?.terrainAMSL
          if (current !== undefined && terrainHeightChanged(current, next)) {
            update.loiter.push({ uasInstanceId: sample.instanceId, terrainAMSL: next })
          }
        }
      })

      if (update.uas.length || update.cuas.length || update.loiter.length) {
        onResolve(update)
      }
    })

    return () => {
      cancelled = true
    }
  }, [cesiumReady, terrainEpoch, stalePlacementCount])

  // Native sun shadow map is kept OFF permanently — it darkens the whole terrain tile
  // uniformly which is too aggressive at typical viewing angles (southern hemisphere sun
  // casting long shadows over large terrain areas).  Terrain-blocked defeat zones are
  // visualised instead via the LOS masking polygon (useTerrainMasking / computeTerrainMasking).

  useEffect(() => {
    const viewer = viewerRef.current
    const Cesium = cesiumRef.current
    if (!cesiumReady || !viewer || !Cesium || viewer.isDestroyed?.()) return

    const state: CesiumSyncState = {
      placedUas,
      placedCuas,
      overlaps,
      maskingPolygons,
      windByUas,
      nilWind,
    }
    syncMapEntities(Cesium, viewer, state)

    if (heatmapJammer && heatmapCells.length > 0) {
      const spanDeg = (heatmapJammer.asset.defeat_range_km / 111) * 0.85
      syncHeatmapLayer(Cesium, viewer, heatmapCells, heatmapGridSteps, {
        south: heatmapJammer.lat - spanDeg,
        north: heatmapJammer.lat + spanDeg,
        west: heatmapJammer.lon - spanDeg,
        east: heatmapJammer.lon + spanDeg,
      })
    } else {
      syncHeatmapLayer(Cesium, viewer, [], 0)
    }

    syncBuildingExtrusions(Cesium, viewer, buildingFootprints)

    viewer.scene.requestRender()
  }, [
    cesiumReady,
    placedUas,
    placedCuas,
    overlaps,
    maskingPolygons,
    heatmapCells,
    heatmapGridSteps,
    heatmapJammer,
    buildingFootprints,
    windByUas,
    nilWind,
    terrainEpoch,
  ])

  useEffect(() => {
    const viewer = viewerRef.current
    const Cesium = cesiumRef.current
    if (!viewer || viewer.isDestroyed?.() || !Cesium || !panelUasId) {
      onPanelScreenPosRef.current(null)
      return
    }

    const uas = placedUas.find((u) => u.instanceId === panelUasId && !u.infoPanelClosed)
    if (!uas) {
      onPanelScreenPosRef.current(null)
      return
    }

    const update = () => {
      if (viewer.isDestroyed?.()) return
      const cartesian = Cesium.Cartesian3.fromDegrees(
        uas.lon,
        uas.lat,
        uas.terrainAMSL + 20
      )
      const canvasPos = Cesium.SceneTransforms.worldToWindowCoordinates(
        viewer.scene,
        cartesian
      )
      if (canvasPos) {
        onPanelScreenPosRef.current({ x: canvasPos.x, y: canvasPos.y })
      }
    }

    update()
    viewer.scene.postRender.addEventListener(update)
    return () => {
      if (!viewer.isDestroyed?.() && viewer.scene) {
        viewer.scene.postRender.removeEventListener(update)
      }
    }
  }, [panelUasId, placedUas])

  const cursorStyle =
    placementMode.active && placementMode.kind !== 'loiter'
      ? 'crosshair'
      : placementMode.active && placementMode.kind === 'loiter'
        ? 'cell'
        : 'grab'

  return (
    <div
      ref={containerRef}
      className="relative flex-1 h-full w-full"
      style={{ cursor: cursorStyle }}
    />
  )
}

export function MapBottomBar({
  cursor,
  nilWind,
  windLoading,
  onNilWindChange,
  onClearAll,
}: {
  cursor: CursorPosition
  nilWind: boolean
  windLoading: boolean
  onNilWindChange: (v: boolean) => void
  onClearAll: () => void
}) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between gap-3 px-3 py-2 bg-[var(--store-surface)]/90 border-t border-[var(--store-line)] backdrop-blur">
      <div className="flex items-center gap-2">
        <WindToggleInline nilWind={nilWind} loading={windLoading} onChange={onNilWindChange} />
        <button
          type="button"
          onClick={onClearAll}
          className="px-3 py-1.5 rounded-xl store-panel-inner store-text-muted text-xs font-mono hover:text-[var(--store-accent)] hover:border-[var(--store-accent-border)] transition-colors"
        >
          Clear All
        </button>
      </div>
      <p className="text-xs font-mono text-cyan">
        {cursor.terrainAMSL !== null
          ? `${formatCoord(cursor.lon, cursor.lat)} · ${Math.round(cursor.terrainAMSL)} m terrain`
          : '—'}
      </p>
    </div>
  )
}

function WindToggleInline({
  nilWind,
  loading,
  onChange,
}: {
  nilWind: boolean
  loading: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!nilWind)}
      className={`px-3 py-1.5 rounded-xl border text-xs font-mono transition-colors ${
        nilWind
          ? 'border-[var(--store-line)] bg-[var(--store-surface-2)] store-text-body'
          : 'border-cyan/40 bg-cyan/10 text-cyan'
      }`}
    >
      {loading ? 'Fetching wind…' : nilWind ? 'Nil-Wind' : 'Live Wind'}
    </button>
  )
}
