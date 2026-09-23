import { toNatoConfidence } from '@/lib/platforms/confidence'
import type { DataConfidence } from '@/lib/types'
import type { NatoConfidence as ForceNatoConfidence } from '@/lib/force/types'
import { cn } from '@/lib/utils'

/**
 * NATO confidence as a `.tag`: text plus hairline, never a filled slab.
 * Confirmed reads green, Assessed amber, Reported and Suspected violet,
 * Estimated neutral.
 */
const HUE: Record<ForceNatoConfidence, string> = {
  Confirmed: 'green',
  Assessed: 'amber',
  Reported: 'violet',
  Suspected: 'violet',
  Estimated: '',
}

export function ConfidenceTag({
  nato,
  confidence,
  className,
}: {
  /** Already-mapped NATO confidence (Force / ORBAT rows). */
  nato?: ForceNatoConfidence
  /** Raw catalogue confidence (Force Catalogue rows). */
  confidence?: DataConfidence | null
  className?: string
}) {
  const value: ForceNatoConfidence = nato ?? toNatoConfidence(confidence)
  return <span className={cn('tag', HUE[value], className)}>{value}</span>
}
