import type { CesiumModule, CesiumViewer } from '@/lib/map/cesium-types'
import type { HeatmapCell } from '@/lib/propagation/types'

function lossToColour(Cesium: CesiumModule, pathLossDb: number, losState: string) {
  if (losState === 'NLOS') {
    return Cesium.Color.fromCssColorString('#64748B').withAlpha(0.35)
  }
  const t = Math.min(1, Math.max(0, (pathLossDb - 80) / 80))
  const r = Math.round(249 * t + 6 * (1 - t))
  const g = Math.round(115 * t + 182 * (1 - t))
  const b = Math.round(22 * t + 212 * (1 - t))
  return new Cesium.Color(r / 255, g / 255, b / 255, 0.42)
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
    let entity = viewer.entities.getById(id)
    if (!entity) {
      entity = viewer.entities.add({
        id,
        rectangle: {
          coordinates: rect,
          material: lossToColour(Cesium, cell.path_loss_db, cell.los_state),
          height: 2,
          outline: false,
        },
      })
    } else {
      entity.rectangle = {
        coordinates: rect,
        material: lossToColour(Cesium, cell.path_loss_db, cell.los_state),
        height: 2,
        outline: false,
      }
    }
  })

  const toRemove: { id?: string }[] = []
  viewer.entities.values.forEach((e: { id?: string }) => {
    if (e.id?.startsWith('map-heatmap-') && !keepIds.has(e.id)) toRemove.push(e)
  })
  toRemove.forEach((e) => viewer.entities.remove(e))
}
