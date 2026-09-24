/**
 * Branch a WOPR scenario at a past turn.
 *
 * DSTG's Innovation and Asymmetry Wargame tool recorded the game and let
 * players step between turns; branching goes one further and forks the game
 * at a turn so a different course of action can be played from the same
 * position. The fork keeps the history up to that turn, so the new branch's
 * replay and after action review start from the shared past.
 *
 * Pure data, no I/O: the store persists what this returns.
 */

import type { ScenarioStatus, TickRecord, WorldState, WoprScenario } from '@/lib/wopr/types'

export class BranchError extends Error {}

export interface BranchPlan {
  name: string
  parent_scenario_id: string
  branch_turn: number
  elapsed_min: number
  status: ScenarioStatus
  world_state: WorldState
  initial_world_state: WorldState | null
  /** History to copy into the branch: every turn up to and including `branch_turn`. */
  ticks: TickRecord[]
  /** True when the turn had no stored world snapshot and positions were taken from the current state. */
  approximate: boolean
}

export function branchName(originalName: string, elapsedMin: number): string {
  return `${originalName}: branch at T+${Math.round(elapsedMin)} min`
}

/** Best-effort world at a turn when no snapshot was stored (ticks recorded before snapshots). */
export function reconstructWorldAt(current: WorldState, record: TickRecord): WorldState {
  const world = structuredClone(current) as WorldState
  world.battlespace.time.mission_elapsed_min = record.elapsed_min
  world.propagation_cache = record.tick.propagation_cache ?? {}
  world.held_tracks = {
    blue: record.tick.blue_picture.map((t) => t.id),
    red: record.tick.red_picture.map((t) => t.id),
  }
  return world
}

export function planBranch(
  scenario: WoprScenario,
  history: readonly TickRecord[],
  atTurn: number,
): BranchPlan {
  if (!Number.isInteger(atTurn) || atTurn < 0) {
    throw new BranchError('Branch turn must be a whole number of turns, zero or more')
  }

  const initial = scenario.initial_world_state ?? null

  if (atTurn === 0) {
    const world = structuredClone(initial ?? scenario.world_state) as WorldState
    world.battlespace.time.mission_elapsed_min = 0
    return {
      name: branchName(scenario.name, 0),
      parent_scenario_id: scenario.id,
      branch_turn: 0,
      elapsed_min: 0,
      status: 'draft',
      world_state: world,
      initial_world_state: initial,
      ticks: [],
      approximate: !initial,
    }
  }

  const record = history.find((t) => t.turn === atTurn)
  if (!record) {
    throw new BranchError(`Turn ${atTurn} is not in this scenario's recorded history`)
  }

  const world = record.world_state
    ? (structuredClone(record.world_state) as WorldState)
    : reconstructWorldAt(scenario.world_state, record)

  const ticks = history
    .filter((t) => t.turn <= atTurn)
    .sort((a, b) => a.turn - b.turn)
    .map((t) => structuredClone(t) as TickRecord)

  return {
    name: branchName(scenario.name, record.elapsed_min),
    parent_scenario_id: scenario.id,
    branch_turn: atTurn,
    elapsed_min: record.elapsed_min,
    status: 'running',
    world_state: world,
    initial_world_state: initial,
    ticks,
    approximate: !record.world_state,
  }
}
