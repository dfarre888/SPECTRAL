import { createClient } from '@/lib/supabase/server'

export interface GnssConstellation {
  id: string
  name: string
  status: string
  vulnerability_notes: string | null
}

export interface GnssJammer {
  id: string
  name: string
  country: string | null
  freq_low_mhz: number | null
  freq_high_mhz: number | null
  power_w: number | null
}

export interface NavCountermeasure {
  id: string
  name: string
  method: string | null
  effectiveness_notes: string | null
}

export async function getGnssConstellations(): Promise<GnssConstellation[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('gnss_constellations').select('*').order('name')
  return (data ?? []) as GnssConstellation[]
}

export async function getGnssJammers(): Promise<GnssJammer[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('gnss_jammers').select('*').order('name')
  return (data ?? []) as GnssJammer[]
}

export async function getNavCountermeasures(): Promise<NavCountermeasure[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('nav_countermeasures').select('*').order('name')
  return (data ?? []) as NavCountermeasure[]
}
