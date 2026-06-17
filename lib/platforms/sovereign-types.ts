/** Sovereign programme catalogue row (UNCLASSIFIED descriptive only). */

export type SovereignOriginCountry = 'Australia' | 'UK' | 'USA';
export type SovereignRole = 'blue_force' | 'blue_or_red' | 'enabler';
export type SovereignStatus = 'in_service' | 'in_development' | 'trials' | 'announced';

export interface SovereignPlatform {
  id: string;
  display_name: string;
  origin_country: SovereignOriginCountry;
  category: string;
  role: SovereignRole;
  sovereign_program: string;
  status: SovereignStatus;
  open_source_summary: string;
  performance_ref: string;
  open_sources: string[];
  classification: string;
  releasability: string;
  created_at: string;
  updated_at: string;
}

export const SOVEREIGN_CORE_BOUNDARY =
  'Performance parameters beyond this summary reside in the accredited catalogue (SOVEREIGN_CORE_BOUNDARY).';
