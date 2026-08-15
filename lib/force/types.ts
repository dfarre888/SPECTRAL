/** National force catalogue — BMI air / land / maritime ORBAT. UNCLASSIFIED OSINT. */

export type ForceDomain = 'air' | 'ground' | 'maritime'
export type ForceSide = 'blue' | 'red' | 'neutral'
export type BmiConfidence = 'high' | 'medium' | 'estimated' | 'classified'
export type NatoConfidence = 'Confirmed' | 'Assessed' | 'Estimated' | 'Reported' | 'Suspected'

export type ForceEffect =
  | 'find'
  | 'fix'
  | 'finish'
  | 'shield'
  | 'sustain'
  | 'sea_control'

export const FORCE_EFFECTS: ForceEffect[] = [
  'find',
  'fix',
  'finish',
  'shield',
  'sustain',
  'sea_control',
]

export const FORCE_EFFECT_LABEL: Record<ForceEffect, string> = {
  find: 'Find (ISR / AEW&C)',
  fix: 'Fix (EW / C2 / targeting)',
  finish: 'Finish (strike / fires)',
  shield: 'Shield (AD / C-UAS)',
  sustain: 'Sustain (tanker / lift)',
  sea_control: 'Sea control (surface / sub)',
}

export interface ForceNation {
  code: string
  name: string
  shortName: string
  side: ForceSide
  region: string
  note: string
}

export interface BmiPlatformRow {
  id: string
  exercise_id: string | null
  nation_code: string
  nation_name: string | null
  designation: string
  short_name: string
  domain: ForceDomain
  role: string
  qty: number | null
  force_side: ForceSide
  open_source_summary: string
  data_confidence: BmiConfidence
  sources: string[]
  platform_library_id: string | null
  is_catalog: boolean
  manufacturer: string | null
  service_status: string | null
  ioc_year: number | null
  program_stage: string | null
}

export interface BmiCommsRow {
  id: string
  platform_id: string
  kind: string
  standard: string | null
  band: string
  label: string
  gateway_capable: boolean
  pnt_dependent: boolean
  data_confidence: BmiConfidence
}

export interface BmiSensorRow {
  id: string
  platform_id: string
  kind: string
  label: string
  band: string | null
  role: string | null
  confidence: string
}

export interface LinkedUas {
  id: string
  name: string
  category: string | null
}

export interface LinkedCuas {
  id: string
  name: string
}

export interface ForcePlatform extends BmiPlatformRow {
  effect: ForceEffect
  nato_confidence: NatoConfidence
  comms: BmiCommsRow[]
  sensors: BmiSensorRow[]
  linked_uas: LinkedUas[]
  linked_cuas: LinkedCuas[]
}

export interface DomainTally {
  domain: ForceDomain
  count: number
  high: number
  medium: number
  estimated: number
}

export interface EffectTally {
  effect: ForceEffect
  count: number
  names: string[]
}

export interface NationForce {
  nation: ForceNation
  platforms: ForcePlatform[]
  domain: DomainTally[]
  effects: EffectTally[]
  comms_count: number
  sensors_count: number
  linked_uas: LinkedUas[]
  linked_cuas: LinkedCuas[]
  catalog_count: number
}

export interface EffectCell {
  effect: ForceEffect
  label: string
  a_count: number
  b_count: number
  a_names: string[]
  b_names: string[]
  so_what: string
  gap: string
  confidence: NatoConfidence
}

export interface NationCompare {
  a: NationForce
  b: NationForce
  cells: EffectCell[]
  headline: string
  caveat: string
}

export interface TheatreTemplate {
  id: string
  name: string
  theatre: string
  lat: number
  lon: number
  height_m: number
  defaultBlue: string
  defaultRed: string
  briefing: string
  so_what: string
  date_of_information: string
}

export interface ForcePackage {
  theatreId: string
  blue: string
  red: string
  selectedIds: string[]
  createdAt: string
}
