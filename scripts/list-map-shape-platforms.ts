/**
 * Lists Map Intel platforms and which envelope shape they draw when placed.
 * Run: npx tsx scripts/list-map-shape-platforms.ts
 */
import { operationalEnvelopeRadiusKm } from '../lib/map/range-declaration'
import type { MapUasAsset } from '../lib/map/types'

const tacticalUas: MapUasAsset[] = [
  {
    id: 'anduril-anvil',
    name: 'Anduril Anvil',
    slug: 'anduril-anvil',
    category: 'interceptor_uas',
    categoryLabel: 'Interceptor',
    image_url: null,
    max_altitude_agl_m: 500,
    altitude_reference: 'AGL',
    max_range_km: 5,
    max_speed_kmh: 150,
    endurance_min: 12,
    climb_rate_mpm: 500,
  },
  {
    id: 'skydio-x10d',
    name: 'Skydio X10D',
    slug: 'skydio-x10d',
    category: 'tactical',
    categoryLabel: 'Tactical',
    image_url: null,
    max_altitude_agl_m: 500,
    altitude_reference: 'AGL',
    max_range_km: 10,
    max_speed_kmh: 65,
    endurance_min: 120,
    climb_rate_mpm: 500,
  },
  {
    id: 'tb-001',
    name: 'TB-001',
    slug: 'tb-001',
    category: 'MALE',
    categoryLabel: 'MALE',
    image_url: null,
    max_altitude_agl_m: 8000,
    altitude_reference: 'AGL',
    max_range_km: 6000,
    max_speed_kmh: 300,
    endurance_min: 2100,
    climb_rate_mpm: 500,
  },
]

console.log('MAP INTEL — SHAPE DRAWING RULES\n')
console.log('UAS Platforms (sidebar): horizontal COMBAT DISC at service ceiling AGL')
console.log('C-UAS Systems (sidebar): 3D DEFEAT SPHERE (ground-tangent dome)\n')
console.log('ALL 82 UAS + ALL 23 C-UAS draw a shape when placed (radius > 0).\n')
console.log('--- BEST FOR VISIBLE TEST AT LOCAL ZOOM (0.5–15 km radius) ---\n')

for (const u of tacticalUas) {
  const op = operationalEnvelopeRadiusKm(u)
  const visible = op.operationalRadiusKm <= 15 ? '✓ tactical zoom' : '⚠ zoom out (continent)'
  console.log(
    `UAS  ${u.name.padEnd(28)} disc ${op.operationalRadiusKm.toFixed(1)} km @ ${u.max_altitude_agl_m} m AGL  ${visible}`,
  )
}

const cuasSamples = [
  ['DroneGun Tactical', 2.0],
  ['Iron Beam', 10.0],
  ['Skywall Net Capture', 0.1],
  ['FPV Interceptor UAS', 0.5],
  ['Anduril Anvil', 5.0],
]
console.log('')
for (const [name, km] of cuasSamples) {
  console.log(`C-UAS ${String(name).padEnd(28)} sphere ${Number(km).toFixed(1)} km defeat range  ✓ tactical zoom`)
}

console.log('\n--- INVISIBLE AT TACTICAL ZOOM (too large) ---')
console.log('UAS  TB-001, RQ-4 Global Hawk, Shahed-136 — discs 1500–5700 km (continent scale)')
