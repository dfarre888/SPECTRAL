

---

# Map Intel — Range Sphere Analysis Bundle

**Classification:** UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY  
**Generated:** 2026-06-12  
**Purpose:** Single handoff document for external sphere rendering analysis.

## Data flow

```
/map (page.tsx) → getMapAssets() → MapIntelView state
  → usePlatformPlacement → sampleTerrainAMSL → computeUasEnvelope → lateralRadius_m
  → CesiumMapPanel → syncMapEntities → syncRangeSphere (EllipsoidGraphics)
```

## Critical design notes

1. **Renderer uses `EllipsoidGraphics`** (3D sphere), not ground-clamped polygon rings.
2. **Centre altitude:** `terrainAMSL + radius_m` (ground-tangent dome) via `groundTangentDomeCentreM()`.
3. **`depthTestAgainstTerrain = false`** in CesiumMapPanel — domes render above terrain tiles.
4. **`terrainEpoch`** re-samples placement heights when terrain tiles finish loading.
5. **Anduril Anvil dual entry:** `platforms.range_km = 5` (UAS list) vs `anti_drone_systems.effective_range_m = 500` (C-UAS list). Label `5.0 km envelope · 00:00` = placed from UAS Platforms.

## File index

| Section | File |
|---------|------|
| 1 | lib/map/cesium-sync.ts |
| 2 | app/map/CesiumMapPanel.tsx |
| 3 | lib/map/load-cesium.ts |
| 4 | lib/map/cesium-types.ts |
| 5 | app/map/hooks/usePlatformPlacement.ts |
| 6 | lib/map/format.ts |
| 7 | lib/map/range-declaration.ts |
| 8 | lib/map/terrain.ts |
| 9 | lib/map/types.ts |
| 10 | lib/map/asset-mappers.ts |
| 11 | lib/map/queries.ts |
| 12 | app/api/map/assets/route.ts |
| 13 | supabase/migrations/20260607162034_intel_update_2025.sql (Anduril excerpt) |
| 14 | app/map/MapIntelView.tsx |
| 15 | app/map/page.tsx |
| 16 | app/map/layout.tsx |
| 17 | app/map/components/AssetSidebar.tsx |
| 18 | app/map/components/EntityInfoPanel.tsx |
| 19 | lib/map/icons.ts |
| 20 | app/map/hooks/useWindData.ts |
| 21 | lib/map/wind.ts |
| 22 | lib/map/overlap.ts |
| 23 | app/map/hooks/useDefeatOverlap.ts |
| 24 | app/map/hooks/useTerrainMasking.ts |


---

## 1 — CORE RENDERER
**Path:** `lib/map/cesium-sync.ts`

```typescript
import type { CesiumModule, CesiumViewer } from '@/lib/map/cesium-types'
import { formatHHMM } from '@/lib/map/format'
import { TERRAIN_SURFACE_AGL_M } from '@/lib/map/terrain'
import { PIN_SVG, SHIELD_SVG, UAS_SILHOUETTE_SVG, windArrowSvg } from '@/lib/map/icons'
import type {
  OverlapVolume,
  PlacedCuas,
  PlacedUas,
  WindSample,
} from '@/lib/map/types'

const CYAN = '#06B6D4'
const ORANGE = '#F97316'
const RED = '#EF4444'
const GREEN = '#22C55E'

export interface MaskingPolygon {
  cuasInstanceId: string
  positions: { lon: number; lat: number }[]
  hasMasking: boolean
}

export interface CesiumSyncState {
  placedUas: PlacedUas[]
  placedCuas: PlacedCuas[]
  overlaps: OverlapVolume[]
  maskingPolygons: MaskingPolygon[]
  windByUas: Record<string, WindSample>
  nilWind: boolean
}

function colour(Cesium: CesiumModule, hex: string, alpha: number) {
  return Cesium.Color.fromCssColorString(hex).withAlpha(alpha)
}

function ensureEntity(
  viewer: CesiumViewer,
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create: () => any
) {
  let entity = viewer.entities.getById(id)
  if (!entity) {
    entity = create()
    viewer.entities.add(entity)
  }
  return entity
}

function removeStale(viewer: CesiumViewer, keepIds: Set<string>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toRemove: any[] = []
  viewer.entities.values.forEach((e: { id?: string }) => {
    if (e.id && typeof e.id === 'string' && e.id.startsWith('map-') && !keepIds.has(e.id)) {
      toRemove.push(e)
    }
  })
  toRemove.forEach((e) => viewer.entities.remove(e))
}

/** Ground-tangent dome — sphere bottom touches terrain, upper hemisphere visible above surface. */
export function groundTangentDomeCentreM(terrainAMSL: number, radius_m: number): number {
  return terrainAMSL + radius_m
}

/**
 * Range envelope sphere — EllipsoidGraphics with ground-tangent centre (terrain + radius).
 *
 * WHY EllipsoidGraphics (not PolygonGraphics/PolylineGraphics ground primitives):
 *   - PolygonGraphics height + heightReference: CLAMP_TO_GROUND creates a render
 *     conflict — ground-primitive path vs elevated-polygon path — nothing draws.
 *   - PolylineGraphics clampToGround fails with ColorMaterialProperty material type.
 *
 * WHY ground-tangent centre (not terrainAMSL):
 *   - Centring at sea-level / terrain with huge radius puts the camera inside the sphere
 *     when zoomed in — fill and outline disappear.
 *   - terrainAMSL + radius_m anchors the dome to local ground (A3DM flight-plan pattern).
 *   - viewer.scene.globe.depthTestAgainstTerrain = false keeps the dome visible over tiles.
 */
function syncRangeSphere(
  Cesium: CesiumModule,
  viewer: CesiumViewer,
  keep: Set<string>,
  idPrefix: string,
  instanceId: string,
  lon: number,
  lat: number,
  terrainAMSL: number,
  radius_m: number,
  suffix: string,
  style: {
    fillHex?: string
    fillAlpha: number
    outlineHex: string
    outlineAlpha: number
    outlineWidth?: number
  },
) {
  const id = `map-${idPrefix}-sphere-${instanceId}${suffix}`
  keep.add(id)

  const fillColor = colour(Cesium, style.fillHex ?? CYAN, style.fillAlpha)
  const outlineColor = colour(Cesium, style.outlineHex, style.outlineAlpha)
  const centreAltM = groundTangentDomeCentreM(terrainAMSL, radius_m)

  const entity = ensureEntity(viewer, id, () => new Cesium.Entity({ id }))
  entity.position = new Cesium.ConstantPositionProperty(
    Cesium.Cartesian3.fromDegrees(lon, lat, centreAltM)
  )
  entity.billboard = undefined
  entity.label = undefined
  entity.polygon = undefined
  entity.polyline = undefined
  entity.ellipse = undefined
  entity.ellipsoid = new Cesium.EllipsoidGraphics({
    radii: new Cesium.Cartesian3(radius_m, radius_m, radius_m),
    material: fillColor,
    outline: true,
    outlineColor,
    outlineWidth: style.outlineWidth ?? 2,
    slicePartitions: 32,
    stackPartitions: 32,
  })
}

export function syncMapEntities(
  Cesium: CesiumModule,
  viewer: CesiumViewer,
  state: CesiumSyncState
) {
  const keep = new Set<string>()

  for (const uas of state.placedUas) {
    const id = `map-uas-mark-${uas.instanceId}`
    keep.add(id)
    const radius_m = state.nilWind
      ? uas.lateralRadius_m
      : uas.effectiveRange_km * 1000
    const opKm = uas.lateralRadius_m / 1000
    const specKm = uas.asset.max_range_km
    const rangeLabel = state.nilWind
      ? specKm > opKm + 0.05
        ? `${opKm.toFixed(1)} km envelope · ${specKm.toFixed(0)} km ferry`
        : `${opKm.toFixed(1)} km envelope`
      : `${uas.effectiveRange_km.toFixed(1)} km wind-adj`

    syncRangeSphere(
      Cesium,
      viewer,
      keep,
      'uas',
      uas.instanceId,
      uas.lon,
      uas.lat,
      uas.terrainAMSL,
      radius_m,
      '',
      { fillAlpha: 0.22, outlineHex: ORANGE, outlineAlpha: 0.9, outlineWidth: 4 },
    )

    const showSpecRing =
      specKm * 1000 > radius_m + 5000 ||
      (!state.nilWind && uas.effectiveRange_km < opKm - 0.05)
    if (showSpecRing) {
      const specRadius_m = state.nilWind
        ? specKm * 1000
        : opKm * 1000
      syncRangeSphere(
        Cesium,
        viewer,
        keep,
        'uas',
        uas.instanceId,
        uas.lon,
        uas.lat,
        uas.terrainAMSL,
        specRadius_m,
        '-spec',
        { fillAlpha: 0.06, outlineHex: CYAN, outlineAlpha: 0.45, outlineWidth: 2 },
      )
    }

    const entity = ensureEntity(viewer, id, () =>
      new Cesium.Entity({ id, name: uas.asset.name })
    )

    entity.position = new Cesium.ConstantPositionProperty(
      Cesium.Cartesian3.fromDegrees(uas.lon, uas.lat, 0),
    )
    entity.cylinder = undefined
    entity.ellipsoid = undefined
    entity.polyline = undefined
    entity.billboard = new Cesium.BillboardGraphics({
      image: UAS_SILHOUETTE_SVG,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      scale: 1.2,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    })

    entity.label = new Cesium.LabelGraphics({
      text: `${uas.asset.name}\n${rangeLabel} · ${formatHHMM(uas.annotationTime_min)}`,
      font: '12px JetBrains Mono',
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -36),
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    })

    if (uas.loiter) {
      syncLoiterGraphics(Cesium, viewer, uas, keep)
    }

    if (!state.nilWind && state.windByUas[uas.instanceId]) {
      const windId = `map-wind-${uas.instanceId}`
      keep.add(windId)
      const wind = state.windByUas[uas.instanceId]
      const windEntity = ensureEntity(viewer, windId, () =>
        new Cesium.Entity({ id: windId })
      )
      windEntity.position = new Cesium.ConstantPositionProperty(
        Cesium.Cartesian3.fromDegrees(uas.lon, uas.lat, uas.terrainAMSL + 80)
      )
      windEntity.billboard = new Cesium.BillboardGraphics({
        image: windArrowSvg(wind.windDir_deg),
        scale: 1.5,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      })
      windEntity.label = new Cesium.LabelGraphics({
        text: `${wind.windSpeed_kmh} km/h`,
        font: '11px JetBrains Mono',
        fillColor: colour(Cesium, CYAN, 1),
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(0, -28),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      })
    }
  }

  for (const cuas of state.placedCuas) {
    const id = `map-cuas-mark-${cuas.instanceId}`
    keep.add(id)
    const r = cuas.asset.defeat_range_m

    syncRangeSphere(
      Cesium,
      viewer,
      keep,
      'cuas',
      cuas.instanceId,
      cuas.lon,
      cuas.lat,
      cuas.terrainAMSL,
      r,
      '',
      {
        fillHex: ORANGE,
        fillAlpha: 0.14,
        outlineHex: ORANGE,
        outlineAlpha: 0.75,
        outlineWidth: 3,
      },
    )

    const entity = ensureEntity(viewer, id, () =>
      new Cesium.Entity({ id, name: cuas.asset.name })
    )
    entity.position = new Cesium.ConstantPositionProperty(
      Cesium.Cartesian3.fromDegrees(cuas.lon, cuas.lat, 0),
    )
    entity.ellipsoid = undefined
    entity.polygon = undefined
    entity.billboard = new Cesium.BillboardGraphics({
      image: SHIELD_SVG,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      scale: 1.1,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    })
    entity.label = new Cesium.LabelGraphics({
      text: `${cuas.asset.name}\n${(cuas.asset.defeat_range_m / 1000).toFixed(1)} km`,
      font: '12px JetBrains Mono',
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -36),
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    })
  }

  for (const mask of state.maskingPolygons) {
    if (!mask.hasMasking || mask.positions.length < 3) continue
    const id = `map-mask-${mask.cuasInstanceId}`
    keep.add(id)
    const hierarchy = mask.positions.map((p) =>
      Cesium.Cartesian3.fromDegrees(p.lon, p.lat)
    )
    const entity = ensureEntity(viewer, id, () => new Cesium.Entity({ id }))
    entity.position = new Cesium.ConstantPositionProperty(
      Cesium.Cartesian3.fromDegrees(mask.positions[0].lon, mask.positions[0].lat, 0),
    )
    entity.polygon = new Cesium.PolygonGraphics({
      hierarchy: new Cesium.PolygonHierarchy(hierarchy),
      material: colour(Cesium, '#64748B', 0.35),
      outline: true,
      outlineColor: colour(Cesium, '#94A3B8', 0.6),
      height: TERRAIN_SURFACE_AGL_M,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      perPositionHeight: false,
    })
  }

  for (const vol of state.overlaps) {
    const id = `map-overlap-${vol.id}`
    keep.add(id)
    const hex = vol.isDefeat ? RED : GREEN
    const entity = ensureEntity(viewer, id, () => new Cesium.Entity({ id }))
    entity.position = new Cesium.ConstantPositionProperty(
      Cesium.Cartesian3.fromDegrees(vol.lon, vol.lat, vol.alt_m)
    )
    entity.ellipsoid = new Cesium.EllipsoidGraphics({
      radii: new Cesium.Cartesian3(vol.radius_m, vol.radius_m, vol.radius_m * 0.6),
      material: colour(Cesium, hex, 0.2),
      outline: true,
      outlineColor: colour(Cesium, hex, 0.75),
      outlineWidth: 2,
    })
    entity.label = new Cesium.LabelGraphics({
      text: vol.label,
      font: '11px JetBrains Mono',
      fillColor: colour(Cesium, hex, 1),
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(0, -20),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    })
  }

  removeStale(viewer, keep)
}

function syncLoiterGraphics(
  Cesium: CesiumModule,
  viewer: CesiumViewer,
  uas: PlacedUas,
  keep: Set<string>
) {
  if (!uas.loiter) return
  const lo = uas.loiter
  const base = uas.instanceId

  const pinId = `map-loiter-pin-${base}`
  keep.add(pinId)
  const pin = ensureEntity(viewer, pinId, () => new Cesium.Entity({ id: pinId }))
  pin.position = new Cesium.ConstantPositionProperty(
    Cesium.Cartesian3.fromDegrees(lo.lon, lo.lat, lo.terrainAMSL + 2)
  )
  pin.billboard = new Cesium.BillboardGraphics({
    image: PIN_SVG,
    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
  })

  const transitId = `map-loiter-transit-${base}`
  keep.add(transitId)
  const transit = ensureEntity(viewer, transitId, () =>
    new Cesium.Entity({ id: transitId })
  )
  transit.polyline = new Cesium.PolylineGraphics({
    positions: Cesium.Cartesian3.fromDegreesArray([
      uas.lon,
      uas.lat,
      lo.lon,
      lo.lat,
    ]),
    width: 2,
    material: new Cesium.PolylineDashMaterialProperty({
      color: colour(Cesium, CYAN, 0.9),
      dashLength: 16,
    }),
    clampToGround: true,
  })

  const returnId = `map-loiter-return-${base}`
  keep.add(returnId)
  const ret = ensureEntity(viewer, returnId, () => new Cesium.Entity({ id: returnId }))
  ret.polyline = new Cesium.PolylineGraphics({
    positions: Cesium.Cartesian3.fromDegreesArray([
      lo.lon,
      lo.lat,
      uas.lon,
      uas.lat,
    ]),
    width: 2,
    material: new Cesium.PolylineDashMaterialProperty({
      color: colour(Cesium, ORANGE, 0.9),
      dashLength: 16,
    }),
    clampToGround: true,
  })

  const circleId = `map-loiter-circle-${base}`
  keep.add(circleId)
  const circlePositions: number[] = []
  for (let i = 0; i <= 36; i++) {
    const angle = (i / 36) * 2 * Math.PI
    const dx = (500 * Math.cos(angle)) / 111320
    const dy = (500 * Math.sin(angle)) / 110540
    circlePositions.push(lo.lon + dx, lo.lat + dy)
  }
  const circle = ensureEntity(viewer, circleId, () => new Cesium.Entity({ id: circleId }))
  circle.polyline = new Cesium.PolylineGraphics({
    positions: Cesium.Cartesian3.fromDegreesArray(circlePositions),
    width: 2,
    material: colour(Cesium, CYAN, 0.7),
    clampToGround: true,
  })

  const labels: { id: string; text: string; lon: number; lat: number }[] = [
    {
      id: `map-loiter-lbl-transit-${base}`,
      text: `TRANSIT ${formatHHMM(lo.transitTime_min)}`,
      lon: (uas.lon + lo.lon) / 2,
      lat: (uas.lat + lo.lat) / 2,
    },
    {
      id: `map-loiter-lbl-station-${base}`,
      text: `ON STATION ${formatHHMM(lo.timeOnStation_min)}`,
      lon: lo.lon,
      lat: lo.lat + 0.002,
    },
    {
      id: `map-loiter-lbl-rth-${base}`,
      text: `RTH ${formatHHMM(lo.returnTime_min)}`,
      lon: (uas.lon + lo.lon) / 2 + 0.001,
      lat: (uas.lat + lo.lat) / 2 - 0.001,
    },
  ]

  for (const lbl of labels) {
    keep.add(lbl.id)
    const e = ensureEntity(viewer, lbl.id, () => new Cesium.Entity({ id: lbl.id }))
    e.position = new Cesium.ConstantPositionProperty(
      Cesium.Cartesian3.fromDegrees(lbl.lon, lbl.lat, lo.terrainAMSL + 5)
    )
    e.label = new Cesium.LabelGraphics({
      text: lbl.text,
      font: '10px JetBrains Mono',
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    })
  }
}

```


---

## 2 — CESIUM VIEWER INIT
**Path:** `app/map/CesiumMapPanel.tsx`

```typescript
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { syncMapEntities, type CesiumSyncState, type MaskingPolygon } from '@/lib/map/cesium-sync'
import type { CesiumModule, CesiumTerrainProvider, CesiumViewer } from '@/lib/map/cesium-types'
import { loadCesium } from '@/lib/map/load-cesium'
import {
  placementNeedsTerrainRefresh,
  sampleTerrainAMSL,
  sampleTerrainBatch,
  terrainHeightChanged,
  type TerrainHeightUpdate,
} from '@/lib/map/terrain'
import { formatCoord } from '@/lib/map/format'
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
  windByUas: Record<string, WindSample>
  nilWind: boolean
  placementMode: PlacementMode
  panelUasId: string | null
  onCesiumReady: (ctx: CesiumContext) => void
  onGlobeClick: (lon: number, lat: number) => void
  onCursorMove: (cursor: CursorPosition) => void
  onPanelScreenPos: (pos: { x: number; y: number } | null) => void
  onTerrainHeightsResolved?: (update: TerrainHeightUpdate) => void
}

export default function CesiumMapPanel({
  placedUas,
  placedCuas,
  overlaps,
  maskingPolygons,
  windByUas,
  nilWind,
  placementMode,
  panelUasId,
  onCesiumReady,
  onGlobeClick,
  onCursorMove,
  onPanelScreenPos,
  onTerrainHeightsResolved,
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
  const placedUasRef = useRef(placedUas)
  const placedCuasRef = useRef(placedCuas)
  onCesiumReadyRef.current = onCesiumReady
  onGlobeClickRef.current = onGlobeClick
  onCursorMoveRef.current = onCursorMove
  onPanelScreenPosRef.current = onPanelScreenPos
  onTerrainHeightsResolvedRef.current = onTerrainHeightsResolved
  placedUasRef.current = placedUas
  placedCuasRef.current = placedCuas

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
      })

      // Range domes / defeat ellipsoids must render above terrain (A3DM flight-plan pattern).
      viewer.scene.globe.depthTestAgainstTerrain = false

      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(134, -25, 2_000_000),
        orientation: {
          heading: 0,
          pitch: Cesium.Math.toRadians(-30),
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
          setTerrainEpoch((n) => n + 1)
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
    viewer.scene.requestRender()
  }, [
    cesiumReady,
    placedUas,
    placedCuas,
    overlaps,
    maskingPolygons,
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
    <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between gap-3 px-3 py-2 bg-surf1/90 border-t border-border backdrop-blur">
      <div className="flex items-center gap-2">
        <WindToggleInline nilWind={nilWind} loading={windLoading} onChange={onNilWindChange} />
        <button
          type="button"
          onClick={onClearAll}
          className="px-3 py-1.5 rounded border border-border bg-surf2 text-t-muted text-xs font-mono hover:text-orange hover:border-orange/30 transition-colors"
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
      className={`px-3 py-1.5 rounded border text-xs font-mono transition-colors ${
        nilWind
          ? 'border-border bg-surf2 text-t-secondary'
          : 'border-cyan/40 bg-cyan/10 text-cyan'
      }`}
    >
      {loading ? 'Fetching wind…' : nilWind ? 'Nil-Wind' : 'Live Wind'}
    </button>
  )
}

```


---

## 3 — CESIUM LOADER
**Path:** `lib/map/load-cesium.ts`

```typescript
import type { CesiumModule } from '@/lib/map/cesium-types'

let loadPromise: Promise<CesiumModule> | null = null

/**
 * Load Cesium via script tag — avoids webpack parsing Cesium.js (import.meta).
 * Cesium.js must be copied to /_next/static/Cesium/ by next.config.mjs.
 */
export function loadCesium(): Promise<CesiumModule> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Cesium cannot load during SSR'))
  }

  const w = window as Window & { Cesium?: CesiumModule; CESIUM_BASE_URL?: string }
  if (w.Cesium) return Promise.resolve(w.Cesium)

  if (!loadPromise) {
    w.CESIUM_BASE_URL =
      process.env.NEXT_PUBLIC_CESIUM_BASE_URL ?? '/_next/static/Cesium'

    loadPromise = new Promise((resolve, reject) => {
      const src = `${w.CESIUM_BASE_URL}/Cesium.js`
      const existing = document.querySelector<HTMLScriptElement>(
        'script[data-spectral-cesium]'
      )
      if (existing) {
        existing.addEventListener('load', () => {
          if (w.Cesium) resolve(w.Cesium)
          else reject(new Error('Cesium global missing after script load'))
        })
        existing.addEventListener('error', () =>
          reject(new Error('Cesium script failed to load'))
        )
        if (w.Cesium) resolve(w.Cesium)
        return
      }

      const script = document.createElement('script')
      script.src = src
      script.async = true
      script.dataset.spectralCesium = 'true'
      script.onload = () => {
        if (w.Cesium) resolve(w.Cesium)
        else reject(new Error('Cesium global missing after script load'))
      }
      script.onerror = () => reject(new Error(`Failed to load Cesium from ${src}`))
      document.head.appendChild(script)
    })
  }

  return loadPromise
}

```


---

## 4 — CESIUM TYPES
**Path:** `lib/map/cesium-types.ts`

```typescript
/** Cesium types — never import the cesium package here (SSR/webpack safe). */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CesiumModule = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CesiumViewer = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CesiumTerrainProvider = any

```


---

## 5 — PLACEMENT HOOK
**Path:** `app/map/hooks/usePlatformPlacement.ts`

```typescript
'use client'

import { useCallback } from 'react'
import { computeUasEnvelope } from '@/lib/map/format'
import type { CesiumModule, CesiumTerrainProvider, CesiumViewer } from '@/lib/map/cesium-types'
import { sampleTerrainAMSL } from '@/lib/map/terrain'
import type {
  MapCuasAsset,
  MapUasAsset,
  PlacedCuas,
  PlacedUas,
  PlacementMode,
} from '@/lib/map/types'

export interface CesiumContext {
  Cesium: CesiumModule
  terrainProvider: CesiumTerrainProvider
  viewer: CesiumViewer
}

function newInstanceId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function usePlatformPlacement(
  placementMode: PlacementMode,
  setPlacementMode: (mode: PlacementMode) => void,
  setPlacedUas: React.Dispatch<React.SetStateAction<PlacedUas[]>>,
  setPlacedCuas: React.Dispatch<React.SetStateAction<PlacedCuas[]>>,
  getCesium: () => CesiumContext | null
) {
  const placeAt = useCallback(
    async (lon: number, lat: number) => {
      if (!placementMode.active) return
      const ctx = getCesium()
      if (!ctx) return

      const terrainAMSL = await sampleTerrainAMSL(
        ctx.Cesium,
        ctx.terrainProvider,
        lon,
        lat,
        ctx.viewer,
      )

      if (placementMode.kind === 'uas') {
        const asset = placementMode.asset as MapUasAsset
        const env = computeUasEnvelope(asset, terrainAMSL)
        const placed: PlacedUas = {
          instanceId: newInstanceId('uas'),
          asset,
          lon,
          lat,
          terrainAMSL,
          lateralRadius_m: env.lateralRadius_m,
          ceilingAMSL_m: env.ceilingAMSL_m,
          annotationTime_min: env.annotationTime_min,
          effectiveRange_km: env.operationalRange_km,
          infoPanelClosed: true,
        }
        setPlacedUas((prev) => [...prev, placed])
        setPlacementMode({ active: false })
        return
      }

      if (placementMode.kind === 'cuas') {
        const asset = placementMode.asset as MapCuasAsset
        const placed: PlacedCuas = {
          instanceId: newInstanceId('cuas'),
          asset,
          lon,
          lat,
          terrainAMSL,
          hasTerrainMasking: false,
        }
        setPlacedCuas((prev) => [...prev, placed])
        setPlacementMode({ active: false })
      }
    },
    [placementMode, getCesium, setPlacedUas, setPlacedCuas, setPlacementMode]
  )

  const startUasPlacement = useCallback(
    (asset: MapUasAsset) => {
      setPlacementMode({ active: true, kind: 'uas', asset })
    },
    [setPlacementMode]
  )

  const startCuasPlacement = useCallback(
    (asset: MapCuasAsset) => {
      setPlacementMode({ active: true, kind: 'cuas', asset })
    },
    [setPlacementMode]
  )

  const cancelPlacement = useCallback(() => {
    setPlacementMode({ active: false })
  }, [setPlacementMode])

  return { placeAt, startUasPlacement, startCuasPlacement, cancelPlacement }
}

```


---

## 6 — ENVELOPE FORMAT
**Path:** `lib/map/format.ts`

```typescript
export function formatHHMM(totalMinutes: number): string {
  const mins = Math.max(0, Math.round(totalMinutes))
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function formatMMSS(totalMinutes: number): string {
  const totalSec = Math.max(0, Math.round(totalMinutes * 60))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function formatCoord(lon: number, lat: number): string {
  return `${lat.toFixed(5)}°, ${lon.toFixed(5)}°`
}

import { computePlatformRangeEnvelope } from '@/lib/map/range-declaration'
import type { MapUasAsset } from '@/lib/map/types'

export function computeUasEnvelope(asset: MapUasAsset, terrainAMSL: number) {
  const range = computePlatformRangeEnvelope(asset, terrainAMSL)
  const ceilingAMSL_m = terrainAMSL + asset.max_altitude_agl_m
  const lateralRadius_m = range.sphereRadiusM
  const cylinderLength_m = asset.max_altitude_agl_m
  const cylinderCentreAlt_m = range.sphereCentreAltM
  const timeToPerimeter_min =
    asset.max_speed_kmh > 0
      ? (range.operationalRadiusKm / asset.max_speed_kmh) * 60
      : 0
  const climbTime_min =
    asset.max_speed_kmh > 0
      ? (asset.max_altitude_agl_m / asset.climb_rate_mpm) / asset.max_speed_kmh * 60
      : 0
  const annotationTime_min = Math.max(0, timeToPerimeter_min - climbTime_min)

  return {
    ceilingAMSL_m,
    lateralRadius_m,
    cylinderLength_m,
    cylinderCentreAlt_m,
    sphereRadius_m: range.sphereRadiusM,
    sphereCentreAlt_m: range.sphereCentreAltM,
    declaredRange_km: range.declaredRangeKm,
    operationalRange_km: range.operationalRadiusKm,
    timeToPerimeter_min,
    climbTime_min,
    annotationTime_min,
  }
}

```


---

## 7 — RANGE DECLARATION
**Path:** `lib/map/range-declaration.ts`

```typescript
/**
 * Platform range envelope — adapted from A3DM lib/signals/c2-range-declaration.ts
 *
 * A3DM CASA/TMI uses 80% of declared C2 range as the operational containment cap.
 * SPECTRAL Map Intel draws a **ground-anchored combat envelope** on the globe.
 *
 * OSINT `range_km` in the platform library is often manufacturer **ferry / one-way
 * max distance** (e.g. TB-001 @ 6000 km). Map Intel must NOT use that literally as
 * sphere radius — Earth is ~6371 km. We derive **operational combat radius** instead.
 */

import { effectiveRangeKm } from '@/lib/map/wind'
import type { MapUasAsset, WindSample } from '@/lib/map/types'
import type { PlatformCategory } from '@/lib/types'

/** CASA / TMI reference — operational cap vs declared max (A3DM pattern). */
export const CASA_RANGE_CONTAINMENT_RATIO = 0.8

/** SPECTRAL intel — envelope uses full derived operational radius (not 80% cap). */
export const SPECTRAL_SPEC_RANGE_RATIO = 1.0

/** Categories where max range is one-way — full spec is the envelope. */
const ONE_WAY_CATEGORIES = new Set<PlatformCategory>(['loitering_munition'])

export interface OperationalEnvelope {
  /** Raw OSINT max range from platform record (km). */
  declaredSpecKm: number
  /** Derived combat / operational radius for map dome (km). */
  operationalRadiusKm: number
  /** Human-readable basis for instructor briefs. */
  basis: 'spec' | 'one_way' | 'ferry_combat'
}

export interface PlatformRangeEnvelope {
  /** Raw OSINT max range (km) — may be ferry figure. */
  declaredRangeKm: number
  /** Combat envelope used for map sphere (km). */
  operationalRadiusKm: number
  /** Optional 80% compliance reference (km) — A3DM TMI style. */
  containmentRangeKm: number
  /** Active range for map sphere (km) — wind-adjusted operational radius. */
  effectiveRangeKm: number
  /** Radius used for Cesium sphere (m). */
  sphereRadiusM: number
  /** Sphere centre altitude MSL — nominal operating band midpoint. */
  sphereCentreAltM: number
  /** Whether effectiveRangeKm is below operational due to wind. */
  windAdjusted: boolean
  envelopeBasis: OperationalEnvelope['basis']
}

export function distanceValToKm(
  val: string,
  unit: 'm' | 'km' | 'nm' | 'ft',
): number | null {
  let km = parseFloat(val)
  if (!Number.isFinite(km) || km <= 0) return null
  if (unit === 'm') km /= 1000
  else if (unit === 'nm') km *= 1.852
  else if (unit === 'ft') km *= 0.0003048
  return km
}

export function containmentRangeKm(
  declaredKm: number,
  ratio = CASA_RANGE_CONTAINMENT_RATIO,
): number {
  return Math.round(declaredKm * ratio * 1000) / 1000
}

/**
 * Derive map combat radius from OSINT spec + endurance.
 * Ferry figures (>~2000 km) are reduced using out-and-back and fuel-limited caps.
 */
export function operationalEnvelopeRadiusKm(asset: MapUasAsset): OperationalEnvelope {
  const declaredSpecKm = Math.max(0.1, asset.max_range_km)

  if (ONE_WAY_CATEGORIES.has(asset.category)) {
    return {
      declaredSpecKm,
      operationalRadiusKm: declaredSpecKm,
      basis: 'one_way',
    }
  }

  // Short-range tactical — spec is already combat radius (Group 1–3, FPV, interceptors).
  if (declaredSpecKm <= 400) {
    return {
      declaredSpecKm,
      operationalRadiusKm: declaredSpecKm,
      basis: 'spec',
    }
  }

  const enduranceTotalKm =
    asset.max_speed_kmh > 0 && asset.endurance_min > 0
      ? asset.max_speed_kmh * (asset.endurance_min / 60)
      : declaredSpecKm

  // Outbound leg with fuel reserve for return (~45% of endurance distance).
  const enduranceCombatKm = enduranceTotalKm * 0.45
  const halfFerryKm = declaredSpecKm / 2

  const candidates = [declaredSpecKm, enduranceCombatKm, halfFerryKm]
  if (declaredSpecKm > 2000) {
    // Very long ferry claims (TB-001 6000 km) — combat radius ~25% of ferry (OSINT assessed).
    candidates.push(declaredSpecKm / 4)
  }

  const operationalRadiusKm = Math.max(
    0.1,
    Math.min(...candidates),
  )

  return {
    declaredSpecKm,
    operationalRadiusKm,
    basis: 'ferry_combat',
  }
}

/**
 * Spherical range envelope — radii (r, r, r).
 * Map Intel draws the dome in cesium-sync with centre at terrainAMSL + sphereRadiusM
 * (ground-tangent). sphereCentreAltM here is the nominal operating-band midpoint (MSL).
 */
export function computePlatformRangeEnvelope(
  asset: MapUasAsset,
  terrainAMSL: number,
  opts?: {
    wind?: WindSample | null
    flightBearingDeg?: number
    /** When true, use live wind to shrink sphere radius (headwind). */
    applyWind?: boolean
  },
): PlatformRangeEnvelope {
  const op = operationalEnvelopeRadiusKm(asset)
  const declaredRangeKm = op.declaredSpecKm
  const operationalRadiusKm = op.operationalRadiusKm
  const containmentRangeKmVal = containmentRangeKm(operationalRadiusKm)

  let effectiveKm = operationalRadiusKm
  let windAdjusted = false

  if (opts?.applyWind && opts.wind) {
    effectiveKm = effectiveRangeKm(
      { ...asset, max_range_km: operationalRadiusKm },
      opts.wind,
      opts.flightBearingDeg ?? 0,
    )
    windAdjusted = effectiveKm < operationalRadiusKm - 0.01
  }

  const sphereRadiusM = Math.max(100, effectiveKm * 1000)
  const sphereCentreAltM = terrainAMSL + asset.max_altitude_agl_m / 2

  return {
    declaredRangeKm,
    operationalRadiusKm,
    containmentRangeKm: containmentRangeKmVal,
    effectiveRangeKm: effectiveKm,
    sphereRadiusM,
    sphereCentreAltM,
    windAdjusted,
    envelopeBasis: op.basis,
  }
}

```


---

## 8 — TERRAIN SAMPLING
**Path:** `lib/map/terrain.ts`

```typescript
import type {
  CesiumModule,
  CesiumTerrainProvider,
  CesiumViewer,
} from '@/lib/map/cesium-types'

export type { CesiumModule } from '@/lib/map/cesium-types'

/** Small offset above draped geometry to avoid z-fighting with terrain tiles. */
export const TERRAIN_SURFACE_AGL_M = 2

const TERRAIN_FALLBACK_M = 0

export async function sampleTerrainAMSL(
  Cesium: CesiumModule,
  terrainProvider: CesiumTerrainProvider,
  lon: number,
  lat: number,
  viewer?: CesiumViewer | null,
): Promise<number> {
  const carto = Cesium.Cartographic.fromDegrees(lon, lat)

  const sampleDetailed = async () => {
    const positions = await Cesium.sampleTerrainMostDetailed(terrainProvider, [carto])
    const h = positions[0]?.height
    return h !== undefined && Number.isFinite(h) ? h : null
  }

  let height = await sampleDetailed()
  if (height === null) height = await sampleDetailed()

  if (height === null && viewer?.scene?.globe) {
    const globeH = viewer.scene.globe.getHeight(carto)
    if (globeH !== undefined && Number.isFinite(globeH)) height = globeH
  }

  return height ?? TERRAIN_FALLBACK_M
}

export async function sampleTerrainBatch(
  Cesium: CesiumModule,
  terrainProvider: CesiumTerrainProvider,
  points: { lon: number; lat: number }[],
  viewer?: CesiumViewer | null,
): Promise<number[]> {
  if (points.length === 0) return []

  const cartographics = points.map((p) => Cesium.Cartographic.fromDegrees(p.lon, p.lat))
  const sampled = await Cesium.sampleTerrainMostDetailed(terrainProvider, cartographics)
  return sampled.map((p: { height?: number }, i: number) => {
    let height =
      p.height !== undefined && Number.isFinite(p.height) ? p.height : null
    if (height === null && viewer?.scene?.globe) {
      const globeH = viewer.scene.globe.getHeight(cartographics[i])
      if (globeH !== undefined && Number.isFinite(globeH)) height = globeH
    }
    return height ?? TERRAIN_FALLBACK_M
  })
}

export interface TerrainHeightUpdate {
  uas: { instanceId: string; terrainAMSL: number }[]
  cuas: { instanceId: string; terrainAMSL: number }[]
  loiter: { uasInstanceId: string; terrainAMSL: number }[]
}

const TERRAIN_HEIGHT_EPS_M = 0.5

/** True when placement still uses the pre-tile-load fallback height. */
export function placementNeedsTerrainRefresh(terrainAMSL: number): boolean {
  return terrainAMSL === TERRAIN_FALLBACK_M
}

export function terrainHeightChanged(prev: number, next: number): boolean {
  return Math.abs(prev - next) >= TERRAIN_HEIGHT_EPS_M
}

```


---

## 9 — MAP TYPES
**Path:** `lib/map/types.ts`

```typescript
import type { PlatformCategory } from '@/lib/types'

export interface MapUasAsset {
  id: string
  name: string
  slug: string
  category: PlatformCategory
  categoryLabel: string
  image_url: string | null
  max_altitude_agl_m: number
  max_range_km: number
  max_speed_kmh: number
  endurance_min: number
  climb_rate_mpm: number
}

export interface MapCuasAsset {
  id: string
  name: string
  categoryLabel: string
  image_url: string | null
  defeat_range_m: number
  defeat_range_km: number
  defeat_methods: string[]
}

export interface MapAssetsPayload {
  uas: MapUasAsset[]
  cuas: MapCuasAsset[]
}

export interface PlacedUas {
  instanceId: string
  asset: MapUasAsset
  lon: number
  lat: number
  terrainAMSL: number
  lateralRadius_m: number
  ceilingAMSL_m: number
  annotationTime_min: number
  effectiveRange_km: number
  loiter?: LoiterPlan
  infoPanelClosed: boolean
}

export interface LoiterPlan {
  lon: number
  lat: number
  terrainAMSL: number
  transitTime_min: number
  returnTime_min: number
  timeOnStation_min: number
  exceedsEndurance: boolean
}

export interface PlacedCuas {
  instanceId: string
  asset: MapCuasAsset
  lon: number
  lat: number
  terrainAMSL: number
  hasTerrainMasking: boolean
}

export interface OverlapVolume {
  id: string
  uasInstanceId: string
  cuasInstanceId: string
  lon: number
  lat: number
  alt_m: number
  radius_m: number
  effectiveness_pct: number
  isDefeat: boolean
  label: string
}

export interface WindSample {
  windSpeed_kmh: number
  windDir_deg: number
  level: string
}

export type PlacementMode =
  | { active: false }
  | { active: true; kind: 'uas'; asset: MapUasAsset }
  | { active: true; kind: 'cuas'; asset: MapCuasAsset }
  | { active: true; kind: 'loiter'; uasInstanceId: string; asset: MapUasAsset }

export interface CursorPosition {
  lon: number
  lat: number
  terrainAMSL: number | null
}

```


---

## 10 — ASSET MAPPERS
**Path:** `lib/map/asset-mappers.ts`

```typescript
import { CATEGORY_LABELS } from '@/lib/platforms/constants'
import type { AntiDroneSystem, Platform } from '@/lib/types'
import type { MapCuasAsset, MapUasAsset } from '@/lib/map/types'

const DEFAULT_CLIMB_MPM = 500

export function toMapUasAsset(platform: Platform): MapUasAsset {
  return {
    id: platform.id,
    name: platform.name,
    slug: platform.id,
    category: platform.category,
    categoryLabel: CATEGORY_LABELS[platform.category] ?? platform.category,
    image_url: null,
    max_altitude_agl_m: platform.service_ceiling_m ?? 500,
    max_range_km: platform.range_km ?? 10,
    max_speed_kmh: platform.max_speed_kmh ?? 100,
    endurance_min: Math.round((platform.endurance_hrs ?? 1) * 60),
    climb_rate_mpm: DEFAULT_CLIMB_MPM,
  }
}

export function toMapCuasAsset(system: AntiDroneSystem): MapCuasAsset {
  const methods = system.defeat_method ?? []
  const primary = methods.includes('laser') || methods.includes('directed_energy')
    ? 'Laser DEW'
    : methods.includes('kinetic')
      ? 'Kinetic'
      : methods.includes('RF_jamming')
        ? 'RF Jamming'
        : 'C-UAS'

  return {
    id: system.id,
    name: system.name,
    categoryLabel: primary,
    image_url: null,
    defeat_range_m: system.effective_range_m ?? 1000,
    defeat_range_km: (system.effective_range_m ?? 1000) / 1000,
    defeat_methods: methods,
  }
}

```


---

## 11 — MAP QUERIES
**Path:** `lib/map/queries.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { toMapCuasAsset, toMapUasAsset } from '@/lib/map/asset-mappers'
import type { MapAssetsPayload } from '@/lib/map/types'
import type { AntiDroneSystem, DefeatEffectiveness, Platform } from '@/lib/types'

export async function getMapAssets(): Promise<MapAssetsPayload> {
  const supabase = await createClient()

  const [platformsRes, systemsRes] = await Promise.all([
    supabase.from('platforms').select('*').order('name'),
    supabase.from('anti_drone_systems').select('*').order('name'),
  ])

  if (platformsRes.error) throw new Error(platformsRes.error.message)
  if (systemsRes.error) throw new Error(systemsRes.error.message)

  return {
    uas: (platformsRes.data as Platform[]).map(toMapUasAsset),
    cuas: (systemsRes.data as AntiDroneSystem[]).map(toMapCuasAsset),
  }
}

export async function getDefeatCheckData(uasId: string, cuasId: string) {
  const supabase = await createClient()

  const [platformRes, systemRes, effRes] = await Promise.all([
    supabase.from('platforms').select('*').eq('id', uasId).maybeSingle(),
    supabase.from('anti_drone_systems').select('*').eq('id', cuasId).maybeSingle(),
    supabase
      .from('defeat_effectiveness')
      .select('*')
      .eq('platform_id', uasId)
      .eq('defeat_system_id', cuasId)
      .maybeSingle(),
  ])

  if (platformRes.error) throw new Error(platformRes.error.message)
  if (systemRes.error) throw new Error(systemRes.error.message)
  if (effRes.error) throw new Error(effRes.error.message)

  return {
    platform: platformRes.data as Platform | null,
    system: systemRes.data as AntiDroneSystem | null,
    effectiveness: effRes.data as DefeatEffectiveness | null,
  }
}

```


---

## 12 — MAP ASSETS API
**Path:** `app/api/map/assets/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { getMapAssets } from '@/lib/map/queries'

export async function GET() {
  try {
    const data = await getMapAssets()
    return NextResponse.json({ data })
  } catch (error) {
    console.error('[GET /api/map/assets]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

```


---

## 13 — ANDURIL ANVIL (SQL EXCERPT)
## Anduril Anvil — platforms table (UAS list)

```sql
('anduril-anvil', 'Anduril Anvil', 'Anduril', 'United States', 'interceptor_uas',
 150, 500, 5, 0.2, 2, NULL, 'INS+EO', false, false, false,
 ARRAY[]::TEXT[], ARRAY['Lattice C2','EO'], ARRAY['kinetic intercept'], ARRAY['EO'],
 ARRAY['US DoD'], ARRAY['Falcon Peak 2025'], 'high',
 ARRAY['OSINT: SPECTRAL_INTEL_UPDATE_2025 — Confirmed']),
```

Fields: `max_speed_kmh=150`, `service_ceiling_m=500`, **`range_km=5`**, `endurance_hrs=0.2`, `mtow_kg=2`

## Anduril Anvil — anti_drone_systems table (C-UAS list)

```sql
('anduril-anvil', 'Anduril Anvil', 'Anduril', 'United States',
 ARRAY['kinetic'], 500, 'man-portable', true, 'high',
 ARRAY['OSINT: SPECTRAL_INTEL_UPDATE_2025 — Confirmed'], NULL)
```

Field: **`effective_range_m=500`** → 0.5 km defeat range when placed from C-UAS Systems sidebar.


---

## 14 — MAP INTEL SHELL
**Path:** `app/map/MapIntelView.tsx`

```typescript
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
    const matched = stagedIds.filter((id) => assetIds.has(id))

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

```


---

## 15 — MAP ROUTE
**Path:** `app/map/page.tsx`

```typescript
import { Suspense } from 'react'
import { getMapAssets } from '@/lib/map/queries'
import MapIntelView from '@/app/map/MapIntelView'

export const metadata = {
  title: 'Map Intel — Spectral',
  description: 'Terrain-anchored UAS/C-UAS placement and defeat overlap visualisation',
}

export default async function MapPage() {
  const assets = await getMapAssets()

  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center text-t-muted font-mono text-sm">
          Loading Map Intel…
        </div>
      }
    >
      <MapIntelView initialAssets={assets} />
    </Suspense>
  )
}

```


---

## 16 — MAP LAYOUT
**Path:** `app/map/layout.tsx`

```typescript
import { FullBleedShell } from '@/components/layout/FullBleedShell'

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return (
    <FullBleedShell title="Map Intel">
      {children}
    </FullBleedShell>
  )
}

```


---

## 17 — ASSET SIDEBAR + LEGEND
**Path:** `app/map/components/AssetSidebar.tsx`

```typescript
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight, Crosshair, Shield, Plane } from 'lucide-react'
import { clsx } from 'clsx'
import { LoiterControls } from '@/app/map/components/LoiterControls'
import type {
  MapAssetsPayload,
  MapCuasAsset,
  MapUasAsset,
  PlacedCuas,
  PlacedUas,
  PlacementMode,
} from '@/lib/map/types'

interface AssetSidebarProps {
  assets: MapAssetsPayload
  placedUas: PlacedUas[]
  placedCuas: PlacedCuas[]
  placementMode: PlacementMode
  highlightedIds?: string[]
  onSelectUas: (asset: MapUasAsset) => void
  onSelectCuas: (asset: MapCuasAsset) => void
  onPlaceLoiter: (uas: PlacedUas) => void
  onClearLoiter: (uasInstanceId: string) => void
  overlapLegend?: { defeat: number; survivable: number }
}

export function AssetSidebar({
  assets,
  placedUas,
  placedCuas,
  placementMode,
  highlightedIds = [],
  onSelectUas,
  onSelectCuas,
  onPlaceLoiter,
  onClearLoiter,
  overlapLegend,
}: AssetSidebarProps) {
  const [uasOpen, setUasOpen] = useState(true)
  const [cuasOpen, setCuasOpen] = useState(true)
  const [placedOpen, setPlacedOpen] = useState(true)

  const placingUasId =
    placementMode.active && placementMode.kind === 'uas' ? placementMode.asset.id : null
  const placingCuasId =
    placementMode.active && placementMode.kind === 'cuas' ? placementMode.asset.id : null
  const loiterPlacingId =
    placementMode.active && placementMode.kind === 'loiter'
      ? placementMode.uasInstanceId
      : null

  return (
    <aside className="w-[280px] flex-shrink-0 flex flex-col bg-surf1 border-r border-border h-full">
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <Link
          href="/"
          className="text-[10px] font-mono text-t-muted hover:text-cyan transition-colors"
        >
          ← Dashboard
        </Link>
        <span className="text-[10px] font-mono text-t-muted uppercase tracking-wider">
          Map Intel
        </span>
      </div>

      <div className="flex-1 overflow-y-auto py-2 space-y-1">
        <SectionHeader
          open={uasOpen}
          onToggle={() => setUasOpen(!uasOpen)}
          icon={Plane}
          label="UAS Platforms"
          count={assets.uas.length}
        />
        {uasOpen && (
          <div className="px-2 space-y-1 max-h-48 overflow-y-auto">
            {assets.uas.map((asset) => (
              <AssetTile
                key={asset.id}
                name={asset.name}
                sub={`${asset.max_range_km} km · ${asset.max_altitude_agl_m} m`}
                active={placingUasId === asset.id}
                highlighted={highlightedIds.includes(asset.id)}
                onClick={() => onSelectUas(asset)}
              />
            ))}
          </div>
        )}

        <SectionHeader
          open={cuasOpen}
          onToggle={() => setCuasOpen(!cuasOpen)}
          icon={Shield}
          label="C-UAS Systems"
          count={assets.cuas.length}
        />
        {cuasOpen && (
          <div className="px-2 space-y-1 max-h-48 overflow-y-auto">
            {assets.cuas.map((asset) => (
              <AssetTile
                key={asset.id}
                name={asset.name}
                sub={`${asset.defeat_range_km.toFixed(1)} km · ${asset.categoryLabel}`}
                active={placingCuasId === asset.id}
                highlighted={highlightedIds.includes(asset.id)}
                onClick={() => onSelectCuas(asset)}
                variant="orange"
              />
            ))}
          </div>
        )}

        {(placedUas.length > 0 || placedCuas.length > 0) && (
          <>
            <SectionHeader
              open={placedOpen}
              onToggle={() => setPlacedOpen(!placedOpen)}
              icon={Crosshair}
              label="Placed Assets"
              count={placedUas.length + placedCuas.length}
            />
            {placedOpen && (
              <div className="px-2 space-y-2">
                {placedUas.map((u) => (
                  <div
                    key={u.instanceId}
                    className={clsx(
                      'p-2 rounded border bg-surf2 text-[10px]',
                      loiterPlacingId === u.instanceId
                        ? 'border-cyan/50 ring-1 ring-cyan/30'
                        : 'border-border',
                    )}
                  >
                    <p className="font-mono text-cyan truncate">{u.asset.name}</p>
                    <p className="font-mono text-t-muted">
                      {u.lat.toFixed(4)}°, {u.lon.toFixed(4)}°
                    </p>
                    <p className="font-mono text-t-muted">
                      {(u.lateralRadius_m / 1000).toFixed(1)} km envelope
                    </p>
                    <LoiterControls
                      uas={u}
                      loiterPlacing={loiterPlacingId === u.instanceId}
                      onPlaceLoiter={() => onPlaceLoiter(u)}
                      onClearLoiter={() => onClearLoiter(u.instanceId)}
                    />
                  </div>
                ))}
                {placedCuas.map((c) => (
                  <div
                    key={c.instanceId}
                    className="p-2 rounded border border-border bg-surf2 text-[10px]"
                  >
                    <p className="font-mono text-orange truncate">{c.asset.name}</p>
                    <p className="font-mono text-t-muted">
                      {c.lat.toFixed(4)}°, {c.lon.toFixed(4)}°
                    </p>
                    {c.hasTerrainMasking && (
                      <p className="font-mono text-t-muted mt-1">Terrain masking active</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="px-3 py-3 border-t border-border space-y-2">
        <p className="text-[10px] font-mono text-t-muted uppercase tracking-wider">Legend</p>
        <LegendRow colour="bg-cyan/40" label="Combat envelope (ground ring)" />
        <LegendRow colour="bg-cyan/20" label="Faint ring = OSINT ferry max / wind spec" />
        <LegendRow colour="bg-orange/40" label="C-UAS defeat range (ground ring)" />
        <LegendRow colour="bg-slate-500/40" label="Terrain masking shadow" />
        <LegendRow colour="bg-red-500/40" label="Defeat overlap ≥50%" />
        <LegendRow colour="bg-green-500/40" label="Survivable overlap <50%" />
        {overlapLegend && (overlapLegend.defeat > 0 || overlapLegend.survivable > 0) && (
          <p className="text-[10px] font-mono text-t-muted pt-1">
            {overlapLegend.defeat} defeat / {overlapLegend.survivable} survivable
          </p>
        )}
      </div>
    </aside>
  )
}

function SectionHeader({
  open,
  onToggle,
  icon: Icon,
  label,
  count,
}: {
  open: boolean
  onToggle: () => void
  icon: React.ComponentType<{ className?: string }>
  label: string
  count: number
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-surf2 transition-colors"
    >
      {open ? (
        <ChevronDown className="w-3 h-3 text-t-muted" />
      ) : (
        <ChevronRight className="w-3 h-3 text-t-muted" />
      )}
      <Icon className="w-3.5 h-3.5 text-t-muted" />
      <span className="text-xs text-t-secondary flex-1">{label}</span>
      <span className="text-[10px] font-mono text-t-muted">{count}</span>
    </button>
  )
}

function AssetTile({
  name,
  sub,
  active,
  highlighted,
  onClick,
  variant = 'cyan',
}: {
  name: string
  sub: string
  active: boolean
  highlighted?: boolean
  onClick: () => void
  variant?: 'cyan' | 'orange'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'w-full text-left px-2 py-1.5 rounded border transition-colors',
        active
          ? variant === 'cyan'
            ? 'border-cyan/50 bg-cyan/10'
            : 'border-orange/50 bg-orange/10'
          : highlighted
            ? variant === 'cyan'
              ? 'border-cyan/30 bg-cyan/5 ring-1 ring-cyan/25'
              : 'border-orange/30 bg-orange/5 ring-1 ring-orange/25'
            : 'border-transparent hover:border-border hover:bg-surf2'
      )}
    >
      <p className="text-[11px] text-t-primary truncate">{name}</p>
      <p className="text-[10px] font-mono text-t-muted truncate">{sub}</p>
    </button>
  )
}

function LegendRow({ colour, label }: { colour: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={clsx('w-3 h-3 rounded-sm border border-border', colour)} />
      <span className="text-[10px] font-mono text-t-muted">{label}</span>
    </div>
  )
}

```


---

## 18 — ENTITY INFO PANEL
**Path:** `app/map/components/EntityInfoPanel.tsx`

```typescript
'use client'

import { X } from 'lucide-react'
import { formatCoord, formatHHMM } from '@/lib/map/format'
import type { PlacedUas } from '@/lib/map/types'

interface EntityInfoPanelProps {
  uas: PlacedUas
  screenX: number
  screenY: number
  onClose: () => void
}

export function EntityInfoPanel({
  uas,
  screenX,
  screenY,
  onClose,
}: EntityInfoPanelProps) {
  return (
    <div
      className="absolute z-20 w-64 rounded-lg border border-border bg-surf1/95 backdrop-blur shadow-xl pointer-events-auto"
      style={{ left: screenX + 12, top: screenY - 8 }}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <p className="text-xs font-semibold text-t-primary truncate">{uas.asset.name}</p>
        <button
          type="button"
          onClick={onClose}
          className="text-t-muted hover:text-t-primary"
          aria-label="Close panel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="px-3 py-2 space-y-1.5 text-[10px] font-mono text-t-secondary">
        <div className="flex justify-between">
          <span className="text-t-muted">Position</span>
          <span className="text-cyan">{formatCoord(uas.lon, uas.lat)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-t-muted">Terrain AMSL</span>
          <span>{Math.round(uas.terrainAMSL)} m</span>
        </div>
        <div className="flex justify-between">
          <span className="text-t-muted">Service ceiling (OSINT)</span>
          <span>{uas.asset.max_altitude_agl_m} m AGL</span>
        </div>
        <div className="flex justify-between">
          <span className="text-t-muted">Combat envelope</span>
          <span>{(uas.lateralRadius_m / 1000).toFixed(1)} km</span>
        </div>
        {uas.asset.max_range_km > uas.lateralRadius_m / 1000 + 0.05 && (
          <div className="flex justify-between">
            <span className="text-t-muted">OSINT max range (ferry)</span>
            <span>{uas.asset.max_range_km.toFixed(1)} km</span>
          </div>
        )}
        {uas.effectiveRange_km < uas.lateralRadius_m / 1000 - 0.05 && (
          <div className="flex justify-between">
            <span className="text-t-muted">Wind-adjusted</span>
            <span>{uas.effectiveRange_km.toFixed(1)} km</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-t-muted">Time to perimeter</span>
          <span className="text-orange">{formatHHMM(uas.annotationTime_min)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-t-muted">Endurance</span>
          <span>{formatHHMM(uas.asset.endurance_min)}</span>
        </div>
        {uas.loiter?.exceedsEndurance && (
          <p className="text-orange pt-1">Endurance warning — loiter exceeds fuel/time envelope</p>
        )}
        {!uas.loiter && (
          <p className="text-t-muted pt-1">
            Use Place Loiter in the sidebar to plan time on station.
          </p>
        )}
      </div>
    </div>
  )
}

```


---

## 19 — MAP ICONS
**Path:** `lib/map/icons.ts`

```typescript
export const UAS_SILHOUETTE_SVG = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path fill="%2306B6D4" d="M4 16 L12 12 L16 4 L20 12 L28 16 L20 20 L16 28 L12 20 Z"/><circle cx="16" cy="16" r="3" fill="%23F97316"/></svg>'
)}`

export const SHIELD_SVG = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path fill="%23F97316" d="M16 2 L28 8 V16 C28 23 22 28 16 30 C10 28 4 23 4 16 V8 Z"/></svg>'
)}`

export const PIN_SVG = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32"><path fill="%23F97316" d="M12 0 C5.4 0 0 5.4 0 12 C0 21 12 32 12 32 S24 21 24 12 C24 5.4 18.6 0 12 0 Z"/><circle cx="12" cy="12" r="5" fill="%230A0A0F"/></svg>'
)}`

export function windArrowSvg(rotationDeg: number): string {
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" style="transform:rotate(${rotationDeg}deg)"><path fill="%2306B6D4" d="M20 4 L26 28 L20 24 L14 28 Z"/></svg>`
  )}`
}

```


---

## 20 — WIND DATA HOOK
**Path:** `app/map/hooks/useWindData.ts`

```typescript
'use client'

import { useCallback, useEffect, useState } from 'react'
import { computePlatformRangeEnvelope } from '@/lib/map/range-declaration'
import type { PlacedUas, WindSample } from '@/lib/map/types'

export function useWindData(
  nilWind: boolean,
  placedUas: PlacedUas[],
  setPlacedUas: React.Dispatch<React.SetStateAction<PlacedUas[]>>
) {
  const [windByUas, setWindByUas] = useState<Record<string, WindSample>>({})
  const [loading, setLoading] = useState(false)

  const fetchWindForUas = useCallback(async (uas: PlacedUas) => {
    const res = await fetch('/api/weather', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: uas.lat, lon: uas.lon }),
    })
    if (!res.ok) throw new Error('Weather fetch failed')
    const json = (await res.json()) as { data: WindSample }
    return json.data
  }, [])

  const uasKey = placedUas
    .map((u) => `${u.instanceId}:${u.lon}:${u.lat}`)
    .join('|')

  useEffect(() => {
    if (nilWind) {
      setWindByUas({})
      setPlacedUas((prev) =>
        prev.map((u) => {
          const env = computePlatformRangeEnvelope(u.asset, u.terrainAMSL)
          return {
            ...u,
            effectiveRange_km: env.effectiveRangeKm,
            lateralRadius_m: env.sphereRadiusM,
          }
        })
      )
      return
    }

    if (placedUas.length === 0) {
      setWindByUas({})
      return
    }

    let cancelled = false
    setLoading(true)

    ;(async () => {
      const next: Record<string, WindSample> = {}
      for (const uas of placedUas) {
        try {
          next[uas.instanceId] = await fetchWindForUas(uas)
        } catch {
          next[uas.instanceId] = { windSpeed_kmh: 0, windDir_deg: 0, level: 'fallback' }
        }
      }
      if (cancelled) return

      setWindByUas(next)
      setPlacedUas((prev) =>
        prev.map((u) => {
          const wind = next[u.instanceId]
          if (!wind) return u
          const bearing =
            u.loiter != null
              ? Math.atan2(u.loiter.lat - u.lat, u.loiter.lon - u.lon) *
                  (180 / Math.PI) +
                180
              : 0
          const env = computePlatformRangeEnvelope(u.asset, u.terrainAMSL, {
            wind,
            flightBearingDeg: bearing,
            applyWind: true,
          })
          return {
            ...u,
            effectiveRange_km: env.effectiveRangeKm,
            lateralRadius_m: env.sphereRadiusM,
          }
        })
      )
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [nilWind, uasKey, fetchWindForUas, setPlacedUas, placedUas])

  return { windByUas, loading }
}

```


---

## 21 — WIND MATH
**Path:** `lib/map/wind.ts`

```typescript
import type { MapUasAsset, WindSample } from '@/lib/map/types'

export function effectiveRangeKm(
  asset: MapUasAsset,
  wind: WindSample,
  flightBearingDeg: number
): number {
  const relativeAngleRad =
    ((wind.windDir_deg - flightBearingDeg) * Math.PI) / 180
  const headwindFraction = Math.cos(relativeAngleRad)
  const factor =
    1 - (wind.windSpeed_kmh / Math.max(asset.max_speed_kmh, 1)) * headwindFraction
  return Math.max(0.1, asset.max_range_km * factor)
}

```


---

## 22 — OVERLAP GEOMETRY
**Path:** `lib/map/overlap.ts`

```typescript
import type { OverlapVolume, PlacedCuas, PlacedUas } from '@/lib/map/types'

function distanceM(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function detectOverlapPairs(
  uasList: PlacedUas[],
  cuasList: PlacedCuas[]
): { uas: PlacedUas; cuas: PlacedCuas }[] {
  const pairs: { uas: PlacedUas; cuas: PlacedCuas }[] = []

  for (const uas of uasList) {
    for (const cuas of cuasList) {
      const distHoriz_m = distanceM(uas.lon, uas.lat, cuas.lon, cuas.lat)
      const uasCentreAlt =
        uas.terrainAMSL + uas.asset.max_altitude_agl_m / 2
      const cuasCentreAlt = cuas.terrainAMSL + cuas.asset.defeat_range_m
      const distVert_m = Math.abs(uasCentreAlt - cuasCentreAlt)
      const dist3d_m = Math.hypot(distHoriz_m, distVert_m)
      const touchRadius = uas.lateralRadius_m + cuas.asset.defeat_range_m
      if (dist3d_m < touchRadius) {
        pairs.push({ uas, cuas })
      }
    }
  }

  return pairs
}

export function buildOverlapVolume(
  uas: PlacedUas,
  cuas: PlacedCuas,
  effectiveness_pct: number,
  is_immune: boolean
): OverlapVolume {
  const dist_m = distanceM(uas.lon, uas.lat, cuas.lon, cuas.lat)
  const radius_m = Math.max(
    50,
    (uas.lateralRadius_m + cuas.asset.defeat_range_m - dist_m) / 2
  )
  const isDefeat = is_immune || effectiveness_pct >= 50
  const pct = is_immune ? 100 : effectiveness_pct

  return {
    id: `overlap-${uas.instanceId}-${cuas.instanceId}`,
    uasInstanceId: uas.instanceId,
    cuasInstanceId: cuas.instanceId,
    lon: (uas.lon + cuas.lon) / 2,
    lat: (uas.lat + cuas.lat) / 2,
    alt_m: (uas.terrainAMSL + cuas.terrainAMSL) / 2 + radius_m / 2,
    radius_m,
    effectiveness_pct: pct,
    isDefeat,
    label: isDefeat
      ? `DEFEAT ZONE — ${pct}% Pk`
      : `SURVIVABLE — ${pct}% Pk`,
  }
}

```


---

## 23 — DEFEAT OVERLAP HOOK
**Path:** `app/map/hooks/useDefeatOverlap.ts`

```typescript
'use client'

import { useEffect, useRef, useState } from 'react'
import { buildOverlapVolume, detectOverlapPairs } from '@/lib/map/overlap'
import type { OverlapVolume, PlacedCuas, PlacedUas } from '@/lib/map/types'

interface DefeatCheckResult {
  effectiveness_pct: number
  is_immune: boolean
  kind: string
}

export function useDefeatOverlap(placedUas: PlacedUas[], placedCuas: PlacedCuas[]) {
  const [overlaps, setOverlaps] = useState<OverlapVolume[]>([])
  const runRef = useRef(0)

  useEffect(() => {
    if (placedUas.length === 0 || placedCuas.length === 0) {
      setOverlaps([])
      return
    }

    const pairs = detectOverlapPairs(placedUas, placedCuas)
    if (pairs.length === 0) {
      setOverlaps([])
      return
    }

    const runId = ++runRef.current

    ;(async () => {
      const volumes: OverlapVolume[] = []

      await Promise.all(
        pairs.map(async ({ uas, cuas }) => {
          try {
            const res = await fetch(
              `/api/defeat-check?uas_id=${encodeURIComponent(uas.asset.id)}&cuas_id=${encodeURIComponent(cuas.asset.id)}`
            )
            if (!res.ok) return
            const json = (await res.json()) as { data: DefeatCheckResult }
            volumes.push(
              buildOverlapVolume(
                uas,
                cuas,
                json.data.effectiveness_pct ?? 50,
                json.data.is_immune
              )
            )
          } catch {
            volumes.push(buildOverlapVolume(uas, cuas, 50, false))
          }
        })
      )

      if (runId !== runRef.current) return
      setOverlaps(volumes)
    })()
  }, [placedUas, placedCuas])

  return overlaps
}

```


---

## 24 — TERRAIN MASKING HOOK
**Path:** `app/map/hooks/useTerrainMasking.ts`

```typescript
'use client'

import { useEffect, useRef, useState } from 'react'
import { computeTerrainMasking } from '@/lib/map/terrain-masking'
import type { CesiumContext } from '@/app/map/hooks/usePlatformPlacement'
import type { MaskingPolygon } from '@/lib/map/cesium-sync'
import type { PlacedCuas } from '@/lib/map/types'

export function useTerrainMasking(
  placedCuas: PlacedCuas[],
  getCesium: () => CesiumContext | null,
  setPlacedCuas: React.Dispatch<React.SetStateAction<PlacedCuas[]>>
) {
  const [maskingPolygons, setMaskingPolygons] = useState<MaskingPolygon[]>([])
  const runningRef = useRef(0)

  const cuasKey = placedCuas
    .map((c) => `${c.instanceId}:${c.lon}:${c.lat}:${c.asset.defeat_range_m}`)
    .join('|')

  useEffect(() => {
    if (placedCuas.length === 0) {
      setMaskingPolygons([])
      return
    }

    const ctx = getCesium()
    if (!ctx) return

    const runId = ++runningRef.current

    ;(async () => {
      const results: MaskingPolygon[] = []
      const updates: { id: string; hasMasking: boolean }[] = []

      for (const cuas of placedCuas) {
        const { polygon, hasMasking } = await computeTerrainMasking(
          ctx.Cesium,
          ctx.terrainProvider,
          cuas.lon,
          cuas.lat,
          cuas.terrainAMSL,
          cuas.asset.defeat_range_m
        )
        results.push({
          cuasInstanceId: cuas.instanceId,
          positions: polygon,
          hasMasking,
        })
        updates.push({ id: cuas.instanceId, hasMasking })
      }

      if (runId !== runningRef.current) return

      setMaskingPolygons(results)
      setPlacedCuas((prev) =>
        prev.map((c) => {
          const u = updates.find((x) => x.id === c.instanceId)
          if (!u || u.hasMasking === c.hasTerrainMasking) return c
          return { ...c, hasTerrainMasking: u.hasMasking }
        })
      )
    })()
  }, [cuasKey, getCesium, setPlacedCuas, placedCuas])

  return maskingPolygons
}

```
