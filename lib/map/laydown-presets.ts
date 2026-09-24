/**
 * Map Intel laydown presets: combat team (Talisman Sabre 27, Shoalwater Bay),
 * RAAF Williamtown base defence, Al Minhad deployed base.
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 *
 * Presets resolve kit by name against whatever catalogue is live (the DB may or
 * may not carry the LAND 156 rows yet). Anything missing falls back to a clearly
 * labelled generic entry and the fallback is reported, never silently swapped.
 * Positions are notional training positions, not reported unit locations.
 */
import { PLATFORMS as SEED_PLATFORMS } from '@/data/seed-platforms'
import { computeUasEnvelope } from '@/lib/map/format'
import { CATEGORY_LABELS } from '@/lib/platforms/constants'
import { resolvePlatformImagePath } from '@/lib/platforms/image-resolve'
import type { PlatformCategory } from '@/lib/types'
import type {
  ForceSide,
  MapAssetsPayload,
  MapCuasAsset,
  MapEffectorAsset,
  MapRadarAsset,
  MapUasAsset,
  MissionPlan,
  MissionWaypoint,
  PlacedCuas,
  PlacedEffector,
  PlacedRadar,
  PlacedUas,
  UasRole,
} from '@/lib/map/types'

export type LaydownPresetId = 'combat-team' | 'williamtown' | 'al-minhad'

export interface PresetResolution {
  wanted: string
  used: string
  fallback: boolean
}

export interface PresetLaydown {
  id: LaydownPresetId
  name: string
  viewport: { lon: number; lat: number; height_m: number }
  placedUas: PlacedUas[]
  placedCuas: PlacedCuas[]
  placedRadars: PlacedRadar[]
  placedEffectors: PlacedEffector[]
  resolution: PresetResolution[]
  notes: string[]
}

/* ------------------------------ generic fallbacks ------------------------------ */

export const GENERIC_RF_JAMMER_ID = 'spectral-generic-rf-jammer'
export const GENERIC_RF_DETECTOR_ID = 'spectral-generic-rf-detector'

/**
 * Generic stand-ins used when a named system is not in the live catalogue.
 * The 400 MHz to 6 GHz span is the DroneBuster detection band (Ondas / DZYNE,
 * Ex Austral Shield 2026). The 2 km range is a planning assumption.
 */
export const GENERIC_PRESET_CUAS: MapCuasAsset[] = [
  {
    id: GENERIC_RF_JAMMER_ID,
    name: 'RF jammer (400 MHz to 6 GHz)',
    categoryLabel: 'RF Jamming',
    image_url: null,
    defeat_range_m: 2000,
    defeat_range_km: 2,
    defeat_methods: ['RF_jamming'],
    bands_mhz: [{ label: 'jam 400 MHz to 6 GHz', lo_mhz: 400, hi_mhz: 6000 }],
    planningAssumption: true,
    note: 'Generic stand-in. Band 400 MHz to 6 GHz; 2 km range is a planning assumption.',
  },
  {
    id: GENERIC_RF_DETECTOR_ID,
    name: 'Passive RF detector (400 MHz to 6 GHz)',
    categoryLabel: 'C-UAS',
    image_url: null,
    defeat_range_m: 2000,
    defeat_range_km: 2,
    defeat_methods: ['detect'],
    bands_mhz: [{ label: 'detect 400 MHz to 6 GHz', lo_mhz: 400, hi_mhz: 6000 }],
    planningAssumption: true,
    note: 'Generic passive detector. Does not radiate. 2 km range is a planning assumption.',
  },
]

/**
 * Airframes the presets need that may be missing when the platform table is
 * unreachable (the map then runs on the offline A3DM catalogue). They come from
 * the curated spectrum dossier in data/seed-platforms, so no spec is invented.
 */
export const SEED_UAS_STANDIN_IDS = ['shahed-136', 'fpv-analog-5800'] as const

function seedCategory(label: string | null | undefined): PlatformCategory {
  const l = (label ?? '').toLowerCase()
  if (l.includes('fpv')) return 'FPV'
  if (l.includes('owa') || l.includes('loiter')) return 'loitering_munition'
  return 'tactical'
}

/** Map asset from a curated spectrum-dossier platform. Endurance is derived as range / speed. */
export function seedUasAsset(id: string): MapUasAsset | null {
  const p = SEED_PLATFORMS.find((x) => x.id === id)
  if (!p || !p.range_km || !p.speed_kmh) return null
  const category = seedCategory(p.category)
  return {
    id: p.id,
    name: p.name,
    slug: p.id,
    category,
    categoryLabel: CATEGORY_LABELS[category] ?? category,
    side: p.side === 'red' || p.side === 'blue' ? p.side : 'neutral',
    manufacturer: p.origin ?? null,
    catalog_tier: 'military',
    payloads: [],
    rangeEstimated: false,
    image_url: resolvePlatformImagePath(p.id),
    max_altitude_agl_m: p.ceiling_m ?? 500,
    altitude_reference: 'AGL',
    max_range_km: p.range_km,
    max_speed_kmh: p.speed_kmh,
    endurance_min: Math.round((p.range_km / p.speed_kmh) * 60),
    climb_rate_mpm: 500,
    control_link_freq: p.control_link_freq ?? null,
  }
}

/** Fold the generic C-UAS stand-ins and dossier airframes into the catalogue so presets and saved plans always hydrate. */
export function ensurePresetFallbackAssets(assets: MapAssetsPayload): MapAssetsPayload {
  const seenCuas = new Set(assets.cuas.map((c) => c.id))
  const extraCuas = GENERIC_PRESET_CUAS.filter((c) => !seenCuas.has(c.id))
  const seenUas = new Set(assets.uas.map((u) => u.id))
  const extraUas = SEED_UAS_STANDIN_IDS.filter((id) => !seenUas.has(id))
    .map(seedUasAsset)
    .filter((u): u is MapUasAsset => u != null)
  if (extraCuas.length === 0 && extraUas.length === 0) return assets
  return {
    ...assets,
    uas: extraUas.length ? [...assets.uas, ...extraUas] : assets.uas,
    cuas: extraCuas.length ? [...assets.cuas, ...extraCuas] : assets.cuas,
  }
}

/* ------------------------------ resolution ------------------------------ */

type Finder = { patterns: RegExp[]; ids?: string[] }

function findIn<T extends { id: string; name: string }>(list: T[], f: Finder): T | null {
  for (const id of f.ids ?? []) {
    const hit = list.find((a) => a.id === id)
    if (hit) return hit
  }
  for (const re of f.patterns) {
    const hit = list.find((a) => re.test(a.name))
    if (hit) return hit
  }
  return null
}

class Resolver {
  resolution: PresetResolution[] = []
  constructor(private catalog: MapAssetsPayload) {}

  uas(wanted: string, ...finders: Finder[]): MapUasAsset | null {
    for (let i = 0; i < finders.length; i++) {
      const hit = findIn(this.catalog.uas, finders[i])
      if (hit) {
        this.note(wanted, hit.name, i > 0)
        return hit
      }
    }
    this.note(wanted, 'not in catalogue, left out', true)
    return null
  }

  /**
   * Resolve a C-UAS by name. The display label always carries the real system
   * name: exact hit "DroneBuster", family stand-in "DroneGun Mk4 (DroneGun
   * Tactical specs)", generic stand-in "DroneBuster (assumed specs)".
   */
  cuas(
    wanted: string,
    system: string,
    finders: Finder[],
    fallbackId: string | null,
  ): { asset: MapCuasAsset; label: string } | null {
    for (let i = 0; i < finders.length; i++) {
      const hit = findIn(this.catalog.cuas, finders[i])
      if (hit) {
        this.note(wanted, hit.name, i > 0)
        return { asset: hit, label: i === 0 ? system : `${system} (${hit.name} specs)` }
      }
    }
    const generic = fallbackId
      ? this.catalog.cuas.find((c) => c.id === fallbackId) ?? GENERIC_PRESET_CUAS.find((c) => c.id === fallbackId) ?? null
      : null
    this.note(wanted, generic ? `${generic.name}, assumed specs` : 'not in catalogue, left out', true)
    return generic ? { asset: generic, label: `${system} (assumed specs)` } : null
  }

  radar(wanted: string, ...ids: string[]): MapRadarAsset | null {
    const hit = ids.map((id) => this.catalog.radars.find((r) => r.id === id)).find(Boolean) ?? null
    this.note(wanted, hit ? hit.name : 'not in catalogue, left out', !hit || hit.id !== ids[0])
    return hit
  }

  effector(wanted: string, ...ids: string[]): MapEffectorAsset | null {
    const hit = ids.map((id) => this.catalog.effectors.find((e) => e.id === id)).find(Boolean) ?? null
    this.note(wanted, hit ? hit.name : 'not in catalogue, left out', !hit || hit.id !== ids[0])
    return hit
  }

  private note(wanted: string, used: string, fallback: boolean) {
    this.resolution.push({ wanted, used, fallback })
  }
}

/* ------------------------------ builders ------------------------------ */

function haversineKm(aLon: number, aLat: number, bLon: number, bLat: number): number {
  const R = 6371
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLon = ((bLon - aLon) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

/**
 * Provisional straight mission (launch, climb, terminal, goal). Map Intel's
 * planner replans it against opposing threats once terrain is sampled.
 */
function provisionalMission(
  asset: MapUasAsset,
  from: { lon: number; lat: number },
  goal: { lon: number; lat: number; kind: 'target' | 'aoi' },
  terrain_m: number,
): MissionPlan {
  const cruiseAgl = Math.min(asset.max_altitude_agl_m, 150)
  const speed = Math.max(1, asset.max_speed_kmh)
  const at = (f: number) => ({ lon: from.lon + (goal.lon - from.lon) * f, lat: from.lat + (goal.lat - from.lat) * f })
  const mk = (idx: number, f: number, altAgl: number, kind: MissionWaypoint['kind'], spd: number): MissionWaypoint => {
    const p = at(f)
    return {
      id: `wp-${idx}-${p.lon.toFixed(5)}-${p.lat.toFixed(5)}`,
      lon: p.lon,
      lat: p.lat,
      terrainAMSL: terrain_m,
      alt_m: terrain_m + altAgl,
      speed_kmh: spd,
      kind,
    }
  }
  const waypoints: MissionWaypoint[] = [
    mk(0, 0, 2, 'start', speed),
    mk(1, 0.08, cruiseAgl, 'transit', speed),
    mk(2, 0.88, cruiseAgl, 'terminal', speed),
    mk(3, 1, goal.kind === 'target' ? 5 : cruiseAgl, 'goal', speed * 0.85),
  ]
  return {
    goalKind: goal.kind,
    goalLon: goal.lon,
    goalLat: goal.lat,
    goalTerrainAMSL: terrain_m,
    waypoints,
    emcon: false,
    routeObjective: 'pk',
    manualOverride: true,
    totalDistance_km: Math.round(haversineKm(from.lon, from.lat, goal.lon, goal.lat) * 10) / 10,
    maxPk_pct: 0,
    maxPd_pct: 0,
    pdExposure_km: 0,
    pkExposure_km: 0,
    pkThresholdExceeded: false,
    pdThresholdExceeded: false,
    pathMode: 'soft-minimize',
    updatedAt: new Date().toISOString(),
  }
}

interface UasSpec {
  id: string
  asset: MapUasAsset | null
  lon: number
  lat: number
  side: ForceSide
  role: UasRole
  callsign: string
  launch_min: number
  goal?: { lon: number; lat: number; kind: 'target' | 'aoi' }
  /** Override the envelope disc radius (long-range OWA would otherwise draw a 500 km disc). */
  lateralRadius_m?: number
}

function placeUas(s: UasSpec, terrain_m: number): PlacedUas | null {
  if (!s.asset) return null
  const env = computeUasEnvelope(s.asset, terrain_m)
  return {
    instanceId: s.id,
    asset: s.asset,
    lon: s.lon,
    lat: s.lat,
    terrainAMSL: terrain_m,
    discAltitude_m: env.discAltitude_m,
    lateralRadius_m: s.lateralRadius_m ?? env.lateralRadius_m,
    ceilingAMSL_m: env.ceilingAMSL_m,
    annotationTime_min: env.annotationTime_min,
    effectiveRange_km: s.lateralRadius_m ? s.lateralRadius_m / 1000 : env.operationalRange_km,
    infoPanelClosed: true,
    side: s.side,
    role: s.role,
    callsign: s.callsign,
    launchTime_min: s.launch_min,
    mission: s.goal ? provisionalMission(s.asset, s, s.goal, terrain_m) : undefined,
  }
}

function placeCuas(
  id: string,
  resolved: { asset: MapCuasAsset; label: string } | null,
  lon: number,
  lat: number,
  side: ForceSide,
  post: string,
  terrain_m: number,
): PlacedCuas | null {
  if (!resolved) return null
  const callsign = post ? `${post} ${resolved.label}` : resolved.label
  return { instanceId: id, asset: resolved.asset, lon, lat, terrainAMSL: terrain_m, hasTerrainMasking: false, side, callsign }
}

function placeRadar(id: string, asset: MapRadarAsset | null, lon: number, lat: number, terrain_m: number): PlacedRadar | null {
  return asset ? { instanceId: id, asset, lon, lat, terrainAMSL: terrain_m } : null
}

function placeEffector(id: string, asset: MapEffectorAsset | null, lon: number, lat: number, terrain_m: number): PlacedEffector | null {
  return asset ? { instanceId: id, asset, lon, lat, terrainAMSL: terrain_m } : null
}

function compact<T>(list: Array<T | null>): T[] {
  return list.filter((x): x is T => x != null)
}

/* ------------------------------ finders ------------------------------ */

/** RF-linked FPV strike quad. Fibre-optic variants are excluded on purpose: they are a mitigation, not the default. */
const FPV: Finder[] = [
  { ids: ['fpv-rc'], patterns: [/^rc fpv attack/i] },
  { ids: ['fpv-analog-5800'], patterns: [] },
  { patterns: [/archer.*fpv/i, /^(?!.*fib).*\bfpv\b.*(strike|attack)/i] },
]
const COMPANY_MR: Finder[] = [
  { patterns: [/corvo x/i] },
  { patterns: [/corvo/i, /mavic 3 enterprise thermal/i] },
]
const VECTOR: Finder[] = [
  { ids: ['quantum-vector-isr'], patterns: [/quantum.*vector \(isr\)/i] },
  { patterns: [/quantum.*vector/i, /puma/i, /integrator/i] },
]
const RED_ISR: Finder[] = [{ ids: ['dji-mavic-3'], patterns: [/^dji mavic 3$/i] }, { patterns: [/mavic/i] }]

/* ------------------------------ presets ------------------------------ */

/**
 * Talisman Sabre 27 combat team at Shoalwater Bay Training Area (centre 22.55 S
 * 150.49 E). Blue (1 Bde RAS battle group): company multi-role drone team,
 * battle-group surveillance and attack teams, FPV teams on relays to about 20 km,
 * own C-UAS (DroneBuster, DroneGun Mk4, RfPatrol Mk2, Sky Control) and a C-UAS
 * radar. Red (7 Bde counter-RAS OPFOR): ISR and FPV drones plus a jammer.
 */
function buildCombatTeam(catalog: MapAssetsPayload): PresetLaydown {
  const r = new Resolver(catalog)
  const T = 60 // terrain guess (m AMSL); replaced by sampled terrain once tiles load

  const fpv = r.uas('FPV strike drone (explosive FPV, < $5k class)', ...FPV)
  const relay = fpv // repeater drones are FPV-class quads holding station
  const companyMr = r.uas('Company multi-role drone (Corvo X class)', ...COMPANY_MR)
  const vector = r.uas('Battle-group surveillance drone (Quantum Vector)', ...VECTOR)
  const redIsr = r.uas('OPFOR ISR quadcopter', ...RED_ISR)
  const redFpv = r.uas('OPFOR FPV strike drone', ...FPV)

  const droneBuster = r.cuas('DroneBuster (Ondas / DZYNE)', 'DroneBuster', [{ patterns: [/dronebuster/i] }], GENERIC_RF_JAMMER_ID)
  const droneGun = r.cuas(
    'DroneGun Mk4 (DroneShield)',
    'DroneGun Mk4',
    [{ ids: ['dronegun-mk4'], patterns: [/dronegun\s*mk\s*4/i] }, { ids: ['dronegun-tactical'], patterns: [/dronegun/i] }],
    GENERIC_RF_JAMMER_ID,
  )
  const rfPatrol = r.cuas('RfPatrol Mk2 (DroneShield)', 'RfPatrol Mk2', [{ ids: ['rfpatrol-mk2'], patterns: [/rf\s*patrol/i] }], GENERIC_RF_DETECTOR_ID)
  const skyControl = r.cuas('Sky Control (KeyOptions)', 'Sky Control', [{ patterns: [/sky\s*control/i] }], GENERIC_RF_DETECTOR_ID)
  const redJammer = r.cuas(
    'OPFOR vehicle EW jammer',
    'EW jammer',
    [{ ids: ['military-ew-generic'], patterns: [/military ew/i] }],
    GENERIC_RF_JAMMER_ID,
  )
  const echoGuard = r.radar('Echodyne EchoGuard (LAND 156 radar)', 'radar-echoguard', 'radar-drone-sentry-x')

  const hq = { lon: 150.405, lat: -22.64 }
  const targetA = { lon: 150.505, lat: -22.525, kind: 'target' as const }
  const targetB = { lon: 150.525, lat: -22.54, kind: 'target' as const }

  const uas = compact([
    placeUas({ id: 'ts27-blue-mr-1', asset: companyMr, lon: 150.395, lat: -22.632, side: 'blue', role: 'multirole', callsign: 'Coy drone 1', launch_min: 0, goal: { lon: 150.47, lat: -22.56, kind: 'aoi' } }, T),
    placeUas({ id: 'ts27-blue-isr-1', asset: vector, lon: 150.385, lat: -22.65, side: 'blue', role: 'isr', callsign: 'BG surv 1', launch_min: 0, goal: { lon: 150.53, lat: -22.52, kind: 'aoi' } }, T),
    placeUas({ id: 'ts27-blue-relay-a', asset: relay, lon: 150.45, lat: -22.588, side: 'blue', role: 'relay', callsign: 'Relay A', launch_min: 5 }, T),
    placeUas({ id: 'ts27-blue-relay-b', asset: relay, lon: 150.47, lat: -22.6, side: 'blue', role: 'relay', callsign: 'Relay B', launch_min: 5 }, T),
    placeUas({ id: 'ts27-blue-fpv-a1', asset: fpv, lon: hq.lon, lat: hq.lat, side: 'blue', role: 'strike', callsign: 'FPV A1', launch_min: 12, goal: targetA }, T),
    placeUas({ id: 'ts27-blue-fpv-b1', asset: fpv, lon: 150.425, lat: -22.645, side: 'blue', role: 'strike', callsign: 'FPV B1', launch_min: 15, goal: targetB }, T),
    placeUas({ id: 'ts27-red-isr-1', asset: redIsr, lon: 150.52, lat: -22.522, side: 'red', role: 'isr', callsign: 'OPFOR ISR', launch_min: 0, goal: { lon: 150.43, lat: -22.62, kind: 'aoi' } }, T),
    placeUas({ id: 'ts27-red-fpv-1', asset: redFpv, lon: 150.51, lat: -22.53, side: 'red', role: 'strike', callsign: 'OPFOR FPV', launch_min: 20, goal: { lon: 150.41, lat: -22.638, kind: 'target' } }, T),
  ])

  const cuas = compact([
    placeCuas('ts27-blue-dronebuster', droneBuster, 150.41, -22.638, 'blue', 'Coy HQ', T),
    placeCuas('ts27-blue-dronegun', droneGun, 150.455, -22.592, 'blue', 'Fwd pl', T),
    placeCuas('ts27-blue-rfpatrol', rfPatrol, 150.415, -22.645, 'blue', '', T),
    placeCuas('ts27-blue-skycontrol', skyControl, 150.4, -22.635, 'blue', '', T),
    placeCuas('ts27-red-jammer', redJammer, 150.515, -22.528, 'red', 'OPFOR', T),
  ])

  const radars = compact([placeRadar('ts27-blue-echoguard', echoGuard, 150.408, -22.642, T)])

  return {
    id: 'combat-team',
    name: 'Talisman Sabre 27: Combat team drone strike vs counter-RAS',
    viewport: { lon: 150.46, lat: -22.585, height_m: 26_000 },
    placedUas: uas,
    placedCuas: cuas,
    placedRadars: radars,
    placedEffectors: [],
    resolution: r.resolution,
    notes: [
      'Notional positions in Shoalwater Bay Training Area. FPV teams stage 6 drones per operator; one sortie per team is shown.',
      'Relays hold station for the FPV teams. Open Fratricide to check own jammers against own drone links.',
    ],
  }
}

/** RAAF Williamtown base defence against a small-drone incursion (runway 12/30, 32.795 S 151.834 E). */
function buildWilliamtown(catalog: MapAssetsPayload): PresetLaydown {
  const r = new Resolver(catalog)
  const T = 8
  const base = { lon: 151.8344, lat: -32.795 }

  const intruder = r.uas('Incursion quadcopter (COTS, Mavic 3 class)', ...RED_ISR)
  const intruderHeavy = r.uas('Incursion heavy-lift quadcopter (Matrice class)', { ids: ['dji-matrice-300-rtk'], patterns: [/matrice 300/i] }, { patterns: [/matrice/i] })
  const securityIsr = r.uas('Base security ISR quadcopter (thermal)', { patterns: [/mavic 3 enterprise thermal/i] }, { patterns: [/mavic 3/i] })

  const siteDefeat = r.cuas(
    'Fixed site detect and defeat (DroneSentry class)',
    'DroneSentry',
    [{ ids: ['dronesentry-sentrycs'], patterns: [/dronesentry/i] }, { ids: ['drone-dome'], patterns: [/drone dome/i] }],
    GENERIC_RF_JAMMER_ID,
  )
  const handheld = r.cuas(
    'Handheld jammer (DroneGun Mk4)',
    'DroneGun Mk4',
    [{ ids: ['dronegun-mk4'], patterns: [/dronegun\s*mk\s*4/i] }, { ids: ['dronegun-tactical'], patterns: [/dronegun/i] }],
    GENERIC_RF_JAMMER_ID,
  )
  const detector = r.cuas('Passive RF detector (RfPatrol Mk2)', 'RfPatrol Mk2', [{ ids: ['rfpatrol-mk2'], patterns: [/rf\s*patrol/i] }], GENERIC_RF_DETECTOR_ID)
  const cuasRadar = r.radar('C-UAS radar (EchoGuard)', 'radar-echoguard', 'radar-drone-sentry-x', 'radar-blighter-a400')
  const surveillance = r.radar('Surveillance radar (RPS-42 class)', 'radar-rps-42', 'radar-giraffe-amb')

  const uas = compact([
    placeUas({ id: 'wlm-red-uas-1', asset: intruder, lon: 151.862, lat: -32.815, side: 'red', role: 'isr', callsign: 'Track 1', launch_min: 0, goal: { lon: 151.84, lat: -32.797, kind: 'aoi' } }, T),
    placeUas({ id: 'wlm-red-uas-2', asset: intruder, lon: 151.805, lat: -32.772, side: 'red', role: 'isr', callsign: 'Track 2', launch_min: 3, goal: { lon: 151.828, lat: -32.79, kind: 'aoi' } }, T),
    placeUas({ id: 'wlm-red-uas-3', asset: intruderHeavy, lon: 151.87, lat: -32.775, side: 'red', role: 'isr', callsign: 'Track 3', launch_min: 6, goal: { lon: 151.845, lat: -32.8, kind: 'aoi' } }, T),
    placeUas({ id: 'wlm-blue-isr-1', asset: securityIsr, lon: 151.838, lat: -32.802, side: 'blue', role: 'isr', callsign: 'Security ISR', launch_min: 4, goal: { lon: 151.858, lat: -32.812, kind: 'aoi' } }, T),
  ])

  const cuas = compact([
    placeCuas('wlm-blue-site', siteDefeat, base.lon, base.lat, 'blue', 'Airfield', T),
    placeCuas('wlm-blue-handheld-1', handheld, 151.852, -32.806, 'blue', 'QRF', T),
    placeCuas('wlm-blue-detect-1', detector, 151.82, -32.786, 'blue', 'North gate', T),
    placeCuas('wlm-blue-detect-2', detector, 151.848, -32.81, 'blue', 'South gate', T),
  ])

  const radars = compact([
    placeRadar('wlm-blue-cuas-radar', cuasRadar, 151.836, -32.793, T),
    placeRadar('wlm-blue-surv-radar', surveillance, 151.83, -32.798, T),
  ])

  return {
    id: 'williamtown',
    name: 'RAAF Williamtown: Drone incursion response',
    viewport: { lon: 151.842, lat: -32.797, height_m: 10_000 },
    placedUas: uas,
    placedCuas: cuas,
    placedRadars: radars,
    placedEffectors: [],
    resolution: r.resolution,
    notes: [
      'Notional detect and defeat layers. Defence has not said publicly how it responded to the 2026 incursions.',
      'Security ISR is an own drone; the fratricide check shows where own jammers would cut it.',
    ],
  }
}

/** Al Minhad Air Base (runway 09/27, 25.027 N 55.366 E): one-way attack drone raid vs a notional layered defence. */
function buildAlMinhad(catalog: MapAssetsPayload): PresetLaydown {
  const r = new Resolver(catalog)
  const T = 45
  const base = { lon: 55.3663, lat: 25.0268 }

  const owa = r.uas(
    'Shahed-136 class one-way attack drone',
    { ids: ['shahed-136'], patterns: [/shahed-136/i] },
    { ids: ['geran-2', 'shahed-131'], patterns: [/geran/i, /shahed/i] },
  )

  const rfLayer = r.cuas(
    'RF and cyber C-UAS layer',
    'RF C-UAS',
    [{ ids: ['dronesentry-sentrycs'], patterns: [/dronesentry/i] }, { ids: ['drone-dome'], patterns: [/drone dome/i] }],
    GENERIC_RF_JAMMER_ID,
  )
  const gunLayer = r.cuas(
    'Gun C-UAS layer',
    'Gun C-UAS',
    [{ ids: ['skynex'], patterns: [/skynex/i] }, { ids: ['eos-slinger'], patterns: [/slinger/i] }],
    null,
  )
  const surveillance = r.radar('Air surveillance radar (Giraffe AMB class)', 'radar-giraffe-amb', 'radar-ground-master-200')
  const cuasRadar = r.radar('C-UAS radar (KuRFS class)', 'radar-ku-rfs', 'radar-rps-42')
  const shorad = r.effector('SHORAD missile layer (NASAMS class)', 'eff-nasams-amraam', 'eff-iris-t-slm')
  const interceptor = r.effector('Interceptor drone layer (Coyote class)', 'eff-coyote-block2')
  const ciws = r.effector('Point defence gun (C-RAM / Phalanx class)', 'eff-ciws-phalanx')

  // Raid inbound from the north-north-east across the Gulf, spread over 12 minutes.
  const raid = Array.from({ length: 8 }, (_, i) => {
    const ang = ((10 + i * 6) * Math.PI) / 180
    const distDeg = 0.9 + (i % 3) * 0.12
    return placeUas(
      {
        id: `alm-red-owa-${i + 1}`,
        asset: owa,
        lon: base.lon + Math.sin(ang) * distDeg,
        lat: base.lat + Math.cos(ang) * distDeg,
        side: 'red',
        role: 'strike',
        callsign: `OWA ${i + 1}`,
        launch_min: i * 1.5,
        goal: { lon: base.lon + ((i % 4) - 1.5) * 0.004, lat: base.lat + ((i % 2) - 0.5) * 0.003, kind: 'target' },
        lateralRadius_m: 8000,
      },
      T,
    )
  })

  const cuas = compact([
    placeCuas('alm-blue-rf', rfLayer, base.lon + 0.01, base.lat + 0.006, 'blue', '', T),
    placeCuas('alm-blue-gun-1', gunLayer, base.lon - 0.012, base.lat + 0.004, 'blue', 'West', T),
    placeCuas('alm-blue-gun-2', gunLayer, base.lon + 0.018, base.lat - 0.003, 'blue', 'East', T),
  ])
  const radars = compact([
    placeRadar('alm-blue-surv', surveillance, base.lon - 0.004, base.lat - 0.006, T),
    placeRadar('alm-blue-cuas-radar', cuasRadar, base.lon + 0.006, base.lat + 0.002, T),
  ])
  const effectors = compact([
    placeEffector('alm-blue-shorad', shorad, base.lon - 0.02, base.lat - 0.01, T),
    placeEffector('alm-blue-interceptor', interceptor, base.lon + 0.015, base.lat + 0.012, T),
    placeEffector('alm-blue-ciws', ciws, base.lon, base.lat + 0.004, T),
  ])

  return {
    id: 'al-minhad',
    name: 'Al Minhad Air Base: One-way attack drone saturation',
    viewport: { lon: 55.55, lat: 25.5, height_m: 190_000 },
    placedUas: compact(raid),
    placedCuas: cuas,
    placedRadars: radars,
    placedEffectors: effectors,
    resolution: r.resolution,
    notes: [
      'Illustrative layered defence, not the fielded defence at the base.',
      'Eight one-way attack drones inbound over 12 minutes from the north-north-east.',
    ],
  }
}

export const LAYDOWN_PRESETS: Array<{ id: LaydownPresetId; label: string; hint: string }> = [
  { id: 'combat-team', label: 'Combat team', hint: 'Shoalwater Bay, TS27 drone teams vs counter-RAS' },
  { id: 'williamtown', label: 'Base defence', hint: 'RAAF Williamtown, drone incursion response' },
  { id: 'al-minhad', label: 'Deployed base', hint: 'Al Minhad, one-way attack drone raid' },
]

export function buildPresetLaydown(id: LaydownPresetId, catalog: MapAssetsPayload): PresetLaydown {
  const withFallbacks = ensurePresetFallbackAssets(catalog)
  switch (id) {
    case 'combat-team':
      return buildCombatTeam(withFallbacks)
    case 'williamtown':
      return buildWilliamtown(withFallbacks)
    case 'al-minhad':
      return buildAlMinhad(withFallbacks)
  }
}
