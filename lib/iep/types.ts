export type AustralianState = 'NSW' | 'VIC' | 'QLD' | 'WA' | 'SA' | 'TAS' | 'ACT' | 'NT'

export type IepStatus = 'draft' | 'pending_review' | 'approved' | 'archived'

export type NccdAdjustmentLevel = 'qdtp' | 'supplementary' | 'substantial' | 'extensive'

export type NccdCategory = 'sensory' | 'physical' | 'cognitive' | 'social_emotional'

export type IepSupportArea =
  | 'curriculum'
  | 'communication'
  | 'health_personal_care'
  | 'movement'
  | 'social_emotional'

export type IepFundingSource = 'school' | 'ndis' | 'both' | 'family'

export type ReviewerRole = 'teacher' | 'coordinator' | 'allied_health'

export const IEP_SUPPORT_AREA_LABELS: Record<IepSupportArea, string> = {
  curriculum: 'Curriculum / teaching and learning',
  communication: 'Communication',
  health_personal_care: 'Health and personal care',
  movement: 'Movement (mobility)',
  social_emotional: 'Social participation / emotional wellbeing',
}

export const NCCD_ADJUSTMENT_LABELS: Record<NccdAdjustmentLevel, string> = {
  qdtp: 'Quality Differentiated Teaching Practice (QDTP)',
  supplementary: 'Supplementary',
  substantial: 'Substantial',
  extensive: 'Extensive',
}

export const REQUIRES_TEACHER_INPUT = '[REQUIRES TEACHER INPUT]' as const

export interface MonitoringPlan {
  review_schedule?: string
  data_collection_method?: string
  review_dates?: string[]
  census_evidence_note?: string
}

export interface PresentLevels {
  academic?: Record<string, string>
  functional?: Record<string, string>
  summary?: string
}

export interface StudentProfile {
  functional_impact?: string
  strengths?: string
  needs_summary?: string
  ndis_school_interface_note?: string
}

export interface ParticipantRow {
  id: string
  tenant_id: string
  full_name: string
  preferred_name: string | null
  date_of_birth: string | null
  primary_disability: string | null
  diagnoses: string[]
  communication_notes: string | null
}

export interface NdisGoalRow {
  id: string
  participant_id: string
  title: string
  description: string | null
  domain: string
  progress: number
  status: string
  target_date: string | null
}

export interface IepGoalRow {
  id: string
  iep_plan_id: string
  domain: string
  ndis_goal_id: string | null
  description: string
  baseline: string | null
  target: string | null
  measurement_method: string | null
  target_date: string | null
  progress_notes: string | null
  sort_order: number
  ai_drafted: boolean
}

export interface IepAdjustmentRow {
  id: string
  iep_plan_id: string
  support_area: IepSupportArea
  adjustment_type: string | null
  description: string
  frequency: string | null
  intensity: string | null
  start_date: string | null
  end_date: string | null
  delivered_by: string | null
  funding_source: IepFundingSource
  evidence_method: string | null
  sort_order: number
}

export interface IepTeamMemberRow {
  id: string
  iep_plan_id: string
  name: string
  role: string
  organisation: string | null
  contact: string | null
  attended_meeting: boolean
  sort_order: number
}

export interface IepPlanRow {
  id: string
  participant_id: string
  tenant_id: string
  created_by: string
  status: IepStatus
  state_territory: AustralianState
  document_title: string
  school_name: string | null
  school_contact: string | null
  year_level: string | null
  classroom_teacher: string | null
  nccd_adjustment_level: NccdAdjustmentLevel | null
  nccd_category: NccdCategory | null
  nccd_level_rationale: string | null
  present_levels: PresentLevels
  student_profile: StudentProfile
  parent_carer_goals: string | null
  student_voice: string | null
  consultation_notes: string | null
  monitoring_plan: MonitoringPlan
  ai_generated: boolean
  ai_model_id: string | null
  iep_model_override: string | null
  ai_disclaimer_accepted_at: string | null
  placeholders_acknowledged: boolean
  reviewed_by: string | null
  reviewed_at: string | null
  reviewer_role: ReviewerRole | null
  version: number
  supersedes_id: string | null
  school_year: number
  created_at: string
  updated_at: string
  goals?: IepGoalRow[]
  adjustments?: IepAdjustmentRow[]
  team_members?: IepTeamMemberRow[]
}

export interface ConsentRecord {
  id: string
  participant_id: string
  consent_type: string
  granted_at: string
  expires_at: string
  parent_carer_name: string | null
  revoked_at: string | null
}

export interface ConsentStatus {
  valid: boolean
  expired: boolean
  expiringSoon: boolean
  record: ConsentRecord | null
  daysUntilExpiry: number | null
}

export interface IepIntakePayload {
  participantId: string
  stateTerritory: AustralianState
  schoolName: string
  schoolContact?: string
  yearLevel: string
  classroomTeacher: string
  presentLevels: PresentLevels
  parentCarerGoals?: string
  studentVoice?: string
  teamMembers: Array<{ name: string; role: string; organisation?: string; contact?: string }>
  schoolYear?: number
  supersedesId?: string
  consentGranted: boolean
  parentCarerName: string
  parentCarerRelationship?: string
  under15AssentConfirmed?: boolean
}

export interface GeneratedIepDraft {
  student_profile: StudentProfile
  present_levels: PresentLevels
  nccd_adjustment_level: NccdAdjustmentLevel
  nccd_category: NccdCategory
  nccd_level_rationale: string
  parent_carer_goals?: string
  consultation_notes: string
  monitoring_plan: Omit<MonitoringPlan, 'census_evidence_note'>
  goals: Array<Omit<IepGoalRow, 'id' | 'iep_plan_id' | 'created_at' | 'updated_at'>>
  adjustments: Array<Omit<IepAdjustmentRow, 'id' | 'iep_plan_id' | 'created_at'>>
}
