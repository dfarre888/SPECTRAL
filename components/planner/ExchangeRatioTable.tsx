'use client';

import { computeExchangeRatio, OSINT_THREAT_COSTS_USD } from '@/lib/planner/engagement-economics';

interface Row { platformId: string; defeatSystemId: string; effectorCostUsd: number; pk: number; label: string }

export function ExchangeRatioTable({ rows }: { rows: Row[] }) {
  return (
    <table className="w-full text-xs font-mono border-collapse">
      <thead>
        <tr className="text-left store-text-muted border-b border-[var(--store-line)]">
          <th className="py-2 pr-2">Pair</th>
          <th className="py-2 pr-2">Exchange</th>
          <th className="py-2">Doctrine</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const threat = OSINT_THREAT_COSTS_USD[r.platformId] ?? 50_000;
          const ex = computeExchangeRatio(threat, r.effectorCostUsd, r.pk);
          return (
            <tr key={`${r.platformId}-${r.defeatSystemId}`} className="border-b border-[var(--store-line)]">
              <td className="py-2 pr-2 store-text-body">{r.label}</td>
              <td className="py-2 pr-2 text-orange">{ex.exchangeRatio.toFixed(0)}:1</td>
              <td className="py-2 store-text-muted">{ex.doctrineHint}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
