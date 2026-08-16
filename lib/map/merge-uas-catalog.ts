import { allA3dmPlatforms } from '@/lib/a3dm/to-platform'
import type { Platform } from '@/lib/types'

/** Prefer published DB kinematics; fill gaps from the A3DM COTS sheet. */
export function overlayA3dmKinematics(existing: Platform, a3dm: Platform): Platform {
  return {
    ...existing,
    range_km: existing.range_km ?? a3dm.range_km,
    max_speed_kmh: existing.max_speed_kmh ?? a3dm.max_speed_kmh,
    endurance_hrs: existing.endurance_hrs ?? a3dm.endurance_hrs,
    service_ceiling_m: existing.service_ceiling_m ?? a3dm.service_ceiling_m,
    manufacturer: existing.manufacturer || a3dm.manufacturer,
    catalog_tier: existing.catalog_tier ?? a3dm.catalog_tier,
    a3dm_drone_id: existing.a3dm_drone_id ?? a3dm.a3dm_drone_id,
    a3dm_category: existing.a3dm_category ?? a3dm.a3dm_category,
    sub_category: existing.sub_category ?? a3dm.sub_category,
    side: existing.side ?? a3dm.side,
    category: existing.category === 'cots' || !existing.category ? a3dm.category : existing.category,
  }
}

/**
 * Map UAS catalogue = DB platforms + every A3DM COTS airframe.
 * Matching IDs keep the DB row and inherit missing range/speed from A3DM.
 */
export function mergeMapUasCatalog(dbUas: Platform[]): Platform[] {
  const byId = new Map<string, Platform>()
  for (const row of dbUas) byId.set(row.id, row)
  for (const a3dm of allA3dmPlatforms()) {
    const existing = byId.get(a3dm.id)
    byId.set(a3dm.id, existing ? overlayA3dmKinematics(existing, a3dm) : a3dm)
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
}
