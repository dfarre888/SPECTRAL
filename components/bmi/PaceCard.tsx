'use client'

import type { PacePlan } from '@/lib/bmi/bmi-types'
import { pacePlanner } from '@/lib/bmi/pacePlanner'

interface PaceCardProps {
  plan: PacePlan | null
  fromLabel?: string
  toLabel?: string
}

const TIER_ORDER = ['primary', 'alternate', 'contingency', 'emergency'] as const

const TIER_LABEL: Record<(typeof TIER_ORDER)[number], string> = {
  primary: 'Primary',
  alternate: 'Alternate',
  contingency: 'Contingency',
  emergency: 'Emergency',
}

export function PaceCard({ plan, fromLabel, toLabel }: PaceCardProps) {
  if (!plan) {
    return (
      <div className="store-panel rounded-2xl p-10 text-center">
        <p className="text-[14px] store-text-body m-0">Select two platforms to build a PACE comms plan.</p>
        <p className="text-[12px] store-text-muted mt-1.5 mb-0">
          Primary, alternate, contingency and emergency bearers, with any gateway and caveat each one needs.
        </p>
      </div>
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
    <section className="store-panel rounded-2xl p-6 space-y-5" aria-label="PACE comms plan">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[12px] store-text-muted m-0">PACE comms plan</p>
          <h3 className="text-[18px] store-display font-semibold tracking-[-0.01em] text-[var(--store-ink)] mt-1 mb-0">
            {fromLabel ?? plan.from_id} <span className="store-text-muted font-normal" aria-label="to">→</span> {toLabel ?? plan.to_id}
          </h3>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {plan.complete ? <span className="tag green">All four tiers filled</span> : <span className="tag amber">Incomplete</span>}
            {plan.gateway_required ? <span className="tag amber">Gateway required: {plan.gateway_required}</span> : null}
          </div>
        </div>
        <button type="button" onClick={handleExport} className="btn-glass primary shrink-0">
          Export card
        </button>
      </div>

      <div className="rounded-xl border border-[var(--lacquer-line)] overflow-x-auto">
        <table className="dt min-w-[560px]">
          <colgroup>
            <col style={{ width: 150 }} />
            <col />
            <col style={{ width: 110 }} />
            <col style={{ width: '28%' }} />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">Tier</th>
              <th scope="col">Bearer</th>
              <th scope="col">Band</th>
              <th scope="col">Caveat</th>
            </tr>
          </thead>
          <tbody>
            {TIER_ORDER.map((tier) => {
              const entry = plan.entries.find((e) => e.tier === tier)
              return (
                <tr key={tier}>
                  <td>
                    <span className="inline-flex items-center gap-2.5">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[rgba(255,255,255,0.2)] font-mono text-[12px] text-[var(--store-ink)]">
                        {tier.charAt(0).toUpperCase()}
                      </span>
                      <span className="text-[13px] text-[var(--store-ink)] font-medium">{TIER_LABEL[tier]}</span>
                    </span>
                  </td>
                  {entry ? (
                    <>
                      <td>
                        <span className="block font-mono text-[13px] text-[var(--store-ink)]">{entry.bearer_label}</span>
                        {entry.rationale ? <span className="meta">{entry.rationale}</span> : null}
                      </td>
                      <td className="mono store-text-body">{entry.band}</td>
                      <td>{entry.caveat ? <span className="tag amber whitespace-normal h-auto py-0.5">{entry.caveat}</span> : <span className="store-text-muted text-[12px]">None</span>}</td>
                    </>
                  ) : (
                    <td colSpan={3}>
                      <span className="text-[13px] text-[#FF8A98]">Gap: no bearer for this tier</span>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {!plan.complete ? (
        <p className="text-[13px] text-[#FCD34D] m-0">Plan incomplete: one or more PACE tiers cannot be filled.</p>
      ) : null}

      {plan.warnings.length > 0 ? (
        <div className="pt-4 border-t fc-hair">
          <p className="text-[12px] store-text-muted mb-2 mt-0">Warnings</p>
          <ul className="m-0 pl-4 list-disc marker:text-[var(--store-ink-mute)] space-y-1">
            {plan.warnings.map((w) => (
              <li key={w} className="text-[13px] store-text-body">{w}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
