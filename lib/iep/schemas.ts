import type {
  GeneratedIepDraft,
  IepAdjustmentRow,
  IepGoalRow,
  IepSupportArea,
  NccdAdjustmentLevel,
  NccdCategory,
} from '@/lib/iep/types'
import { REQUIRES_TEACHER_INPUT } from '@/lib/iep/types'

const SUPPORT_AREAS: IepSupportArea[] = [
  'curriculum',
  'communication',
  'health_personal_care',
  'movement',
  'social_emotional',
]

const ADJUSTMENT_LEVELS: NccdAdjustmentLevel[] = [
  'qdtp',
  'supplementary',
  'substantial',
  'extensive',
]

const NCCD_CATEGORIES: NccdCategory[] = [
  'sensory',
  'physical',
  'cognitive',
  'social_emotional',
]

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

function parseGoal(raw: unknown, index: number): Omit<IepGoalRow, 'id' | 'iep_plan_id' | 'created_at' | 'updated_at'> {
  const o = isRecord(raw) ? raw : {}
  return {
    domain: asString(o.domain, 'curriculum'),
    ndis_goal_id: typeof o.ndis_goal_id === 'string' ? o.ndis_goal_id : null,
    description: asString(o.description, 'Goal to be refined'),
    baseline: asString(o.baseline) || null,
    target: asString(o.target) || null,
    measurement_method: asString(o.measurement_method) || null,
    target_date: asString(o.target_date) || null,
    progress_notes: asString(o.progress_notes) || null,
    sort_order: typeof o.sort_order === 'number' ? o.sort_order : index,
    ai_drafted: true,
  }
}

function parseAdjustment(
  raw: unknown,
  index: number,
): Omit<IepAdjustmentRow, 'id' | 'iep_plan_id' | 'created_at'> {
  const o = isRecord(raw) ? raw : {}
  const area = asString(o.support_area) as IepSupportArea
  const support_area = SUPPORT_AREAS.includes(area) ? area : 'curriculum'
  const funding = asString(o.funding_source, 'school') as IepAdjustmentRow['funding_source']
  return {
    support_area,
    adjustment_type: asString(o.adjustment_type) || null,
    description: asString(o.description, 'Adjustment to be specified'),
    frequency: asString(o.frequency) || null,
    intensity: asString(o.intensity) || null,
    start_date: asString(o.start_date) || null,
    end_date: asString(o.end_date) || null,
    delivered_by: asString(o.delivered_by) || null,
    funding_source: ['school', 'ndis', 'both', 'family'].includes(funding) ? funding : 'school',
    evidence_method: asString(o.evidence_method) || null,
    sort_order: typeof o.sort_order === 'number' ? o.sort_order : index,
  }
}

export function parseGeneratedIepDraft(raw: unknown): GeneratedIepDraft {
  if (!isRecord(raw)) throw new Error('IEP draft must be a JSON object')

  const level = asString(raw.nccd_adjustment_level, 'supplementary') as NccdAdjustmentLevel
  const category = asString(raw.nccd_category, 'cognitive') as NccdCategory

  const studentProfile = isRecord(raw.student_profile) ? raw.student_profile : {}
  const presentLevels = isRecord(raw.present_levels) ? raw.present_levels : {}
  const monitoring = isRecord(raw.monitoring_plan) ? raw.monitoring_plan : {}

  const goalsRaw = Array.isArray(raw.goals) ? raw.goals : []
  const adjRaw = Array.isArray(raw.adjustments) ? raw.adjustments : []

  return {
    student_profile: {
      functional_impact: asString(studentProfile.functional_impact),
      strengths: asString(studentProfile.strengths),
      needs_summary: asString(studentProfile.needs_summary),
      ndis_school_interface_note: asString(studentProfile.ndis_school_interface_note),
    },
    present_levels: {
      academic: isRecord(presentLevels.academic)
        ? Object.fromEntries(
            Object.entries(presentLevels.academic).map(([k, v]) => [k, asString(v)]),
          )
        : {},
      functional: isRecord(presentLevels.functional)
        ? Object.fromEntries(
            Object.entries(presentLevels.functional).map(([k, v]) => [k, asString(v)]),
          )
        : {},
      summary: asString(presentLevels.summary),
    },
    nccd_adjustment_level: ADJUSTMENT_LEVELS.includes(level) ? level : 'supplementary',
    nccd_category: NCCD_CATEGORIES.includes(category) ? category : 'cognitive',
    nccd_level_rationale: asString(raw.nccd_level_rationale),
    parent_carer_goals: asString(raw.parent_carer_goals) || undefined,
    consultation_notes: asString(raw.consultation_notes),
    monitoring_plan: {
      review_schedule: asString(monitoring.review_schedule),
      data_collection_method: asString(monitoring.data_collection_method),
      review_dates: Array.isArray(monitoring.review_dates)
        ? monitoring.review_dates.map((d) => asString(d)).filter(Boolean)
        : [],
    },
    goals: goalsRaw.map(parseGoal),
    adjustments: adjRaw.map(parseAdjustment),
  }
}

export function extractJsonFromLlm(text: string): unknown {
  const trimmed = text.trim()
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  const body = fence ? fence[1].trim() : trimmed
  return JSON.parse(body)
}

export function countTeacherInputPlaceholders(obj: unknown): number {
  const json = JSON.stringify(obj)
  const matches = json.match(new RegExp(REQUIRES_TEACHER_INPUT.replace(/[[\]]/g, '\\$&'), 'g'))
  return matches?.length ?? 0
}

export function hasUnresolvedPlaceholders(plan: {
  present_levels?: { academic?: Record<string, string>; summary?: string }
  placeholders_acknowledged?: boolean
}): boolean {
  if (plan.placeholders_acknowledged) return false
  const count = countTeacherInputPlaceholders(plan.present_levels ?? {})
  return count > 0
}
