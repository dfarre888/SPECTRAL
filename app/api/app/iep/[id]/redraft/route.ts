import { NextResponse } from 'next/server'
import { writeAuditLog } from '@/lib/operations/audit'
import { requireTenantContext } from '@/lib/operations/tenant'
import { requireValidConsent } from '@/lib/iep/consent'
import { buildIepGenerationContext, generateIepDraftFromContext } from '@/lib/iep/generate'
import { isSonnetEnabled } from '@/lib/iep/model-config'
import type { IepModelChoice } from '@/lib/iep/model-config'
import { applyGeneratedDraft, getIepPlan } from '@/lib/iep/plan-store'
import type { IepIntakePayload } from '@/lib/iep/types'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await requireTenantContext(request)
    if (!ctx.userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = (await request.json()) as { modelOverride?: IepModelChoice }
    const modelChoice = body.modelOverride ?? 'sonnet'

    if (modelChoice === 'sonnet' && !isSonnetEnabled()) {
      return NextResponse.json({ error: 'Sonnet escalation is not enabled' }, { status: 403 })
    }

    const plan = await getIepPlan(params.id)
    if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await requireValidConsent(plan.participant_id)

    const intake: IepIntakePayload = {
      participantId: plan.participant_id,
      stateTerritory: plan.state_territory,
      schoolName: plan.school_name ?? '',
      yearLevel: plan.year_level ?? '',
      classroomTeacher: plan.classroom_teacher ?? '',
      presentLevels: plan.present_levels,
      parentCarerGoals: plan.parent_carer_goals ?? undefined,
      studentVoice: plan.student_voice ?? undefined,
      teamMembers: (plan.team_members ?? []).map((m) => ({
        name: m.name,
        role: m.role,
        organisation: m.organisation ?? undefined,
        contact: m.contact ?? undefined,
      })),
      schoolYear: plan.school_year,
      consentGranted: true,
      parentCarerName: '',
    }

    const genCtx = await buildIepGenerationContext(ctx.tenantId, intake)
    const { draft, modelId, modelOverride } = await generateIepDraftFromContext(genCtx, modelChoice)

    const updated = await applyGeneratedDraft(plan.id, draft, {
      aiModelId: modelId,
      iepModelOverride: modelOverride,
      schoolYear: plan.school_year,
      teamMembers: intake.teamMembers,
      parentCarerGoals: plan.parent_carer_goals ?? undefined,
      studentVoice: plan.student_voice ?? undefined,
    })

    await writeAuditLog({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'iep.redraft',
      resourceType: 'iep_plan',
      resourceId: plan.id,
      classification: ctx.classification,
      metadata: { modelId, modelOverride },
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Redraft failed'
    console.error('[POST /api/app/iep/[id]/redraft]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
