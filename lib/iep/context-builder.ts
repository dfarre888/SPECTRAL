import { IEP_GENERATION_SYSTEM_PROMPT } from '@/lib/iep/prompts/generate-iep'
import type { IepIntakePayload, ParticipantRow, NdisGoalRow } from '@/lib/iep/types'

export interface ParticipantInsightRow {
  recommendations: unknown[]
  support_gaps: unknown[]
}

export interface ContextChunk {
  doc_type: string
  title: string
  content: string
}

export interface IepGenerationContext {
  participant: ParticipantRow
  ndisGoals: NdisGoalRow[]
  insights: ParticipantInsightRow | null
  documentChunks: ContextChunk[]
  intake: IepIntakePayload
  hasAcademicData: boolean
}

export function participantPiiValues(p: ParticipantRow): string[] {
  return [p.full_name, p.preferred_name ?? ''].filter(Boolean)
}

export function buildGenerationUserMessage(ctx: IepGenerationContext): string {
  const name = ctx.participant.preferred_name ?? ctx.participant.full_name
  return JSON.stringify(
    {
      instruction: 'Generate an NCCD-compliant school IEP draft as JSON matching the required schema.',
      participant: {
        display_name: name,
        primary_disability: ctx.participant.primary_disability,
        diagnoses: ctx.participant.diagnoses,
        communication_notes: ctx.participant.communication_notes,
        date_of_birth: ctx.participant.date_of_birth,
      },
      ndis_goals: ctx.ndisGoals.map((g) => ({
        id: g.id,
        title: g.title,
        description: g.description,
        domain: g.domain,
        progress: g.progress,
        target_date: g.target_date,
      })),
      insights: ctx.insights,
      report_excerpts: ctx.documentChunks,
      intake: {
        state_territory: ctx.intake.stateTerritory,
        school_name: ctx.intake.schoolName,
        year_level: ctx.intake.yearLevel,
        classroom_teacher: ctx.intake.classroomTeacher,
        present_levels: ctx.intake.presentLevels,
        parent_carer_goals: ctx.intake.parentCarerGoals,
        student_voice: ctx.intake.studentVoice,
        team_members: ctx.intake.teamMembers,
      },
      academic_data_provided: ctx.hasAcademicData,
    },
    null,
    2,
  )
}

export function hasAcademicPerformanceData(presentLevels: IepIntakePayload['presentLevels']): boolean {
  const academic = presentLevels.academic ?? {}
  const values = Object.values(academic).filter((v) => v && v.trim().length > 0)
  return values.length > 0
}

export { IEP_GENERATION_SYSTEM_PROMPT }
