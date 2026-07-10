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

  // ── Taipan Strike 26 — GBAD CEA/SM-2 prototype (added 2026-07-09) ──────────

  {
    id: 'AUS-GBAD-CEA-SM2',
    display_name: 'GBAD SM-2 / CEA-Aegis (Prototype)',
    origin_country: 'Australia',
    category: 'Ground-Based Air and Missile Defence',
    role: 'blue_force',
    sovereign_program: 'CEA Technologies / Lockheed Martin / Exercise Taipan Strike 26 / 2026 NDS IAMD',
    status: 'trials',
    open_source_summary:
      'Prototype Australian ground-based integrated air and missile defence (IAMD) system. ' +
      'CEA Technologies CEAFAR2-L active phased array radar (sovereign Australian sensor) integrated with ' +
      'US Lockheed Martin Aegis Combat System weapon control and a Derringer trailer-mounted Expeditionary Launch System ' +
      '(ELS). Effector: Standard Missile-2 (SM-2) Block IIIB, up to 166 km range, already in Royal Australian Navy (RAN) service. ' +
      'Live-fired against a BQM-74E Chukar III target drone (simulating cruise missile profile) at Woomera Test Range, ' +
      'South Australia, during Exercise Taipan Strike 26 (June 2026). ' +
      'Described by ADF as "first of type live-fire test" of this CEA/Aegis/SM-2 land-based integration. ' +
      'Directed by 2026 National Defence Strategy and 2026 Integrated Investment Plan — both identify medium-range ' +
      'ground-based air defence as a priority, with capability acquisition decisions anticipated in 2026. ' +
      'ADF IAMD budget: $7B–$10B over next decade. ' +
      'Fills medium engagement layer (~40–166 km) above NASAMS/SHORAD and below any future BMD-capable upper tier. ' +
      'Sovereignty architecture: Australian sensor (CEAFAR2-L), RAN-inventory effector (SM-2), ' +
      'US Aegis fire control — Australian configuration authority on the sensor front-end. ' +
      'CEAFAR2-L pedigree: operational on all three RAN Hobart-class Aegis AWDs (HMAS Hobart, Brisbane, Sydney) ' +
      'since 2017 — land-based adaptation de-risked by existing naval integration. ' +
      'NOT rated vs hypersonic terminal phase (Kinzhal/Zircon class). ' +
      'Key personnel: Air Vice-Marshal Martin Nussio AM (Head Air Defence and Space Systems Division); ' +
      'Air Marshal Stephen Chappell (Chief of Air Force).',
    performance_ref: 'SOVEREIGN_CORE_BOUNDARY',
    open_sources: [
      'ABC News Australia, 9 Jul 2026 — Tom Lowrey, ADF missile interceptor test, SM-2 166 km confirmed',
      'Australian DoD press release, 9 Jul 2026 — Taipan Strike 26 first-of-type live fire (public)',
      'Deputy PM / Defence Minister Richard Marles statement, 9 Jul 2026',
      'Chief of Air Force Air Marshal Stephen Chappell statement — Taipan Strike 26 IAMD options',
      '2026 National Defence Strategy — medium-range ground-based air defence acceleration directed',
      '2026 Integrated Investment Plan — IAMD $7B–$10B 10-year programme; decisions anticipated 2026',
      'CEA Technologies CEAFAR2-L public product brief — Hobart-class AWD operational deployment',
      'Raytheon/Lockheed SM-2 Block IIIB public spec — range up to 166 km (90 nm), dual-mode seeker',
    ],
  },

  {
    id: 'AUS-RADAR-CEAFAR2L',
    display_name: 'CEA CEAFAR2-L (Sovereign AESA Radar)',
    origin_country: 'Australia',
    category: 'Active Phased Array Radar',
    role: 'enabler',
    sovereign_program: 'CEA Technologies / RAN Hobart-class AWD / Taipan Strike 26 GBAD prototype',
    status: 'in_service',   // in_service for naval role; trials status for land-based GBAD role
    open_source_summary:
      'Australian-sovereign Active Electronic Scanned Array (AESA) radar designed and manufactured ' +
      'by CEA Technologies (Canberra). L-band primary, multifunction architecture: simultaneous search, ' +
      'track, and fire control in a single aperture. Operationally deployed on all three RAN Hobart-class ' +
      'Air Warfare Destroyers (AWDs) — HMAS Hobart, Brisbane, Sydney — replacing legacy SPY-1 radar in the ' +
      'RAN Aegis configuration since 2017. ' +
      'Land-based variant integrated with US Aegis Combat System for the Taipan Strike 26 GBAD prototype ' +
      '(Woomera, June 2026). The CEAFAR2-L provided fire control cueing for the SM-2 engagement against a ' +
      'BQM-74E target drone. ' +
      'Represents the critical Australian sovereign sensor component within an allied (US Aegis) fire control ' +
      'architecture — the element that preserves Australian configuration authority and differentiates this ' +
      'from a straight US Aegis IBMS export. ' +
      'Note: in_service status reflects current RAN AWD operational role. Land-based GBAD role remains at ' +
      'prototype/trials stage as of July 2026.',
    performance_ref: 'SOVEREIGN_CORE_BOUNDARY',
    open_sources: [
      'CEA Technologies CEAFAR2-L public product brief — L-band AESA, multifunction, simultaneous S/T/FC',
      'RAN AWD Alliance — CEAFAR2-L operational on Hobart-class 2017–present',
      'ABC News Australia, 9 Jul 2026 — "Australian radar system" confirmed as cueing sensor',
      'Australian DoD press release, 9 Jul 2026 — CEA Technologies role confirmed',
      'Janes Naval Weapons Systems 2025 — CEAFAR2-L profile',
    ],
  },

  // ── JL-3 SLBM test (6 Jul 2026) — Australian detection sensors (added 2026-07-09) ──

  {
    id: 'AUS-RADAR-JORN',
    display_name: 'JORN — Jindalee Operational Radar Network',
    origin_country: 'Australia',
    category: 'Over-The-Horizon Radar (OTH)',
    role: 'enabler',
    sovereign_program: 'BAE Systems Australia / Northrop Grumman / Australian DST',
    status: 'in_service',
    open_source_summary:
      'Australian sovereign over-the-horizon (OTH) radar network operating in HF band (5–30 MHz) ' +
      'via ionospheric sky-wave propagation. Three sites: Longreach QLD, Alice Springs NT, Laverton WA. ' +
      'Coverage arc: 1,000–3,700 km from Australia — reaches South China Sea, western Pacific, ' +
      'Indian Ocean approaches, and Southeast Asia. ' +
      'Primary peacetime missions: maritime surveillance, aircraft detection, and early warning. ' +
      'Ballistic missile detection: demonstrated capability. ' +
      'Historical precedent: prototype JORN detected Chinese missile tests near Taiwan (1997) and relayed data to US. ' +
      'JL-3 Pacific test (6 Jul 2026): JORN geometry covers the SCS launch arc and was assessed to be in ' +
      'detection arc for the boost-phase launch plume. ' +
      'Pd vs SLBM launch from SCS: Assessed ~0.65 (ionospheric propagation dependency limits reliability ' +
      'compared to satellite IR at ~0.99; HF OTH variability noted). ' +
      'JORN is a DETECTION-ONLY system. Integration into a multilateral BMD early warning architecture ' +
      'is discussed in open-source Australian defence analysis — would require allied interoperability protocols. ' +
      'SOVEREIGN_CORE_BOUNDARY applies to all operational waveform parameters.',
    performance_ref: 'SOVEREIGN_CORE_BOUNDARY',
    open_sources: [
      'BAE Systems Australia — JORN public product brief',
      'DST (Defence Science Technology Group) — JORN capability overview (public)',
      'Wikipedia — Jindalee Operational Radar Network; 1997 Chinese missile detection confirmed',
      'Australian Defence Magazine — JORN and missile defence early warning potential',
      'Missile Defense Advocacy Alliance — Australia BMD cooperation; JORN noted as EW asset',
      'Arms Control Association — US/allied BMD in Asia-Pacific; JORN integration potential',
    ],
  },

  {
    id: 'AUS-RADAR-CBAND-EXMOUTH',
    display_name: 'C-Band Space Surveillance Radar — NCS Harold E. Holt (Exmouth)',
    origin_country: 'Australia',
    category: 'Space Surveillance Radar',
    role: 'enabler',
    sovereign_program: 'US Space Force / Australian DoD — Joint Defence Facility',
    status: 'in_service',
    open_source_summary:
      'C-band space surveillance radar at Naval Communication Station Harold E. Holt (NCS HEH), ' +
      'North West Cape, Exmouth, Western Australia (~21.8°S 114.2°E). ' +
      'Joint Australian/US facility. Operating frequency: C-band (~5.4–5.9 GHz). ' +
      'Mission: provides southern hemisphere coverage for the US Space Surveillance Network (SSN) — ' +
      'resident space object catalogue maintenance, space object identification (SOI), and special-event tracking. ' +
      'Capability: tracks hundreds of space objects per day including debris, satellites, and ballistic reentry bodies. ' +
      'History: radar originated at NASA Carnarvon tracking station (1963), subsequently operated from Antigua ' +
      'for US launch telemetry, relocated to Exmouth and reached Full Operational Capability (FOC) March 2017. ' +
      'Relevance to JL-3 Pacific test (6 Jul 2026): impact point ~300 km east of Tonga falls within ' +
      'C-band SSR tracking geometry from Exmouth for terminal and post-impact phase. ' +
      'Pd vs ballistic reentry body in southern hemisphere arc: Assessed ~0.85 for terminal phase tracking. ' +
      'Data feeds into US Space Surveillance Network and can cue allied BMD assets. ' +
      'DETECTION-ONLY system. No defeat capability.',
    performance_ref: 'SOVEREIGN_CORE_BOUNDARY',
    open_sources: [
      'Australia Defence Ministers — Space Surveillance Radar reaches FOC, 7 Mar 2017 (public release)',
      'AFSPC (Air Force Space Command) — C-Band Holt Radar one year on, 2017',
      'Wikipedia — NCS Harold E. Holt; C-band radar mission description',
      'Raytheon Australia — We Are Space; Exmouth C-band SSR contribution to space domain awareness',
      'Nautilus Institute — NCS Harold E. Holt (North West Cape) facility analysis',
    ],
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

  // ── PLA Navy — JL-3 SLBM (Pacific test 6 Jul 2026) — added 2026-07-09 ───────
  // NOTE: JL-3 is NOT an air defence system — it is a strategic offensive SLBM.
  // Included here to support SPECTRAL Red/Blue Arena strategic threat modelling,
  // Conflict Intel module, and the critical training lesson that NO current ADF
  // system can defeat an ICBM/SLBM-class threat (Pk = 0 across all organic systems).
  // The capability gap IS the lesson.

  {
    id: 'cn-jl3-slbm-threat',
    display_name: 'JL-3 SLBM (CSS-N-14 Mod) — PLA Navy strategic threat',
    // No sam_profile_id — SLBM is a strategic offensive system, not an air-defence node
    spectral_role: 'strategic_slbm_pla_navy',
    performance_ref: 'SOVEREIGN_CORE_BOUNDARY',
    open_sources: [
      'USNI News, 6 Jul 2026 — China tests SLBM, kicks off annual exercise with Russia',
      'The Warzone (TWZ), 6 Jul 2026 — China SLBM test in Pacific (analysis)',
      'CSIS Missile Threat — JL-3 SLBM Pacific test Jul 2026 analysis',
      'Janes, Jul 2026 — Special report Chinese SLBM undersea nuclear deterrent',
      'US State Department, 6 Jul 2026 — China launches nuclear-capable ballistic missile (statement)',
      'GlobalSecurity.org — JL-3 / JL-2C specification profile',
      'Missile Defense Advocacy — JL-3 range, MIRV, guidance (OSINT public)',
    ],
    confidence: 'assessed',  // Type unconfirmed JL-2A vs JL-3; analysts assess JL-3 from Type 094A context
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
