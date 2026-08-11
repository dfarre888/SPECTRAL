'use client'

import type { NccdAdjustmentLevel, NccdCategory } from '@/lib/iep/types'
import { NCCD_ADJUSTMENT_LABELS } from '@/lib/iep/types'

interface NccdLevelSelectorProps {
  level: NccdAdjustmentLevel | null
  category: NccdCategory | null
  rationale: string | null
  onLevelChange: (v: NccdAdjustmentLevel) => void
  onCategoryChange: (v: NccdCategory) => void
  onRationaleChange: (v: string) => void
}

const LEVELS: NccdAdjustmentLevel[] = ['qdtp', 'supplementary', 'substantial', 'extensive']
const CATEGORIES: NccdCategory[] = ['sensory', 'physical', 'cognitive', 'social_emotional']

export function NccdLevelSelector({
  level,
  category,
  rationale,
  onLevelChange,
  onCategoryChange,
  onRationaleChange,
}: NccdLevelSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-xs store-text-muted">NCCD adjustment level (human confirm)</label>
      <select
        className="w-full px-3 py-2 rounded-lg bg-[var(--store-surface-2)] border border-[var(--store-line)] text-sm text-white"
        value={level ?? ''}
        onChange={(e) => onLevelChange(e.target.value as NccdAdjustmentLevel)}
      >
        <option value="">Select level…</option>
        {LEVELS.map((l) => (
          <option key={l} value={l}>
            {NCCD_ADJUSTMENT_LABELS[l]}
          </option>
        ))}
      </select>
      <label className="block text-xs store-text-muted">Imputed disability category</label>
      <select
        className="w-full px-3 py-2 rounded-lg bg-[var(--store-surface-2)] border border-[var(--store-line)] text-sm text-white"
        value={category ?? ''}
        onChange={(e) => onCategoryChange(e.target.value as NccdCategory)}
      >
        <option value="">Select category…</option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c.replace('_', ' ')}
          </option>
        ))}
      </select>
      <label className="block text-xs store-text-muted">AI rationale (editable)</label>
      <textarea
        className="w-full px-3 py-2 rounded-lg bg-[var(--store-surface-2)] border border-[var(--store-line)] text-sm text-white min-h-[80px]"
        value={rationale ?? ''}
        onChange={(e) => onRationaleChange(e.target.value)}
      />
    </div>
  )
}
