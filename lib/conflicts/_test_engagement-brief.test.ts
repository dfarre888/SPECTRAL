import { describe, expect, it } from 'vitest'
import type { AntiDroneSystem, DefeatEffectiveness, Platform } from '@/lib/types'
import { buildEngagementBrief } from './engagement-brief'

const shahed = { id: 'shahed-136', name: 'Shahed-136', category: 'owa_loitering', guidance_type: 'gnss_ins', gnss_independent: false, ai_autonomous: false, swarm_capable: true, max_speed_kmh: 185, terminal_speed_kmh: null, range_km: 2000, service_ceiling_m: 4000, radar_cross_section_m2: 0.3, warhead_kg: 40, unit_cost_usd: 35000, frequency_hopping: null, nav_backup: [], stealth_features: [], nato_reporting_name: null } as unknown as Platform
const gepard = { id: 'gepard', name: 'Flakpanzer Gepard', defeat_method: ['kinetic'], effective_range_m: 5500, conflict_validated: true, conflict_notes: null } as unknown as AntiDroneSystem
const dronegun = { id: 'dronegun', name: 'DroneShield DroneGun', defeat_method: ['rf'], effective_range_m: 2000, conflict_validated: false, conflict_notes: null } as unknown as AntiDroneSystem
const patriot = { id: 'patriot', name: 'MIM-104 Patriot', defeat_method: ['kinetic'], effective_range_m: 100000, conflict_validated: true, conflict_notes: null } as unknown as AntiDroneSystem
const eff = (system: AntiDroneSystem, rf: number | null, kin: number | null, immune = false): DefeatEffectiveness => ({
  id: `${system.id}-x`, platform_id: 'shahed-136', defeat_system_id: system.id, rf_jamming_pct: rf, kinetic_pct: kin, dew_pct: null,
  data_confidence: 'high' as never, is_immune: immune, immune_reason: immune ? 'no RF dependency' : null, adjudication_rationale: 'r', modifiers: [], recommended_response: 'engage at max range',
  weather_limited: false, swarm_engagement_pct: null, special_notes: null, defeat_system: system,
})

const incident = { id: 'i1', platforms_involved: ['shahed-136', 'patriot', 'unknown-thing'] } as never

describe('engagement brief', () => {
  it('matches attackers and named defenders, reports the unmatched', () => {
    const b = buildEngagementBrief({ incident, platforms: [shahed], systems: [gepard, dronegun, patriot], effectiveness: [eff(gepard, null, 78), eff(dronegun, 25, null)] })!
    expect(b.attackers.map((a) => a.platform.id)).toEqual(['shahed-136'])
    expect(b.defendersNamed.map((d) => d.id)).toEqual(['patriot'])
    expect(b.unmatched).toEqual(['unknown-thing'])
  })
  it('ranks defence options by adjudicated Pk and composes a kill chain with a band', () => {
    const b = buildEngagementBrief({ incident, platforms: [shahed], systems: [gepard, dronegun], effectiveness: [eff(dronegun, 25, null), eff(gepard, null, 78)] })!
    const o = b.options['shahed-136']
    expect(o[0].system.id).toBe('gepard')
    expect(o[0].method).toBe('kinetic')
    expect(o[0].pk).toBe(78)
    expect(o[0].chain.cumulativePk).toBeLessThan(0.78)
    expect(o[0].salvo3.cumulativePk).toBeGreaterThan(o[0].chain.cumulativePk)
    expect(o[0].chain.band.lo).toBeLessThan(o[0].chain.band.hi)
  })
  it('tells the attacker which defence classes are weak and what resilience it has', () => {
    const b = buildEngagementBrief({ incident, platforms: [shahed], systems: [gepard, dronegun], effectiveness: [eff(dronegun, 25, null), eff(gepard, null, 78)] })!
    const ex = b.exploit['shahed-136']
    expect(ex.some((x) => x.includes('RF jamming'))).toBe(true)
    expect(ex).toContain('Swarm capable')
    expect(b.attackers[0].facts.find((f) => f.label === 'Range')?.value).toBe('2000 km')
  })
  it('returns null with no platforms and an empty brief when nothing matches', () => {
    expect(buildEngagementBrief({ incident: { id: 'x', platforms_involved: [] } as never, platforms: [], systems: [], effectiveness: [] })).toBeNull()
    const b = buildEngagementBrief({ incident: { id: 'x', platforms_involved: ['zzz'] } as never, platforms: [shahed], systems: [], effectiveness: [] })!
    expect(b.unmatched).toEqual(['zzz'])
  })
})
