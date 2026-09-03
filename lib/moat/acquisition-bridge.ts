/**
 * MOAT → Acquire bridge (read-only).
 * Maps competency blind spots to Acquire gap suggestions.
 * Never imports accredited Pk / supplements — OSINT training path only.
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */

import type { AcquireSuggestedGap } from '@/lib/acquire/acquire-types'
import { ACQUIRE_TEMPLATES } from '@/lib/acquire/acquire-templates'
import type {
  BlindSpot,
  LongitudinalCompetencyRecord,
  SpectralCompetency,
} from '@/lib/moat/learnerModel.types'

/** Competency → preferred Acquire template id (OSINT training defaults). */
const COMPETENCY_TEMPLATE_HINTS: Partial<Record<SpectralCompetency, string>> = {
  threat_classification: 'shahed-darwin',
  magazine_management: 'shahed-darwin',
  sensor_employment: 'shahed-darwin',
  situational_awareness: 'shahed-darwin',
  resource_prioritisation: 'shahed-darwin',
  adaptation: 'shahed-darwin',
}

function severityRank(s: BlindSpot['severity']): number {
  switch (s) {
    case 'critical':
      return 4
    case 'high':
      return 3
    case 'moderate':
      return 2
    default:
      return 1
  }
}

function mapSeverity(s: BlindSpot['severity']): AcquireSuggestedGap['severity'] {
  if (s === 'critical') return 'critical'
  if (s === 'high') return 'high'
  return 'moderate'
}

function resolveTemplateId(competency: SpectralCompetency): string | undefined {
  const hint = COMPETENCY_TEMPLATE_HINTS[competency]
  if (hint && ACQUIRE_TEMPLATES.some((t) => t.id === hint)) return hint
  return ACQUIRE_TEMPLATES[0]?.id
}

/**
 * Pure projection: active blind spots → Acquire suggested gaps.
 * Read-only — does not mutate learner model. No Pk fields in output.
 */
export function suggestGapsFromCompetency(
  record: Pick<LongitudinalCompetencyRecord, 'player_id' | 'callsign' | 'blind_spots'>,
): AcquireSuggestedGap[] {
  const active = (record.blind_spots ?? []).filter((b) => b.status === 'active')
  active.sort((a, b) => severityRank(b.severity) - severityRank(a.severity))

  return active.map((spot) => {
    const templateId = resolveTemplateId(spot.competency)
    const params = new URLSearchParams({
      from: 'moat',
      competency: spot.competency,
      blind_spot: spot.id,
    })
    if (templateId) params.set('template', templateId)

    return {
      id: `moat-gap-${spot.id}`,
      competency: spot.competency,
      severity: mapSeverity(spot.severity),
      narrative: `${record.callsign}: ${spot.description}`,
      suggested_template_id: templateId,
      href: `/acquire?${params.toString()}`,
      source: 'moat_blind_spot',
    }
  })
}

/** Security contract helper — DTO must not carry Pk / accredited fields. */
export function assertNoPkLeak(gaps: AcquireSuggestedGap[]): boolean {
  for (const g of gaps) {
    const row = g as unknown as Record<string, unknown>
    if (row.pk != null || row.accredited_pk != null || row.kinetic_pct != null) return false
  }
  return true
}
