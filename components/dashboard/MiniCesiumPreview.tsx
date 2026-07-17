'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { MapTrackPoint } from '@/lib/dashboard/types'
import { loadCesium } from '@/lib/map/load-cesium'
import type { CesiumModule, CesiumViewer } from '@/lib/map/cesium-types'

interface MiniCesiumPreviewProps {
  center?: { lon: number; lat: number }
  tracks: MapTrackPoint[]
  className?: string
}

/** Lightweight Cesium preview for dashboard — no terrain sync, lazy-loaded. */
export function MiniCesiumPreview({ center, tracks, className }: MiniCesiumPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<CesiumViewer | null>(null)
  const [failed, setFailed] = useState(false)

  const init = useCallback(async () => {
    if (!containerRef.current || viewerRef.current) return
    try {
      const Cesium = await loadCesium()
      const token = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN
      if (token) Cesium.Ion.defaultAccessToken = token

      const viewer = new Cesium.Viewer(containerRef.current, {
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
        requestRenderMode: true,
      }) as CesiumViewer

      viewerRef.current = viewer
      viewer.scene.globe.depthTestAgainstTerrain = false

      const positions = tracks.map((t) =>
        Cesium.Cartesian3.fromDegrees(t.lon, t.lat, 1200),
      )
      if (positions.length >= 2) {
        viewer.entities.add({
          polyline: {
            positions,
            width: 3,
            material: Cesium.Color.fromCssColorString('#F97316').withAlpha(0.9),
          },
        })
      }
      for (const t of tracks) {
        viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(t.lon, t.lat, 1200),
          point: {
            pixelSize: 8,
            color: Cesium.Color.fromCssColorString('#06B6D4'),
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 1,
          },
        })
      }

      const focus = center ?? (tracks[0] ? { lon: tracks[0].lon, lat: tracks[0].lat } : { lon: 149.13, lat: -35.28 })
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(focus.lon, focus.lat, 180_000),
        duration: 0,
      })
    } catch {
      setFailed(true)
    }
  }, [center, tracks])

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setFailed(true)
      return
    }
    void init()
    return () => {
      viewerRef.current?.destroy()
      viewerRef.current = null
    }
  }, [init])

  if (failed) return null

  return (
    <div
      ref={containerRef}
      className={className ?? 'absolute inset-0 rounded-xl overflow-hidden'}
      aria-hidden
    />
  )
}
