import { freeSpacePathLossDb, receivedPowerDbm } from '@/lib/propagation/friis'
import { distance3dM } from '@/lib/propagation/geo'
import { deygoutChainLossDb, knifeEdgeLossDb } from '@/lib/propagation/knife-edge'
import { p1411UrbanExcessLossDb } from '@/lib/propagation/itu-p1411'
import { multipathMarginDb, twoRayPathLossDb } from '@/lib/propagation/two-ray'
import type {
  LosState,
  ModelTier,
  PropagationRequest,
  PropagationResult,
} from '@/lib/propagation/types'

export function analyzePropagation(req: PropagationRequest): PropagationResult {
  const env = req.environment ?? {}
  const e = req.emitter.position
  const r = req.receiver.position
  const dist = distance3dM(e.lat, e.lon, e.alt_m, r.lat, r.lon, r.alt_m)

  const tiers: ModelTier[] = ['friis']
  const notes: string[] = []

  let los: LosState = 'LOS'
  if (env.terrain_obstructed) {
    los = 'NLOS'
    tiers.push('terrain_los')
    notes.push('Terrain obstruction flagged — LOS blocked (Assessed)')
  }
  if (env.building_obstructed) {
    los = los === 'LOS' ? 'partial' : 'NLOS'
    tiers.push('building_occlusion')
    notes.push('Building vector occlusion — partial/NLOS (Estimated)')
  }

  const urban =
    env.urban_density === 'dense_urban' ||
    env.urban_density === 'urban' ||
    env.urban_density === 'suburban'

  let pathLoss = freeSpacePathLossDb(dist, req.emitter.freq_hz)
  tiers.push('two_ray')

  const twoRay = twoRayPathLossDb(dist, req.emitter.freq_hz, e.alt_m, r.alt_m)
  pathLoss = Math.max(pathLoss, twoRay)

  if (env.diffraction_edges && env.diffraction_edges.length > 0) {
    const diff = deygoutChainLossDb(env.diffraction_edges, req.emitter.freq_hz, dist)
    pathLoss += diff
    tiers.push('deygout_chain')
    notes.push(
      `Deygout chain — ${env.diffraction_edges.length} edge(s) (Estimated; not Bullington single-edge)`,
    )
  } else if (env.terrain_obstructed) {
    const clearance = -5
    const diff = knifeEdgeLossDb(clearance, req.emitter.freq_hz, dist)
    pathLoss += diff
    tiers.push('knife_edge')
    notes.push('Single knife-edge fallback — supply diffraction_edges for ridge chains')
  }

  if (los === 'NLOS' && urban) {
    const excess = p1411UrbanExcessLossDb(
      dist,
      req.emitter.freq_hz,
      env.urban_density === 'dense_urban'
        ? 'dense_urban'
        : env.urban_density === 'urban'
          ? 'urban'
          : 'suburban',
    )
    pathLoss += excess * 0.35
    tiers.push('itu_p1411')
    notes.push('ITU-R P.1411 urban excess applied (Estimated)')
  }

  if (env.rain_rate_mm_h && env.rain_rate_mm_h > 1) {
    pathLoss += Math.min(3 + env.rain_rate_mm_h * 0.05, 12)
    notes.push('Rain attenuation modifier (Estimated)')
  }

  const rxPower = receivedPowerDbm(req.emitter.erp_dbm, pathLoss)
  const margin = multipathMarginDb(urban, los === 'LOS')

  let jts: number | null = null
  if (req.jammer_erp_dbm != null) {
    const jamRx = receivedPowerDbm(req.jammer_erp_dbm, pathLoss)
    const signalDbm = rxPower
    jts = jamRx - signalDbm
    notes.push(`J/S ${jts.toFixed(1)} dB at receiver (Assessed)`)
  }

  return {
    los_state: los,
    distance_m: dist,
    path_loss_db: Math.round(pathLoss * 10) / 10,
    multipath_margin_db: margin,
    jam_to_signal_db: jts != null ? Math.round(jts * 10) / 10 : null,
    received_power_dbm: Math.round(rxPower * 10) / 10,
    confidence: los === 'LOS' && !env.building_obstructed ? 'Assessed' : 'Estimated',
    model_tier: [...new Set(tiers)],
    notes,
  }
}
