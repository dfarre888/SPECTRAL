import { payloadsForPlatform } from '@/lib/a3dm/catalog'
import { CATEGORY_LABELS } from '@/lib/platforms/constants'
import { resolvePlatformImagePath } from '@/lib/platforms/image-resolve'
import { resolveMapRangeKm, resolveMapSpeedKmh } from '@/lib/map/cots-defaults'
import type { AntiDroneSystem, Platform } from '@/lib/types'
import type { MapCuasAsset, MapUasAsset } from '@/lib/map/types'

const DEFAULT_CLIMB_MPM = 500

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
  }
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

  return {
    id: system.id,
    name: system.name,
    categoryLabel: primary,
    image_url: resolvePlatformImagePath(system.id),
    defeat_range_m: system.effective_range_m ?? 1000,
    defeat_range_km: (system.effective_range_m ?? 1000) / 1000,
    defeat_methods: methods,
  }
}
