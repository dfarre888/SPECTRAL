import {
  buildOverlapVolume,
  detectOverlapPairs,
  uasToCuasDistance3dM,
} from '@/lib/map/overlap'
import type { PlacedCuas, PlacedUas } from '@/lib/map/types'

let pass = 0
let fail = 0
function ck(label: string, ok: boolean) {
  if (ok) {
    pass++
    console.log(`✓ ${label}`)
  } else {
    fail++
    console.log(`✗ ${label}`)
  }
}

function mockUas(overrides: Partial<PlacedUas> & { lateralRadius_m: number }): PlacedUas {
  return {
    instanceId: 'uas-1',
    asset: {
      id: 'switchblade-600',
      name: 'Switchblade 600',
      slug: 'switchblade-600',
      category: 'loitering_munition',
      categoryLabel: 'OWA',
      image_url: null,
      max_altitude_agl_m: 500,
      altitude_reference: 'AGL',
      max_range_km: 40,
      max_speed_kmh: 160,
      endurance_min: 40,
      climb_rate_mpm: 300,
    },
    lon: 151.2,
    lat: -33.84,
    terrainAMSL: 100,
    discAltitude_m: 600,
    ceilingAMSL_m: 600,
    annotationTime_min: 10,
    effectiveRange_km: 40,
    infoPanelClosed: true,
    ...overrides,
  }
}

function mockCuas(defeat_range_m: number, lon = 151.201, lat = -33.841): PlacedCuas {
  return {
    instanceId: 'cuas-1',
    asset: {
      id: 'anduril-anvil',
      name: 'Anduril Anvil',
      categoryLabel: 'Interceptor',
      image_url: null,
      defeat_range_m,
      defeat_range_km: defeat_range_m / 1000,
      defeat_methods: ['kinetic'],
    },
    lon,
    lat,
    terrainAMSL: 100,
    hasTerrainMasking: false,
  }
}

const uasNear = mockUas({ lateralRadius_m: 40_000 })
const cuas5km = mockCuas(5000)

ck(
  'UAS 1 km from C-UAS is inside 5 km defeat range',
  uasToCuasDistance3dM(uasNear, cuas5km) < 5000,
)
ck(
  '40 km ferry disc alone does not force overlap when UAS is 10 km away',
  detectOverlapPairs(
    [mockUas({ lateralRadius_m: 40_000, lon: 151.29, lat: -33.84 })],
    [cuas5km],
  ).length === 0,
)
ck(
  'overlap pair when UAS inside C-UAS sphere',
  detectOverlapPairs([uasNear], [cuas5km]).length === 1,
)

const vol = buildOverlapVolume(uasNear, cuas5km, 75, false)
ck('kill zone centred on C-UAS emitter', vol.lon === cuas5km.lon && vol.lat === cuas5km.lat)
ck('kill zone radius equals defeat range', vol.radius_m === 5000)
ck('defeat label includes Pk', vol.label.includes('75%'))

console.log(`\n${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
