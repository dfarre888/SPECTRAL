import { ConfidenceBadge } from '@/components/platforms/ConfidenceBadge'
import { SpecGrid, SpecRow } from '@/components/ui/spec-row'
import { StorePanel } from '@/components/ui/store-surface'
import { CATEGORY_LABELS } from '@/lib/platforms/constants'
import { formatFrequencyBand } from '@/lib/platforms/format'
import type { DataConfidence, Platform } from '@/lib/types'

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'performance', label: 'Performance' },
  { id: 'sensors', label: 'Sensors' },
  { id: 'ew', label: 'EW' },
  { id: 'defeat', label: 'Defeat' },
  { id: 'sources', label: 'Sources' },
] as const

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—'
  return String(value)
}

function formatDateOfInformation(platform: Platform): string {
  const raw = platform.intel_update_date ?? platform.updated_at
  if (!raw || raw === new Date(0).toISOString()) {
    return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(new Date())
  }
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return 'Unknown'
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(d)
}

interface QuantSpec {
  label: string
  value: string
}

interface TextSpec {
  label: string
  value: string
}

function buildOverview(platform: Platform): TextSpec[] {
  return [
    { label: 'ID', value: platform.id },
    { label: 'Name', value: platform.name },
    { label: 'Manufacturer', value: formatValue(platform.manufacturer) },
    { label: 'Country of Origin', value: formatValue(platform.country_of_origin) },
    { label: 'NATO Reporting Name', value: formatValue(platform.nato_reporting_name) },
    { label: 'Category', value: CATEGORY_LABELS[platform.category] ?? platform.category },
    { label: 'A3DM ID', value: formatValue(platform.a3dm_drone_id) },
    { label: 'A3DM class', value: formatValue(platform.a3dm_category) },
    { label: 'Variant', value: formatValue(platform.sub_category) },
    { label: 'Catalog', value: formatValue(platform.catalog_tier) },
    { label: 'Retired / discontinued', value: formatValue(platform.retired) },
    { label: 'Guidance Type', value: formatValue(platform.guidance_type) },
    { label: 'GNSS Independent', value: formatValue(platform.gnss_independent) },
    { label: 'AI Autonomous', value: formatValue(platform.ai_autonomous) },
    { label: 'Swarm Capable', value: formatValue(platform.swarm_capable) },
    { label: 'Known Operators', value: formatValue(platform.known_operators) },
    { label: 'Conflict Deployments', value: formatValue(platform.conflict_deployments) },
    { label: 'ITAR Controlled', value: formatValue(platform.itar_controlled) },
  ]
}

function buildPerformance(platform: Platform): QuantSpec[] {
  return [
    { label: 'Max Speed', value: platform.max_speed_kmh != null ? `${platform.max_speed_kmh} km/h` : '—' },
    { label: 'Service Ceiling', value: platform.service_ceiling_m != null ? `${platform.service_ceiling_m} m` : '—' },
    { label: 'Range', value: platform.range_km != null ? `${platform.range_km} km` : '—' },
    { label: 'Endurance', value: platform.endurance_hrs != null ? `${platform.endurance_hrs} hrs` : '—' },
    { label: 'MTOW', value: platform.mtow_kg != null ? `${platform.mtow_kg} kg` : '—' },
    { label: 'Dry weight', value: platform.dry_weight_kg != null ? `${platform.dry_weight_kg} kg` : '—' },
    { label: 'Max payload', value: platform.max_payload_kg != null ? `${platform.max_payload_kg} kg` : '—' },
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
  ]
}

function buildSensors(platform: Platform): TextSpec[] {
  return [
    { label: 'Sensor Suite', value: formatValue(platform.sensor_suite) },
    { label: 'Payload Hardpoints', value: formatValue(platform.payload_hardpoints) },
    { label: 'Weapon Types', value: formatValue(platform.weapon_types) },
  ]
}

function buildEw(platform: Platform): (QuantSpec | TextSpec)[] {
  return [
    { label: 'C2 Uplink', value: formatValue(platform.c2_uplink_mhz?.map((f) => `${f} MHz`)) },
    { label: 'C2 Downlink', value: formatValue(platform.c2_downlink_mhz?.map((f) => `${f} MHz`)) },
    { label: 'Data Link', value: formatFrequencyBand(platform.c2_uplink_mhz, platform.data_link_mhz) },
    { label: 'Frequency Hopping', value: formatValue(platform.frequency_hopping) },
    { label: 'GNSS Used', value: formatValue(platform.gnss_used) },
    { label: 'RTK Capable', value: formatValue(platform.rtk_capable) },
    { label: 'Nav Backup', value: formatValue(platform.nav_backup) },
    { label: 'Stealth Features', value: formatValue(platform.stealth_features) },
    { label: 'Control Link Freq', value: formatValue(platform.control_link_freq) },
    { label: 'GNSS Dependency', value: formatValue(platform.gnss_dependency) },
  ]
}

function buildDefeat(platform: Platform): TextSpec[] {
  const rows: TextSpec[] = []
  if (platform.defeat_note) {
    rows.push({ label: 'Defeat Assessment', value: platform.defeat_note })
  }
  if (rows.length === 0) {
    rows.push({ label: 'Defeat Assessment', value: 'See countermeasures panel for platform × effector pairings.' })
  }
  return rows
}

function buildSources(platform: Platform): TextSpec[] {
  return [
    { label: 'Sources', value: formatValue(platform.sources) },
    { label: 'Created', value: formatValue(platform.created_at) },
    { label: 'Updated', value: formatValue(platform.updated_at) },
  ]
}

function isQuantitativeValue(value: string): boolean {
  if (value === '—') return false
  return /\d/.test(value) || value.startsWith('$')
}

interface SpecSectionProps {
  id: string
  title: string
  platform: Platform
  rows: (QuantSpec | TextSpec)[]
}

function SpecSection({ id, title, platform, rows }: SpecSectionProps) {
  const confidence: DataConfidence = platform.data_confidence

  return (
    <section id={id} className="scroll-mt-24">
      <h3 className="text-[10px] font-mono uppercase tracking-wider store-text-muted px-4 pt-3 pb-1">
        {title}
      </h3>
      <SpecGrid className="px-4 pb-2">
        {rows.map((row) => {
          const quant = isQuantitativeValue(row.value)
          return (
            <SpecRow
              key={row.label}
              label={row.label}
              value={row.value}
              mono={quant}
              confidence={confidence}
            />
          )
        })}
      </SpecGrid>
    </section>
  )
}

interface PlatformSpecSheetProps {
  platform: Platform
}

export function PlatformSpecSheet({ platform }: PlatformSpecSheetProps) {
  const dateOfInformation = formatDateOfInformation(platform)

  return (
    <StorePanel className="overflow-hidden rounded-xl">
      <div className="sticky top-0 z-10 bg-[var(--store-surface)] border-b border-[var(--store-line)]">
        <div className="px-4 py-3 flex items-center justify-between gap-2">
          <h2 className="font-semibold text-white">Platform Dossier</h2>
          <ConfidenceBadge confidence={platform.data_confidence} />
        </div>
        <nav className="px-4 pb-2 flex flex-wrap gap-1.5" aria-label="Dossier sections">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#dossier-${s.id}`}
              className="text-[10px] font-mono px-2 py-1 rounded-lg border border-[var(--store-line)] store-text-muted hover:border-[var(--store-accent-border)] hover:text-[var(--store-accent)] transition-colors"
            >
              {s.label}
            </a>
          ))}
        </nav>
        <p className="px-4 pb-2 text-[10px] font-mono tabular-nums store-text-muted">
          Date of information: {dateOfInformation}
        </p>
      </div>

      <SpecSection id="dossier-overview" title="Overview" platform={platform} rows={buildOverview(platform)} />
      <SpecSection id="dossier-performance" title="Performance" platform={platform} rows={buildPerformance(platform)} />
      <SpecSection id="dossier-sensors" title="Sensors" platform={platform} rows={buildSensors(platform)} />
      <SpecSection id="dossier-ew" title="EW" platform={platform} rows={buildEw(platform)} />
      <SpecSection id="dossier-defeat" title="Defeat" platform={platform} rows={buildDefeat(platform)} />
      <SpecSection id="dossier-sources" title="Sources" platform={platform} rows={buildSources(platform)} />
    </StorePanel>
  )
}
