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
    <StorePanel className="p-5 h-full flex flex-col">
      <div className="mb-3">
        <p className="wb-pane-title !text-[15px]">{copy.crewPanelTitle}</p>
        <p className="text-[12.5px] store-text-muted mt-0.5">{copy.crewPanelSubtitle}</p>
      </div>
      <ul className="flex-1">
        {operators.length === 0 ? (
          <li className="flex items-center justify-center h-24 rounded-xl border border-dashed border-[var(--store-line)] text-[12px] store-text-muted">
            No operators on duty
          </li>
        ) : (
          operators.map((op) => (
          <li key={op.id}>
            <Link
              href={op.href ?? '#'}
              className="group flex gap-3 border-b fc-hair px-2 py-3 -mx-2 rounded-lg hover:bg-[rgba(255,255,255,0.04)] transition-colors"
            >
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--wb-blue)]" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-medium text-[var(--store-ink)] truncate" title={op.name}>{op.name}</p>
                  <div className="flex items-center gap-1.5 shrink-0" title={copy.crewCurrencyHint}>
                    <CurrencyDot status={op.flightCurrency} title={`Flight: ${op.flightCurrency}`} />
                    <CurrencyDot status={op.medicalCurrency} title={`Medical: ${op.medicalCurrency}`} />
                  </div>
                </div>
                <p className="text-[12px] store-text-muted mt-0.5">{op.role}</p>
                <p className="text-[12.5px] store-text-body mt-1 line-clamp-2 group-hover:text-[var(--store-ink)] transition-colors">
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
        className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-[var(--wb-blue)] hover:underline underline-offset-2"
      >
        <CheckCircle2 className="w-3 h-3" />
        Open currency queue
      </Link>
    </StorePanel>
  )
}
