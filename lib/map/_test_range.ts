import {
  sphereDomeTopM,
  sphereEpicenterOnTerrainM,
} from '@/lib/map/cesium-sync'
import { TERRAIN_SURFACE_AGL_M } from '@/lib/map/terrain'
import {
  CASA_RANGE_CONTAINMENT_RATIO,
  SPECTRAL_SPEC_RANGE_RATIO,
  computePlatformRangeEnvelope,
  containmentRangeKm,
  envelopeDiscAltitudeM,
  operationalEnvelopeRadiusKm,
} from '@/lib/map/range-declaration'
import type { MapUasAsset } from '@/lib/map/types'

const tb2: MapUasAsset = {
  id: 'tb2-bayraktar',
  name: 'Bayraktar TB2',
  slug: 'tb2-bayraktar',
  category: 'MALE',
  categoryLabel: 'MALE',
  image_url: null,
  max_altitude_agl_m: 8230,
  altitude_reference: 'AGL',
  max_range_km: 300,
  max_speed_kmh: 220,
  endurance_min: 1620,
  climb_rate_mpm: 500,
}

const tb001: MapUasAsset = {
  id: 'tb-001',
  name: 'AVIC TB-001 Twin-Tailed Scorpion',
  slug: 'tb-001',
  category: 'MALE',
  categoryLabel: 'MALE',
  image_url: null,
  max_altitude_agl_m: 8000,
  altitude_reference: 'AGL',
  max_range_km: 6000,
  max_speed_kmh: 300,
  endurance_min: 35 * 60,
  climb_rate_mpm: 500,
}

let pass = 0
let fail = 0
function ck(label: string, ok: boolean) {
  if (ok) {
    pass++
    console.log(`✓ ${label}`)
  } else {
    fail++
    console.error(`✗ ${label}`)
  }
}

const tb2Op = operationalEnvelopeRadiusKm(tb2)
ck('TB2 short-range uses spec', tb2Op.operationalRadiusKm === 300)

const tb001Op = operationalEnvelopeRadiusKm(tb001)
ck('TB-001 ferry 6000 → combat ~1500 km', tb001Op.operationalRadiusKm === 1500)
ck('TB-001 retains ferry spec', tb001Op.declaredSpecKm === 6000)

const nilWind = computePlatformRangeEnvelope(tb2, 100)
ck('TB2 disc uses operational km', nilWind.sphereRadiusM === 300_000)
ck('TB2 disc altitude AGL', nilWind.discAltitudeM === 100 + 8230)
ck('spec ratio is 1.0', SPECTRAL_SPEC_RANGE_RATIO === 1)
ck(
  '80% containment reference',
  containmentRangeKm(300) === 300 * CASA_RANGE_CONTAINMENT_RATIO,
)

const tb001Env = computePlatformRangeEnvelope(tb001, 318)
ck('TB-001 disc radius 1500 km not 6000', tb001Env.sphereRadiusM === 1_500_000)
ck('TB-001 disc altitude terrain + ceiling', tb001Env.discAltitudeM === 318 + 8000)

ck('AGL disc = terrain + altitude', envelopeDiscAltitudeM(500, 152, 'AGL') === 652)
ck('AMSL disc = absolute altitude', envelopeDiscAltitudeM(500, 7600, 'AMSL') === 7600)

const headwind = computePlatformRangeEnvelope(tb2, 100, {
  applyWind: true,
  wind: { windSpeed_kmh: 50, windDir_deg: 0, level: 'test' },
  flightBearingDeg: 0,
})
ck('wind shrinks disc radius', headwind.sphereRadiusM < 300_000)
ck('wind flag set', headwind.windAdjusted === true)

ck(
  'C-UAS sphere epicenter on terrain (+ surface offset)',
  sphereEpicenterOnTerrainM(318) === 318 + TERRAIN_SURFACE_AGL_M,
)
ck(
  'C-UAS dome top is epicenter + radius',
  sphereDomeTopM(318, 500) === 318 + TERRAIN_SURFACE_AGL_M + 500,
)

console.log(`\n${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
