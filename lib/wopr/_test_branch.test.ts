import { describe, expect, it } from 'vitest'
import { BranchError, branchName, planBranch } from '@/lib/wopr/branch'
import { demoWoprScenarios, demoWoprTicks, DEMO_SCENARIO_IDS } from '@/lib/wopr/demo-scenarios'
import { advanceScenario } from '@/lib/wopr/engine'
import { mulberry32 } from '@/lib/wopr/fires-loop'

const ts27 = () => demoWoprScenarios('tenant-a').find((s) => s.id === DEMO_SCENARIO_IDS.ts27)!

describe('branchName', () => {
  it('follows "<original>: branch at T+NN min"', () => {
    expect(branchName('Exercise A', 30)).toBe('Exercise A: branch at T+30 min')
  })
})

describe('planBranch', () => {
  it('forks at a recorded turn with history up to and including it', () => {
    const scenario = ts27()
    const history = demoWoprTicks(scenario.id)
    expect(history.length).toBeGreaterThanOrEqual(3)
    const plan = planBranch(scenario, history, 2)
    expect(plan.name).toBe(`${scenario.name}: branch at T+30 min`)
    expect(plan.branch_turn).toBe(2)
    expect(plan.elapsed_min).toBe(30)
    expect(plan.status).toBe('running')
    expect(plan.ticks.map((t) => t.turn)).toEqual([1, 2])
    expect(plan.world_state).toEqual(history[1].world_state)
    expect(plan.world_state.battlespace.time.mission_elapsed_min).toBe(30)
    expect(plan.parent_scenario_id).toBe(scenario.id)
    expect(plan.approximate).toBe(false)
  })

  it('the branch advances from the fork, not from where the original got to', () => {
    const scenario = ts27()
    const plan = planBranch(scenario, demoWoprTicks(scenario.id), 1)
    const next = advanceScenario(
      { ...scenario, id: 'branch', world_state: plan.world_state, elapsed_min: plan.elapsed_min },
      { random: mulberry32(1) },
    )
    expect(next.tick.turn).toBe(2)
    expect(next.tick.elapsed_min).toBe(30)
  })

  it('does not share objects with the source history', () => {
    const scenario = ts27()
    const history = demoWoprTicks(scenario.id)
    const plan = planBranch(scenario, history, 1)
    plan.ticks[0].tick.events.push('mutated')
    plan.world_state.blue_orbat.platforms[0].name = 'changed'
    expect(history[0].tick.events).not.toContain('mutated')
    expect(history[0].world_state!.blue_orbat.platforms[0].name).not.toBe('changed')
  })

  it('turn 0 forks the initial laydown as a draft', () => {
    const scenario = ts27()
    const plan = planBranch(scenario, demoWoprTicks(scenario.id), 0)
    expect(plan.status).toBe('draft')
    expect(plan.ticks).toEqual([])
    expect(plan.world_state).toEqual({
      ...scenario.initial_world_state,
      battlespace: { ...scenario.initial_world_state!.battlespace, time: { ...scenario.initial_world_state!.battlespace.time, mission_elapsed_min: 0 } },
    })
  })

  it('reconstructs approximately when a turn has no world snapshot', () => {
    const scenario = ts27()
    const history = demoWoprTicks(scenario.id).map((t) => ({ ...t, world_state: null }))
    const plan = planBranch(scenario, history, 2)
    expect(plan.approximate).toBe(true)
    expect(plan.world_state.battlespace.time.mission_elapsed_min).toBe(30)
    expect(plan.world_state.held_tracks?.blue).toEqual(history[1].tick.blue_picture.map((t) => t.id))
  })

  it('rejects turns that are not in the history', () => {
    const scenario = ts27()
    expect(() => planBranch(scenario, demoWoprTicks(scenario.id), 99)).toThrow(BranchError)
    expect(() => planBranch(scenario, [], -1)).toThrow(BranchError)
    expect(() => planBranch(scenario, [], 1.5)).toThrow(BranchError)
  })
})
