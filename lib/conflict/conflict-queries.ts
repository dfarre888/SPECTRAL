import { createClient } from '@/lib/supabase/server';
import type { ConflictIncident } from '@/lib/conflict/conflict-types';

function mapConflictRow(row: Record<string, unknown>): ConflictIncident | null {
  const lat = row.lat as number | null | undefined;
  const lon = row.lon as number | null | undefined;
  const occurredAt = row.occurred_at as string | null | undefined;
  if (lat == null || lon == null || !occurredAt) return null;

  return {
    id: String(row.id),
    conflict_name: String(row.conflict_name ?? row.conflict ?? ''),
    incident_title: String(row.incident_title ?? row.tactical_notes ?? row.id),
    incident_type: (row.incident_type ?? 'other') as ConflictIncident['incident_type'],
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
  return (data ?? [])
    .map((row) => mapConflictRow(row as Record<string, unknown>))
    .filter((row): row is ConflictIncident => row !== null);
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
