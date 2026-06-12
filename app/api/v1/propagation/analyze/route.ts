import { NextResponse } from 'next/server'
import { writeAuditLog } from '@/lib/operations/audit'
import { roleCanRunPropagation } from '@/lib/operations/auth-config'
import { requireTenantContext } from '@/lib/operations/tenant'
import { analyzePropagation } from '@/lib/propagation/analyze'
import type { PropagationRequest } from '@/lib/propagation/types'

export async function POST(request: Request) {
  const ctx = await requireTenantContext(request)
  if (!ctx.userId) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  if (!roleCanRunPropagation(ctx.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: PropagationRequest
  try {
    body = (await request.json()) as PropagationRequest
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.emitter?.freq_hz || !body.emitter?.erp_dbm) {
    return NextResponse.json({ error: 'emitter.freq_hz and emitter.erp_dbm required' }, { status: 400 })
  }

  const result = analyzePropagation({
    ...body,
    classification: body.classification ?? ctx.classification,
  })

  await writeAuditLog({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    action: 'propagation.analyze',
    resourceType: 'propagation',
    classification: ctx.classification,
    metadata: {
      los: result.los_state,
      path_loss_db: result.path_loss_db,
      model_tier: result.model_tier,
    },
  })

  return NextResponse.json({ data: result, classification: ctx.classification })
}
