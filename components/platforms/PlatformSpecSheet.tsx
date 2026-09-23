import type { ReactNode } from 'react'
import { CATEGORY_LABELS } from '@/lib/platforms/constants'
import { formatFrequencyBand } from '@/lib/platforms/format'
import { fmtNum, fmtUsd } from '@/components/platforms/platform-display'
import type { Platform } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * The dossier: one lacquer panel per section, label/value rows, mono numbers
 * with the unit set quietly after the value. Fields with no open-source value
 * are listed once at the foot of their section instead of as rows of dashes.
 */

export function formatDateOfInformation(platform: Platform): string {
  const raw = platform.intel_update_date ?? platform.updated_at
  if (!raw || raw === new Date(0).toISOString()) {
    return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(new Date())
  }
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return 'Unknown'
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(d)
}

function fmtDate(raw: string | null | undefined): string | null {
  if (!raw) return null
  const d = new Date(raw)
  if (Number.isNaN(d.getTime()) || d.getTime() === 0) return null
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(d)
}

type Kind = 'num' | 'text' | 'mono' | 'list' | 'bool'

interface Row {
  label: string
  /** null or empty means "no open-source value". */
  value: string | number | boolean | string[] | null | undefined
  unit?: string
  kind?: Kind
}

function isEmpty(v: Row['value']): boolean {
  if (v === null || v === undefined || v === '') return true
  if (Array.isArray(v)) return v.length === 0
  if (typeof v === 'number') return Number.isNaN(v)
  return false
}

function renderValue(row: Row): ReactNode {
  const v = row.value
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  if (Array.isArray(v)) return v.join(', ')
  if (typeof v === 'number') {
    return (
      <span className="font-mono tabular-nums text-[var(--store-ink)]">
        {fmtNum(v)}
        {row.unit ? <span className="ml-1 text-[12px] store-text-muted">{row.unit}</span> : null}
      </span>
    )
  }
  if (row.kind === 'mono' || row.kind === 'num') {
    return (
      <span className="font-mono text-[12.5px] text-[var(--store-ink)] break-all">
        {String(v)}
        {row.unit ? <span className="ml-1 text-[12px] store-text-muted">{row.unit}</span> : null}
      </span>
    )
  }
  return String(v)
}

function SpecPanel({ id, title, rows, children }: { id: string; title: string; rows: Row[]; children?: ReactNode }) {
  const present = rows.filter((r) => !isEmpty(r.value))
  const missing = rows.filter((r) => isEmpty(r.value)).map((r) => r.label)

  return (
    <section id={id} className="store-panel rounded-2xl scroll-mt-24 break-inside-avoid mb-4">
      <h2 className="px-5 pt-4 pb-2 text-[15px] font-semibold text-[var(--store-ink)]">{title}</h2>
      {children}
      {present.length > 0 ? (
        <dl className="px-5 pb-2">
          {present.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-[minmax(128px,38%)_1fr] gap-4 py-2.5 border-t border-[var(--store-line)] first:border-t-0"
            >
              <dt className="text-[12.5px] store-text-muted leading-5">{row.label}</dt>
              <dd className="text-[13px] leading-5 text-[var(--store-ink)] min-w-0 break-words">{renderValue(row)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {missing.length > 0 ? (
        <p
          className={cn(
            'px-5 pb-4 text-[11.5px] leading-relaxed store-text-muted',
            present.length > 0 && 'pt-2 border-t border-[var(--store-line)] mx-5 px-0',
          )}
        >
          No open-source value: {missing.join(', ')}
        </p>
      ) : (
        <div className="pb-2" />
      )}
    </section>
  )
}

interface PlatformSpecSheetProps {
  platform: Platform
}

export function PlatformSpecSheet({ platform: p }: PlatformSpecSheetProps) {
  const dataLink = formatFrequencyBand(p.c2_uplink_mhz, p.data_link_mhz)
  const mhz = (list: number[] | null | undefined) =>
    list && list.length ? list.map((f) => `${fmtNum(f)} MHz`) : null

  const identity: Row[] = [
    { label: 'ID', value: p.id, kind: 'mono' },
    { label: 'Manufacturer', value: p.manufacturer },
    { label: 'Country of origin', value: p.country_of_origin },
    { label: 'NATO reporting name', value: p.nato_reporting_name },
    { label: 'Category', value: CATEGORY_LABELS[p.category] ?? p.category },
    { label: 'Variant', value: p.sub_category },
    { label: 'A3DM ID', value: p.a3dm_drone_id, kind: 'mono' },
    { label: 'A3DM class', value: p.a3dm_category },
    { label: 'Catalogue', value: p.catalog_tier },
    { label: 'Retired or discontinued', value: p.retired },
    { label: 'Known operators', value: p.known_operators },
    { label: 'Conflict deployments', value: p.conflict_deployments },
    { label: 'ITAR controlled', value: p.itar_controlled },
  ]

  const performance: Row[] = [
    { label: 'Max speed', value: p.max_speed_kmh, unit: 'km/h' },
    { label: 'Service ceiling', value: p.service_ceiling_m, unit: 'm' },
    { label: 'Range', value: p.range_km, unit: 'km' },
    { label: 'Endurance', value: p.endurance_hrs, unit: 'h' },
    { label: 'Terminal speed', value: p.terminal_speed_kmh, unit: 'km/h' },
    { label: 'Engine', value: p.engine_type },
    { label: 'Propulsion', value: p.propulsion },
    { label: 'Year introduced', value: p.year_introduced != null ? String(p.year_introduced) : null, kind: 'mono' },
    { label: 'IOC year', value: p.ioc_year != null ? String(p.ioc_year) : null, kind: 'mono' },
    { label: 'Unit cost', value: fmtUsd(p.unit_cost_usd), unit: 'USD', kind: 'num' },
  ]

  const airframe: Row[] = [
    { label: 'MTOW', value: p.mtow_kg, unit: 'kg' },
    { label: 'Dry weight', value: p.dry_weight_kg, unit: 'kg' },
    { label: 'Max payload', value: p.max_payload_kg, unit: 'kg' },
    { label: 'Warhead', value: p.warhead_kg, unit: 'kg' },
    { label: 'Armour penetration', value: p.armor_piercing_mm, unit: 'mm RHA' },
    { label: 'Length', value: p.length_m, unit: 'm' },
    { label: 'Wingspan', value: p.wingspan_m, unit: 'm' },
    { label: 'Height', value: p.height_m, unit: 'm' },
    { label: 'Payload hardpoints', value: p.payload_hardpoints },
    { label: 'RCS', value: p.radar_cross_section_m2, unit: 'm²' },
    { label: 'RCS notes', value: p.rcs_notes },
  ]

  const ew: Row[] = [
    { label: 'Guidance', value: p.guidance_type ? String(p.guidance_type).replace(/_/g, ' ') : null },
    { label: 'GNSS independent', value: p.gnss_independent },
    { label: 'GNSS dependency', value: p.gnss_dependency },
    { label: 'GNSS used', value: p.gnss_used },
    { label: 'RTK capable', value: p.rtk_capable },
    { label: 'Nav backup', value: p.nav_backup },
    { label: 'C2 uplink', value: mhz(p.c2_uplink_mhz), kind: 'mono' },
    { label: 'C2 downlink', value: mhz(p.c2_downlink_mhz), kind: 'mono' },
    { label: 'Data link', value: dataLink === '—' ? null : dataLink, kind: 'mono' },
    { label: 'Control link', value: p.control_link_freq },
    { label: 'Frequency hopping', value: p.frequency_hopping },
    { label: 'AI autonomous', value: p.ai_autonomous },
    { label: 'Swarm capable', value: p.swarm_capable },
    { label: 'Stealth features', value: p.stealth_features },
  ]

  const sensors: Row[] = [
    { label: 'Sensor suite', value: p.sensor_suite },
    { label: 'Weapon types', value: p.weapon_types },
  ]

  const sources: Row[] = [
    { label: 'Date of information', value: formatDateOfInformation(p) },
    { label: 'Created', value: fmtDate(p.created_at), kind: 'mono' },
    { label: 'Updated', value: fmtDate(p.updated_at), kind: 'mono' },
  ]

  return (
    <div className="columns-1 xl:columns-2 gap-4 [column-fill:_balance]">
      <SpecPanel id="dossier-overview" title="Identity" rows={identity} />
      <SpecPanel id="dossier-performance" title="Performance" rows={performance} />
      <SpecPanel id="dossier-airframe" title="Airframe and payload" rows={airframe} />
      <SpecPanel id="dossier-ew" title="Guidance, EW and navigation" rows={ew} />
      <SpecPanel id="dossier-sensors" title="Sensors and weapons" rows={sensors} />
      <section id="dossier-defeat" className="store-panel rounded-2xl scroll-mt-24 break-inside-avoid mb-4 px-5 py-4">
        <h2 className="text-[15px] font-semibold text-[var(--store-ink)]">Defeat assessment</h2>
        <p className="mt-2 text-[13px] leading-relaxed store-text-body">
          {p.defeat_note ?? 'See the countermeasures table for platform and effector pairings.'}
        </p>
      </section>
      <SpecPanel id="dossier-sources" title="Sources" rows={sources}>
        {p.sources?.length ? (
          <ul className="px-5 pb-3 space-y-1.5">
            {p.sources.map((s) => (
              <li key={s} className="text-[12.5px] leading-relaxed store-text-body break-words">
                {s}
              </li>
            ))}
          </ul>
        ) : null}
      </SpecPanel>
    </div>
  )
}
