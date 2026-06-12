import { analyzePropagation } from '@/lib/propagation/analyze'
import { freeSpacePathLossDb } from '@/lib/propagation/friis'
import { computeHeatmap } from '@/lib/propagation/heatmap'
import { deygoutChainLossDb, knifeEdgeLossDb } from '@/lib/propagation/knife-edge'

let pass = 0
let fail = 0

function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    pass++
    console.log(`✓ ${name}`)
  } else {
    fail++
    console.error(`✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

const fspl2g = freeSpacePathLossDb(1000, 2.4e9)
check('FSPL 1km @ 2.4GHz reasonable', fspl2g > 90 && fspl2g < 110, String(fspl2g))

const los = analyzePropagation({
  emitter: {
    position: { lat: -35, lon: 149, alt_m: 10 },
    freq_hz: 2.4e9,
    erp_dbm: 30,
  },
  receiver: {
    position: { lat: -35.01, lon: 149.01, alt_m: 30 },
  },
  environment: { urban_density: 'open' },
})
check('LOS open path', los.los_state === 'LOS')
check('path loss positive', los.path_loss_db > 0)

const nlos = analyzePropagation({
  emitter: {
    position: { lat: -35, lon: 149, alt_m: 10 },
    freq_hz: 2.4e9,
    erp_dbm: 30,
  },
  receiver: {
    position: { lat: -35.02, lon: 149.02, alt_m: 30 },
  },
  environment: { urban_density: 'dense_urban', building_obstructed: true, terrain_obstructed: true },
})
check('NLOS urban higher loss', nlos.path_loss_db >= los.path_loss_db)

const jam = analyzePropagation({
  emitter: {
    position: { lat: -35, lon: 149, alt_m: 10 },
    freq_hz: 2.4e9,
    erp_dbm: 20,
  },
  receiver: { position: { lat: -35.005, lon: 149.005, alt_m: 30 } },
  jammer_erp_dbm: 40,
})
check('J/S computed', jam.jam_to_signal_db != null)

const hm = computeHeatmap({
  emitter: {
    position: { lat: -35, lon: 149, alt_m: 10 },
    freq_hz: 2.4e9,
    erp_dbm: 30,
  },
  bounds: { south: -35.02, west: 149, north: -35, east: 149.02 },
  grid_steps: 4,
  receiver_alt_m: 30,
})
check('heatmap cells', hm.cells.length === 25)

const singleEdge = knifeEdgeLossDb(-8, 2.4e9, 5000)
const ridgeChain = deygoutChainLossDb(
  [
    { clearance_m: -12, distance_from_emitter_m: 2000 },
    { clearance_m: -6, distance_from_emitter_m: 3500 },
  ],
  2.4e9,
  5000,
)
check('Deygout chain exceeds single Bullington edge', ridgeChain > singleEdge, `${ridgeChain} vs ${singleEdge}`)

const chainAnalyze = analyzePropagation({
  emitter: {
    position: { lat: -35, lon: 149, alt_m: 10 },
    freq_hz: 2.4e9,
    erp_dbm: 30,
  },
  receiver: { position: { lat: -35.02, lon: 149.02, alt_m: 30 } },
  environment: {
    terrain_obstructed: true,
    diffraction_edges: [
      { clearance_m: -10, distance_from_emitter_m: 1500 },
      { clearance_m: -5, distance_from_emitter_m: 3200 },
    ],
  },
})
check('deygout_chain in model_tier', chainAnalyze.model_tier.includes('deygout_chain'))

console.log(`\n${pass}/${pass + fail} propagation tests passed`)
if (fail > 0) process.exit(1)
