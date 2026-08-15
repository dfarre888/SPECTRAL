import { NextResponse } from 'next/server'
import { isDemoMode } from '@/lib/demo'
import { createClient } from '@/lib/supabase/server'
import { fetchBmiCatalog } from '@/lib/force/queries'
import { enrichPlatform } from '@/lib/force/assemble'
import { getTheatre } from '@/lib/force/theatres'
import { packageToLaydown, theatreSeedAssetIds } from '@/lib/force/package-to-laydown'
import { getMapAssets } from '@/lib/map/queries'
import { emptyLaydownDocument } from '@/lib/planner/battlespace-plan'

export async function GET(req: Request) {
  if (!isDemoMode()) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  const url = new URL(req.url)
  const theatre = getTheatre(url.searchParams.get('theatre'))
  if (!theatre) return NextResponse.json({ error: 'Unknown theatre' }, { status: 400 })

  const ids = (url.searchParams.get('ids') ?? '').split(',').filter(Boolean)
  const [rows, catalog] = await Promise.all([fetchBmiCatalog(), getMapAssets()])
  const selected = rows.filter((r) => ids.includes(r.id)).map((r) => enrichPlatform(r, [], [], [], []))
  const built = packageToLaydown(theatre, selected, catalog)
  const seeds = theatreSeedAssetIds(theatre.id)
  const doc = built.doc
  seeds.uas.forEach((assetId, i) => {
    if (doc.uas.some((u) => u.assetId === assetId)) return
    if (!catalog.uas.some((a) => a.id === assetId)) return
    doc.uas.push({
      instanceId: `force-seed-uas-${assetId}`,
      assetId,
      lon: theatre.lon + 0.8 + i * 0.15,
      lat: theatre.lat + 0.15,
      terrainAMSL: 80,
      discAltitude_m: 350,
      lateralRadius_m: 10000,
      ceilingAMSL_m: 700,
      annotationTime_min: 0,
      effectiveRange_km: 200,
    })
  })
  seeds.cuas.forEach((assetId, i) => {
    if (doc.cuas.some((c) => c.assetId === assetId)) return
    if (!catalog.cuas.some((a) => a.id === assetId)) return
    doc.cuas.push({
      instanceId: `force-seed-cuas-${assetId}`,
      assetId,
      lon: theatre.lon - 0.8 - i * 0.12,
      lat: theatre.lat - 0.1,
      terrainAMSL: 40,
      hasTerrainMasking: false,
    })
  })
  if (!doc.updatedAt) {
    const empty = emptyLaydownDocument()
    doc.updatedAt = empty.updatedAt
  }

  return NextResponse.json({
    theatre,
    laydown: doc,
    placed: doc.uas.length + doc.cuas.length + doc.radars.length + doc.effectors.length,
    unmatched: built.unmatched.map((r) => ({ id: r.id, name: r.designation, domain: r.domain })),
  })
}
