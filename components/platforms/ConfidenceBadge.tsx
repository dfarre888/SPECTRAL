import { Badge } from '@/components/ui/badge'
import { toNatoConfidence } from '@/lib/platforms/confidence'
import type { DataConfidence, NatoConfidence } from '@/lib/types'

const VARIANT_MAP: Record<NatoConfidence, 'confirmed' | 'assessed' | 'estimated' | 'reported'> = {
  Confirmed: 'confirmed',
  Assessed: 'assessed',
  Estimated: 'estimated',
  Reported: 'reported',
}

interface ConfidenceBadgeProps {
  confidence: DataConfidence | null | undefined
  className?: string
}

export function ConfidenceBadge({ confidence, className }: ConfidenceBadgeProps) {
  const nato = toNatoConfidence(confidence)
  return (
    <Badge variant={VARIANT_MAP[nato]} className={className}>
      {nato}
    </Badge>
  )
}
