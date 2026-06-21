/**
 * SPECTRAL — Moat-Builder 2
 * Sovereign Data Architecture
 *
 * The competitive property a US prime structurally cannot match: every byte
 * of training data and force-design output stays under Australian configuration
 * control, and Australian sovereign platforms are modelled as first-class blue
 * assets.
 *
 * This module defines:
 *   - The sovereign platform catalogue (Australian/AUKUS blue-force platforms)
 *   - The data residency and configuration-control policy as enforceable config
 *   - The classification & releasability tagging model
 *
 * NOTE: platform entries here carry UNCLASSIFIED, open-source descriptive data
 * only (the kind already in manufacturer brochures and Defence press releases).
 * Performance values that would constitute controlled technical data are left
 * as references to the accredited catalogue — see SOVEREIGN_CORE_BOUNDARY below.
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION CONTROL & DATA RESIDENCY POLICY
// ─────────────────────────────────────────────────────────────────────────────

export type Releasability =
  | 'AUS_ONLY'
  | 'AUKUS'
  | 'FVEY'
  | 'UNCLASSIFIED_PUBLIC';

export interface DataResidencyPolicy {
  // Where data physically resides
  primary_region: string;            // e.g. "ap-southeast-2" (Sydney)
  backup_region: string;             // must also be sovereign
  // Hard rule: no training data or force-design output leaves these regions
  permitted_regions: string[];
  // Configuration control authority
  design_authority: string;          // who controls the baseline
  // Whether any processing may occur offshore (default: no)
  offshore_processing_permitted: false;
  // AI inference location constraint
  inference_location: 'sovereign_only' | 'sovereign_preferred';
}

export const DEFAULT_SOVEREIGN_POLICY: DataResidencyPolicy = {
  primary_region: 'ap-southeast-2',          // AWS Sydney
  backup_region: 'ap-southeast-4',           // AWS Melbourne
  permitted_regions: ['ap-southeast-2', 'ap-southeast-4'],
  design_authority: 'SOVEREIGN_DEVELOPER',   // the originator as design authority
  offshore_processing_permitted: false,
  inference_location: 'sovereign_only',
};

/**
 * assertResidency
 * Guard to call before any data egress. Throws if a target region is not
 * sovereign-permitted. Wire this into every external call path.
 */
export function assertResidency(targetRegion: string, policy: DataResidencyPolicy = DEFAULT_SOVEREIGN_POLICY): void {
  if (!policy.permitted_regions.includes(targetRegion)) {
    throw new Error(
      `SOVEREIGN POLICY VIOLATION: attempted data movement to non-permitted region "${targetRegion}". ` +
      `Permitted: ${policy.permitted_regions.join(', ')}.`,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CLASSIFICATION & RELEASABILITY TAGGING
// ─────────────────────────────────────────────────────────────────────────────

export interface ClassifiedRecord<T> {
  classification: string;            // e.g. "UNCLASSIFIED", "OFFICIAL", "PROTECTED"
  releasability: Releasability;
  caveats: string[];
  data: T;
  // Provenance for audit
  origin: string;
  created_at: string;
}

export function tag<T>(
  data: T,
  classification: string,
  releasability: Releasability,
  origin: string,
  caveats: string[] = [],
): ClassifiedRecord<T> {
  return {
    classification,
    releasability,
    caveats,
    data,
    origin,
    created_at: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SOVEREIGN PLATFORM CATALOGUE — Australian / AUKUS blue-force assets
// (UNCLASSIFIED descriptive data only)
// ─────────────────────────────────────────────────────────────────────────────

export interface SovereignPlatform {
  id: string;
  display_name: string;
  origin_country: 'Australia' | 'UK' | 'USA';
  category: string;
  role: 'blue_force' | 'blue_or_red' | 'enabler';
  sovereign_program: string;
  status: 'in_service' | 'in_development' | 'trials' | 'announced';
  open_source_summary: string;
  // Performance values that would be controlled technical data are NOT stored here.
  // They are referenced to the accredited catalogue and resolved at runtime
  // inside the accredited environment.
  performance_ref: 'SOVEREIGN_CORE_BOUNDARY';
  open_sources: string[];
}

export const SOVEREIGN_PLATFORM_CATALOGUE: SovereignPlatform[] = [
  {
    id: 'AUS-CCA-GHOSTBAT',
    display_name: 'MQ-28A Ghost Bat',
    origin_country: 'Australia',
    category: 'Collaborative Combat Aircraft (CCA)',
    role: 'blue_force',
    sovereign_program: 'Boeing Australia / RAAF',
    status: 'trials',
    open_source_summary: 'Australian-designed collaborative combat aircraft. Publicly reported first validated air-to-air engagement in late 2025. A flagship sovereign autonomy program and the natural blue-force CCA for SPECTRAL scenarios.',
    performance_ref: 'SOVEREIGN_CORE_BOUNDARY',
    open_sources: ['RAAF / Boeing Australia public releases', 'ADM reporting 2025-26'],
  },
  {
    id: 'AUS-OWA-OWLB',
    display_name: 'Innovaero OWL-B',
    origin_country: 'Australia',
    category: 'One-Way-Attack munition',
    role: 'blue_or_red',
    sovereign_program: 'Innovaero / ASCA AUKUS Pillar II',
    status: 'trials',
    open_source_summary: 'Australian one-way-attack munition publicly demonstrated striking a target at range during AUKUS Maritime Big Play (2026). Models the sovereign OWA capability for both blue employment and red-threat representation.',
    performance_ref: 'SOVEREIGN_CORE_BOUNDARY',
    open_sources: ['Defence.gov.au Maritime Big Play release 2026', 'Mirage News 2026'],
  },
  {
    id: 'AUS-UUV-SPEARTOOTH',
    display_name: 'C2 Robotics Speartooth',
    origin_country: 'Australia',
    category: 'Large Uncrewed Underwater Vehicle',
    role: 'blue_force',
    sovereign_program: 'C2 Robotics / AUKUS Pillar II',
    status: 'trials',
    open_source_summary: 'Australian large UUV used as a test-bed for novel payload configurations during AUKUS Maritime Big Play (2026). Relevant for multi-domain SPECTRAL scenarios.',
    performance_ref: 'SOVEREIGN_CORE_BOUNDARY',
    open_sources: ['Defence.gov.au 2026', 'Janes 2026'],
  },
  {
    id: 'AUS-UUV-GHOSTSHARK',
    display_name: 'Ghost Shark',
    origin_country: 'Australia',
    category: 'Extra-Large Autonomous Undersea Vehicle',
    role: 'blue_force',
    sovereign_program: 'Anduril Australia / RAN',
    status: 'in_development',
    open_source_summary: 'Australian extra-large autonomous undersea vehicle program, publicly announced as a sovereign undersea autonomy capability. Multi-domain blue-force enabler.',
    performance_ref: 'SOVEREIGN_CORE_BOUNDARY',
    open_sources: ['RAN / Anduril Australia public releases'],
  },
  {
    id: 'AUS-EW-GRASSHOPPER',
    display_name: 'ADT GRASSHOPPER payload',
    origin_country: 'Australia',
    category: 'Electronic Warfare payload',
    role: 'enabler',
    sovereign_program: 'Advanced Design Technology / AUKUS Pillar II EW Challenge',
    status: 'trials',
    open_source_summary: 'Australian EW payload, AUKUS Pillar II EW Innovation Challenge winner, demonstrated during Maritime Big Play (2026). Represents the sovereign EW enabler in SPECTRAL detection/EW modelling.',
    performance_ref: 'SOVEREIGN_CORE_BOUNDARY',
    open_sources: ['Janes 2026', 'Defence.gov.au 2026'],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// IADS THREAT CATALOGUE — Red integrated air-defence nodes (PCM / force-design)
// UNCLASSIFIED descriptive data only; engagement physics via SOVEREIGN_CORE_BOUNDARY
// ─────────────────────────────────────────────────────────────────────────────

export interface IadsThreatEntry {
  id: string;
  display_name: string;
  sam_profile_id?: string;
  sam_profile_ids?: string[];
  effector_id?: string;
  spectral_role: string;
  performance_ref: 'SOVEREIGN_CORE_BOUNDARY';
  open_sources: string[];
  confidence: 'confirmed' | 'assessed' | 'estimated';
}

export const IADS_THREAT_CATALOGUE: IadsThreatEntry[] = [
  {
    id: 'iads-manpads-family',
    display_name: 'MANPADS family (SA-7/14/16/18/24)',
    sam_profile_ids: ['sa-7-grail', 'sa-14-gremlin', 'sa-16-gimlet', 'sa-18-grouse', 'sa-24-grinch'],
    effector_id: 'eff-manpads-family',
    spectral_role: 'proliferated_point_air_defence',
    performance_ref: 'SOVEREIGN_CORE_BOUNDARY',
    open_sources: ['Janes Land Warfare Platforms', 'CSIS Missile Threat MANPADS profiles', 'Ukraine conflict OSINT MANPADS employment 2022-2026'],
    confidence: 'confirmed',
  },
  {
    id: 'iads-sa-6-gainful',
    display_name: 'SA-6 Gainful (2K12 Kub)',
    sam_profile_id: 'sa-6-gainful',
    effector_id: 'eff-kub-3m9',
    spectral_role: 'mobile_medium_sam',
    performance_ref: 'SOVEREIGN_CORE_BOUNDARY',
    open_sources: ['CSIS Missile Threat 2K12 Kub', 'Army Recognition Kub profile', 'Ukraine 2022 Kub battery OSINT'],
    confidence: 'confirmed',
  },
  {
    id: 'iads-sa-8-gecko',
    display_name: 'SA-8 Gecko (9K33 Osa)',
    sam_profile_id: 'sa-8-gecko',
    effector_id: 'eff-osa-9m33',
    spectral_role: 'mobile_shorad',
    performance_ref: 'SOVEREIGN_CORE_BOUNDARY',
    open_sources: ['CSIS Missile Threat 9K33 Osa', 'GlobalSecurity Osa-AKM', 'Export inventory reporting (India, Syria)'],
    confidence: 'confirmed',
  },
  {
    id: 'iads-sa-11-gadfly',
    display_name: 'SA-11 Gadfly (9K37 Buk-M1)',
    sam_profile_id: 'sa-11-gadfly',
    effector_id: 'eff-buk-m1-9m38',
    spectral_role: 'mobile_medium_sam',
    performance_ref: 'SOVEREIGN_CORE_BOUNDARY',
    open_sources: ['CSIS Missile Threat Buk-M1', 'Janes Land Warfare Buk entry', 'Ukraine MH17/Buk OSINT & 2022-2025 employment'],
    confidence: 'confirmed',
  },
  {
    id: 'iads-sa-17-grizzly',
    display_name: 'SA-17 Grizzly (9K37M1-2 Buk-M1-2/M3)',
    sam_profile_id: 'sa-17-grizzly',
    effector_id: 'eff-buk-m3',
    spectral_role: 'mobile_medium_sam',
    performance_ref: 'SOVEREIGN_CORE_BOUNDARY',
    open_sources: ['CSIS Missile Threat Buk-M2/M3', 'Almaz-Antey public Buk-M3 brochure', 'Ukraine 2022-2025 Buk employment OSINT'],
    confidence: 'confirmed',
  },
  {
    id: 'iads-sa-13-gopher',
    display_name: 'SA-13 Gopher (9K35 Strela-10)',
    sam_profile_id: 'sa-13-gopher',
    effector_id: 'eff-strela10-9m37',
    spectral_role: 'mobile_shorad',
    performance_ref: 'SOVEREIGN_CORE_BOUNDARY',
    open_sources: ['CSIS Missile Threat 9K35 Strela-10', 'Army Recognition Strela-10M profile', 'Wide export operator base OSINT'],
    confidence: 'assessed',
  },
  {
    id: 'iads-sa-15-gauntlet',
    display_name: 'SA-15 Gauntlet (9K330 Tor-M2)',
    sam_profile_id: 'sa-15-gauntlet',
    effector_id: 'eff-tor-m2',
    spectral_role: 'point_defence_sam',
    performance_ref: 'SOVEREIGN_CORE_BOUNDARY',
    open_sources: ['CSIS Missile Threat Tor-M2', 'Ukraine 2022-2025 Tor vs Shahed/Lancet OSINT', 'Russian MoD Tor-M2 public releases'],
    confidence: 'confirmed',
  },
  {
    id: 'iads-sa-19-grison',
    display_name: 'SA-19 Grison (2K22 Tunguska)',
    sam_profile_id: 'sa-19-grison',
    effector_id: 'eff-tunguska-9m311',
    spectral_role: 'gun_missile_point_defence',
    performance_ref: 'SOVEREIGN_CORE_BOUNDARY',
    open_sources: ['CSIS Missile Threat 2K22 Tunguska', 'Janes Land Warfare Tunguska entry', 'Export inventory (India, Belarus) OSINT'],
    confidence: 'assessed',
  },
  {
    id: 'iads-sa-10-grumble',
    display_name: 'SA-10 Grumble (S-300P / 5V55)',
    sam_profile_id: 'sa-10-grumble',
    effector_id: 'eff-s300-5v55',
    spectral_role: 'long_range_sam',
    performance_ref: 'SOVEREIGN_CORE_BOUNDARY',
    open_sources: ['CSIS Missile Threat S-300P', 'GlobalSecurity S-300P profile', 'Wide export operator base (China, Greece, Ukraine) OSINT'],
    confidence: 'confirmed',
  },
  {
    id: 'iads-sa-20-gargoyle',
    display_name: 'SA-20 Gargoyle (S-300PMU-2 Favorit)',
    sam_profile_id: 'sa-20-gargoyle',
    effector_id: 'eff-s300-5v55',
    spectral_role: 'long_range_sam',
    performance_ref: 'SOVEREIGN_CORE_BOUNDARY',
    open_sources: ['CSIS Missile Threat S-300PMU-2', 'Almaz-Antey S-300PMU-2 public data', 'Export operators (China, Algeria, Vietnam) OSINT'],
    confidence: 'confirmed',
  },
  {
    id: 'iads-sa-21-growler',
    display_name: 'SA-21 Growler (S-400 Triumf)',
    sam_profile_id: 'sa-21-growler',
    effector_id: 'eff-s400-48n6',
    spectral_role: 'long_range_sam',
    performance_ref: 'SOVEREIGN_CORE_BOUNDARY',
    open_sources: ['CSIS Missile Threat S-400', "Janes All the World's Aircraft S-400 profile", 'Russia/Turkey/China/India S-400 deployment OSINT'],
    confidence: 'confirmed',
  },
  {
    id: 'iads-sa-23-giant',
    display_name: 'SA-23 Giant (S-300VM Antey-2500)',
    sam_profile_id: 'sa-23-giant',
    effector_id: 'eff-s300vm-9m83',
    spectral_role: 'export_context_long_sam',
    performance_ref: 'SOVEREIGN_CORE_BOUNDARY',
    open_sources: ['CSIS Missile Threat S-300VM', 'Rosoboronexport Antey-2500 brochure', 'Venezuela/Algeria export deployment OSINT'],
    confidence: 'assessed',
  },
  {
    id: 'iads-sa-12-gladiator',
    display_name: 'SA-12 Gladiator (S-300V / 9M83)',
    sam_profile_id: 'sa-12a-gladiator',
    spectral_role: 'legacy_context_sam',
    performance_ref: 'SOVEREIGN_CORE_BOUNDARY',
    open_sources: ['CSIS Missile Threat S-300V', 'GlobalSecurity S-300V profile', 'Legacy operator context (Syria, DPRK, India) OSINT'],
    confidence: 'assessed',
  },
  {
    id: 'iads-sa-22-greyhound',
    display_name: 'SA-22 Greyhound (96K6 Pantsir-S1)',
    sam_profile_id: 'sa-22-greyhound',
    effector_id: 'eff-pantsir-57e6',
    spectral_role: 'point_defence_gun_missile',
    performance_ref: 'SOVEREIGN_CORE_BOUNDARY',
    open_sources: ['CSIS Missile Threat Pantsir-S1', 'Ukraine/Red Sea Pantsir combat reporting 2022-2026', 'KBP public Pantsir-S1 data'],
    confidence: 'confirmed',
  },
];

export function getIadsThreat(id: string): IadsThreatEntry | undefined {
  return IADS_THREAT_CATALOGUE.find((entry) => entry.id === id);
}

// ─────────────────────────────────────────────────────────────────────────────
// SOVEREIGN CORE BOUNDARY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SOVEREIGN_CORE_BOUNDARY
 *
 * Performance characteristics for the platforms above — the values that would
 * let the engine compute real engagement outcomes — are controlled technical
 * data. They are NOT stored in this open module.
 *
 * In the accredited environment, implement a resolver that maps each
 * platform id to its performance record from the accredited catalogue,
 * behind this same interface. SPECTRAL features call resolvePerformance()
 * and receive whatever the accredited build provides; in the open build it
 * returns the boundary marker so everything runs without controlled data.
 */
export interface PlatformPerformance {
  platform_id: string;
  resolved: boolean;
  note: string;
  name?: string;
  rcs_class?: 'very_low' | 'low' | 'medium' | 'high';
  sensor_detection_range_km?: Partial<Record<string, number>>;
  defeat_matrix_pk?: number | null;
  confidence?: 'curated' | 'estimated' | 'derived';
  source_notes?: string[];
}

export interface PlatformPerformanceResolver {
  resolvePerformance(platformId: string): PlatformPerformance;
}

export {
  getActivePerformanceResolver,
  openBuildPerformanceResolver,
  trainingCataloguePerformanceResolver,
} from '@/lib/moat/catalogue-performance-resolver';
