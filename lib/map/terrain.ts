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
