import { analyzePropagation } from '@/lib/propagation/analyze'
import type { HeatmapCell, HeatmapRequest, HeatmapResult } from '@/lib/propagation/types'

export function computeHeatmap(req: HeatmapRequest): HeatmapResult {
  const steps = Math.min(Math.max(req.grid_steps, 4), 32)
  const cells: HeatmapCell[] = []
  const latStep = (req.bounds.north - req.bounds.south) / steps
  const lonStep = (req.bounds.east - req.bounds.west) / steps

  for (let i = 0; i <= steps; i++) {
    for (let j = 0; j <= steps; j++) {
      const lat = req.bounds.south + i * latStep
      const lon = req.bounds.west + j * lonStep
      const result = analyzePropagation({
        emitter: req.emitter,
        receiver: {
          position: { lat, lon, alt_m: req.receiver_alt_m },
        },
        environment: req.environment,
      })
      cells.push({
        lat,
        lon,
        path_loss_db: result.path_loss_db,
        los_state: result.los_state,
      })
    }
  }

  return {
    cells,
    grid_steps: steps,
    confidence: 'Estimated',
  }
}
