'use client'

import type { AcquireCalcResult } from '@/lib/acquire/acquire-types'
import { EngagementEconomicsPanel } from '@/components/planner/EngagementEconomicsPanel'
import { StorePanel } from '@/components/ui/store-surface'

interface CalcPanelProps {
  calc: AcquireCalcResult
}

export function CalcPanel({ calc }: CalcPanelProps) {
  const recommendedLabel =
    calc.panel_rows.find((r) => r.defeatSystemId === calc.recommended_option_id)?.label ||
    calc.recommended_option_id ||
    'None'

  return (
    <div className="space-y-8">
      <StorePanel className="flex flex-wrap items-start gap-x-10 gap-y-4 p-6">
        <div className="min-w-0">
          <p className="text-xs store-text-muted">Recommended fielding</p>
          <p className="store-display mt-1.5 text-[22px] font-semibold leading-tight tracking-[-0.01em] text-[var(--store-ink)]">
            {recommendedLabel}
          </p>
          {calc.recommended_option_id ? (
            <p className="mt-1 font-mono text-xs store-text-muted">{calc.recommended_option_id}</p>
          ) : null}
        </div>
        <p className="min-w-[260px] flex-1 self-center text-[13px] leading-relaxed store-text-body">{calc.salvo_note}</p>
      </StorePanel>

      <EngagementEconomicsPanel rows={calc.panel_rows} />
    </div>
  )
}
