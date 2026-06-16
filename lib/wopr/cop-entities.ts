import type { Entity } from '@/components/arena/CesiumArena'
import type { SensorTrack, TickResult, WoprPlatform, WoprScenario } from '@/lib/wopr/types'

export type CopViewMode = 'orbat' | 'blue_picture' | 'red_fow'

function platformTypeToEntityType(platformType: string): Entity['type'] {
  const t = platformType.toLowerCase()
  if (t.includes('jam') || t.includes('ew') || t.includes('horizon')) return 'jammer'
  if (t.includes('radar') || t.includes('giraffe') || t.includes('sentinel')) return 'radar'
  if (
    t.includes('dome') ||
    t.includes('cuas') ||
    t.includes('counter') ||
    t.includes('defeat') ||
    t.includes('skywall')
  ) {
    return 'defeat_system'
  }
  return 'drone'
}

function platformToEntity(p: WoprPlatform): Entity {
  return {
    id: p.id,
    name: p.name,
    lon: p.lon,
    lat: p.lat,
    altM: p.alt_m,
    force: p.side,
    type: platformTypeToEntityType(p.platform_type),
  }
}

function trackToEntity(track: SensorTrack, force: 'red' | 'blue'): Entity {
  return {
    id: `track-${track.id}`,
    name: `${track.name} (${track.confidence})`,
    lon: track.lon,
    lat: track.lat,
    altM: 150,
    force,
    type: 'drone',
  }
}

function activePlatforms(platforms: WoprPlatform[]): WoprPlatform[] {
  return platforms.filter((p) => !p.destroyed)
}

/** Map WOPR scenario world state (+ optional tick) to CesiumArena entities. */
export function worldStateToCopEntities(
  scenario: WoprScenario | null,
  mode: CopViewMode,
  tick: TickResult | null = null,
): Entity[] {
  if (!scenario) return []

  const { world_state: world } = scenario
  const red = activePlatforms(world.red_orbat.platforms)
  const blue = activePlatforms(world.blue_orbat.platforms)

  switch (mode) {
    case 'orbat':
      return [...red.map(platformToEntity), ...blue.map(platformToEntity)]
    case 'blue_picture':
      return [
        ...blue.map(platformToEntity),
        ...(tick?.blue_picture ?? []).map((t) => trackToEntity(t, 'red')),
      ]
    case 'red_fow':
      return [
        ...red.map(platformToEntity),
        ...(tick?.red_picture ?? []).map((t) => trackToEntity(t, 'blue')),
      ]
    default:
      return [...red.map(platformToEntity), ...blue.map(platformToEntity)]
  }
}
