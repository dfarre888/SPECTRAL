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
    <div className="fc-inst border-b fc-hair" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }} aria-label="Operations instruments">
      {KEYS.map((key) => {
        const meta = copy.metrics[key]
        const href = metricHref(key)
        const isGlossy = glossy.has(key)
        const tone =
          key === 'criticalAlerts' ? 'red' : key === 'activeRpa' || key === 'activeMissions' ? 'blue' : ''
        return (
          <Link key={key} href={href} className="block group">
            <div className="k">{meta.label}</div>
            <div className={cn('v', isGlossy ? 'glow' : tone)}>{metrics[key]}</div>
            <div className="d group-hover:text-[var(--store-ink-soft)] transition-colors">{meta.sub}</div>
          </Link>
        )
      })}
    </div>
  )
}
