/** GNSS Intelligence — Supabase row types (OSINT training layer). */

export type GnssConstellationStatus = 'operational' | 'degraded' | 'testing';

/** Distinguishes global GNSS from regional, SBAS augmentation, and LEO comms/PNT. */
export type GnssSystemCategory =
  | 'global_gnss'
  | 'regional_gnss'
  | 'augmentation'
  | 'leo_pnt_comms';

export type GnssDependencyLevel = 'primary' | 'secondary' | 'none' | 'immune';

export type GnssJammingEffect = 'mission_kill' | 'degraded' | 'minimal' | 'none';

export type GnssJammingType = 'broadband' | 'meaconing' | 'spoofing' | 'selective' | 'spoofing+jamming';

export interface GnssSignalBand {
  band: string;
  freq_mhz: number;
}

export interface GnssConstellation {
  id: string;
  display_name: string;
  operator: string;
  status: GnssConstellationStatus;
  system_category: GnssSystemCategory;
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
