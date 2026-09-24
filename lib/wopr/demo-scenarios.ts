/**
 * Demo WOPR scenarios, defined in code so the Arena and the home page show
 * them whatever the database holds. The store adds them for the demo tenant
 * when their rows are missing, and hides placeholder rows named "test N".
 *
 * Every laydown is fictional. Places and the events that motivate each
 * scenario are from public reporting (see `battlespace.notes`); unit names,
 * positions, speeds and sensor ranges are planning assumptions. Platform
 * speeds for catalogue types (Shahed-136, DJI Mavic 3) come from the
 * platform catalogue.
 *
 * History for running scenarios is produced by the real engine with a seeded
 * random stream, so it is exactly what the engine would have recorded.
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */

import { advanceScenario, dayNightAt } from '@/lib/wopr/engine'
import { mulberry32 } from '@/lib/wopr/fires-loop'
import type {
  RoutePoint,
  TickRecord,
  WoprPlatform,
  WorldState,
  WoprScenario,
} from '@/lib/wopr/types'

export const DEMO_CLASSIFICATION = 'UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY'

export const DEMO_SCENARIO_IDS = {
  ts27: '27a5ab5e-0000-4000-8000-000000000001',
  williamtown: '27a5ab5e-0000-4000-8000-000000000002',
  alMinhad: '27a5ab5e-0000-4000-8000-000000000003',
} as const

/** Placeholder rows left over from development ("test 1", "Test 2"). */
export const PLACEHOLDER_SCENARIO_NAME = /^test\b/i

export function isPlaceholderScenarioName(name: string): boolean {
  return PLACEHOLDER_SCENARIO_NAME.test(name.trim())
}

const DEMO_IDS = new Set<string>(Object.values(DEMO_SCENARIO_IDS))
export function isDemoScenarioId(id: string): boolean {
  return DEMO_IDS.has(id)
}

type PlatformInput = Omit<WoprPlatform, 'alt_m' | 'radiating' | 'destroyed'> &
  Partial<Pick<WoprPlatform, 'alt_m' | 'radiating' | 'destroyed'>>

function p(input: PlatformInput): WoprPlatform {
  return { alt_m: 0, radiating: true, destroyed: false, ...input }
}

// ── Talisman Sabre 27, Shoalwater Bay ───────────────────────────────────────

function ts27World(): WorldState {
  const blueUnit = {
    hq: 'Combat team HQ',
    recon: 'Recon drone team',
    relay: 'Relay drone detachment',
    fpv1: 'FPV attack team 1',
    fpv2: 'FPV attack team 2',
  }
  const reconRoute: RoutePoint[] = [
    { lat: -22.7, lon: 150.63, label: 'Checkpoint 1' },
    { lat: -22.655, lon: 150.585, label: 'Overwatch' },
    { lat: -22.625, lon: 150.535, label: 'Deep look' },
  ]
  return {
    battlespace: {
      terrain: 'coastal_scrub',
      weather: { wind_kts: 8, visibility_km: 10, cloud_base_ft: 3500 },
      time: { mission_elapsed_min: 0, day_night: 'night' },
      start_time_utc: '2027-08-12T20:00:00Z',
      area: 'Shoalwater Bay Training Area, QLD',
      notes:
        'Fictional laydown. Army has said it will field an FPV strike combat team at Talisman Sabre 2027, with counter-RAS developed alongside it (Defence Connect, 17 Aug and 24 Sep 2026). Team structure follows that reporting: a recon team finds the target and streams it to an attack team, relay drones extend reach. Unit names, positions, speeds and sensor ranges are planning assumptions. The start time assumes the reported exercise window (9 to 22 Aug 2027), which Defence has not confirmed.',
    },
    blue_orbat: {
      platforms: [
        p({ id: 'blue-ct-hq', name: 'Combat team HQ (battle captain)', lat: -22.735, lon: 150.645, alt_m: 70, side: 'blue', platform_type: 'c2-node', role: 'c2', unit: blueUnit.hq, range_km: 0 }),
        p({ id: 'blue-recon-uas', name: 'Recon drone (Vector class)', lat: -22.73, lon: 150.64, alt_m: 350, side: 'blue', platform_type: 'recon-uas', role: 'uas', sensor: 'eo_ir', sensor_range_km: 4, unit: blueUnit.recon, route: reconRoute, speed_kmh: 20, range_km: 0 }),
        p({ id: 'blue-relay-1', name: 'Relay drone 1', lat: -22.725, lon: 150.635, alt_m: 400, side: 'blue', platform_type: 'relay-uas', role: 'uas', unit: blueUnit.relay, route: [{ lat: -22.685, lon: 150.615, label: 'Relay orbit' }], speed_kmh: 25, range_km: 0 }),
        p({ id: 'blue-fpv-1', name: 'FPV attack team 1 (6 drones staged)', lat: -22.7, lon: 150.63, alt_m: 70, side: 'blue', platform_type: 'fpv-analog-5800', role: 'uas', unit: blueUnit.fpv1, radiating: false }),
        p({ id: 'blue-fpv-2', name: 'FPV attack team 2 (drone on standby)', lat: -22.72, lon: 150.58, alt_m: 170, side: 'blue', platform_type: 'fpv-analog-5800', role: 'uas', unit: blueUnit.fpv2 }),
      ],
    },
    red_orbat: {
      platforms: [
        p({ id: 'red-crs-hq', name: 'Counter-RAS detachment HQ', lat: -22.62, lon: 150.56, alt_m: 35, side: 'red', platform_type: 'c2-node', role: 'c2', unit: 'Counter-RAS detachment', range_km: 0 }),
        p({ id: 'red-jammer', name: 'Vehicle RF jammer', lat: -22.64, lon: 150.52, alt_m: 205, side: 'red', platform_type: 'rf-jammer', role: 'ew', unit: 'Counter-RAS detachment', range_km: 8 }),
        p({ id: 'red-rf-det-1', name: 'Passive RF detector 1', lat: -22.66, lon: 150.6, alt_m: 45, side: 'red', platform_type: 'rf-detector', role: 'sensor', sensor: 'rf', unit: 'Detection section', radiating: false, range_km: 0 }),
        p({ id: 'red-rf-det-2', name: 'Passive RF detector 2', lat: -22.6, lon: 150.62, alt_m: 20, side: 'red', platform_type: 'rf-detector', role: 'sensor', sensor: 'rf', unit: 'Detection section', radiating: false, range_km: 0 }),
        p({ id: 'red-eoir', name: 'EO/IR drone camera', lat: -22.68, lon: 150.55, alt_m: 70, side: 'red', platform_type: 'eo-ir-sensor', role: 'sensor', sensor: 'eo_ir', sensor_range_km: 6, unit: 'Detection section', radiating: false, range_km: 0 }),
        p({ id: 'red-gun-team', name: 'Counter-drone gun team', lat: -22.625, lon: 150.565, alt_m: 35, side: 'red', platform_type: 'cuas-gun', role: 'cuas', unit: 'Counter-RAS detachment', radiating: false, range_km: 1 }),
      ],
    },
    comms_status: { 'blue-drone-c2': 'up', 'blue-relay-link': 'up', 'red-c2': 'up' },
  }
}

// ── RAAF Base Williamtown ───────────────────────────────────────────────────

const WILLIAMTOWN = { lat: -32.7945, lon: 151.84 }

function williamtownWorld(): WorldState {
  return {
    battlespace: {
      terrain: 'airfield_coastal',
      weather: { wind_kts: 12, visibility_km: 10, cloud_base_ft: 2500 },
      time: { mission_elapsed_min: 0, day_night: 'night' },
      start_time_utc: '2026-10-14T09:30:00Z',
      area: 'RAAF Base Williamtown, NSW',
      notes:
        'Fictional response drill. Drone incursions at RAAF Base Williamtown were reported in July and August 2026 and referred to NSW Police (ABC, 20 Aug 2026). Public reporting does not say what counter-drone equipment the base holds, so the Blue laydown is generic. Defence may detect, disable or destroy threatening drones in support of police under the Counter-UXS Measures Regulations 2025. Positions, sensor ranges and drone routes are planning assumptions.',
    },
    installations: [{ id: 'inst-williamtown', name: 'RAAF Base Williamtown', side: 'blue', ...WILLIAMTOWN }],
    red_orbat: {
      platforms: [
        p({ id: 'red-quad-1', name: 'Unknown quadcopter 1 (Mavic class)', lat: -32.772, lon: 151.868, alt_m: 120, side: 'red', platform_type: 'dji-mavic-3', role: 'uas', unit: 'Unknown operators', route: [{ lat: -32.788, lon: 151.842, label: 'the runway approach' }], speed_kmh: 30, range_km: 0 }),
        p({ id: 'red-quad-2', name: 'Unknown quadcopter 2 (thermal camera)', lat: -32.815, lon: 151.86, alt_m: 100, side: 'red', platform_type: 'autel-evo-max-4t', role: 'uas', unit: 'Unknown operators', route: [{ lat: -32.8, lon: 151.85, label: 'the aircraft shelters' }], speed_kmh: 20, range_km: 0 }),
        p({ id: 'red-operator', name: 'Suspected operator vehicle', lat: -32.772, lon: 151.868, alt_m: 20, side: 'red', platform_type: 'ground-control-station', role: 'c2', unit: 'Unknown operators', range_km: 0 }),
      ],
    },
    blue_orbat: {
      platforms: [
        p({ id: 'blue-bdoc', name: 'Base defence operations centre', lat: -32.7945, lon: 151.84, alt_m: 10, side: 'blue', platform_type: 'c2-node', role: 'c2', unit: 'Base security', range_km: 0 }),
        p({ id: 'blue-rf-det', name: 'Passive RF detector', lat: -32.788, lon: 151.828, alt_m: 15, side: 'blue', platform_type: 'rf-detector', role: 'sensor', sensor: 'rf', unit: 'Base C-UAS cell', radiating: false, range_km: 0 }),
        p({ id: 'blue-radar', name: 'Drone detection radar', lat: -32.8, lon: 151.85, alt_m: 15, side: 'blue', platform_type: 'cuas-radar', role: 'sensor', sensor: 'radar', sensor_range_km: 5, unit: 'Base C-UAS cell', range_km: 5 }),
        p({ id: 'blue-eoir', name: 'EO/IR camera', lat: -32.805, lon: 151.845, alt_m: 12, side: 'blue', platform_type: 'eo-ir-sensor', role: 'sensor', sensor: 'eo_ir', sensor_range_km: 3, unit: 'Base C-UAS cell', radiating: false, range_km: 0 }),
        p({ id: 'blue-jam-team', name: 'Handheld jammer team', lat: -32.78, lon: 151.86, alt_m: 18, side: 'blue', platform_type: 'handheld-jammer', role: 'ew', unit: 'Security forces patrol', radiating: false, range_km: 1 }),
      ],
    },
    comms_status: { 'blue-base-net': 'up', 'police-liaison': 'up' },
  }
}

// ── Al Minhad Air Base ──────────────────────────────────────────────────────

const AL_MINHAD = { lat: 25.0228, lon: 55.3636 }

/** A point `km` from the base on `bearingDeg` (true), flat-earth approximation. */
function offset(km: number, bearingDeg: number, lateralKm = 0): { lat: number; lon: number } {
  const b = (bearingDeg * Math.PI) / 180
  const perp = b + Math.PI / 2
  const north = km * Math.cos(b) + lateralKm * Math.cos(perp)
  const east = km * Math.sin(b) + lateralKm * Math.sin(perp)
  return {
    lat: AL_MINHAD.lat + north / 111.0,
    lon: AL_MINHAD.lon + east / (111.0 * Math.cos((AL_MINHAD.lat * Math.PI) / 180)),
  }
}

function alMinhadWorld(): WorldState {
  const aim: RoutePoint[] = [
    { ...offset(0.6, 20), label: 'Aim point A' },
    { ...offset(0.5, 120), label: 'Aim point B' },
    { ...offset(0.7, 250), label: 'Aim point C' },
    { ...offset(0.4, 330), label: 'Aim point D' },
  ].map((a) => ({ ...a, note: 'Intercepts and impacts are not adjudicated here; see Swarm saturation for leakers' }))

  const shahed = (n: number, wave: 1 | 2, rangeKm: number, lateralKm: number): WoprPlatform =>
    p({
      id: `red-owa-${wave}-${n}`,
      name: `Shahed-136 W${wave}-${n}`,
      ...offset(rangeKm, 20, lateralKm),
      alt_m: 1000,
      side: 'red',
      platform_type: 'shahed-136',
      role: 'uas',
      unit: `Raid wave ${wave}`,
      radiating: false,
      route: [aim[(n - 1) % aim.length]],
      speed_kmh: 185,
      range_km: 0,
    })

  return {
    battlespace: {
      terrain: 'desert_airfield',
      weather: { wind_kts: 6, visibility_km: 8, cloud_base_ft: 12000 },
      time: { mission_elapsed_min: 0, day_night: 'night' },
      start_time_utc: '2026-10-20T19:40:00Z',
      area: 'Al Minhad Air Base, UAE',
      notes:
        'Fictional raid. Drone strikes hit Al Minhad Air Base on 3 Mar 2026 (ABC, attributed to Iran) and 18 Mar 2026, when Australian accommodation and a medical facility were damaged (Defence statement). The Blue air defence layers are generic, not the base\'s actual defences. Raid size, launch bearing and sensor ranges are planning assumptions; Shahed-136 speed (185 km/h) is from the platform catalogue. The engine does not adjudicate intercepts or impacts.',
    },
    installations: [{ id: 'inst-al-minhad', name: 'Al Minhad Air Base', side: 'blue', ...AL_MINHAD }],
    red_orbat: {
      platforms: [
        shahed(1, 1, 120, -4),
        shahed(2, 1, 121, -1.5),
        shahed(3, 1, 122, 1.5),
        shahed(4, 1, 120, 4),
        shahed(1, 2, 200, -5),
        shahed(2, 2, 202, -2),
        shahed(3, 2, 201, 2),
        shahed(4, 2, 203, 5),
      ],
    },
    blue_orbat: {
      platforms: [
        p({ id: 'blue-adoc', name: 'Air defence operations centre', ...AL_MINHAD, alt_m: 45, side: 'blue', platform_type: 'c2-node', role: 'c2', unit: 'Base air defence', range_km: 0 }),
        p({ id: 'blue-surv-radar', name: 'Air surveillance radar', ...offset(1.2, 45), alt_m: 50, side: 'blue', platform_type: 'ad-radar', role: 'sensor', sensor: 'radar', sensor_range_km: 40, unit: 'Base air defence', range_km: 40 }),
        p({ id: 'blue-sam', name: 'Medium-range SAM fire unit', ...offset(2.5, 10), alt_m: 45, side: 'blue', platform_type: 'sam-fire-unit', role: 'cuas', unit: 'Base air defence', radiating: false, range_km: 15 }),
        p({ id: 'blue-gun', name: 'Counter-drone gun system', ...offset(0.9, 350), alt_m: 45, side: 'blue', platform_type: 'cuas-gun', role: 'cuas', unit: 'Point defence', radiating: false, range_km: 3 }),
        p({ id: 'blue-jammer', name: 'RF and GNSS jammer', ...offset(0.7, 90), alt_m: 45, side: 'blue', platform_type: 'rf-jammer', role: 'ew', unit: 'Point defence', radiating: false, range_km: 5 }),
        p({ id: 'blue-eoir', name: 'EO/IR tracker', ...offset(0.8, 200), alt_m: 50, side: 'blue', platform_type: 'eo-ir-sensor', role: 'sensor', sensor: 'eo_ir', sensor_range_km: 10, unit: 'Point defence', radiating: false, range_km: 0 }),
      ],
    },
    comms_status: { 'blue-ad-net': 'up', 'host-nation-link': 'degraded' },
  }
}

// ── Build (engine-generated history) ────────────────────────────────────────

interface DemoBuild {
  scenario: WoprScenario
  ticks: TickRecord[]
}

/** Fixed clock for recorded history so the demo data is identical on every build. */
const HISTORY_EPOCH = Date.UTC(2026, 8, 24, 0, 0, 0)

function build(id: string, name: string, world: WorldState, turns: number, seed: number): DemoBuild {
  const initial = structuredClone(world) as WorldState
  initial.battlespace.time.day_night = dayNightAt(initial, 0)
  let scenario: WoprScenario = {
    id,
    tenant_id: 'demo',
    name,
    classification: DEMO_CLASSIFICATION,
    world_state: structuredClone(initial) as WorldState,
    initial_world_state: initial,
    elapsed_min: 0,
    status: 'draft',
    parent_scenario_id: null,
    branch_turn: null,
  }
  const random = mulberry32(seed)
  const ticks: TickRecord[] = []
  for (let i = 1; i <= turns; i++) {
    const now = new Date(HISTORY_EPOCH + i * 60_000)
    const next = advanceScenario(scenario, { random, now })
    scenario = next.scenario
    ticks.push({
      turn: next.tick.turn,
      elapsed_min: next.tick.elapsed_min,
      tick: next.tick,
      world_state: structuredClone(scenario.world_state) as WorldState,
      created_at: now.toISOString(),
    })
  }
  return { scenario, ticks }
}

let cache: DemoBuild[] | null = null

function builds(): DemoBuild[] {
  if (!cache) {
    cache = [
      build(DEMO_SCENARIO_IDS.ts27, 'Talisman Sabre 27: Combat team drone strike vs counter-RAS', ts27World(), 4, 2701),
      build(DEMO_SCENARIO_IDS.alMinhad, 'Al Minhad Air Base: One-way attack drone saturation', alMinhadWorld(), 1, 2603),
      build(DEMO_SCENARIO_IDS.williamtown, 'RAAF Williamtown: Drone incursion response', williamtownWorld(), 0, 2602),
    ]
  }
  return cache
}

/** The three demo scenarios for a tenant (fresh copies). */
export function demoWoprScenarios(tenantId: string): WoprScenario[] {
  return builds().map((b) => ({ ...(structuredClone(b.scenario) as WoprScenario), tenant_id: tenantId }))
}

/** Engine-recorded history for a demo scenario (fresh copy), oldest first. */
export function demoWoprTicks(id: string): TickRecord[] {
  const b = builds().find((x) => x.scenario.id === id)
  return b ? (structuredClone(b.ticks) as TickRecord[]) : []
}
