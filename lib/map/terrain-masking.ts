import type {
  CesiumModule,
  CesiumTerrainProvider,
  CesiumViewer,
} from '@/lib/map/cesium-types'
import {
  sampleTerrainBatch,
  TERRAIN_SURFACE_AGL_M,
} from '@/lib/map/terrain'
import {
  planSweep,
  rayVisibility,
  viewshedQuality,
  type RaySegment,
  type RayVisibility,
  type ViewshedQuality,
  DEFAULT_SWEEP_BUDGET,
} from '@/lib/map/viewshed'

/** Min clearance above LOS line before terrain counts as blocking. */
export const TERRAIN_MASK_CLEARANCE_M = 5

/** Sample spacing along each LOS ray (m). */
export const TERRAIN_MASK_STEP_M = 50

/**
 * Legacy fixed azimuth step. Retained for callers that still reference it, but
 * the sweep now derives its step from range via azimuthStepDeg(): at 50 km a
 * 5 degree step left 4.4 km between rays, so a ridge was caught or missed
 * depending on where it happened to fall.
 */
export const TERRAIN_MASK_AZIMUTH_STEP = 5

/** Default antenna height above ground, metres. */
export const DEFAULT_EMITTER_MAST_M = 10

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
  /**
   * Full visibility profile along the ray. A single distance cannot express
   * ground that becomes visible again beyond a ridge; this can.
   */
  segments: RaySegment[]
}

export interface SphereLosMaskResult {
  hasMasking: boolean
  emitterAltM: number
  footprintCells: TerrainShadowFootprint[]
  rays: MaskingRayResult[]
  /** Terrain coverage behind the result — surface this rather than hiding it. */
  quality: ViewshedQuality
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

function emitterAltM(terrainAMSL: number, mastM: number = DEFAULT_EMITTER_MAST_M): number {
  // TERRAIN_SURFACE_AGL_M is a 2 m z-fighting offset for draped geometry and
  // was previously doubling as antenna height, putting every radar on a 2 m mast.
  return terrainAMSL + mastM
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
  // Sample budget keeps a long-range sweep from stalling the map: azimuth is
  // widened before radial resolution is given up.
  const plan = planSweep(maxRange_m, DEFAULT_SWEEP_BUDGET, TERRAIN_MASK_STEP_M)
  const step_m = plan.stepM
  const steps = plan.stepsPerRay
  const h_em = emitterAltM(terrainAMSL)
  const angles: number[] = []
  for (let a = 0; a < 360; a += plan.azStepDeg) angles.push(a)

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
  const rayResults: RayVisibility[] = []
  let idx = 0

  for (const angle of angles) {
    const stepHeights: number[] = []
    for (let s = 1; s <= steps; s++) {
      stepHeights.push(heights[idx])
      idx++
    }
    // 'block' is the conservative policy: unresolved terrain is treated as
    // opaque rather than transparent, so the sweep never claims coverage it
    // could not verify. Unresolved counts are reported in `quality`.
    const rv = rayVisibility(stepHeights, step_m, terrainAMSL, {
      emitterMastM: DEFAULT_EMITTER_MAST_M,
      targetAglM: DRONE_TARGET_AGL_M,
      unresolvedPolicy: 'block',
    })
    rayResults.push(rv)
    const vis = rv.firstMaskM ?? maxRange_m
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
      boundaryTerrainAMSL: Number.isFinite(stepHeights[stepIdx])
        ? stepHeights[stepIdx]
        : terrainAMSL,
      segments: rv.segments,
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
    quality: viewshedQuality(rayResults),
  }
}
