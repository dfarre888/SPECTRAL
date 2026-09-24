/**
 * Map Intel laydown -> spectrum fratricide check, and mitigation patches back.
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 *
 * Works for any laydown: drones and C-UAS carry their side and role when a
 * preset placed them, and otherwise infer it (see laydown-sides.ts).
 */
import {
  analyseFratricide,
  type FratricideDrone,
  type FratricideJammer,
  type FratricideOptions,
  type FratricideReport,
  type MitigationPatch,
} from '@/lib/ew/fratricide'
import { resolveDroneLinks, resolveJammerProfile } from '@/lib/ew/link-bands'
import { TERRAIN_SURFACE_AGL_M } from '@/lib/map/terrain'
import {
  cuasCallsign,
  resolveCuasSide,
  resolveUasRole,
  resolveUasSide,
  uasCallsign,
} from '@/lib/map/laydown-sides'
import type { PlacedCuas, PlacedUas } from '@/lib/map/types'

function fpvCapable(u: PlacedUas): boolean {
  const cat = String(u.asset.category ?? '').toLowerCase()
  return /fpv/.test(cat) || /fpv/i.test(u.asset.name) || (cat === 'cots' && u.asset.max_range_km <= 30)
}

export function toFratricideDrone(u: PlacedUas): FratricideDrone {
  const links = resolveDroneLinks(u.asset, u.linkPlan)
  const role = resolveUasRole(u)
  const launch = { lon: u.lon, lat: u.lat, alt_m: u.terrainAMSL + TERRAIN_SURFACE_AGL_M }
  const wps = u.mission?.waypoints ?? []
  const route =
    wps.length >= 2 && role !== 'relay'
      ? wps.map((w) => ({ lon: w.lon, lat: w.lat, alt_m: w.alt_m, speed_kmh: w.speed_kmh }))
      : [{ lon: u.lon, lat: u.lat, alt_m: Number.isFinite(u.discAltitude_m) ? u.discAltitude_m : launch.alt_m + 100, speed_kmh: 0 }]
  return {
    id: u.instanceId,
    name: uasCallsign(u),
    side: resolveUasSide(u),
    role,
    launch,
    route,
    launch_min: u.launchTime_min ?? 0,
    fibre: links.fibre,
    links: links.links,
    linkSource: links.source,
    fpvCapable: fpvCapable(u),
  }
}

export function toFratricideJammer(c: PlacedCuas): FratricideJammer & { passive: boolean; note: string } {
  const p = resolveJammerProfile(c.asset)
  return {
    id: c.instanceId,
    name: cuasCallsign(c),
    side: resolveCuasSide(c),
    position: { lon: c.lon, lat: c.lat, alt_m: c.terrainAMSL + TERRAIN_SURFACE_AGL_M },
    bands: p.bands,
    erp_dbm: p.erp_dbm,
    erp_source: p.erp_source,
    footprint_m: Math.max(50, c.asset.defeat_range_m),
    quietWindows: c.emcon?.quietWindows ?? [],
    blankSectors: c.emcon?.blankSectors ?? [],
    passive: p.passive,
    note: p.note,
  }
}

export function runLaydownFratricide(
  placedUas: PlacedUas[],
  placedCuas: PlacedCuas[],
  options: Partial<FratricideOptions> = {},
): FratricideReport {
  const drones = placedUas.map(toFratricideDrone)
  const jammers = placedCuas.map(toFratricideJammer)
  const report = analyseFratricide(drones, jammers, options)
  // Say why each C-UAS was skipped rather than the generic reason.
  for (const s of report.skipped) {
    const j = jammers.find((x) => x.id === s.id)
    if (!j) continue
    s.reason = j.passive ? 'Passive sensor, does not radiate' : 'Kinetic or optical effector, no RF emission'
  }
  return report
}

/** Apply a mitigation patch to the laydown. Pure: returns new arrays, untouched rows keep identity. */
export function applyMitigationPatch(
  state: { placedUas: PlacedUas[]; placedCuas: PlacedCuas[] },
  patch: MitigationPatch,
): { placedUas: PlacedUas[]; placedCuas: PlacedCuas[] } {
  switch (patch.type) {
    case 'drone-link':
      return {
        placedCuas: state.placedCuas,
        placedUas: state.placedUas.map((u) => {
          if (u.instanceId !== patch.droneId) return u
          const overrides = (u.linkPlan?.overrides ?? []).filter((o) => o.kind !== patch.override.kind)
          return { ...u, linkPlan: { ...u.linkPlan, overrides: [...overrides, patch.override] } }
        }),
      }
    case 'drone-fibre':
      return {
        placedCuas: state.placedCuas,
        placedUas: state.placedUas.map((u) =>
          u.instanceId === patch.droneId ? { ...u, linkPlan: { ...u.linkPlan, fibre: true } } : u,
        ),
      }
    case 'jammer-quiet':
      return {
        placedUas: state.placedUas,
        placedCuas: state.placedCuas.map((c) =>
          c.instanceId === patch.jammerId
            ? { ...c, emcon: { ...c.emcon, quietWindows: [...(c.emcon?.quietWindows ?? []), patch.window] } }
            : c,
        ),
      }
    case 'jammer-blank':
      return {
        placedUas: state.placedUas,
        placedCuas: state.placedCuas.map((c) =>
          c.instanceId === patch.jammerId
            ? { ...c, emcon: { ...c.emcon, blankSectors: [...(c.emcon?.blankSectors ?? []), patch.sector] } }
            : c,
        ),
      }
    case 'relay-move':
      return {
        placedCuas: state.placedCuas,
        placedUas: state.placedUas.map((u) =>
          u.instanceId === patch.droneId ? { ...u, lon: patch.lon, lat: patch.lat, loiter: undefined, mission: undefined } : u,
        ),
      }
  }
}

/** Clear every mitigation edit (link overrides, fibre, jammer emission control). */
export function clearMitigations(state: { placedUas: PlacedUas[]; placedCuas: PlacedCuas[] }) {
  return {
    placedUas: state.placedUas.map((u) => (u.linkPlan ? { ...u, linkPlan: undefined } : u)),
    placedCuas: state.placedCuas.map((c) => (c.emcon ? { ...c, emcon: undefined } : c)),
  }
}
