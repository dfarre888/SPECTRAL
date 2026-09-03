import { describe, expect, it } from 'vitest'
import { toCommsFits } from '@/data/seed-bmi-pitchblack2026'
import { interopSolver } from '@/lib/bmi/interopSolver'
import { pacePlanner } from '@/lib/bmi/pacePlanner'

describe('BMI interop solver + PACE planner', () => {
  const fits = toCommsFits()

  function fit(id: string) {
    const f = fits.find((x) => x.platform_id === id)
    if (!f) throw new Error(`missing fit ${id}`)
    return f
  }

  it('two Link 16 platforms communicate directly', () => {
    const link = interopSolver.canCommunicate(fit('IND-RAFALE'), fit('AUS-FA18F'), fits)
    expect(link.method).toBe('direct')
  })

  it('MADL-only + Link16-only bridged via E-7 when E-7 present', () => {
    const madlOnly = {
      ...fit('JPN-F35A'),
      bearers: fit('JPN-F35A').bearers.filter((b) => b.standard === 'madl'),
    }
    const link16Only = {
      ...fit('AUS-FA18F'),
      bearers: fit('AUS-FA18F').bearers.filter((b) => b.standard === 'link16'),
    }
    const link = interopSolver.canCommunicate(madlOnly, link16Only, fits)
    expect(link.method).toBe('via_gateway')
    expect(link.gateway_id).toBe('AUS-E7A')
  })

  it('voice_only when only shared UHF voice', () => {
    const t50 = fit('IDN-T50I')
    const png = fit('PNG-PLACEHOLDER')
    const link = interopSolver.canCommunicate(t50, png, fits)
    expect(link.method).toBe('voice_only')
  })

  it('comsec_caveat when shared datalink has comsec_note', () => {
    const link = interopSolver.canCommunicate(fit('IND-RAFALE'), fit('AUS-FA18F'), fits)
    expect(link.comsec_caveat).toBe(true)
  })

  it('pnt_caveat when shared bearer is Link 16', () => {
    const link = interopSolver.canCommunicate(fit('IND-RAFALE'), fit('AUS-FA18F'), fits)
    expect(link.pnt_caveat).toBe(true)
  })

  it('findGateways returns E-7 when MADL-only pair needs bridge', () => {
    const madlOnly = {
      ...fit('JPN-F35A'),
      bearers: fit('JPN-F35A').bearers.filter((b) => b.standard === 'madl'),
    }
    const extendedFits = fits.map((f) => (f.platform_id === 'JPN-F35A' ? madlOnly : f))
    const gateways = interopSolver.findGateways(extendedFits)
    expect(gateways.some((g) => g.gateway_id === 'AUS-E7A')).toBe(true)
  })

  it('buildPace: Link16 pair primary is Link 16 with PNT warning', () => {
    const plan = pacePlanner.buildPace(fit('IND-RAFALE'), fit('AUS-FA18F'), fits)
    expect(plan.entries[0]?.tier).toBe('primary')
    expect(plan.entries[0]?.bearer_label).toMatch(/Link 16/i)
    expect(plan.warnings.some((w) => /GNSS|PNT/i.test(w))).toBe(true)
  })

  it('buildPace: all-four-tier fillable pair is complete', () => {
    const plan = pacePlanner.buildPace(fit('IND-RAFALE'), fit('FRA-RAFALE'), fits)
    expect(plan.complete).toBe(true)
  })

  it('buildPace: voice-only pair may be incomplete', () => {
    const plan = pacePlanner.buildPace(fit('IDN-T50I'), fit('PNG-PLACEHOLDER'), fits)
    expect(plan.complete).toBe(false)
  })

  it('buildPackagePace returns package plan and exceptions', () => {
    const packageFits = [fit('JPN-F35A'), fit('AUS-FA18F'), fit('AUS-E7A')]
    const { plan, exceptions } = pacePlanner.buildPackagePace(packageFits)
    expect(plan.from_id).toBe('package')
    expect(Array.isArray(exceptions)).toBe(true)
  })

  it('toCommsCard contains PRIMARY, ALTERNATE, CONTINGENCY, EMERGENCY', () => {
    const plan = pacePlanner.buildPace(fit('IND-RAFALE'), fit('AUS-FA18F'), fits)
    const card = pacePlanner.toCommsCard(plan)
    expect(card).toContain('PRIMARY')
    expect(card).toContain('ALTERNATE')
    expect(card).toContain('CONTINGENCY')
    expect(card).toContain('EMERGENCY')
    expect(card).toContain('UNCLASSIFIED')
  })

  it('buildGraph flags isolated pairs where no bearer exists', () => {
    const graph = interopSolver.buildGraph(fits)
    expect(graph.links.length).toBeGreaterThan(0)
    expect(Array.isArray(graph.isolated_pairs)).toBe(true)
  })
})
