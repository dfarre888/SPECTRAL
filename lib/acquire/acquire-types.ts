/**
 * Capability Acquisition — shared types
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */

import type { CostConfidence, EconomicsRow, ExchangeRatioResult } from '@/lib/planner/engagement-economics'
import type { DataConfidence } from '@/lib/types'

export type AcquireStep = 'gap' | 'option' | 'calc' | 'brief'

export interface AcquireTemplate {
  id: string
  title: string
  threat_platform_id: string
  location: string
  base_id: string
  required_effect?: string
}

export interface OrbatPlatformSummary {
  id: string
  designation: string
  short_name: string
  domain: string
  role: string
  nation_code: string
  force_side: string
}

export interface DefeatCoverageRow {
  platform_id: string
  defeat_system_id: string
  defeat_system_name: string
  kinetic_pct: number | null
  rf_jamming_pct: number | null
  dew_pct: number | null
  data_confidence: DataConfidence
  is_immune: boolean
  special_notes: string | null
}

export interface GapAnalysisResult {
  threat_platform_id: string
  threat_name: string
  location: string
  base_id: string
  required_effect: string
  orbat_platform_count: number
  orbat_summary: string[]
  existing_cuas_systems: string[]
  coverage_gaps: string[]
  severity: 'critical' | 'high' | 'moderate'
  narrative: string
}

export interface RankedAcquireOption {
  rank: number
  defeat_system_id: string
  defeat_system_name: string
  platform_id: string
  pk: number
  cost_per_expected_kill_usd: number
  exchange: ExchangeRatioResult
  magazine_rounds: number
  reload_min: number
  cost_confidence: CostConfidence
  source_ref: string
  effectiveness_confidence: DataConfidence
  is_sam: boolean
  rationale: string
}

export interface AcquireCalcResult {
  threat_platform_id: string
  economics_rows: EconomicsRow[]
  panel_rows: Array<{
    platformId: string
    defeatSystemId: string
    effectorCostUsd: number
    pk: number
    label: string
  }>
  recommended_option_id: string
  salvo_note: string
}

export interface AcquisitionBriefStructured {
  title: string
  threat: string
  location: string
  gap_summary: string
  options: Array<{
    rank: number
    system: string
    cost_per_kill_usd: number
    confidence: CostConfidence
    source_ref: string
  }>
  osint_sources: string[]
  training_note: string
}

export interface AcquisitionBrief {
  markdown: string
  structured: AcquisitionBriefStructured
}

export interface AcquireSession {
  template: AcquireTemplate
  gap: GapAnalysisResult
  options: RankedAcquireOption[]
  calc: AcquireCalcResult
  brief: AcquisitionBrief
  /** Defeat matrix rows the session was built from — surfaced in the page header. */
  defeatCoverage: DefeatCoverageRow[]
}

export interface AcquireSessionInputs {
  defeatCoverage: DefeatCoverageRow[]
  darwinOrbat: OrbatPlatformSummary[]
  economicsRows: EconomicsRow[]
  threatName?: string
}

/** MOAT → Acquire read-only suggestion (no Pk / accredited fields). */
export interface AcquireSuggestedGap {
  id: string
  competency: string
  severity: 'critical' | 'high' | 'moderate'
  narrative: string
  suggested_template_id?: string
  href: string
  source: 'moat_blind_spot'
}

