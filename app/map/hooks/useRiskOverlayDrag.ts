'use client'

import { useEffect, useRef } from 'react'
import type { CesiumModule, CesiumViewer } from '@/lib/map/cesium-types'
import { RISK_ANCHOR_ID } from '@/lib/map/risk-overlay'
import type { PlacementMode } from '@/lib/map/types'

/**
 * Drag-to-reposition for the risk overlay anchor (spectral-risk-anchor).
 * Follows the ScreenSpaceEventHandler pattern from usePlatformDrag.
 */
export function useRiskOverlayDrag(
  enabled: boolean,
  cesiumReady: boolean,
  viewerRef: React.RefObject<CesiumViewer | null>,
  cesiumRef: React.RefObject<CesiumModule | null>,
  placementModeRef: React.MutableRefObject<PlacementMode>,
  onMove: (lon: number, lat: number) => void,
) {
  const dragRef = useRef<{ didMove: boolean } | null>(null)
  const handlerRef = useRef<unknown | null>(null)

  useEffect(() => {
    if (!enabled || !cesiumReady) return
    const viewer = viewerRef.current
    const Cesium = cesiumRef.current
    if (!viewer || !Cesium || viewer.isDestroyed?.()) return

    const canvas = viewer.scene.canvas
    const camera = viewer.scene.screenSpaceCameraController
    const handler = new Cesium.ScreenSpaceEventHandler(canvas)
    handlerRef.current = handler

    handler.setInputAction(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (e: any) => {
        if (placementModeRef.current.active) return
        const picked = viewer.scene.pick(e.position)
        if (picked?.id?.id !== RISK_ANCHOR_ID) return
        dragRef.current = { didMove: false }
        camera.enableRotate = false
        camera.enableZoom = false
        camera.enableTranslate = false
        canvas.style.cursor = 'grabbing'
      },
      Cesium.ScreenSpaceEventType.LEFT_DOWN,
    )

    handler.setInputAction(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (e: any) => {
        if (!dragRef.current) return
        const ray = viewer.camera.getPickRay(e.endPosition)
        if (!ray) return
        const cartesian = viewer.scene.globe.pick(ray, viewer.scene)
        if (!cartesian) return
        const entity = viewer.entities.getById(RISK_ANCHOR_ID)
        if (entity) {
          entity.position = new Cesium.ConstantPositionProperty(cartesian)
          dragRef.current.didMove = true
          viewer.scene.requestRender()
        }
      },
      Cesium.ScreenSpaceEventType.MOUSE_MOVE,
    )

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
        if (!drag.didMove) return
        const ray = viewer.camera.getPickRay(e.position)
        if (!ray) return
        const cartesian = viewer.scene.globe.pick(ray, viewer.scene)
        if (!cartesian) return
        const carto = Cesium.Cartographic.fromCartesian(cartesian)
        onMove(Cesium.Math.toDegrees(carto.longitude), Cesium.Math.toDegrees(carto.latitude))
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
  }, [enabled, cesiumReady, viewerRef, cesiumRef, placementModeRef, onMove])
}
