'use client'

import { Info } from 'lucide-react'
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
    <label className="flex flex-col gap-0.5">
      <span className="text-[9px] uppercase tracking-wide store-text-muted">{label}</span>
      <input
        type="number"
        step="0.001"
        min="0"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="font-mono text-[11px] bg-black/30 border border-[var(--store-line)] rounded px-1.5 py-0.5 text-white"
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

  return (
    <div className="mt-2 p-2 rounded-lg border border-[var(--store-line)] bg-black/20 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--store-accent)]">
          RCS — OSINT planning nominal
        </span>
        {rcsOverride && (
          <button type="button" onClick={reset} className="text-[9px] store-text-muted hover:text-white">
            Reset
          </button>
        )}
      </div>

      {boundary && (
        <p className="text-[10px] text-amber-400/95 leading-snug border border-amber-500/40 rounded px-2 py-1.5 bg-amber-950/30">
          SOVEREIGN_CORE_BOUNDARY — open-build values are geometry inference only. Real signature fidelity requires the accredited resolver.
        </p>
      )}

      {catalogueEntry && (
        <p className="text-[10px] store-text-muted flex gap-1 leading-snug" title={catalogueEntry.osint_basis}>
          <Info className="w-3 h-3 shrink-0 mt-0.5" />
          <span className="line-clamp-3">{catalogueEntry.osint_basis}</span>
        </p>
      )}

      <p className="text-[9px] store-text-muted font-mono">
        ref: {resolved.rcs_ref} · confidence: {resolved.confidence}
      </p>

      <div className="grid grid-cols-2 gap-2">
        {facetField('Nose m²', facets.nose, (v) => setFacet('nose', v))}
        {facetField('Beam m²', facets.beam, (v) => setFacet('beam', v))}
        {facetField('Tail m²', facets.tail, (v) => setFacet('tail', v))}
        {facetField('Top m²', facets.top, (v) => setFacet('top', v))}
      </div>
    </div>
  )
}
