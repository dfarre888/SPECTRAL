'use client'

import { useEffect, useRef } from 'react'
import { sampleTerrainAMSL } from '@/lib/map/terrain'
import { computeUasEnvelope } from '@/lib/map/format'
import type { CesiumModule, CesiumTerrainProvider, CesiumViewer } from '@/lib/map/cesium-types'
import type { PlacedCuas, PlacedUas, PlacementMode } from '@/lib/map/types'

interface DragState {
  kind: 'uas' | 'cuas'
  instanceId: string
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
  setPlacedUas: React.Dispatch<React.SetStateAction<PlacedUas[]>>,
  setPlacedCuas: React.Dispatch<React.SetStateAction<PlacedCuas[]>>,
) {
  const dragRef = useRef<DragState | null>(null)
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

        const picked = viewer.scene.pick(e.position)
        // picked.id is the Cesium.Entity instance for billboard/point entities
        const entityId: string | undefined = picked?.id?.id
        if (typeof entityId !== 'string') return

        let kind: 'uas' | 'cuas' | null = null
        let instanceId = ''

        if (entityId.startsWith('map-uas-mark-')) {
          kind = 'uas'
          instanceId = entityId.slice('map-uas-mark-'.length)
        } else if (entityId.startsWith('map-cuas-mark-')) {
          kind = 'cuas'
          instanceId = entityId.slice('map-cuas-mark-'.length)
        }

        if (!kind) return

        dragRef.current = { kind, instanceId, entityId, didMove: false }
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
          if (drag.kind === 'uas') {
            setPlacedUas((prev) =>
              prev.map((u) => {
                if (u.instanceId !== drag.instanceId) return u
                const env = computeUasEnvelope(u.asset, terrainAMSL)
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
                  // Clear wall terrain so useEnvelopeWalls resamples at new position
                  wallTerrain_m: undefined,
                }
              }),
            )
          } else {
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
  }, [cesiumReady, viewerRef, cesiumRef, terrainRef, placementModeRef, setPlacedUas, setPlacedCuas])
}
