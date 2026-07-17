import type { CesiumModule, CesiumViewer } from '@/lib/map/cesium-types'
import type { HeatmapCell } from '@/lib/propagation/types'

/** Max grid resolution — larger grids recurse Cesium tile geometry and stack-overflow. */
export const MAX_HEATMAP_GRID_STEPS = 24
/** Max geographic span per heatmap layer (degrees). */
export const MAX_HEATMAP_SPAN_DEG = 6

/** Jam / path-loss heat — visible above terrain without terrain classification (avoids tile recursion). */
function lossToColour(Cesium: CesiumModule, pathLossDb: number, losState: string) {
  // 80–160 dB → cyan (strong field) → orange (weak). NLOS still shows gradient, not flat grey.
  const t = Math.min(1, Math.max(0, (pathLossDb - 80) / 80))
  const r = Math.round(249 * t + 6 * (1 - t))
  const g = Math.round(115 * t + 182 * (1 - t))
  const b = Math.round(22 * t + 212 * (1 - t))
  const alpha = losState === 'NLOS' ? 0.62 : 0.72
  return Cesium.Color.fromBytes(r, g, b, Math.round(alpha * 255))
}

function isValidBounds(bounds: { south: number; west: number; north: number; east: number }): boolean {
  if (![bounds.south, bounds.west, bounds.north, bounds.east].every(Number.isFinite)) {
    return false
  }
  if (bounds.north <= bounds.south || bounds.east <= bounds.west) return false
  const latSpan = bounds.north - bounds.south
  const lonSpan = bounds.east - bounds.west
  if (latSpan <= 0 || lonSpan <= 0) return false
  if (latSpan > MAX_HEATMAP_SPAN_DEG || lonSpan > MAX_HEATMAP_SPAN_DEG) return false
  return true
}

export function syncHeatmapLayer(
  Cesium: CesiumModule,
  viewer: CesiumViewer,
  cells: HeatmapCell[],
  gridSteps: number,
  bounds?: { south: number; west: number; north: number; east: number },
) {
  const keepIds = new Set<string>()

  const cappedSteps = Math.min(Math.max(0, gridSteps), MAX_HEATMAP_GRID_STEPS)
  const maxCells = cappedSteps * cappedSteps

  if (cells.length === 0 || !bounds || cappedSteps < 2 || !isValidBounds(bounds)) {
    const toRemove: { id?: string }[] = []
    viewer.entities.values.forEach((e: { id?: string }) => {
      if (e.id?.startsWith('map-heatmap-')) toRemove.push(e)
    })
    toRemove.forEach((e) => viewer.entities.remove(e))
    return
  }

  const latStep = (bounds.north - bounds.south) / cappedSteps
  const lonStep = (bounds.east - bounds.west) / cappedSteps

  cells.slice(0, maxCells).forEach((cell, i) => {
    if (!Number.isFinite(cell.lon) || !Number.isFinite(cell.lat)) return

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
      height: 25,
      heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
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
