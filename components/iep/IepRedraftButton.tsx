'use client'

import { isSonnetEnabledClient } from '@/lib/iep/model-config'

interface IepRedraftButtonProps {
  iepId: string
  onComplete: () => void
  disabled?: boolean
}

export function IepRedraftButton({ iepId, onComplete, disabled }: IepRedraftButtonProps) {
  const sonnetEnabled = isSonnetEnabledClient()

  if (!sonnetEnabled) {
    return (
      <button
        type="button"
        disabled
        title="Enhanced re-draft requires Claude Sonnet — contact your administrator"
        className="px-3 py-2 rounded-xl border border-[var(--store-line)] text-xs store-text-muted opacity-50 cursor-not-allowed"
      >
        Re-draft with more detail
      </button>
    )
  }

  async function handleRedraft() {
    if (!confirm('Re-draft will replace AI-generated sections. Continue?')) return
    const res = await fetch(`/api/app/iep/${iepId}/redraft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelOverride: 'sonnet' }),
    })
    if (res.ok) onComplete()
    else {
      const j = await res.json()
      alert(j.error ?? 'Redraft failed')
    }
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleRedraft}
      className="px-3 py-2 rounded-xl border border-cyan/40 text-xs text-cyan hover:bg-cyan/10 disabled:opacity-50"
    >
      Re-draft with more detail
    </button>
  )
}
