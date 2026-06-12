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
    /** Cesium ShadowMode — defeat spheres receive terrain sun shadows. */
    shadows?: number
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
    ...(style.shadows !== undefined ? { shadows: style.shadows } : {}),
  })
}

/** Build a horizontal ring polyline at fixed MSL (reliable fallback for combat discs). */
function discRingPositions(
  Cesium: CesiumModule,
  lon: number,
  lat: number,
  discAltitudeMSL: number,
  radius_m: number,
  segments = 64,
) {
  const coords: number[] = []
  const cosLat = Math.cos((lat * Math.PI) / 180)
  const mPerDegLon = 111320 * Math.max(cosLat, 0.01)
  const mPerDegLat = 110540
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * 2 * Math.PI
    const dx = (radius_m * Math.cos(angle)) / mPerDegLon
    const dy = (radius_m * Math.sin(angle)) / mPerDegLat
    coords.push(lon + dx, lat + dy, discAltitudeMSL)
  }
  return Cesium.Cartesian3.fromDegreesArrayHeights(coords)
}

/**
 * Horizontal combat envelope disc at explicit MSL altitude.
 * Cesium EllipseGraphics expects altitude on ellipse.height, NOT entity.position.z
 * (height: 0 + elevated position = invisible disc at ground level).
 */
function syncRangeDisc(
  Cesium: CesiumModule,
  viewer: CesiumViewer,
  keep: Set<string>,
  instanceId: string,
  lon: number,
  lat: number,
  discAltitudeMSL: number,
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
  const safeAlt = Number.isFinite(discAltitudeMSL) ? discAltitudeMSL : 0
  const safeRadius = Math.max(100, radius_m)

  const fillId = `map-uas-disc-${instanceId}${suffix}`
  const ringId = `map-uas-disc-ring-${instanceId}${suffix}`
  keep.add(fillId)
  keep.add(ringId)

  const fillColor = colour(Cesium, style.fillHex ?? CYAN, style.fillAlpha)
  const outlineColor = colour(Cesium, style.outlineHex, style.outlineAlpha)

  const fillEntity = ensureEntity(viewer, fillId, () => new Cesium.Entity({ id: fillId }))
  fillEntity.position = new Cesium.ConstantPositionProperty(
    Cesium.Cartesian3.fromDegrees(lon, lat),
  )
  fillEntity.billboard = undefined
  fillEntity.label = undefined
  fillEntity.polygon = undefined
  fillEntity.polyline = undefined
  fillEntity.ellipsoid = undefined
  fillEntity.ellipse = new Cesium.EllipseGraphics({
    semiMajorAxis: safeRadius,
    semiMinorAxis: safeRadius,
    height: safeAlt,
    heightReference: Cesium.HeightReference.NONE,
    fill: true,
    material: fillColor,
    outline: false,
  })

  const ringEntity = ensureEntity(viewer, ringId, () => new Cesium.Entity({ id: ringId }))
  ringEntity.position = undefined
  ringEntity.billboard = undefined
  ringEntity.label = undefined
  ringEntity.polygon = undefined
  ringEntity.ellipse = undefined
  ringEntity.ellipsoid = undefined
  ringEntity.polyline = new Cesium.PolylineGraphics({
    positions: discRingPositions(Cesium, lon, lat, safeAlt, safeRadius),
    width: style.outlineWidth ?? 3,
    material: outlineColor,
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

    const discAlt = Number.isFinite(uas.discAltitude_m)
      ? uas.discAltitude_m
      : uas.terrainAMSL + uas.asset.max_altitude_agl_m

    syncRangeDisc(
      Cesium,
      viewer,
      keep,
      uas.instanceId,
      uas.lon,
      uas.lat,
      discAlt,
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
      syncRangeDisc(
        Cesium,
        viewer,
        keep,
        uas.instanceId,
        uas.lon,
        uas.lat,
        discAlt,
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
        shadows: Cesium.ShadowMode.RECEIVE_ONLY,
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
    // NOTE: PolygonGraphics height + heightReference:CLAMP_TO_GROUND is a Cesium render
    // conflict (ground-primitive path vs elevated-polygon path — nothing draws).
    // Use height only (no heightReference) so Cesium takes the elevated-polygon path.
    entity.polygon = new Cesium.PolygonGraphics({
      hierarchy: new Cesium.PolygonHierarchy(hierarchy),
      material: colour(Cesium, '#64748B', 0.42),
      outline: true,
      outlineColor: colour(Cesium, '#94A3B8', 0.75),
      height: TERRAIN_SURFACE_AGL_M,
      perPositionHeight: false,
      shadows: Cesium.ShadowMode.RECEIVE_ONLY,
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
