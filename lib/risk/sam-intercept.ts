// SPECTRAL — SAM Intercept Calculator
// CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
//
// Calculates probability of kill (Pk) for Surface-to-Air Missile systems
// engaging UAS/drone targets.
//
// Method:  Pk = P_acquire × P_track × P_guidance × P_fuze
// Training simplification:  Pk_adj = Pk_base × range_factor × alt_factor × ecm_factor
//
// All base Pk values from OSINT sources:
//   • Ukraine conflict battle-damage assessment (2022-2025)
//   • Jane's Air & Space — SAM Engagement Effectiveness
//   • DIA open assessment of Buk/Tor vs small UAS
//   • GlobalSecurity MANPADS technical survey
// No classified sources. All values suitable for UNCLASSIFIED training use.

// ─── Types ────────────────────────────────────────────────────────────────────

export type UasTargetCategory =
  | 'fpv'                 // <2 kg, low IR/RCS (<0.01 m²), 50–150 km/h, <200 m AGL
  | 'owa'                 // OWA Shahed/Geran class, 0.1–0.5 m² RCS, 150–200 km/h, 50–500 m
  | 'loitering_munition'  // Lancet/Kargu class, 1–5 kg, manoeuvring, 100–300 km/h
  | 'tactical_isr'        // Orlan-10 class, 1–5 m² RCS, 100–200 km/h, 100–3000 m AGL
  | 'male'                // TB2/MQ-9, 5–20 m² RCS, 200–450 km/h, 2000–9000 m
  | 'hale'                // RQ-4 class, >20 m² RCS, 400–650 km/h, 15 000+ m

export type SeekerGeneration =
  | 'gen1_ir'        // SA-7 uncooled IR — tail-chase only
  | 'gen2_ir'        // SA-14/SA-16 cooled — limited all-aspect
  | 'iir'            // SA-18/SA-24 IIR — two-colour, all-aspect, flare-resistant
  | 'sarh'           // Semi-active radar homing — needs illumination to terminal
  | 'active_radar'   // Active radar terminal — fire-and-forget
  | 'tvm'            // Track-via-missile (S-300P family) — uplink guidance + TVM

export type EcmLevel = 'none' | 'basic' | 'advanced' | 'military_grade'

export interface SamEngagementProfile {
  system_id: string
  nato_designation: string
  russian_designation: string
  seeker: SeekerGeneration
  /** Minimum slant range (m) */
  min_range_m: number
  /** Maximum slant range (m) */
  max_range_m: number
  /** Minimum engagement altitude (m AGL) */
  min_alt_m: number
  /** Maximum engagement altitude (m AGL) */
  max_alt_m: number
  /** Maximum target speed (km/h) the system can kinematically intercept */
  max_target_speed_kmh: number
  /** Minimum target speed (km/h) — below this, SARH/radar may lose track */
  min_target_speed_kmh: number
  /** Warhead NET explosive weight (kg) — larger = bigger lethal radius vs small UAS */
  warhead_kg: number
  /** Reaction time: detection-to-launch (seconds) */
  reaction_time_s: number
  /** Missiles ready-to-fire per launcher unit */
  missiles_ready: number
  /** Fire-control system uses GNSS */
  gnss_fc: boolean
  /** Datalink / mid-course update uses GNSS */
  gnss_datalink: boolean
  /**
   * Base Pk per UAS target category.
   * Single-shot, nominal range/altitude, no ECM, OSINT-derived.
   * 0 = cannot engage; 1.0 = theoretical certainty.
   */
  base_pk: Record<UasTargetCategory, number>
  uas_notes: string
}

export interface SamInterceptInput {
  system_id: string
  target_category: UasTargetCategory
  /** Slant range from launcher to target at engagement (m) */
  slant_range_m: number
  /** Target altitude AGL (m) */
  target_alt_m: number
  ecm_level: EcmLevel
  /** Number of missiles in salvo (default 1) */
  salvo_count?: number
}

export interface SamInterceptResult {
  system_id: string
  nato_designation: string
  target_category: UasTargetCategory
  in_envelope: boolean
  pk_single: number
  pk_salvo: number
  salvo_count: number
  range_factor: number
  altitude_factor: number
  ecm_factor: number
  engagement_notes: string[]
  recommended_response: string
}

// ─── Range Factor ─────────────────────────────────────────────────────────────
// Pk is nominal in the 15–80 % range zone.
// Falls off toward minimum and maximum range limits.

function rangeFactor(slant_range_m: number, sys: SamEngagementProfile): number {
  const { min_range_m, max_range_m } = sys
  if (slant_range_m < min_range_m || slant_range_m > max_range_m) return 0
  const nominal_low = min_range_m + (max_range_m - min_range_m) * 0.15
  const nominal_high = max_range_m * 0.80
  if (slant_range_m >= nominal_low && slant_range_m <= nominal_high) return 1.0
  if (slant_range_m < nominal_low) {
    return 0.60 + 0.40 * ((slant_range_m - min_range_m) / (nominal_low - min_range_m))
  }
  // Long-range tail
  return 1.0 - 0.50 * ((slant_range_m - nominal_high) / (max_range_m - nominal_high))
}

// ─── Altitude Factor ───────────────────────────────────────────────────────────
// Below 2× min altitude → ground clutter zone → tracking degrades.

function altitudeFactor(target_alt_m: number, sys: SamEngagementProfile): number {
  const { min_alt_m, max_alt_m } = sys
  if (target_alt_m < min_alt_m || target_alt_m > max_alt_m) return 0
  if (target_alt_m > max_alt_m * 0.85) {
    return 1.0 - 0.40 * ((target_alt_m - max_alt_m * 0.85) / (max_alt_m * 0.15))
  }
  if (target_alt_m < min_alt_m * 2) return 0.70  // ground clutter penalty
  return 1.0
}

// ─── ECM Resistance ───────────────────────────────────────────────────────────
// SARH most vulnerable — needs radar illumination on target.
// Active radar and IIR most resistant.

const ECM_RESISTANCE: Record<SeekerGeneration, Record<EcmLevel, number>> = {
  gen1_ir:      { none: 1.00, basic: 0.85, advanced: 0.50, military_grade: 0.25 },
  gen2_ir:      { none: 1.00, basic: 0.90, advanced: 0.65, military_grade: 0.40 },
  iir:          { none: 1.00, basic: 0.95, advanced: 0.75, military_grade: 0.55 },
  sarh:         { none: 1.00, basic: 0.70, advanced: 0.40, military_grade: 0.20 },
  active_radar: { none: 1.00, basic: 0.90, advanced: 0.70, military_grade: 0.45 },
  tvm:          { none: 1.00, basic: 0.80, advanced: 0.55, military_grade: 0.30 },
}

// ─── Salvo Pk ─────────────────────────────────────────────────────────────────
// Assumes statistically independent single-shot events (conservative approximation).
// Pk(salvo) = 1 − (1 − Pk_single)^n

export function salvoFk(pk_single: number, n_missiles: number): number {
  return parseFloat((1 - Math.pow(1 - pk_single, n_missiles)).toFixed(3))
}

// ─── Master Calculation ────────────────────────────────────────────────────────

export function computeSamIntercept(
  input: SamInterceptInput,
  profiles: SamEngagementProfile[],
): SamInterceptResult | null {
  const sys = profiles.find(p => p.system_id === input.system_id)
  if (!sys) return null

  const { target_category, slant_range_m, target_alt_m, ecm_level } = input
  const salvo = input.salvo_count ?? 1

  const rf = rangeFactor(slant_range_m, sys)
  const af = altitudeFactor(target_alt_m, sys)
  const ef = ECM_RESISTANCE[sys.seeker][ecm_level]
  const in_envelope = rf > 0 && af > 0

  const pk_single_raw = sys.base_pk[target_category] * rf * af * ef
  const pk_single = parseFloat(Math.min(pk_single_raw, 0.98).toFixed(3))
  const pk_salvo = salvoFk(pk_single, salvo)

  const notes: string[] = []
  if (!in_envelope) notes.push('Target outside engagement envelope — do not engage')
  if (af === 0.70) notes.push('Ground clutter zone — radar track degraded')
  if (target_category === 'fpv') notes.push('Low RCS / minimal IR signature — seeker acquisition marginal')
  if (target_category === 'owa' && sys.seeker === 'sarh') {
    notes.push('Slow OWA targets challenge SARH track stability in ground clutter')
  }
  if (ecm_level !== 'none') {
    notes.push(`ECM (${ecm_level}) applied — Pk multiplied by ${ef.toFixed(2)} (seeker: ${sys.seeker})`)
  }
  if (salvo > 1) {
    notes.push(`${salvo}-missile salvo Pk ${pk_salvo} vs single-shot ${pk_single}`)
  }
  if (sys.reaction_time_s > 30) {
    notes.push(`Long reaction time ${sys.reaction_time_s}s — FPV/OWA may manoeuvre through dead zone`)
  }

  const recommended_response = !in_envelope
    ? `Do not engage — target outside ${sys.nato_designation} envelope`
    : pk_single >= 0.60
    ? `Engage — ${sys.nato_designation} single-shot Pk ${pk_single}`
    : pk_single >= 0.30
    ? `Marginal — recommend ${salvo > 1 ? 'salvo maintained' : '2-missile salvo'} (salvo Pk ${salvoFk(pk_single, 2)})`
    : `Low Pk ${pk_single} — assign alternate C-UAS layer or priority asset`

  return {
    system_id: input.system_id,
    nato_designation: sys.nato_designation,
    target_category,
    in_envelope,
    pk_single,
    pk_salvo,
    salvo_count: salvo,
    range_factor: parseFloat(rf.toFixed(3)),
    altitude_factor: parseFloat(af.toFixed(3)),
    ecm_factor: parseFloat(ef.toFixed(3)),
    engagement_notes: notes,
    recommended_response,
  }
}

// ─── SAM Profiles ─────────────────────────────────────────────────────────────
// OSINT sources: Jane's, GlobalSecurity, Ukraine BDA 2022-2025, DIA open reporting.
// CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY

export const SAM_PROFILES: SamEngagementProfile[] = [

  // ═══ MANPADS FAMILY ═══════════════════════════════════════════════════════

  {
    system_id: 'sa-7-grail',
    nato_designation: 'SA-7 Grail',
    russian_designation: '9K32 Strela-2',
    seeker: 'gen1_ir',
    min_range_m: 500,   max_range_m: 4_200,
    min_alt_m: 50,      max_alt_m: 2_300,
    max_target_speed_kmh: 500, min_target_speed_kmh: 30,
    warhead_kg: 1.17,
    reaction_time_s: 15,
    missiles_ready: 1,
    gnss_fc: false, gnss_datalink: false,
    base_pk: {
      fpv: 0.02, owa: 0.08, loitering_munition: 0.05,
      tactical_isr: 0.18, male: 0.55, hale: 0.00,
    },
    uas_notes: 'Gen 1 uncooled IR — tail-chase only, minimal effectiveness vs low-IR UAS. HALE beyond altitude ceiling (~2300 m). Widely proliferated in export inventories.',
  },

  {
    system_id: 'sa-14-gremlin',
    nato_designation: 'SA-14 Gremlin',
    russian_designation: '9K34 Strela-3',
    seeker: 'gen2_ir',
    min_range_m: 500,   max_range_m: 4_500,
    min_alt_m: 30,      max_alt_m: 3_000,
    max_target_speed_kmh: 510, min_target_speed_kmh: 30,
    warhead_kg: 1.17,
    reaction_time_s: 13,
    missiles_ready: 1,
    gnss_fc: false, gnss_datalink: false,
    base_pk: {
      fpv: 0.04, owa: 0.15, loitering_munition: 0.10,
      tactical_isr: 0.28, male: 0.62, hale: 0.00,
    },
    uas_notes: 'Gen 2 cooled seeker — limited all-aspect capability vs prop-driven OWA. Better flare rejection than SA-7. Africa/Middle East export inventory.',
  },

  {
    system_id: 'sa-16-gimlet',
    nato_designation: 'SA-16 Gimlet',
    russian_designation: '9K310 Igla-1',
    seeker: 'gen2_ir',
    min_range_m: 500,   max_range_m: 5_200,
    min_alt_m: 10,      max_alt_m: 3_500,
    max_target_speed_kmh: 540, min_target_speed_kmh: 25,
    warhead_kg: 1.17,
    reaction_time_s: 12,
    missiles_ready: 1,
    gnss_fc: false, gnss_datalink: false,
    base_pk: {
      fpv: 0.08, owa: 0.22, loitering_munition: 0.15,
      tactical_isr: 0.38, male: 0.68, hale: 0.00,
    },
    uas_notes: 'IFF interrogator fitted — reduces blue-on-blue risk. Ukraine-confirmed OWA/Shahed kills at marginal ranges. Better low-altitude performance than SA-14.',
  },

  {
    system_id: 'sa-18-grouse',
    nato_designation: 'SA-18 Grouse',
    russian_designation: '9K38 Igla',
    seeker: 'iir',
    min_range_m: 500,   max_range_m: 5_200,
    min_alt_m: 10,      max_alt_m: 3_500,
    max_target_speed_kmh: 540, min_target_speed_kmh: 20,
    warhead_kg: 1.17,
    reaction_time_s: 10,
    missiles_ready: 1,
    gnss_fc: false, gnss_datalink: false,
    base_pk: {
      fpv: 0.14, owa: 0.35, loitering_munition: 0.22,
      tactical_isr: 0.50, male: 0.75, hale: 0.00,
    },
    uas_notes: 'IIR two-colour seeker — discrimination rejects most flares. Most capable Russian MANPADS vs OWA before Igla-S. Low IR signature of FPV remains limiting.',
  },

  {
    system_id: 'sa-24-grinch',
    nato_designation: 'SA-24 Grinch',
    russian_designation: '9K338 Igla-S',
    seeker: 'iir',
    min_range_m: 500,   max_range_m: 6_000,
    min_alt_m: 10,      max_alt_m: 3_500,
    max_target_speed_kmh: 570, min_target_speed_kmh: 15,
    warhead_kg: 2.50,   // doubled vs earlier Igla family
    reaction_time_s: 9,
    missiles_ready: 1,
    gnss_fc: false, gnss_datalink: false,
    base_pk: {
      fpv: 0.20, owa: 0.45, loitering_munition: 0.32,
      tactical_isr: 0.58, male: 0.80, hale: 0.00,
    },
    uas_notes: 'Larger 2.5 kg warhead doubles lethal radius vs earlier family. Best MANPADS in Russian inventory vs small UAS. Enhanced proximity fuze increases near-miss lethality.',
  },

  // ═══ SHORT-RANGE VEHICLE SAM ══════════════════════════════════════════════

  {
    system_id: 'sa-8-gecko',
    nato_designation: 'SA-8 Gecko',
    russian_designation: '9K33 Osa',
    seeker: 'sarh',
    min_range_m: 500,    max_range_m: 10_000,
    min_alt_m: 25,       max_alt_m: 5_000,
    max_target_speed_kmh: 500, min_target_speed_kmh: 40,
    warhead_kg: 19.0,
    reaction_time_s: 26,
    missiles_ready: 6,
    gnss_fc: false, gnss_datalink: false,
    base_pk: {
      fpv: 0.05, owa: 0.28, loitering_munition: 0.20,
      tactical_isr: 0.42, male: 0.65, hale: 0.45,
    },
    uas_notes: 'SARH seeker — ground clutter at low altitude limits OWA Pk. 6-missile launcher allows rapid re-engagement. Min speed 40 km/h excludes hovering FPV.',
  },

  {
    system_id: 'sa-13-gopher',
    nato_designation: 'SA-13 Gopher',
    russian_designation: '9K35 Strela-10',
    seeker: 'iir',
    min_range_m: 500,    max_range_m: 5_000,
    min_alt_m: 25,       max_alt_m: 3_500,
    max_target_speed_kmh: 480, min_target_speed_kmh: 30,
    warhead_kg: 3.0,
    reaction_time_s: 18,
    missiles_ready: 4,
    gnss_fc: false, gnss_datalink: false,
    base_pk: {
      fpv: 0.05, owa: 0.22, loitering_munition: 0.18,
      tactical_isr: 0.38, male: 0.62, hale: 0.00,
    },
    uas_notes: 'Passive IR — zero RF emissions useful for emissions-silent operations. 4-missile launcher limits sustained engagement vs swarms. Shorter range reduces MALE Pk.',
  },

  {
    system_id: 'sa-15-gauntlet',
    nato_designation: 'SA-15 Gauntlet',
    russian_designation: '9K330 Tor-M1/M2',
    seeker: 'active_radar',
    min_range_m: 1_000,  max_range_m: 12_000,
    min_alt_m: 10,       max_alt_m: 6_000,
    max_target_speed_kmh: 700, min_target_speed_kmh: 0,   // hover-capable
    warhead_kg: 14.8,
    reaction_time_s: 8,
    missiles_ready: 8,
    gnss_fc: true, gnss_datalink: false,
    base_pk: {
      fpv: 0.22, owa: 0.62, loitering_munition: 0.50,
      tactical_isr: 0.70, male: 0.80, hale: 0.72,
    },
    uas_notes: 'Best UAS performer in Russian SAM inventory. Active radar seeker independent of RCS constraints. Ukraine-confirmed: effective vs Shahed saturation and Lancet. Magazine limitation in mass-attack scenarios is key vulnerability.',
  },

  {
    system_id: 'sa-19-grison',
    nato_designation: 'SA-19 Grison',
    russian_designation: '2K22 Tunguska-M1',
    seeker: 'active_radar',
    min_range_m: 200,    max_range_m: 8_000,
    min_alt_m: 0,        max_alt_m: 3_500,
    max_target_speed_kmh: 500, min_target_speed_kmh: 0,
    warhead_kg: 9.0,     // 9M311 missile; 2× 2A38M 30 mm guns handle <2000 m
    reaction_time_s: 10,
    missiles_ready: 8,   // 8× 9M311 + 3000 rds 30 mm
    gnss_fc: true, gnss_datalink: false,
    base_pk: {
      fpv: 0.18, owa: 0.52, loitering_munition: 0.40,
      tactical_isr: 0.65, male: 0.68, hale: 0.45,
    },
    uas_notes: '30 mm guns dominate <2000 m engagement; high burst rate kinematically effective vs FPV. Missiles extend to 8 km. Dual-mode (gun+missile) provides layered inner-zone coverage.',
  },

  // ═══ MEDIUM SAM ═══════════════════════════════════════════════════════════

  {
    system_id: 'sa-6-gainful',
    nato_designation: 'SA-6 Gainful',
    russian_designation: '2K12 Kub',
    seeker: 'sarh',
    min_range_m: 4_000,  max_range_m: 22_000,
    min_alt_m: 100,      max_alt_m: 7_000,
    max_target_speed_kmh: 600, min_target_speed_kmh: 100,
    warhead_kg: 56.0,
    reaction_time_s: 45,
    missiles_ready: 3,
    gnss_fc: false, gnss_datalink: false,
    base_pk: {
      fpv: 0.02, owa: 0.15, loitering_munition: 0.12,
      tactical_isr: 0.40, male: 0.65, hale: 0.55,
    },
    uas_notes: '4 km minimum range dead zone exploited by FPV/short-range UAS. Min target speed 100 km/h excludes most OWA at low altitude. Effective vs MALE/HALE. Wide export operator base.',
  },

  {
    system_id: 'sa-11-gadfly',
    nato_designation: 'SA-11 Gadfly',
    russian_designation: '9K37 Buk-M1',
    seeker: 'sarh',
    min_range_m: 3_000,  max_range_m: 25_000,
    min_alt_m: 15,       max_alt_m: 22_000,
    max_target_speed_kmh: 800, min_target_speed_kmh: 50,
    warhead_kg: 70.0,
    reaction_time_s: 22,
    missiles_ready: 4,
    gnss_fc: true, gnss_datalink: true,
    base_pk: {
      fpv: 0.04, owa: 0.35, loitering_munition: 0.28,
      tactical_isr: 0.55, male: 0.75, hale: 0.65,
    },
    uas_notes: 'Track-via-missile SARH. 70 kg warhead lethal to large UAS even with proximity detonation offset. Better OWA performance than SA-6 due to lower min speed and altitude floor.',
  },

  {
    system_id: 'sa-17-grizzly',
    nato_designation: 'SA-17 Grizzly',
    russian_designation: '9K37M1-2 Buk-M1-2',
    seeker: 'active_radar',
    min_range_m: 2_500,  max_range_m: 45_000,
    min_alt_m: 15,       max_alt_m: 25_000,
    max_target_speed_kmh: 1_100, min_target_speed_kmh: 30,
    warhead_kg: 70.0,
    reaction_time_s: 20,
    missiles_ready: 4,
    gnss_fc: true, gnss_datalink: true,
    base_pk: {
      fpv: 0.06, owa: 0.45, loitering_munition: 0.38,
      tactical_isr: 0.65, male: 0.80, hale: 0.72,
    },
    uas_notes: '9M317 active radar terminal — improved small-target performance vs SA-11 SARH. Ukraine: confirmed OWA and MALE kills 2022-2025. Reload time 15 min limits sustained mass-attack response.',
  },

  // ═══ LONG-RANGE SAM ═══════════════════════════════════════════════════════

  {
    system_id: 'sa-10-grumble',
    nato_designation: 'SA-10 Grumble',
    russian_designation: 'S-300P (5V55R)',
    seeker: 'tvm',
    min_range_m: 5_000,  max_range_m: 90_000,
    min_alt_m: 25,       max_alt_m: 27_000,
    max_target_speed_kmh: 2_800, min_target_speed_kmh: 50,
    warhead_kg: 133.0,
    reaction_time_s: 27,
    missiles_ready: 4,
    gnss_fc: true, gnss_datalink: true,
    base_pk: {
      fpv: 0.03, owa: 0.28, loitering_munition: 0.20,
      tactical_isr: 0.38, male: 0.72, hale: 0.78,
    },
    uas_notes: 'TVM guidance requires continuous fire-control illumination. Low Pk vs slow low-flying targets (clutter + min speed limit). High Pk vs MALE/HALE at altitude.',
  },

  {
    system_id: 'sa-20-gargoyle',
    nato_designation: 'SA-20 Gargoyle',
    russian_designation: 'S-300PMU-2 Favorit',
    seeker: 'tvm',
    min_range_m: 5_000,  max_range_m: 195_000,
    min_alt_m: 10,       max_alt_m: 30_000,
    max_target_speed_kmh: 2_800, min_target_speed_kmh: 30,
    warhead_kg: 145.0,
    reaction_time_s: 22,
    missiles_ready: 4,
    gnss_fc: true, gnss_datalink: true,
    base_pk: {
      fpv: 0.05, owa: 0.38, loitering_munition: 0.30,
      tactical_isr: 0.48, male: 0.78, hale: 0.83,
    },
    uas_notes: '48N6DM missile — lower min altitude vs base S-300, improved ECM resistance. Wide export: China, India, Algeria, Vietnam, Slovakia. Key IADS backbone node.',
  },

  {
    system_id: 'sa-21-growler',
    nato_designation: 'SA-21 Growler',
    russian_designation: 'S-400 Triumf',
    seeker: 'active_radar',
    min_range_m: 2_000,  max_range_m: 400_000,
    min_alt_m: 5,        max_alt_m: 30_000,
    max_target_speed_kmh: 4_800, min_target_speed_kmh: 0,
    warhead_kg: 145.0,
    reaction_time_s: 9,
    missiles_ready: 8,   // mix of 40N6E / 48N6DM / 9M96E2 by mission
    gnss_fc: true, gnss_datalink: true,
    base_pk: {
      fpv: 0.12, owa: 0.55, loitering_munition: 0.45,
      tactical_isr: 0.62, male: 0.88, hale: 0.92,
    },
    uas_notes: '9M96E2 active radar provides dedicated counter-UAS terminal engagement. S-400 later firmware includes dedicated UAV engagement mode (OSINT-confirmed). Longest operational range of any in-service system.',
  },

  // ═══ LEGACY / EXPORT CONTEXT ══════════════════════════════════════════════

  {
    system_id: 'sa-2-guideline',
    nato_designation: 'SA-2 Guideline',
    russian_designation: 'S-75 Dvina',
    seeker: 'sarh',
    min_range_m: 7_000,  max_range_m: 29_000,
    min_alt_m: 1_000,    max_alt_m: 27_000,
    max_target_speed_kmh: 2_300, min_target_speed_kmh: 300,
    warhead_kg: 195.0,
    reaction_time_s: 60,
    missiles_ready: 3,
    gnss_fc: false, gnss_datalink: false,
    base_pk: {
      fpv: 0.01, owa: 0.05, loitering_munition: 0.03,
      tactical_isr: 0.18, male: 0.45, hale: 0.52,
    },
    uas_notes: '7 km dead zone + 1000 m min altitude + 300 km/h min speed excludes almost all UAS targets. Relevance: operator context (Syria, DPRK, Iran, Vietnam, Ethiopia) as IADS nodes.',
  },

  {
    system_id: 'sa-3-goa',
    nato_designation: 'SA-3 Goa',
    russian_designation: 'S-125 Neva/Pechora',
    seeker: 'sarh',
    min_range_m: 1_500,  max_range_m: 25_000,
    min_alt_m: 200,      max_alt_m: 14_000,
    max_target_speed_kmh: 700, min_target_speed_kmh: 80,
    warhead_kg: 60.0,
    reaction_time_s: 45,
    missiles_ready: 4,
    gnss_fc: false, gnss_datalink: false,
    base_pk: {
      fpv: 0.02, owa: 0.08, loitering_munition: 0.05,
      tactical_isr: 0.22, male: 0.48, hale: 0.50,
    },
    uas_notes: 'Export operators: Serbia, Libya, Ethiopia, Peru, Cuba. 80 km/h min speed limits OWA/FPV engagement. Some upgraded variants (Pechora-2M) have improved tracking vs small targets.',
  },

  {
    system_id: 'sa-12a-gladiator',
    nato_designation: 'SA-12A Gladiator',
    russian_designation: 'S-300V / 9M83',
    seeker: 'active_radar',
    min_range_m: 6_000,  max_range_m: 75_000,
    min_alt_m: 25,       max_alt_m: 30_000,
    max_target_speed_kmh: 2_800, min_target_speed_kmh: 30,
    warhead_kg: 150.0,
    reaction_time_s: 15,
    missiles_ready: 4,
    gnss_fc: true, gnss_datalink: true,
    base_pk: {
      fpv: 0.03, owa: 0.25, loitering_munition: 0.18,
      tactical_isr: 0.40, male: 0.68, hale: 0.72,
    },
    uas_notes: 'Army air-defence variant — tracked vehicles. Active radar 9M83 better vs manoeuvring targets than TVM family. Primary role: ballistic missile defence. UAS engagement secondary capability.',
  },

  {
    system_id: 'sa-23-giant',
    nato_designation: 'SA-23 Giant',
    russian_designation: 'S-300VM Antey-2500',
    seeker: 'active_radar',
    min_range_m: 4_000,  max_range_m: 200_000,
    min_alt_m: 25,       max_alt_m: 30_000,
    max_target_speed_kmh: 4_500, min_target_speed_kmh: 30,
    warhead_kg: 150.0,
    reaction_time_s: 12,
    missiles_ready: 4,
    gnss_fc: true, gnss_datalink: true,
    base_pk: {
      fpv: 0.04, owa: 0.32, loitering_munition: 0.24,
      tactical_isr: 0.45, male: 0.72, hale: 0.78,
    },
    uas_notes: 'Export variant: Venezuela, Algeria. Active 9M82M radar. Operates alongside Russian IADS in Syria/Venezuela context. Dual ballistic/aerodynamic threat engagement.',
  },

  {
    system_id: 'sa-22-greyhound',
    nato_designation: 'SA-22 Greyhound',
    russian_designation: '96K6 Pantsir-S1',
    seeker: 'active_radar',
    min_range_m: 1_200,  max_range_m: 20_000,
    min_alt_m: 5,        max_alt_m: 15_000,
    max_target_speed_kmh: 1_000, min_target_speed_kmh: 0,
    warhead_kg: 20.0,
    reaction_time_s: 6,
    missiles_ready: 12,
    gnss_fc: true, gnss_datalink: false,
    base_pk: {
      fpv: 0.20, owa: 0.58, loitering_munition: 0.48,
      tactical_isr: 0.68, male: 0.75, hale: 0.55,
    },
    uas_notes: '57E6 active radar + 2×30 mm guns. Inner-layer point defence protecting long-range SAM nodes. Combat reports mixed vs saturation/low-RCS UAS; gun layer effective inside 2 km.',
  },
]

/** Lookup a profile by system_id */
export function getSamProfile(system_id: string): SamEngagementProfile | undefined {
  return SAM_PROFILES.find(p => p.system_id === system_id)
}

/** All SA-system IDs (for dropdown population etc.) */
export const SAM_SYSTEM_IDS = SAM_PROFILES.map(p => p.system_id)
