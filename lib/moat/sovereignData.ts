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
  // Intentionally opaque in the open build. Shape defined in the accredited env.
  platform_id: string;
  resolved: boolean;
  note: string;
}

export interface PlatformPerformanceResolver {
  resolvePerformance(platformId: string): PlatformPerformance;
}

export const openBuildPerformanceResolver: PlatformPerformanceResolver = {
  resolvePerformance(platformId: string): PlatformPerformance {
    return {
      platform_id: platformId,
      resolved: false,
      note: 'Performance data resides in the accredited catalogue. Implement resolver in the accredited environment under export-control review.',
    };
  },
};
