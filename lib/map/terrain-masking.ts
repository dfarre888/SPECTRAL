import type { CesiumModule, CesiumTerrainProvider } from '@/lib/map/cesium-types'
import { sampleTerrainBatch } from '@/lib/map/terrain'

export interface MaskingRayResult {
  angleDeg: number
  blockageDistance_m: number | null
  blockageLon: number | null
  blockageLat: number | null
}

function offsetLatLon(lon: number, lat: number, bearingDeg: number, distanceM: number) {
  const R = 6371000
  const br = (bearingDeg * Math.PI) / 180
  const lat1 = (lat * Math.PI) / 180
  const lon1 = (lon * Math.PI) / 180
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distanceM / R) +
      Math.cos(lat1) * Math.sin(distanceM / R) * Math.cos(br)
  )
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(br) * Math.sin(distanceM / R) * Math.cos(lat1),
      Math.cos(distanceM / R) - Math.sin(lat1) * Math.sin(lat2)
    )
  return { lon: (lon2 * 180) / Math.PI, lat: (lat2 * 180) / Math.PI }
}

export async function computeTerrainMasking(
  Cesium: CesiumModule,
  terrainProvider: CesiumTerrainProvider,
  lon: number,
  lat: number,
  terrainAMSL: number,
  maxRange_m: number
): Promise<{ polygon: { lon: number; lat: number }[]; hasMasking: boolean }> {
  const step_m = 100
  const steps = Math.max(1, Math.floor(maxRange_m / step_m))
  const rays: MaskingRayResult[] = []

  const allPoints: { lon: number; lat: number; ray: number; dist: number }[] = []
  for (let angle = 0; angle < 360; angle += 10) {
    for (let s = 1; s <= steps; s++) {
      const dist = s * step_m
      const pt = offsetLatLon(lon, lat, angle, dist)
      allPoints.push({ lon: pt.lon, lat: pt.lat, ray: angle, dist })
    }
  }

  const heights = await sampleTerrainBatch(
    Cesium,
    terrainProvider,
    allPoints.map((p) => ({ lon: p.lon, lat: p.lat }))
  )

  let idx = 0
  for (let angle = 0; angle < 360; angle += 10) {
    let blockageDistance_m: number | null = null
    let blockageLon: number | null = null
    let blockageLat: number | null = null

    for (let s = 1; s <= steps; s++) {
      const pt = allPoints[idx]
      const terrainH = heights[idx]
      idx++
      if (terrainH > terrainAMSL) {
        blockageDistance_m = pt.dist
        blockageLon = pt.lon
        blockageLat = pt.lat
        break
      }
    }

    rays.push({
      angleDeg: angle,
      blockageDistance_m,
      blockageLon,
      blockageLat,
    })
  }

  const polygon: { lon: number; lat: number }[] = []
  let hasMasking = false

  for (const ray of rays) {
    if (ray.blockageLon !== null && ray.blockageLat !== null) {
      hasMasking = true
      polygon.push({ lon: ray.blockageLon, lat: ray.blockageLat })
    } else {
      const edge = offsetLatLon(lon, lat, ray.angleDeg, maxRange_m)
      polygon.push(edge)
    }
  }

  return { polygon, hasMasking }
}
