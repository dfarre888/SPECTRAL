import { createClient } from '@/lib/supabase/server'
import type { WoprPlatform, WorldState } from '@/lib/wopr/types'
import { createDefaultWorldState } from '@/lib/wopr/engine'

export interface ScenarioTemplateRow {
  id: string
  name: string
  description: string | null
  red_platforms: string[] | null
  blue_systems: string[] | null
  duration_mins: number | null
}

export async function listScenarioTemplates(): Promise<ScenarioTemplateRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('scenario_templates')
    .select('id, name, description, red_platforms, blue_systems, duration_mins')
    .order('name')
  return (data ?? []) as ScenarioTemplateRow[]
}

/** Seed ORBAT from template platform slugs (Estimated positions). */
export function worldStateFromTemplate(
  template: ScenarioTemplateRow,
  center = { lat: -35.28, lon: 149.13 },
): WorldState {
  const world = createDefaultWorldState()
  const red: WoprPlatform[] = (template.red_platforms ?? []).map((slug, i) => ({
    id: `red-${slug}-${i}`,
    name: slug,
    lat: center.lat + (i % 3) * 0.008,
    lon: center.lon + Math.floor(i / 3) * 0.01,
    alt_m: 120 + i * 15,
    side: 'red' as const,
    platform_type: slug,
    radiating: true,
    destroyed: false,
  }))
  const blue: WoprPlatform[] = (template.blue_systems ?? []).map((slug, i) => ({
    id: `blue-${slug}-${i}`,
    name: slug,
    lat: center.lat - 0.01,
    lon: center.lon - 0.012 + i * 0.006,
    alt_m: 15,
    side: 'blue' as const,
    platform_type: slug,
    radiating: true,
    destroyed: false,
  }))
  world.red_orbat.platforms = red
  world.blue_orbat.platforms = blue
  if (template.duration_mins) {
    world.battlespace.time.mission_elapsed_min = 0
  }
  return world
}
