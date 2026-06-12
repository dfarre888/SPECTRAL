import type { CesiumModule, CesiumViewer } from '@/lib/map/cesium-types'

/** Shadow map resolution — higher = sharper terrain shadows on defeat spheres. */
export const SHADOW_MAP_SIZE = 4096

/** Max shadow draw distance (m) — covers 15 km defeat range with margin. */
export const SHADOW_MAP_MAX_DISTANCE_M = 25_000

/**
 * Initialise Cesium terrain shadows for Map Intel C-UAS defeat visualization.
 * Terrain casts sun shadows onto defeat spheres; spheres receive them.
 */
export function configureMapIntelShadows(viewer: CesiumViewer, Cesium: CesiumModule) {
  const shadowMap = viewer.shadowMap
  if (!shadowMap) return

  shadowMap.size = SHADOW_MAP_SIZE
  shadowMap.softShadows = true
  shadowMap.maximumDistance = SHADOW_MAP_MAX_DISTANCE_M
  shadowMap.darkness = 0.55
  shadowMap.fadingEnabled = true
  shadowMap.normalOffset = true

  // Sun-driven shadows require vertex normals on terrain tiles (set in createWorldTerrainAsync).
  if (viewer.scene?.globe) {
    viewer.scene.globe.shadows = Cesium.ShadowMode.ENABLED
  }
}

/**
 * Toggle terrain shadows when C-UAS systems are placed — avoids GPU cost on empty maps.
 */
export function setTerrainShadowsActive(
  viewer: CesiumViewer,
  Cesium: CesiumModule,
  active: boolean,
) {
  viewer.shadows = active
  viewer.terrainShadows = active
    ? Cesium.ShadowMode.ENABLED
    : Cesium.ShadowMode.DISABLED

  if (viewer.scene?.globe) {
    viewer.scene.globe.shadows = active
      ? Cesium.ShadowMode.ENABLED
      : Cesium.ShadowMode.DISABLED
  }

  if (viewer.shadowMap) {
    viewer.shadowMap.enabled = active
  }
}
