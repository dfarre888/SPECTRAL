import type {
  CesiumModule,
  CesiumTerrainProvider,
  CesiumViewer,
} from '@/lib/map/cesium-types'
import {
  sampleTerrainBatch,
  TERRAIN_SURFACE_AGL_M,
} from '@/lib/map/terrain'

/** Min clearance above LOS line before terrain counts as blocking. */
export const TERRAIN_MASK_CLEARANCE_M = 5

/** Sample spacing along each LOS ray (m). */
export const TERRAIN_MASK_STEP_M = 50

/** Azimuth step (degrees) — 72 rays around the emitter. */
export const TERRAIN_MASK_AZIMUTH_STEP = 5

/** Drone AGL for dead-ground / viewshed target (MathWorks radar-coverage pattern). */
export const DRONE_TARGET_AGL_M = 30

/**
 * A quad of terrain-draped dead-ground — occluded area behind a ridge.
 * positionsLonLat: inner-left → inner-right → outer-right → outer-left
 * heights: terrain AMSL + TERRAIN_SURFACE_AGL_M at each corner (for sampling; render uses classification drape)
 */
export interface TerrainShadowFootprint {
  positionsLonLat: { lon: number; lat: number }[]
  heights: number[]
}

export interface MaskingRayResult {
  angleDeg: number
  visibleDistance_m: number
  boundaryLon: number
  boundaryLat: number
  /** Terrain AMSL at the LOS ridge / dead-ground boundary. */
  boundaryTerrainAMSL: number
}

export interface SphereLosMaskResult {
  hasMasking: boolean
  emitterAltM: number
  footprintCells: TerrainShadowFootprint[]
  rays: MaskingRayResult[]
}

export function offsetBearingM(
  lon: number,
  lat: number,
  bearingDeg: number,
  distanceM: number,
) {
  const R = 6371000
  const br = (bearingDeg * Math.PI) / 180
  const lat1 = (lat * Math.PI) / 180
  const lon1 = (lon * Math.PI) / 180
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distanceM / R) +
      Math.cos(lat1) * Math.sin(distanceM / R) * Math.cos(br),
  )
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(br) * Math.sin(distanceM / R) * Math.cos(lat1),
      Math.cos(distanceM / R) - Math.sin(lat1) * Math.sin(lat2),
    )
  return { lon: (lon2 * 180) / Math.PI, lat: (lat2 * 180) / Math.PI }
}

function emitterAltM(terrainAMSL: number): number {
  return terrainAMSL + TERRAIN_SURFACE_AGL_M
}

function surfaceAltM(terrainAMSL: number): number {
  return terrainAMSL + TERRAIN_SURFACE_AGL_M
}

/** Dome surface height MSL at horizontal ground distance d from epicenter. */
export function domeHeightAtDistanceM(
  emitterAltM: number,
  sphereRadiusM: number,
  horizontalDistanceM: number,
): number {
  const d = Math.min(horizontalDistanceM, sphereRadiusM)
  return emitterAltM + Math.sqrt(Math.max(0, sphereRadiusM * sphereRadiusM - d * d))
}

/**
 * Maximum-elevation-angle viewshed — farthest distance at which a drone at
 * DRONE_TARGET_AGL_M above terrain can be seen from the emitter (dead-ground boundary).
 */
export function visibleDistanceGroundLevel(
  stepHeights: number[],
  step_m: number,
  emitterAltM: number,
  maxRange_m: number,
): number {
  let maxTerrainAngle = -Math.PI / 2
  let lastVisibleDist = 0

  for (let s = 0; s < stepHeights.length; s++) {
    const d = (s + 1) * step_m
    if (d > maxRange_m) break

    const hTerrain = stepHeights[s]
    const hTarget = hTerrain + DRONE_TARGET_AGL_M
    const elevToTarget = Math.atan2(hTarget - emitterAltM, d)
    const clearanceAngle = Math.atan(TERRAIN_MASK_CLEARANCE_M / d)

    if (elevToTarget < maxTerrainAngle - clearanceAngle) {
      return lastVisibleDist > 0 ? lastVisibleDist : step_m
    }

    const elevToTerrain = Math.atan2(hTerrain - emitterAltM, d)
    if (elevToTerrain > maxTerrainAngle) {
      maxTerrainAngle = elevToTerrain
    }
    lastVisibleDist = d
  }

  return maxRange_m
}

/**
 * Terrain LOS dead-ground footprint inside defeat radius — MEA viewshed per azimuth,
 * grey cells drape on occluded ground behind ridges (MathWorks coverage-over-terrain model).
 */
export async function computeTerrainMasking(
  Cesium: CesiumModule,
  terrainProvider: CesiumTerrainProvider,
  lon: number,
  lat: number,
  terrainAMSL: number,
  maxRange_m: number,
  viewer?: CesiumViewer | null,
): Promise<SphereLosMaskResult> {
  const step_m = TERRAIN_MASK_STEP_M
  const steps = Math.max(1, Math.floor(maxRange_m / step_m))
  const h_em = emitterAltM(terrainAMSL)
  const angles: number[] = []
  for (let a = 0; a < 360; a += TERRAIN_MASK_AZIMUTH_STEP) angles.push(a)

  const allPoints: { lon: number; lat: number; angle: number; dist: number }[] = []
  for (const angle of angles) {
    for (let s = 1; s <= steps; s++) {
      const dist = s * step_m
      const pt = offsetBearingM(lon, lat, angle, dist)
      allPoints.push({ lon: pt.lon, lat: pt.lat, angle, dist })
    }
  }

  const heights = await sampleTerrainBatch(
    Cesium,
    terrainProvider,
    allPoints.map((p) => ({ lon: p.lon, lat: p.lat })),
    viewer,
  )

  const rays: MaskingRayResult[] = []
  const visible_m: number[] = []
  let idx = 0

  for (const angle of angles) {
    const stepHeights: number[] = []
    for (let s = 1; s <= steps; s++) {
      stepHeights.push(heights[idx])
      idx++
    }
    const vis = visibleDistanceGroundLevel(stepHeights, step_m, h_em, maxRange_m)
    visible_m.push(vis)
    const boundary = offsetBearingM(lon, lat, angle, vis)
    const stepIdx = Math.min(
      stepHeights.length - 1,
      Math.max(0, Math.floor(vis / step_m) - 1),
    )
    rays.push({
      angleDeg: angle,
      visibleDistance_m: vis,
      boundaryLon: boundary.lon,
      boundaryLat: boundary.lat,
      boundaryTerrainAMSL: stepHeights[stepIdx] ?? terrainAMSL,
    })
  }

  const shadowMarginM = step_m
  let hasMasking = false
  const footprintCells: TerrainShadowFootprint[] = []
  const cornerPts: { lon: number; lat: number }[] = []
  const pendingQuads: number[] = []

  for (let i = 0; i < angles.length; i++) {
    const j = (i + 1) % angles.length
    const d_i = visible_m[i]
    const d_j = visible_m[j]
    if (d_i >= maxRange_m - shadowMarginM && d_j >= maxRange_m - shadowMarginM) continue

    hasMasking = true
    const corners = [
      offsetBearingM(lon, lat, angles[i], d_i),
      offsetBearingM(lon, lat, angles[j], d_j),
      offsetBearingM(lon, lat, angles[j], maxRange_m),
      offsetBearingM(lon, lat, angles[i], maxRange_m),
    ]
    pendingQuads.push(footprintCells.length)
    footprintCells.push({ positionsLonLat: [], heights: [] })
    cornerPts.push(...corners)
  }

  if (!hasMasking) {
    for (const v of visible_m) {
      if (v < maxRange_m - shadowMarginM) {
        hasMasking = true
        break
      }
    }
  }

  if (cornerPts.length > 0) {
    const cornerHeights = await sampleTerrainBatch(
      Cesium,
      terrainProvider,
      cornerPts,
      viewer,
    )
    let cornerIdx = 0
    for (const quadIdx of pendingQuads) {
      const positionsLonLat: { lon: number; lat: number }[] = []
      const cornerAlts: number[] = []
      for (let c = 0; c < 4; c++) {
        positionsLonLat.push(cornerPts[cornerIdx])
        cornerAlts.push(surfaceAltM(cornerHeights[cornerIdx]))
        cornerIdx++
      }
      footprintCells[quadIdx] = { positionsLonLat, heights: cornerAlts }
    }
  }

  return {
    hasMasking,
    emitterAltM: h_em,
    footprintCells,
    rays,
  }
}
