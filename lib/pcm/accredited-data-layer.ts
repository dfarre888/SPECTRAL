/**
 * PCM Accredited Data Layer — pre-fetched Pk/Pd cache for in-turn adjudication.
 * ITAR boundary: this layer is PCM-scoped only. Never expose to learner model or client.
 */

import type { AccreditedDefeatPkRow } from '@/lib/operations/accredited-supplements-data';
import { fetchAllAccreditedDefeatPk } from '@/lib/operations/accredited-supplements';

export type AccreditedDataLayer = Map<string, AccreditedDefeatPkRow>;

/**
 * Pre-fetch all relevant Pk rows for the upcoming turn.
 * Call once per turn before buildAdjudicationContext, not per-pair.
 */
export async function buildAccreditedDataLayer(
  threatIds: string[],
  defeatSystemIds: string[],
): Promise<AccreditedDataLayer> {
  if (!threatIds.length || !defeatSystemIds.length) return new Map();
  return fetchAllAccreditedDefeatPk(threatIds, defeatSystemIds);
}

/**
 * Pick the mode-appropriate Pk from an accredited row.
 * defender group drives which column is used:
 *   c_uas_defeat_ew  → pk_rf_jamming_pct
 *   c_uas_defeat_dew → pk_dew_pct
 *   anything else    → pk_kinetic_pct
 */
export function selectAccreditedPk(
  row: AccreditedDefeatPkRow,
  defenderGroup: string,
): number | null {
  if (defenderGroup === 'c_uas_defeat_ew') return row.pk_rf_jamming_pct ?? null;
  if (defenderGroup === 'c_uas_defeat_dew') return row.pk_dew_pct ?? null;
  return row.pk_kinetic_pct ?? null;
}
