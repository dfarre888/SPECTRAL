import { toNatoConfidence } from '@/lib/platforms/confidence'
import type { DataConfidence, NatoConfidence } from '@/lib/types'
import { cn } from '@/lib/utils'

/** Obsidian `.tag` tone per NATO confidence word: text plus hairline, never a slab. */
const TONE: Record<NatoConfidence, string> = {
  Confirmed: 'green',
  Assessed: 'amber',
  Estimated: '',
  Reported: 'violet',
}

interface ConfidenceBadgeProps {
  confidence: DataConfidence | null | undefined
  className?: string
}

export function ConfidenceBadge({ confidence, className }: ConfidenceBadgeProps) {
  const nato = toNatoConfidence(confidence)
  return (
    <span className={cn('tag', TONE[nato], className)} title={`Source confidence: ${nato}`}>
      {nato}
    </span>
  )
}
