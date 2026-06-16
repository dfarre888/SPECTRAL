import { createClient } from '@/lib/supabase/server'
import {
  OFFLINE_ACCREDITED_DEFEAT_PK,
  OFFLINE_ACCREDITED_ERP,
  OFFLINE_ACCREDITED_WAVEFORMS,
  type AccreditedDefeatPkRow,
  type AccreditedErpProfile,
  type AccreditedWaveformProfile,
} from '@/lib/operations/accredited-supplements-data'

export type { AccreditedProvenance } from '@/lib/operations/accredited-supplements-data'
export type {
  AccreditedWaveformProfile,
  AccreditedErpProfile,
  AccreditedDefeatPkRow,
} from '@/lib/operations/accredited-supplements-data'
export {
  OFFLINE_ACCREDITED_WAVEFORMS,
  OFFLINE_ACCREDITED_ERP,
  OFFLINE_ACCREDITED_DEFEAT_PK,
  accreditedPkToEffectiveness,
  mergeAccreditedOverOsint,
  resolveAccreditedErpForJam,
} from '@/lib/operations/accredited-supplements-data'

export async function fetchAccreditedWaveforms(systemId?: string): Promise<AccreditedWaveformProfile[]> {
  try {
    const supabase = await createClient()
    let q = supabase.from('accredited_waveform_profiles').select('*').order('id')
    if (systemId) q = q.eq('system_id', systemId)
    const { data, error } = await q
    if (error || !data?.length) {
      return systemId
        ? OFFLINE_ACCREDITED_WAVEFORMS.filter((w) => w.system_id === systemId)
        : OFFLINE_ACCREDITED_WAVEFORMS
    }
    return data as AccreditedWaveformProfile[]
  } catch {
    return systemId
      ? OFFLINE_ACCREDITED_WAVEFORMS.filter((w) => w.system_id === systemId)
      : OFFLINE_ACCREDITED_WAVEFORMS
  }
}

export async function fetchAccreditedErp(systemId?: string): Promise<AccreditedErpProfile[]> {
  try {
    const supabase = await createClient()
    let q = supabase.from('accredited_erp_profiles').select('*').order('id')
    if (systemId) q = q.eq('system_id', systemId)
    const { data, error } = await q
    if (error || !data?.length) {
      return systemId
        ? OFFLINE_ACCREDITED_ERP.filter((e) => e.system_id === systemId)
        : OFFLINE_ACCREDITED_ERP
    }
    return data as AccreditedErpProfile[]
  } catch {
    return systemId
      ? OFFLINE_ACCREDITED_ERP.filter((e) => e.system_id === systemId)
      : OFFLINE_ACCREDITED_ERP
  }
}

export async function fetchAccreditedDefeatPk(
  platformId: string,
  defeatSystemId: string,
): Promise<AccreditedDefeatPkRow | undefined> {
  const all = await fetchAllAccreditedDefeatPk([platformId], [defeatSystemId])
  return all.get(`${platformId}:${defeatSystemId}`)
}

export async function fetchAllAccreditedDefeatPk(
  platformIds: string[],
  defeatSystemIds: string[],
): Promise<Map<string, AccreditedDefeatPkRow>> {
  const map = new Map<string, AccreditedDefeatPkRow>()
  if (!platformIds.length || !defeatSystemIds.length) return map

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('accredited_defeat_pk')
      .select('*')
      .in('platform_id', platformIds)
      .in('defeat_system_id', defeatSystemIds)

    if (error || !data?.length) {
      for (const row of OFFLINE_ACCREDITED_DEFEAT_PK) {
        if (platformIds.includes(row.platform_id) && defeatSystemIds.includes(row.defeat_system_id)) {
          map.set(`${row.platform_id}:${row.defeat_system_id}`, row)
        }
      }
      return map
    }

    for (const row of data as AccreditedDefeatPkRow[]) {
      map.set(`${row.platform_id}:${row.defeat_system_id}`, row)
    }
    return map
  } catch {
    for (const row of OFFLINE_ACCREDITED_DEFEAT_PK) {
      if (platformIds.includes(row.platform_id) && defeatSystemIds.includes(row.defeat_system_id)) {
        map.set(`${row.platform_id}:${row.defeat_system_id}`, row)
      }
    }
    return map
  }
}
