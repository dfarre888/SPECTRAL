import { NextResponse } from 'next/server'
import { writeAuditLog } from '@/lib/operations/audit'
import { requireTenantContext } from '@/lib/operations/tenant'
import { grantConsent, requireValidConsent } from '@/lib/iep/consent'
import { buildIepGenerationContext, generateIepDraftFromContext } from '@/lib/iep/generate'
import { applyGeneratedDraft, createManualIepDraft, getParticipant } from '@/lib/iep/plan-store'
import { resolveDocumentTitle } from '@/lib/iep/state-labels'
import type { AustralianState, IepIntakePayload, PresentLevels } from '@/lib/iep/types'
import type { IepModelChoice } from '@/lib/iep/model-config'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const ctx = await requireTenantContext(request)
    if (!ctx.userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = (await request.json()) as {
      participantId?: string
      stateTerritory?: AustralianState
      schoolName?: string
      schoolContact?: string
      yearLevel?: string
      classroomTeacher?: string
      presentLevels?: PresentLevels
      parentCarerGoals?: string
      studentVoice?: string
      teamMembers?: IepIntakePayload['teamMembers']
      schoolYear?: number
      supersedesId?: string
      consentGranted?: boolean
      parentCarerName?: string
      parentCarerRelationship?: string
      under15AssentConfirmed?: boolean
      modelOverride?: IepModelChoice
    }

    if (!body.participantId || !body.schoolName || !body.yearLevel || !body.classroomTeacher) {
      return NextResponse.json({ error: 'Missing required intake fields' }, { status: 400 })
    }

    const participant = await getParticipant(body.participantId, ctx.tenantId)
    if (!participant) return NextResponse.json({ error: 'Participant not found' }, { status: 404 })

    if (body.consentGranted && body.parentCarerName) {
      await grantConsent({
        participantId: body.participantId,
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        parentCarerName: body.parentCarerName,
        parentCarerRelationship: body.parentCarerRelationship,
        under15AssentConfirmed: body.under15AssentConfirmed,
      })
    }

    await requireValidConsent(body.participantId)

    const stateTerritory = body.stateTerritory ?? 'NSW'
    const schoolYear = body.schoolYear ?? new Date().getFullYear()

    const plan = await createManualIepDraft({
      participantId: body.participantId,
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      stateTerritory,
      schoolName: body.schoolName,
      schoolContact: body.schoolContact,
      yearLevel: body.yearLevel,
      classroomTeacher: body.classroomTeacher,
      parentCarerGoals: body.parentCarerGoals,
      studentVoice: body.studentVoice,
      presentLevels: body.presentLevels,
      schoolYear,
      supersedesId: body.supersedesId,
    })

    const intake: IepIntakePayload = {
      participantId: body.participantId,
      stateTerritory,
      schoolName: body.schoolName,
      schoolContact: body.schoolContact,
      yearLevel: body.yearLevel,
      classroomTeacher: body.classroomTeacher,
      presentLevels: body.presentLevels ?? {},
      parentCarerGoals: body.parentCarerGoals,
      studentVoice: body.studentVoice,
      teamMembers: body.teamMembers ?? [],
      schoolYear,
      supersedesId: body.supersedesId,
      consentGranted: true,
      parentCarerName: body.parentCarerName ?? '',
      parentCarerRelationship: body.parentCarerRelationship,
      under15AssentConfirmed: body.under15AssentConfirmed,
    }

    const genCtx = await buildIepGenerationContext(ctx.tenantId, intake)
    const { draft, modelId, modelOverride } = await generateIepDraftFromContext(
      genCtx,
      body.modelOverride ?? 'haiku',
    )

    const updated = await applyGeneratedDraft(plan.id, draft, {
      aiModelId: modelId,
      iepModelOverride: modelOverride,
      schoolYear,
      teamMembers: intake.teamMembers,
      parentCarerGoals: body.parentCarerGoals,
      studentVoice: body.studentVoice,
    })

    await writeAuditLog({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'iep.generate',
      resourceType: 'iep_plan',
      resourceId: updated.id,
      classification: ctx.classification,
      metadata: { modelId, documentTitle: resolveDocumentTitle(stateTerritory) },
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed'
    console.error('[POST /api/app/iep/generate]', err)
    return NextResponse.json({ error: message }, { status: message.includes('consent') ? 403 : 500 })
  }
}
