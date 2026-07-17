import { SEED_CONFLICT_INCIDENTS } from '@/data/seed-conflict-incidents';
import { normalizeIncidentType } from '@/lib/conflicts/incident-style';
import { createClient } from '@/lib/supabase/server';
import type { ConflictIncident } from '@/lib/conflicts/types';

function mergeSeedIncidents(rows: ConflictIncident[]): ConflictIncident[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  for (const seed of SEED_CONFLICT_INCIDENTS) {
    if (!byId.has(seed.id)) byId.set(seed.id, seed);
  }
  return [...byId.values()].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
}

function mapConflictRow(row: Record<string, unknown>): ConflictIncident | null {
  const lat = row.lat as number | null | undefined;
  const lon = row.lon as number | null | undefined;
  const occurredAt = row.occurred_at as string | null | undefined;
  if (lat == null || lon == null || !occurredAt) return null;

  return {
    id: String(row.id),
    conflict_name: String(row.conflict_name ?? row.conflict ?? ''),
    incident_title: String(row.incident_title ?? row.tactical_notes ?? row.id),
    incident_type: normalizeIncidentType(String(row.incident_type ?? 'other')),
    occurred_at: occurredAt,
    lat,
    lon,
    summary: String(row.summary ?? row.tactical_notes ?? ''),
    source_ref: String(row.source_ref ?? ''),
    platforms_involved: Array.isArray(row.platforms_involved)
      ? (row.platforms_involved as string[])
      : row.platform_used
        ? [String(row.platform_used)]
        : [],
    confidence: String(row.confidence ?? row.data_confidence ?? 'Reported'),
    classification: String(row.classification ?? 'UNCLASSIFIED'),
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

export async function fetchConflictIncidents(): Promise<ConflictIncident[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('conflict_incidents')
    .select('*')
    .order('occurred_at', { ascending: false });
  if (error) throw new Error(error.message);
  const mapped = (data ?? [])
    .map((row) => mapConflictRow(row as Record<string, unknown>))
    .filter((row): row is ConflictIncident => row !== null);
  if (mapped.length === 0) return SEED_CONFLICT_INCIDENTS;
  return mergeSeedIncidents(mapped);
}

export async function fetchConflictIncidentById(id: string): Promise<ConflictIncident | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('conflict_incidents')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapConflictRow(data as Record<string, unknown>);
}
