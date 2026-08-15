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

export function isCotsMapId(id: string): boolean {
  return /^(dji|autel|skydio|parrot|yuneec|jouav|xag|wingtra|sensefly|ebee|anafi|freefly|hylio|delair|ideaforge)-/i.test(
    id,
  )
}

function humanizeCotsId(id: string): string {
  return id
    .split('-')
    .map((part) => (part.toLowerCase() === 'dji' ? 'DJI' : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(' ')
}

/**
 * Group 1 COTS stand-in when the airframe is not in the military seed dossier.
 * Bands are Estimated ISM/GNSS family defaults (same class as Mavic 3), not a curated signature.
 */
function synthesizeCotsSpectrumUas(id: string): Platform {
  const stub: Platform = {
    id,
    name: humanizeCotsId(id),
    side: 'red',
    group: 1,
    origin: 'COTS (estimated family)',
    category: 'COTS',
    role: 'ISR / adapted munition carrier',
    confidence: 'estimated',
    gnss_dependency: 'high',
    gnss_used: ['GPS', 'GLONASS', 'Galileo', 'BeiDou'],
    c2_uplink_mhz: 2450,
    video_mhz: 5800,
    control_link_freq: '2.4 / 5.8 GHz ISM (estimated COTS family)',
    defeat_note:
      'Estimated Group 1 COTS — RF jam 2.4/5.8 GHz C2 + video; GNSS spoof forces land or RTH. Same class as Mavic 3 family.',
    intel_note:
      'Not in the military seed dossier. Spectrum bands are Estimated ISM/GNSS family defaults for training — not a curated signature.',
    capabilities: [],
  }
  return {
    ...stub,
    capabilities: resolveCapabilities(stub),
  }
}

/** Resolve a Map Intel UAS id to a spectrum Platform (Red threat) with capabilities. */
export function resolveSpectrumUas(id: string): Platform | null {
  const normalized = normalizePlatformId(id)
  const seed = PLATFORMS.find((p) => p.id === normalized || p.id === id)
  if (seed) {
    const curated = capsByPlatform.get(seed.id) ?? []
    const platform: Platform = {
      ...seed,
      side: 'red',
      capabilities:
        curated.length > 0 ? curated : resolveCapabilities({ ...seed, capabilities: [] }),
    }
    return platform
  }

  if (isCotsMapId(id) || isCotsMapId(normalized)) {
    return synthesizeCotsSpectrumUas(id)
  }
  return null
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
