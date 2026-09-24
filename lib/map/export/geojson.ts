/**
 * GeoJSON (RFC 7946) writer for the Map Intel laydown.
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 *
 * One Point per asset, one Polygon per range ring, one LineString per planned
 * mission path, and one LineString per spectrum conflict. Positions are
 * [lon, lat, alt_m AMSL]; rings are counter-clockwise.
 */
import { circleRing, type ExportDocument, type ExportItem } from './model'

type Position = [number, number] | [number, number, number]

export interface LaydownFeature {
  type: 'Feature'
  id: string
  geometry:
    | { type: 'Point'; coordinates: Position }
    | { type: 'LineString'; coordinates: Position[] }
    | { type: 'Polygon'; coordinates: Position[][] }
  properties: Record<string, string | number | boolean | string[] | null>
}

export interface LaydownFeatureCollection {
  type: 'FeatureCollection'
  /** Foreign member (allowed by RFC 7946 section 6.1). */
  metadata: { title: string; classification: string; generated: string; source: string; height_reference: string }
  features: LaydownFeature[]
}

function r6(n: number) {
  return +n.toFixed(6)
}

function baseProps(item: ExportItem) {
  return {
    uid: item.uid,
    side: item.side,
    affiliation: item.affiliation,
    kind: item.kind,
    type: item.cotType,
    callsign: item.callsign,
    system: item.name,
    role: item.role,
    range_m: item.range_m,
    range_kind: item.range_kind,
    band: item.bands.join('; '),
    bands: item.bands,
    source: item.source,
    confidence: item.confidence,
  }
}

export function buildGeoJson(doc: ExportDocument): LaydownFeatureCollection {
  const features: LaydownFeature[] = []
  for (const item of doc.items) {
    features.push({
      type: 'Feature',
      id: item.uid,
      geometry: { type: 'Point', coordinates: [r6(item.lon), r6(item.lat), +item.alt_m.toFixed(1)] },
      properties: { feature: 'asset', ...baseProps(item) },
    })
  }
  for (const item of doc.items) {
    if (!item.range_m) continue
    features.push({
      type: 'Feature',
      id: `${item.uid}-ring`,
      geometry: { type: 'Polygon', coordinates: [circleRing(item.lon, item.lat, item.range_m)] },
      properties: { feature: 'range_ring', of: item.uid, ...baseProps(item) },
    })
  }
  for (const item of doc.items) {
    if (!item.path || item.path.length < 2) continue
    features.push({
      type: 'Feature',
      id: `${item.uid}-route`,
      geometry: { type: 'LineString', coordinates: item.path.map((p) => [r6(p.lon), r6(p.lat), +p.alt_m.toFixed(1)] as Position) },
      properties: { feature: 'mission_path', of: item.uid, ...baseProps(item) },
    })
  }
  for (const c of doc.conflicts) {
    const pts = c.path.length === 1 ? [c.path[0], c.path[0]] : c.path
    features.push({
      type: 'Feature',
      id: c.id,
      geometry: { type: 'LineString', coordinates: pts.map((p) => [r6(p.lon), r6(p.lat), +p.alt_m.toFixed(1)] as Position) },
      properties: { feature: 'spectrum_conflict', conflict: c.kind, severity: c.severity, summary: c.summary },
    })
  }
  return {
    type: 'FeatureCollection',
    metadata: {
      title: doc.title,
      classification: doc.classification,
      generated: doc.generatedAt,
      source: 'SPECTRAL Map Intel (OSINT planning laydown)',
      height_reference: 'metres AMSL',
    },
    features,
  }
}

/** Structural check used by tests and the browser self-check. Returns the problems found. */
export function validateLaydownGeoJson(fc: unknown): string[] {
  const errs: string[] = []
  const isPos = (p: unknown) =>
    Array.isArray(p) && (p.length === 2 || p.length === 3) && p.every((n) => typeof n === 'number' && Number.isFinite(n)) &&
    (p[0] as number) >= -180 && (p[0] as number) <= 180 && (p[1] as number) >= -90 && (p[1] as number) <= 90
  const f = fc as LaydownFeatureCollection
  if (!f || f.type !== 'FeatureCollection' || !Array.isArray(f.features)) return ['not a FeatureCollection']
  f.features.forEach((feat, i) => {
    if (feat.type !== 'Feature') errs.push(`feature ${i}: type`)
    const g = feat.geometry
    if (!g) return errs.push(`feature ${i}: geometry`)
    if (g.type === 'Point' && !isPos(g.coordinates)) errs.push(`feature ${i}: point`)
    if (g.type === 'LineString' && (!Array.isArray(g.coordinates) || g.coordinates.length < 2 || !g.coordinates.every(isPos))) errs.push(`feature ${i}: line`)
    if (g.type === 'Polygon') {
      const ringPts = g.coordinates?.[0]
      if (!Array.isArray(ringPts) || ringPts.length < 4 || !ringPts.every(isPos)) errs.push(`feature ${i}: polygon`)
      else {
        const a = ringPts[0]
        const b = ringPts[ringPts.length - 1]
        if (a[0] !== b[0] || a[1] !== b[1]) errs.push(`feature ${i}: ring not closed`)
        // Shoelace: counter-clockwise exterior has positive signed area.
        let area = 0
        for (let k = 0; k < ringPts.length - 1; k++) area += ringPts[k][0] * ringPts[k + 1][1] - ringPts[k + 1][0] * ringPts[k][1]
        if (area <= 0) errs.push(`feature ${i}: ring not counter-clockwise`)
      }
    }
    if (feat.properties == null || typeof feat.properties !== 'object') errs.push(`feature ${i}: properties`)
  })
  return errs
}
