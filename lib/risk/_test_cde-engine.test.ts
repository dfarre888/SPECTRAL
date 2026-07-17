/**
 * SPECTRAL — CDE engine tests
 */
import { describe, it, expect } from 'vitest'
import { computeCde } from '@/lib/risk/cde-engine'
import { getWarhead } from '@/lib/risk/warhead-db'

const baseInput = {
  impact_lon: 30.5,
  impact_lat: 50.45,
  nearby_infrastructure: ['none'] as const,
}

describe('computeCde', () => {
  it('Shahed-136 urban business_day light → expected_casualties > 5, expected_injured > 20', () => {
    const blast = getWarhead('shahed-136-warhead')
    expect(blast).not.toBeNull()

    const result = computeCde({
      ...baseInput,
      blast: blast!,
      population_tier: 'urban',
      time_of_day: 'business_day',
      building_protection: 'light',
      nearby_infrastructure: ['none'],
    })

    expect(result.expected_casualties).toBeGreaterThan(5)
    expect(result.expected_injured).toBeGreaterThan(20)
    expect(result.exposure_fraction).toBe(0.85)
    expect(result.population_in_hazard_disk).toBeGreaterThan(0)
  })

  it('Shahed-136 remote early_hours → expected_casualties < 1', () => {
    const blast = getWarhead('shahed-136-warhead')
    expect(blast).not.toBeNull()

    const result = computeCde({
      ...baseInput,
      blast: blast!,
      population_tier: 'remote',
      time_of_day: 'early_hours',
      building_protection: 'light',
      nearby_infrastructure: ['none'],
    })

    expect(result.expected_casualties).toBeLessThan(1)
    expect(result.risk_category).toBe('GREEN')
  })

  it('dense_urban > urban casualties for same weapon and time', () => {
    const blast = getWarhead('shahed-136-warhead')
    expect(blast).not.toBeNull()

    const urban = computeCde({
      ...baseInput,
      blast: blast!,
      population_tier: 'urban',
      time_of_day: 'business_day',
      building_protection: 'light',
      nearby_infrastructure: ['none'],
    })

    const dense = computeCde({
      ...baseInput,
      blast: blast!,
      population_tier: 'dense_urban',
      time_of_day: 'business_day',
      building_protection: 'light',
      nearby_infrastructure: ['none'],
    })

    expect(dense.expected_casualties).toBeGreaterThan(urban.expected_casualties)
    expect(dense.expected_injured).toBeGreaterThan(urban.expected_injured)
    expect(dense.population_in_hazard_disk).toBeGreaterThan(urban.population_in_hazard_disk)
  })

  it('impact location changes effective population density and casualties', () => {
    const blast = getWarhead('shahed-136-warhead')
    expect(blast).not.toBeNull()

    const kyiv = computeCde({
      ...baseInput,
      impact_lon: 30.52,
      impact_lat: 50.45,
      blast: blast!,
      population_tier: 'urban',
      time_of_day: 'business_day',
      building_protection: 'light',
      nearby_infrastructure: ['none'],
    })

    const remote = computeCde({
      ...baseInput,
      impact_lon: 35.8,
      impact_lat: 48.2,
      blast: blast!,
      population_tier: 'urban',
      time_of_day: 'business_day',
      building_protection: 'light',
      nearby_infrastructure: ['none'],
    })

    expect(kyiv.pop_density_pkm2).not.toBe(remote.pop_density_pkm2)
    expect(kyiv.expected_casualties).not.toBe(remote.expected_casualties)
    expect(kyiv.proportionality_summary).toContain('Impact')
  })
})
