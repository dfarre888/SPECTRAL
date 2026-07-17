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
import type { AisVessel } from '@/lib/ais/types'
import { aisTypeLabel, aisTypeColor } from '@/lib/ais/types'

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
  /** AIS vessel positions — rendered in a separate CustomDataSource so they
   *  never interfere with scenario entities. Default: hidden. */
  aisVessels?: AisVessel[]
  /** Show or hide the AIS layer entirely */
  showAisLayer?: boolean
}

export default function CesiumArena({
  entities,
  center,
  onEntityClick,
  aisVessels = [],
  showAisLayer = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewerRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cesiumRef = useRef<any>(null)
  // Separate CustomDataSource for AIS — never cleared by scenario entity sync
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aisDataSourceRef = useRef<any>(null)
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
    loadCesium().then(async (Cesium) => {
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
      viewer.resize()

      // Fix: allow engagement spheres to render through the terrain surface.
      // Without this, any sphere whose lower hemisphere intersects terrain is
      // depth-culled and becomes invisible (especially ground-level entities).
      viewer.scene.globe.depthTestAgainstTerrain = false

      // ── AIS layer: dedicated CustomDataSource ─────────────────────────
      // Using a separate DataSource means viewer.entities.removeAll() in the
      // scenario sync effect never touches AIS vessels.
      const aisDs = new Cesium.CustomDataSource('ais-marine')
      await viewer.dataSources.add(aisDs)
      aisDs.show = false // default OFF — controlled by showAisLayer prop
      aisDataSourceRef.current = aisDs

      cesiumRef.current = Cesium
      viewerRef.current = viewer
      setCesiumReady(true)
    }).catch(err => {
      console.error('Cesium load error:', err)
    })

    return () => {
      setCesiumReady(false)
      aisDataSourceRef.current = null
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy()
      }
      viewerRef.current = null
      cesiumRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Click handler (after viewer ready) ─────────────────────────────────────
  useEffect(() => {
    const viewer = viewerRef.current
    if (!cesiumReady || !viewer || viewer.isDestroyed()) return

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

    return () => {
      const v = viewerRef.current
      if (!v || v.isDestroyed?.() || !v.screenSpaceEventHandler) return
      v.screenSpaceEventHandler.removeInputAction(0)
    }
  }, [cesiumReady])

  // ── Frame scenario when center or entities change ─────────────────────────
  useEffect(() => {
    const viewer = viewerRef.current
    const Cesium = cesiumRef.current
    if (!cesiumReady || !viewer || viewer.isDestroyed() || !Cesium) return

    viewer.resize()

    const { Cartesian3, Math: CMath, BoundingSphere, HeadingPitchRange } = Cesium

    if (entities.length > 0) {
      const positions = entities.map((e) => Cartesian3.fromDegrees(e.lon, e.lat, e.altM))
      const sphere = BoundingSphere.fromPoints(positions)
      viewer.camera.flyToBoundingSphere(sphere, {
        duration: 1.2,
        offset: new HeadingPitchRange(0, CMath.toRadians(-55), Math.max(sphere.radius * 3.5, 12000)),
      })
      return
    }

    const c = center ?? { lon: 149.13, lat: -35.28 }
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(c.lon, c.lat, 45000),
      orientation: {
        heading: 0,
        pitch: CMath.toRadians(-55),
        roll: 0,
      },
      duration: 1.2,
    })
  }, [cesiumReady, center, entities])

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

  // ── AIS layer: show/hide toggle ──────────────────────────────────────────
  // Flips CustomDataSource visibility without touching scenario entities.
  useEffect(() => {
    const aisDs = aisDataSourceRef.current
    if (!cesiumReady || !aisDs) return
    aisDs.show = showAisLayer
  }, [cesiumReady, showAisLayer])

  // ── AIS layer: vessel sync ────────────────────────────────────────────────
  // Rebuilds AIS entities whenever the vessel list changes.
  // Uses a separate CustomDataSource — viewer.entities.removeAll() in the
  // scenario sync effect above has no effect on this data source.
  useEffect(() => {
    const viewer = viewerRef.current
    const Cesium = cesiumRef.current
    const aisDs  = aisDataSourceRef.current
    if (!cesiumReady || !viewer || viewer.isDestroyed() || !Cesium || !aisDs) return
    if (!showAisLayer) return // skip rebuild when layer is hidden

    const { Cartesian3, Color, VerticalOrigin, LabelStyle, HeightReference } = Cesium

    // Clear previous AIS entities
    aisDs.entities.removeAll()

    aisVessels.forEach((vessel) => {
      if (!vessel.mmsi || vessel.lat === 0 && vessel.lon === 0) return

      const hexColor = aisTypeColor(vessel.type)
      const cesiumColor = Color.fromCssColorString(hexColor).withAlpha(0.9)
      const label = vessel.name || `MMSI ${vessel.mmsi}`
      const typeStr = aisTypeLabel(vessel.type)
      const speed   = vessel.sog > 0 ? ` · ${vessel.sog.toFixed(1)}kt` : ''

      // ── Vessel point ────────────────────────────────────────────────────
      aisDs.entities.add({
        id: `ais-${vessel.mmsi}`,
        position: Cartesian3.fromDegrees(vessel.lon, vessel.lat, 0),
        point: {
          pixelSize: 8,
          color: cesiumColor,
          outlineColor: Color.WHITE.withAlpha(0.5),
          outlineWidth: 1,
          heightReference: HeightReference.CLAMP_TO_GROUND,
        },
        label: {
          text: `${label}\n${typeStr}${speed}`,
          font: '10px JetBrains Mono',
          fillColor: Color.fromCssColorString(hexColor),
          outlineColor: Color.BLACK,
          outlineWidth: 2,
          style: LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: VerticalOrigin.BOTTOM,
          pixelOffset: { x: 0, y: -12 } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
          showBackground: true,
          backgroundColor: Color.fromCssColorString('#0A0A0F').withAlpha(0.75),
          distanceDisplayCondition: { near: 0, far: 2_000_000 } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        },
      })

      // ── COG heading line (short, proportional to speed) ─────────────────
      if (vessel.sog > 0.5 && vessel.cog >= 0) {
        const cogRad  = (vessel.cog * Math.PI) / 180
        const lenDeg  = Math.min(vessel.sog * 0.004, 0.3) // ~0.004° per knot
        const endLon  = vessel.lon + Math.sin(cogRad) * lenDeg
        const endLat  = vessel.lat + Math.cos(cogRad) * lenDeg

        aisDs.entities.add({
          id: `ais-cog-${vessel.mmsi}`,
          polyline: {
            positions: Cartesian3.fromDegreesArray([vessel.lon, vessel.lat, endLon, endLat]),
            width: 1.5,
            material: Color.fromCssColorString(hexColor).withAlpha(0.6),
            clampToGround: true,
          },
        })
      }
    })
  }, [cesiumReady, showAisLayer, aisVessels]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full rounded-xl overflow-hidden border border-[var(--store-line)]"
      style={{ background: '#0A0A0F' }}
    />
  )
}
