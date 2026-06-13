import { NextResponse } from 'next/server'
import { listScenarioTemplates } from '@/lib/wopr/scenario-templates'
import { requireTenantContext } from '@/lib/operations/tenant'

export async function GET(request: Request) {
  const ctx = await requireTenantContext(request)
  if (!ctx.userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const templates = await listScenarioTemplates()
  return NextResponse.json({ data: templates })
}
