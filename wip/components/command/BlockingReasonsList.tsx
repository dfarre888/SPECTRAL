'use client'

import type { GoNoGoAssessment } from '@/lib/command/go-no-go-types'
import { StorePanel } from '@/components/ui/store-surface'

interface BlockingReasonsListProps {
  assessment: GoNoGoAssessment
}

export function BlockingReasonsList({ assessment }: BlockingReasonsListProps) {
  if (assessment.blocking.length === 0 && assessment.caution.length === 0) {
    return (
      <StorePanel className="p-4">
        <p className="text-sm store-text-body">No blocking or caution items — all tiles within launch criteria.</p>
      </StorePanel>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {assessment.blocking.length > 0 ? (
        <StorePanel className="p-4 border-red/30">
          <p className="text-[10px] font-mono uppercase tracking-widest text-red mb-2">Blocking</p>
          <ul className="space-y-2">
            {assessment.blocking.map((item) => (
              <li key={item} className="text-sm text-red font-mono">
                {item}
              </li>
            ))}
          </ul>
        </StorePanel>
      ) : null}
      {assessment.caution.length > 0 ? (
        <StorePanel className="p-4 border-amber/30">
          <p className="text-[10px] font-mono uppercase tracking-widest text-amber mb-2">Caution</p>
          <ul className="space-y-2">
            {assessment.caution.map((item) => (
              <li key={item} className="text-sm text-amber font-mono">
                {item}
              </li>
            ))}
          </ul>
        </StorePanel>
      ) : null}
    </div>
  )
}
