/**
 * SPECTRAL — GNSS / RF Denial Awareness (training layer)
 * Data schema — evidence-graded incident records.
 */

// ─────────────────────────────────────────────────────────────────────────────
// EVIDENCE GRADING — the spine of the whole module
// ─────────────────────────────────────────────────────────────────────────────

export type EvidenceGrade =
  | 'confirmed'    // telemetry, regulator finding, spectrum-authority data, operator disclosure
  | 'reported'     // stated in news / official statement but not technically substantiated
  | 'inferred'     // professional assessment of likely cause; not stated by any source
  | 'unknown';     // genuinely undetermined

export interface GradedClaim<T> {
  value: T;
  grade: EvidenceGrade;
  basis: string;             // WHY this grade — the specific evidence or lack of it
  source_ref: string | null; // citation if any
}

// ─────────────────────────────────────────────────────────────────────────────
// GNSS BANDS & CONSTELLATIONS — the factor vocabulary
// ─────────────────────────────────────────────────────────────────────────────

export type GnssBand =
  | 'GPS_L1'      // 1575.42 MHz — the most commonly affected
  | 'GPS_L2'      // 1227.60 MHz
  | 'GPS_L5'      // 1176.45 MHz
  | 'GLONASS_L1'  // ~1602 MHz
  | 'GLONASS_L2'  // ~1246 MHz
  | 'GALILEO_E1'  // 1575.42 MHz (overlaps GPS L1)
  | 'GALILEO_E5'  // 1191.795 MHz
  | 'BEIDOU_B1'   // 1561.098 MHz
  | 'BEIDOU_B2'   // 1207.14 MHz
  | 'control_link_2_4ghz'   // 2.4 GHz C2 link
  | 'control_link_900mhz'   // 900 MHz C2 link
  | 'control_link_5_8ghz'   // 5.8 GHz video/control
  | 'rtk_correction_link'   // the RTK correction datalink
  | 'unknown';

export const BAND_REFERENCE: Record<GnssBand, { label: string; centre_mhz: number | null; note: string }> = {
  GPS_L1:    { label: 'GPS L1',      centre_mhz: 1575.42, note: 'Civilian C/A code. Most consumer drones depend on this alone. Most commonly affected.' },
  GPS_L2:    { label: 'GPS L2',      centre_mhz: 1227.60, note: 'Used by survey/RTK receivers. L1+L2 dual-frequency improves jamming resistance.' },
  GPS_L5:    { label: 'GPS L5',      centre_mhz: 1176.45, note: 'Newer, higher power, more robust. Few consumer drones use it yet.' },
  GLONASS_L1:{ label: 'GLONASS L1',  centre_mhz: 1602.00, note: 'Russian constellation. Offset frequency from GPS L1 — survives some narrowband GPS jamming.' },
  GLONASS_L2:{ label: 'GLONASS L2',  centre_mhz: 1246.00, note: 'GLONASS second frequency.' },
  GALILEO_E1:{ label: 'Galileo E1',  centre_mhz: 1575.42, note: 'OVERLAPS GPS L1 — a jammer on L1 takes out both GPS L1 and Galileo E1 together.' },
  GALILEO_E5:{ label: 'Galileo E5',  centre_mhz: 1191.795, note: 'Galileo wideband signal — robust against narrowband interference.' },
  BEIDOU_B1: { label: 'BeiDou B1',   centre_mhz: 1561.098, note: 'Chinese constellation. Distinct from GPS L1 — adds diversity.' },
  BEIDOU_B2: { label: 'BeiDou B2',   centre_mhz: 1207.14, note: 'BeiDou second frequency.' },
  control_link_2_4ghz: { label: 'C2 link 2.4 GHz', centre_mhz: 2400, note: 'Command-and-control link, not positioning. Jamming this is loss-of-control, not loss-of-position.' },
  control_link_900mhz: { label: 'C2 link 900 MHz', centre_mhz: 900, note: 'Longer-range C2 link.' },
  control_link_5_8ghz: { label: 'C2 / video 5.8 GHz', centre_mhz: 5800, note: 'Video downlink and some control.' },
  rtk_correction_link: { label: 'RTK correction link', centre_mhz: null, note: 'The datalink carrying RTK corrections. If this drops, RTK degrades to standard GNSS — not a positioning loss by itself.' },
  unknown:   { label: 'Unknown / unstated', centre_mhz: null, note: 'No band information available for this incident.' },
};

export type Constellation = 'GPS' | 'GLONASS' | 'GALILEO' | 'BEIDOU' | 'QZSS' | 'multi' | 'unknown';

// ─────────────────────────────────────────────────────────────────────────────
// FAILURE-MODE CATEGORISATION — the taxonomy
// A drone/swarm failure is not always GNSS denial. Honest categorisation is
// what keeps the repository credible: the largest fully-investigated swarm loss
// in the world (Docklands 2023) was a WIND exceedance, not jamming.
// ─────────────────────────────────────────────────────────────────────────────

export type FailureFamily =
  | 'gnss_denial'          // jamming / spoofing / interference of positioning
  | 'environmental'        // wind, weather, density-altitude exceedance
  | 'human_factors'        // workload, decision-making, crew coordination, pressure
  | 'equipment_firmware'   // hardware fault, firmware, software defect
  | 'control_link'         // C2 / command link loss (not positioning)
  | 'procedural'           // process, checklist, training, currency gaps
  | 'undetermined';

export const FAILURE_FAMILY_REFERENCE: Record<FailureFamily, { label: string; description: string; example: string }> = {
  gnss_denial:        { label: 'GNSS denial',          description: 'Loss or corruption of satellite positioning via jamming, spoofing, or interference.', example: 'Suspected interference at urban drone shows.' },
  environmental:      { label: 'Environmental exceedance', description: 'Wind, weather, or density-altitude beyond the aircraft\u2019s published capability.', example: 'Docklands 2023 — wind at show altitude exceeded twice the aircraft limit.' },
  human_factors:      { label: 'Human factors',        description: 'Workload, situational awareness, crew coordination, cockpit gradient, or operational pressure.', example: 'Docklands 2023 — RPIC unaware of the GCS wind readout; negative cockpit gradient.' },
  equipment_firmware: { label: 'Equipment / firmware', description: 'Hardware fault, firmware defect, or software behaviour contributing to the failure.', example: 'Compass/EMI fault causing a fly-away.' },
  control_link:       { label: 'Control-link loss',    description: 'Loss of the command-and-control link (distinct from positioning).', example: 'Lost-link failsafe triggering RTH.' },
  procedural:         { label: 'Procedural / training', description: 'Gaps in process, checklists, currency, or training that allowed the failure.', example: 'Software-version training not assured before operations.' },
  undetermined:       { label: 'Undetermined',         description: 'Insufficient evidence to assign a family.', example: 'Cause never publicly established.' },
};

// ─────────────────────────────────────────────────────────────────────────────
// SPECTRUM PROFILE — the bands a platform OPERATED ON (defensive/awareness)
// This records what frequencies the system DEPENDS ON, so an operator can
// survey for interference and plan around their own vulnerabilities. It is a
// dependency map for self-protection, not a targeting catalogue.
// ─────────────────────────────────────────────────────────────────────────────

export interface SpectrumDependency {
  band: GnssBand;
  role: 'positioning' | 'positioning_correction' | 'command_control' | 'swarm_network' | 'video';
  // Was interference on THIS band confirmed in this incident?
  interference_on_band: GradedClaim<boolean>;
  note: string;
}

export interface SpectrumProfile {
  // Every RF dependency the platform operated on
  dependencies: SpectrumDependency[];
  // Did the operator run a pre-flight spectrum survey? (a key mitigation signal)
  spectrum_survey_conducted: boolean | null;
  survey_finding: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// FAILURE MODE — different signatures, different mitigations
// ─────────────────────────────────────────────────────────────────────────────

export type FailureMode =
  | 'jamming_broadband'     // noise across the band — denies positioning
  | 'jamming_narrowband'    // targeted single-frequency
  | 'spoofing'              // false signals — drone believes a wrong position (more dangerous)
  | 'adjacent_band_bleed'   // off-frequency emitter (cell tower, new carrier) bleeding into GNSS
  | 'rf_congestion'         // dense urban RF environment, no single source
  | 'control_link_loss'     // C2 link denied (not positioning)
  | 'correction_link_loss'  // RTK correction datalink dropped
  | 'onboard_fault'         // not interference at all — hardware/software
  | 'undetermined';

export const FAILURE_MODE_REFERENCE: Record<FailureMode, { label: string; signature: string; mitigation: string }> = {
  jamming_broadband:    { label: 'Broadband jamming', signature: 'All GNSS lost simultaneously across constellations; abrupt onset.', mitigation: 'Multi-constellation does NOT help (all bands hit). INS/IMU dead-reckoning and non-GNSS positioning (UWB, visual) are the only counters.' },
  jamming_narrowband:   { label: 'Narrowband jamming', signature: 'One band/constellation degraded; others may survive.', mitigation: 'Multi-constellation, multi-frequency receivers survive this well.' },
  spoofing:             { label: 'Spoofing', signature: 'Position fix holds but drifts to a false location; no obvious signal loss. Most dangerous — failsafes may not trigger.', mitigation: 'Spoofing detection (signal authentication, IMU cross-check, multi-antenna). Hardest to detect.' },
  adjacent_band_bleed:  { label: 'Adjacent-band bleed', signature: 'Localised to an area near a specific emitter; intermittent.', mitigation: 'Pre-flight RF survey; site selection away from high-power emitters; filtered front-ends.' },
  rf_congestion:        { label: 'RF congestion', signature: 'Degraded performance in dense urban environments; no single source.', mitigation: 'Site/time selection; RF survey; robust multi-constellation receivers.' },
  control_link_loss:    { label: 'C2 link loss', signature: 'Loss of command link; positioning may be intact. Drone enters lost-link failsafe.', mitigation: 'Redundant C2; well-configured lost-link RTH (which itself needs GNSS).' },
  correction_link_loss: { label: 'RTK correction loss', signature: 'RTK fix downgrades to standard GNSS accuracy; not a position loss.', mitigation: 'Operate within tolerance for standard-GNSS fallback; redundant correction source.' },
  onboard_fault:        { label: 'Onboard fault', signature: 'Single aircraft or non-RF-correlated pattern; not interference.', mitigation: 'Maintenance, firmware, pre-flight checks. Not an RF problem.' },
  undetermined:         { label: 'Undetermined', signature: 'Insufficient evidence to classify.', mitigation: 'N/A — treat with caution; assume worst case (broadband) for planning.' },
};

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM DEPENDENCY PROFILE — what the operator can actually change
// ─────────────────────────────────────────────────────────────────────────────

export type PositioningResilience =
  | 'gps_only'              // single constellation, single frequency — most vulnerable
  | 'multi_constellation'   // GPS+GLONASS+Galileo+BeiDou — survives narrowband
  | 'multi_freq'            // dual/triple frequency
  | 'rtk'                   // RTK corrections (accuracy, not jamming immunity)
  | 'ins_aided'             // INS/IMU dead-reckoning bridge
  | 'non_gnss_capable'      // UWB / visual / terrain — can operate GNSS-denied
  | 'unknown';

export interface PlatformProfile {
  drone_type: string;               // e.g. "show drone (swarm)", "DJI M350", "fixed-wing VTOL"
  category: 'show_swarm' | 'commercial_multirotor' | 'fixed_wing' | 'fpv' | 'enterprise_vtol' | 'other' | 'unknown';
  positioning_resilience: PositioningResilience[];
  swarm_size: number | null;        // for show incidents
}

// ─────────────────────────────────────────────────────────────────────────────
// ENVIRONMENT
// ─────────────────────────────────────────────────────────────────────────────

export interface IncidentEnvironment {
  location_name: string;
  country: string;
  lat: number | null;
  lng: number | null;
  environment_type: 'urban_dense' | 'urban' | 'suburban' | 'coastal' | 'rural' | 'airport_vicinity' | 'military_vicinity' | 'unknown';
  rf_density_note: string;          // qualitative — why this environment matters
  near_known_interference_zone: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// OUTCOME
// ─────────────────────────────────────────────────────────────────────────────

export interface IncidentOutcome {
  drones_affected: number | null;
  failsafe_behaviour: 'controlled_descent' | 'rth_attempted' | 'uncontrolled' | 'fly_away' | 'land_in_place' | 'mixed' | 'unknown';
  injuries: number;
  fatalities: number;
  property_damage: boolean;
  show_cancelled: boolean;
  regulator_action: string | null;
  description: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// THE INCIDENT RECORD — the core entity
// ─────────────────────────────────────────────────────────────────────────────

export interface GnssIncident {
  id: string;
  // Identity
  title: string;
  date: string;                     // ISO date or YYYY-MM
  event_context: string;            // "New Year's Eve show", "military exercise", etc.

  // Platform
  platform: PlatformProfile;

  // Environment
  environment: IncidentEnvironment;

  // CATEGORISATION — which failure family (or families) this belongs to.
  // Primary is the lead cause; contributing captures the others (e.g. Docklands
  // is primarily environmental, with human_factors and procedural contributing).
  failure_family_primary: FailureFamily;
  failure_family_contributing: FailureFamily[];

  // SPECTRUM — the bands this platform operated on (defensive dependency map)
  spectrum: SpectrumProfile;

  // THE GRADED CAUSAL CLAIMS — every one carries an evidence grade
  failure_mode: GradedClaim<FailureMode>;
  affected_bands: GradedClaim<GnssBand[]>;
  affected_constellations: GradedClaim<Constellation[]>;
  interference_source: GradedClaim<string>;   // "unauthorised jammer", "adjacent cell tower", etc.

  // Outcome (factual — usually well-reported)
  outcome: IncidentOutcome;

  // Mitigation
  mitigation_that_helped: string | null;
  mitigation_that_would_have_helped: string | null;

  // Provenance
  sources: IncidentSource[];
  overall_confidence: EvidenceGrade;   // the LOWEST grade among the causal claims
  analyst_notes: string;

  created_at: string;
  updated_at: string;
}

export interface IncidentSource {
  type: 'news' | 'regulator' | 'operator_statement' | 'spectrum_authority' | 'academic' | 'ntsb_atsb' | 'other';
  title: string;
  url: string | null;
  reliability: 'primary' | 'secondary' | 'tertiary';
  accessed: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS OUTPUT TYPES — respects evidence grade
// ─────────────────────────────────────────────────────────────────────────────

export interface BandFrequencyAnalysis {
  band: GnssBand;
  label: string;
  centre_mhz: number | null;
  // Counted SEPARATELY by grade — never blended
  confirmed_count: number;
  reported_count: number;
  inferred_count: number;
  total_mentions: number;
  // Honest headline: only confirmed+reported are "evidenced"
  evidenced_count: number;
}

export interface FailureModeAnalysis {
  mode: FailureMode;
  label: string;
  confirmed_count: number;
  reported_count: number;
  inferred_count: number;
  total: number;
}

export interface PlatformVulnerabilityAnalysis {
  category: string;
  incident_count: number;
  total_drones_affected: number;
  most_common_resilience_gap: PositioningResilience | null;
}

export interface AnalyticsSummary {
  total_incidents: number;
  date_range: { earliest: string; latest: string };
  // The honest caveat, computed
  confirmed_cause_pct: number;       // % of incidents with a confirmed failure mode
  band_analysis: BandFrequencyAnalysis[];
  failure_mode_analysis: FailureModeAnalysis[];
  platform_analysis: PlatformVulnerabilityAnalysis[];
  total_injuries: number;
  total_fatalities: number;
  // The key insight the tool surfaces that others don't
  key_findings: string[];
  // Categorisation breakdown — which failure families, primary vs contributing
  family_analysis: {
    family: string; primary: number; contributing: number; total_involvement: number;
  }[];
  // Spectrum dimension — operating bands + confirmed interference + survey efficacy
  spectrum_analysis: {
    surveys_run: number;
    surveys_that_correctly_cleared: number;
    band_dependencies: {
      band: string; label: string; operated_on: number;
      interference_confirmed: number; interference_reported: number; interference_inferred: number;
    }[];
  };
}
