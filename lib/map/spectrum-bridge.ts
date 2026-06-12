import { CAPABILITIES } from '@/data/seed-capabilities'
import { PLATFORMS } from '@/data/seed-platforms'
import { PLATFORM_ID_ALIASES } from '@/data/osint-platform-enrichment'
import {
  capsHel,
  capsNavalCiws,
  capsRfJammer,
} from '@/data/capability-templates'
import { resolveCapabilities } from '@/lib/spectrum/fallback'
import type { MapCuasAsset } from '@/lib/map/types'
import type { Platform, SpectrumCapability } from '@/lib/spectrum/types'

const capsByPlatform = new Map<string, SpectrumCapability[]>()
for (const c of CAPABILITIES) {
  const arr = capsByPlatform.get(c.platform_id) ?? []
  arr.push(c)
  capsByPlatform.set(c.platform_id, arr)
}

function normalizePlatformId(id: string): string {
  return PLATFORM_ID_ALIASES[id] ?? id
}

/** Resolve a Map Intel UAS id to a spectrum Platform (Red threat) with capabilities. */
export function resolveSpectrumUas(id: string): Platform | null {
  const normalized = normalizePlatformId(id)
  const seed = PLATFORMS.find((p) => p.id === normalized || p.id === id)
  if (!seed) return null

  const curated = capsByPlatform.get(seed.id) ?? []
  const platform: Platform = {
    ...seed,
    side: 'red',
    capabilities:
      curated.length > 0 ? curated : resolveCapabilities({ ...seed, capabilities: [] }),
  }
  return platform
}

/** Synthetic Blue effector platform from a placed C-UAS asset. */
export function cuasAssetToSpectrumBlue(asset: MapCuasAsset): Platform {
  const methods = asset.defeat_methods ?? []
  const rangeKm = asset.defeat_range_km

  let capabilities: SpectrumCapability[] = []

  if (methods.includes('RF_jamming')) {
    capabilities = capsRfJammer(asset.id, rangeKm)
  } else if (methods.includes('laser') || methods.includes('directed_energy')) {
    capabilities = capsHel(asset.id, rangeKm)
  } else if (methods.includes('kinetic') || methods.includes('net')) {
    capabilities = capsNavalCiws(asset.id, rangeKm)
  } else {
    capabilities = capsRfJammer(asset.id, rangeKm)
  }

  return {
    id: asset.id,
    name: asset.name,
    side: 'blue',
    category: 'counter_uas',
    capabilities,
  }
}
