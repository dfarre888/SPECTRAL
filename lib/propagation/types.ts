import type { ClassificationMarking } from '@/lib/operations/classification'

export type LosState = 'LOS' | 'partial' | 'NLOS'
export type ConfidenceLevel = 'Confirmed' | 'Assessed' | 'Estimated' | 'Reported' | 'Suspected'
export type ModelTier =
  | 'friis'
  | 'two_ray'
  | 'knife_edge'
  | 'deygout_chain'
  | 'terrain_los'
  | 'itu_p1411'
  | 'building_occlusion'

export interface GeoPoint3d {
  lat: number
  lon: number
  alt_m: number
}

export interface RfEmitter {
  position: GeoPoint3d
  freq_hz: number
  erp_dbm: number
  beamwidth_deg?: number
}

export interface RfReceiver {
  position: GeoPoint3d
  sensitivity_dbm?: number
}

export interface DiffractionEdgeInput {
  clearance_m: number
  distance_from_emitter_m: number
}

export interface PropagationEnvironment {
  urban_density?: 'open' | 'suburban' | 'urban' | 'dense_urban'
  terrain_obstructed?: boolean
  building_obstructed?: boolean
  /** Material penetration loss when ray intersects building footprint (dB). */
  building_penetration_loss_db?: number
  /** Multiple ridge/rooftop edges — triggers Deygout chain instead of single Bullington edge. */
  diffraction_edges?: DiffractionEdgeInput[]
  rain_rate_mm_h?: number
  foliage?: boolean
}

export interface PropagationRequest {
  emitter: RfEmitter
  receiver: RfReceiver
  environment?: PropagationEnvironment
  classification?: ClassificationMarking
  jammer_erp_dbm?: number
}

export interface PropagationResult {
  los_state: LosState
  distance_m: number
  path_loss_db: number
  multipath_margin_db: number
  jam_to_signal_db: number | null
  received_power_dbm: number | null
  confidence: ConfidenceLevel
  model_tier: ModelTier[]
  notes: string[]
}

export interface HeatmapRequest {
  emitter: RfEmitter
  bounds: { south: number; west: number; north: number; east: number }
  grid_steps: number
  receiver_alt_m: number
  environment?: PropagationEnvironment
}

export interface HeatmapCell {
  lat: number
  lon: number
  path_loss_db: number
  los_state: LosState
}

export interface HeatmapResult {
  cells: HeatmapCell[]
  grid_steps: number
  confidence: ConfidenceLevel
}
