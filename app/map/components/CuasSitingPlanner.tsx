'use client'

import { useMemo } from 'react'
import { CuasCoverageEngine } from '@/lib/cuas/cuasCoverageEngine'
import type { PlacedCuas, PlacedUas } from '@/lib/map/types'

interface CuasSitingPlannerProps {
  placedUas: PlacedUas[]
  placedCuas: PlacedCuas[]
  onClose: () => void
}

const mono = { fontFamily: "'JetBrains Mono', monospace" } as const

export function CuasSitingPlanner({ placedUas, placedCuas, onClose }: CuasSitingPlannerProps) {
  const analysis = useMemo(() => {
    const engine = new CuasCoverageEngine()
    const cuas = placedCuas.map((c) => ({
      id: c.instanceId,
      name: c.asset.name,
      lon: c.lon,
      lat: c.lat,
      defeat_range_m: c.asset.defeat_range_m,
    }))
    const threats = placedUas.map((u) => ({
      id: u.instanceId,
      name: u.asset.name,
      lon: u.lon,
      lat: u.lat,
    }))
    return engine.analyseCoverage(cuas, threats)
  }, [placedCuas, placedUas])

  const verdictColor =
    analysis.verdict === 'adequate'
      ? '#22C55E'
      : analysis.verdict === 'partial'
        ? '#EAB308'
        : analysis.verdict === 'inadequate'
          ? '#EF4444'
          : '#94a3b8'

  return (
    <div
      className="map-material-float absolute top-3 left-3 z-30 w-[min(100%,22rem)] max-h-[calc(100%-8rem)] overflow-y-auto rounded-xl pointer-events-auto"
    >
      <div className="p-3 space-y-3 text-[11px] store-text-body">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#06B6D4]">C-UAS siting planner</p>
          <button type="button" onClick={onClose} className="store-text-muted hover:text-white text-xs" aria-label="Close">✕</button>
        </div>
        <p className="text-[9px] store-text-muted">{analysis.notes}</p>
        <div className="rounded-lg border border-[var(--store-line)] px-2 py-2" style={{ borderColor: verdictColor }}>
          <p className="text-[10px] store-text-muted">Coverage verdict</p>
          <p className="text-sm font-semibold uppercase" style={{ color: verdictColor, ...mono }}>{analysis.verdict}</p>
          <p className="text-[10px] mt-1" style={mono}>
            {analysis.covered_count}/{analysis.total_threats} threats · {analysis.coverage_pct}%
          </p>
        </div>
        {analysis.gaps.length > 0 && (
          <div>
            <p className="text-[10px] text-[#F97316] mb-1">Coverage gaps</p>
            <ul className="space-y-1 max-h-32 overflow-y-auto">
              {analysis.gaps.map((g) => (
                <li key={g.uas_id} className="text-[10px] store-panel-inner rounded px-2 py-1">
                  <span className="text-white" style={mono}>{g.uas_name}</span>
                  <span className="store-text-muted"> · nearest C-UAS </span>
                  <span style={mono}>{g.nearest_cuas_m === Infinity ? '—' : `${g.nearest_cuas_m} m`}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {analysis.siting_recommendations.map((rec, i) => (
          <div key={i} className="store-panel-inner rounded-lg px-2 py-2 border-l-2 border-[#F97316]">
            <p className="text-[10px] text-[#F97316]">Siting recommendation</p>
            <p className="text-[10px] text-white" style={mono}>
              {rec.lat.toFixed(5)}, {rec.lon.toFixed(5)}
            </p>
            <p className="text-[9px] store-text-muted mt-1">{rec.rationale}</p>
            <p className="text-[9px] mt-1" style={mono}>+{rec.expected_additional_coverage} threat(s)</p>
          </div>
        ))}
        <p className="text-[9px] store-text-muted" style={mono}>{analysis.performance_ref}</p>
      </div>
    </div>
  )
}
