import { NextResponse } from 'next/server'
import { writeAuditLog } from '@/lib/operations/audit'
import { roleCanRunPropagation } from '@/lib/operations/auth-config'
import { requireTenantContext } from '@/lib/operations/tenant'
import { computeHeatmap } from '@/lib/propagation/heatmap'
import type { HeatmapRequest } from '@/lib/propagation/types'

export async function POST(request: Request) {
  const ctx = await requireTenantContext(request)
  if (!ctx.userId) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  if (!roleCanRunPropagation(ctx.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: HeatmapRequest
  try {
    body = (await request.json()) as HeatmapRequest
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const result = computeHeatmap(body)

  await writeAuditLog({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    action: 'propagation.heatmap',
    resourceType: 'propagation',
    classification: ctx.classification,
    metadata: { cells: result.cells.length, grid_steps: result.grid_steps },
  })

  return NextResponse.json({ data: result })
}
