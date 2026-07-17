'use client'

import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import type { DashboardCopy } from '@/lib/dashboard/adapters'
import type { OperatorRow } from '@/lib/dashboard/types'
import { StorePanel } from '@/components/ui/store-surface'
import { CurrencyDot } from '@/components/dashboard/StatusBadge'

export function OperatorReadinessPanel({
  operators,
  copy,
}: {
  operators: OperatorRow[]
  copy: DashboardCopy
}) {
  return (
    <StorePanel className="p-6 h-full flex flex-col border-[var(--store-line)]">
      <div className="mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--store-accent)]">
          {copy.crewPanelTitle}
        </p>
        <p className="text-xs store-text-body mt-1">{copy.crewPanelSubtitle}</p>
      </div>
      <ul className="space-y-3 flex-1">
        {operators.length === 0 ? (
          <li className="flex items-center justify-center h-24 rounded-xl border border-dashed border-[var(--store-line)] text-[11px] font-mono store-text-muted">
            No operators on duty
          </li>
        ) : (
          operators.map((op) => (
          <li key={op.id}>
            <Link
              href={op.href ?? '#'}
              className="group flex gap-3 rounded-xl border border-[var(--store-line)] bg-[var(--store-surface-2)] p-3 hover:border-[var(--store-accent-border)] transition-colors"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--store-accent-glow)] border border-[var(--store-accent-border)] text-[11px] font-bold text-[var(--store-accent)] font-mono">
                {op.initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-white truncate">{op.name}</p>
                  <div className="flex items-center gap-1.5 shrink-0" title={copy.crewCurrencyHint}>
                    <CurrencyDot status={op.flightCurrency} title={`Flight: ${op.flightCurrency}`} />
                    <CurrencyDot status={op.medicalCurrency} title={`Medical: ${op.medicalCurrency}`} />
                  </div>
                </div>
                <p className="text-[10px] font-mono store-text-muted mt-0.5">{op.role}</p>
                <p className="text-[10px] store-text-body mt-1.5 line-clamp-2 group-hover:text-white transition-colors">
                  {op.currentTask}
                </p>
              </div>
            </Link>
          </li>
          ))
        )}
      </ul>
      <Link
        href="/currency"
        className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-mono text-cyan hover:opacity-80"
      >
        <CheckCircle2 className="w-3 h-3" />
        Open currency queue
      </Link>
    </StorePanel>
  )
}
