import { describe, it, expect } from 'vitest'
import { haversineM, computeEngagement } from '@/lib/overlay/engagement-calc'

describe('haversineM', () => {
  it('returns ~0 for identical coordinates', () => {
    expect(haversineM(30, 50, 30, 50)).toBeLessThan(1)
  })

  it('returns plausible distance for 1 degree latitude', () => {
    const d = haversineM(0, 0, 0, 1)
    expect(d).toBeGreaterThan(110_000)
    expect(d).toBeLessThan(112_000)
  })
})

describe('computeEngagement', () => {
  it('computes in-envelope intercept for SA-15 vs OWA at reference geometry', () => {
    const result = computeEngagement({
      system_id: 'sa-15-gauntlet',
      platform_id: 'shahed-136',
      target_cat: 'owa',
      uas_lon: 36.25,
      uas_lat: 49.95,
      uas_alt_m: 500,
      sam_lon: 36.2,
      sam_lat: 49.9,
      sam_alt_m: 100,
      ecm_level: 'none',
      salvo_count: 1,
    })

    expect(result.slant_range_m).toBeGreaterThan(1000)
    expect(result.intercept).not.toBeNull()
    expect(result.intercept!.in_envelope).toBe(true)
    expect(result.intercept!.pk_single).toBeGreaterThan(0.5)
    expect(result.phase).not.toBe('outside_detect')
  })
})
