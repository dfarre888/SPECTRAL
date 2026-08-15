import 'server-only'
import { assembleNationForce, enrichPlatform, matchCuasForNation, matchUasForNation } from '@/lib/force/assemble'
import { FORCE_NATIONS, getForceNation } from '@/lib/force/nations'
import { getAllPlatforms } from '@/lib/platforms/queries'
import { createClient } from '@/lib/supabase/server'
import type {
  BmiCommsRow,
  BmiPlatformRow,
  BmiSensorRow,
  ForceNation,
  LinkedCuas,
  NationForce,
} from '@/lib/force/types'

function asPlatform(row: Record<string, unknown>): BmiPlatformRow {
  return {
    id: String(row.id),
    exercise_id: (row.exercise_id as string | null) ?? null,
    nation_code: String(row.nation_code),
    nation_name: (row.nation_name as string | null) ?? null,
    designation: String(row.designation ?? ''),
    short_name: String(row.short_name ?? row.designation ?? ''),
    domain: row.domain === 'ground' || row.domain === 'maritime' ? row.domain : 'air',
    role: String(row.role ?? 'other'),
    qty: typeof row.qty === 'number' ? row.qty : null,
    force_side: row.force_side === 'red' ? 'red' : 'blue',
    open_source_summary: String(row.open_source_summary ?? ''),
    data_confidence:
      row.data_confidence === 'high' || row.data_confidence === 'medium' || row.data_confidence === 'classified'
        ? row.data_confidence
        : 'estimated',
    sources: Array.isArray(row.sources) ? (row.sources as string[]) : [],
    platform_library_id: (row.platform_library_id as string | null) ?? null,
    is_catalog: Boolean(row.is_catalog),
    manufacturer: (row.manufacturer as string | null) ?? null,
    service_status: (row.service_status as string | null) ?? null,
    ioc_year: typeof row.ioc_year === 'number' ? row.ioc_year : null,
    program_stage: (row.program_stage as string | null) ?? null,
  }
}

export async function fetchBmiCatalog(): Promise<BmiPlatformRow[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('bmi_exercise_platforms')
      .select('*')
      .eq('is_catalog', true)
      .order('designation')
    if (error || !data) return []
    return data.map((row) => asPlatform(row as Record<string, unknown>))
  } catch {
    return []
  }
}

export async function fetchBmiComms(platformIds: string[]): Promise<BmiCommsRow[]> {
  if (platformIds.length === 0) return []
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('bmi_platform_comms')
      .select('id, platform_id, kind, standard, band, label, gateway_capable, pnt_dependent, data_confidence')
      .in('platform_id', platformIds)
    if (error || !data) return []
    return data as BmiCommsRow[]
  } catch {
    return []
  }
}

export async function fetchBmiSensors(platformIds: string[]): Promise<BmiSensorRow[]> {
  if (platformIds.length === 0) return []
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('bmi_platform_sensors')
      .select('id, platform_id, kind, label, band, role, confidence')
      .in('platform_id', platformIds)
    if (error || !data) return []
    return data as BmiSensorRow[]
  } catch {
    return []
  }
}

async function fetchCuasLinks(): Promise<LinkedCuas[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('anti_drone_systems')
      .select('id, name, country')
    if (error || !data) return []
    return data.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      country: row.country as string | null,
    })) as LinkedCuas[]
  } catch {
    return []
  }
}

export async function getNationForce(code: string): Promise<NationForce | null> {
  const nation = getForceNation(code)
  if (!nation) return null
  const [rows, uas, cuasRaw] = await Promise.all([
    fetchBmiCatalog(),
    getAllPlatforms(),
    fetchCuasLinks(),
  ])
  const mine = rows.filter((r) => r.nation_code === nation.code)
  const ids = mine.map((r) => r.id)
  const [comms, sensors] = await Promise.all([fetchBmiComms(ids), fetchBmiSensors(ids)])
  const commsBy = groupBy(comms, (c) => c.platform_id)
  const sensorsBy = groupBy(sensors, (s) => s.platform_id)
  const linkedUas = matchUasForNation(nation.code, uas)
  const linkedCuas = matchCuasForNation(
    nation.code,
    cuasRaw.map((c) => ({
      id: c.id,
      name: c.name,
      country: (c as LinkedCuas & { country?: string }).country,
    })),
  )
  const uasByLib = new Map(uas.map((p) => [p.id, { id: p.id, name: p.name, category: p.category ?? null }]))
  const enriched = mine.map((row) => {
    const fromLib = row.platform_library_id ? uasByLib.get(row.platform_library_id) : undefined
    return enrichPlatform(
      row,
      commsBy.get(row.id) ?? [],
      sensorsBy.get(row.id) ?? [],
      fromLib ? [fromLib] : [],
      [],
    )
  })
  const force = assembleNationForce(nation, enriched)
  return { ...force, linked_uas: linkedUas, linked_cuas: linkedCuas }
}

export async function getAllNationForces(): Promise<NationForce[]> {
  const nations: ForceNation[] = FORCE_NATIONS
  const [rows, uas] = await Promise.all([fetchBmiCatalog(), getAllPlatforms()])
  const ids = rows.map((r) => r.id)
  const [comms, sensors] = await Promise.all([fetchBmiComms(ids), fetchBmiSensors(ids)])
  const commsBy = groupBy(comms, (c) => c.platform_id)
  const sensorsBy = groupBy(sensors, (s) => s.platform_id)
  const uasByLib = new Map(uas.map((p) => [p.id, { id: p.id, name: p.name, category: p.category ?? null }]))
  return nations.map((nation) => {
    const mine = rows.filter((r) => r.nation_code === nation.code)
    const linkedUas = matchUasForNation(nation.code, uas)
    const enriched = mine.map((row) => {
      const fromLib = row.platform_library_id ? uasByLib.get(row.platform_library_id) : undefined
      return enrichPlatform(row, commsBy.get(row.id) ?? [], sensorsBy.get(row.id) ?? [], fromLib ? [fromLib] : [], [])
    })
    const force = assembleNationForce(nation, enriched)
    return { ...force, linked_uas: linkedUas }
  })
}

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const row of rows) {
    const k = key(row)
    const list = map.get(k)
    if (list) list.push(row)
    else map.set(k, [row])
  }
  return map
}
