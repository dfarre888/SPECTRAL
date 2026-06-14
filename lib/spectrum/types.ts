/**
 * Spectrum Intelligence — core type system
 * ----------------------------------------
 * Every platform (Red threat or Blue effector) has a set of "capabilities".
 * Each capability occupies a region of the electromagnetic spectrum, expressed
 * either in frequency (RF / GNSS / radar) or wavelength (EO/IR / CBRN).
 *
 * The render engine converts everything to a single axis value at draw time,
 * so a 2.4 GHz datalink and a 1.06 µm laser can be reasoned about with the
 * same primitives.
 */

/** Which physical canvas a capability belongs on. */
export type SpectrumAxis = 'rf' | 'gnss' | 'eo_ir' | 'cbrn';

/** Functional layer — drives colour and lane within a canvas. */
export type SpectrumLayer =
  | 'comms'        // control / video / datalink / SATCOM / cellular
  | 'navigation'   // GNSS L-band
  | 'radar'        // detection / fire-control / SAR
  | 'eo_ir'        // optical & infrared sensing
  | 'cbrn';        // ionising — radiological payload detection only

/** Side in the engagement model. */
export type Side = 'red' | 'blue' | 'neutral';

/** What a capability *does*. */
export type CapabilityFunction =
  // Red (threat) functions — things the drone uses / emits / depends on
  | 'control'        // operator → aircraft command link
  | 'video'          // aircraft → operator FPV / ISR downlink
  | 'telemetry'      // low-rate health / position downlink
  | 'datalink'       // generic C2 / mesh / SATCOM / cellular
  | 'navigation'     // GNSS dependency
  | 'sensor'         // EO/IR imaging payload
  | 'laser'          // active laser designator / rangefinder
  | 'radar_emit'     // onboard radar
  // Blue (effector) functions — things the counter-system does
  | 'jam_control'
  | 'jam_video'
  | 'jam_gnss'
  | 'jam_datalink'
  | 'spoof_gnss'
  | 'takeover'       // RF-cyber protocol takeover
  | 'hpm'            // high-power microwave (wideband — attacks electronics)
  | 'laser_defeat'   // high-energy laser
  | 'detect_rf'      // passive RF direction-finding
  | 'detect_radar'   // detection radar
  | 'detect_eo_ir'   // EO/IR detection
  | 'detect_cbrn';   // radiological payload detection

/** Resistance / effect qualifiers attached to a capability. */
export type DefeatResistance =
  | 'rf_jamming_low' | 'rf_jamming_med' | 'rf_jamming_high'
  | 'gnss_jamming_low' | 'gnss_jamming_med' | 'gnss_jamming_high'
  | 'gnss_spoofing_low' | 'gnss_spoofing_med' | 'gnss_spoofing_high'
  | 'hpm_vulnerable' | 'kinetic_vulnerable'
  | 'gnss_denied_capable'   // can still operate with GNSS denied
  | 'rf_silent';            // emits no RF at all (fibre-optic / fully autonomous)

/**
 * A single spectrum capability.
 * Frequency fields are in Hz; wavelength fields are in micrometres (µm).
 * A capability provides EITHER freq bounds OR wavelength bounds (the axis decides).
 * Point emissions (e.g. a laser line) set low === high.
 */
export interface SpectrumCapability {
  id: string;
  platform_id: string;
  variant?: string | null;          // ties to a platform_variant (evolution arc)
  axis: SpectrumAxis;
  layer: SpectrumLayer;
  fn: CapabilityFunction;
  label: string;                     // human label, e.g. "GNSS L1 (GPS/Galileo)"
  freq_low_hz?: number | null;
  freq_high_hz?: number | null;
  wavelength_low_um?: number | null;
  wavelength_high_um?: number | null;
  power_dbm?: number | null;         // emission / jam power (optional intensity dim)
  range_km?: number | null;          // effective range (optional intensity dim)
  defeat_resistance?: DefeatResistance[];
  note?: string | null;
  /** true when this row was auto-derived from legacy library fields, not curated. */
  derived?: boolean;
}

/** Platform group (DoD UAS categorisation), null for Blue effectors. */
export type UASGroup = 1 | 2 | 3 | 4 | 5 | null;

/** Provenance / confidence of the platform record. */
export type SourceConfidence = 'curated' | 'derived' | 'estimated';

/** GNSS dependency level — determines jamming/spoofing defeat viability. */
export type GnssDependency = 'high' | 'medium' | 'low' | 'none';

export interface Platform {
  id: string;
  name: string;
  variant_label?: string | null;
  side: Side;
  group?: UASGroup;
  origin?: string | null;            // nation / manufacturer
  category?: string | null;          // 'OWA', 'FPV', 'MALE', 'HPM', 'jammer', ...
  role?: string | null;              // short role descriptor
  // headline specs (optional, shown in dossier)
  mass_kg?: number | null;
  range_km?: number | null;
  speed_kmh?: number | null;
  ceiling_m?: number | null;
  warhead_kg?: number | null;
  length_m?: number | null;
  wingspan_m?: number | null;
  height_m?: number | null;
  unit_cost_usd?: number | null;
  ioc_year?: number | null;
  terminal_speed_kmh?: number | null;
  armor_piercing_mm?: number | null;
  engine_type?: string | null;
  // legacy / quick-reference fields used by the FALLBACK generator
  c2_uplink_mhz?: number | null;
  c2_downlink_mhz?: number | null;
  video_mhz?: number | null;
  gnss_used?: string[] | null;       // e.g. ['GPS','GLONASS']
  datalink_mhz?: number | null;
  satcom_band?: string | null;       // 'L' | 'Ku' | 'Ka'
  confidence?: SourceConfidence;
  intel_note?: string | null;
  // enriched OSINT fields — added post-deep-research
  year_introduced?: number | null;
  propulsion?: string | null;           // 'electric' | 'piston' | 'turboprop' | 'turbofan' | 'jet' | 'N/A'
  guidance_type?: string | null;        // navigation / seeker description
  defeat_note?: string | null;          // recommended defeat approach
  control_link_freq?: string | null;    // e.g. '2.4/5.8 GHz ISM' | 'Ku-band SATCOM' | 'fiber-optic'
  gnss_dependency?: GnssDependency | null;
  icon?: string | null;              // glyph or asset key
  capabilities?: SpectrumCapability[];
}

/** A generational variant for the evolution-arc view. */
export interface PlatformVariant {
  id: string;
  platform_id: string;
  variant: string;                   // 'gen0' ... 'gen4'
  label: string;
  effective_year?: number | null;
  summary?: string | null;
  capabilities: SpectrumCapability[];
  defeat_verdict?: 'rf_works' | 'rf_struggles' | 'hpm_only';
}

/* ----------------------------- ENGAGEMENT MODEL ----------------------------- */

export type OutcomeVerdict =
  | 'defeat_likely'
  | 'partial'
  | 'no_engagement'
  | 'detect_only';

export interface BandOverlap {
  axis: SpectrumAxis;
  layer: SpectrumLayer;
  redCapability: SpectrumCapability;
  blueCapability: SpectrumCapability;
  /** overlap region, in the unit native to the axis */
  lo: number;
  hi: number;
  unit: 'hz' | 'um';
}

export interface EngagementResult {
  verdict: OutcomeVerdict;
  headline: string;
  detail: string;
  overlaps: BandOverlap[];
  /** capabilities the threat retains that Blue cannot touch */
  uncovered: SpectrumCapability[];
  recommendations: string[];
  /**
   * Continuous effective coverage score 0–1 (defeat-resistance weighted).
   * 0 = no RF coverage, detect-only, or no-engagement.
   * 1 = all threat RF/GNSS dependencies fully defeatable with no hardening.
   * HPM uses 0.92 (band-agnostic electronic attack — not link-based).
   * Used by the adjudication engine as a higher-fidelity Pk input than
   * the 4-bucket verdict alone.
   */
  effectiveCoverage: number;
}

/* ----------------------------- RENDER MODEL ----------------------------- */

/** A drawable band, already projected onto pixel space by the engine. */
export interface DrawBand {
  capability: SpectrumCapability;
  side: Side;
  x: number;
  width: number;
  laneIndex: number;
  color: string;
  derived: boolean;
}

export interface AxisConfig {
  axis: SpectrumAxis;
  unit: 'hz' | 'um';
  /** domain in native units [min, max] */
  domain: [number, number];
  /** pixel range [left, right] */
  range: [number, number];
  /** tick definitions */
  ticks: { value: number; label: string }[];
}
