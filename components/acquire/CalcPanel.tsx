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
    '—'

  return (
    <div className="space-y-4">
      <StorePanel className="p-4">
        <p className="text-xs store-text-body">
          Recommended fielding:{' '}
          <span className="font-semibold text-cyan">{recommendedLabel}</span>
          {calc.recommended_option_id ? (
            <span className="font-mono store-text-muted ml-2">({calc.recommended_option_id})</span>
          ) : null}
        </p>
        <p className="text-[11px] store-text-muted mt-2">{calc.salvo_note}</p>
      </StorePanel>

      <EngagementEconomicsPanel rows={calc.panel_rows} />
    </div>
  )
}
