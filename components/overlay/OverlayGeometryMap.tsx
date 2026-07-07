'use client'

import { useEffect, useRef, useState } from 'react'
import { loadCesium } from '@/lib/map/load-cesium'
import type { EngagementResult, EngagementScenario } from '@/lib/overlay/engagement-calc'
import {
  SAM_RING_STYLES,
  addRangeHemisphere,
  pickGlobeLonLat,
} from '@/lib/overlay/overlay-map-entities'

export type OverlayPlacementMode = 'sam' | 'uas' | null

interface OverlayGeometryMapProps {
  scenario: EngagementScenario
  result: EngagementResult
  placementMode: OverlayPlacementMode
  onMapPlace: (lon: number, lat: number, target: 'sam' | 'uas') => void
}

const LOS_CYAN = '#06B6D4'
const UAS_TARGET_RADIUS_M = 45

export default function OverlayGeometryMap({
  scenario,
  result,
  placementMode,
  onMapPlace,
}: OverlayGeometryMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewerRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cesiumRef = useRef<any>(null)
  const cameraFramedRef = useRef(false)
  const placementModeRef = useRef(placementMode)
  const onMapPlaceRef = useRef(onMapPlace)
  const [cesiumReady, setCesiumReady] = useState(false)

  useEffect(() => {
    placementModeRef.current = placementMode
  }, [placementMode])

  useEffect(() => {
    onMapPlaceRef.current = onMapPlace
  }, [onMapPlace])

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return

    loadCesium()
      .then((Cesium) => {
        if (!containerRef.current) return

        const { Viewer, Ion, Color } = Cesium
        Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN || ''

        const viewer = new Viewer(containerRef.current!, {
          terrainProvider: undefined,
          timeline: false,
          animation: false,
          baseLayerPicker: false,
          navigationHelpButton: false,
          homeButton: false,
          sceneModePicker: false,
          geocoder: false,
          fullscreenButton: false,
          infoBox: false,
          selectionIndicator: false,
        })

        viewer.scene.globe.enableLighting = false
        viewer.scene.backgroundColor = Color.fromCssColorString('#0A0A0F')
        viewer.scene.globe.depthTestAgainstTerrain = false
        viewer.resize()

        cesiumRef.current = Cesium
        viewerRef.current = viewer
        setCesiumReady(true)
      })
      .catch((err) => {
        console.error('Overlay Cesium load error:', err)
      })

    return () => {
      setCesiumReady(false)
      cameraFramedRef.current = false
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy()
      }
      viewerRef.current = null
      cesiumRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!cesiumReady || !viewerRef.current || !cesiumRef.current) return

    const viewer = viewerRef.current
    const Cesium = cesiumRef.current
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)

    handler.setInputAction(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (click: any) => {
        const mode = placementModeRef.current
        if (!mode) return
        const picked = pickGlobeLonLat(Cesium, viewer, click.position)
        if (picked) onMapPlaceRef.current(picked.lon, picked.lat, mode)
      },
      Cesium.ScreenSpaceEventType.LEFT_CLICK,
    )

    return () => {
      if (!handler.isDestroyed()) handler.destroy()
    }
  }, [cesiumReady])

  useEffect(() => {
    const viewer = viewerRef.current
    const Cesium = cesiumRef.current
    if (!cesiumReady || !viewer || viewer.isDestroyed() || !Cesium) return

    const {
      Cartesian3,
      Color,
      VerticalOrigin,
      LabelStyle,
      Math: CMath,
      BoundingSphere,
      HeadingPitchRange,
    } = Cesium

    viewer.entities.removeAll()

    const samPos = Cartesian3.fromDegrees(
      scenario.sam_lon,
      scenario.sam_lat,
      scenario.sam_alt_m,
    )
    const uasPos = Cartesian3.fromDegrees(
      scenario.uas_lon,
      scenario.uas_lat,
      scenario.uas_alt_m,
    )

    const uasGround = Cartesian3.fromDegrees(scenario.uas_lon, scenario.uas_lat, 0)

    SAM_RING_STYLES.forEach(({ key, fill, fillAlpha, outlineAlpha }) => {
      const rangeM = result[key]
      addRangeHemisphere(
        Cesium,
        viewer,
        `ring-${key}`,
        scenario.sam_lon,
        scenario.sam_lat,
        scenario.sam_alt_m,
        rangeM,
        fill,
        fillAlpha,
        fill,
        outlineAlpha,
      )
    })

    viewer.entities.add({
      id: 'sam-site',
      position: samPos,
      point: {
        pixelSize: 20,
        color: Color.fromCssColorString('#3B82F6').withAlpha(0.95),
        outlineColor: Color.WHITE.withAlpha(0.85),
        outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: 'SAM',
        font: '11px JetBrains Mono',
        fillColor: Color.fromCssColorString('#3B82F6'),
        outlineColor: Color.BLACK,
        outlineWidth: 2,
        style: LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: VerticalOrigin.BOTTOM,
        pixelOffset: { x: 0, y: -22 },
        showBackground: true,
        backgroundColor: Color.fromCssColorString('#0A0A0F').withAlpha(0.85),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    })

    viewer.entities.add({
      id: 'uas-alt-leader',
      polyline: {
        positions: [uasGround, uasPos],
        width: 1.5,
        material: Color.fromCssColorString('#EF4444').withAlpha(0.55),
      },
    })

    viewer.entities.add({
      id: 'uas-target-body',
      position: uasPos,
      ellipsoid: {
        radii: new Cartesian3(UAS_TARGET_RADIUS_M, UAS_TARGET_RADIUS_M, UAS_TARGET_RADIUS_M),
        material: Color.fromCssColorString('#EF4444').withAlpha(0.35),
        outline: true,
        outlineColor: Color.fromCssColorString('#EF4444').withAlpha(0.9),
        outlineWidth: 2,
      },
    })

    viewer.entities.add({
      id: 'uas-target',
      position: uasPos,
      point: {
        pixelSize: 18,
        color: Color.fromCssColorString('#EF4444').withAlpha(0.95),
        outlineColor: Color.WHITE.withAlpha(0.85),
        outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: scenario.platform_id,
        font: '11px JetBrains Mono',
        fillColor: Color.fromCssColorString('#EF4444'),
        outlineColor: Color.BLACK,
        outlineWidth: 2,
        style: LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: VerticalOrigin.BOTTOM,
        pixelOffset: { x: 0, y: -20 },
        showBackground: true,
        backgroundColor: Color.fromCssColorString('#0A0A0F').withAlpha(0.85),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    })

    viewer.entities.add({
      id: 'los-line',
      polyline: {
        positions: [samPos, uasPos],
        width: 2,
        material: Color.fromCssColorString(LOS_CYAN).withAlpha(0.85),
        arcType: 0,
      },
    })

    viewer.resize()

    if (!cameraFramedRef.current) {
      const sphere = BoundingSphere.fromPoints([samPos, uasPos])
      const maxRing = Math.max(
        result.detect_range_m,
        result.track_range_m,
        result.launch_range_m,
        result.lethal_range_m,
      )
      viewer.camera.flyToBoundingSphere(sphere, {
        duration: 0.8,
        offset: new HeadingPitchRange(
          0,
          CMath.toRadians(-50),
          Math.max(sphere.radius * 2.8, maxRing * 1.4),
        ),
      })
      cameraFramedRef.current = true
    }
  }, [cesiumReady, scenario, result])

  const placementBanner =
    placementMode === 'sam'
      ? 'Click map to place SAM launcher'
      : placementMode === 'uas'
        ? 'Click map to place UAS target'
        : null

  return (
    <div className="absolute inset-0 w-full h-full">
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full rounded-xl overflow-hidden border border-[var(--store-line)]"
        style={{
          background: '#0A0A0F',
          cursor: placementMode ? 'crosshair' : undefined,
        }}
      />
      {placementBanner ? (
        <div
          className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-lg border border-[var(--store-accent-border)] bg-[#0A0A0F]/90 px-3 py-1.5 text-[11px] font-mono text-[var(--store-accent)] shadow-lg"
          role="status"
        >
          {placementBanner}
        </div>
      ) : null}
    </div>
  )
}
