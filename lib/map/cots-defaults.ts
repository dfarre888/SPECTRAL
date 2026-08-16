/**
 * Map-envelope defaults for COTS airframes with no published range/speed.
 * Instructor-directed training values — Estimated, not OSINT Confirmed.
 * Date of information: Aug 2026.
 */

/** Horizontal combat / C2 sphere radius when the sheet has no range. */
export const COTS_MAP_FALLBACK_RANGE_KM = 5

/** Cruise speed when the sheet has no speed — 12 m/s. */
export const COTS_MAP_FALLBACK_SPEED_MS = 12

/** 12 m/s → km/h. */
export const COTS_MAP_FALLBACK_SPEED_KMH = COTS_MAP_FALLBACK_SPEED_MS * 3.6

export interface CotsIdentity {
  id: string
  name?: string | null
  manufacturer?: string | null
  category?: string | null
  catalog_tier?: string | null
}

export function isCotsCatalog(asset: CotsIdentity): boolean {
  return asset.category === 'cots' || asset.catalog_tier === 'cots'
}

export function isCotsDji(asset: CotsIdentity): boolean {
  if (asset.manufacturer && /^dji$/i.test(asset.manufacturer.trim())) return true
  if (/^dji[-_\s]/i.test(asset.id)) return true
  if (asset.name && /\bdji\b/i.test(asset.name)) return true
  return false
}

export function usesCotsMapFallback(asset: CotsIdentity): boolean {
  return isCotsCatalog(asset) || isCotsDji(asset)
}

export function resolveMapRangeKm(
  rangeKm: number | null | undefined,
  asset: CotsIdentity,
  militaryDefaultKm = 10,
): { km: number; estimated: boolean } {
  if (rangeKm != null && Number.isFinite(rangeKm) && rangeKm > 0) {
    return { km: rangeKm, estimated: false }
  }
  if (usesCotsMapFallback(asset)) {
    return { km: COTS_MAP_FALLBACK_RANGE_KM, estimated: true }
  }
  return { km: militaryDefaultKm, estimated: true }
}

export function resolveMapSpeedKmh(
  speedKmh: number | null | undefined,
  asset: CotsIdentity,
  militaryDefaultKmh = 100,
): { kmh: number; estimated: boolean } {
  if (speedKmh != null && Number.isFinite(speedKmh) && speedKmh > 0) {
    return { kmh: speedKmh, estimated: false }
  }
  if (usesCotsMapFallback(asset)) {
    return { kmh: COTS_MAP_FALLBACK_SPEED_KMH, estimated: true }
  }
  return { kmh: militaryDefaultKmh, estimated: true }
}
