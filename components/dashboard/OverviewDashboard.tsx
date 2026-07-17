'use client'

import type { DashboardCopy } from '@/lib/dashboard/adapters'
import type { DashboardMetrics, LiveMapContext, OperatorRow, TrackedAsset } from '@/lib/dashboard/types'
import { MetricSummaryBar } from '@/components/dashboard/MetricSummaryBar'
import { OperatorReadinessPanel } from '@/components/dashboard/OperatorReadinessPanel'
import { LiveOperationsMap } from '@/components/dashboard/LiveOperationsMap'
import { AssetIntelligenceCard } from '@/components/dashboard/AssetIntelligenceCard'

export interface OverviewDashboardProps {
  copy: DashboardCopy
  metrics: DashboardMetrics
  operators: OperatorRow[]
  assets: TrackedAsset[]
  mapContext: LiveMapContext
  selectedAssetId?: string
  onSelectAsset?: (id: string) => void
  recentPlanId?: string
  mapCenter?: { lon: number; lat: number }
}

export function OverviewDashboard({
  copy,
  metrics,
  operators,
  assets,
  mapContext,
  selectedAssetId,
  onSelectAsset,
  recentPlanId,
  mapCenter,
}: OverviewDashboardProps) {
  const activeId = selectedAssetId ?? assets[0]?.id ?? ''
  const selected = assets.find((a) => a.id === activeId) ?? assets[0]

  return (
    <section aria-label="Command center overview">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--store-accent)] mb-1">
          {copy.commandEyebrow}
        </p>
        <h2 className="text-lg font-semibold text-white">{copy.commandTitle}</h2>
        <p className="text-xs store-text-body mt-1 max-w-2xl">{copy.commandSubtitle}</p>
      </div>

      <MetricSummaryBar metrics={metrics} copy={copy} />

      <div className="mt-6 grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        <div className="xl:col-span-4 min-h-[420px]">
          <OperatorReadinessPanel operators={operators} copy={copy} />
        </div>
        <div className="xl:col-span-5 min-h-[420px]">
          <LiveOperationsMap
            context={mapContext}
            copy={copy}
            recentPlanId={recentPlanId}
            mapCenter={mapCenter}
          />
        </div>
        <div className="xl:col-span-3 min-h-[420px] flex flex-col gap-3">
          <div className="flex flex-col gap-1.5 max-h-[120px] overflow-y-auto pr-0.5">
            {assets.map((a) => {
              const batteryColor =
                a.batteryHealthPct >= 80
                  ? 'text-emerald-400'
                  : a.batteryHealthPct >= 50
                    ? 'text-amber-400'
                    : 'text-red-400'
              const isActive = a.id === selected?.id
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onSelectAsset?.(a.id)}
                  className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
                    isActive
                      ? 'border-[var(--store-accent-border)] bg-[var(--store-accent-glow)]'
                      : 'border-[var(--store-line)] bg-[var(--store-surface-2)] hover:border-[var(--store-accent-border)]/50'
                  }`}
                >
                  <div className="min-w-0">
                    <p
                      className={`text-[11px] font-medium truncate ${isActive ? 'text-[var(--store-accent)]' : 'text-white'}`}
                    >
                      {a.designation}
                    </p>
                    <p className="text-[9px] font-mono store-text-muted truncate">{a.serialNumber}</p>
                  </div>
                  <span className={`text-[10px] font-mono font-semibold shrink-0 ${batteryColor}`}>
                    {a.batteryHealthPct}%
                  </span>
                </button>
              )
            })}
          </div>
          {selected && <AssetIntelligenceCard asset={selected} copy={copy} />}
        </div>
      </div>
    </section>
  )
}
