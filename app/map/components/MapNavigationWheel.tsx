'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MapNavHud } from '@/components/ui/MapNavHud'
import {
  distanceToSlider,
  getCameraDistanceToTarget,
  setCameraDistanceFromTarget,
  setCameraHeading,
  sliderToDistance,
  tiltCameraByDelta,
} from '@/lib/map/camera-controls'
import type { CesiumContext } from '@/app/map/hooks/usePlatformPlacement'

interface Props {
  getCesium: () => CesiumContext | null
}

export function MapNavigationWheel({ getCesium }: Props) {
  const [zoomSliderValue, setZoomSliderValue] = useState(50)
  const attachedViewerRef = useRef<unknown>(null)

  const withViewer = useCallback(
    (fn: (ctx: CesiumContext) => void) => {
      const ctx = getCesium()
      if (!ctx?.viewer || ctx.viewer.isDestroyed?.()) return
      fn(ctx)
    },
    [getCesium]
  )

  const handleRotate = useCallback(
    (deg: number) => {
      withViewer(({ Cesium, viewer }) => {
        setCameraHeading(Cesium, viewer, deg)
        viewer.scene.requestRender()
      })
    },
    [withViewer]
  )

  const handleTilt = useCallback(
    (movementY: number) => {
      withViewer(({ Cesium, viewer }) => {
        tiltCameraByDelta(Cesium, viewer, -movementY * 0.35)
        viewer.scene.requestRender()
      })
    },
    [withViewer]
  )

  const handleZoomChange = useCallback(
    (value: number) => {
      setZoomSliderValue(value)
      withViewer(({ Cesium, viewer }) => {
        setCameraDistanceFromTarget(Cesium, viewer, sliderToDistance(value))
        viewer.scene.requestRender()
      })
    },
    [withViewer]
  )

  useEffect(() => {
    let cleanup: (() => void) | undefined
    let pollId: ReturnType<typeof setInterval> | undefined

    const attach = () => {
      const ctx = getCesium()
      if (!ctx?.viewer || ctx.viewer.isDestroyed?.()) return false
      if (attachedViewerRef.current === ctx.viewer) return true

      cleanup?.()
      attachedViewerRef.current = ctx.viewer
      const { Cesium, viewer } = ctx

      const syncSlider = () => {
        const dist = getCameraDistanceToTarget(Cesium, viewer)
        if (dist != null) {
          setZoomSliderValue(distanceToSlider(dist))
        }
      }

      syncSlider()
      viewer.scene.postRender.addEventListener(syncSlider)
      cleanup = () => {
        if (!viewer.isDestroyed?.() && viewer.scene) {
          viewer.scene.postRender.removeEventListener(syncSlider)
        }
        if (attachedViewerRef.current === viewer) {
          attachedViewerRef.current = null
        }
      }
      return true
    }

    if (!attach()) {
      pollId = setInterval(() => {
        if (attach() && pollId) clearInterval(pollId)
      }, 250)
    }

    return () => {
      if (pollId) clearInterval(pollId)
      cleanup?.()
    }
  }, [getCesium])

  return (
    <MapNavHud
      className="absolute bottom-14 left-3 z-20 pointer-events-auto"
      onRotate={handleRotate}
      onTilt={handleTilt}
      zoomValue={zoomSliderValue}
      onZoomChange={handleZoomChange}
      zoomVariant="blue"
    />
  )
}
