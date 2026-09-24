import { describe, expect, it } from 'vitest'
import {
  DEMO_SCENARIO_IDS,
  demoWoprScenarios,
  demoWoprTicks,
  isPlaceholderScenarioName,
} from '@/lib/wopr/demo-scenarios'
import { applyDemoScenarios } from '@/lib/wopr/store'
import { TRAINING_WOPR_SCENARIOS } from '@/lib/wopr/training-scenarios'
import type { WoprScenario } from '@/lib/wopr/types'

describe('demo scenarios', () => {
  const demos = demoWoprScenarios('tenant-x')

  it('are the three named demo scenarios for the tenant', () => {
    expect(demos.map((d) => d.name).sort()).toEqual([
      'Al Minhad Air Base: One-way attack drone saturation',
      'RAAF Williamtown: Drone incursion response',
      'Talisman Sabre 27: Combat team drone strike vs counter-RAS',
    ])
    expect(demos.every((d) => d.tenant_id === 'tenant-x')).toBe(true)
    expect(new Set(demos.map((d) => d.id))).toEqual(new Set(Object.values(DEMO_SCENARIO_IDS)))
  })

  it('have running and draft statuses with elapsed time matching recorded history', () => {
    for (const d of demos) {
      const ticks = demoWoprTicks(d.id)
      expect(d.elapsed_min).toBe(ticks.length * 15)
      expect(d.status).toBe(ticks.length > 0 ? 'running' : 'draft')
      expect(d.world_state.battlespace.time.mission_elapsed_min).toBe(d.elapsed_min)
      expect(d.initial_world_state?.battlespace.time.mission_elapsed_min).toBe(0)
    }
    expect(demos.find((d) => d.id === DEMO_SCENARIO_IDS.williamtown)?.status).toBe('draft')
  })

  it('build the same history every time', () => {
    expect(demoWoprTicks(DEMO_SCENARIO_IDS.ts27)).toEqual(demoWoprTicks(DEMO_SCENARIO_IDS.ts27))
  })

  it('place forces near the named sites and carry source notes', () => {
    const near = (d: WoprScenario, lat: number, lon: number, km: number) => {
      const ps = [...d.world_state.blue_orbat.platforms, ...d.world_state.red_orbat.platforms]
      const blue = d.world_state.blue_orbat.platforms
      const c = { lat: blue.reduce((s, p) => s + p.lat, 0) / blue.length, lon: blue.reduce((s, p) => s + p.lon, 0) / blue.length }
      expect(Math.abs(c.lat - lat) * 111).toBeLessThan(km)
      expect(ps.length).toBeGreaterThan(3)
    }
    near(demos.find((d) => d.id === DEMO_SCENARIO_IDS.ts27)!, -22.7, 150.6, 20)
    near(demos.find((d) => d.id === DEMO_SCENARIO_IDS.williamtown)!, -32.7945, 151.84, 5)
    near(demos.find((d) => d.id === DEMO_SCENARIO_IDS.alMinhad)!, 25.0228, 55.3636, 5)
    for (const d of demos) expect(d.world_state.battlespace.notes).toMatch(/Fictional/)
  })

  it('never use em dashes in names or notes', () => {
    for (const d of demos) {
      expect(d.name).not.toMatch(/—/)
      expect(d.world_state.battlespace.notes ?? '').not.toMatch(/—/)
    }
  })
})

describe('placeholder names', () => {
  it('matches "test N" rows only', () => {
    expect(isPlaceholderScenarioName('test 1')).toBe(true)
    expect(isPlaceholderScenarioName('Test 2')).toBe(true)
    expect(isPlaceholderScenarioName('test')).toBe(true)
    expect(isPlaceholderScenarioName('Testing ground: range day')).toBe(false)
    expect(isPlaceholderScenarioName('Talisman Sabre 27')).toBe(false)
  })

  it('no training vignette is a placeholder, and the demos lead the list', () => {
    expect(TRAINING_WOPR_SCENARIOS.some((s) => isPlaceholderScenarioName(s.name))).toBe(false)
    expect(TRAINING_WOPR_SCENARIOS.slice(0, 3).map((s) => s.id).sort()).toEqual(
      Object.values(DEMO_SCENARIO_IDS).sort(),
    )
    for (const s of TRAINING_WOPR_SCENARIOS) expect(s.name).not.toMatch(/—/)
  })
})

describe('applyDemoScenarios', () => {
  const row = (id: string, name: string, elapsed: number): WoprScenario => ({
    ...demoWoprScenarios('t')[0],
    id,
    name,
    elapsed_min: elapsed,
  })

  it('hides placeholder rows and adds missing demos, sorted by elapsed time', () => {
    const out = applyDemoScenarios([row('a', 'test 1', 90), row('b', 'Real exercise', 5)], demoWoprScenarios('t'))
    expect(out.some((s) => s.name === 'test 1')).toBe(false)
    expect(out.map((s) => s.name)).toContain('Real exercise')
    expect(out).toHaveLength(4)
    expect(out.map((s) => s.elapsed_min)).toEqual([...out.map((s) => s.elapsed_min)].sort((a, b) => b - a))
  })

  it('lists branches after the scenarios they came from', () => {
    const [a] = demoWoprScenarios('t')
    const branch = { ...a, id: 'b1', name: `${a.name}: branch at T+30 min`, parent_scenario_id: a.id, elapsed_min: 500 }
    const out = applyDemoScenarios([branch], demoWoprScenarios('t'))
    expect(out[out.length - 1].id).toBe('b1')
  })

  it('keeps a stored copy of a demo scenario instead of the code definition', () => {
    const advanced = { ...demoWoprScenarios('t')[0], elapsed_min: 999 }
    const out = applyDemoScenarios([advanced], demoWoprScenarios('t'))
    expect(out.filter((s) => s.id === advanced.id)).toHaveLength(1)
    expect(out.find((s) => s.id === advanced.id)!.elapsed_min).toBe(999)
  })
})
