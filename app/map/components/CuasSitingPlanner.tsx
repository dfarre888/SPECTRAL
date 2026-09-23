'use client'

import { useMemo } from 'react'
import { ShieldCheck } from 'lucide-react'
import { CuasCoverageEngine } from '@/lib/cuas/cuasCoverageEngine'
import type { PlacedCuas, PlacedUas } from '@/lib/map/types'
import { CardSection, KV, MapCard } from '@/app/map/components/MapUi'

interface CuasSitingPlannerProps {
  placedUas: PlacedUas[]
  placedCuas: PlacedCuas[]
  onClose: () => void
  className?: string
}

const VERDICT_TAG: Record<string, string> = {
  adequate: 'green',
  partial: 'amber',
  inadequate: 'red',
  no_assets: '',
}

export function CuasSitingPlanner({ placedUas, placedCuas, onClose, className }: CuasSitingPlannerProps) {
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

  return (
    <MapCard
      className={className}
      title="C-UAS siting"
      icon={<ShieldCheck className="w-4 h-4" />}
      onClose={onClose}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[12px] store-text-body">Coverage verdict</span>
          <span className={`tag font-mono font-semibold ${VERDICT_TAG[analysis.verdict] ?? ''}`}>
            {analysis.verdict.replace(/_/g, ' ').toUpperCase()}
          </span>
        </div>
        <dl>
          <KV label="Threats covered" value={`${analysis.covered_count} / ${analysis.total_threats}`} />
          <KV label="Coverage" value={`${analysis.coverage_pct}%`} />
        </dl>
        <p className="text-[12px] store-text-muted leading-relaxed">{analysis.notes}</p>

        {analysis.gaps.length > 0 && (
          <CardSection title="Coverage gaps" aside={<span className="font-mono text-[12px] store-text-muted">{analysis.gaps.length}</span>}>
            <dl>
              {analysis.gaps.map((g) => (
                <KV
                  key={g.uas_id}
                  label={<span className="text-[var(--store-ink)]">{g.uas_name}</span>}
                  value={g.nearest_cuas_m === Infinity ? 'No C-UAS' : `${g.nearest_cuas_m} m`}
                  tone="amber"
                />
              ))}
            </dl>
            <p className="mt-1 text-[11.5px] store-text-muted">Distance to the nearest C-UAS.</p>
          </CardSection>
        )}

        {analysis.siting_recommendations.map((rec, i) => (
          <CardSection
            key={i}
            title={analysis.siting_recommendations.length > 1 ? `Recommended site ${i + 1}` : 'Recommended site'}
            className="rounded-xl store-panel-inner px-3 py-2.5"
          >
            <dl>
              <KV label="Position" value={`${rec.lat.toFixed(5)}, ${rec.lon.toFixed(5)}`} />
              <KV label="Added coverage" value={`+${rec.expected_additional_coverage} threat${rec.expected_additional_coverage === 1 ? '' : 's'}`} tone="green" />
            </dl>
            <p className="mt-1.5 text-[12px] store-text-muted leading-relaxed">{rec.rationale}</p>
          </CardSection>
        ))}

        <p className="font-mono text-[11px] store-text-muted break-words" title="Performance reference">
          {analysis.performance_ref}
        </p>
      </div>
    </MapCard>
  )
}
