import { NextResponse } from 'next/server'
import { getHeatmapJob } from '@/lib/queue/heatmap-jobs'
import { requireTenantContext } from '@/lib/operations/tenant'

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const ctx = await requireTenantContext(request)
  if (!ctx.userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const job = getHeatmapJob(params.id)
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  return NextResponse.json({
    id: job.id,
    status: job.status,
    progress: job.progress,
    data: job.result,
    error: job.error,
  })
}
