import type { CesiumModule, CesiumViewer } from '@/lib/map/cesium-types'
import {
  ENVELOPE_WALL_SEGMENTS,
  envelopePerimeterPoints,
  uniformWallTerrain,
} from '@/lib/map/envelope-geometry'
import { formatHHMM } from '@/lib/map/format'
import { missionSegmentChunkEntityId, missionSegmentPickEntityId, missionWaypointEntityId } from '@/lib/map/mission-path-planner'
import { pathMetricColorHex, subdivideSegmentForDisplay } from '@/lib/map/mission-path-scoring'
import { MAX_MAP_UAS_DISC_KM } from '@/lib/map/spectra-assets'
import { TERRAIN_SURFACE_AGL_M, placementNeedsTerrainRefresh } from '@/lib/map/terrain'
import { PIN_SVG, SHIELD_SVG, UAS_SILHOUETTE_SVG, windArrowSvg } from '@/lib/map/icons'
import { app6Sidc, app6Label } from '@/lib/map/app6-symbols'
import {
  domeHeightAtDistanceM,
  offsetBearingM,
  TERRAIN_MASK_STEP_M,
  type MaskingRayResult,
  type TerrainShadowFootprint,
} from '@/lib/map/terrain-masking'
import { formatEffectorDisplayName, formatRadarDisplayName } from '@/lib/map/catalog-display-name'
import type { SelectedLaydownItem } from '@/lib/map/laydown-evaluation'
import { isSameLaydownItem } from '@/lib/map/laydown-evaluation'
import { haversineM } from '@/lib/propagation/geo'
import type {
  OverlapVolume,
  PlacedCuas,
  PlacedEffector,
  PlacedRadar,
  PlacedUas,
  WindSample,
} from '@/lib/map/types'

const CYAN = '#06B6D4'
const ORANGE = '#F97316'
const RED = '#EF4444'
const GREEN = '#22C55E'
const BLUE_FORCE = '#3B82F6'

export interface MaskingPolygon {
  cuasInstanceId: string
  hasMasking: boolean
  lon: number
  lat: number
  emitterAltM: number
  maxRange_m: number
  rays: MaskingRayResult[]
  /** Terrain footprint quads — occluded ground behind ridges (MathWorks-style coverage map). */
  footprintCells: TerrainShadowFootprint[]
}

export interface CesiumSyncState {
  placedUas: PlacedUas[]
  placedCuas: PlacedCuas[]
  placedRadars: PlacedRadar[]
  placedEffectors: PlacedEffector[]
  selectedLaydownItem?: SelectedLaydownItem | null
  overlaps: OverlapVolume[]
  maskingPolygons: MaskingPolygon[]
  windByUas: Record<string, WindSample>
  nilWind: boolean
  flightPathEditActive?: boolean
}


function isSelectedEntity(
  state: CesiumSyncState,
  kind: SelectedLaydownItem['kind'],
  instanceId: string,
): boolean {
  return isSameLaydownItem(state.selectedLaydownItem ?? null, { kind, instanceId })
}

function billboardScale(base: number, selected: boolean): number {
  return selected ? base * 1.35 : base
}

function colour(Cesium: CesiumModule, hex: string, alpha: number) {
  return Cesium.Color.fromCssColorString(hex).withAlpha(alpha)
}

function readNumericProperty(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (value && typeof (value as { getValue?: () => number }).getValue === 'function') {
    const n = (value as { getValue: () => number }).getValue()
    return Number.isFinite(n) ? n : undefined
  }
  return undefined
}

function readStringProperty(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (value && typeof (value as { getValue?: () => string }).getValue === 'function') {
    const s = (value as { getValue: () => string }).getValue()
    return typeof s === 'string' ? s : undefined
  }
  return undefined
}

function readPositionDegrees(
  Cesium: CesiumModule,
  position: unknown,
): { lon: number; lat: number; alt: number } | undefined {
  if (!position) return undefined
  const getValue = (position as { getValue?: (time?: unknown) => unknown }).getValue
  if (typeof getValue !== 'function') return undefined
  const cartesian = getValue.call(position) as { x: number; y: number; z: number } | undefined
  if (!cartesian) return undefined
  const cartographic = Cesium.Cartographic.fromCartesian(cartesian)
  return {
    lon: Cesium.Math.toDegrees(cartographic.longitude),
    lat: Cesium.Math.toDegrees(cartographic.latitude),
    alt: cartographic.height,
  }
}

function positionUnchanged(
  Cesium: CesiumModule,
  existing: unknown,
  lon: number,
  lat: number,
  alt: number,
  epsilon = 1e-6,
): boolean {
  const current = readPositionDegrees(Cesium, existing)
  if (!current) return false
  return (
    Math.abs(current.lon - lon) < epsilon &&
    Math.abs(current.lat - lat) < epsilon &&
    Math.abs(current.alt - alt) < epsilon
  )
}

interface RgbaComponents {
  red: number
  green: number
  blue: number
  alpha: number
}

function readRgba(value: unknown): RgbaComponents | undefined {
  if (!value) return undefined
  if (typeof (value as RgbaComponents).red === 'number') {
    const c = value as RgbaComponents
    return { red: c.red, green: c.green, blue: c.blue, alpha: c.alpha }
  }
  const getValue = (value as { getValue?: () => unknown }).getValue
  if (typeof getValue === 'function') {
    return readRgba(getValue.call(value))
  }
  return undefined
}

function colorsEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  const ca = readRgba(a)
  const cb = readRgba(b)
  if (!ca || !cb) return false
  return (
    Math.abs(ca.red - cb.red) < 1e-6 &&
    Math.abs(ca.green - cb.green) < 1e-6 &&
    Math.abs(ca.blue - cb.blue) < 1e-6 &&
    Math.abs(ca.alpha - cb.alpha) < 1e-6
  )
}

function arraysNearEqual(a: number[], b: number[], epsilon = 0.5): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i] - b[i]) >= epsilon) return false
  }
  return true
}

function wallGraphicsUnchanged(
  Cesium: CesiumModule,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  existing: any,
  closedDeg: number[],
  closedMin: number[],
  closedMax: number[],
  sideColor: unknown,
  outlineColor: unknown,
): boolean {
  if (!existing) return false
  const minH = existing.minimumHeights?.getValue?.() ?? existing.minimumHeights
  const maxH = existing.maximumHeights?.getValue?.() ?? existing.maximumHeights
  if (!Array.isArray(minH) || !Array.isArray(maxH)) return false
  const pos = existing.positions?.getValue?.()
  if (!pos?.length) return false
  const first = Cesium.Cartographic.fromCartesian(pos[0])
  const lon0 = Cesium.Math.toDegrees(first.longitude)
  const lat0 = Cesium.Math.toDegrees(first.latitude)
  if (Math.abs(lon0 - closedDeg[0]) > 1e-5 || Math.abs(lat0 - closedDeg[1]) > 1e-5) return false
  return (
    arraysNearEqual(minH, closedMin) &&
    arraysNearEqual(maxH, closedMax) &&
    colorsEqual(existing.material, sideColor) &&
    colorsEqual(existing.outlineColor, outlineColor)
  )
}

function ellipsoidGraphicsUnchanged(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  existing: any,
  radius_m: number,
  material: unknown,
  outlineColor: unknown,
): boolean {
  if (!existing) return false
  const radii = existing.radii?.getValue?.() ?? existing.radii
  if (!radii || Math.abs(radii.x - radius_m) > 0.5) return false
  return colorsEqual(existing.material, material) && colorsEqual(existing.outlineColor, outlineColor)
}


function ellipseGraphicsUnchanged(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  existing: any,
  semiMajorAxis: number,
  semiMinorAxis: number,
  height: number,
  material: unknown,
): boolean {
  if (!existing) return false
  return (
    readNumericProperty(existing.semiMajorAxis) === semiMajorAxis &&
    readNumericProperty(existing.semiMinorAxis) === semiMinorAxis &&
    readNumericProperty(existing.height) === height &&
    colorsEqual(existing.material, material)
  )
}

function billboardGraphicsUnchanged(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  existing: any,
  image: string,
  scale: number,
  heightReference: number,
): boolean {
  if (!existing) return false
  const hr =
    typeof existing.heightReference?.getValue === 'function'
      ? existing.heightReference.getValue()
      : existing.heightReference
  return (
    readStringProperty(existing.image) === image &&
    readNumericProperty(existing.scale) === scale &&
    hr === heightReference
  )
}

function pointGraphicsUnchanged(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  existing: any,
  pixelSize: number,
  color: unknown,
): boolean {
  if (!existing) return false
  return (
    readNumericProperty(existing.pixelSize) === pixelSize &&
    colorsEqual(existing.color, color)
  )
}

function readPolylinePositions(
  Cesium: CesiumModule,
  value: unknown,
): Array<{ lon: number; lat: number; alt: number }> | undefined {
  if (!value) return undefined
  const getValue = (value as { getValue?: () => unknown }).getValue
  const positions = typeof getValue === 'function' ? getValue.call(value) : value
  if (!Array.isArray(positions)) return undefined
  return positions.map((cartesian: { x: number; y: number; z: number }) => {
    const c = Cesium.Cartographic.fromCartesian(cartesian)
    return {
      lon: Cesium.Math.toDegrees(c.longitude),
      lat: Cesium.Math.toDegrees(c.latitude),
      alt: c.height,
    }
  })
}

function polylinePositionsEqual(
  a: Array<{ lon: number; lat: number; alt: number }>,
  b: Array<{ lon: number; lat: number; alt: number }>,
  epsilon = 1e-6,
): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (
      Math.abs(a[i].lon - b[i].lon) >= epsilon ||
      Math.abs(a[i].lat - b[i].lat) >= epsilon ||
      Math.abs(a[i].alt - b[i].alt) >= epsilon
    ) {
      return false
    }
  }
  return true
}

function polylineGraphicsUnchanged(
  Cesium: CesiumModule,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  existing: any,
  positions: Array<{ lon: number; lat: number; alt: number }>,
  width: number,
  material: unknown,
  pickWidth?: number,
): boolean {
  if (!existing) return false
  const existingPositions = readPolylinePositions(Cesium, existing.positions)
  if (!existingPositions || !polylinePositionsEqual(existingPositions, positions)) return false
  const existingPickWidth =
    readNumericProperty(existing.pickWidth) ?? readNumericProperty(existing.width)
  const nextPickWidth = pickWidth ?? width
  return (
    readNumericProperty(existing.width) === width &&
    existingPickWidth === nextPickWidth &&
    colorsEqual(existing.material, material)
  )
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

/**
 * Sphere epicenter (centroid) on sampled terrain — instructor click point.
 * Tiny offset avoids z-fighting with the globe mesh.
 */
export function sphereEpicenterOnTerrainM(terrainAMSL: number): number {
  return terrainAMSL + TERRAIN_SURFACE_AGL_M
}

/** Top of the visible dome when the sphere centroid is on terrain. */
export function sphereDomeTopM(terrainAMSL: number, radiusM: number): number {
  return sphereEpicenterOnTerrainM(terrainAMSL) + radiusM
}

/** @deprecated Ground-tangent — lifts centroid by full radius; use sphereEpicenterOnTerrainM. */
export function defeatSphereCentreM(terrainAMSL: number, radiusM: number): number {
  return terrainAMSL + radiusM
}

/**
 * Range envelope sphere — EllipsoidGraphics centred on the placement point.
 *
 * WHY EllipsoidGraphics (not PolygonGraphics/PolylineGraphics ground primitives):
 *   - PolygonGraphics height + heightReference: CLAMP_TO_GROUND creates a render
 *     conflict — ground-primitive path vs elevated-polygon path — nothing draws.
 *   - PolylineGraphics clampToGround fails with ColorMaterialProperty material type.
 *
 * Epicenter on terrain; upper hemisphere only (minimumCone/maximumCone). No vertical walls —
 * those belong on UAS combat discs (syncRangeDisc). depthTestAgainstTerrain = false keeps
 * the dome visible over terrain tiles.
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

  // Defer rendering until terrain tiles have loaded — prevents centering at sea-level (0 m fallback).
  if (placementNeedsTerrainRefresh(terrainAMSL)) return

  const fillColor = colour(Cesium, style.fillHex ?? CYAN, style.fillAlpha)
  const outlineColor = colour(Cesium, style.outlineHex, style.outlineAlpha)
  const centreAltM = sphereEpicenterOnTerrainM(terrainAMSL)

  const entity = ensureEntity(viewer, id, () => new Cesium.Entity({ id }))
  if (!positionUnchanged(Cesium, entity.position, lon, lat, centreAltM)) {
    entity.position = new Cesium.ConstantPositionProperty(
      Cesium.Cartesian3.fromDegrees(lon, lat, centreAltM),
    )
  }
  entity.billboard = undefined
  entity.label = undefined
  entity.polygon = undefined
  entity.polyline = undefined
  entity.ellipse = undefined
  entity.wall = undefined
  // Upper hemisphere only (local +Z) — epicenter on terrain; no submerged half, no vertical walls.
  if (!ellipsoidGraphicsUnchanged(entity.ellipsoid, radius_m, fillColor, outlineColor)) {
    entity.ellipsoid = new Cesium.EllipsoidGraphics({
      radii: new Cesium.Cartesian3(radius_m, radius_m, radius_m),
      minimumCone: 0,
      maximumCone: Cesium.Math.PI_OVER_TWO,
      material: fillColor,
      outline: true,
      outlineColor,
      outlineWidth: style.outlineWidth ?? 2,
      slicePartitions: 32,
      stackPartitions: 16,
      ...(style.shadows !== undefined ? { shadows: style.shadows } : {}),
    })
  }
}

const SHIELD_GREY = '#64748B'

/**
 * 3D terrain shield on the defeat hemisphere — occluded sectors + ridge skyline.
 * MEA viewshed rays mark where terrain blocks LOS to low-altitude drones (30 m AGL).
 */
function syncTerrainDomeShield(
  Cesium: CesiumModule,
  viewer: CesiumViewer,
  keep: Set<string>,
  cuasInstanceId: string,
  lon: number,
  lat: number,
  emitterAltM: number,
  maxRange_m: number,
  rays: MaskingRayResult[],
) {
  if (rays.length < 2) return

  const marginM = TERRAIN_MASK_STEP_M
  const shieldFill = colour(Cesium, SHIELD_GREY, 0.52)
  const shieldOutline = colour(Cesium, '#94A3B8', 0.75)
  const r = maxRange_m

  for (let i = 0; i < rays.length; i++) {
    const j = (i + 1) % rays.length
    const ray_i = rays[i]
    const ray_j = rays[j]
    const d_i = ray_i.visibleDistance_m
    const d_j = ray_j.visibleDistance_m

    if (d_i >= maxRange_m - marginM && d_j >= maxRange_m - marginM) continue

    const facetId = `map-shield-facet-${cuasInstanceId}-${i}`
    keep.add(facetId)

    const inner_i = offsetBearingM(lon, lat, ray_i.angleDeg, d_i)
    const inner_j = offsetBearingM(lon, lat, ray_j.angleDeg, d_j)
    const outer_j = offsetBearingM(lon, lat, ray_j.angleDeg, maxRange_m)
    const outer_i = offsetBearingM(lon, lat, ray_i.angleDeg, maxRange_m)

    const facetHeights = [
      domeHeightAtDistanceM(emitterAltM, r, d_i),
      domeHeightAtDistanceM(emitterAltM, r, d_j),
      domeHeightAtDistanceM(emitterAltM, r, maxRange_m),
      domeHeightAtDistanceM(emitterAltM, r, maxRange_m),
    ]

    const facetEntity = ensureEntity(viewer, facetId, () =>
      new Cesium.Entity({ id: facetId }),
    )
    facetEntity.position = undefined
    facetEntity.polygon = new Cesium.PolygonGraphics({
      hierarchy: new Cesium.PolygonHierarchy(
        Cesium.Cartesian3.fromDegreesArrayHeights([
          inner_i.lon,
          inner_i.lat,
          facetHeights[0],
          inner_j.lon,
          inner_j.lat,
          facetHeights[1],
          outer_j.lon,
          outer_j.lat,
          facetHeights[2],
          outer_i.lon,
          outer_i.lat,
          facetHeights[3],
        ]),
      ),
      perPositionHeight: true,
      material: shieldFill,
      outline: true,
      outlineColor: shieldOutline,
    })

    const horizonId = `map-shield-horizon-${cuasInstanceId}-${i}`
    keep.add(horizonId)
    const ground_i = surfaceAltM(ray_i.boundaryTerrainAMSL)
    const ground_j = surfaceAltM(ray_j.boundaryTerrainAMSL)
    const horizonEntity = ensureEntity(viewer, horizonId, () =>
      new Cesium.Entity({ id: horizonId }),
    )
    horizonEntity.position = undefined
    horizonEntity.wall = new Cesium.WallGraphics({
      positions: Cesium.Cartesian3.fromDegreesArray([
        ray_i.boundaryLon,
        ray_i.boundaryLat,
        ray_j.boundaryLon,
        ray_j.boundaryLat,
      ]),
      minimumHeights: [ground_i, ground_j],
      maximumHeights: [facetHeights[0], facetHeights[1]],
      material: colour(Cesium, SHIELD_GREY, 0.65),
      outline: true,
      outlineColor: shieldOutline,
    })
  }

  const skylineCoords: number[] = []
  for (const ray of rays) {
    if (ray.visibleDistance_m >= maxRange_m - marginM) continue
    const h = domeHeightAtDistanceM(emitterAltM, r, ray.visibleDistance_m)
    skylineCoords.push(ray.boundaryLon, ray.boundaryLat, h)
  }
  if (skylineCoords.length >= 9) {
    const skylineId = `map-shield-skyline-${cuasInstanceId}`
    keep.add(skylineId)
    const skylineEntity = ensureEntity(viewer, skylineId, () =>
      new Cesium.Entity({ id: skylineId }),
    )
    skylineEntity.position = undefined
    skylineEntity.polyline = new Cesium.PolylineGraphics({
      positions: Cesium.Cartesian3.fromDegreesArrayHeights(skylineCoords),
      width: 2,
      material: shieldOutline,
    })
  }
}

function surfaceAltM(terrainAMSL: number): number {
  return terrainAMSL + TERRAIN_SURFACE_AGL_M
}

/** Vertical curtain from terrain-following base to fixed combat altitude. */
function syncTerrainEnvelopeWall(
  Cesium: CesiumModule,
  viewer: CesiumViewer,
  keep: Set<string>,
  wallId: string,
  lon: number,
  lat: number,
  radius_m: number,
  topAlt_m: number,
  wallTerrain_m: number[] | undefined,
  terrainAMSL: number,
  style: {
    fillHex?: string
    fillAlpha: number
    outlineHex: string
    outlineAlpha: number
  },
) {
  keep.add(wallId)

  const segments = ENVELOPE_WALL_SEGMENTS
  const perimeter = envelopePerimeterPoints(lon, lat, radius_m, segments)
  const minHeights =
    wallTerrain_m?.length === segments
      ? wallTerrain_m
      : uniformWallTerrain(segments, terrainAMSL)

  const maxHeights = Array.from({ length: segments }, () => topAlt_m)
  const closedMin = [...minHeights, minHeights[0]]
  const closedMax = [...maxHeights, maxHeights[0]]
  const closedDeg: number[] = []
  for (const p of perimeter) closedDeg.push(p.lon, p.lat)
  closedDeg.push(perimeter[0].lon, perimeter[0].lat)

  const sideColor = colour(Cesium, style.fillHex ?? CYAN, style.fillAlpha)
  const outlineColor = colour(Cesium, style.outlineHex, style.outlineAlpha)

  const entity = ensureEntity(viewer, wallId, () => new Cesium.Entity({ id: wallId }))
  entity.position = undefined
  entity.billboard = undefined
  entity.label = undefined
  entity.polygon = undefined
  entity.polyline = undefined
  entity.ellipse = undefined
  entity.ellipsoid = undefined
  if (
    !wallGraphicsUnchanged(
      Cesium,
      entity.wall,
      closedDeg,
      closedMin,
      closedMax,
      sideColor,
      outlineColor,
    )
  ) {
    entity.wall = new Cesium.WallGraphics({
      positions: Cesium.Cartesian3.fromDegreesArray(closedDeg),
      minimumHeights: closedMin,
      maximumHeights: closedMax,
      material: sideColor,
      outline: true,
      outlineColor,
    })
  }
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
  terrainAMSL: number,
  wallTerrain_m: number[] | undefined,
  suffix: string,
  style: {
    fillHex?: string
    fillAlpha: number
    sideAlpha?: number
    outlineHex: string
    outlineAlpha: number
    outlineWidth?: number
  },
) {
  const safeAlt = Number.isFinite(discAltitudeMSL) ? discAltitudeMSL : 0
  const safeRadius = Math.max(100, radius_m)
  const maxDisc_m = MAX_MAP_UAS_DISC_KM * 1000
  const displayRadius_m = Math.min(safeRadius, maxDisc_m)
  const skipWall = safeRadius > maxDisc_m

  const fillId = `map-uas-disc-${instanceId}${suffix}`
  const ringId = `map-uas-disc-ring-${instanceId}${suffix}`
  const wallId = `map-uas-disc-wall-${instanceId}${suffix}`
  keep.add(fillId)
  keep.add(ringId)

  const fillColor = colour(Cesium, style.fillHex ?? CYAN, style.fillAlpha)
  const outlineColor = colour(Cesium, style.outlineHex, style.outlineAlpha)
  const sideAlpha = style.sideAlpha ?? Math.min(0.45, style.fillAlpha + 0.12)

  if (!skipWall) {
    syncTerrainEnvelopeWall(
      Cesium,
      viewer,
      keep,
      wallId,
      lon,
      lat,
      displayRadius_m,
      safeAlt,
      suffix === '' ? wallTerrain_m : undefined,
      terrainAMSL,
      {
        fillHex: style.fillHex,
        fillAlpha: sideAlpha,
        outlineHex: style.outlineHex,
        outlineAlpha: style.outlineAlpha,
      },
    )
  } else {
    const staleWall = viewer.entities.getById(wallId)
    if (staleWall) viewer.entities.remove(staleWall)
  }

  const fillEntity = ensureEntity(viewer, fillId, () => new Cesium.Entity({ id: fillId }))
  if (!positionUnchanged(Cesium, fillEntity.position, lon, lat, 0)) {
    fillEntity.position = new Cesium.ConstantPositionProperty(
      Cesium.Cartesian3.fromDegrees(lon, lat, 0),
    )
  }
  fillEntity.billboard = undefined
  fillEntity.label = undefined
  fillEntity.polygon = undefined
  fillEntity.polyline = undefined
  fillEntity.ellipsoid = undefined
  fillEntity.wall = undefined
  if (
    !ellipseGraphicsUnchanged(
      fillEntity.ellipse,
      displayRadius_m,
      displayRadius_m,
      safeAlt,
      fillColor,
    )
  ) {
    fillEntity.ellipse = new Cesium.EllipseGraphics({
      semiMajorAxis: displayRadius_m,
      semiMinorAxis: displayRadius_m,
      height: safeAlt,
      heightReference: Cesium.HeightReference.NONE,
      fill: true,
      material: fillColor,
      outline: false,
    })
  }

  const ringEntity = ensureEntity(viewer, ringId, () => new Cesium.Entity({ id: ringId }))
  ringEntity.position = undefined
  ringEntity.billboard = undefined
  ringEntity.label = undefined
  ringEntity.polygon = undefined
  ringEntity.ellipse = undefined
  ringEntity.ellipsoid = undefined
  ringEntity.wall = undefined
  const ringPositions = discRingPositions(Cesium, lon, lat, safeAlt, displayRadius_m)
  const existingRing = ringEntity.polyline?.positions?.getValue?.()
  const ringChanged =
    !existingRing ||
    existingRing.length !== ringPositions.length ||
    existingRing.some(
      (p: { x: number; y: number; z: number }, i: number) =>
        Math.abs(p.x - ringPositions[i].x) > 0.5 ||
        Math.abs(p.y - ringPositions[i].y) > 0.5 ||
        Math.abs(p.z - ringPositions[i].z) > 0.5,
    )
  if (ringChanged) {
    ringEntity.polyline = new Cesium.PolylineGraphics({
      positions: ringPositions,
      width: style.outlineWidth ?? 3,
      material: outlineColor,
    })
  }
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
      uas.terrainAMSL,
      uas.wallTerrain_m,
      '',
      { fillAlpha: 0.22, sideAlpha: 0.38, outlineHex: ORANGE, outlineAlpha: 0.9, outlineWidth: 4 },
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
        uas.terrainAMSL,
        undefined,
        '-spec',
        { fillAlpha: 0.06, sideAlpha: 0.14, outlineHex: CYAN, outlineAlpha: 0.45, outlineWidth: 2 },
      )
    }

    const entity = ensureEntity(viewer, id, () =>
      new Cesium.Entity({ id, name: uas.asset.name })
    )

    const startAlt = uas.mission?.waypoints[0]?.alt_m ?? uas.terrainAMSL + TERRAIN_SURFACE_AGL_M
    const hasMissionPath = Boolean(uas.mission && uas.mission.waypoints.length >= 2)
    const heightRef = hasMissionPath
      ? Cesium.HeightReference.NONE
      : Cesium.HeightReference.CLAMP_TO_GROUND
    const bbScale = billboardScale(1.2, isSelectedEntity(state, 'uas', uas.instanceId))

    const targetAlt = hasMissionPath ? startAlt : 0
    if (!positionUnchanged(Cesium, entity.position, uas.lon, uas.lat, targetAlt)) {
      entity.position = new Cesium.ConstantPositionProperty(
        Cesium.Cartesian3.fromDegrees(uas.lon, uas.lat, targetAlt),
      )
    }
    entity.cylinder = undefined
    entity.ellipsoid = undefined
    entity.polyline = undefined
    if (
      !billboardGraphicsUnchanged(
        entity.billboard,
        UAS_SILHOUETTE_SVG,
        bbScale,
        heightRef,
      )
    ) {
      entity.billboard = new Cesium.BillboardGraphics({
        image: UAS_SILHOUETTE_SVG,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        heightReference: heightRef,
        scale: bbScale,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      })
    }

    const labelText =
      app6Label(uas.asset.name, app6Sidc('uas', uas.asset.side === 'blue' ? 'friendly' : 'hostile')) +
      '\n' +
      `${uas.asset.name}\n${rangeLabel} · ${formatHHMM(uas.annotationTime_min)}`
    const existingLabelText = entity.label?.text?.getValue?.() ?? entity.label?.text
    if (existingLabelText !== labelText || entity.label?.heightReference?.getValue?.() !== heightRef) {
      entity.label = new Cesium.LabelGraphics({
        text: labelText,
        font: '12px JetBrains Mono',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -36),
        heightReference: heightRef,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      })
    }

    if (uas.loiter) {
      syncLoiterGraphics(Cesium, viewer, uas, keep)
    }

    if (uas.mission) {
      syncMissionPathGraphics(Cesium, viewer, uas, state, keep)
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

    const cuasEpicenterM = sphereEpicenterOnTerrainM(cuas.terrainAMSL)

    const entity = ensureEntity(viewer, id, () =>
      new Cesium.Entity({ id, name: cuas.asset.name })
    )
    entity.position = new Cesium.ConstantPositionProperty(
      Cesium.Cartesian3.fromDegrees(cuas.lon, cuas.lat, cuasEpicenterM),
    )
    entity.ellipsoid = undefined
    entity.polygon = undefined
    entity.billboard = new Cesium.BillboardGraphics({
      image: SHIELD_SVG,
      verticalOrigin: Cesium.VerticalOrigin.CENTER,
      heightReference: Cesium.HeightReference.NONE,
      scale: billboardScale(1.1, isSelectedEntity(state, 'cuas', cuas.instanceId)),
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


  for (const radar of state.placedRadars) {
    const id = `map-radar-mark-${radar.instanceId}`
    keep.add(id)
    const radius_m = radar.asset.dome_range_km * 1000
    const isBlue = radar.asset.side === 'blue'
    const outlineHex = isBlue ? BLUE_FORCE : RED

    syncRangeSphere(
      Cesium,
      viewer,
      keep,
      'radar',
      radar.instanceId,
      radar.lon,
      radar.lat,
      radar.terrainAMSL,
      radius_m,
      '',
      {
        fillHex: CYAN,
        fillAlpha: isBlue ? 0.14 : 0.11,
        outlineHex,
        outlineAlpha: 0.8,
        outlineWidth: 2,
      },
    )

    const entity = ensureEntity(viewer, id, () =>
      new Cesium.Entity({ id, name: radar.asset.name }),
    )
    entity.position = new Cesium.ConstantPositionProperty(
      Cesium.Cartesian3.fromDegrees(radar.lon, radar.lat, sphereEpicenterOnTerrainM(radar.terrainAMSL)),
    )
    entity.ellipsoid = undefined
    entity.polygon = undefined
    entity.billboard = new Cesium.BillboardGraphics({
      image: PIN_SVG,
      verticalOrigin: Cesium.VerticalOrigin.CENTER,
      heightReference: Cesium.HeightReference.NONE,
      scale: billboardScale(1.05, isSelectedEntity(state, 'radar', radar.instanceId)),
      color: colour(Cesium, isBlue ? CYAN : RED, 1),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    })
    entity.label = new Cesium.LabelGraphics({
      text: `${formatRadarDisplayName(radar.asset)}\n${radar.asset.detection_range_km.toFixed(0)} km detect`,
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

  for (const eff of state.placedEffectors) {
    const id = `map-effector-mark-${eff.instanceId}`
    keep.add(id)
    const isBlue = eff.asset.side === 'blue'
    const engageHex = isBlue ? ORANGE : RED

    for (const linked of eff.asset.linkedRadars) {
      syncRangeSphere(
        Cesium,
        viewer,
        keep,
        'effector',
        eff.instanceId,
        eff.lon,
        eff.lat,
        eff.terrainAMSL,
        linked.dome_range_km * 1000,
        `-radar-${linked.id}`,
        {
          fillHex: CYAN,
          fillAlpha: 0.07,
          outlineHex: CYAN,
          outlineAlpha: 0.45,
          outlineWidth: 2,
        },
      )
    }

    syncRangeSphere(
      Cesium,
      viewer,
      keep,
      'effector',
      eff.instanceId,
      eff.lon,
      eff.lat,
      eff.terrainAMSL,
      eff.asset.engagement_dome_km * 1000,
      '-engage',
      {
        fillHex: engageHex,
        fillAlpha: isBlue ? 0.16 : 0.14,
        outlineHex: engageHex,
        outlineAlpha: 0.85,
        outlineWidth: 3,
      },
    )

    const cueLabel =
      eff.asset.linkedRadars.length > 0
        ? ` · ${eff.asset.linkedRadars.map((r) => formatRadarDisplayName(r)).join(' + ')}`
        : ''

    const entity = ensureEntity(viewer, id, () =>
      new Cesium.Entity({ id, name: eff.asset.name }),
    )
    entity.position = new Cesium.ConstantPositionProperty(
      Cesium.Cartesian3.fromDegrees(eff.lon, eff.lat, sphereEpicenterOnTerrainM(eff.terrainAMSL)),
    )
    entity.ellipsoid = undefined
    entity.polygon = undefined
    entity.billboard = new Cesium.BillboardGraphics({
      image: SHIELD_SVG,
      verticalOrigin: Cesium.VerticalOrigin.CENTER,
      heightReference: Cesium.HeightReference.NONE,
      scale: billboardScale(1.15, isSelectedEntity(state, 'effector', eff.instanceId)),
      color: colour(Cesium, engageHex, 1),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    })
    entity.label = new Cesium.LabelGraphics({
      text: `${formatEffectorDisplayName(eff.asset)}\n${eff.asset.engagement_max_km.toFixed(0)} km engage${cueLabel}`,
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
    if (!mask.hasMasking) continue

    if (mask.rays.length > 0) {
      syncTerrainDomeShield(
        Cesium,
        viewer,
        keep,
        mask.cuasInstanceId,
        mask.lon,
        mask.lat,
        mask.emitterAltM,
        mask.maxRange_m,
        mask.rays,
      )
    }

    mask.footprintCells.forEach((cell, cellIdx) => {
      if (cell.positionsLonLat.length < 3) return
      const cellId = `map-mask-footprint-${mask.cuasInstanceId}-${cellIdx}`
      keep.add(cellId)
      // 2D footprint + TERRAIN classification drapes grey onto the mesh surface (dead ground
      // behind ridges). perPositionHeight lifts the mask above tiles and reads as a flat shield.
      const positions = cell.positionsLonLat.map((p) =>
        Cesium.Cartesian3.fromDegrees(p.lon, p.lat),
      )
      const cellEntity = ensureEntity(viewer, cellId, () =>
        new Cesium.Entity({ id: cellId }),
      )
      cellEntity.position = undefined
      cellEntity.polygon = new Cesium.PolygonGraphics({
        hierarchy: new Cesium.PolygonHierarchy(positions),
        material: colour(Cesium, '#475569', 0.62),
        classificationType: Cesium.ClassificationType.TERRAIN,
        shadows: Cesium.ShadowMode.DISABLED,
      })
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
    // Same footprint as C-UAS defeat hemisphere — adjudication tint only, never oversized.
    entity.ellipsoid = new Cesium.EllipsoidGraphics({
      radii: new Cesium.Cartesian3(vol.radius_m, vol.radius_m, vol.radius_m),
      minimumCone: 0,
      maximumCone: Cesium.Math.PI_OVER_TWO,
      material: colour(Cesium, hex, vol.isDefeat ? 0.28 : 0.18),
      outline: true,
      outlineColor: colour(Cesium, hex, 0.85),
      outlineWidth: 2,
      slicePartitions: 32,
      stackPartitions: 16,
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


function syncMissionPathGraphics(
  Cesium: CesiumModule,
  viewer: CesiumViewer,
  uas: PlacedUas,
  state: CesiumSyncState,
  keep: Set<string>,
) {
  if (!uas.mission) return
  const mission = uas.mission
  const base = uas.instanceId
  const objective = mission.routeObjective ?? 'pd'
  const scoringOptions = { heading_deg: 0 }

  for (let i = 0; i < mission.waypoints.length - 1; i++) {
    const prev = mission.waypoints[i]
    const cur = mission.waypoints[i + 1]
    const terrain = (prev.terrainAMSL + cur.terrainAMSL) / 2
    const chunks = subdivideSegmentForDisplay(
      prev.lon,
      prev.lat,
      cur.lon,
      cur.lat,
      prev.alt_m,
      terrain,
      uas.asset,
      state.placedCuas,
      state.placedRadars,
      state.placedEffectors,
      state.overlaps,
      mission.emcon,
      objective,
      scoringOptions,
      cur.alt_m,
    )

    for (let c = 0; c < chunks.length; c++) {
      const chunk = chunks[c]
      const segId = missionSegmentChunkEntityId(base, i, c)
      keep.add(segId)
      const chunkMaterial = colour(Cesium, pathMetricColorHex(chunk.metricPct), 0.95)
      const chunkPositions = [
        { lon: chunk.lon1, lat: chunk.lat1, alt: chunk.alt_m },
        {
          lon: chunk.lon2,
          lat: chunk.lat2,
          alt: chunk.alt2_m ?? chunk.alt_m,
        },
      ]
      const pathWidth = state.flightPathEditActive ? 12 : 7
      const pickWidth = state.flightPathEditActive ? 56 : 14
      const segEntity = ensureEntity(viewer, segId, () => new Cesium.Entity({ id: segId, name: 'mission-segment' }))
      segEntity.position = undefined
      if (
        !polylineGraphicsUnchanged(
          Cesium,
          segEntity.polyline,
          chunkPositions,
          pathWidth,
          chunkMaterial,
          pickWidth,
        )
      ) {
        segEntity.polyline = new Cesium.PolylineGraphics({
          positions: Cesium.Cartesian3.fromDegreesArrayHeights([
            chunk.lon1,
            chunk.lat1,
            chunk.alt_m,
            chunk.lon2,
            chunk.lat2,
            chunk.alt2_m ?? chunk.alt_m,
          ]),
          width: pathWidth,
          pickWidth,
          material: chunkMaterial,
        })
      }
    }

    if (state.flightPathEditActive) {
      const pickId = missionSegmentPickEntityId(base, i)
      keep.add(pickId)
      const pickPositions = [
        { lon: prev.lon, lat: prev.lat, alt: prev.alt_m },
        { lon: cur.lon, lat: cur.lat, alt: cur.alt_m },
      ]
      const pickMaterial = colour(Cesium, '#FFFFFF', 0.04)
      const pickEntity = ensureEntity(viewer, pickId, () => new Cesium.Entity({ id: pickId, name: 'mission-segment-pick' }))
      pickEntity.position = undefined
      if (
        !polylineGraphicsUnchanged(Cesium, pickEntity.polyline, pickPositions, 2, pickMaterial, 72)
      ) {
        pickEntity.polyline = new Cesium.PolylineGraphics({
          positions: Cesium.Cartesian3.fromDegreesArrayHeights([
            prev.lon,
            prev.lat,
            prev.alt_m,
            cur.lon,
            cur.lat,
            cur.alt_m,
          ]),
          width: 2,
          pickWidth: 72,
          material: pickMaterial,
        })
      }
    }
  }

  const goalId = `map-mission-goal-${base}`
  keep.add(goalId)
  const goal = ensureEntity(viewer, goalId, () => new Cesium.Entity({ id: goalId }))
  if (!positionUnchanged(Cesium, goal.position, mission.goalLon, mission.goalLat, 0)) {
    goal.position = new Cesium.ConstantPositionProperty(
      Cesium.Cartesian3.fromDegrees(mission.goalLon, mission.goalLat, 0),
    )
  }
  if (
    !billboardGraphicsUnchanged(
      goal.billboard,
      PIN_SVG,
      1,
      Cesium.HeightReference.CLAMP_TO_GROUND,
    )
  ) {
    goal.billboard = new Cesium.BillboardGraphics({
      image: PIN_SVG,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    })
  }

  for (const wp of mission.waypoints) {
    if (wp.kind === 'start' && haversineM(uas.lat, uas.lon, wp.lat, wp.lon) < 80) continue
    if (wp.kind === 'goal') continue

    const wpId = missionWaypointEntityId(base, wp.id)
    keep.add(wpId)
    const entity = ensureEntity(viewer, wpId, () => new Cesium.Entity({ id: wpId, name: wp.kind }))
    if (!positionUnchanged(Cesium, entity.position, wp.lon, wp.lat, wp.alt_m)) {
      entity.position = new Cesium.ConstantPositionProperty(
        Cesium.Cartesian3.fromDegrees(wp.lon, wp.lat, wp.alt_m),
      )
    }

    if (wp.kind === 'detour') {
      const detourColor = colour(Cesium, ORANGE, 0.95)
      const detourSize = state.flightPathEditActive ? 18 : 14
      if (!pointGraphicsUnchanged(entity.point, detourSize, detourColor)) {
        entity.point = new Cesium.PointGraphics({
          pixelSize: detourSize,
          color: detourColor,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        })
      }
      const existingDetourLabel = readStringProperty(entity.label?.text)
      if (existingDetourLabel !== 'D') {
        entity.label = new Cesium.LabelGraphics({
          text: 'D',
          font: '11px JetBrains Mono',
          fillColor: colour(Cesium, ORANGE, 1),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, -18),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        })
      }
    } else {
      const transitColor = colour(Cesium, CYAN, 0.95)
      const transitSize = state.flightPathEditActive ? 14 : 10
      if (!pointGraphicsUnchanged(entity.point, transitSize, transitColor)) {
        entity.point = new Cesium.PointGraphics({
          pixelSize: transitSize,
          color: transitColor,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        })
      }
      entity.label = undefined
    }
  }
}
