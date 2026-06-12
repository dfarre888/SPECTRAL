import type { DataConfidence, NatoConfidence } from '@/lib/types'

export function toNatoConfidence(confidence: DataConfidence | null | undefined): NatoConfidence {
  switch (confidence) {
    case 'high':
      return 'Confirmed'
    case 'medium':
      return 'Assessed'
    case 'estimated':
      return 'Estimated'
    case 'classified':
      return 'Reported'
    default:
      return 'Estimated'
  }
}

export function effectivenessColour(pct: number | null): 'red' | 'amber' | 'green' | 'muted' {
  if (pct === null) return 'muted'
  if (pct <= 30) return 'red'
  if (pct <= 70) return 'amber'
  return 'green'
}
