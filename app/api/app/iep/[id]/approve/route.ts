import { NextResponse } from 'next/server'
import { writeAuditLog } from '@/lib/operations/audit'
import { requireTenantContext } from '@/lib/operations/tenant'
import { hasUnresolvedPlaceholders } from '@/lib/iep/schemas'
import { approveIepPlan, getIepPlan } from '@/lib/iep/plan-store'
import type { ReviewerRole } from '@/lib/iep/types'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await requireTenantContext(request)
    if (!ctx.userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = (await request.json()) as {
      reviewerRole?: ReviewerRole
      submitForReview?: boolean
    }

    const plan = await getIepPlan(params.id)
    if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (body.submitForReview) {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      await supabase
        .from('iep_plans')
        .update({ status: 'pending_review', updated_at: new Date().toISOString() })
        .eq('id', params.id)
      const updated = await getIepPlan(params.id)
      return NextResponse.json({ data: updated })
    }

    if (hasUnresolvedPlaceholders(plan)) {
      return NextResponse.json(
        { error: 'Resolve [REQUIRES TEACHER INPUT] placeholders or acknowledge before approval' },
        { status: 400 },
      )
    }

    const updated = await approveIepPlan(
      params.id,
      ctx.userId,
      body.reviewerRole ?? 'coordinator',
    )

    await writeAuditLog({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'iep.approve',
      resourceType: 'iep_plan',
      resourceId: params.id,
      classification: ctx.classification,
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('[POST /api/app/iep/[id]/approve]', err)
    return NextResponse.json({ error: 'Approval failed' }, { status: 500 })
  }
}
