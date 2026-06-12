export type ClassificationMarking =
  | 'UNCLASSIFIED'
  | 'OFFICIAL'
  | 'PROTECTED'
  | 'SECRET'
  | 'TOP_SECRET'

export const CLASSIFICATION_BANNER: Record<ClassificationMarking, string> = {
  UNCLASSIFIED: 'UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY',
  OFFICIAL: 'OFFICIAL // SPECTRAL OPERATIONS',
  PROTECTED: 'PROTECTED // SPECTRAL OPERATIONS',
  SECRET: 'SECRET // SPECTRAL OPERATIONS',
  TOP_SECRET: 'TOP SECRET // SPECTRAL OPERATIONS',
}

export function parseClassification(value: string | null | undefined): ClassificationMarking {
  const v = (value ?? 'UNCLASSIFIED').toUpperCase().replace(/\s+/g, '_')
  if (v in CLASSIFICATION_BANNER) return v as ClassificationMarking
  return 'UNCLASSIFIED'
}

export function bannerForClassification(mark: ClassificationMarking): string {
  return CLASSIFICATION_BANNER[mark]
}
