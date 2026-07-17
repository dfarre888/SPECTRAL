'use client'

import { useEffect, useRef } from 'react'
import { pickEntityIdAt } from '@/lib/map/cesium-pick'
import { sampleTerrainAMSL } from '@/lib/map/terrain'
import { computeUasEnvelope } from '@/lib/map/format'
import type { CesiumModule, CesiumTerrainProvider, CesiumViewer } from '@/lib/map/cesium-types'
import type { PlacedCuas, PlacedUas, PlacementMode } from '@/lib/map/types'

function moveUasEnvelopePreview(
  Cesium: CesiumModule,
  viewer: CesiumViewer,
  instanceId: string,
  lon: number,
  lat: number,
  discAltitudeMSL: number,
  radius_m: number,
) {
  const pos = Cesium.Cartesian3.fromDegrees(lon, lat)
  for (const suffix of ['', '-spec']) {
    const fillId = `map-uas-disc-${instanceId}${suffix}`
    const fill = viewer.entities.getById(fillId)
    if (fill) fill.position = new Cesium.ConstantPositionProperty(pos)
  }

  const ringId = `map-uas-disc-ring-${instanceId}`
  const ring = viewer.entities.getById(ringId)
  if (ring) {
    const coords: number[] = []
    const cosLat = Math.cos((lat * Math.PI) / 180)
    const mPerDegLon = 111320 * Math.max(cosLat, 0.01)
    const mPerDegLat = 110540
    const segments = 64
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * 2 * Math.PI
      const dx = (radius_m * Math.cos(angle)) / mPerDegLon
      const dy = (radius_m * Math.sin(angle)) / mPerDegLat
      coords.push(lon + dx, lat + dy, discAltitudeMSL)
    }
    ring.polyline = new Cesium.PolylineGraphics({
      positions: Cesium.Cartesian3.fromDegreesArrayHeights(coords),
      width: 4,
    })
  }

  const wallId = `map-uas-disc-wall-${instanceId}`
  const wall = viewer.entities.getById(wallId)
  if (wall) viewer.entities.remove(wall)
}

interface DragState {
  kind: 'uas' | 'cuas' | 'mission-wp'
  instanceId: string
  waypointId?: string
  entityId: string
  didMove: boolean
}

/**
 * Drag-to-reposition for placed UAS and C-UAS marks.
 *
 * During drag:
 *  - camera pan/zoom/rotate is locked so the globe doesn't fly away
 *  - the mark entity follows the pointer in Cesium directly (no React re-render)
 *
 * On drop:
 *  - terrain is re-sampled at the new position
 *  - React state is updated → syncMapEntities redraws disc/sphere/wall,
 *    useTerrainMasking recomputes LOS masking polygon
 *
 * No-ops if the user clicks without dragging (didMove guard).
 * No-ops if a placement mode is active (prevents ghost placements).
 */
export function usePlatformDrag(
  cesiumReady: boolean,
  viewerRef: React.RefObject<CesiumViewer | null>,
  cesiumRef: React.RefObject<CesiumModule | null>,
  terrainRef: React.RefObject<CesiumTerrainProvider | null>,
  placementModeRef: React.MutableRefObject<PlacementMode>,
  flightPathEditRef: React.MutableRefObject<boolean>,
  placedUasRef: React.MutableRefObject<PlacedUas[]>,
  nilWindRef: React.MutableRefObject<boolean>,
  setPlacedUas: React.Dispatch<React.SetStateAction<PlacedUas[]>>,
  setPlacedCuas: React.Dispatch<React.SetStateAction<PlacedCuas[]>>,
  onWaypointDragEnd?: (
    uasInstanceId: string,
    waypointId: string,
    lon: number,
    lat: number,
  ) => void | Promise<void>,
) {
  const dragRef = useRef<DragState | null>(null)
  const onWaypointDragEndRef = useRef(onWaypointDragEnd)
  onWaypointDragEndRef.current = onWaypointDragEnd
  const handlerRef = useRef<unknown | null>(null)

  useEffect(() => {
    if (!cesiumReady) return
    const viewer = viewerRef.current
    const Cesium = cesiumRef.current
    const terrainProvider = terrainRef.current
    if (!viewer || !Cesium || !terrainProvider || viewer.isDestroyed?.()) return

    const canvas = viewer.scene.canvas
    const camera = viewer.scene.screenSpaceCameraController

    const handler = new Cesium.ScreenSpaceEventHandler(canvas)
    handlerRef.current = handler

    // ── LEFT_DOWN ────────────────────────────────────────────────────────────
    handler.setInputAction(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (e: any) => {
        // Don't hijack clicks when the user is actively placing a new platform
        if (placementModeRef.current.active) return

        const entityId = pickEntityIdAt(viewer, e.position, {
          preferMission: flightPathEditRef.current,
          Cesium,
          placedUas: placedUasRef.current,
        })
        if (!entityId) return

        let kind: 'uas' | 'cuas' | 'mission-wp' | null = null
        let instanceId = ''
        let waypointId: string | undefined

        if (entityId.startsWith('map-uas-mark-')) {
          kind = 'uas'
          instanceId = entityId.slice('map-uas-mark-'.length)
        } else if (entityId.startsWith('map-mission-wp-') && flightPathEditRef.current) {
          kind = 'mission-wp'
          const rest = entityId.slice('map-mission-wp-'.length)
          const sep = rest.indexOf('-wp-')
          if (sep > 0) {
            instanceId = rest.slice(0, sep)
            waypointId = rest.slice(sep + 1)
          } else {
            const dash = rest.indexOf('-')
            if (dash <= 0) return
            instanceId = rest.slice(0, dash)
            waypointId = rest.slice(dash + 1)
          }
          const owner = placedUasRef.current.find((u) => u.instanceId === instanceId)
          const wp = owner?.mission?.waypoints.find((w) => w.id === waypointId)
          if (!wp || wp.kind === 'start') return
        } else if (entityId.startsWith('map-cuas-mark-')) {
          kind = 'cuas'
          instanceId = entityId.slice('map-cuas-mark-'.length)
        }

        if (!kind) return

        dragRef.current = { kind, instanceId, waypointId, entityId, didMove: false }
        camera.enableRotate = false
        camera.enableZoom = false
        camera.enableTranslate = false
        canvas.style.cursor = 'grabbing'
      },
      Cesium.ScreenSpaceEventType.LEFT_DOWN,
    )

    // ── MOUSE_MOVE ───────────────────────────────────────────────────────────
    handler.setInputAction(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (e: any) => {
        if (!dragRef.current) return

        const ray = viewer.camera.getPickRay(e.endPosition)
        if (!ray) return
        const cartesian = viewer.scene.globe.pick(ray, viewer.scene)
        if (!cartesian) return

        // Move the mark entity directly in Cesium — no React state, no re-render
        const entity = viewer.entities.getById(dragRef.current.entityId)
        if (entity) {
          entity.position = new Cesium.ConstantPositionProperty(cartesian)
          dragRef.current.didMove = true
          if (dragRef.current.kind === 'uas') {
            const uas = placedUasRef.current.find((u) => u.instanceId === dragRef.current!.instanceId)
            if (uas) {
              const carto = Cesium.Cartographic.fromCartesian(cartesian)
              const lon = Cesium.Math.toDegrees(carto.longitude)
              const lat = Cesium.Math.toDegrees(carto.latitude)
              const radius_m = nilWindRef.current
                ? uas.lateralRadius_m
                : uas.effectiveRange_km * 1000
              moveUasEnvelopePreview(
                Cesium,
                viewer,
                uas.instanceId,
                lon,
                lat,
                uas.discAltitude_m,
                radius_m,
              )
            }
          }
          viewer.scene.requestRender()
        }
      },
      Cesium.ScreenSpaceEventType.MOUSE_MOVE,
    )

    // ── LEFT_UP ──────────────────────────────────────────────────────────────
    handler.setInputAction(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (e: any) => {
        const drag = dragRef.current
        if (!drag) return

        dragRef.current = null
        camera.enableRotate = true
        camera.enableZoom = true
        camera.enableTranslate = true
        canvas.style.cursor = ''

        // Click-without-drag — don't emit a spurious state update
        if (!drag.didMove) return

        const ray = viewer.camera.getPickRay(e.position)
        if (!ray) return
        const cartesian = viewer.scene.globe.pick(ray, viewer.scene)
        if (!cartesian) return

        const carto = Cesium.Cartographic.fromCartesian(cartesian)
        const lon = Cesium.Math.toDegrees(carto.longitude)
        const lat = Cesium.Math.toDegrees(carto.latitude)

        // Re-sample terrain at drop point, then commit new position to React state.
        // State update triggers syncMapEntities (redraws disc/sphere/wall)
        // and useTerrainMasking (recomputes LOS masking polygon).
        sampleTerrainAMSL(Cesium, terrainProvider, lon, lat, viewer).then((terrainAMSL) => {
          if (drag.kind === 'mission-wp' && drag.waypointId) {
            void onWaypointDragEndRef.current?.(drag.instanceId, drag.waypointId, lon, lat)
            return
          }
          if (drag.kind === 'uas') {
            setPlacedUas((prev) =>
              prev.map((u) => {
                if (u.instanceId !== drag.instanceId) return u
                const env = computeUasEnvelope(u.asset, terrainAMSL)
                let mission = u.mission
                if (mission?.waypoints.length) {
                  const waypoints = [...mission.waypoints]
                  waypoints[0] = {
                    ...waypoints[0],
                    lon,
                    lat,
                    terrainAMSL,
                    alt_m: waypoints[0].alt_m - waypoints[0].terrainAMSL + terrainAMSL,
                  }
                  mission = {
                    ...mission,
                    waypoints,
                    updatedAt: new Date().toISOString(),
                  }
                }
                return {
                  ...u,
                  lon,
                  lat,
                  terrainAMSL,
                  discAltitude_m: env.discAltitude_m,
                  lateralRadius_m: env.lateralRadius_m,
                  ceilingAMSL_m: env.ceilingAMSL_m,
                  annotationTime_min: env.annotationTime_min,
                  effectiveRange_km: env.operationalRange_km,
                  mission,
                  wallTerrain_m: undefined,
                }
              }),
            )
          } else if (drag.kind === 'cuas') {
            setPlacedCuas((prev) =>
              prev.map((c) => {
                if (c.instanceId !== drag.instanceId) return c
                return {
                  ...c,
                  lon,
                  lat,
                  terrainAMSL,
                  // Clear wall terrain so useEnvelopeWalls resamples at new position
                  wallTerrain_m: undefined,
                }
              }),
            )
          }
        })
      },
      Cesium.ScreenSpaceEventType.LEFT_UP,
    )

    return () => {
      const h = handlerRef.current as { destroy?: () => void } | null
      h?.destroy?.()
      handlerRef.current = null
      dragRef.current = null
      if (!viewer.isDestroyed?.()) {
        camera.enableRotate = true
        camera.enableZoom = true
        camera.enableTranslate = true
        canvas.style.cursor = ''
      }
    }
  }, [cesiumReady, viewerRef, cesiumRef, terrainRef, placementModeRef, flightPathEditRef, placedUasRef, nilWindRef, setPlacedUas, setPlacedCuas, onWaypointDragEnd])
}
