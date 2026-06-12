import { NextResponse } from 'next/server'
import { writeAuditLog } from '@/lib/operations/audit'
import { requireTenantContext } from '@/lib/operations/tenant'
import { createScenario, listScenarios } from '@/lib/wopr/store'

export async function GET(request: Request) {
  const ctx = await requireTenantContext(request)
  if (!ctx.userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const data = await listScenarios(ctx.tenantId)
  return NextResponse.json({ data, classification: ctx.classification })
}

export async function POST(request: Request) {
  const ctx = await requireTenantContext(request)
  if (!ctx.userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = (await request.json()) as { name?: string }
  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'name required' }, { status: 400 })
  }

  const scenario = await createScenario(
    ctx.tenantId,
    ctx.userId,
    body.name.trim(),
    ctx.classification,
  )

  await writeAuditLog({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    action: 'wopr.scenario.create',
    resourceType: 'wopr_scenario',
    resourceId: scenario.id,
    classification: ctx.classification,
  })

  return NextResponse.json({ data: scenario, classification: ctx.classification })
}
