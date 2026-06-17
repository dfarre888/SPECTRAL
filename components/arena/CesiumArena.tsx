'use client'
/**
 * CesiumArena — 3D Red/Blue scenario canvas
 *
 * Must be dynamically imported with ssr:false:
 *   const CesiumArena = dynamic(() => import('@/components/arena/CesiumArena'), { ssr: false })
 *
 * Cesium requires browser APIs and cannot run on server.
 */
import { useEffect, useRef, useState } from 'react'
import { loadCesium } from '@/lib/map/load-cesium'

export interface Entity {
  id: string
  name: string
  lon: number
  lat: number
  altM: number
  force: 'red' | 'blue'
  type: 'drone' | 'jammer' | 'radar' | 'defeat_system'
  /** Operational range in km — if set, draws a translucent engagement sphere */
  range_km?: number
  speedKmh?: number
  headingDeg?: number
}

interface Props {
  entities: Entity[]
  center?: { lon: number; lat: number }
  onEntityClick?: (id: string) => void
}

export default function CesiumArena({ entities, center, onEntityClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewerRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cesiumRef = useRef<any>(null)
  const onEntityClickRef = useRef(onEntityClick)
  onEntityClickRef.current = onEntityClick

  // Signals that viewer + cesium module are ready for entity sync.
  const [cesiumReady, setCesiumReady] = useState(false)

  // ── Init viewer once ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return

    // loadCesium() sets window.CESIUM_BASE_URL BEFORE injecting the script tag so
    // Cesium workers find their static assets on startup. Using import('cesium') here
    // was wrong: it set CESIUM_BASE_URL *after* Cesium loaded (workers missed it),
    // and it routed through webpack → Terser mangles Cesium source → build failure.
    loadCesium().then((Cesium) => {
      if (!containerRef.current) return

      const { Viewer, Ion, Cartesian3, Color } = Cesium

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

      viewer.scene.globe.enableLighting = true
      viewer.scene.backgroundColor = Color.fromCssColorString('#0A0A0F')

      // Fix: allow engagement spheres to render through the terrain surface.
      // Without this, any sphere whose lower hemisphere intersects terrain is
      // depth-culled and becomes invisible (especially ground-level entities).
      viewer.scene.globe.depthTestAgainstTerrain = false

      // Fly to center
      const c = center || { lon: 33.5, lat: 48.5 } // Ukraine default
      viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(c.lon, c.lat, 80000),
        duration: 1.5,
      })

      // Click handler — strips disc/sphere suffix so radius click returns base entity id
      viewer.screenSpaceEventHandler.setInputAction((click: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const picked = viewer.scene.pick(click.position)
        if (picked?.id?.id && onEntityClickRef.current) {
          const rawId: string = picked.id.id
          let entityId = rawId
          if (rawId.startsWith('disc-')) {
            entityId = rawId.slice(5)
          } else if (rawId.endsWith('_disc')) {
            entityId = rawId.slice(0, -5)
          } else if (rawId.endsWith('_sphere')) {
            entityId = rawId.slice(0, -7)
          }
          onEntityClickRef.current(entityId)
        }
      }, 0 /* LEFT_CLICK */)

      cesiumRef.current = Cesium
      viewerRef.current = viewer
      setCesiumReady(true)
    }).catch(err => {
      console.error('Cesium load error:', err)
    })

    return () => {
      setCesiumReady(false)
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy()
      }
      viewerRef.current = null
      cesiumRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync entities whenever prop changes ──────────────────────────────────
  // Runs after viewer init (cesiumReady flips true) and on every entities update.
  // Removes all existing entities and re-adds from current prop so the canvas
  // always reflects the caller's current scenario state.
  useEffect(() => {
    const viewer = viewerRef.current
    const Cesium = cesiumRef.current
    if (!cesiumReady || !viewer || viewer.isDestroyed() || !Cesium) return

    const { Cartesian3, Color, VerticalOrigin, LabelStyle, HeightReference } = Cesium

    viewer.entities.removeAll()

    entities.forEach(ent => {
      const isRed   = ent.force === 'red'
      const color   = isRed
        ? Color.fromCssColorString('#EF4444').withAlpha(0.9)
        : Color.fromCssColorString('#3B82F6').withAlpha(0.9)

      // ── Placemark: point + label ──────────────────────────────────────────
      viewer.entities.add({
        id: ent.id,
        position: Cartesian3.fromDegrees(ent.lon, ent.lat, ent.altM),
        point: {
          pixelSize: ent.type === 'drone' ? 10 : 14,
          color,
          outlineColor: Color.WHITE.withAlpha(0.6),
          outlineWidth: 1,
          heightReference: HeightReference.NONE,
        },
        label: {
          text: ent.name,
          font: '11px JetBrains Mono',
          fillColor: isRed
            ? Color.fromCssColorString('#EF4444')
            : Color.fromCssColorString('#3B82F6'),
          outlineColor: Color.BLACK,
          outlineWidth: 2,
          style: LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: VerticalOrigin.BOTTOM,
          pixelOffset: { x: 0, y: -14 } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
          showBackground: true,
          backgroundColor: Color.fromCssColorString('#0A0A0F').withAlpha(0.8),
        },
      })

      // ── Influence radius — ground disc (CLAMP_TO_GROUND) ─────────────────
      if (ent.range_km && ent.range_km > 0) {
        const rangeM = ent.range_km * 1000
        const discId = `disc-${ent.id}`
        viewer.entities.removeById(discId)

        const fillColor = (isRed
          ? Color.fromCssColorString('#EF4444')
          : Color.fromCssColorString('#3B82F6')
        ).withAlpha(0.15)
        const outlineColor = isRed
          ? Color.fromCssColorString('#EF4444')
          : Color.fromCssColorString('#3B82F6')

        viewer.entities.add({
          id: discId,
          position: Cartesian3.fromDegrees(ent.lon, ent.lat, 0),
          ellipse: {
            semiMajorAxis: rangeM,
            semiMinorAxis: rangeM,
            height: 0,
            heightReference: HeightReference.CLAMP_TO_GROUND,
            material: fillColor,
            fill: true,
            outline: true,
            outlineColor,
            outlineWidth: 2,
          } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        })
      }
    })
  }, [cesiumReady, entities])

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-xl overflow-hidden border border-[var(--store-line)]"
      style={{ minHeight: 480, background: '#0A0A0F' }}
    />
  )
}
