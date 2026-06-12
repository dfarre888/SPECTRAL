import { ConfidenceBadge } from '@/components/platforms/ConfidenceBadge'
import { CATEGORY_LABELS } from '@/lib/platforms/constants'
import { formatFrequencyBand } from '@/lib/platforms/format'
import type { Platform } from '@/lib/types'

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—'
  return String(value)
}

interface SpecRow {
  label: string
  value: string
}

function buildSpecRows(platform: Platform): SpecRow[] {
  return [
    { label: 'ID', value: platform.id },
    { label: 'Name', value: platform.name },
    { label: 'Manufacturer', value: formatValue(platform.manufacturer) },
    { label: 'Country of Origin', value: formatValue(platform.country_of_origin) },
    { label: 'NATO Reporting Name', value: formatValue(platform.nato_reporting_name) },
    { label: 'Category', value: CATEGORY_LABELS[platform.category] },
    { label: 'Guidance Type', value: formatValue(platform.guidance_type) },
    { label: 'GNSS Independent', value: formatValue(platform.gnss_independent) },
    { label: 'AI Autonomous', value: formatValue(platform.ai_autonomous) },
    { label: 'Swarm Capable', value: formatValue(platform.swarm_capable) },
    { label: 'Max Speed', value: platform.max_speed_kmh != null ? `${platform.max_speed_kmh} km/h` : '—' },
    { label: 'Service Ceiling', value: platform.service_ceiling_m != null ? `${platform.service_ceiling_m} m` : '—' },
    { label: 'Range', value: platform.range_km != null ? `${platform.range_km} km` : '—' },
    { label: 'Endurance', value: platform.endurance_hrs != null ? `${platform.endurance_hrs} hrs` : '—' },
    { label: 'MTOW', value: platform.mtow_kg != null ? `${platform.mtow_kg} kg` : '—' },
    { label: 'Length', value: platform.length_m != null ? `${platform.length_m} m` : '—' },
    { label: 'Wingspan', value: platform.wingspan_m != null ? `${platform.wingspan_m} m` : '—' },
    { label: 'Height', value: platform.height_m != null ? `${platform.height_m} m` : '—' },
    { label: 'Unit Cost (USD)', value: platform.unit_cost_usd != null ? `$${platform.unit_cost_usd.toLocaleString()}` : '—' },
    { label: 'IOC Year', value: formatValue(platform.ioc_year) },
    { label: 'Terminal Speed', value: platform.terminal_speed_kmh != null ? `${platform.terminal_speed_kmh} km/h` : '—' },
    { label: 'Armour Penetration', value: platform.armor_piercing_mm != null ? `${platform.armor_piercing_mm} mm RHA` : '—' },
    { label: 'Engine', value: formatValue(platform.engine_type) },
    { label: 'Warhead', value: platform.warhead_kg != null ? `${platform.warhead_kg} kg` : '—' },
    { label: 'RCS (m²)', value: formatValue(platform.radar_cross_section_m2) },
    { label: 'RCS Notes', value: formatValue(platform.rcs_notes) },
    { label: 'C2 Uplink', value: formatValue(platform.c2_uplink_mhz?.map((f) => `${f} MHz`)) },
    { label: 'C2 Downlink', value: formatValue(platform.c2_downlink_mhz?.map((f) => `${f} MHz`)) },
    { label: 'Data Link', value: formatFrequencyBand(platform.c2_uplink_mhz, platform.data_link_mhz) },
    { label: 'Frequency Hopping', value: formatValue(platform.frequency_hopping) },
    { label: 'GNSS Used', value: formatValue(platform.gnss_used) },
    { label: 'RTK Capable', value: formatValue(platform.rtk_capable) },
    { label: 'Nav Backup', value: formatValue(platform.nav_backup) },
    { label: 'Stealth Features', value: formatValue(platform.stealth_features) },
    { label: 'Payload Hardpoints', value: formatValue(platform.payload_hardpoints) },
    { label: 'Weapon Types', value: formatValue(platform.weapon_types) },
    { label: 'Sensor Suite', value: formatValue(platform.sensor_suite) },
    { label: 'Known Operators', value: formatValue(platform.known_operators) },
    { label: 'Conflict Deployments', value: formatValue(platform.conflict_deployments) },
    { label: 'ITAR Controlled', value: formatValue(platform.itar_controlled) },
    { label: 'Sources', value: formatValue(platform.sources) },
    { label: 'Created', value: formatValue(platform.created_at) },
    { label: 'Updated', value: formatValue(platform.updated_at) },
  ]
}

interface PlatformSpecSheetProps {
  platform: Platform
}

export function PlatformSpecSheet({ platform }: PlatformSpecSheetProps) {
  const rows = buildSpecRows(platform)

  return (
    <div className="bg-surf1 border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold text-t-primary">Specifications</h2>
        <ConfidenceBadge confidence={platform.data_confidence} />
      </div>
      <dl className="divide-y divide-border">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-4 px-4 py-2.5">
            <dt className="text-xs text-t-secondary uppercase tracking-wider shrink-0 w-36">
              {row.label}
            </dt>
            <dd className="text-sm font-mono text-t-primary text-right flex-1 break-all">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
