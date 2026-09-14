export type {
  ConflictCaseStudy,
} from '@/data/seed-conflicts';

export type ConflictIncidentType =
  | 'uas_strike'
  | 'gnss_denial'
  | 'ew'
  | 'naval'
  | 'isr'
  | 'swarm'
  | 'cruise_strike'
  | 'ballistic_strike'
  | 'intercept'
  | 'strike'
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
  /** Automated-lead evidence; absent on curated rows. */
  evidence?: LeadEvidence;
}

export interface LeadEvidence {
  /** Independent outlets carrying the event. */
  outlets: number;
  /** Of those, tier-1 wires or defence press. */
  tier1: number;
  /** High-confidence satellite thermal anomalies within `thermalKm` of the theatre centroid in the last 24 h (NASA FIRMS). */
  thermal24h?: number;
  thermalKm?: number;
  /** GDELT geocoded conflict events (CAMEO 18–20) within `thermalKm` of the theatre centroid in the last 24 h. */
  gdeltEvents24h?: number;
}
