import { createClient } from '@/lib/supabase/server'
import { toMapCuasAsset, toMapUasAsset } from '@/lib/map/asset-mappers'
import type { MapAssetsPayload } from '@/lib/map/types'
import type { AntiDroneSystem, DefeatEffectiveness, Platform } from '@/lib/types'

export async function getMapAssets(): Promise<MapAssetsPayload> {
  const supabase = await createClient()

  const [platformsRes, systemsRes] = await Promise.all([
    supabase.from('platforms').select('*').order('name'),
    supabase.from('anti_drone_systems').select('*').order('name'),
  ])

  if (platformsRes.error) throw new Error(platformsRes.error.message)
  if (systemsRes.error) throw new Error(systemsRes.error.message)

  return {
    uas: (platformsRes.data as Platform[]).map(toMapUasAsset),
    cuas: (systemsRes.data as AntiDroneSystem[]).map(toMapCuasAsset),
  }
}

export async function getDefeatCheckData(uasId: string, cuasId: string) {
  const supabase = await createClient()

  const [platformRes, systemRes, effRes] = await Promise.all([
    supabase.from('platforms').select('*').eq('id', uasId).maybeSingle(),
    supabase.from('anti_drone_systems').select('*').eq('id', cuasId).maybeSingle(),
    supabase
      .from('defeat_effectiveness')
      .select('*')
      .eq('platform_id', uasId)
      .eq('defeat_system_id', cuasId)
      .maybeSingle(),
  ])

  if (platformRes.error) throw new Error(platformRes.error.message)
  if (systemRes.error) throw new Error(systemRes.error.message)
  if (effRes.error) throw new Error(effRes.error.message)

  return {
    platform: platformRes.data as Platform | null,
    system: systemRes.data as AntiDroneSystem | null,
    effectiveness: effRes.data as DefeatEffectiveness | null,
  }
}
