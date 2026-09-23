'use client'

/**
 * Callers: ForceCatalogGrid
 * Purpose: Platform card with optional selection (native button for a11y)
 * API/schema: ForceCatalogPlatformFull
 *
 * Black-canvas language: one hairline, no chip walls. Comms read as a single
 * line with tier dots; sensors as a short list with a coloured band mark.
 */

import type { ForceCatalogPlatformFull } from '@/lib/bmi/bmi-types'
import { ConfidenceTag } from '@/components/force/ConfidenceTag'
import { tierForKind } from '@/lib/coalition/datalink-matrix'
import { BAND_KIND, sensorBands } from '@/lib/force-catalog/spectrum-bands'

export type CatalogDensity = 'grid' | 'compact'

const SIDE: Record<ForceCatalogPlatformFull['force_side'], string> = {
  blue: 'var(--wb-blue)', red: 'var(--wb-red)', neutral: 'var(--wb-neutral)',
}
const TIER: Record<string, string> = { track: 'var(--wb-track)', data: 'var(--wb-data)', voice: 'var(--wb-voice)', none: 'var(--store-ink-faint)' }
const KIND: Record<string, string> = { rf: 'var(--wb-rf)', ir: 'var(--wb-ir)', optical: 'var(--wb-optical)' }

function statusLabel(s: string): string {
  return s.replace(/_/g, ' ')
}

export function PlatformCard({
  p,
  density,
  selected,
  onSelect,
  buttonRef,
}: {
  p: ForceCatalogPlatformFull
  density: CatalogDensity
  selected?: boolean
  onSelect?: (p: ForceCatalogPlatformFull) => void
  buttonRef?: (el: HTMLButtonElement | null) => void
}) {
  const compact = density === 'compact'
  const comms = p.comms.slice(0, compact ? 3 : 6)
  const sensors = p.sensors.slice(0, compact ? 0 : 3)

  const body = (
    <div
      className={[
        'store-panel h-full rounded-2xl transition-[border-color,box-shadow] duration-150 ease-out',
        compact ? 'px-3.5 py-2.5 space-y-1.5' : 'px-4 py-3.5 space-y-2.5',
        selected
          ? '!border-[rgba(41,151,255,0.7)] ring-1 ring-[rgba(41,151,255,0.45)]'
          : 'hover:!border-[rgba(255,255,255,0.22)]',
      ].join(' ')}
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-[7px] h-1.5 w-1.5 rounded-full shrink-0" style={{ background: SIDE[p.force_side] }} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className={`${compact ? 'text-[13px]' : 'text-[15px]'} store-display font-semibold tracking-[-0.01em] text-[var(--store-ink)] truncate`}>
            {p.short_name}
          </p>
          <p className="text-[12px] font-mono store-text-muted truncate">
            {p.designation} · {p.nation_code} · {p.domain} · {p.role.replace(/_/g, ' ')}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[12px] store-text-muted capitalize">{statusLabel(p.service_status)}</span>
          <ConfidenceTag confidence={p.data_confidence} />
        </div>
      </div>

      {!compact ? (
        <p className="text-[13px] store-text-body leading-snug line-clamp-2 text-pretty pl-4">{p.open_source_summary}</p>
      ) : null}

      {comms.length ? (
        <p className="text-[12px] font-mono store-text-muted pl-4 flex flex-wrap gap-x-3 gap-y-1">
          {comms.map((c) => {
            const tier = tierForKind(c.kind, c.standard)
            return (
              <span key={c.id} className="inline-flex items-center gap-1.5" title={`${c.label} · ${tier} tier`}>
                <i className="h-1.5 w-1.5 rounded-full" style={{ background: TIER[tier] }} />
                {c.standard && c.standard !== 'none' ? c.standard : c.label}
              </span>
            )
          })}
          {p.comms.length > comms.length ? <span>+{p.comms.length - comms.length}</span> : null}
        </p>
      ) : null}

      {sensors.length ? (
        <ul className="pl-4 space-y-0.5">
          {sensors.map((s) => {
            const bands = sensorBands(s)
            const kind = bands[0] ? BAND_KIND[bands[0]] ?? 'rf' : 'rf'
            return (
              <li key={s.id} className="text-[11px] store-text-muted flex items-center gap-2 min-w-0">
                <span className="text-[11px] font-mono shrink-0" style={{ color: KIND[kind] }}>{bands.join('/') || 'no band'}</span>
                <span className="truncate">{s.label}</span>
              </li>
            )
          })}
          {p.sensors.length > sensors.length ? <li className="text-[11px] store-text-muted">+{p.sensors.length - sensors.length} more</li> : null}
        </ul>
      ) : !compact && p.sensors.length === 0 ? (
        <p className="text-[11px] store-text-muted pl-4">No sensors listed (OSINT gap)</p>
      ) : null}
    </div>
  )

  if (!onSelect) return body

  return (
    <button
      type="button"
      ref={buttonRef}
      aria-pressed={Boolean(selected)}
      aria-label={selected ? `Close detail for ${p.short_name}` : `Open detail for ${p.short_name}`}
      onClick={() => onSelect(p)}
      className="w-full h-full text-left cursor-pointer rounded-2xl border-0 bg-transparent p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--wb-blue)] focus-visible:outline-offset-2"
    >
      {body}
    </button>
  )
}
