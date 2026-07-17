import { createClient } from '@/lib/supabase/server';
import { sortConstellations } from '@/lib/gnss/constellation-meta';
import type {
  GnssConstellation,
  GnssJammingIncident,
  GnssPlatformDependency,
  GnssSignalBand,
} from '@/lib/gnss/gnss-types';

function parseSystemCategory(raw: unknown): GnssConstellation['system_category'] {
  if (raw === 'regional_gnss' || raw === 'augmentation' || raw === 'leo_pnt_comms') return raw;
  return 'global_gnss';
}

function parseSignalBands(raw: unknown): GnssSignalBand[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const band = (row as { band?: unknown }).band;
      const freq = (row as { freq_mhz?: unknown }).freq_mhz;
      if (typeof band !== 'string' || typeof freq !== 'number') return null;
      return { band, freq_mhz: freq };
    })
    .filter((x): x is GnssSignalBand => x !== null);
}


function parsePlatformImpacts(raw: unknown): GnssJammingIncident['platform_impacts'] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const platform_id = (row as { platform_id?: unknown }).platform_id;
      const observed_effect = (row as { observed_effect?: unknown }).observed_effect;
      if (typeof platform_id !== 'string' || typeof observed_effect !== 'string') return null;
      return { platform_id, observed_effect };
    })
    .filter((x): x is GnssJammingIncident['platform_impacts'][number] => x !== null);
}

export async function fetchGnssConstellations(): Promise<GnssConstellation[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('gnss_constellations')
    .select(
      'id, display_name, operator, status, system_category, signal_bands, satellites_nominal, satellites_active, notes, updated_at',
    )
    .order('display_name');

  const rows = (data ?? []).map((row) => ({
    id: row.id,
    display_name: row.display_name ?? row.id.toUpperCase(),
    operator: row.operator ?? '—',
    status: (row.status ?? 'operational') as GnssConstellation['status'],
    system_category: parseSystemCategory(row.system_category),
    signal_bands: parseSignalBands(row.signal_bands),
    satellites_nominal: row.satellites_nominal,
    satellites_active: row.satellites_active,
    notes: row.notes,
    updated_at: row.updated_at,
  }));

  return sortConstellations(rows);
}

export async function fetchGnssPlatformDependencies(
  platformIds?: string[],
): Promise<GnssPlatformDependency[]> {
  const supabase = await createClient();
  let query = supabase
    .from('gnss_platform_dependencies')
    .select('id, platform_id, constellation, dependency_level, jamming_effect, notes, data_source')
    .order('platform_id');

  if (platformIds?.length) {
    query = query.in('platform_id', platformIds);
  }

  const { data } = await query;
  return (data ?? []) as GnssPlatformDependency[];
}

export async function fetchGnssJammingIncidents(): Promise<GnssJammingIncident[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('gnss_jamming_incidents')
    .select(
      'id, incident_name, detected_at, lat, lon, radius_km, affected_constellations, jamming_type, confirmed, source_ref, platform_impacts, classification',
    )
    .order('detected_at', { ascending: false });

  return (data ?? []).map((row) => ({
    ...row,
    platform_impacts: parsePlatformImpacts(row.platform_impacts),
  })) as GnssJammingIncident[];
}
