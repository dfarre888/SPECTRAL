'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { BattlespacePlanRow } from '@/lib/planner/battlespace-plan'

interface PlanLoadDialogProps {
  open: boolean
  onClose: () => void
  onSelect: (planId: string) => void
}

const PHASE_LABEL: Record<string, string> = {
  plan: 'Plan',
  rehearse: 'Rehearse',
  archived: 'Archived',
}

/** Map Intel load picker — lists GET /api/v1/plans (BattlespacePlanRow[]). Caller: MapIntelView only. */
export function PlanLoadDialog({ open, onClose, onSelect }: PlanLoadDialogProps) {
  const [plans, setPlans] = useState<BattlespacePlanRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError(null)
    fetch('/api/v1/plans')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Could not list plans'))))
      .then((j) => setPlans(j.data ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Load failed'))
      .finally(() => setLoading(false))
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="glass-popover w-full max-w-md overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-load-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--glass-line)] py-2.5 pl-4 pr-2">
          <span id="plan-load-title" className="text-[15px] font-semibold text-[var(--store-ink)]">
            Load plan
          </span>
          <button type="button" className="glass-icon-btn" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {loading && <p className="px-2 py-3 text-[13px] store-text-muted">Loading plans…</p>}
          {error && <p className="px-2 py-3 text-[13px] text-[var(--wb-red)]">{error}</p>}
          {!loading && !error && plans.length === 0 && (
            <p className="px-2 py-3 text-[13px] store-text-muted">No saved plans. Use Save first.</p>
          )}
          {plans.map((p) => (
            <button
              key={p.id}
              type="button"
              className="w-full rounded-[10px] px-3 py-2.5 text-left transition-colors hover:bg-[rgba(255,255,255,0.07)]"
              onClick={() => onSelect(p.id)}
            >
              <span className="block text-[13px] font-medium text-[var(--store-ink)]">{p.name}</span>
              <span className="mt-0.5 block text-xs store-text-muted">
                {PHASE_LABEL[p.phase] ?? p.phase}, updated{' '}
                <span className="font-mono">{new Date(p.updated_at).toLocaleDateString()}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
