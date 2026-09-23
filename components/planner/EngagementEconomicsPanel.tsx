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
    <div className="space-y-8">
      <div>
        <h3 className="text-[15px] font-semibold text-[var(--store-ink)]">Exchange ratio with Pk</h3>
        <p className="mb-3 mt-1 text-[13px] store-text-body">
          Shot cost divided by Pk, over the threat&apos;s unit cost: what one expected kill costs in threats.
        </p>
        <ExchangeRatioTable rows={rows ?? DEMO_ROWS} />
      </div>
      <div className="store-panel rounded-2xl p-5">
        <h3 className="text-[15px] font-semibold text-[var(--store-ink)]">Salvo simulator</h3>
        <p className="mb-5 mt-1 text-[13px] store-text-body">
          How many threats leak through a single magazine at a given Pk.
        </p>
        <SalvoSimulator />
      </div>
    </div>
  );
}
