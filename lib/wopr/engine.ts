import { buildSensorPicture } from '@/lib/wopr/fog-of-war'
import type { TickResult, WorldState, WoprScenario } from '@/lib/wopr/types'

const TURN_MINUTES = 15

export function createDefaultWorldState(): WorldState {
  return {
    battlespace: {
      terrain: 'mixed_urban',
      weather: { wind_kts: 12, visibility_km: 8, cloud_base_ft: 4000 },
      time: { mission_elapsed_min: 0, day_night: 'day' },
    },
    red_orbat: { platforms: [] },
    blue_orbat: { platforms: [] },
    comms_status: {},
  }
}

export function advanceScenario(scenario: WoprScenario): { scenario: WoprScenario; tick: TickResult } {
  const world = structuredClone(scenario.world_state) as WorldState
  const turn = Math.floor(world.battlespace.time.mission_elapsed_min / TURN_MINUTES) + 1
  world.battlespace.time.mission_elapsed_min += TURN_MINUTES
  world.last_tick_at = new Date().toISOString()

  const redPlatforms = world.red_orbat.platforms
  const bluePlatforms = world.blue_orbat.platforms

  const redPicture = buildSensorPicture(bluePlatforms, redPlatforms, 25)
  const bluePicture = buildSensorPicture(redPlatforms, bluePlatforms, 30)

  const events: string[] = [
    `Turn ${turn}: ${TURN_MINUTES} min elapsed — propagation refresh queued for laydown pairs`,
  ]

  if (world.battlespace.time.mission_elapsed_min >= 60 && world.battlespace.time.day_night === 'day') {
    world.battlespace.time.day_night = 'night'
    events.push('Night transition — EO/IR advantage shifts')
  }

  const updated: WoprScenario = {
    ...scenario,
    elapsed_min: world.battlespace.time.mission_elapsed_min,
    world_state: world,
    status: scenario.status === 'draft' ? 'running' : scenario.status,
  }

  return {
    scenario: updated,
    tick: {
      elapsed_min: world.battlespace.time.mission_elapsed_min,
      turn,
      red_picture: redPicture,
      blue_picture: bluePicture,
      events,
      propagation_refreshed: true,
    },
  }
}
