/**
 * Tactical-picture export model: one normalised item per placed asset, shared
 * by the CoT, KML and GeoJSON writers.
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 *
 * Heights are metres above mean sea level from the map terrain model. CoT asks
 * for height above the ellipsoid; the geoid separation (tens of metres) is not
 * applied and the remarks say so.
 */
import type { FratricideConflict } from '@/lib/ew/fratricide'
import { resolveDroneLinks, resolveJammerProfile } from '@/lib/ew/link-bands'
import { formatEffectorDisplayName, formatRadarDisplayName } from '@/lib/map/catalog-display-name'
import {
  cuasCallsign,
  resolveCuasSide,
  resolveUasRole,
  resolveUasSide,
  uasCallsign,
} from '@/lib/map/laydown-sides'
import { TERRAIN_SURFACE_AGL_M } from '@/lib/map/terrain'
import type { PlacedCuas, PlacedEffector, PlacedRadar, PlacedUas } from '@/lib/map/types'

export const EXPORT_CLASSIFICATION = 'UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY'

export type ExportAffiliation = 'friendly' | 'hostile' | 'neutral'
export type ExportKind = 'uas' | 'cuas' | 'radar' | 'effector'

export interface ExportPoint {
  lon: number
  lat: number
  alt_m: number
}

export interface ExportItem {
  uid: string
  kind: ExportKind
  affiliation: ExportAffiliation
  /** 'blue' | 'red' | 'neutral' as used on the map. */
  side: 'blue' | 'red' | 'neutral'
  callsign: string
  /** Catalogue name of the system. */
  name: string
  role: string
  lon: number
  lat: number
  alt_m: number
  /** Range drawn as a ring: C-UAS defeat range, radar dome, effector max engagement, UAS envelope. */
  range_m: number | null
  range_kind: 'defeat' | 'detection' | 'engagement' | 'envelope' | null
  /** Human band labels, e.g. "Control 900 MHz (assumed)". */
  bands: string[]
  /** Mission path for UAS with a planned route. */
  path: ExportPoint[] | null
  cotType: string
  source: string
  confidence: string
}

export interface ExportConflict {
  id: string
  kind: 'fratricide' | 'enemy_ew'
  severity: 'high' | 'medium' | 'low'
  summary: string
  path: ExportPoint[]
}

export interface ExportDocument {
  title: string
  classification: string
  generatedAt: string
  items: ExportItem[]
  conflicts: ExportConflict[]
}

/** MIL-STD-2525 derived CoT type for a laydown item. */
export function cotTypeFor(
  kind: ExportKind,
  affiliation: ExportAffiliation,
  detail: { passive?: boolean; missile?: boolean } = {},
): string {
  const a = affiliation === 'friendly' ? 'f' : affiliation === 'hostile' ? 'h' : 'n'
  switch (kind) {
    case 'uas':
      return `a-${a}-A-M-F-Q`
    case 'cuas':
      return detail.passive ? `a-${a}-G-E-S` : `a-${a}-G-E-W`
    case 'radar':
      return `a-${a}-G-E-S-R`
    case 'effector':
      return detail.missile ? `a-${a}-G-E-W-M-A` : `a-${a}-G-E-W`
  }
}

function affiliationFor(side: 'blue' | 'red' | 'neutral'): ExportAffiliation {
  return side === 'blue' ? 'friendly' : side === 'red' ? 'hostile' : 'neutral'
}

function fmtBand(lo: number, hi: number): string {
  const f = (m: number) => (m >= 1000 ? `${+(m / 1000).toFixed(2)} GHz` : `${+m.toFixed(1)} MHz`)
  return Math.abs(hi - lo) < 0.5 ? f(lo) : `${f(lo)} to ${f(hi)}`
}

const SOURCE_WORD: Record<string, string> = {
  curated: 'spectrum dossier',
  catalogue: 'catalogue',
  estimated: 'estimated',
  template: 'app template',
  assumed: 'assumed',
  override: 'planner edit',
}

export interface BuildExportInput {
  title: string
  placedUas: PlacedUas[]
  placedCuas: PlacedCuas[]
  placedRadars: PlacedRadar[]
  placedEffectors: PlacedEffector[]
  conflicts?: FratricideConflict[]
  now?: Date
}

export function buildExportDocument(input: BuildExportInput): ExportDocument {
  const items: ExportItem[] = []

  for (const u of input.placedUas) {
    const side = resolveUasSide(u)
    const affiliation = affiliationFor(side)
    const links = resolveDroneLinks(u.asset, u.linkPlan)
    const bands = links.fibre
      ? ['Fibre-optic, no RF link']
      : links.links.map((l) => `${l.kind === 'c2' ? 'Control' : l.kind === 'video' ? 'Video' : 'Data'} ${fmtBand(l.lo_mhz, l.hi_mhz)} (${SOURCE_WORD[l.source] ?? l.source})`)
    const wps = u.mission?.waypoints ?? []
    items.push({
      uid: `SPECTRAL-${u.instanceId}`,
      kind: 'uas',
      affiliation,
      side,
      callsign: uasCallsign(u),
      name: u.asset.name,
      role: resolveUasRole(u),
      lon: u.lon,
      lat: u.lat,
      alt_m: wps[0]?.alt_m ?? u.terrainAMSL + TERRAIN_SURFACE_AGL_M,
      range_m: Number.isFinite(u.lateralRadius_m) ? Math.round(u.lateralRadius_m) : null,
      range_kind: 'envelope',
      bands,
      path: wps.length >= 2 ? wps.map((w) => ({ lon: w.lon, lat: w.lat, alt_m: w.alt_m })) : null,
      cotType: cotTypeFor('uas', affiliation),
      source: 'SPECTRAL OSINT platform library',
      confidence: u.asset.rangeEstimated ? 'Estimated' : 'Assessed',
    })
  }

  for (const c of input.placedCuas) {
    const side = resolveCuasSide(c)
    const affiliation = affiliationFor(side)
    const profile = resolveJammerProfile(c.asset)
    const bands = profile.bands.map((b) => `${b.mode === 'hpm' ? 'HPM' : 'Jam'} ${fmtBand(b.lo_mhz, b.hi_mhz)} (${SOURCE_WORD[b.source] ?? b.source})`)
    if (profile.passive && c.asset.bands_mhz?.length) {
      for (const b of c.asset.bands_mhz) bands.push(`Detect ${fmtBand(b.lo_mhz, b.hi_mhz)}${c.asset.planningAssumption ? ' (assumed)' : ''}`)
    }
    items.push({
      uid: `SPECTRAL-${c.instanceId}`,
      kind: 'cuas',
      affiliation,
      side,
      callsign: cuasCallsign(c),
      name: c.asset.name,
      role: profile.passive ? 'detect' : profile.emits ? 'rf defeat' : c.asset.categoryLabel.toLowerCase(),
      lon: c.lon,
      lat: c.lat,
      alt_m: c.terrainAMSL + TERRAIN_SURFACE_AGL_M,
      range_m: Math.round(c.asset.defeat_range_m),
      range_kind: profile.passive ? 'detection' : 'defeat',
      bands,
      path: null,
      cotType: cotTypeFor('cuas', affiliation, { passive: profile.passive }),
      source: c.asset.planningAssumption ? 'Planning assumption (generic stand-in)' : 'SPECTRAL OSINT C-UAS catalogue',
      confidence: c.asset.planningAssumption ? 'Assumed' : 'Assessed',
    })
  }

  for (const r of input.placedRadars) {
    const side = r.asset.side === 'blue' || r.asset.side === 'red' ? r.asset.side : 'neutral'
    const affiliation = affiliationFor(side)
    items.push({
      uid: `SPECTRAL-${r.instanceId}`,
      kind: 'radar',
      affiliation,
      side,
      callsign: formatRadarDisplayName(r.asset),
      name: r.asset.name,
      role: r.asset.roleLabel,
      lon: r.lon,
      lat: r.lat,
      alt_m: r.terrainAMSL + TERRAIN_SURFACE_AGL_M,
      range_m: Math.round(r.asset.dome_range_km * 1000),
      range_kind: 'detection',
      bands: r.asset.bandsLabel ? [`${r.asset.bandsLabel} band radar`] : [],
      path: null,
      cotType: cotTypeFor('radar', affiliation),
      source: 'SPECTRAL OSINT radar catalogue',
      confidence: 'Assessed',
    })
  }

  for (const e of input.placedEffectors) {
    const side = e.asset.side === 'blue' || e.asset.side === 'red' ? e.asset.side : 'neutral'
    const affiliation = affiliationFor(side)
    items.push({
      uid: `SPECTRAL-${e.instanceId}`,
      kind: 'effector',
      affiliation,
      side,
      callsign: formatEffectorDisplayName(e.asset),
      name: e.asset.name,
      role: e.asset.tierLabel,
      lon: e.lon,
      lat: e.lat,
      alt_m: e.terrainAMSL + TERRAIN_SURFACE_AGL_M,
      range_m: Math.round(e.asset.engagement_dome_km * 1000),
      range_kind: 'engagement',
      bands: [],
      path: null,
      cotType: cotTypeFor('effector', affiliation, { missile: e.asset.effect === 'kinetic_missile' }),
      source: 'SPECTRAL OSINT effector catalogue',
      confidence: 'Assessed',
    })
  }

  const conflicts: ExportConflict[] = (input.conflicts ?? [])
    .filter((c) => c.path.length > 0)
    .map((c) => ({
      id: c.id,
      kind: c.kind,
      severity: c.severity,
      summary: c.summary,
      path: c.path.map((p) => ({ lon: p.lon, lat: p.lat, alt_m: p.alt_m })),
    }))

  return {
    title: input.title,
    classification: EXPORT_CLASSIFICATION,
    generatedAt: (input.now ?? new Date()).toISOString(),
    items,
    conflicts,
  }
}

/** Circle ring as [lon, lat] pairs, counter-clockwise, closed (GeoJSON RFC 7946 and KML outer boundary). */
export function circleRing(lon: number, lat: number, radius_m: number, segments = 64): Array<[number, number]> {
  const R = 6_371_000
  const d = radius_m / R
  const p1 = (lat * Math.PI) / 180
  const l1 = (lon * Math.PI) / 180
  const out: Array<[number, number]> = []
  for (let i = 0; i <= segments; i++) {
    // Decreasing bearing walks the ring counter-clockwise.
    const th = (-(i % segments) / segments) * 2 * Math.PI
    const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(th))
    const l2 = l1 + Math.atan2(Math.sin(th) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2))
    out.push([+((((l2 * 180) / Math.PI + 540) % 360) - 180).toFixed(6), +((p2 * 180) / Math.PI).toFixed(6)])
  }
  return out
}

export function exportSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'laydown'
  )
}

/** "20260924T0312Z" */
export function exportStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z').slice(0, 13) + 'Z'
}

export function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    // Strip control characters that are illegal in XML 1.0.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
}
