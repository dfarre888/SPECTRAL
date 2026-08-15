import { resolveA3dmCapabilities } from '@/lib/a3dm/capability-resolver'
import { allA3dmPlatforms } from '@/lib/a3dm/to-platform'
import type { Platform as SpectrumPlatform } from '@/lib/spectrum/types'

export function a3dmSpectrumPlatforms(): SpectrumPlatform[] {
  return allA3dmPlatforms().map((p) => ({
    id: p.id,
    name: p.name,
    side: 'neutral',
    group: p.uas_group,
    origin: p.manufacturer,
    category: p.a3dm_category ?? 'COTS',
    role: 'COTS RPAS',
    mass_kg: p.mtow_kg,
    range_km: p.range_km,
    speed_kmh: p.max_speed_kmh,
    ceiling_m: p.service_ceiling_m,
    confidence: 'estimated',
    intel_note: p.sources?.[0] ?? null,
    year_introduced: p.year_introduced,
    propulsion: p.propulsion,
    guidance_type: p.guidance_type,
    defeat_note: p.defeat_note,
    control_link_freq: p.control_link_freq,
    gnss_dependency: p.gnss_dependency,
    gnss_used: p.gnss_used,
    capabilities: resolveA3dmCapabilities(p.id),
  }))
}
