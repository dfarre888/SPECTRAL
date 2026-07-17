import { CONFLICT_CASE_STUDIES } from '@/data/seed-conflicts';
import type { ConflictCaseStudy } from '@/lib/conflicts/types';

/** OSINT seed case studies — safe for client bundles (no Supabase). */
export function getConflictCaseStudies(): ConflictCaseStudy[] {
  return CONFLICT_CASE_STUDIES;
}

export function getConflictCaseStudy(id: string): ConflictCaseStudy | null {
  return CONFLICT_CASE_STUDIES.find((c) => c.id === id) ?? null;
}
