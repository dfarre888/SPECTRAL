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
  /** The page already shows the instruments (home hero); skip the metric row. */
  instrumentsElsewhere?: boolean
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
  instrumentsElsewhere = false,
}: OverviewDashboardProps) {
  const activeId = selectedAssetId ?? assets[0]?.id ?? ''
  const selected = assets.find((a) => a.id === activeId) ?? assets[0]

  return (
    <section aria-label="Command center overview">
      <div className={instrumentsElsewhere ? 'mb-4' : 'mb-6'}>
        <h2 className="text-[19px] store-display font-semibold tracking-[-0.02em] text-[var(--store-ink)] m-0">{copy.commandTitle}</h2>
        <p className="text-[13px] store-text-body mt-1 max-w-2xl">{copy.commandSubtitle.replace(' — ', ': ')}</p>
      </div>

      {!instrumentsElsewhere && <MetricSummaryBar metrics={metrics} copy={copy} />}

      <div className={instrumentsElsewhere ? 'grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch' : 'mt-6 grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch'}>
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
          <div className="flex flex-col gap-1 max-h-[132px] overflow-y-auto pr-0.5" role="listbox" aria-label="Tracked assets">
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
                  role="option"
                  aria-selected={isActive}
                  className="shell-nav-item !mx-0 !min-h-[40px] justify-between text-left"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium truncate">
                      {a.designation}
                    </p>
                    <p className={`text-[11px] font-mono truncate ${isActive ? 'text-white/75' : 'store-text-muted'}`}>{a.serialNumber}</p>
                  </div>
                  <span className={`text-[12px] font-mono font-semibold shrink-0 ${isActive ? 'text-white' : batteryColor}`} title="Battery health">
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
