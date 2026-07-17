'use client'

import Link from 'next/link'
import type { DashboardCopy } from '@/lib/dashboard/adapters'
import type { DashboardMetrics } from '@/lib/dashboard/types'
import { StorePanel } from '@/components/ui/store-surface'
import { isOperationsEditionClient } from '@/lib/operations/edition-client'
import { AlertTriangle, ClipboardCheck, Plane, Radio } from 'lucide-react'

const ICONS = [Plane, Radio, ClipboardCheck, AlertTriangle] as const
const KEYS = ['activeRpa', 'activeMissions', 'pendingApprovals', 'criticalAlerts'] as const

function metricHref(key: (typeof KEYS)[number]): string {
  switch (key) {
    case 'activeRpa':
      return '/map'
    case 'activeMissions':
      return '/arena'
    case 'pendingApprovals':
      return isOperationsEditionClient() ? '/operations/import' : '/currency'
    case 'criticalAlerts':
      return '/defeat'
  }
}

export function MetricSummaryBar({ metrics, copy }: { metrics: DashboardMetrics; copy: DashboardCopy }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {KEYS.map((key, i) => {
        const Icon = ICONS[i]
        const meta = copy.metrics[key]
        const href = metricHref(key)
        const accent =
          key === 'activeRpa'
            ? 'text-emerald-400'
            : key === 'activeMissions'
              ? 'text-cyan'
              : key === 'pendingApprovals'
                ? 'text-amber-400'
                : 'text-red-400'
        return (
          <Link key={key} href={href} className="block group">
            <StorePanel className="p-5 border-[var(--store-line)] transition-colors group-hover:border-[var(--store-accent-border)] cursor-pointer">
              <div className="flex items-start justify-between gap-2 mb-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider store-text-muted">{meta.label}</p>
                <Icon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${accent}`} />
              </div>
              <p className={`text-4xl font-bold font-mono tabular-nums leading-none ${accent}`}>
                {metrics[key]}
              </p>
              <p className="text-[10px] font-mono store-text-muted mt-2">{meta.sub}</p>
            </StorePanel>
          </Link>
        )
      })}
    </div>
  )
}
