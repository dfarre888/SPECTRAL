import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { injectCensusEvidenceNote } from '@/lib/iep/census-evidence'
import { resolveDocumentTitle } from '@/lib/iep/state-labels'
import type {
  AustralianState,
  GeneratedIepDraft,
  IepAdjustmentRow,
  IepGoalRow,
  IepPlanRow,
  IepStatus,
  IepTeamMemberRow,
  MonitoringPlan,
  ParticipantRow,
  PresentLevels,
  ReviewerRole,
  StudentProfile,
} from '@/lib/iep/types'

function rowToPlan(row: Record<string, unknown>): IepPlanRow {
  return {
    id: row.id as string,
    participant_id: row.participant_id as string,
    tenant_id: row.tenant_id as string,
    created_by: row.created_by as string,
    status: row.status as IepPlanRow['status'],
    state_territory: row.state_territory as AustralianState,
    document_title: row.document_title as string,
    school_name: (row.school_name as string | null) ?? null,
    school_contact: (row.school_contact as string | null) ?? null,
    year_level: (row.year_level as string | null) ?? null,
    classroom_teacher: (row.classroom_teacher as string | null) ?? null,
    nccd_adjustment_level: (row.nccd_adjustment_level as IepPlanRow['nccd_adjustment_level']) ?? null,
    nccd_category: (row.nccd_category as IepPlanRow['nccd_category']) ?? null,
    nccd_level_rationale: (row.nccd_level_rationale as string | null) ?? null,
    present_levels: (row.present_levels as PresentLevels) ?? {},
    student_profile: (row.student_profile as StudentProfile) ?? {},
    parent_carer_goals: (row.parent_carer_goals as string | null) ?? null,
    student_voice: (row.student_voice as string | null) ?? null,
    consultation_notes: (row.consultation_notes as string | null) ?? null,
    monitoring_plan: (row.monitoring_plan as MonitoringPlan) ?? {},
    ai_generated: Boolean(row.ai_generated),
    ai_model_id: (row.ai_model_id as string | null) ?? null,
    iep_model_override: (row.iep_model_override as string | null) ?? null,
    ai_disclaimer_accepted_at: (row.ai_disclaimer_accepted_at as string | null) ?? null,
    placeholders_acknowledged: Boolean(row.placeholders_acknowledged),
    reviewed_by: (row.reviewed_by as string | null) ?? null,
    reviewed_at: (row.reviewed_at as string | null) ?? null,
    reviewer_role: (row.reviewer_role as ReviewerRole | null) ?? null,
    version: (row.version as number) ?? 1,
    supersedes_id: (row.supersedes_id as string | null) ?? null,
    school_year: (row.school_year as number) ?? new Date().getFullYear(),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

export async function getParticipant(
  participantId: string,
  tenantId: string,
): Promise<ParticipantRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .eq('id', participantId)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  return data as ParticipantRow
}

export async function listParticipants(tenantId: string): Promise<ParticipantRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('full_name')
  if (error) throw new Error(error.message)
  return (data ?? []) as ParticipantRow[]
}

export async function listIepPlans(participantId: string): Promise<IepPlanRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('iep_plans')
    .select('*')
    .eq('participant_id', participantId)
    .order('updated_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => rowToPlan(r as Record<string, unknown>))
}

export async function getIepPlan(id: string): Promise<IepPlanRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('iep_plans').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  const plan = rowToPlan(data as Record<string, unknown>)

  const [goals, adjustments, team] = await Promise.all([
    supabase.from('iep_goals').select('*').eq('iep_plan_id', id).order('sort_order'),
    supabase.from('iep_adjustments').select('*').eq('iep_plan_id', id).order('sort_order'),
    supabase.from('iep_team_members').select('*').eq('iep_plan_id', id).order('sort_order'),
  ])

  plan.goals = (goals.data ?? []) as IepGoalRow[]
  plan.adjustments = (adjustments.data ?? []) as IepAdjustmentRow[]
  plan.team_members = (team.data ?? []) as IepTeamMemberRow[]
  return plan
}

export interface CreateManualIepInput {
  participantId: string
  tenantId: string
  userId: string
  stateTerritory: AustralianState
  schoolName: string
  schoolContact?: string
  yearLevel: string
  classroomTeacher: string
  parentCarerGoals?: string
  studentVoice?: string
  presentLevels?: PresentLevels
  schoolYear?: number
  supersedesId?: string
}

export async function createManualIepDraft(input: CreateManualIepInput): Promise<IepPlanRow> {
  const supabase = await createClient()
  const schoolYear = input.schoolYear ?? new Date().getFullYear()
  const { data, error } = await supabase
    .from('iep_plans')
    .insert({
      participant_id: input.participantId,
      tenant_id: input.tenantId,
      created_by: input.userId,
      status: 'draft',
      state_territory: input.stateTerritory,
      document_title: resolveDocumentTitle(input.stateTerritory),
      school_name: input.schoolName,
      school_contact: input.schoolContact ?? null,
      year_level: input.yearLevel,
      classroom_teacher: input.classroomTeacher,
      parent_carer_goals: input.parentCarerGoals ?? null,
      student_voice: input.studentVoice ?? null,
      present_levels: input.presentLevels ?? {},
      monitoring_plan: injectCensusEvidenceNote({}, schoolYear),
      ai_generated: false,
      school_year: schoolYear,
      supersedes_id: input.supersedesId ?? null,
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return rowToPlan(data as Record<string, unknown>)
}

async function replaceChildRows(
  planId: string,
  draft: GeneratedIepDraft,
  teamMembers: Array<{ name: string; role: string; organisation?: string; contact?: string }>,
): Promise<void> {
  const supabase = await createClient()
  await supabase.from('iep_goals').delete().eq('iep_plan_id', planId)
  await supabase.from('iep_adjustments').delete().eq('iep_plan_id', planId)
  await supabase.from('iep_team_members').delete().eq('iep_plan_id', planId)

  if (draft.goals.length) {
    await supabase.from('iep_goals').insert(
      draft.goals.map((g, i) => ({
        iep_plan_id: planId,
        domain: g.domain,
        ndis_goal_id: g.ndis_goal_id,
        description: g.description,
        baseline: g.baseline,
        target: g.target,
        measurement_method: g.measurement_method,
        target_date: g.target_date,
        progress_notes: g.progress_notes,
        sort_order: g.sort_order ?? i,
        ai_drafted: true,
      })),
    )
  }

  if (draft.adjustments.length) {
    await supabase.from('iep_adjustments').insert(
      draft.adjustments.map((a, i) => ({
        iep_plan_id: planId,
        support_area: a.support_area,
        adjustment_type: a.adjustment_type,
        description: a.description,
        frequency: a.frequency,
        intensity: a.intensity,
        start_date: a.start_date,
        end_date: a.end_date,
        delivered_by: a.delivered_by,
        funding_source: a.funding_source,
        evidence_method: a.evidence_method,
        sort_order: a.sort_order ?? i,
      })),
    )
  }

  if (teamMembers.length) {
    await supabase.from('iep_team_members').insert(
      teamMembers.map((m, i) => ({
        iep_plan_id: planId,
        name: m.name,
        role: m.role,
        organisation: m.organisation ?? null,
        contact: m.contact ?? null,
        attended_meeting: false,
        sort_order: i,
      })),
    )
  }
}

export async function applyGeneratedDraft(
  planId: string,
  draft: GeneratedIepDraft,
  opts: {
    aiModelId: string
    iepModelOverride: string | null
    schoolYear: number
    teamMembers: Array<{ name: string; role: string; organisation?: string; contact?: string }>
    parentCarerGoals?: string
    studentVoice?: string
  },
): Promise<IepPlanRow> {
  const supabase = await createClient()
  const monitoring = injectCensusEvidenceNote(draft.monitoring_plan, opts.schoolYear)

  const { data, error } = await supabase
    .from('iep_plans')
    .update({
      student_profile: draft.student_profile,
      present_levels: draft.present_levels,
      nccd_adjustment_level: draft.nccd_adjustment_level,
      nccd_category: draft.nccd_category,
      nccd_level_rationale: draft.nccd_level_rationale,
      consultation_notes: draft.consultation_notes,
      monitoring_plan: monitoring,
      parent_carer_goals: opts.parentCarerGoals ?? draft.parent_carer_goals ?? null,
      student_voice: opts.studentVoice ?? null,
      ai_generated: true,
      ai_model_id: opts.aiModelId,
      iep_model_override: opts.iepModelOverride,
      ai_disclaimer_accepted_at: new Date().toISOString(),
      placeholders_acknowledged: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', planId)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  await replaceChildRows(planId, draft, opts.teamMembers)
  return (await getIepPlan(planId))!
}

export interface UpdateIepInput {
  status?: IepStatus
  nccd_adjustment_level?: IepPlanRow['nccd_adjustment_level']
  nccd_category?: IepPlanRow['nccd_category']
  nccd_level_rationale?: string
  present_levels?: PresentLevels
  student_profile?: StudentProfile
  parent_carer_goals?: string
  student_voice?: string
  consultation_notes?: string
  monitoring_plan?: MonitoringPlan
  placeholders_acknowledged?: boolean
  version?: number
  goals?: IepGoalRow[]
  adjustments?: IepAdjustmentRow[]
  team_members?: IepTeamMemberRow[]
}

export async function updateIepPlan(id: string, patch: UpdateIepInput): Promise<IepPlanRow | null> {
  const existing = await getIepPlan(id)
  if (!existing) return null

  if (patch.version != null && patch.version !== existing.version) {
    throw new Error('Version conflict — reload and retry')
  }

  const supabase = await createClient()
  const { goals, adjustments, team_members, version, ...planPatch } = patch

  const { error } = await supabase
    .from('iep_plans')
    .update({
      ...planPatch,
      version: existing.version + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw new Error(error.message)

  if (goals) {
    await supabase.from('iep_goals').delete().eq('iep_plan_id', id)
    if (goals.length) {
      await supabase.from('iep_goals').insert(
        goals.map((g, i) => ({
          iep_plan_id: id,
          domain: g.domain,
          ndis_goal_id: g.ndis_goal_id,
          description: g.description,
          baseline: g.baseline,
          target: g.target,
          measurement_method: g.measurement_method,
          target_date: g.target_date,
          progress_notes: g.progress_notes,
          sort_order: g.sort_order ?? i,
          ai_drafted: g.ai_drafted,
        })),
      )
    }
  }

  if (adjustments) {
    await supabase.from('iep_adjustments').delete().eq('iep_plan_id', id)
    if (adjustments.length) {
      await supabase.from('iep_adjustments').insert(
        adjustments.map((a, i) => ({
          iep_plan_id: id,
          support_area: a.support_area,
          adjustment_type: a.adjustment_type,
          description: a.description,
          frequency: a.frequency,
          intensity: a.intensity,
          start_date: a.start_date,
          end_date: a.end_date,
          delivered_by: a.delivered_by,
          funding_source: a.funding_source,
          evidence_method: a.evidence_method,
          sort_order: a.sort_order ?? i,
        })),
      )
    }
  }

  if (team_members) {
    await supabase.from('iep_team_members').delete().eq('iep_plan_id', id)
    if (team_members.length) {
      await supabase.from('iep_team_members').insert(
        team_members.map((m, i) => ({
          iep_plan_id: id,
          name: m.name,
          role: m.role,
          organisation: m.organisation,
          contact: m.contact,
          attended_meeting: m.attended_meeting,
          sort_order: m.sort_order ?? i,
        })),
      )
    }
  }

  return getIepPlan(id)
}

export async function approveIepPlan(
  id: string,
  reviewerId: string,
  reviewerRole: ReviewerRole,
): Promise<IepPlanRow | null> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('iep_plans')
    .update({
      status: 'approved',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      reviewer_role: reviewerRole,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) throw new Error(error.message)
  return getIepPlan(id)
}

export async function duplicateIepAsDraft(
  sourceId: string,
  userId: string,
  schoolYear?: number,
): Promise<IepPlanRow | null> {
  const source = await getIepPlan(sourceId)
  if (!source) return null
  const year = schoolYear ?? new Date().getFullYear()

  const draft = await createManualIepDraft({
    participantId: source.participant_id,
    tenantId: source.tenant_id,
    userId,
    stateTerritory: source.state_territory,
    schoolName: source.school_name ?? '',
    schoolContact: source.school_contact ?? undefined,
    yearLevel: source.year_level ?? '',
    classroomTeacher: source.classroom_teacher ?? '',
    parentCarerGoals: source.parent_carer_goals ?? undefined,
    studentVoice: source.student_voice ?? undefined,
    presentLevels: source.present_levels,
    schoolYear: year,
    supersedesId: source.id,
  })

  if (source.goals?.length || source.adjustments?.length || source.team_members?.length) {
    await replaceChildRows(
      draft.id,
      {
        student_profile: source.student_profile,
        present_levels: source.present_levels,
        nccd_adjustment_level: source.nccd_adjustment_level ?? 'supplementary',
        nccd_category: source.nccd_category ?? 'cognitive',
        nccd_level_rationale: source.nccd_level_rationale ?? '',
        consultation_notes: source.consultation_notes ?? '',
        monitoring_plan: source.monitoring_plan,
        goals: (source.goals ?? []).map(({ id: _id, iep_plan_id: _p, ...g }) => ({
          ...g,
          ai_drafted: g.ai_drafted ?? true,
        })),
        adjustments: (source.adjustments ?? []).map(({ id: _id, iep_plan_id: _p, ...a }) => a),
      },
      (source.team_members ?? []).map((m) => ({
        name: m.name,
        role: m.role,
        organisation: m.organisation ?? undefined,
        contact: m.contact ?? undefined,
      })),
    )
  }

  return getIepPlan(draft.id)
}
