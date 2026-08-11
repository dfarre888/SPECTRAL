import { NextResponse } from 'next/server'
import { requireTenantContext } from '@/lib/operations/tenant'
import { listIepPlans } from '@/lib/iep/plan-store'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const ctx = await requireTenantContext(request)
    if (!ctx.userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const participantId = new URL(request.url).searchParams.get('participantId')
    if (!participantId) {
      return NextResponse.json({ error: 'participantId required' }, { status: 400 })
    }

    const data = await listIepPlans(participantId)
    return NextResponse.json({ data })
  } catch (err) {
    console.error('[GET /api/app/iep]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
