'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { DataTable, type DataColumn } from '@/components/ui/DataTable'
import {
  categoryLabel,
  categoryMeta,
  confidenceRank,
  confidenceTag,
  fmtNum,
  guidanceText,
  identityMeta,
  knownFlag,
} from '@/components/platforms/platform-display'
import { MAX_COMPARE_PLATFORMS, useCompareStore } from '@/lib/stores/compare-store'
import type { Platform } from '@/lib/types'
import { cn } from '@/lib/utils'

const Blank = () => <span className="store-text-muted">—</span>

function Head({ label, unit }: { label: string; unit?: string }) {
  return (
    <span>
      {label}
      {unit ? <span className="ml-1 font-normal store-text-muted">{unit}</span> : null}
    </span>
  )
}

function Num({ value }: { value: number | null | undefined }) {
  const s = fmtNum(value)
  return s == null ? <Blank /> : <span className="text-[var(--store-ink)]">{s}</span>
}

function CompareCheck({ platform }: { platform: Platform }) {
  const { isSelected, toggle } = useCompareStore()
  const selected = isSelected(platform.id)
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={selected ? `Remove ${platform.name} from compare` : `Add ${platform.name} to compare`}
      title={selected ? 'In compare' : 'Add to compare'}
      onClick={(e) => {
        e.stopPropagation()
        const ok = toggle(platform.id)
        if (!ok) toast.error(`Maximum ${MAX_COMPARE_PLATFORMS} platforms`)
      }}
      className={cn(
        'grid place-items-center w-[18px] h-[18px] shrink-0 rounded-[6px] border transition-colors duration-150',
        selected
          ? 'bg-[var(--wb-blue)] border-[var(--wb-blue)] text-white shadow-[0_0_12px_-3px_rgba(41,151,255,0.9)]'
          : 'border-[rgba(255,255,255,0.28)] text-transparent hover:border-white',
      )}
    >
      <Check className="w-3 h-3" strokeWidth={3} />
    </button>
  )
}

/**
 * Fit the table's own scroller to what is left of the viewport, so the last
 * row and the horizontal scrollbar are never below the fold while the wheel
 * is captured by the table.
 */
function useFitHeight(reserveBottom: number, min = 420) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [maxHeight, setMaxHeight] = useState<string | undefined>(undefined)

  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    const main = el.closest('main')
    const mainRect = main?.getBoundingClientRect()
    const bottom = mainRect ? mainRect.bottom : window.innerHeight
    const top = el.getBoundingClientRect().top + (main?.scrollTop ?? 0) - (mainRect ? 0 : window.scrollY)
    const avail = Math.round(bottom - top - 20 - reserveBottom)
    setMaxHeight(`${Math.max(min, avail)}px`)
  }, [reserveBottom, min])

  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  return { ref, maxHeight, measure }
}

/**
 * Column widths. Text cells hold a fixed-width block so the browser honours
 * these widths instead of starving clipped columns. The default nine columns
 * fit a 1512px screen; the extended set scrolls sideways with the name pinned.
 */
const W = { name: 268, type: 140, origin: 128, num: 90, conf: 112, combat: 100, guidance: 260 }
/** Horizontal cell padding in the compact table (12px each side). */
const PAD = 24

/** Columns shown only when the reader asks for more detail. */
const EXTENDED = new Set(['guidance', 'mtow', 'warhead'])

interface PlatformTableProps {
  platforms: Platform[]
  /** Add Guidance, MTOW and Warhead. Off by default so the table fits a laptop screen. */
  extended?: boolean
  /** Pixels to keep clear at the bottom (the floating compare tray). */
  reserveBottom?: number
  empty?: ReactNode
}

export function PlatformTable({ platforms, extended = false, reserveBottom = 0, empty }: PlatformTableProps) {
  const router = useRouter()
  const { ref, maxHeight } = useFitHeight(reserveBottom)

  const columns = useMemo<DataColumn<Platform>[]>(
    () => [
      {
        key: 'name',
        header: 'Platform',
        sticky: true,
        width: W.name,
        sortValue: (p) => p.name,
        cell: (p) => {
          const meta = identityMeta(p)
          return (
            <div className="flex items-center gap-3" style={{ width: W.name - PAD }}>
              <CompareCheck platform={p} />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/platforms/${p.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="primary block truncate leading-snug hover:underline underline-offset-2"
                  title={p.name}
                >
                  {p.name}
                </Link>
                {meta ? (
                  <span className="meta truncate" title={meta}>
                    {meta}
                  </span>
                ) : null}
              </div>
            </div>
          )
        },
      },
      {
        key: 'type',
        header: 'Type',
        width: W.type,
        sortValue: (p) => categoryLabel(p.category),
        cell: (p) => {
          const meta = categoryMeta(p)
          return (
            <div style={{ width: W.type - PAD }}>
              <span className="block truncate text-[var(--store-ink)] leading-snug">{categoryLabel(p.category)}</span>
              {meta ? <span className="meta truncate">{meta}</span> : null}
            </div>
          )
        },
      },
      {
        key: 'origin',
        header: 'Origin',
        width: W.origin,
        sortValue: (p) => p.country_of_origin,
        cell: (p) => {
          if (!p.country_of_origin) return <Blank />
          const flag = knownFlag(p.country_of_origin)
          return (
            <span className="block truncate" style={{ width: W.origin - PAD }} title={p.country_of_origin}>
              {flag ? (
                <span className="mr-1.5" aria-hidden>
                  {flag}
                </span>
              ) : null}
              {p.country_of_origin}
            </span>
          )
        },
      },
      {
        key: 'range',
        header: <Head label="Range" unit="km" />,
        label: 'Range',
        align: 'right',
        width: W.num,
        sortValue: (p) => p.range_km,
        cell: (p) => <Num value={p.range_km} />,
      },
      {
        key: 'speed',
        header: <Head label="Speed" unit="km/h" />,
        label: 'Speed',
        align: 'right',
        width: W.num + 10,
        sortValue: (p) => p.max_speed_kmh,
        cell: (p) => <Num value={p.max_speed_kmh} />,
      },
      {
        key: 'ceiling',
        header: <Head label="Ceiling" unit="m" />,
        label: 'Ceiling',
        align: 'right',
        width: W.num,
        sortValue: (p) => p.service_ceiling_m,
        cell: (p) => <Num value={p.service_ceiling_m} />,
      },
      {
        key: 'endurance',
        header: <Head label="Endurance" unit="h" />,
        label: 'Endurance',
        align: 'right',
        width: W.num + 18,
        sortValue: (p) => p.endurance_hrs,
        cell: (p) => <Num value={p.endurance_hrs} />,
      },
      {
        key: 'confidence',
        header: 'Confidence',
        width: W.conf,
        sortValue: (p) => confidenceRank(p.data_confidence),
        cell: (p) => {
          const c = confidenceTag(p.data_confidence)
          return <span className={cn('tag', c.tone)}>{c.label}</span>
        },
      },
      {
        key: 'combat',
        header: 'Combat',
        width: W.combat,
        sortValue: (p) => (p.conflict_deployments?.length ? -p.conflict_deployments.length : null),
        cell: (p) => {
          const d = p.conflict_deployments ?? []
          if (!d.length) return <Blank />
          return (
            <span className="tag" title={`Combat employment: ${d.join(', ')}`}>
              Proven
            </span>
          )
        },
      },
      {
        key: 'guidance',
        header: 'Guidance and Navigation',
        label: 'Guidance',
        width: W.guidance,
        sortValue: (p) => guidanceText(p),
        cell: (p) => {
          const g = guidanceText(p)
          if (!g) return <Blank />
          return (
            <span className="block truncate" style={{ width: W.guidance - PAD }} title={g}>
              {g}
            </span>
          )
        },
      },
      {
        key: 'mtow',
        header: <Head label="MTOW" unit="kg" />,
        label: 'MTOW',
        align: 'right',
        width: W.num,
        sortValue: (p) => p.mtow_kg,
        cell: (p) => <Num value={p.mtow_kg} />,
      },
      {
        key: 'warhead',
        header: <Head label="Warhead" unit="kg" />,
        label: 'Warhead',
        align: 'right',
        width: W.num + 12,
        sortValue: (p) => p.warhead_kg,
        cell: (p) => <Num value={p.warhead_kg} />,
      },
    ],
    [],
  )
  const visible = useMemo(
    () => (extended ? columns : columns.filter((c) => !EXTENDED.has(c.key))),
    [columns, extended],
  )

  return (
    <div ref={ref}>
      <DataTable
        rows={platforms}
        columns={visible}
        rowKey={(p) => p.id}
        onRowClick={(p) => router.push(`/platforms/${p.id}`)}
        defaultSort={{ key: 'name', dir: 'asc' }}
        compact
        maxHeight={maxHeight}
        caption="Platform Library"
        empty={empty}
        className="platform-table"
      />
    </div>
  )
}
