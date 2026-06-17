import type { Entity } from '@/components/arena/CesiumArena'
import { operationalEnvelopeRadiusKm } from '@/lib/map/range-declaration'
import type { MapUasAsset } from '@/lib/map/types'
import { DefeatMatrixCache } from '@/lib/pcm/defeat-matrix-lookup'
import { resolveDefenderSystemId, resolvePcmPlatformId } from '@/lib/pcm/pcm-platform-ids'
import { resolveSpectrumUas } from '@/lib/map/spectrum-bridge'
import type { PlatformCategory } from '@/lib/types'
import type { Platform as SpectrumPlatform } from '@/lib/spectrum/types'
import type { WoprPlatform } from '@/lib/wopr/types'

const FALLBACK_KM: Record<Entity['type'], number> = {
  drone: 25,
  defeat_system: 5,
  jammer: 12,
  radar: 40,
}

let offlineCache: DefeatMatrixCache | null = null

function getOfflineCache(): DefeatMatrixCache {
  offlineCache ??= DefeatMatrixCache.createOffline()
  return offlineCache
}

function spectrumCategory(p: SpectrumPlatform): PlatformCategory {
  if (p.group === 3) return 'loitering_munition'
  const cat = (p.category ?? '').toLowerCase()
  if (cat.includes('fpv')) return 'FPV'
  if (p.group === 4 || p.group === 5) return 'MALE'
  if (cat.includes('hale')) return 'HALE'
  if (cat.includes('naval')) return 'naval'
  return 'tactical'
}

function spectrumToMapUasAsset(p: SpectrumPlatform): MapUasAsset {
  return {
    id: p.id,
    name: p.name,
    slug: p.id,
    category: spectrumCategory(p),
    categoryLabel: p.category ?? spectrumCategory(p),
    image_url: null,
    max_altitude_agl_m: p.ceiling_m ?? 500,
    altitude_reference: 'AGL',
    max_range_km: p.range_km ?? FALLBACK_KM.drone,
    max_speed_kmh: p.speed_kmh ?? 100,
    endurance_min: 60,
    climb_rate_mpm: 500,
  }
}

function resolveDroneRangeKm(slug: string): number {
  const platformId = resolvePcmPlatformId(slug) ?? slug
  const platform = resolveSpectrumUas(platformId)
  if (!platform) return FALLBACK_KM.drone
  return operationalEnvelopeRadiusKm(spectrumToMapUasAsset(platform)).operationalRadiusKm
}

function resolveBlueRangeKm(slug: string, type: Entity['type']): number {
  const systemId = resolveDefenderSystemId(slug, '')
  const km = getOfflineCache().systemEffectiveRangeKm(systemId)
  if (km !== undefined && km > 0) return km
  const slugKm = getOfflineCache().systemEffectiveRangeKm(slug)
  if (slugKm !== undefined && slugKm > 0) return slugKm
  return FALLBACK_KM[type]
}

/** Operational influence radius (km) for a WOPR COP entity. */
export function resolveCopRangeKm(p: WoprPlatform, type: Entity['type']): number {
  if (type === 'drone') return resolveDroneRangeKm(p.platform_type)
  return resolveBlueRangeKm(p.platform_type, type)
}
