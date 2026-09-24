import { NextResponse } from 'next/server'
import { listPlans } from '@/lib/base-protection/queries'
import { requireTenantContext } from '@/lib/operations/tenant'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const ctx = await requireTenantContext(request)
  if (!ctx.userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  try {
    const { plans, storage } = await listPlans(ctx.tenantId)
    return NextResponse.json({ data: plans, storage, classification: ctx.classification })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to load plans' }, { status: 500 })
  }
}
