import { CATEGORY_LABELS } from '@/lib/platforms/constants'
import type { AntiDroneSystem, Platform } from '@/lib/types'
import type { MapCuasAsset, MapUasAsset } from '@/lib/map/types'

const DEFAULT_CLIMB_MPM = 500

export function toMapUasAsset(platform: Platform): MapUasAsset {
  return {
    id: platform.id,
    name: platform.name,
    slug: platform.id,
    category: platform.category,
    categoryLabel: CATEGORY_LABELS[platform.category] ?? platform.category,
    image_url: null,
    max_altitude_agl_m: platform.service_ceiling_m ?? 500,
    altitude_reference: 'AGL',
    max_range_km: platform.range_km ?? 10,
    max_speed_kmh: platform.max_speed_kmh ?? 100,
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
    image_url: null,
    defeat_range_m: system.effective_range_m ?? 1000,
    defeat_range_km: (system.effective_range_m ?? 1000) / 1000,
    defeat_methods: methods,
  }
}
