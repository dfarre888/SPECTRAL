export type ScenarioStatus = 'draft' | 'running' | 'paused' | 'complete'
export type ForceSide = 'red' | 'blue' | 'referee'

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
}

export interface Battlespace {
  terrain: string
  weather: { wind_kts: number; visibility_km: number; cloud_base_ft: number }
  time: { mission_elapsed_min: number; day_night: 'day' | 'night' }
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
  propagation_cache?: Record<string, PropagationCacheEntry>
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

export interface TickResult {
  elapsed_min: number
  turn: number
  red_picture: SensorTrack[]
  blue_picture: SensorTrack[]
  events: string[]
  propagation_refreshed: boolean
  propagation_cache?: Record<string, PropagationCacheEntry>
}

export interface WoprScenario {
  id: string
  tenant_id: string
  name: string
  classification: string
  world_state: WorldState
  elapsed_min: number
  status: ScenarioStatus
}
