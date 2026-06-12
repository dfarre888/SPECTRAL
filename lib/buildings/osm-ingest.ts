import type { BuildingFootprint, BuildingMaterialClass } from '@/lib/buildings/types'

interface OsmBuildingElement {
  type: string
  id: number
  lat?: number
  lon?: number
  tags?: Record<string, string>
  geometry?: { lat: number; lon: number }[]
}

function parseHeight(tags: Record<string, string> | undefined): number {
  if (!tags) return 10
  if (tags.height) {
    const m = parseFloat(tags.height.replace(/m/i, ''))
    if (!Number.isNaN(m)) return m
  }
  if (tags['building:levels']) {
    const levels = parseInt(tags['building:levels'], 10)
    if (!Number.isNaN(levels)) return levels * 3
  }
  return 10
}

export function osmElementsToFootprints(
  tenantId: string,
  elements: OsmBuildingElement[],
): BuildingFootprint[] {
  const out: BuildingFootprint[] = []
  for (const el of elements) {
    if (el.type !== 'way' || !el.geometry?.length) continue
    out.push({
      id: `osm-${el.id}`,
      tenantId,
      source: 'osm',
      polygon: el.geometry.map((g) => ({ lat: g.lat, lon: g.lon })),
      height_m: parseHeight(el.tags),
      material_class: (el.tags?.['building:material'] as BuildingMaterialClass) ?? 'concrete',
      classification: 'UNCLASSIFIED',
    })
  }
  return out
}

export async function fetchOsmBuildings(
  south: number,
  west: number,
  north: number,
  east: number,
): Promise<OsmBuildingElement[]> {
  const query = `[out:json][timeout:25];(way["building"](${south},${west},${north},${east}););out geom;`
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  })
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`)
  const json = (await res.json()) as { elements?: OsmBuildingElement[] }
  return json.elements ?? []
}
