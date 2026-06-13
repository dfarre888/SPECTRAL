import { NextResponse } from 'next/server'
import { createHeatmapJob } from '@/lib/queue/heatmap-jobs'
import { roleCanRunPropagation } from '@/lib/operations/auth-config'
import { isOperationsEdition } from '@/lib/operations/edition'
import { requireTenantContext } from '@/lib/operations/tenant'
import type { HeatmapRequest } from '@/lib/propagation/types'

export async function POST(request: Request) {
  if (!isOperationsEdition()) {
    return NextResponse.json({ error: 'Operations edition required' }, { status: 403 })
  }

  const ctx = await requireTenantContext(request)
  if (!ctx.userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  if (!roleCanRunPropagation(ctx.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = (await request.json()) as HeatmapRequest
  if (!body.emitter || !body.bounds || !body.grid_steps) {
    return NextResponse.json({ error: 'Invalid heatmap request' }, { status: 400 })
  }

  const jobId = createHeatmapJob(body)
  return NextResponse.json({ jobId, status: 'queued' })
}
