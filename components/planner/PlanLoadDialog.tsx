'use client'

import { useEffect, useState } from 'react'
import type { BattlespacePlanRow } from '@/lib/planner/battlespace-plan'

interface PlanLoadDialogProps {
  open: boolean
  onClose: () => void
  onSelect: (planId: string) => void
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-zinc-700 bg-[#0A0A0F] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <span className="text-xs font-mono text-cyan uppercase tracking-wider">Load plan</span>
          <button type="button" className="text-zinc-500 hover:text-white text-sm" onClick={onClose}>✕</button>
        </div>
        <div className="max-h-72 overflow-y-auto p-2">
          {loading && <p className="text-[11px] font-mono text-zinc-500 px-2 py-3">Loading plans…</p>}
          {error && <p className="text-[11px] font-mono text-red px-2 py-3">{error}</p>}
          {!loading && !error && plans.length === 0 && (
            <p className="text-[11px] font-mono text-zinc-500 px-2 py-3">No saved plans — use Save first.</p>
          )}
          {plans.map((p) => (
            <button
              key={p.id}
              type="button"
              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-zinc-900 border border-transparent hover:border-zinc-700 transition-colors"
              onClick={() => onSelect(p.id)}
            >
              <span className="block text-sm text-white font-medium">{p.name}</span>
              <span className="block text-[10px] font-mono text-zinc-500 mt-0.5">
                {p.phase.toUpperCase()} · updated {new Date(p.updated_at).toLocaleDateString()}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
