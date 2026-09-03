'use client';

import type React from 'react';

import { ExchangeRatioTable } from '@/components/planner/ExchangeRatioTable';
import { SalvoSimulator } from '@/components/planner/SalvoSimulator';

const DEMO_ROWS = [
  { platformId: 'shahed-136', defeatSystemId: 'nasams-amraam-er', effectorCostUsd: 1_000_000, pk: 0.75, label: 'Shahed vs NASAMS' },
  { platformId: 'shahed-136', defeatSystemId: 'gepard-spaag', effectorCostUsd: 40_000, pk: 0.65, label: 'Shahed vs Gepard' },
  { platformId: 'kalibr-3m14', defeatSystemId: 'gbad-cea-sm2-aus', effectorCostUsd: 2_500_000, pk: 0.8, label: 'Kalibr vs GBAD SM-2' },
];

interface EngagementEconomicsPanelProps {
  /** Real exchange-ratio rows. Falls back to the demo set when omitted. */
  rows?: React.ComponentProps<typeof ExchangeRatioTable>['rows'];
}

export function EngagementEconomicsPanel({ rows }: EngagementEconomicsPanelProps = {}) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-xl border border-[var(--store-line)] store-panel-inner p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Exchange ratio table</h3>
        <ExchangeRatioTable rows={rows ?? DEMO_ROWS} />
      </div>
      <div className="rounded-xl border border-[var(--store-line)] store-panel-inner p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Salvo simulator</h3>
        <SalvoSimulator />
      </div>
    </div>
  );
}
