/**
 * Pitch Black 2026 — BMI seed dataset (OSINT only).
 * Refine against official RAAF participant page as it populates.
 * Descriptive comms/role data may be improved; do not fill accredited-only performance here.
 */

import type {
  CommsBearer,
  ExerciseBase,
  ExerciseMeta,
  ExerciseNation,
  ExercisePlatform,
  PlatformSensor,
} from '@/lib/bmi/bmi-types'

const EX_ID = 'PITCH_BLACK_2026'

export const PB26_NATIONS: ExerciseNation[] = [
  { code: 'AUS', name: 'Australia', participation: 'flying' },
  { code: 'USA', name: 'United States', participation: 'flying' },
  { code: 'JPN', name: 'Japan', participation: 'flying', first_time: true },
  { code: 'PNG', name: 'Papua New Guinea', participation: 'flying' },
  { code: 'IDN', name: 'Indonesia', participation: 'flying', first_time: true },
  { code: 'PHL', name: 'Philippines', participation: 'flying' },
  { code: 'THA', name: 'Thailand', participation: 'flying' },
  { code: 'KOR', name: 'Republic of Korea', participation: 'flying' },
  { code: 'IND', name: 'India', participation: 'flying' },
  { code: 'SGP', name: 'Singapore', participation: 'flying' },
  { code: 'DEU', name: 'Germany', participation: 'flying' },
  { code: 'FRA', name: 'France', participation: 'flying' },
  { code: 'ESP', name: 'Spain', participation: 'flying' },
  { code: 'NZL', name: 'New Zealand', participation: 'embedded_personnel' },
  { code: 'FJI', name: 'Fiji', participation: 'embedded_personnel' },
  { code: 'CAN', name: 'Canada', participation: 'embedded_personnel' },
  { code: 'BRN', name: 'Brunei', participation: 'embedded_personnel' },
  { code: 'MYS', name: 'Malaysia', participation: 'embedded_personnel' },
  { code: 'FIN', name: 'Finland', participation: 'embedded_personnel' },
  { code: 'SWE', name: 'Sweden', participation: 'embedded_personnel' },
]

export const PB26_BASES: ExerciseBase[] = [
  { id: 'BASE-DARWIN', name: 'RAAF Base Darwin', lat: -12.408, lon: 130.873, role: 'main_operating' },
  { id: 'BASE-TINDAL', name: 'RAAF Base Tindal', lat: -14.521, lon: 132.378, role: 'forward' },
  { id: 'BASE-AMBERLEY', name: 'RAAF Base Amberley', lat: -27.637, lon: 152.711, role: 'main_operating' },
]

export const PB26_PLATFORMS: ExercisePlatform[] = [
  // ── Confirmed ─────────────────────────────────────────────────────────────
  {
    id: 'JPN-F35A', exercise_id: EX_ID, nation_code: 'JPN', designation: 'F-35A Lightning II',
    short_name: 'F-35A', domain: 'air', role: 'multirole', qty: null, base_id: 'BASE-DARWIN',
    force_side: 'blue',
    open_source_summary: 'JASDF first Pitch Black deployment — fifth-gen multirole (OSINT, Jul 2026).',
    data_confidence: 'high', sources: ['RAAF Pitch Black 2026 participant announcement'],
  },
  {
    id: 'IDN-T50I', exercise_id: EX_ID, nation_code: 'IDN', designation: 'T-50I Golden Eagle',
    short_name: 'T-50I', domain: 'air', role: 'trainer_lead_in', qty: null, base_id: 'BASE-DARWIN',
    force_side: 'blue',
    open_source_summary: 'Indonesian Air Force first Pitch Black appearance (OSINT, Jul 2026).',
    data_confidence: 'high', sources: ['RAAF Pitch Black 2026 participant announcement'],
  },
  {
    id: 'IND-RAFALE', exercise_id: EX_ID, nation_code: 'IND', designation: 'Rafale',
    short_name: 'Rafale', domain: 'air', role: 'multirole', qty: 4, base_id: 'BASE-DARWIN',
    force_side: 'blue',
    open_source_summary: 'IAF Rafale detachment — 4 aircraft confirmed (OSINT, Jul 2026).',
    data_confidence: 'high', sources: ['RAAF Pitch Black 2026; IAF press reporting'],
  },
  {
    id: 'IND-C17', exercise_id: EX_ID, nation_code: 'IND', designation: 'C-17 Globemaster III',
    short_name: 'C-17', domain: 'air', role: 'transport', qty: 2, base_id: 'BASE-DARWIN',
    force_side: 'blue',
    open_source_summary: 'IAF strategic airlift support — 2 aircraft confirmed (OSINT).',
    data_confidence: 'high', sources: ['RAAF Pitch Black 2026 participant reporting'],
  },
  // ── Expected (low confidence) ───────────────────────────────────────────
  {
    id: 'AUS-F35A', exercise_id: EX_ID, nation_code: 'AUS', designation: 'F-35A Lightning II',
    short_name: 'F-35A', domain: 'air', role: 'multirole', qty: null, base_id: 'BASE-TINDAL',
    force_side: 'blue',
    open_source_summary: 'Expected RAAF host-nation fast jet — not yet confirmed on official tail list.',
    data_confidence: 'estimated', sources: ['Historical Pitch Black ORBAT pattern'],
  },
  {
    id: 'AUS-FA18F', exercise_id: EX_ID, nation_code: 'AUS', designation: 'F/A-18F Super Hornet',
    short_name: 'F/A-18F', domain: 'air', role: 'multirole', qty: null, base_id: 'BASE-TINDAL',
    force_side: 'blue',
    open_source_summary: 'Expected RAAF multirole — pending official participant detail.',
    data_confidence: 'estimated', sources: ['Historical Pitch Black ORBAT pattern'],
  },
  {
    id: 'AUS-EA18G', exercise_id: EX_ID, nation_code: 'AUS', designation: 'EA-18G Growler',
    short_name: 'EA-18G', domain: 'air', role: 'ew', qty: null, base_id: 'BASE-AMBERLEY',
    force_side: 'blue',
    open_source_summary: 'Expected RAAF EW escort — pending official confirmation.',
    data_confidence: 'estimated', sources: ['Historical Pitch Black ORBAT pattern'],
  },
  {
    id: 'AUS-E7A', exercise_id: EX_ID, nation_code: 'AUS', designation: 'E-7A Wedgetail',
    short_name: 'E-7A', domain: 'air', role: 'aew_c', qty: null, base_id: 'BASE-DARWIN',
    force_side: 'blue',
    open_source_summary: 'Expected RAAF AEW&C — key coalition gateway node (Boeing 737 AEW).',
    data_confidence: 'estimated', sources: ['RAAF Wedgetail public role; historical PB participation'],
  },
  {
    id: 'AUS-KC30A', exercise_id: EX_ID, nation_code: 'AUS', designation: 'KC-30A MRTT',
    short_name: 'KC-30A', domain: 'air', role: 'tanker', qty: null, base_id: 'BASE-AMBERLEY',
    force_side: 'blue',
    open_source_summary: 'Expected RAAF tanker support — Airbus A330 MRTT.',
    data_confidence: 'estimated', sources: ['Historical Pitch Black ORBAT pattern'],
  },
  {
    id: 'USA-F35A', exercise_id: EX_ID, nation_code: 'USA', designation: 'F-35A Lightning II',
    short_name: 'F-35A', domain: 'air', role: 'multirole', qty: null, base_id: 'BASE-DARWIN',
    force_side: 'blue',
    open_source_summary: 'Expected USAF/USMC F-35 participation — tail detail pending.',
    data_confidence: 'estimated', sources: ['Historical US Pitch Black participation'],
  },
  {
    id: 'USA-F16', exercise_id: EX_ID, nation_code: 'USA', designation: 'F-16 Fighting Falcon',
    short_name: 'F-16', domain: 'air', role: 'fighter', qty: null, base_id: 'BASE-DARWIN',
    force_side: 'blue',
    open_source_summary: 'Expected USAF legacy fighter — pending official list.',
    data_confidence: 'estimated', sources: ['Historical Pitch Black ORBAT pattern'],
  },
  {
    id: 'KOR-F15K', exercise_id: EX_ID, nation_code: 'KOR', designation: 'F-15K Slam Eagle',
    short_name: 'F-15K', domain: 'air', role: 'multirole', qty: null, base_id: 'BASE-DARWIN',
    force_side: 'blue',
    open_source_summary: 'Expected ROKAF F-15 — pending official confirmation.',
    data_confidence: 'estimated', sources: ['Historical Pitch Black ORBAT pattern'],
  },
  {
    id: 'SGP-F15SG', exercise_id: EX_ID, nation_code: 'SGP', designation: 'F-15SG',
    short_name: 'F-15SG', domain: 'air', role: 'multirole', qty: null, base_id: 'BASE-DARWIN',
    force_side: 'blue',
    open_source_summary: 'Expected RSAF F-15 — pending official confirmation.',
    data_confidence: 'estimated', sources: ['Historical Pitch Black ORBAT pattern'],
  },
  {
    id: 'DEU-TYPHOON', exercise_id: EX_ID, nation_code: 'DEU', designation: 'Eurofighter Typhoon',
    short_name: 'Typhoon', domain: 'air', role: 'multirole', qty: null, base_id: 'BASE-DARWIN',
    force_side: 'blue',
    open_source_summary: 'Expected Luftwaffe Typhoon — pending official confirmation.',
    data_confidence: 'estimated', sources: ['RAAF Pitch Black 2026 participant list (Germany flying)'],
  },
  {
    id: 'DEU-A400M', exercise_id: EX_ID, nation_code: 'DEU', designation: 'A400M Atlas',
    short_name: 'A400M', domain: 'air', role: 'transport', qty: null, base_id: 'BASE-DARWIN',
    force_side: 'blue',
    open_source_summary: 'Expected Luftwaffe tactical airlift — pending tail confirmation.',
    data_confidence: 'estimated', sources: ['Historical multinational PB support pattern'],
  },
  {
    id: 'FRA-RAFALE', exercise_id: EX_ID, nation_code: 'FRA', designation: 'Rafale',
    short_name: 'Rafale', domain: 'air', role: 'multirole', qty: null, base_id: 'BASE-DARWIN',
    force_side: 'blue',
    open_source_summary: 'Expected AdA Rafale — France confirmed flying nation.',
    data_confidence: 'estimated', sources: ['RAAF Pitch Black 2026 participant list'],
  },
  {
    id: 'ESP-EF18', exercise_id: EX_ID, nation_code: 'ESP', designation: 'EF-18M Hornet',
    short_name: 'EF-18M', domain: 'air', role: 'multirole', qty: null, base_id: 'BASE-DARWIN',
    force_side: 'blue',
    open_source_summary: 'Expected Spanish Air Force EF-18 — pending tail list.',
    data_confidence: 'estimated', sources: ['RAAF Pitch Black 2026 participant list'],
  },
  {
    id: 'THA-F16', exercise_id: EX_ID, nation_code: 'THA', designation: 'F-16 Fighting Falcon',
    short_name: 'F-16', domain: 'air', role: 'fighter', qty: null, base_id: 'BASE-DARWIN',
    force_side: 'blue',
    open_source_summary: 'Expected RTAF F-16 — Thailand confirmed flying nation.',
    data_confidence: 'estimated', sources: ['RAAF Pitch Black 2026 participant list'],
  },
  {
    id: 'PHL-FA50', exercise_id: EX_ID, nation_code: 'PHL', designation: 'FA-50PH',
    short_name: 'FA-50', domain: 'air', role: 'trainer_lead_in', qty: null, base_id: 'BASE-DARWIN',
    force_side: 'blue',
    open_source_summary: 'Expected PAF FA-50 — Philippines confirmed flying nation.',
    data_confidence: 'estimated', sources: ['RAAF Pitch Black 2026 participant list'],
  },
  {
    id: 'PNG-PLACEHOLDER', exercise_id: EX_ID, nation_code: 'PNG', designation: 'Participating aircraft (TBC)',
    short_name: 'TBC', domain: 'air', role: 'other', qty: null, base_id: 'BASE-DARWIN',
    force_side: 'blue',
    open_source_summary: 'PNG confirmed flying nation — platform type not yet public.',
    data_confidence: 'estimated', sources: ['RAAF Pitch Black 2026 participant list'],
  },
  // Ground C2 / radar nodes
  {
    id: 'AUS-CRC-DARWIN', exercise_id: EX_ID, nation_code: 'AUS', designation: 'Control and Reporting Centre',
    short_name: 'CRC Darwin', domain: 'ground', role: 'c2_ground', qty: 1, base_id: 'BASE-DARWIN',
    force_side: 'blue',
    open_source_summary: 'RAAF air battle management node — public infrastructure reference.',
    data_confidence: 'medium', sources: ['RAAF base infrastructure OSINT'],
  },
  {
    id: 'AUS-TPS77', exercise_id: EX_ID, nation_code: 'AUS', designation: 'AN/TPS-77',
    short_name: 'TPS-77', domain: 'ground', role: 'radar_ground', qty: 1, base_id: 'BASE-TINDAL',
    force_side: 'blue',
    open_source_summary: 'Deployable L-band ground radar — public RAAF acquisition record.',
    data_confidence: 'medium', sources: ['Raytheon/RAAF public releases'],
  },
  // Red Force extension stub — not populated in v1
]

export const PB26_SENSORS: PlatformSensor[] = [
  // E-7A Wedgetail — Boeing platform, Northrop Grumman MESA (Thales/Boeing supply chain)
  {
    id: 'sns-AUS-E7A-mesa', platform_id: 'AUS-E7A', kind: 'radar',
    label: 'Northrop Grumman MESA (Multi-role Electronically Scanned Array)',
    band: 'L', antenna: 'AESA', role: 'air_surveillance',
    can_detect: ['aircraft', 'cruise_missile', 'large_uas'],
    cannot_detect: ['small_uas'],
    strengths: '360° AEW&C volume search; coalition C2 gateway role',
    limitations: 'Not a fire-control radar — cues fighters, does not engage',
    confidence: 'curated', intel_note: 'Boeing 737 AEW platform; MESA L-band AESA — public manufacturer data.',
    sources: ['Northrop Grumman MESA product page; RAAF Wedgetail fact sheet'],
  },
  // F-35A APG-81 + EOTS + DAS
  {
    id: 'sns-JPN-F35A-apg81', platform_id: 'JPN-F35A', kind: 'radar',
    label: 'AN/APG-81 AESA fire-control radar', band: 'X', antenna: 'AESA', role: 'fire_control',
    can_detect: ['aircraft', 'cruise_missile', 'large_uas'],
    cannot_detect: ['small_uas', 'ballistic_missile'],
    strengths: 'Low-probability-of-intercept modes; fused with DAS/EOTS',
    limitations: 'VLO target detection range significantly shorter than non-stealth targets',
    confidence: 'curated', intel_note: 'Public F-35 sensor suite description.',
    sources: ['Lockheed Martin F-35 official specifications (unclassified)'],
  },
  {
    id: 'sns-JPN-F35A-eots', platform_id: 'JPN-F35A', kind: 'eo_ir',
    label: 'EOTS (Electro-Optical Targeting System)', band: null, antenna: null, role: 'targeting',
    can_detect: ['aircraft', 'ground_target'],
    cannot_detect: ['ballistic_missile'],
    strengths: 'Passive IR search and track; laser designation',
    limitations: 'Weather and range limited compared to radar',
    confidence: 'curated', intel_note: 'Public F-35 EOTS description.',
    sources: ['Lockheed Martin F-35 official specifications'],
  },
  {
    id: 'sns-JPN-F35A-das', platform_id: 'JPN-F35A', kind: 'eo_ir',
    label: 'DAS (Distributed Aperture System)', band: null, antenna: null, role: 'missile_warning',
    can_detect: ['aircraft', 'cruise_missile'],
    cannot_detect: ['small_uas'],
    strengths: 'Spherical IR coverage for threat warning',
    limitations: 'Warning/cueing — not a fire-control solution',
    confidence: 'curated', intel_note: 'Public F-35 DAS description.',
    sources: ['Lockheed Martin F-35 official specifications'],
  },
  // AUS F-35A sensors (mirror)
  {
    id: 'sns-AUS-F35A-apg81', platform_id: 'AUS-F35A', kind: 'radar',
    label: 'AN/APG-81 AESA fire-control radar', band: 'X', antenna: 'AESA', role: 'fire_control',
    can_detect: ['aircraft', 'cruise_missile', 'large_uas'],
    cannot_detect: ['small_uas', 'ballistic_missile'],
    strengths: 'Low-probability-of-intercept modes; fused with DAS/EOTS',
    limitations: 'VLO target detection range significantly shorter than non-stealth targets',
    confidence: 'curated', intel_note: 'Public F-35 sensor suite.',
    sources: ['Lockheed Martin F-35 official specifications'],
  },
  // Rafale RBE2 AESA (Thales)
  {
    id: 'sns-IND-RAFALE-rbe2', platform_id: 'IND-RAFALE', kind: 'radar',
    label: 'RBE2 AESA (Thales)', band: 'X', antenna: 'AESA', role: 'fire_control',
    can_detect: ['aircraft', 'cruise_missile', 'large_uas'],
    cannot_detect: ['small_uas', 'ballistic_missile'],
    strengths: 'Active electronically scanned array; air-to-air and air-to-ground modes',
    limitations: 'Not optimised for BMD or counter-stealth at long range',
    confidence: 'curated', intel_note: 'Thales RBE2 — public Rafale sensor fit.',
    sources: ['Dassault Rafale official page; Thales RBE2 product literature'],
  },
  {
    id: 'sns-FRA-RAFALE-rbe2', platform_id: 'FRA-RAFALE', kind: 'radar',
    label: 'RBE2 AESA (Thales)', band: 'X', antenna: 'AESA', role: 'fire_control',
    can_detect: ['aircraft', 'cruise_missile', 'large_uas'],
    cannot_detect: ['small_uas', 'ballistic_missile'],
    strengths: 'Active electronically scanned array; air-to-air and air-to-ground modes',
    limitations: 'Not optimised for BMD or counter-stealth at long range',
    confidence: 'curated', intel_note: 'Thales RBE2 — public Rafale sensor fit.',
    sources: ['Dassault Rafale official page; Thales RBE2 product literature'],
  },
  // TPS-77 ground radar
  {
    id: 'sns-AUS-TPS77', platform_id: 'AUS-TPS77', kind: 'radar',
    label: 'AN/TPS-77 (Raytheon)', band: 'L', antenna: 'PESA', role: 'surveillance',
    can_detect: ['aircraft', 'cruise_missile', 'large_uas'],
    cannot_detect: ['small_uas', 'stealth'],
    strengths: 'Deployable long-range ground surveillance',
    limitations: 'Fixed/semi-fixed deployment; sector coverage',
    confidence: 'estimated', intel_note: 'Public RAAF TPS-77 acquisition.',
    sources: ['Raytheon AN/TPS-77 product page'],
    radar_catalog_id: null,
  },
  // EA-18G ALQ-218 ESM
  {
    id: 'sns-AUS-EA18G-esm', platform_id: 'AUS-EA18G', kind: 'esm',
    label: 'ALQ-218(V)2 ESM suite', band: 'VHF-UHF', antenna: null, role: 'electronic_support',
    can_detect: ['aircraft'],
    cannot_detect: ['small_uas'],
    strengths: 'Emitter geolocation and threat library correlation',
    limitations: 'ESM — detects emissions, does not provide fire-control track',
    confidence: 'estimated', intel_note: 'Public Growler ESM fit (unclassified).',
    sources: ['USN EA-18G fact file'],
  },
]

function bearer(
  id: string,
  platform_id: string,
  partial: Omit<CommsBearer, 'id' | 'platform_id'>,
): CommsBearer {
  return { id, platform_id, ...partial }
}

export const PB26_COMMS: CommsBearer[] = [
  // ── E-7A — coalition gateway ──────────────────────────────────────────────
  bearer('com-AUS-E7A-l16', 'AUS-E7A', {
    kind: 'datalink', standard: 'link16', band: 'L', label: 'Link 16 (MIDS/JTIDS)',
    gateway_capable: true, comsec_note: 'requires common crypto keying', pnt_dependent: true,
    data_confidence: 'high', sources: ['NATO STANAG 5516; RAAF Wedgetail public role'],
    boundary_note: null,
  }),
  bearer('com-AUS-E7A-uhf', 'AUS-E7A', {
    kind: 'voice_uhf', standard: null, band: 'UHF', label: 'UHF AM air-ground',
    gateway_capable: false, comsec_note: null, pnt_dependent: false,
    data_confidence: 'medium', sources: ['Standard military UHF ATC/tactical voice'],
    boundary_note: null,
  }),
  bearer('com-AUS-E7A-hf', 'AUS-E7A', {
    kind: 'voice_hf', standard: null, band: 'HF', label: 'HF long-range voice',
    gateway_capable: false, comsec_note: null, pnt_dependent: false,
    data_confidence: 'medium', sources: ['AEW&C contingency HF backup — doctrinal'],
    boundary_note: null,
  }),
  bearer('com-AUS-E7A-sat', 'AUS-E7A', {
    kind: 'data_satcom', standard: null, band: 'Ku', label: 'Ku-band SATCOM',
    gateway_capable: false, comsec_note: 'requires common crypto keying', pnt_dependent: false,
    data_confidence: 'estimated', sources: ['Public AEW&C SATCOM fit pattern'],
    boundary_note: null,
  }),
  // ── F-35A (JPN confirmed, AUS/USA expected) ───────────────────────────────
  ...(['JPN-F35A', 'AUS-F35A', 'USA-F35A'] as const).flatMap((pid) => [
    bearer(`com-${pid}-madl`, pid, {
      kind: 'datalink', standard: 'madl', band: 'Ku', label: 'MADL (Multifunction Advanced Data Link)',
      gateway_capable: true, comsec_note: 'requires common crypto keying', pnt_dependent: false,
      data_confidence: 'high', sources: ['Lockheed Martin MADL — public F-35 datalink description'],
      boundary_note: 'F-35-to-F-35 only; bridged to Link 16 via gateway platform',
    }),
    bearer(`com-${pid}-l16`, pid, {
      kind: 'datalink', standard: 'link16', band: 'L', label: 'Link 16 (MIDS)',
      gateway_capable: false, comsec_note: 'requires common crypto keying', pnt_dependent: true,
      data_confidence: 'high', sources: ['F-35 Link 16 integration — public reporting'],
      boundary_note: null,
    }),
    bearer(`com-${pid}-uhf`, pid, {
      kind: 'voice_uhf', standard: null, band: 'UHF', label: 'UHF guard/voice',
      gateway_capable: false, comsec_note: null, pnt_dependent: false,
      data_confidence: 'high', sources: ['Standard fast-jet UHF'],
      boundary_note: null,
    }),
  ]),
  // ── Rafale (IND confirmed, FRA expected) ───────────────────────────────────
  ...(['IND-RAFALE', 'FRA-RAFALE'] as const).flatMap((pid) => [
    bearer(`com-${pid}-l16`, pid, {
      kind: 'datalink', standard: 'link16', band: 'L', label: 'Link 16 (MIDS)',
      gateway_capable: false, comsec_note: 'requires common crypto keying', pnt_dependent: true,
      data_confidence: 'high', sources: ['Rafale Link 16 integration — public NATO exercises'],
      boundary_note: null,
    }),
    bearer(`com-${pid}-nat`, pid, {
      kind: 'datalink', standard: 'national', band: 'UHF', label: 'French national datalink',
      gateway_capable: false, comsec_note: 'requires common crypto keying', pnt_dependent: false,
      data_confidence: 'medium', sources: ['Rafale national link — open-source references'],
      boundary_note: null,
    }),
    bearer(`com-${pid}-uhf`, pid, {
      kind: 'voice_uhf', standard: null, band: 'UHF', label: 'UHF voice',
      gateway_capable: false, comsec_note: null, pnt_dependent: false,
      data_confidence: 'high', sources: ['Standard fast-jet UHF'],
      boundary_note: null,
    }),
    bearer(`com-${pid}-hf`, pid, {
      kind: 'voice_hf', standard: null, band: 'HF', label: 'HF contingency voice',
      gateway_capable: false, comsec_note: null, pnt_dependent: false,
      data_confidence: 'medium', sources: ['Doctrinal HF backup'],
      boundary_note: null,
    }),
  ]),
  // ── Legacy Link 16 jets ─────────────────────────────────────────────────────
  ...(['AUS-FA18F', 'USA-F16', 'KOR-F15K', 'SGP-F15SG', 'DEU-TYPHOON', 'ESP-EF18', 'THA-F16'] as const).flatMap((pid) => [
    bearer(`com-${pid}-l16`, pid, {
      kind: 'datalink', standard: 'link16', band: 'L', label: 'Link 16 (MIDS)',
      gateway_capable: false, comsec_note: 'requires common crypto keying', pnt_dependent: true,
      data_confidence: 'high', sources: ['NATO-standard fighter Link 16 fit'],
      boundary_note: null,
    }),
    bearer(`com-${pid}-uhf`, pid, {
      kind: 'voice_uhf', standard: null, band: 'UHF', label: 'UHF voice/guard',
      gateway_capable: false, comsec_note: null, pnt_dependent: false,
      data_confidence: 'high', sources: ['Standard fast-jet UHF'],
      boundary_note: null,
    }),
  ]),
  // EA-18G
  bearer('com-AUS-EA18G-l16', 'AUS-EA18G', {
    kind: 'datalink', standard: 'link16', band: 'L', label: 'Link 16 (MIDS)',
    gateway_capable: false, comsec_note: 'requires common crypto keying', pnt_dependent: true,
    data_confidence: 'high', sources: ['Growler Link 16 — public USN fit'],
    boundary_note: null,
  }),
  bearer('com-AUS-EA18G-uhf', 'AUS-EA18G', {
    kind: 'voice_uhf', standard: null, band: 'UHF', label: 'UHF voice',
    gateway_capable: false, comsec_note: null, pnt_dependent: false,
    data_confidence: 'high', sources: ['Standard fast-jet UHF'],
    boundary_note: null,
  }),
  // T-50I — low confidence national link
  bearer('com-IDN-T50I-nat', 'IDN-T50I', {
    kind: 'datalink', standard: 'national', band: 'UHF', label: 'National trainer datalink (estimated)',
    gateway_capable: false, comsec_note: 'requires common crypto keying', pnt_dependent: false,
    data_confidence: 'estimated', sources: ['T-50 family OSINT — exact fit unconfirmed'],
    boundary_note: 'Full fit to be confirmed against official participant detail',
  }),
  bearer('com-IDN-T50I-uhf', 'IDN-T50I', {
    kind: 'voice_uhf', standard: null, band: 'UHF', label: 'UHF voice',
    gateway_capable: false, comsec_note: null, pnt_dependent: false,
    data_confidence: 'estimated', sources: ['Standard trainer UHF'],
    boundary_note: null,
  }),
  // Transports
  ...(['IND-C17', 'DEU-A400M', 'AUS-KC30A'] as const).flatMap((pid) => [
    bearer(`com-${pid}-uhf`, pid, {
      kind: 'voice_uhf', standard: null, band: 'UHF', label: 'UHF/HF voice',
      gateway_capable: false, comsec_note: null, pnt_dependent: false,
      data_confidence: 'high', sources: ['Standard transport voice fit'],
      boundary_note: null,
    }),
    bearer(`com-${pid}-sat`, pid, {
      kind: 'data_satcom', standard: null, band: 'Ku', label: 'SATCOM (Ku-band)',
      gateway_capable: false, comsec_note: 'requires common crypto keying', pnt_dependent: false,
      data_confidence: 'medium', sources: ['Public transport/tanker SATCOM fit'],
      boundary_note: null,
    }),
    bearer(`com-${pid}-l16`, pid, {
      kind: 'datalink', standard: 'link16', band: 'L', label: 'Link 16 (limited SA)',
      gateway_capable: false, comsec_note: 'requires common crypto keying', pnt_dependent: true,
      data_confidence: 'estimated', sources: ['Some tankers/transports carry Link 16 for SA'],
      boundary_note: null,
    }),
  ]),
  // FA-50
  bearer('com-PHL-FA50-uhf', 'PHL-FA50', {
    kind: 'voice_uhf', standard: null, band: 'UHF', label: 'UHF voice',
    gateway_capable: false, comsec_note: null, pnt_dependent: false,
    data_confidence: 'estimated', sources: ['FA-50 public comms fit'],
    boundary_note: null,
  }),
  // PNG placeholder
  bearer('com-PNG-uhf', 'PNG-PLACEHOLDER', {
    kind: 'voice_uhf', standard: null, band: 'UHF', label: 'UHF voice (assumed)',
    gateway_capable: false, comsec_note: null, pnt_dependent: false,
    data_confidence: 'estimated', sources: ['Placeholder until platform confirmed'],
    boundary_note: null,
  }),
  // Ground nodes
  bearer('com-AUS-CRC-l16', 'AUS-CRC-DARWIN', {
    kind: 'datalink', standard: 'link16', band: 'L', label: 'Link 16 (CRC)',
    gateway_capable: true, comsec_note: 'requires common crypto keying', pnt_dependent: true,
    data_confidence: 'medium', sources: ['CRC Link 16 integration — doctrinal'],
    boundary_note: null,
  }),
  bearer('com-AUS-TPS77-uhf', 'AUS-TPS77', {
    kind: 'voice_uhf', standard: null, band: 'UHF', label: 'UHF voice relay',
    gateway_capable: false, comsec_note: null, pnt_dependent: false,
    data_confidence: 'estimated', sources: ['Ground radar voice relay — doctrinal'],
    boundary_note: null,
  }),
]

export const PITCH_BLACK_2026: ExerciseMeta = {
  id: EX_ID,
  name: 'Exercise Pitch Black 2026',
  start_date: '2026-07-20',
  end_date: '2026-08-07',
  bases: PB26_BASES,
  nations: PB26_NATIONS,
  note:
    'Multinational air combat exercise — air-centric OrBat. Refine against official RAAF participant page as tail details publish. Embedded-personnel nations appear as liaison, not flying platforms.',
}

export function buildBmiSeedBundle() {
  const sensorsByPlatform = new Map<string, PlatformSensor[]>()
  for (const s of PB26_SENSORS) {
    const list = sensorsByPlatform.get(s.platform_id) ?? []
    list.push(s)
    sensorsByPlatform.set(s.platform_id, list)
  }
  const commsByPlatform = new Map<string, CommsBearer[]>()
  for (const c of PB26_COMMS) {
    const list = commsByPlatform.get(c.platform_id) ?? []
    list.push(c)
    commsByPlatform.set(c.platform_id, list)
  }
  return {
    meta: PITCH_BLACK_2026,
    platforms: PB26_PLATFORMS.map((p) => ({
      ...p,
      sensors: sensorsByPlatform.get(p.id) ?? [],
      comms: commsByPlatform.get(p.id) ?? [],
    })),
  }
}

export const BMI_SEED_BUNDLE = buildBmiSeedBundle()

/** Comms fits grouped for interop engine input */
export function toCommsFits() {
  const byPlatform = new Map<string, CommsBearer[]>()
  for (const c of PB26_COMMS) {
    const list = byPlatform.get(c.platform_id) ?? []
    list.push(c)
    byPlatform.set(c.platform_id, list)
  }
  return PB26_PLATFORMS.map((p) => {
    const bearers = byPlatform.get(p.id) ?? []
    const confidences = bearers.map((b) => b.data_confidence)
    const data_confidence = confidences.includes('estimated')
      ? 'estimated'
      : confidences.includes('medium')
        ? 'medium'
        : 'high'
    return {
      platform_id: p.id,
      bearers,
      data_confidence: data_confidence as import('@/lib/types').DataConfidence,
      sources: [...new Set(bearers.flatMap((b) => b.sources))],
      boundary_note: bearers.find((b) => b.boundary_note)?.boundary_note ?? null,
    }
  })
}
