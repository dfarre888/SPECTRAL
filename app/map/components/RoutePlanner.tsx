'use client'

import { useState } from 'react'
import { ChevronRight, Info } from 'lucide-react'
import {
  getRcsFacets,
  isPlatformRcsBoundaryPinned,
  PLATFORM_RCS_CATALOGUE,
  type RcsFacets,
} from '@/lib/spectral/detectionPhysicsConstants'
import { inferRcsCategoryFromAsset } from '@/lib/spectral/rcs-category-map'
import type { PlacedUas } from '@/lib/map/types'
import { cn } from '@/lib/utils'

interface RoutePlannerProps {
  uas: PlacedUas
  rcsOverride?: RcsFacets
  onRcsChange: (instanceId: string, facets: RcsFacets | undefined) => void
}

function facetField(
  label: string,
  value: number,
  onChange: (v: number) => void,
) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[12px] store-text-body">{label}</span>
      <input
        type="number"
        step="0.001"
        min="0"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="glass-field h-8 w-full px-2 font-mono text-[12px] tabular-nums"
      />
    </label>
  )
}

export function RoutePlanner({ uas, rcsOverride, onRcsChange }: RoutePlannerProps) {
  const platformId = uas.asset.id
  const category = inferRcsCategoryFromAsset(uas.asset)
  const resolved = getRcsFacets(platformId, category)
  const catalogueEntry = PLATFORM_RCS_CATALOGUE[platformId]
  const facets = rcsOverride ?? resolved.facets
  const boundary = isPlatformRcsBoundaryPinned(platformId)

  const setFacet = (key: keyof RcsFacets, val: number) => {
    if (!Number.isFinite(val) || val < 0) return
    onRcsChange(uas.instanceId, { ...facets, [key]: val })
  }

  const reset = () => onRcsChange(uas.instanceId, undefined)
  // Folded by default so a placed card stays compact; an override keeps it open.
  const [open, setOpen] = useState(false)
  const expanded = open || !!rcsOverride

  return (
    <div className="rounded-xl border border-[var(--store-line)] bg-[rgba(255,255,255,0.02)]">
      <div className="flex items-center justify-between gap-2 pl-1 pr-2.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={expanded}
          className="flex-1 min-w-0 flex items-center gap-1.5 h-9 pl-1.5 text-left"
        >
          <ChevronRight
            className={cn(
              'w-3.5 h-3.5 shrink-0 store-text-muted transition-transform duration-150 ease-out motion-reduce:transition-none',
              expanded && 'rotate-90',
            )}
          />
          <span className="text-[12px] font-semibold text-[var(--store-ink)] shrink-0">RCS</span>
          <span className="text-[12px] store-text-muted truncate">OSINT planning nominal</span>
        </button>
        {boundary && !expanded && (
          <span className="tag amber shrink-0" title="Open-build values are geometry inference only">
            Inference only
          </span>
        )}
        {rcsOverride && (
          <button type="button" onClick={reset} className="fc-action shrink-0">
            Reset
          </button>
        )}
      </div>
      {expanded && (
      <div className="px-2.5 pb-2.5 space-y-2">

      {boundary && (
        <p className="text-[12px] text-[#FCD34D] leading-snug border border-[rgba(251,191,36,0.35)] rounded-lg px-2.5 py-2">
          SOVEREIGN_CORE_BOUNDARY: open-build values are geometry inference only. Real signature fidelity requires the accredited resolver.
        </p>
      )}

      {catalogueEntry && (
        <p className="text-[12px] store-text-muted flex gap-1.5 leading-snug" title={catalogueEntry.osint_basis}>
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span className="line-clamp-3">{catalogueEntry.osint_basis}</span>
        </p>
      )}

      <p className="text-[11.5px] store-text-muted font-mono break-words">
        ref: {resolved.rcs_ref} · confidence: {resolved.confidence}
      </p>

      <div className="grid grid-cols-2 gap-2">
        {facetField('Nose m²', facets.nose, (v) => setFacet('nose', v))}
        {facetField('Beam m²', facets.beam, (v) => setFacet('beam', v))}
        {facetField('Tail m²', facets.tail, (v) => setFacet('tail', v))}
        {facetField('Top m²', facets.top, (v) => setFacet('top', v))}
      </div>
      </div>
      )}
    </div>
  )
}
