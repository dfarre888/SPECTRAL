/**
 * BMI — Battlespace Management & Interoperability types
 * Exercise OrBat, comms matrix, interop graph, PACE plans.
 * OSINT-only; ITAR-compliant.
 */

import type { DataConfidence } from '@/lib/types'
import type { SourceConfidence } from '@/lib/spectrum/types'

export type ParticipationType = 'flying' | 'embedded_personnel'

export interface ExerciseNation {
  code: string
  name: string
  participation: ParticipationType
  first_time?: boolean
}

export type Domain = 'air' | 'ground' | 'maritime'

export type PlatformRole =
  | 'fighter'
  | 'multirole'
  | 'trainer_lead_in'
  | 'aew_c'
  | 'isr'
  | 'ew'
  | 'tanker'
  | 'transport'
  | 'c2_ground'
  | 'radar_ground'
  | 'comms_node'
  | 'maritime_surface'
  | 'other'

export type ForceSide = 'blue' | 'red'

export interface ExerciseBase {
  id: string
  name: string
  lat: number
  lon: number
  role: 'main_operating' | 'forward' | 'c2' | 'radar'
}

export interface ExercisePlatform {
  id: string
  exercise_id: string
  nation_code: string
  designation: string
  short_name: string
  domain: Domain
  role: PlatformRole
  qty: number | null
  base_id: string | null
  force_side: ForceSide
  open_source_summary: string
  data_confidence: DataConfidence
  sources: string[]
  platform_library_id?: string | null
}

export type SensorKind = 'radar' | 'eo_ir' | 'esm' | 'other'

export interface PlatformSensor {
  id: string
  platform_id: string
  kind: SensorKind
  label: string
  band: string | null
  antenna: string | null
  role: string | null
  can_detect: string[]
  cannot_detect: string[]
  strengths: string | null
  limitations: string | null
  confidence: SourceConfidence
  intel_note: string | null
  sources: string[]
  performance_ref?: 'SOVEREIGN_CORE_BOUNDARY' | null
  radar_catalog_id?: string | null
}

export type BearerKind =
  | 'voice_vhf'
  | 'voice_uhf'
  | 'voice_hf'
  | 'voice_satcom'
  | 'datalink'
  | 'data_satcom'

export type DatalinkStandard =
  | 'link16'
  | 'link11'
  | 'link22'
  | 'madl'
  | 'ifdl'
  | 'national'
  | 'sadl'
  | 'none'

export type FreqBand =
  | 'HF'
  | 'VHF'
  | 'UHF'
  | 'L'
  | 'S'
  | 'C'
  | 'X'
  | 'Ku'
  | 'Ka'

export interface CommsBearer {
  id: string
  platform_id: string
  kind: BearerKind
  standard: DatalinkStandard | null
  band: FreqBand
  label: string
  gateway_capable: boolean
  comsec_note: string | null
  pnt_dependent: boolean
  data_confidence: DataConfidence
  sources: string[]
  boundary_note: string | null
  spectrum_capability_id?: string | null
}

export interface PlatformCommsFit {
  platform_id: string
  bearers: CommsBearer[]
  data_confidence: DataConfidence
  sources: string[]
  boundary_note: string | null
}

export interface ExerciseMeta {
  id: string
  name: string
  start_date: string
  end_date: string
  bases: ExerciseBase[]
  nations: ExerciseNation[]
  note: string
}

export interface ExercisePlatformFull extends ExercisePlatform {
  sensors: PlatformSensor[]
  comms: CommsBearer[]
}

export interface BmiExerciseBundle {
  meta: ExerciseMeta
  platforms: ExercisePlatformFull[]
}

// ── Interop engine ────────────────────────────────────────────────────────────

export type InteropMethod = 'direct' | 'via_gateway' | 'voice_only' | 'none'

export interface InteropLink {
  a_id: string
  b_id: string
  method: InteropMethod
  shared_bearers: string[]
  gateway_id?: string
  comsec_caveat: boolean
  pnt_caveat: boolean
  note: string
}

export interface InteropGraph {
  links: InteropLink[]
  gateway_dependent: string[]
  isolated_pairs: { a_id: string; b_id: string }[]
}

export interface GatewayNode {
  gateway_id: string
  bridges: string[]
}

// ── PACE planner ────────────────────────────────────────────────────────────

export type PaceTier = 'primary' | 'alternate' | 'contingency' | 'emergency'

export interface PaceEntry {
  tier: PaceTier
  bearer_label: string
  band: string
  rationale: string
  caveat: string | null
}

export interface PacePlan {
  from_id: string
  to_id: string
  entries: PaceEntry[]
  gateway_required: string | null
  warnings: string[]
  complete: boolean
}

// ── Comms spectrum ──────────────────────────────────────────────────────────

export interface BandOccupancy {
  band: FreqBand
  label: string
  bearer_count: number
  platforms: string[]
  datalink_present: boolean
  congestion: 'clear' | 'moderate' | 'congested'
  note: string
}

export interface SpectrumPlan {
  occupancy: BandOccupancy[]
  backbone_band: FreqBand | null
  pnt_note: string
  warnings: string[]
}

export interface SpectrumPlotPoint {
  x_mhz: number
  band: FreqBand
  kind: string
  label: string
  platform_id: string
}

export const PITCH_BLACK_2026_ID = 'PITCH_BLACK_2026'

// ── Force Catalogue (global, nation-scoped OrBat) ───────────────────────────────
// Shares the same platform/sensor/comms shapes as the exercise layer so the
// interop solver, PACE planner and spectrum planner run on catalogue data
// unchanged. A catalogue platform has no exercise_id, no qty, no base_id.

export type ForceSideCatalog = 'blue' | 'red' | 'neutral'

/** Named alliance / adversary blocs used for catalogue filtering. */
export type Bloc =
  | 'NATO'
  | 'FiveEyes'
  | 'Indo-Pacific'
  | 'EU'
  | 'CRINK' // China, Russia, Iran, North Korea grouping
  | 'Non-aligned'
  | 'Non-state' // proxy / non-state armed groups (catalogue filter)

export interface CatalogNation {
  code: string
  name: string
  force_side: ForceSideCatalog
  blocs: Bloc[]
  region: string | null
}

/** Where a platform sits in its lifecycle — drives the "future capabilities" view. */
export type ServiceStatus =
  | 'in_service'
  | 'ordered'
  | 'in_development'
  | 'prototype'
  | 'concept'
  | 'retiring'
  | 'retired'

/** R&D maturity for future programs. */
export type ProgramStage =
  | 'fielded'
  | 'lrip' // low-rate initial production
  | 'emd' // engineering & manufacturing development
  | 'technology_demonstrator'
  | 'r_and_d'
  | 'announced'
  | 'speculative'

/**
 * A catalogue platform. Reuses domain/role/sensor/comms from the exercise layer.
 * Extends with nation, manufacturer and lifecycle fields. Detection ranges,
 * weapons performance and ECCM are NEVER stored here — those pin to
 * SOVEREIGN_CORE_BOUNDARY and resolve in the defence IDE.
 */
export interface ForceCatalogPlatform {
  id: string
  is_catalog: true
  nation_code: string
  nation_name: string
  designation: string
  short_name: string
  manufacturer: string | null
  domain: Domain
  role: PlatformRole
  force_side: ForceSideCatalog
  service_status: ServiceStatus
  program_stage: ProgramStage
  ioc_year: number | null
  open_source_summary: string
  data_confidence: DataConfidence
  sources: string[]
  platform_library_id?: string | null
}

export interface FutureProgramDetail {
  platform_id: string
  program_name: string
  lead_contractor: string | null
  partner_nations: string[]
  first_flight_est: string | null
  ioc_est: string | null
  key_features: string[]
  status_note: string | null
  data_confidence: DataConfidence
  sources: string[]
}

export interface ForceCatalogPlatformFull extends ForceCatalogPlatform {
  sensors: PlatformSensor[]
  comms: CommsBearer[]
  future?: FutureProgramDetail | null
}

export interface ForceCatalogBundle {
  nations: CatalogNation[]
  platforms: ForceCatalogPlatformFull[]
}

/** Adapt a catalogue platform to the comms-fit shape the interop engines expect. */
export function catalogToCommsFit(p: ForceCatalogPlatformFull): PlatformCommsFit {
  return {
    platform_id: p.id,
    bearers: p.comms,
    data_confidence: p.data_confidence,
    sources: p.sources,
    boundary_note: null,
  }
}
