import { NextResponse } from 'next/server'
import { loadEngagementEconomicsPanelRows } from '@/lib/planner/engagement-economics-queries'
import { requireTenantContext } from '@/lib/operations/tenant'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const ctx = await requireTenantContext(request)
    if (!ctx.userId) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const platformId = searchParams.get('platform_id') ?? undefined
    const rows = await loadEngagementEconomicsPanelRows(platformId)

    return NextResponse.json({
      data: rows,
      classification: 'UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY',
    })
  } catch {
    return NextResponse.json({ error: 'Failed to load economics rows' }, { status: 500 })
  }
}
