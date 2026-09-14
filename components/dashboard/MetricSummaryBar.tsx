'use client'

import Link from 'next/link'
import type { DashboardCopy } from '@/lib/dashboard/adapters'
import type { DashboardMetrics } from '@/lib/dashboard/types'
import { StorePanel } from '@/components/ui/store-surface'
import { isOperationsEditionClient } from '@/lib/operations/edition-client'
import { AlertTriangle, ClipboardCheck, Plane, Radio } from 'lucide-react'
import { allocateGloss } from '@/lib/ui/gloss-budget'
import { cn } from '@/lib/utils'

/** Threat-priority order — critical alerts first for commander scan pattern. */
const KEYS = ['criticalAlerts', 'activeRpa', 'activeMissions', 'pendingApprovals'] as const
const ICONS = [AlertTriangle, Plane, Radio, ClipboardCheck] as const

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

/**
 * Weight for the gloss budget. Only tiles wanting attention compete, and the
 * budget caps how many can win — so the shine says "these matter most", not
 * "a lot is happening".
 */
function glossWeight(key: (typeof KEYS)[number], value: number): number {
  if (value <= 0) return 0
  switch (key) {
    case 'criticalAlerts':
      return 100 + value
    case 'pendingApprovals':
      return 50 + value
    default:
      // Active airframes and missions are normal operating state, not a call
      // for attention, so they never take gloss however high they run.
      return 0
  }
}

export function MetricSummaryBar({ metrics, copy }: { metrics: DashboardMetrics; copy: DashboardCopy }) {
  const glossy = allocateGloss(
    KEYS.map((key) => {
      const weight = glossWeight(key, Number(metrics[key]) || 0)
      return { key, weight, eligible: weight > 0 }
    }),
  )

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
        const isGlossy = glossy.has(key)
        return (
          <Link key={key} href={href} className="block group">
            {isGlossy ? (
              // The rationed gloss: gradient fill, masked bright hairline, tinted
              // outer glow. Text goes near-white because the fill is mid-tone.
              <div className="gloss-tile purple p-5 cursor-pointer transition-transform group-hover:-translate-y-0.5">
                <div className="relative flex items-start justify-between gap-2 mb-3">
                  <p className="text-[11px] font-semibold tracking-[0.02em] text-white/70">{meta.label}</p>
                  <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5 text-white/90" />
                </div>
                <p className="relative text-4xl font-bold font-mono tabular-nums leading-none text-white">
                  {metrics[key]}
                </p>
                <p className="relative text-[11px] font-mono text-white/60 mt-2">{meta.sub}</p>
              </div>
            ) : (
              <StorePanel className={cn(
                'p-5 border-[var(--store-line)] transition-colors cursor-pointer',
                'group-hover:border-[rgba(41,151,255,0.5)]',
              )}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <p className="text-[11px] font-semibold tracking-[0.02em] store-text-muted">{meta.label}</p>
                  <Icon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${accent}`} />
                </div>
                <p className={`text-4xl font-bold font-mono tabular-nums leading-none ${accent}`}>
                  {metrics[key]}
                </p>
                <p className="text-[11px] font-mono store-text-muted mt-2">{meta.sub}</p>
              </StorePanel>
            )}
          </Link>
        )
      })}
    </div>
  )
}
