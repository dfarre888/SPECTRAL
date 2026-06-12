import { NextResponse } from 'next/server'
import { writeAuditLog } from '@/lib/operations/audit'
import { roleCanImportPlatforms } from '@/lib/operations/auth-config'
import { requireTenantContext } from '@/lib/operations/tenant'
import { osmElementsToFootprints, fetchOsmBuildings } from '@/lib/buildings/osm-ingest'
import { cacheBuildingsForTenant, invalidateBuildingCache } from '@/lib/buildings/store'
import type { BuildingFootprint } from '@/lib/buildings/types'

export async function POST(request: Request) {
  const ctx = await requireTenantContext(request)
  if (!ctx.userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  if (!roleCanImportPlatforms(ctx.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = (await request.json()) as {
    source?: 'osm' | 'customer_upload'
    bounds?: { south: number; west: number; north: number; east: number }
    footprints?: BuildingFootprint[]
  }

  let buildings: BuildingFootprint[] = []

  if (body.source === 'osm' && body.bounds) {
    const elements = await fetchOsmBuildings(
      body.bounds.south,
      body.bounds.west,
      body.bounds.north,
      body.bounds.east,
    )
    buildings = osmElementsToFootprints(ctx.tenantId, elements)
  } else if (body.source === 'customer_upload' && body.footprints) {
    buildings = body.footprints.map((f) => ({ ...f, tenantId: ctx.tenantId, source: 'customer_upload' }))
  } else {
    return NextResponse.json({ error: 'source and bounds or footprints required' }, { status: 400 })
  }

  invalidateBuildingCache(ctx.tenantId)
  cacheBuildingsForTenant(ctx.tenantId, buildings)

  try {
    const { createClient } = await import('@/lib/supabase/server')
    const client = await createClient()
    for (const b of buildings.slice(0, 500)) {
      await client.from('building_footprints').insert({
        tenant_id: ctx.tenantId,
        source: b.source,
        classification: ctx.classification,
        geometry: { type: 'Polygon', coordinates: b.polygon.map((p) => [p.lon, p.lat]) },
        height_m: b.height_m,
        material_class: b.material_class,
      })
    }
  } catch {
    // memory cache still valid if DB unavailable
  }

  await writeAuditLog({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    action: 'buildings.ingest',
    resourceType: 'buildings',
    classification: ctx.classification,
    metadata: { count: buildings.length, source: body.source },
  })

  return NextResponse.json({ data: { count: buildings.length } })
}
