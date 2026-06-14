import type { EvidenceGrade } from '@/lib/gnss/types'

export const EVIDENCE_GRADE_LABEL: Record<EvidenceGrade, string> = {
  confirmed: 'Confirmed',
  reported: 'Reported',
  inferred: 'Estimated',
  unknown: 'Undetermined',
}

export type EvidenceBadgeVariant = 'confirmed' | 'reported' | 'estimated' | 'assessed'

export function evidenceGradeVariant(grade: EvidenceGrade): EvidenceBadgeVariant {
  switch (grade) {
    case 'confirmed':
      return 'confirmed'
    case 'reported':
      return 'reported'
    case 'inferred':
      return 'estimated'
    default:
      return 'assessed'
  }
}

export function formatFailureFamily(family: string): string {
  return family.replace(/_/g, ' ')
}
