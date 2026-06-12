import { NextResponse } from 'next/server'
import { requireTenantContext } from '@/lib/operations/tenant'

export async function GET(request: Request) {
  try {
    const ctx = await requireTenantContext(request)
    return NextResponse.json({
      classification: ctx.classification,
      tenantId: ctx.tenantId,
      edition: process.env.SPECTRAL_EDITION ?? 'training',
    })
  } catch {
    return NextResponse.json({ classification: 'UNCLASSIFIED', edition: 'training' })
  }
}

export async function POST(request: Request) {
  const ctx = await requireTenantContext(request)
  if (!ctx.userId) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const body = (await request.json()) as { classification?: string }
  const classification = body.classification ?? 'UNCLASSIFIED'

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  await supabase.from('session_classification').upsert({
    user_id: ctx.userId,
    tenant_id: ctx.tenantId,
    classification,
    updated_at: new Date().toISOString(),
  })

  return NextResponse.json({ classification })
}
