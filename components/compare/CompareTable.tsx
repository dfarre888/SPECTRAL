import Link from 'next/link'
import type { ReactNode } from 'react'
import { ConfidenceBadge } from '@/components/platforms/ConfidenceBadge'
import { PlatformImage } from '@/components/platforms/PlatformImage'
import { formatDateOfInformation } from '@/components/platforms/PlatformSpecSheet'
import {
  categoryLabel,
  fmtNum,
  fmtUsd,
  initials,
  knownFlag,
} from '@/components/platforms/platform-display'
import { hasResolvedPlatformImage } from '@/lib/platforms/image-resolve'
import { formatFrequencyBand } from '@/lib/platforms/format'
import type { Platform } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * Side-by-side dossier: spec rows down, platforms across. The table sits in
 * the page scroll (no inner scroller on desktop) so the platform header can
 * pin under the top bar while the reader moves down the rows. Sticky offsets
 * resolve inside the scroller's 72px top padding, so -16px lands the header
 * flush with the 56px glass bar instead of leaving a strip of rows showing. Numeric rows
 * carry a hairline bar scaled to the row's largest value so the leader reads
 * at a glance; the leader's value is set brighter. Rows no platform has data
 * for are dropped and named once in the footnote.
 */

type NumRow = {
  kind: 'num'
  label: string
  unit: string
  get: (p: Platform) => number | null | undefined
  /** Higher is not always better (cost). Only rows with a direction get a leader. */
  leader?: 'max'
}
type TextRow = { kind: 'text'; label: string; get: (p: Platform) => ReactNode | null | undefined; mono?: boolean }
type Row = NumRow | TextRow
type Section = { title: string; rows: Row[] }

const yesNo = (v: boolean | null | undefined) => (v == null ? null : v ? 'Yes' : 'No')
const list = (v: string[] | null | undefined) => (v && v.length ? v.join(', ') : null)

const SECTIONS: Section[] = [
  {
    title: 'Performance',
    rows: [
      { kind: 'num', label: 'Range', unit: 'km', get: (p) => p.range_km, leader: 'max' },
      { kind: 'num', label: 'Max speed', unit: 'km/h', get: (p) => p.max_speed_kmh, leader: 'max' },
      { kind: 'num', label: 'Service ceiling', unit: 'm', get: (p) => p.service_ceiling_m, leader: 'max' },
      { kind: 'num', label: 'Endurance', unit: 'h', get: (p) => p.endurance_hrs, leader: 'max' },
      { kind: 'num', label: 'Terminal speed', unit: 'km/h', get: (p) => p.terminal_speed_kmh, leader: 'max' },
    ],
  },
  {
    title: 'Airframe and payload',
    rows: [
      { kind: 'num', label: 'MTOW', unit: 'kg', get: (p) => p.mtow_kg },
      { kind: 'num', label: 'Warhead', unit: 'kg', get: (p) => p.warhead_kg, leader: 'max' },
      { kind: 'num', label: 'Max payload', unit: 'kg', get: (p) => p.max_payload_kg, leader: 'max' },
      { kind: 'num', label: 'Length', unit: 'm', get: (p) => p.length_m },
      { kind: 'num', label: 'Wingspan', unit: 'm', get: (p) => p.wingspan_m },
      { kind: 'text', label: 'Engine', get: (p) => p.engine_type },
      { kind: 'text', label: 'Unit cost', get: (p) => fmtUsd(p.unit_cost_usd), mono: true },
    ],
  },
  {
    title: 'Guidance, EW and navigation',
    rows: [
      { kind: 'text', label: 'Guidance', get: (p) => (p.guidance_type ? String(p.guidance_type).replace(/_/g, ' ') : null) },
      { kind: 'text', label: 'GNSS dependency', get: (p) => p.gnss_dependency },
      { kind: 'text', label: 'GNSS independent', get: (p) => yesNo(p.gnss_independent) },
      { kind: 'text', label: 'GNSS used', get: (p) => list(p.gnss_used) },
      { kind: 'text', label: 'Control link', get: (p) => p.control_link_freq },
      {
        kind: 'text',
        label: 'Data link',
        get: (p) => {
          const f = formatFrequencyBand(p.c2_uplink_mhz, p.data_link_mhz)
          return f === '—' ? null : f
        },
        mono: true,
      },
      { kind: 'text', label: 'Frequency hopping', get: (p) => yesNo(p.frequency_hopping) },
      { kind: 'text', label: 'AI autonomous', get: (p) => yesNo(p.ai_autonomous) },
      { kind: 'text', label: 'Swarm capable', get: (p) => yesNo(p.swarm_capable) },
      { kind: 'text', label: 'Stealth features', get: (p) => list(p.stealth_features) },
    ],
  },
  {
    title: 'Employment',
    rows: [
      { kind: 'text', label: 'Category', get: (p) => categoryLabel(p.category) },
      { kind: 'text', label: 'Manufacturer', get: (p) => p.manufacturer },
      { kind: 'text', label: 'Year introduced', get: (p) => (p.year_introduced != null ? String(p.year_introduced) : null), mono: true },
      { kind: 'text', label: 'Known operators', get: (p) => list(p.known_operators) },
      { kind: 'text', label: 'Conflict deployments', get: (p) => list(p.conflict_deployments) },
    ],
  },
  {
    title: 'Provenance',
    rows: [
      { kind: 'text', label: 'Confidence', get: (p) => <ConfidenceBadge confidence={p.data_confidence} /> },
      { kind: 'text', label: 'Date of information', get: (p) => formatDateOfInformation(p) },
      { kind: 'text', label: 'Sources', get: (p) => (p.sources?.length ? `${p.sources.length} open sources` : null) },
    ],
  },
]

const Blank = () => <span className="store-text-muted">—</span>

function hasValue(v: unknown): boolean {
  return v !== null && v !== undefined && v !== ''
}

function NumCell({ value, max, lead, unit }: { value: number | null | undefined; max: number; lead: boolean; unit: string }) {
  if (value == null) return <Blank />
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0
  return (
    <div className="max-w-[200px]">
      <span
        className={cn(
          'font-mono tabular-nums text-[13px]',
          lead ? 'text-white font-semibold' : 'text-[var(--store-ink-soft)]',
        )}
      >
        {fmtNum(value)}
        <span className="ml-1 text-[11.5px] font-normal store-text-muted">{unit}</span>
      </span>
      <span className="mt-1.5 block h-[3px] rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden" aria-hidden>
        <span
          className={cn('block h-full rounded-full', lead ? 'bg-[var(--wb-blue)]' : 'bg-[rgba(255,255,255,0.32)]')}
          style={{ width: `${pct}%` }}
        />
      </span>
    </div>
  )
}

interface CompareTableProps {
  platforms: Platform[]
  /** Current id list, used to build remove links. */
  ids: string[]
}

const LABEL_W = 200
const COL_MIN = 220

export function CompareTable({ platforms, ids }: CompareTableProps) {
  const dropped: string[] = []
  const sections = SECTIONS.map((s) => ({
    ...s,
    rows: s.rows.filter((r) => {
      const any = platforms.some((p) => hasValue(r.get(p)))
      if (!any) dropped.push(r.label)
      return any
    }),
  })).filter((s) => s.rows.length > 0)

  const removeHref = (id: string) => {
    const rest = ids.filter((x) => x !== id)
    return `/compare?ids=${rest.join(',')}`
  }

  return (
    <div>
      <div className="store-panel rounded-2xl max-md:overflow-x-auto">
        <table className="dt compare-dt" style={{ minWidth: LABEL_W + platforms.length * COL_MIN }}>
          <caption className="sr-only">Platform comparison</caption>
          <colgroup>
            <col style={{ width: LABEL_W }} />
            {platforms.map((p) => (
              <col key={p.id} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="stick md:!top-[-16px] align-bottom !pb-3 rounded-tl-2xl">
                <span className="store-text-muted font-normal">Specification</span>
              </th>
              {platforms.map((p) => {
                const flag = knownFlag(p.country_of_origin)
                const img = hasResolvedPlatformImage(p.id)
                return (
                  <th
                    key={p.id}
                    scope="col"
                    className={cn(
                      'md:!top-[-16px] align-top !py-3 !whitespace-normal',
                      p.id === platforms[platforms.length - 1]?.id && 'rounded-tr-2xl',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative w-14 h-14 shrink-0 rounded-xl overflow-hidden border border-[var(--lacquer-line)] bg-[#050506] grid place-items-center">
                        {img ? (
                          <PlatformImage id={p.id} name={p.name} className="absolute inset-0 h-full w-full border-0 rounded-none" />
                        ) : (
                          <span aria-hidden className="store-display text-[18px] font-semibold text-[rgba(255,255,255,0.22)]">
                            {initials(p.name)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/platforms/${p.id}`}
                          className="block text-[14px] font-semibold leading-snug text-[var(--store-ink)] hover:underline underline-offset-2"
                        >
                          {p.name}
                        </Link>
                        <span className="mt-0.5 block text-[12px] font-normal store-text-muted">
                          {flag ? <span className="mr-1" aria-hidden>{flag}</span> : null}
                          {p.country_of_origin ?? 'Unknown origin'}
                        </span>
                        <span className="mt-1.5 flex items-center gap-3 font-normal">
                          <Link href={`/platforms/${p.id}`} className="fc-action !py-0">
                            Dossier
                          </Link>
                          {ids.length > 1 ? (
                            <Link href={removeHref(p.id)} className="fc-action !py-0">
                              Remove
                            </Link>
                          ) : null}
                        </span>
                      </div>
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {sections.map((section) => (
              <SectionRows key={section.title} section={section} platforms={platforms} />
            ))}
          </tbody>
        </table>
      </div>
      {dropped.length > 0 ? (
        <p className="mt-3 text-[11.5px] leading-relaxed store-text-muted">
          No open-source value for any selected platform: {dropped.join(', ')}.
        </p>
      ) : null}
    </div>
  )
}

function SectionRows({ section, platforms }: { section: Section; platforms: Platform[] }) {
  return (
    <>
      <tr>
        <th
          scope="rowgroup"
          colSpan={platforms.length + 1}
          className="text-left !bg-[#000] px-[14px] pt-5 pb-2 text-[13px] font-semibold text-[var(--store-ink)] border-b border-[rgba(255,255,255,0.1)]"
        >
          <span className="sticky left-[14px]">{section.title}</span>
        </th>
      </tr>
      {section.rows.map((row) => {
        if (row.kind === 'num') {
          const vals = platforms.map((p) => row.get(p))
          const nums = vals.filter((v): v is number => v != null)
          const max = nums.length ? Math.max(...nums) : 0
          const leadOn = row.leader === 'max' && nums.length > 1 && nums.some((n) => n !== max)
          return (
            <tr key={row.label}>
              <td className="stick text-[12.5px] store-text-muted">{row.label}</td>
              {vals.map((v, i) => (
                <td key={platforms[i].id}>
                  <NumCell value={v} max={max} lead={leadOn && v === max} unit={row.unit} />
                </td>
              ))}
            </tr>
          )
        }
        return (
          <tr key={row.label}>
            <td className="stick text-[12.5px] store-text-muted">{row.label}</td>
            {platforms.map((p) => {
              const v = row.get(p)
              return (
                <td key={p.id} className={cn('text-[13px] text-[var(--store-ink)] leading-5', row.mono && 'font-mono text-[12.5px]')}>
                  {hasValue(v) ? v : <Blank />}
                </td>
              )
            })}
          </tr>
        )
      })}
    </>
  )
}
