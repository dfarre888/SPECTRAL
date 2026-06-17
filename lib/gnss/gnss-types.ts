/** GNSS Intelligence — Supabase row types (OSINT training layer). */

export type GnssConstellationStatus = 'operational' | 'degraded' | 'testing';

export type GnssDependencyLevel = 'primary' | 'secondary' | 'none' | 'immune';

export type GnssJammingEffect = 'mission_kill' | 'degraded' | 'minimal' | 'none';

export type GnssJammingType = 'broadband' | 'meaconing' | 'spoofing' | 'selective';

export interface GnssSignalBand {
  band: string;
  freq_mhz: number;
}

export interface GnssConstellation {
  id: string;
  display_name: string;
  operator: string;
  status: GnssConstellationStatus;
  signal_bands: GnssSignalBand[];
  satellites_nominal: number | null;
  satellites_active: number | null;
  notes: string | null;
  updated_at: string | null;
}

export interface GnssPlatformDependency {
  id: string;
  platform_id: string;
  constellation: string;
  dependency_level: GnssDependencyLevel;
  jamming_effect: GnssJammingEffect;
  notes: string | null;
  data_source: string;
}

export interface GnssPlatformImpact {
  platform_id: string;
  observed_effect: string;
}

export interface GnssJammingIncident {
  id: string;
  incident_name: string;
  detected_at: string;
  lat: number;
  lon: number;
  radius_km: number | null;
  affected_constellations: string[];
  jamming_type: GnssJammingType;
  confirmed: boolean;
  source_ref: string;
  platform_impacts: GnssPlatformImpact[];
  classification: string;
}
