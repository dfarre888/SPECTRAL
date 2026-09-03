/**
 * Record a go / no-go decision with audit trail.
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */
import { NextResponse } from 'next/server'
import {
  buildCommandAssessment,
  CommandPlanNotFoundError,
} from '@/lib/command/command-board-data'
import type { GoNoGoStatus } from '@/lib/command/go-no-go-types'
import { AuditPersistError, auditDecision } from '@/lib/operations/audit'
import { requireTenantContext } from '@/lib/operations/tenant'
import { publishPlanEvent } from '@/lib/planner/plan-live-bus'
import { getPlan } from '@/lib/planner/plan-store'

export const dynamic = 'force-dynamic'

const VALID: GoNoGoStatus[] = ['go', 'caution', 'no_go']

export async function POST(request: Request) {
  try {
    const ctx = await requireTenantContext(request)
    if (!ctx.userId) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as {
      plan_id?: string
      decision?: GoNoGoStatus
      notes?: string
      ds_player_id?: string
    }

    if (!body.decision || !VALID.includes(body.decision)) {
      return NextResponse.json(
        { error: 'decision required (go | caution | no_go)' },
        { status: 400 },
      )
    }

    // Align channel key with /plans/[id]/stream (plan.tenant_id ?? ctx.tenantId)
    let channelTenantId = ctx.tenantId
    if (body.plan_id) {
      const plan = await getPlan(body.plan_id, ctx.userId, ctx.tenantId)
      if (!plan) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      channelTenantId = plan.tenant_id ?? ctx.tenantId
    }

    const assessment = await buildCommandAssessment({
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      planId: body.plan_id ?? null,
      dsPlayerId: body.ds_player_id,
    })

    const resourceId = body.plan_id ?? assessment.plan_id ?? 'command-default'

    const audit = await auditDecision({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'command.go_no_go.decision',
      resourceType: 'go_no_go',
      resourceId,
      classification: ctx.classification,
      metadata: {
        decision: body.decision,
        engine_status: assessment.status,
        notes: body.notes ?? null,
        blocking: assessment.blocking,
        tenant_id: ctx.tenantId,
      },
    })

    // Fan out to peer Command boards (Operations in-process SSE; Training no-op)
    if (body.plan_id) {
      publishPlanEvent(channelTenantId, body.plan_id, 'command.go_no_go.decision', {
        decision: body.decision,
        assessed_at: assessment.assessed_at,
        audit_id: audit.id,
      })
    }

    return NextResponse.json({
      data: {
        decision: body.decision,
        assessment,
        audit_id: audit.id,
      },
      classification: ctx.classification,
    })
  } catch (err) {
    if (err instanceof CommandPlanNotFoundError) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (err instanceof AuditPersistError) {
      return NextResponse.json(
        { error: 'Audit persist failed', detail: err.message, audit_persisted: false },
        { status: 503 },
      )
    }
    console.error('[SPECTRAL] go-no-go decision error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
