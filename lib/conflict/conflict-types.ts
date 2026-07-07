export type ConflictIncidentType =
  | 'uas_strike'
  | 'gnss_denial'
  | 'ew'
  | 'naval'
  | 'isr'
  | 'swarm'
  | 'other';

export interface ConflictIncident {
  id: string;
  conflict_name: string;
  incident_title: string;
  incident_type: ConflictIncidentType;
  occurred_at: string;
  lat: number;
  lon: number;
  summary: string;
  source_ref: string;
  platforms_involved: string[];
  confidence: string;
  classification: string;
  created_at: string;
}
