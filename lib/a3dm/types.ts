/** Shared A3DM ↔ Spectral COTS RPAS catalog types. */

export type A3dmCatalogTier = 'cots'

export interface A3dmManufacturer {
  id: string
  name: string
  country: string | null
  type: string | null
  website: string | null
  notes: string | null
}

export interface A3dmDrone {
  a3dm_drone_id: string
  id: string
  manufacturer_id: string
  manufacturer: string
  name: string
  sub_category: string | null
  a3dm_category: string
  category: string
  dry_weight_g: number | null
  mtow_g: number | null
  max_payload_g: number | null
  year_released: number | null
  notes: string | null
  uas_group: 1 | 2 | 3 | 4 | 5
}

export interface A3dmPayload {
  id: string
  manufacturer_id: string
  manufacturer: string
  name: string
  type: string
  weight_g: number | null
  mount_type: string | null
  notes: string | null
  spectrum_eligible: boolean
}

export interface A3dmCompatibility {
  id: string
  a3dm_drone_id: string
  platform_id: string | null
  payload_id: string
  drone_model: string | null
  payload_name: string | null
  notes: string | null
}

export interface OsintPerformance {
  range_km?: number
  endurance_hrs?: number
  speed_kmh?: number
  ceiling_m?: number
  control_link_freq?: string
  gnss_used?: string[]
  rtk_capable?: boolean
  gnss_dependency?: 'high' | 'medium' | 'low' | 'none'
  source: string
}

export interface PayloadBandSpec {
  axis: 'rf' | 'gnss' | 'eo_ir'
  layer: 'comms' | 'navigation' | 'radar' | 'eo_ir'
  fn: 'sensor' | 'laser' | 'radar_emit' | 'navigation' | 'telemetry' | 'datalink'
  label: string
  freq_low_hz?: number
  freq_high_hz?: number
  wavelength_low_um?: number
  wavelength_high_um?: number
  note?: string
}
