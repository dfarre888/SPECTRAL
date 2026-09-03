'use client'

import type { PacePlan } from '@/lib/bmi/bmi-types'
import { pacePlanner } from '@/lib/bmi/pacePlanner'
import { StorePanel } from '@/components/ui/store-surface'

interface PaceCardProps {
  plan: PacePlan | null
  fromLabel?: string
  toLabel?: string
}

const TIER_ORDER = ['primary', 'alternate', 'contingency', 'emergency'] as const

export function PaceCard({ plan, fromLabel, toLabel }: PaceCardProps) {
  if (!plan) {
    return (
      <StorePanel className="p-6 text-center store-text-muted text-sm ring-gradient glass">
        Select two platforms to build a PACE comms plan.
      </StorePanel>
    )
  }

  const activePlan: PacePlan = plan

  function handleExport() {
    const card = pacePlanner.toCommsCard(activePlan)
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`
      <!DOCTYPE html><html><head><title>Comms Card</title>
      <style>
        body { font-family: monospace; padding: 2rem; background: #fff; color: #111; }
        pre { white-space: pre-wrap; }
      </style></head><body>
      <pre>${card.replace(/</g, '&lt;')}</pre>
      </body></html>`)
    w.document.close()
    w.print()
  }

  return (
    <StorePanel className="p-4 space-y-4 ring-gradient glass">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow text-[10px]">PACE Comms Plan</p>
          <p className="text-sm font-mono text-[#F7F9FC] mt-1">
            {fromLabel ?? plan.from_id} → {toLabel ?? plan.to_id}
          </p>
          {plan.gateway_required ? (
            <p className="text-xs text-[var(--store-gold)] mt-1">
              Gateway required: {plan.gateway_required}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="store-btn-primary text-xs px-3 py-1.5 shrink-0 hover-lift"
        >
          Export card
        </button>
      </div>

      <div className="space-y-2">
        {TIER_ORDER.map((tier) => {
          const entry = plan.entries.find((e) => e.tier === tier)
          return (
            <div
              key={tier}
              className="store-panel-inner rounded-xl p-3 flex flex-col sm:flex-row sm:items-center gap-2 hover-lift"
            >
              <span className="text-[10px] uppercase tracking-widest text-[var(--store-accent)] w-24 shrink-0 font-semibold">
                {tier}
              </span>
              {entry ? (
                <>
                  <span className="text-sm font-mono text-[#F7F9FC] flex-1">{entry.bearer_label}</span>
                  <span className="text-xs font-mono store-text-muted">{entry.band}</span>
                  {entry.caveat ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-lg border border-[var(--store-gold-border)] bg-[var(--store-gold-glow)] text-[var(--store-gold)]">
                      {entry.caveat}
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="text-sm store-text-muted italic">Gap — no bearer for this tier</span>
              )}
            </div>
          )
        })}
      </div>

      {!plan.complete ? (
        <p className="text-xs text-[var(--store-gold)]">Plan incomplete — one or more PACE tiers cannot be filled.</p>
      ) : null}

      {plan.warnings.length > 0 ? (
        <div className="border-t border-[var(--store-line)] pt-3">
          <p className="text-[10px] uppercase tracking-widest store-text-muted mb-2">Warnings</p>
          <ul className="text-xs store-text-body space-y-1">
            {plan.warnings.map((w) => (
              <li key={w}>• {w}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </StorePanel>
  )
}
