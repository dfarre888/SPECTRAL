'use client';

import { computeExchangeRatio, OSINT_THREAT_COSTS_USD } from '@/lib/planner/engagement-economics';
import { formatUsd } from '@/lib/planner/cost-model';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';

interface Row { platformId: string; defeatSystemId: string; effectorCostUsd: number; pk: number; label: string }

type Computed = Row & { ratio: number; doctrine: string };

/** Colour the ratio by the same thresholds the doctrine hint uses. */
function ratioInk(r: number) {
  if (r > 50) return '#FF8A98';
  if (r > 10) return '#FCD34D';
  return 'var(--store-ink)';
}

const COLUMNS: DataColumn<Computed>[] = [
  {
    key: 'pair',
    header: 'Pair',
    width: 220,
    sortValue: (r) => r.label,
    cell: (r) => <span className="primary">{r.label}</span>,
  },
  {
    key: 'cost',
    header: 'Shot cost',
    align: 'right',
    headerClassName: '!text-right',
    width: 116,
    sortValue: (r) => r.effectorCostUsd,
    cell: (r) => formatUsd(r.effectorCostUsd),
  },
  {
    key: 'pk',
    header: 'Pk',
    align: 'right',
    headerClassName: '!text-right',
    width: 76,
    sortValue: (r) => r.pk,
    cell: (r) => r.pk.toFixed(2),
  },
  {
    key: 'ratio',
    header: 'Exchange',
    align: 'right',
    headerClassName: '!text-right',
    width: 112,
    sortValue: (r) => r.ratio,
    cell: (r) => <span style={{ color: ratioInk(r.ratio) }}>{r.ratio.toFixed(0)}:1</span>,
  },
  {
    key: 'doctrine',
    header: 'Doctrine',
    cell: (r) => <span className="block min-w-[220px] leading-snug">{r.doctrine}</span>,
  },
];

export function ExchangeRatioTable({ rows }: { rows: Row[] }) {
  const computed: Computed[] = rows.map((r) => {
    const threat = OSINT_THREAT_COSTS_USD[r.platformId] ?? 50_000;
    const ex = computeExchangeRatio(threat, r.effectorCostUsd, r.pk);
    return { ...r, ratio: ex.exchangeRatio, doctrine: ex.doctrineHint };
  });
  return (
    <DataTable
      rows={computed}
      columns={COLUMNS}
      rowKey={(r) => `${r.platformId}-${r.defeatSystemId}`}
      caption="Exchange ratio per threat and effector pair"
      maxHeight="calc(100vh - 220px)"
    />
  );
}
