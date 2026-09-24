import { NextResponse } from 'next/server'
import { writeAuditLog } from '@/lib/operations/audit'
import { requireTenantContext } from '@/lib/operations/tenant'
import { MAX_QTY, type PackageItem } from '@/lib/base-protection/coverage'
import { savePlan } from '@/lib/base-protection/queries'
import { getSite } from '@/lib/base-protection/sites'

export const dynamic = 'force-dynamic'

/** Replace a site's planned package. `{ items: [], radiusM: null }` returns it to "none assigned". */
export async function PUT(request: Request, { params }: { params: { siteId: string } }) {
  const ctx = await requireTenantContext(request)
  if (!ctx.userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  if (!getSite(params.siteId)) return NextResponse.json({ error: 'Unknown site' }, { status: 404 })

  let body: { items?: unknown; radiusM?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body must be JSON' }, { status: 400 })
  }

  if (!Array.isArray(body.items) || body.items.length > 40) {
    return NextResponse.json({ error: 'items must be an array of up to 40 systems' }, { status: 400 })
  }
  const items: PackageItem[] = []
  for (const raw of body.items as Array<Record<string, unknown>>) {
    const systemId = typeof raw?.systemId === 'string' ? raw.systemId.trim() : ''
    const qty = Number(raw?.qty)
    if (!systemId || systemId.length > 120 || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
      return NextResponse.json({ error: `Each item needs a systemId and a whole qty from 1 to ${MAX_QTY}` }, { status: 400 })
    }
    items.push({ systemId, qty })
  }
  let radiusM: number | null = null
  if (body.radiusM != null && body.radiusM !== '') {
    const r = Number(body.radiusM)
    if (!Number.isFinite(r) || r < 100 || r > 100_000) {
      return NextResponse.json({ error: 'radiusM must be 100 to 100,000 metres, or null' }, { status: 400 })
    }
    radiusM = Math.round(r)
  }

  try {
    const { plan, storage } = await savePlan(ctx.tenantId, ctx.userId, params.siteId, items, radiusM)
    await writeAuditLog({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'base_protection.plan.save',
      resourceType: 'base_protection_site_plan',
      resourceId: params.siteId,
      classification: ctx.classification,
      metadata: { items: plan.items, radiusM: plan.radiusM, storage },
    })
    return NextResponse.json({ data: plan, storage, classification: ctx.classification })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to save' }, { status: 500 })
  }
}
