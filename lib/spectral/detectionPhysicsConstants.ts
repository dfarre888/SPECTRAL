/**
 * SPECTRAL — Detection Physics Constants
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 *
 * All RCS values in this file are OSINT PLANNING NOMINALS derived from:
 *  • Published geometry (wingspan, fuselage dimensions, mass)
 *  • Known construction materials (composite, carbon fibre, metal)
 *  • Open academic studies on UAS RCS at X/C/S-band
 *  • Conflict-derived detection-range evidence (Ukraine 2022–2025 reporting)
 *  • Shape-class inference from published radar engineering literature
 *    (Skolnik, Stimson, IEEE Transactions on Aerospace)
 *
 * NONE of these are measured signature data.
 * Real measured signatures are SOVEREIGN_CORE_BOUNDARY — resolved in the
 * accredited environment only. The open build must never contain them.
 */

// ─── Physical constants ────────────────────────────────────────────────────────
export const EARTH_RADIUS_M  = 6_371_000;
export const REFRACTION_K    = 4 / 3;           // standard 4/3 effective Earth radius
export const RADAR_HORIZON_K = 4.12;            // km per sqrt(m) — standard formula

// ─── SNR → Pd logistic mapping ────────────────────────────────────────────────
export const SNR_THRESHOLD_DB  = 13;    // nominal detection threshold (dB above noise)
export const SNR_LOGISTIC_A    = 0.35;  // steepness: +3dB ≈ Pd 0.50, +10dB ≈ Pd 0.95

// ─── Terrain sampling ─────────────────────────────────────────────────────────
export const LOS_SAMPLE_STEP_M = 150;   // profile sample spacing (m)

// ─── Pd bands — route colouring and optimiser threshold ───────────────────────
export const PD_BANDS = [
  { max: 0.05, level: 'undetected', colour: '#22c55e' },   // green
  { max: 0.20, level: 'low',        colour: '#a3e635' },   // lime
  { max: 0.45, level: 'moderate',   colour: '#fbbf24' },   // amber
  { max: 0.70, level: 'high',       colour: '#f97316' },   // orange
  { max: 1.01, level: 'detected',   colour: '#ef4444' },   // red
] as const;

export const PD_LAUNCH_THRESHOLD = 0.45;   // optimiser must route below this

// ─────────────────────────────────────────────────────────────────────────────
// RCS TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Four-facet aspect-dependent RCS model (m²).
 *   nose  — front-on (lowest for most aircraft; dominant scatterer: camera/inlet)
 *   beam  — side-on (largest physical cross-section; dominant scatterer: wing/fuselage)
 *   tail  — rear aspect (engine exhaust/prop; second highest)
 *   top   — top-down (used when radar depression angle > 45°; wing planform area)
 *
 * For ground-based radars at tactical ranges, the depression angle from the
 * target down to the radar antenna is typically 1–10° for distant threats and
 * 20–60° for close-in engagements. The aspectRcs() function blends facets
 * based on both bearing aspect and depression angle.
 */
export interface RcsFacets {
  nose: number;
  beam: number;
  tail: number;
  top:  number;
}

/**
 * A platform's RCS catalogue entry.
 * rcs_ref distinguishes open OSINT nominals from boundary-pinned real signatures.
 */
export interface PlatformRcsEntry {
  facets:       RcsFacets;
  /** Boundary marker — 'OSINT_NOMINAL' in open build; 'SOVEREIGN_CORE_BOUNDARY' for
   *  platforms where real measurement data exists and must be resolved server-side. */
  rcs_ref:      'OSINT_NOMINAL' | 'SOVEREIGN_CORE_BOUNDARY';
  /** Short description of derivation basis for training transparency. */
  osint_basis:  string;
  /** Confidence in the nominal values as planning approximations. */
  confidence:   'high' | 'medium' | 'low';
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY FALLBACK DEFAULTS
// Used when a platform ID is not found in PLATFORM_RCS_CATALOGUE.
// ─────────────────────────────────────────────────────────────────────────────

export type RcsCategoryKey =
  | 'micro_uas'       // <1 kg (DJI Mavic class, FPV)
  | 'small_uas'       // 1–15 kg (tactical ISR, small LM)
  | 'medium_uas'      // 15–200 kg (Orlan, OWA)
  | 'large_uas'       // 200–2000 kg (MALE UCAV, larger OWA)
  | 'hale_uas'        // >2000 kg (HALE, heavy MALE)
  | 'cruise_missile'  // LACM (generic — not LO)
  | 'lo_cruise_missile' // Low-observable LACM
  | 'stealth_ucav'    // Flying-wing VLO UCAV
  | 'fast_jet';       // manned fighter class (for reference)

export const RCS_CATEGORY_DEFAULTS: Record<RcsCategoryKey, RcsFacets> = {
  micro_uas:         { nose: 0.005, beam: 0.020, tail: 0.008, top: 0.014 },
  small_uas:         { nose: 0.02,  beam: 0.10,  tail: 0.04,  top: 0.07  },
  medium_uas:        { nose: 0.08,  beam: 0.50,  tail: 0.20,  top: 0.35  },
  large_uas:         { nose: 0.40,  beam: 3.50,  tail: 1.50,  top: 2.50  },
  hale_uas:          { nose: 0.80,  beam: 7.00,  tail: 3.00,  top: 5.00  },
  cruise_missile:    { nose: 0.08,  beam: 0.60,  tail: 0.25,  top: 0.40  },
  lo_cruise_missile: { nose: 0.04,  beam: 0.25,  tail: 0.10,  top: 0.15  },
  stealth_ucav:      { nose: 0.008, beam: 0.07,  tail: 0.035, top: 0.022 },
  fast_jet:          { nose: 1.00,  beam: 8.00,  tail: 4.00,  top: 6.00  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM RCS CATALOGUE
//
// Named entries for every SPECTRAL platform, keyed by platform ID.
// Values are OSINT planning nominals — NOT measured signatures.
// Platforms where real signatures exist and are militarily significant
// carry rcs_ref: 'SOVEREIGN_CORE_BOUNDARY'.
//
// OSINT BASIS METHODOLOGY:
//   Physical cross-section:  wingspan × fuselage depth (beam aspect estimate)
//   Construction factor:     composite/carbon fibre ≈ 0.3× metal equivalent
//   Shape factor:            delta-wing, cylinder, conventional — see notes
//   Conflict evidence:       detection ranges from Ukraine conflict reporting
//   Academic calibration:    IEEE/SPIE UAS RCS studies (2018–2024)
// ─────────────────────────────────────────────────────────────────────────────

export const PLATFORM_RCS_CATALOGUE: Record<string, PlatformRcsEntry> = {

  // ──────────────────────────────────────────────────────────────────────────
  // GROUP 1 — MICRO/COTS UAS (<3 kg)
  // Dominant scatterers at X-band: rotating blades (Doppler), gimbal housings.
  // Static RCS is very small; academic X-band studies put DJI-class at -20 to -13 dBsm.
  // ──────────────────────────────────────────────────────────────────────────

  'dji-mavic-3': {
    facets: { nose: 0.004, beam: 0.018, tail: 0.007, top: 0.012 },
    rcs_ref: 'OSINT_NOMINAL',
    osint_basis: 'Published academic X-band studies on DJI-class quads (~-18 dBsm beam). '
      + 'Folding arms reduce beam RCS vs fixed-arm designs. Gimbal+camera housing '
      + 'is dominant nose scatterer. AES-256 encrypted O3 link does not affect radar RCS.',
    confidence: 'high',
  },

  'skydio-x10d': {
    facets: { nose: 0.007, beam: 0.028, tail: 0.010, top: 0.019 },
    rcs_ref: 'OSINT_NOMINAL',
    osint_basis: 'Fixed-arm rigid quad, ~50% larger planform than Mavic 3. '
      + '6-camera navigation array slightly increases nose RCS vs folding designs.',
    confidence: 'medium',
  },

  'fpv-analog-5800': {
    facets: { nose: 0.001, beam: 0.007, tail: 0.001, top: 0.004 },
    rcs_ref: 'OSINT_NOMINAL',
    osint_basis: 'Carbon-fibre 5" X-frame (~200mm diagonal). Minimal metallic content. '
      + 'Rotating props are primary radar return; static RCS near noise floor of '
      + 'C-UAS radars at >1 km. Published radar trials show <-20 dBsm.',
    confidence: 'high',
  },

  'fpv-fibre-optic': {
    facets: { nose: 0.002, beam: 0.011, tail: 0.002, top: 0.007 },
    rcs_ref: 'OSINT_NOMINAL',
    osint_basis: 'Larger frame than 5" FPV (10–13" props, ~400mm diagonal) to carry '
      + 'fibre-optic spool. Slightly elevated RCS vs smaller FPV. '
      + 'Zero RF emissions — radar return is the ONLY electronic detection path.',
    confidence: 'medium',
  },

  'autel-evo-max-4t': {
    facets: { nose: 0.005, beam: 0.022, tail: 0.008, top: 0.016 },
    rcs_ref: 'OSINT_NOMINAL',
    osint_basis: 'Between DJI Mavic 3 and Skydio X10D in planform. Fixed-arm design, '
      + 'mmWave radar obstacle-avoidance module slightly increases nose RCS.',
    confidence: 'medium',
  },

  // ──────────────────────────────────────────────────────────────────────────
  // GROUP 2 — SMALL TACTICAL / LOITERING MUNITIONS (3–50 kg)
  // ──────────────────────────────────────────────────────────────────────────

  'switchblade-300': {
    facets: { nose: 0.002, beam: 0.014, tail: 0.005, top: 0.008 },
    rcs_ref: 'OSINT_NOMINAL',
    osint_basis: '0.6m deployed wingspan, tube-launched folded-fin design. Very small '
      + 'cross-section; electrically driven pusher prop. Matches "micro-LM" class '
      + 'in academic RCS groupings (~-17 dBsm).',
    confidence: 'medium',
  },

  'altius-600': {
    facets: { nose: 0.003, beam: 0.018, tail: 0.006, top: 0.010 },
    rcs_ref: 'OSINT_NOMINAL',
    osint_basis: 'Tube-launched, 5.4 kg. Slightly larger than Switchblade 300 '
      + '(longer fuselage for modular payload bay). Carbon fibre / composite.',
    confidence: 'low',
  },

  'switchblade-600': {
    facets: { nose: 0.020, beam: 0.120, tail: 0.042, top: 0.072 },
    rcs_ref: 'OSINT_NOMINAL',
    osint_basis: '1.3m wingspan, 22.7 kg. Significantly larger than 300-class. '
      + 'Composite/glass-fibre construction. Anti-armour role suggests conventional '
      + 'fixed-wing geometry similar to Warmate at slightly larger scale.',
    confidence: 'medium',
  },

  'kargu-2': {
    facets: { nose: 0.012, beam: 0.040, tail: 0.012, top: 0.030 },
    rcs_ref: 'OSINT_NOMINAL',
    osint_basis: 'Hexrotor design, ~60cm rotor-tip-to-tip diameter, 7 kg. '
      + 'Roughly 2× DJI Mavic 3 planform. Metallic components in payload housing '
      + 'elevate RCS above all-composite equivalents.',
    confidence: 'medium',
  },

  'warmate': {
    facets: { nose: 0.009, beam: 0.052, tail: 0.014, top: 0.033 },
    rcs_ref: 'OSINT_NOMINAL',
    osint_basis: '~1.4m span delta/conventional wing LM, 5.7 kg, electric pusher. '
      + 'Thin wing section and composite construction keep beam RCS low for wingspan. '
      + 'Warmate 5 (larger variant) would use medium_uas fallback.',
    confidence: 'medium',
  },

  'lancet-3': {
    facets: { nose: 0.010, beam: 0.075, tail: 0.021, top: 0.048 },
    rcs_ref: 'OSINT_NOMINAL',
    osint_basis: 'Tandem fixed-wing, ~1.2m span, 12 kg, electric (twin contra-rotating). '
      + 'Tandem-wing planform gives thin radar shadow; electric motor eliminates '
      + 'metallic engine/prop contribution at tail. One of the lowest-observable '
      + 'platforms in its mass class. Ukraine conflict: C-UAS radars require close '
      + 'range or cueing to reliably detect (~10–15 km at X-band).',
    confidence: 'high',
  },

  'zala-421-16em': {
    facets: { nose: 0.038, beam: 0.260, tail: 0.100, top: 0.180 },
    rcs_ref: 'OSINT_NOMINAL',
    osint_basis: '~2.8m span pusher-prop fixed-wing, 15 kg, fibre-glass/plastic. '
      + 'Similar to Orlan-10 but slightly smaller and lighter. Pusher prop + '
      + 'SIGINT antenna array are primary tail/top scatterers.',
    confidence: 'medium',
  },

  'orlan-10': {
    facets: { nose: 0.048, beam: 0.320, tail: 0.140, top: 0.220 },
    rcs_ref: 'OSINT_NOMINAL',
    osint_basis: '3.1m wingspan, 15 kg, piston pusher engine, fibre-glass/plastic. '
      + 'Pusher prop disc is dominant rear scatterer. Ukraine EW evidence: '
      + 'Bukovel-AD and Nota EW systems detect/engage at 10–30 km — consistent '
      + 'with ~0.3 m² beam RCS at X-band on their respective frequencies. '
      + 'Detected at 50+ km by Giraffe AMB (S-band, wider aperture).',
    confidence: 'high',
  },

  'hero-120': {
    facets: { nose: 0.020, beam: 0.110, tail: 0.038, top: 0.070 },
    rcs_ref: 'OSINT_NOMINAL',
    osint_basis: '~1.5m wingspan fixed-wing LM, 12.5 kg, composite. EO gimbal in nose '
      + 'is modest frontal scatterer. Optimised for low-altitude ingress rather '
      + 'than low observability.',
    confidence: 'low',
  },

  'shahed-101': {
    facets: { nose: 0.018, beam: 0.072, tail: 0.034, top: 0.046 },
    rcs_ref: 'OSINT_NOMINAL',
    osint_basis: '~1.0m span delta-wing OWA, 25 kg. Sheet-metal delta planform; '
      + 'small frontal area. Similar construction to Shahed-136 at ~40% scale. '
      + 'Jet/piston intake is dominant nose scatterer.',
    confidence: 'medium',
  },

  // ──────────────────────────────────────────────────────────────────────────
  // GROUP 2/3 TRANSITIONAL — MEDIUM OWA / LARGER LOITERING MUNITIONS (50–250 kg)
  // ──────────────────────────────────────────────────────────────────────────

  'shahed-131': {
    facets: { nose: 0.032, beam: 0.300, tail: 0.120, top: 0.210 },
    rcs_ref: 'OSINT_NOMINAL',
    osint_basis: '~2.0m span delta-wing OWA, 135 kg. Sheet metal/composite hybrid. '
      + 'Scaled from Shahed-136 at ~80% wingspan. Midsection intake visible '
      + 'from nose; delta planform gives moderate top-aspect RCS. '
      + 'Ukrainian short-range radars detect at 20–35 km ranges consistently.',
    confidence: 'high',
  },

  'shahed-136': {
    facets: { nose: 0.048, beam: 0.450, tail: 0.180, top: 0.320 },
    rcs_ref: 'OSINT_NOMINAL',
    osint_basis: '2.5m wingspan delta-wing, 200 kg, sheet-metal/composite. '
      + 'OSINT basis: Ukrainian Giraffe AMB detections at 40–60 km (S-band) '
      + 'and Oerlikon Skyshield/Gepard engagements at 4–8 km (X-band fire control). '
      + 'Delta planform: nose-on ingress is the most survivable aspect (smallest '
      + 'frontal cross-section ~0.05 m²); beam and top expose the 2.5m wingspan. '
      + 'Operational altitude 100–200m AGL — ground clutter dominates over RCS '
      + 'as primary detection challenge, not intrinsic signature.',
    confidence: 'high',
  },

  'shahed-238': {
    facets: { nose: 0.040, beam: 0.400, tail: 0.150, top: 0.280 },
    rcs_ref: 'OSINT_NOMINAL',
    osint_basis: 'Turbojet-powered variant of Shahed-136 delta-wing design. '
      + 'Jet intake adds to nose-aspect RCS vs piston Shahed-136; similar '
      + 'wing planform geometry. Significantly higher speed reduces time-in-radar-beam.',
    confidence: 'medium',
  },

  'iai-harop': {
    facets: { nose: 0.120, beam: 0.650, tail: 0.250, top: 0.400 },
    rcs_ref: 'OSINT_NOMINAL',
    osint_basis: '~3.0m wingspan LM, 135 kg, composite/fibreglass. Inverted-V tail '
      + 'design. Anti-radiation mission means it must manoeuvre toward emitters; '
      + 'low observability is secondary to guidance fidelity. Published geometry '
      + 'suggests MALE-class cross-section despite its LM role.',
    confidence: 'low',
  },

  'phoenix-ghost': {
    facets: { nose: 0.028, beam: 0.220, tail: 0.082, top: 0.140 },
    rcs_ref: 'OSINT_NOMINAL',
    osint_basis: 'OWA LM, 35 kg. Limited open-source geometry; estimated in '
      + 'Shahed-131 class by mass. Composite construction. Survivability through '
      + 'GPS-jamming-resistant navigation, not LO shaping.',
    confidence: 'low',
  },

  'ababil-3': {
    facets: { nose: 0.140, beam: 0.880, tail: 0.380, top: 0.620 },
    rcs_ref: 'OSINT_NOMINAL',
    osint_basis: '3.3m wingspan, 85 kg, conventional pusher-prop fixed-wing ISR. '
      + 'Metallic/composite hybrid, non-stealth design. Fuselage depth and '
      + 'wing chord give substantial beam RCS for its mass class.',
    confidence: 'medium',
  },

  // ──────────────────────────────────────────────────────────────────────────
  // GROUP 3/4 — MALE/HALE UCAV (200–6000 kg)
  // ──────────────────────────────────────────────────────────────────────────

  'forpost-r': {
    facets: { nose: 0.220, beam: 2.200, tail: 0.900, top: 1.600 },
    rcs_ref: 'OSINT_NOMINAL',
    osint_basis: 'IAI Searcher Mk II lineage, ~8m wingspan, 500 kg. '
      + 'Conventional twin-tail/pusher design with metallic undercarriage. '
      + 'Non-stealth ISR platform. Comparable to early-generation MALE class.',
    confidence: 'medium',
  },

  'bayraktar-tb2': {
    facets: { nose: 0.280, beam: 2.800, tail: 1.200, top: 1.800 },
    rcs_ref: 'OSINT_NOMINAL',
    osint_basis: '12m wingspan, 650 kg, twin-boom pusher, carbon-fibre/Kevlar/fibre-glass. '
      + 'Non-metallic construction reduces RCS by ~0.3× vs equivalent aluminium; '
      + 'twin booms and payload pod are dominant scatterers. Ukraine/Libya conflicts: '
      + 'TB2 detected by S-400 and Pantsir radars at 150–200 km (consistent with '
      + 'MALE-class signature ~1–3 m² beam). Tracked by S-band acquisition radars '
      + 'before entering short-range engagement zone.',
    confidence: 'high',
  },

  'tb3': {
    facets: { nose: 0.380, beam: 3.500, tail: 1.600, top: 2.500 },
    rcs_ref: 'OSINT_NOMINAL',
    osint_basis: '14m wingspan, 1450 kg, folding-wing carrier variant. Larger than TB2 '
      + 'in all dimensions. Similar composite construction; folded-wing hinges '
      + 'are metallic and contribute to joint-aspect RCS.',
    confidence: 'low',
  },

  'hermes-900': {
    facets: { nose: 0.380, beam: 3.800, tail: 1.600, top: 2.600 },
    rcs_ref: 'OSINT_NOMINAL',
    osint_basis: '15m wingspan, 1180 kg, V-tail MALE ISR, composite. V-tail slightly '
      + 'cleaner than conventional empennage (fewer corner reflectors). '
      + 'SAR and SIGINT payload pods are secondary scatterers.',
    confidence: 'medium',
  },

  'bayraktar-akinci': {  // id in SPECTRAL is 'akinci'
    facets: { nose: 0.850, beam: 7.000, tail: 3.500, top: 5.000 },
    rcs_ref: 'OSINT_NOMINAL',
    osint_basis: '20m wingspan, 5500 kg, twin-turboprop HALE UCAV. Large planform '
      + 'and twin engines dominate signature. Not designed for LO — '
      + 'survives through altitude, standoff range and EW systems.',
    confidence: 'medium',
  },

  'akinci': {
    facets: { nose: 0.850, beam: 7.000, tail: 3.500, top: 5.000 },
    rcs_ref: 'OSINT_NOMINAL',
    osint_basis: 'Same as akinci entry above (both IDs resolve the same platform).',
    confidence: 'medium',
  },

  'mq-9-reaper': {
    facets: { nose: 0.750, beam: 6.000, tail: 2.800, top: 4.200 },
    rcs_ref: 'OSINT_NOMINAL',
    osint_basis: '20m wingspan, 4760 kg, turboprop pusher, inverted-V tail. '
      + 'Conventional MALE aerodynamic design, not LO-optimised. '
      + 'Published open sources confirm MQ-9 detectable by modern integrated IADS '
      + 'at 250+ km acquisition range (consistent with ~4–8 m² beam at L/S-band). '
      + 'Relied on high altitude and permissive airspace, not stealth.',
    confidence: 'high',
  },

  'ch-4-rainbow': {
    facets: { nose: 0.480, beam: 4.500, tail: 2.000, top: 3.200 },
    rcs_ref: 'OSINT_NOMINAL',
    osint_basis: '18m wingspan, 1330 kg. MQ-9 Reaper lineage geometry. '
      + 'Conventional MALE — survives through altitude not LO shaping.',
    confidence: 'medium',
  },

  'wing-loong-ii': {
    facets: { nose: 0.650, beam: 5.500, tail: 2.500, top: 4.000 },
    rcs_ref: 'OSINT_NOMINAL',
    osint_basis: '20.5m wingspan, 4200 kg. GJ-2/Wing Loong II is near-identical '
      + 'to MQ-9 class in geometry. Conventional composite/metal construction.',
    confidence: 'medium',
  },

  'mohajer-10': {
    facets: { nose: 0.320, beam: 3.200, tail: 1.400, top: 2.200 },
    rcs_ref: 'OSINT_NOMINAL',
    osint_basis: '~200 kg MALE ISR/strike, ~16m wingspan per published images. '
      + 'Conventional twin-boom pusher design, metallic/composite. '
      + 'Iraq/Yemen conflict use: detected by Saudi/US IADS at medium ranges.',
    confidence: 'low',
  },

  // ──────────────────────────────────────────────────────────────────────────
  // CRUISE MISSILES / LACM
  // ──────────────────────────────────────────────────────────────────────────

  'kalibr-3m14': {
    facets: { nose: 0.090, beam: 0.700, tail: 0.280, top: 0.450 },
    rcs_ref: 'OSINT_NOMINAL',
    osint_basis: '~8m length, 3m pop-out wingspan, 2200 kg. Cylindrical body + '
      + 'pop-out folded wings; not a stealth design. '
      + 'Ukraine conflict: Ukrainian S-300, Buk-M1 and Gepard systems have engaged '
      + 'Kalibr at engagement ranges implying detection at 30–80 km — consistent '
      + 'with ~0.5–1.0 m² RCS at S/X-band. Primary survivability is terrain-following '
      + 'at 5–50m AGL, not signature reduction.',
    confidence: 'high',
  },

  'geran-2': {  // Russian designation for Shahed-136
    facets: { nose: 0.048, beam: 0.450, tail: 0.180, top: 0.320 },
    rcs_ref: 'OSINT_NOMINAL',
    osint_basis: 'Geran-2 is the Russian export designation of Shahed-136. '
      + 'Identical airframe — same facet values apply.',
    confidence: 'high',
  },

  'jassm-er': {
    facets: { nose: 0.035, beam: 0.220, tail: 0.090, top: 0.140 },
    rcs_ref: 'SOVEREIGN_CORE_BOUNDARY',
    osint_basis: 'AGM-158B JASSM-ER — low-observable LACM with faceted fuselage, '
      + 'inward-canted fins, and embedded engine intake. Open build uses geometry-'
      + 'inference nominal only. REAL measured signature: SOVEREIGN_CORE_BOUNDARY. '
      + 'Accredited resolver must substitute before any Pk calculation against '
      + 'specific threat systems.',
    confidence: 'low',
  },

  'storm-shadow-scalp': {
    facets: { nose: 0.042, beam: 0.280, tail: 0.110, top: 0.170 },
    rcs_ref: 'SOVEREIGN_CORE_BOUNDARY',
    osint_basis: 'Storm Shadow/SCALP-EG — contoured fuselage with dorsal WR87B intake '
      + 'shielded for LO. Open build nominal is geometry inference only. '
      + 'REAL measured signature: SOVEREIGN_CORE_BOUNDARY. Combat proven in '
      + 'Ukraine but specific detection ranges not open-source declassified.',
    confidence: 'low',
  },

  'taurus-kepd-350': {
    facets: { nose: 0.038, beam: 0.250, tail: 0.100, top: 0.160 },
    rcs_ref: 'SOVEREIGN_CORE_BOUNDARY',
    osint_basis: 'Taurus KEPD-350 — similar LO design philosophy to Storm Shadow. '
      + 'Open build nominal is geometry inference. REAL measured signature: SOVEREIGN_CORE_BOUNDARY.',
    confidence: 'low',
  },

  'kh-101': {
    facets: { nose: 0.055, beam: 0.420, tail: 0.160, top: 0.280 },
    rcs_ref: 'OSINT_NOMINAL',
    osint_basis: '5400 kg strategic LACM, ~5.4m length, 4.4m wingspan. '
      + 'Russian LO-shaped design with blended fuselage; not equivalent to Western '
      + 'LO standard. Ukraine IADS has engaged Kh-101 with mid-range SAMs — '
      + 'detection at 60–100 km reported (S-band), consistent with 0.2–0.6 m² class.',
    confidence: 'medium',
  },

  // ──────────────────────────────────────────────────────────────────────────
  // STEALTH UCAV — SOVEREIGN_CORE_BOUNDARY
  // Open-build values are geometry-inference ONLY from published silhouettes.
  // The RCS disparity between open estimate and real value is likely extreme.
  // ──────────────────────────────────────────────────────────────────────────

  's-70-okhotnik': {
    facets: { nose: 0.008, beam: 0.080, tail: 0.040, top: 0.025 },
    rcs_ref: 'SOVEREIGN_CORE_BOUNDARY',
    osint_basis: 'Sukhoi S-70 Okhotnik-B — 20t flying-wing VLO UCAV. '
      + 'Published silhouettes show blended flying-wing with shielded exhaust nozzle. '
      + 'Open nominal from radar-absorbing-material (RAM) flying-wing shape inference. '
      + 'ACTUAL signature: SOVEREIGN_CORE_BOUNDARY. These values should NOT be used '
      + 'for any ADF threat-assessment briefing — use accredited values only.',
    confidence: 'low',
  },

  'gj-11': {
    facets: { nose: 0.004, beam: 0.050, tail: 0.025, top: 0.015 },
    rcs_ref: 'SOVEREIGN_CORE_BOUNDARY',
    osint_basis: 'Hongdu GJ-11 Sharp Sword — 10t tailless delta flying-wing UCAV. '
      + 'B-2-inspired design with engine inlet shielded by leading-edge blending. '
      + 'Published air-show images show smooth outer mold line with no exposed '
      + 'control surfaces visible from below. Open nominal is geometry inference. '
      + 'ACTUAL signature: SOVEREIGN_CORE_BOUNDARY.',
    confidence: 'low',
  },

};

// ─────────────────────────────────────────────────────────────────────────────
// LOOKUP HELPER
//
// Call this instead of indexing PLATFORM_RCS_CATALOGUE directly.
// It handles:
//   1. Catalogue lookup by exact platform ID
//   2. Category fallback when platform not found
//   3. SOVEREIGN_CORE_BOUNDARY pass-through (open build returns open nominal;
//      accredited build resolver intercepts before this function is called
//      and substitutes real data — this function itself never has the real data)
// ─────────────────────────────────────────────────────────────────────────────

export function getRcsFacets(
  platformId: string,
  categoryFallback: RcsCategoryKey = 'medium_uas',
): { facets: RcsFacets; rcs_ref: PlatformRcsEntry['rcs_ref']; confidence: PlatformRcsEntry['confidence'] } {
  const entry = PLATFORM_RCS_CATALOGUE[platformId];
  if (entry) {
    return { facets: entry.facets, rcs_ref: entry.rcs_ref, confidence: entry.confidence };
  }
  // Platform not found — use category default, flag as low confidence
  return {
    facets: RCS_CATEGORY_DEFAULTS[categoryFallback],
    rcs_ref: 'OSINT_NOMINAL',
    confidence: 'low',
  };
}

/**
 * Returns true if the platform's real RCS is boundary-pinned.
 * Use this in the UI to show the SOVEREIGN_CORE_BOUNDARY marker on the
 * RCS selector panel for platforms where open-build values are geometry
 * inference only (LO cruise missiles, stealth UCAV).
 */
export function isPlatformRcsBoundaryPinned(platformId: string): boolean {
  return PLATFORM_RCS_CATALOGUE[platformId]?.rcs_ref === 'SOVEREIGN_CORE_BOUNDARY';
}