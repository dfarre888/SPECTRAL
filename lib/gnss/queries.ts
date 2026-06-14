import { createClient } from '@/lib/supabase/server'

export interface GnssConstellation {
  id: string
  name: string
  operator_country: string | null
  jamming_vulnerability: string | null
  spoofing_resistance: string | null
  notes: string | null
}

export interface GnssJammer {
  id: string
  name: string
  country: string | null
  jammer_tier: string | null
  freq_summary: string | null
  effective_radius_km: number | null
  spoofing_capable: boolean | null
}

export interface NavCountermeasure {
  id: string
  name: string
  type: string | null
  jamming_resistance: string | null
  spoofing_resistance: string | null
  notes: string | null
}

function summariseJamBands(bands: unknown): string | null {
  if (!bands || typeof bands !== 'object') return null
  const entries = Object.entries(bands as Record<string, unknown>)
  if (entries.length === 0) return null
  return entries
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(' · ')
}

export async function getGnssConstellations(): Promise<GnssConstellation[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('gnss_constellations')
    .select('id, full_name, operator_country, jamming_vulnerability, spoofing_resistance, notes')
    .order('full_name')
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.full_name,
    operator_country: row.operator_country,
    jamming_vulnerability: row.jamming_vulnerability,
    spoofing_resistance: row.spoofing_resistance,
    notes: row.notes,
  }))
}

export async function getGnssJammers(): Promise<GnssJammer[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('gnss_jammers')
    .select(
      'id, name, country_of_origin, jammer_tier, frequency_bands_jammed, effective_radius_km, spoofing_capable',
    )
    .order('name')
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    country: row.country_of_origin,
    jammer_tier: row.jammer_tier,
    freq_summary: summariseJamBands(row.frequency_bands_jammed),
    effective_radius_km: row.effective_radius_km,
    spoofing_capable: row.spoofing_capable,
  }))
}

export async function getNavCountermeasures(): Promise<NavCountermeasure[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('nav_countermeasures')
    .select('id, name, type, jamming_resistance, spoofing_resistance, notes')
    .order('name')
  return (data ?? []) as NavCountermeasure[]
}
