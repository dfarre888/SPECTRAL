export type ScenarioStatus = 'draft' | 'running' | 'paused' | 'complete'
export type ForceSide = 'red' | 'blue' | 'referee'

/**
 * What a platform does in the fight. Optional: when absent it is inferred from
 * the platform catalogue, then from force side (Red drone, Blue C-UAS), which
 * is how scenarios built before roles existed still adjudicate.
 */
export type PlatformRole = 'uas' | 'cuas' | 'ew' | 'sensor' | 'c2' | 'fires'

export interface RoutePoint {
  lat: number
  lon: number
  /** Optional label used in movement events, e.g. "Objective FALCON". */
  label?: string
  /** Appended to the arrival event, e.g. to say an impact is not adjudicated. */
  note?: string
}

export interface WoprPlatform {
  id: string
  name: string
  lat: number
  lon: number
  alt_m: number
  side: 'red' | 'blue'
  platform_type: string
  radiating: boolean
  destroyed: boolean
  role?: PlatformRole
  /** Parent unit in the ORBAT, e.g. "A Coy FPV strike team". Used by MSDL export. */
  unit?: string
  /** Sensor the platform carries. Only radar and EO/IR can find a silent target. */
  sensor?: 'radar' | 'eo_ir' | 'rf' | 'acoustic'
  /** Range of that radar or EO/IR sensor (km). Planning assumption. Default: half the side's sensor range. */
  sensor_range_km?: number
  /** Planned route; the engine moves the platform along it each turn. */
  route?: RoutePoint[]
  /** Planning speed along the route (km/h). No movement without it. */
  speed_kmh?: number
  /** COP disc radius override (km). 0 draws no disc. */
  range_km?: number
}

/** A fixed site in the scenario (air base, FOB). Exported to MSDL as an Installation. */
export interface WoprInstallation {
  id: string
  name: string
  side: 'red' | 'blue'
  lat: number
  lon: number
}

export interface Battlespace {
  terrain: string
  weather: { wind_kts: number; visibility_km: number; cloud_base_ft: number }
  time: { mission_elapsed_min: number; day_night: 'day' | 'night' }
  /** Absolute start time of the scenario (ISO 8601, UTC). Used by MSDL ScenarioTime. */
  start_time_utc?: string
  /** Free-text area name, e.g. "Shoalwater Bay Training Area, QLD". */
  area?: string
  /** What the laydown is based on and what it is not. Shown with the scenario. */
  notes?: string
}

export interface PropagationCacheEntry {
  pairKey: string
  jam_to_signal_db: number | null
  los_state: string
  combinedBlueSuccessPct: number
  propagationGated: boolean
}

export interface WorldState {
  battlespace: Battlespace
  red_orbat: { platforms: WoprPlatform[] }
  blue_orbat: { platforms: WoprPlatform[] }
  comms_status: Record<string, 'up' | 'degraded' | 'down'>
  installations?: WoprInstallation[]
  propagation_cache?: Record<string, PropagationCacheEntry>
  /** Track ids each side held at the last tick; lets the engine report gains and losses. */
  held_tracks?: { blue: string[]; red: string[] }
  /** Index of the next route point per platform id. */
  route_progress?: Record<string, number>
  last_tick_at?: string
}

export interface SensorTrack {
  id: string
  name: string
  lat: number
  lon: number
  confidence: 'high' | 'medium' | 'low'
  source: 'radar' | 'eo_ir' | 'sigint' | 'report'
}

export type WoprEventType =
  | 'turn'
  | 'detect'
  | 'lost'
  | 'move'
  | 'arrive'
  | 'phase'
  | 'propagation'
  | 'note'

/** Structured tick event. The `events` strings on TickResult are rendered from these. */
export interface WoprEventRecord {
  type: WoprEventType
  side: ForceSide
  entity_id?: string
  entity?: string
  detail: string
}

export interface TickResult {
  elapsed_min: number
  turn: number
  red_picture: SensorTrack[]
  blue_picture: SensorTrack[]
  events: string[]
  /** Structured form of `events`. Absent on ticks recorded before records existed. */
  records?: WoprEventRecord[]
  propagation_refreshed: boolean
  propagation_cache?: Record<string, PropagationCacheEntry>
}

/** One persisted turn: the tick plus the world state as it stood after it. */
export interface TickRecord {
  turn: number
  elapsed_min: number
  tick: TickResult
  world_state?: WorldState | null
  created_at?: string
}

export interface WoprScenario {
  id: string
  tenant_id: string
  name: string
  classification: string
  world_state: WorldState
  elapsed_min: number
  status: ScenarioStatus
  /** Laydown before the first tick. MSDL exports this. */
  initial_world_state?: WorldState | null
  /** Set when this scenario was forked from another at a given turn. */
  parent_scenario_id?: string | null
  branch_turn?: number | null
  created_at?: string
  updated_at?: string
}
