import { describe, expect, it } from 'vitest'
import { gnssAnalyticsEngine } from '@/lib/gnss/analytics-engine'
import { SEED_GNSS_INCIDENTS } from '@/data/seed-gnss-incidents'
import { getGnssAnalytics, getGnssIncidents } from '@/lib/gnss/incidents'

describe('GNSS incident seed', () => {
  it('loads 8 evidence-graded incidents', () => {
    expect(getGnssIncidents()).toHaveLength(8)
    expect(SEED_GNSS_INCIDENTS).toHaveLength(8)
  })

  it('anchors Docklands as environmental — not GNSS denial', () => {
    const docklands = SEED_GNSS_INCIDENTS.find((i) => i.id === 'INC-2023-DOCKLANDS')
    expect(docklands).toBeDefined()
    expect(docklands!.failure_family_primary).toBe('environmental')
    expect(docklands!.failure_family_primary).not.toBe('gnss_denial')
    expect(docklands!.failure_mode.grade).toBe('confirmed')
  })
})

describe('GNSS analytics engine', () => {
  const analytics = gnssAnalyticsEngine.analyse(SEED_GNSS_INCIDENTS)

  it('matches accessor output', () => {
    expect(getGnssAnalytics().total_incidents).toBe(analytics.total_incidents)
  })

  it('splits GNSS denial vs non-RF primary families honestly', () => {
    const gnssPrimary = SEED_GNSS_INCIDENTS.filter(
      (i) => i.failure_family_primary === 'gnss_denial',
    ).length
    expect(gnssPrimary).toBe(4)
    expect(analytics.total_incidents - gnssPrimary).toBe(4)
  })

  it('has no confirmed affected-band counts in band analysis', () => {
    const anyConfirmedAffected = analytics.band_analysis.some((b) => b.confirmed_count > 0)
    expect(anyConfirmedAffected).toBe(false)
  })

  it('keeps evidenced_count separate from total_mentions when inferred dominates', () => {
    const gpsL1 = analytics.band_analysis.find((b) => b.band === 'GPS_L1')
    expect(gpsL1).toBeDefined()
    expect(gpsL1!.total_mentions).toBeGreaterThan(gpsL1!.evidenced_count)
    expect(gpsL1!.inferred_count).toBeGreaterThan(0)
  })

  it('records spectrum survey efficacy', () => {
    expect(analytics.spectrum_analysis.surveys_run).toBe(1)
    expect(analytics.spectrum_analysis.surveys_that_correctly_cleared).toBe(1)
  })

  it('surfaces key findings including band honesty', () => {
    expect(analytics.key_findings.length).toBeGreaterThan(0)
    expect(
      analytics.key_findings.some((f) => f.includes('No incident has a CONFIRMED affected band')),
    ).toBe(true)
  })

  it('confirmed cause pct reflects only confirmed failure_mode grades', () => {
    const confirmed = SEED_GNSS_INCIDENTS.filter((i) => i.failure_mode.grade === 'confirmed').length
    expect(analytics.confirmed_cause_pct).toBe(Math.round((confirmed / 8) * 100))
  })
})
