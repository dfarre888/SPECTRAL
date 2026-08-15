import { osintPerformanceFor } from '@/data/a3dm/performance-osint'
import { A3DM_DRONES, A3DM_MANUFACTURERS, payloadsForPlatform } from '@/lib/a3dm/catalog'
import type { A3dmDrone } from '@/lib/a3dm/types'
import type { GnssDependency, Platform, PlatformCategory, UASGroup } from '@/lib/types'

function gramsToKg(g: number | null): number | null {
  if (g == null) return null
  return Math.round((g / 1000) * 1000) / 1000
}

function countryFromManufacturer(mfrId: string, mfrName: string): string {
  const row = A3DM_MANUFACTURERS.find((m) => m.id === mfrId)
  const raw = (row?.country ?? mfrName).split('/')[0].trim()
  if (/usa|united states/i.test(raw)) return 'United States'
  return raw || 'Multi'
}

export function a3dmDroneToPlatform(drone: A3dmDrone): Platform {
  const perf = osintPerformanceFor(drone.id, drone.name)
  const payloads = payloadsForPlatform(drone.id)
  const sensors = payloads
    .filter((p) => p.spectrum_eligible)
    .map((p) => `${p.name} (${p.type})`)
  const retired = /discontinued|superseded|retired/i.test(drone.notes ?? '')
  const mtowKg = gramsToKg(drone.mtow_g) ?? gramsToKg(drone.dry_weight_g)

  return {
    id: drone.id,
    name: drone.sub_category && drone.sub_category !== 'Standard'
      ? `${drone.manufacturer} ${drone.name} (${drone.sub_category})`
      : `${drone.manufacturer} ${drone.name}`,
    manufacturer: drone.manufacturer,
    country_of_origin: countryFromManufacturer(drone.manufacturer_id, drone.manufacturer),
    nato_reporting_name: null,
    category: drone.category as PlatformCategory,
    guidance_type: 'INS+GPS',
    gnss_independent: false,
    ai_autonomous: /skydio|autonomous|ai /i.test(`${drone.name} ${drone.notes}`),
    swarm_capable: false,
    intel_update_date: '2026-08-15',
    max_speed_kmh: perf?.speed_kmh ?? null,
    service_ceiling_m: perf?.ceiling_m ?? null,
    range_km: perf?.range_km ?? null,
    endurance_hrs: perf?.endurance_hrs ?? null,
    mtow_kg: mtowKg,
    warhead_kg: null,
    length_m: null,
    wingspan_m: null,
    height_m: null,
    unit_cost_usd: null,
    ioc_year: drone.year_released,
    terminal_speed_kmh: null,
    armor_piercing_mm: null,
    engine_type: 'electric',
    radar_cross_section_m2: null,
    rcs_notes: null,
    c2_uplink_mhz: null,
    c2_downlink_mhz: null,
    data_link_mhz: null,
    frequency_hopping: /ocusync|skylink|o3/i.test(perf?.control_link_freq ?? ''),
    gnss_used: perf?.gnss_used ?? ['GPS'],
    rtk_capable: Boolean(perf?.rtk_capable || /rtk/i.test(`${drone.name} ${drone.sub_category} ${drone.notes}`)),
    nav_backup: ['optical flow', 'INS'],
    stealth_features: [],
    payload_hardpoints: payloads.length || null,
    weapon_types: [],
    sensor_suite: sensors,
    known_operators: [],
    conflict_deployments: [],
    itar_controlled: false,
    data_confidence: perf ? 'medium' : 'estimated',
    sources: [
      'A3DM RPAS Database (shared catalog)',
      drone.notes,
      perf?.source,
    ].filter((s): s is string => Boolean(s)),
    created_at: new Date(0).toISOString(),
    updated_at: '2026-08-15T00:00:00.000Z',
    year_introduced: drone.year_released,
    propulsion: 'electric',
    defeat_note:
      'COTS Group 1–2: RF jamming of C2 (2.4/5.8 GHz class) + GNSS spoof/deny; HPM (Leonidas) fries flight controller; kinetic/DEW if RF-silent terminal.',
    control_link_freq: perf?.control_link_freq ?? null,
    gnss_dependency: (perf?.gnss_dependency ?? 'high') as GnssDependency,
    side: 'neutral',
    uas_group: drone.uas_group as UASGroup,
    a3dm_drone_id: drone.a3dm_drone_id,
    dry_weight_kg: gramsToKg(drone.dry_weight_g),
    max_payload_kg: gramsToKg(drone.max_payload_g),
    a3dm_category: drone.a3dm_category,
    sub_category: drone.sub_category,
    catalog_tier: 'cots',
    retired,
  }
}

export function allA3dmPlatforms(): Platform[] {
  return A3DM_DRONES.map(a3dmDroneToPlatform)
}
