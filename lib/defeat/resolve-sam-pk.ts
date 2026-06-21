// SPECTRAL — Unified SAM Pk resolver
// CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
//
// Single source of truth for effective kinetic Pk (as integer percent).
// SAM systems use the reference-geometry intercept model from sam-matrix-bridge.
// Non-SAM systems (RF jammers, DEW, net guns, etc.) pass through the DB value unchanged.
//
// All callers of resolveCellValue that display kinetic_pct MUST use this function
// to compute computedSamPk before passing it to resolveCellValue. This ensures
// the heatmap, CSV export, adjudication panel, defeat-check API, and PCM engine
// all show the same number for any SAM × platform pairing.

import { kineticPctFromSam } from '@/lib/defeat/sam-matrix-bridge'

/**
 * Returns the effective kinetic Pk (0–100 integer percent) for a given defeat system
 * against a specific platform.
 *
 * - For SAM systems (where a sam-intercept profile exists): runs the reference-geometry
 *   intercept model at per-category standard conditions (no ECM, salvo ×1).
 * - For all other systems: returns dbKineticPct unchanged.
 * - Returns null if both computed and DB values are unavailable.
 */
export function resolveSamKineticPct(
  systemId: string,
  platformId: string,
  dbKineticPct: number | null,
): number | null {
  const computed = kineticPctFromSam(systemId, platformId)
  if (computed != null) return computed
  return dbKineticPct
}
