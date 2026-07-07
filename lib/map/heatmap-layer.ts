import type { CesiumModule, CesiumViewer } from '@/lib/map/cesium-types'
import type { HeatmapCell } from '@/lib/propagation/types'

/** Jam / path-loss heat — visible on terrain (not buried at ellipsoid h=2). */
function lossToColour(Cesium: CesiumModule, pathLossDb: number, losState: string) {
  // 80–160 dB → cyan (strong field) → orange (weak). NLOS still shows gradient, not flat grey.
  const t = Math.min(1, Math.max(0, (pathLossDb - 80) / 80))
  const r = Math.round(249 * t + 6 * (1 - t))
  const g = Math.round(115 * t + 182 * (1 - t))
  const b = Math.round(22 * t + 212 * (1 - t))
  const alpha = losState === 'NLOS' ? 0.62 : 0.72
  return Cesium.Color.fromBytes(r, g, b, Math.round(alpha * 255))
}

export function syncHeatmapLayer(
  Cesium: CesiumModule,
  viewer: CesiumViewer,
  cells: HeatmapCell[],
  gridSteps: number,
  bounds?: { south: number; west: number; north: number; east: number },
) {
  const keepIds = new Set<string>()

  if (cells.length === 0 || !bounds || gridSteps < 2) {
    const toRemove: { id?: string }[] = []
    viewer.entities.values.forEach((e: { id?: string }) => {
      if (e.id?.startsWith('map-heatmap-')) toRemove.push(e)
    })
    toRemove.forEach((e) => viewer.entities.remove(e))
    return
  }

  const latStep = (bounds.north - bounds.south) / gridSteps
  const lonStep = (bounds.east - bounds.west) / gridSteps

  cells.forEach((cell, i) => {
    const id = `map-heatmap-${i}`
    keepIds.add(id)
    const halfLat = latStep / 2
    const halfLon = lonStep / 2
    const rect = Cesium.Rectangle.fromDegrees(
      cell.lon - halfLon,
      cell.lat - halfLat,
      cell.lon + halfLon,
      cell.lat + halfLat,
    )
    const material = lossToColour(Cesium, cell.path_loss_db, cell.los_state)
    let entity = viewer.entities.getById(id)
    const rectGraphics = {
      coordinates: rect,
      material,
      height: 20,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      classificationType: Cesium.ClassificationType.TERRAIN,
      outline: true,
      outlineColor: Cesium.Color.fromBytes(255, 255, 255, 40),
      zIndex: 0,
    }
    if (!entity) {
      entity = viewer.entities.add({ id, rectangle: rectGraphics })
    } else {
      entity.rectangle = rectGraphics
    }
  })

  const toRemove: { id?: string }[] = []
  viewer.entities.values.forEach((e: { id?: string }) => {
    if (e.id?.startsWith('map-heatmap-') && !keepIds.has(e.id!)) toRemove.push(e)
  })
  toRemove.forEach((e) => viewer.entities.remove(e))
}
