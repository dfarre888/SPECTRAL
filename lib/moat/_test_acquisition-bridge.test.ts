/**
 * MOAT → Acquire bridge tests
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */
import { describe, expect, it } from 'vitest'
import {
  assertNoPkLeak,
  suggestGapsFromCompetency,
} from '@/lib/moat/acquisition-bridge'
import type { LongitudinalCompetencyRecord } from '@/lib/moat/learnerModel.types'

function record(
  spots: LongitudinalCompetencyRecord['blind_spots'],
): Pick<LongitudinalCompetencyRecord, 'player_id' | 'callsign' | 'blind_spots'> {
  return { player_id: 'p1', callsign: 'HAWK-2', blind_spots: spots }
}

describe('acquisition-bridge', () => {
  it('maps active blind spots to Acquire suggestions', () => {
    const gaps = suggestGapsFromCompetency(
      record([
        {
          id: 'bs1',
          competency: 'magazine_management',
          description: 'Burns magazine on cheap OWA',
          first_observed_exercise_id: 'ex1',
          first_observed_at: '2026-01-01T00:00:00.000Z',
          recurrence_count: 2,
          sessions_observed: ['ex1'],
          severity: 'high',
          curriculum_module_assigned: null,
          status: 'active',
          resolution_evidence: null,
          trigger_conditions: ['saturation'],
        },
      ]),
    )
    expect(gaps).toHaveLength(1)
    expect(gaps[0]!.href).toContain('/acquire?')
    expect(gaps[0]!.href).toContain('from=moat')
    expect(gaps[0]!.suggested_template_id).toBe('shahed-darwin')
    expect(gaps[0]!.source).toBe('moat_blind_spot')
  })

  it('ignores resolved blind spots', () => {
    const gaps = suggestGapsFromCompetency(
      record([
        {
          id: 'bs2',
          competency: 'emcon_discipline',
          description: 'Radiates under EMCON',
          first_observed_exercise_id: 'ex1',
          first_observed_at: '2026-01-01T00:00:00.000Z',
          recurrence_count: 1,
          sessions_observed: ['ex1'],
          severity: 'moderate',
          curriculum_module_assigned: null,
          status: 'resolved',
          resolution_evidence: 'fixed',
          trigger_conditions: [],
        },
      ]),
    )
    expect(gaps).toHaveLength(0)
  })

  it('DTO carries no Pk / accredited fields', () => {
    const gaps = suggestGapsFromCompetency(
      record([
        {
          id: 'bs3',
          competency: 'threat_classification',
          description: 'Misclassifies OWA',
          first_observed_exercise_id: 'ex1',
          first_observed_at: '2026-01-01T00:00:00.000Z',
          recurrence_count: 1,
          sessions_observed: ['ex1'],
          severity: 'critical',
          curriculum_module_assigned: null,
          status: 'active',
          resolution_evidence: null,
          trigger_conditions: [],
        },
      ]),
    )
    expect(assertNoPkLeak(gaps)).toBe(true)
    expect(JSON.stringify(gaps)).not.toMatch(/accredited/i)
    expect(JSON.stringify(gaps)).not.toMatch(/"pk":/)
  })
})
