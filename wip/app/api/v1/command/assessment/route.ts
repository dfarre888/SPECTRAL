import { NextResponse } from 'next/server'
import {
  buildCommandAssessment,
  CommandPlanNotFoundError,
} from '@/lib/command/command-board-data'
import { AuditPersistError, writeAuditLog } from '@/lib/operations/audit'
import { isOperationsEdition } from '@/lib/operations/edition'
import { requireTenantContext } from '@/lib/operations/tenant'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const ctx = await requireTenantContext(request)
    if (!ctx.userId) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const planId = searchParams.get('plan_id')
    const dsPlayerId = searchParams.get('ds_player_id')

    const data = await buildCommandAssessment({
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      planId,
      dsPlayerId,
    })

    // Operations: durable audit required. Training: best-effort (local/demo).
    await writeAuditLog({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'command.go_no_go.assessment',
      resourceType: 'go_no_go',
      resourceId: planId ?? data.plan_id ?? 'command-default',
      classification: ctx.classification,
      metadata: {
        status: data.status,
        tenant_id: ctx.tenantId,
      },
      requirePersisted: isOperationsEdition(),
    })

    return NextResponse.json({
      data,
      classification: ctx.classification,
      operations: isOperationsEdition(),
    })
  } catch (err) {
    if (err instanceof CommandPlanNotFoundError) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (err instanceof AuditPersistError) {
      return NextResponse.json({ error: 'Audit persist failed' }, { status: 503 })
    }
    console.error('[SPECTRAL] command assessment error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
