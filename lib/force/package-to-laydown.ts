import { emptyLaydownDocument, type MapLaydownDocument } from '@/lib/planner/battlespace-plan'
import type { MapAssetsPayload } from '@/lib/map/types'
import type { ForcePlatform, TheatreTemplate } from '@/lib/force/types'

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

export function resolveMapAssetId(row: ForcePlatform, catalog: MapAssetsPayload): {
  kind: 'uas' | 'cuas' | 'radar' | 'effector' | null
  assetId: string | null
} {
  const candidates = [row.platform_library_id, slug(row.short_name), slug(row.designation)].filter(Boolean) as string[]
  for (const id of candidates) {
    if (catalog.uas.some((a) => a.id === id || a.slug === id)) return { kind: 'uas', assetId: catalog.uas.find((a) => a.id === id || a.slug === id)!.id }
    if (catalog.cuas.some((a) => a.id === id)) return { kind: 'cuas', assetId: id }
    if (catalog.radars.some((a) => a.id === id)) return { kind: 'radar', assetId: id }
    if (catalog.effectors.some((a) => a.id === id)) return { kind: 'effector', assetId: id }
  }
  const hay = `${row.designation} ${row.short_name}`.toLowerCase()
  const radarHit = catalog.radars.find((a) => hay.includes(a.name.toLowerCase()) || (a.nato_name && hay.includes(a.nato_name.toLowerCase())))
  if (radarHit) return { kind: 'radar', assetId: radarHit.id }
  const cuasHit = catalog.cuas.find((a) => hay.includes(a.name.toLowerCase()))
  if (cuasHit) return { kind: 'cuas', assetId: cuasHit.id }
  const uasHit = catalog.uas.find((a) => hay.includes(a.name.toLowerCase()) || hay.includes(a.slug.replace(/-/g, ' ')))
  if (uasHit) return { kind: 'uas', assetId: uasHit.id }
  return { kind: null, assetId: null }
}

export function packageToLaydown(
  theatre: TheatreTemplate,
  rows: ForcePlatform[],
  catalog: MapAssetsPayload,
): { doc: MapLaydownDocument; placed: number; unmatched: ForcePlatform[] } {
  const doc = emptyLaydownDocument()
  doc.viewport = { lon: theatre.lon, lat: theatre.lat, height_m: theatre.height_m }
  const unmatched: ForcePlatform[] = []
  let placed = 0
  rows.forEach((row, i) => {
    const resolved = resolveMapAssetId(row, catalog)
    const east = row.force_side === 'red' || row.nation_code === theatre.defaultRed
    const lon = theatre.lon + (east ? 1.1 : -1.1) + (i % 5) * 0.12
    const lat = theatre.lat + Math.floor(i / 5) * 0.1 - 0.2
    if (!resolved.kind || !resolved.assetId) {
      unmatched.push(row)
      return
    }
    placed += 1
    const instanceId = `force-${row.id}`
    if (resolved.kind === 'uas') {
      doc.uas.push({
        instanceId,
        assetId: resolved.assetId,
        lon,
        lat,
        terrainAMSL: 80,
        discAltitude_m: 400,
        lateralRadius_m: 12000,
        ceilingAMSL_m: 800,
        annotationTime_min: 0,
        effectiveRange_km: 200,
      })
    } else if (resolved.kind === 'cuas') {
      doc.cuas.push({
        instanceId,
        assetId: resolved.assetId,
        lon,
        lat,
        terrainAMSL: 40,
        hasTerrainMasking: false,
      })
    } else if (resolved.kind === 'radar') {
      doc.radars.push({
        instanceId,
        assetId: resolved.assetId,
        lon,
        lat,
        terrainAMSL: 40,
      })
    } else {
      doc.effectors.push({
        instanceId,
        assetId: resolved.assetId,
        lon,
        lat,
        terrainAMSL: 40,
      })
    }
  })
  return { doc, placed, unmatched }
}

/** Representative Spectral UAS/C-UAS already in the map catalog for each theatre. */
export function theatreSeedAssetIds(theatreId: string): { uas: string[]; cuas: string[] } {
  if (theatreId === 'scs') return { uas: ['wing-loong-2', 'ch-4-rainbow', 'mq-9-reaper'], cuas: ['iron-beam', 'drone-dome'] }
  if (theatreId === 'korea') return { uas: ['shahed-136', 'lancet-3'], cuas: ['nasams-amraam-er', 'iron-beam'] }
  return { uas: ['shahed-136', 'fpv-fibre-optic'], cuas: ['skynex', 'drone-dome'] }
}
