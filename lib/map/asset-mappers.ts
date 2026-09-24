import { payloadsForPlatform } from '@/lib/a3dm/catalog'
import { CATEGORY_LABELS } from '@/lib/platforms/constants'
import { resolvePlatformImagePath } from '@/lib/platforms/image-resolve'
import { resolveMapRangeKm, resolveMapSpeedKmh } from '@/lib/map/cots-defaults'
import type { AntiDroneSystem, Platform } from '@/lib/types'
import type { MapCuasAsset, MapCuasBand, MapUasAsset } from '@/lib/map/types'

const DEFAULT_CLIMB_MPM = 500

function finiteList(v: unknown): number[] | null {
  if (!Array.isArray(v)) return null
  const out = v.map(Number).filter((n) => Number.isFinite(n) && n > 0)
  return out.length ? out : null
}

export function toMapUasAsset(platform: Platform): MapUasAsset {
  const identity = {
    id: platform.id,
    name: platform.name,
    manufacturer: platform.manufacturer,
    category: platform.category,
    catalog_tier: platform.catalog_tier,
  }
  const range = resolveMapRangeKm(platform.range_km, identity)
  const speed = resolveMapSpeedKmh(platform.max_speed_kmh, identity)
  const a3dmPayloads = payloadsForPlatform(platform.id).map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
  }))
  const suitePayloads =
    a3dmPayloads.length > 0
      ? a3dmPayloads
      : (platform.sensor_suite ?? [])
          .filter(Boolean)
          .map((label, i) => ({ id: `${platform.id}-suite-${i}`, name: label, type: 'payload' }))

  // Link data rides along only when the platform row carries it (keeps the payload lean).
  const c2 = finiteList(platform.c2_uplink_mhz)
  const video = finiteList(platform.c2_downlink_mhz)
  const datalink = finiteList(platform.data_link_mhz)
  const linkText = platform.control_link_freq ?? null

  return {
    id: platform.id,
    name: platform.name,
    slug: platform.id,
    category: platform.category,
    categoryLabel: CATEGORY_LABELS[platform.category] ?? platform.category,
    side: platform.side ?? null,
    manufacturer: platform.manufacturer ?? null,
    catalog_tier: platform.catalog_tier ?? (platform.category === 'cots' ? 'cots' : null),
    payloads: suitePayloads,
    rangeEstimated: range.estimated,
    image_url: resolvePlatformImagePath(platform.id),
    max_altitude_agl_m: platform.service_ceiling_m ?? 500,
    altitude_reference: 'AGL',
    max_range_km: range.km,
    max_speed_kmh: speed.kmh,
    endurance_min: Math.round((platform.endurance_hrs ?? 1) * 60),
    climb_rate_mpm: DEFAULT_CLIMB_MPM,
    ...(c2 ? { c2_mhz: c2 } : {}),
    ...(video ? { video_mhz: video } : {}),
    ...(datalink ? { datalink_mhz: datalink } : {}),
    ...(linkText ? { control_link_freq: linkText } : {}),
  }
}

/**
 * Parse anti_drone_systems.frequency_bands_covered into MHz bands.
 * The live table names the column `frequency_bands_covered`; the TS type and
 * offline seed call it `frequency_bands_covered_mhz`. Read both. Values look
 * like "2400-2483"; non-numeric entries (passive_EO, laser nm) are skipped.
 */
export function parseCuasBands(system: AntiDroneSystem): MapCuasBand[] {
  const raw =
    (system as unknown as { frequency_bands_covered?: Record<string, unknown> | null }).frequency_bands_covered ??
    system.frequency_bands_covered_mhz ??
    {}
  const out: MapCuasBand[] = []
  for (const [key, value] of Object.entries(raw)) {
    if (/_nm$|eo_ir|optical|laser/i.test(key)) continue
    const m = String(value).match(/^\s*(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*$/)
    if (!m) continue
    const lo = Number(m[1])
    const hi = Number(m[2])
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi < lo || hi < 30) continue
    out.push({ label: key, lo_mhz: lo, hi_mhz: hi })
  }
  return out
}

export function toMapCuasAsset(system: AntiDroneSystem): MapCuasAsset {
  const methods = system.defeat_method ?? []
  const primary = methods.includes('laser') || methods.includes('directed_energy')
    ? 'Laser DEW'
    : methods.includes('kinetic')
      ? 'Kinetic'
      : methods.includes('RF_jamming')
        ? 'RF Jamming'
        : 'C-UAS'

  const bands = parseCuasBands(system)
  const power = system.power_output_w != null ? Number(system.power_output_w) : NaN

  return {
    id: system.id,
    name: system.name,
    categoryLabel: primary,
    image_url: resolvePlatformImagePath(system.id),
    defeat_range_m: system.effective_range_m ?? 1000,
    defeat_range_km: (system.effective_range_m ?? 1000) / 1000,
    defeat_methods: methods,
    ...(bands.length ? { bands_mhz: bands } : {}),
    ...(Number.isFinite(power) && power > 0 ? { power_output_w: power } : {}),
  }
}
