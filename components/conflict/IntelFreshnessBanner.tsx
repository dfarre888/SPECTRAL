'use client'

import { clsx } from 'clsx'
import { intelAge, type Freshness } from '@/lib/conflicts/intel-bundle'

interface IntelFreshnessBannerProps {
  /** ISO timestamp of the last imported bundle, or null if none. */
  lastImportAt: string | null
  producedBy?: string | null
  incidentCount?: number
}

const TONE: Record<Freshness, { bg: string; border: string; text: string; dot: string }> = {
  current: { bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.35)', text: '#86efac', dot: '#4ade80' },
  aging: { bg: 'rgba(250,204,21,0.08)', border: 'rgba(250,204,21,0.35)', text: '#fde047', dot: '#facc15' },
  stale: { bg: 'rgba(249,115,22,0.10)', border: 'rgba(249,115,22,0.40)', text: '#fdba74', dot: '#f97316' },
  expired: { bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.45)', text: '#fca5a5', dot: '#f87171' },
}

const ADVICE: Record<Freshness, string> = {
  current: 'Within the expected import cadence.',
  aging: 'Past the daily cadence — consider a fresh import before briefing from this.',
  stale: 'Well past cadence. Absence of recent incidents here reflects import gaps, not quiet.',
  expired: 'Do not brief from this without a fresh import. Gaps are import gaps, not intelligence.',
}

export function IntelFreshnessBanner({
  lastImportAt,
  producedBy,
  incidentCount,
}: IntelFreshnessBannerProps) {
  if (!lastImportAt) {
    return (
      <div
        className="rounded-xl border px-3 py-2.5 mb-4"
        style={{ background: TONE.expired.bg, borderColor: TONE.expired.border }}
      >
        <p className="text-xs font-semibold" style={{ color: TONE.expired.text }}>
          No intel bundle imported
        </p>
        <p className="text-[11px] store-text-body mt-0.5">
          This instance has no egress. Incidents arrive by operator import — until then this
          timeline shows only what shipped with the build.
        </p>
      </div>
    )
  }

  const age = intelAge(lastImportAt)
  const tone = TONE[age.freshness]

  return (
    <div
      className="rounded-xl border px-3 py-2.5 mb-4 flex flex-wrap items-center gap-x-4 gap-y-1"
      style={{ background: tone.bg, borderColor: tone.border }}
    >
      <span className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: tone.dot }} />
        <span className={clsx('text-xs font-semibold')} style={{ color: tone.text }}>
          {age.label}
        </span>
      </span>
      <span className="text-[11px] font-mono store-text-muted">
        imported {new Date(lastImportAt).toISOString().slice(0, 10)}
        {producedBy ? ` · from ${producedBy}` : ''}
        {incidentCount != null ? ` · ${incidentCount} incidents` : ''}
      </span>
      <span className="text-[11px] store-text-body flex-1 min-w-[240px]">{ADVICE[age.freshness]}</span>
    </div>
  )
}
