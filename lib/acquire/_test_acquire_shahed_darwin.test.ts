/**
 * AC: "Close Shahed gap at Darwin" — capability acquisition acceptance tests
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */

import { describe, expect, it } from 'vitest'
import {
  DEMO_SHAhed_DEFEAT_COVERAGE,
  DEMO_SHAhed_ECONOMICS,
  demoDarwinOrbat,
} from '@/lib/acquire/acquire-demo-data'
import { buildAcquireSessionFromData } from '@/lib/acquire/acquire-session'
import { getAcquireTemplate } from '@/lib/acquire/acquire-templates'
import { computeExchangeRatio } from '@/lib/planner/engagement-economics'

const VALID_CONFIDENCE = ['Confirmed', 'Assessed', 'Estimated', 'Reported', 'Suspected'] as const

describe('Close Shahed gap at Darwin', () => {
  const template = getAcquireTemplate('shahed-darwin')
  const session = buildAcquireSessionFromData(template, {
    defeatCoverage: DEMO_SHAhed_DEFEAT_COVERAGE,
    darwinOrbat: demoDarwinOrbat(),
    economicsRows: DEMO_SHAhed_ECONOMICS,
    threatName: 'Shahed-136',
  })

  it('AC: template title matches acquisition scenario', () => {
    expect(template.title).toBe('Close Shahed gap at Darwin')
    expect(template.threat_platform_id).toBe('shahed-136')
    expect(template.location).toBe('Darwin')
  })

  it('AC: produces exactly 3 ranked options', () => {
    expect(session.options).toHaveLength(3)
    expect(session.options.map((o) => o.rank)).toEqual([1, 2, 3])
  })

  it('AC: each option has $/effect from computeExchangeRatio', () => {
    for (const option of session.options) {
      const expected =
        option.exchange.effectorCostUsd / Math.max(option.pk, 0.01)
      expect(option.cost_per_expected_kill_usd).toBeCloseTo(expected, 0)
      const recomputed = computeExchangeRatio(
        option.exchange.threatCostUsd,
        option.exchange.effectorCostUsd,
        option.pk,
      )
      expect(option.exchange.exchangeRatio).toBeCloseTo(recomputed.exchangeRatio, 4)
    }
  })

  it('AC: each option includes OSINT source_ref citation', () => {
    for (const option of session.options) {
      expect(option.source_ref.length).toBeGreaterThan(10)
      expect(option.source_ref).toMatch(/OSINT/i)
    }
  })

  it('AC: each option has confidence badge field', () => {
    for (const option of session.options) {
      expect(VALID_CONFIDENCE).toContain(option.cost_confidence)
    }
  })

  it('AC: options sorted by ascending cost per expected kill', () => {
    const costs = session.options.map((o) => o.cost_per_expected_kill_usd)
    expect(costs[0]).toBeLessThan(costs[1])
    expect(costs[1]).toBeLessThan(costs[2])
  })

  it('AC: gap analysis references Darwin base and C-UAS coverage', () => {
    expect(session.gap.base_id).toBe('BASE-DARWIN')
    expect(session.gap.location).toBe('Darwin')
    expect(session.gap.threat_platform_id).toBe('shahed-136')
    expect(session.gap.coverage_gaps.length).toBeGreaterThan(0)
    expect(session.gap.orbat_platform_count).toBeGreaterThan(0)
  })

  it('AC: brief markdown includes classification and OSINT sources', () => {
    expect(session.brief.markdown).toContain('UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY')
    expect(session.brief.structured.osint_sources.length).toBeGreaterThan(0)
    expect(session.brief.markdown).toContain('Shahed-136')
  })

  it('AC: calc wires economics panel rows for top 3 options', () => {
    expect(session.calc.panel_rows).toHaveLength(3)
    expect(session.calc.recommended_option_id).toBe(session.options[0].defeat_system_id)
    expect(session.calc.economics_rows.length).toBeGreaterThanOrEqual(3)
  })

  it('AC: rank-1 option is Gepard SPAAG (best OSINT exchange)', () => {
    expect(session.options[0].defeat_system_id).toBe('gepard-spaag')
    expect(session.options[0].cost_per_expected_kill_usd).toBeCloseTo(40_000 / 0.82, 0)
  })
})
