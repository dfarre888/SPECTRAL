import { NextResponse } from 'next/server'
import { writeAuditLog } from '@/lib/operations/audit'
import { requireTenantContext } from '@/lib/operations/tenant'
import { listParticipants } from '@/lib/iep/plan-store'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const ctx = await requireTenantContext()
    if (!ctx.userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    const data = await listParticipants(ctx.tenantId)
    return NextResponse.json({ data })
  } catch (err) {
    console.error('[GET /api/app/participants]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireTenantContext(request)
    if (!ctx.userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = (await request.json()) as {
      fullName?: string
      preferredName?: string
      primaryDisability?: string
      diagnoses?: string[]
    }
    if (!body.fullName?.trim()) {
      return NextResponse.json({ error: 'fullName required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('participants')
      .insert({
        tenant_id: ctx.tenantId,
        full_name: body.fullName.trim(),
        preferred_name: body.preferredName?.trim() ?? null,
        primary_disability: body.primaryDisability ?? null,
        diagnoses: body.diagnoses ?? [],
        created_by: ctx.userId,
      })
      .select('*')
      .single()

    if (error) throw error

    await writeAuditLog({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'participant.create',
      resourceType: 'participant',
      resourceId: data.id,
      classification: ctx.classification,
    })

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[POST /api/app/participants]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
