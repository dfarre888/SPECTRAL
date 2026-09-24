import { NextResponse } from 'next/server'
import { requireTenantContext } from '@/lib/operations/tenant'
import { getScenario, listTicks } from '@/lib/wopr/store'

export const dynamic = 'force-dynamic'

/** Recorded turns for a scenario, oldest first, each with the world as it stood after it. */
export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const ctx = await requireTenantContext(request)
  if (!ctx.userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const scenario = await getScenario(params.id, ctx.tenantId)
  if (!scenario) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const data = await listTicks(params.id, ctx.tenantId)
  return NextResponse.json({ data, classification: ctx.classification })
}
