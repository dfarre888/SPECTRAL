/**
 * Force Catalogue — North Korea / DPRK (Red). Tranche 5.
 * OSINT only. Sensor/comms descriptive; performance pins to SOVEREIGN_CORE_BOUNDARY.
 * Verified current status: Jul 2026. DPRK is opaque — most entries medium/estimated.
 * Sources: CSIS Missile Threat, 38 North, CRS, defence press (2025–26).
 * DPRK force is missile-centric; C2 is largely NON-networked (voice-primary) — this
 * is reflected honestly (few datalinks), which is itself analytically significant.
 */

import type { ForceCatalogPlatformFull } from '@/lib/bmi/bmi-types'
import {
  hfVoice, nationFactory, pinnedSensor, satcom, uhfVoice,
} from '@/data/force-catalog/_helpers'

const SRC_CSIS = 'CSIS Missile Threat — DPRK (2026)'
const SRC_38N = '38 North analysis (2026)'
const SRC_MIL = 'Wikipedia — Korean People’s Army inventory; defence press (2026)'

const P = nationFactory('PRK', 'North Korea')

export const NORTH_KOREA_CATALOG: ForceCatalogPlatformFull[] = [
  // ── MISSILES — the DPRK main effort ───────────────────────────────────────
  P({
    id: 'PRK-CAT-HS19', designation: 'Hwasong-19 ICBM', short_name: 'Hwasong-19',
    manufacturer: 'DPRK (state)', domain: 'ground', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2024,
    open_source_summary: 'Solid-fuel road-mobile ICBM — longest-range DPRK system (tested 2024).',
    data_confidence: 'medium', sources: [SRC_CSIS],
    comms: [], sensors: [],
  }),
  P({
    id: 'PRK-CAT-HS18', designation: 'Hwasong-18 ICBM', short_name: 'Hwasong-18',
    manufacturer: 'DPRK (state)', domain: 'ground', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2023,
    open_source_summary: 'First DPRK solid-fuel ICBM — road-mobile, cold-launch canister.',
    data_confidence: 'medium', sources: [SRC_CSIS],
    comms: [], sensors: [],
  }),
  P({
    id: 'PRK-CAT-HS16B', designation: 'Hwasong-16B IRBM (HGV)', short_name: 'Hwasong-16B',
    manufacturer: 'DPRK (state)', domain: 'ground', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2024,
    open_source_summary: 'Solid-fuel IRBM with hypersonic glide vehicle payload (tested 2024).',
    data_confidence: 'estimated', sources: [SRC_CSIS],
    comms: [], sensors: [],
  }),
  P({
    id: 'PRK-CAT-KN23', designation: 'KN-23 / Hwasong-11 SRBM', short_name: 'KN-23',
    manufacturer: 'DPRK (state)', domain: 'ground', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2019,
    open_source_summary: 'Quasi-ballistic SRBM family (Iskander-like) — includes Hwasong-11D and related mass-production SRBM variants; combat use reported abroad; production surging.',
    data_confidence: 'high', sources: [SRC_CSIS, 'Military Watch 2026'],
    comms: [], sensors: [],
  }),
  P({
    id: 'PRK-CAT-KN25', designation: 'KN-25 600mm MLRS', short_name: 'KN-25',
    manufacturer: 'DPRK (state)', domain: 'ground', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2020,
    open_source_summary: 'Large-calibre guided rocket / SRBM-class — "super-large" MLRS.',
    data_confidence: 'medium', sources: [SRC_CSIS],
    comms: [], sensors: [],
  }),

  // ── LAND — Korean People’s Army ───────────────────────────────────────────
  P({
    id: 'PRK-CAT-M2020', designation: 'M2020 (Chonma-D) MBT', short_name: 'M2020',
    manufacturer: 'DPRK (state)', domain: 'ground', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2020,
    open_source_summary: 'Newest DPRK main battle tank — unveiled 2020 (T-14/M1 styling cues).',
    data_confidence: 'medium', sources: [SRC_MIL],
    comms: [uhfVoice('PRK-CAT-M2020')], sensors: [],
  }),
  P({
    id: 'PRK-CAT-KOKSAN', designation: 'M1989 Koksan 170mm SPG', short_name: 'Koksan',
    manufacturer: 'DPRK (state)', domain: 'ground', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 1989,
    open_source_summary: 'Long-range 170mm self-propelled gun — some transferred to Russia.',
    data_confidence: 'medium', sources: [SRC_MIL],
    comms: [uhfVoice('PRK-CAT-KOKSAN')], sensors: [],
  }),

  // ── AIR — obsolescent (analytically significant weakness) ──────────────────
  P({
    id: 'PRK-CAT-MIG29', designation: 'MiG-29 Fulcrum', short_name: 'MiG-29',
    manufacturer: 'Mikoyan (Soviet-era)', domain: 'air', role: 'fighter', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 1988,
    open_source_summary: 'Handful of DPRK’s most-capable fighters — no modern datalink; degraded readiness.',
    data_confidence: 'medium', sources: [SRC_MIL],
    comms: [uhfVoice('PRK-CAT-MIG29')], sensors: [],
  }),
  P({
    id: 'PRK-CAT-SAETBYOL9', designation: 'Saetbyol-9 (HALE UAV)', short_name: 'Saetbyol-9',
    manufacturer: 'DPRK (state)', domain: 'air', role: 'isr', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2023,
    open_source_summary: 'RQ-4-lookalike HALE ISR UAV — unveiled 2023 (capability unproven).',
    data_confidence: 'estimated', sources: [SRC_MIL],
    comms: [satcom('PRK-CAT-SAETBYOL9')], sensors: [],
  }),

  // ── MARITIME — VMF ────────────────────────────────────────────────────────
  P({
    id: 'PRK-CAT-CHOEHYON', designation: 'Choe Hyon-class destroyer', short_name: 'Choe Hyon',
    manufacturer: 'DPRK (state)', domain: 'maritime', role: 'maritime_surface', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2026,
    open_source_summary: 'Guided-missile destroyer commissioned 23 Jun 2026 (~5000t class — largest DPRK warship); fired Hwasal-class LACMs on sea trials Mar 2026; two more building, cruiser planned.',
    data_confidence: 'medium', sources: [SRC_38N, 'KCNA / defence press 2026'],
    comms: [hfVoice('PRK-CAT-CHOEHYON'), uhfVoice('PRK-CAT-CHOEHYON')],
    sensors: [pinnedSensor('PRK-CAT-CHOEHYON', 'radar', 'Claimed phased-array (unverified)', null,
      'air/surface surveillance', ['aircraft', 'surface_contacts'], [], 'Capability unverified — descriptive')],
  }),
  P({
    id: 'PRK-CAT-KIMKUNOK', designation: 'Kim Kun Ok tactical-nuclear sub', short_name: 'Kim Kun Ok',
    manufacturer: 'DPRK (state)', domain: 'maritime', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2023,
    open_source_summary: 'Modified Romeo-class "tactical nuclear attack submarine" — SLBM/SLCM tubes.',
    data_confidence: 'estimated', sources: [SRC_38N],
    comms: [hfVoice('PRK-CAT-KIMKUNOK')], sensors: [],
  }),

  // ── FUTURE PROGRAMS ───────────────────────────────────────────────────────
  P({
    id: 'PRK-CAT-HS20', designation: 'Hwasong-20 ICBM', short_name: 'Hwasong-20',
    manufacturer: 'DPRK (state)', domain: 'ground', role: 'other', force_side: 'red',
    service_status: 'in_development', program_stage: 'announced', ioc_year: null,
    open_source_summary: 'Largest solid-fuel ICBM — unveiled Oct 2025; not yet flight-tested.',
    data_confidence: 'estimated', sources: [SRC_CSIS, SRC_38N],
    comms: [], sensors: [], future: {
      platform_id: 'PRK-CAT-HS20', program_name: 'Hwasong-20 ICBM',
      lead_contractor: 'DPRK (state)', partner_nations: [],
      first_flight_est: 'not yet tested', ioc_est: 'unknown',
      key_features: ['solid-fuel', 'road-mobile', 'MIRV potential (claimed)'],
      status_note: 'Displayed Oct 2025 parade; test status unconfirmed.',
      data_confidence: 'estimated', sources: [SRC_CSIS],
    },
  }),
  P({
    id: 'PRK-CAT-SSBN', designation: 'DPRK SSBN (under construction)', short_name: 'DPRK SSBN',
    manufacturer: 'DPRK (state)', domain: 'maritime', role: 'other', force_side: 'red',
    service_status: 'in_development', program_stage: 'r_and_d', ioc_year: null,
    open_source_summary: 'Nuclear-powered ballistic-missile submarine — hull partially revealed 2025.',
    data_confidence: 'estimated', sources: [SRC_38N],
    comms: [hfVoice('PRK-CAT-SSBN')], sensors: [], future: {
      platform_id: 'PRK-CAT-SSBN', program_name: 'DPRK nuclear-powered SSBN',
      lead_contractor: 'DPRK (state)', partner_nations: ['RUS (suspected assistance)'],
      first_flight_est: null, ioc_est: 'unknown (2030s?)',
      key_features: ['nuclear propulsion (claimed)', 'SLBM tubes'],
      status_note: 'Hull revealed 2025; propulsion/timeline highly uncertain.',
      data_confidence: 'estimated', sources: [SRC_38N],
    },
  }),

  // ── GAP-FILL TRANCHE (Jul 2026 depth pass) ────────────────────────────────
  P({
    id: 'PRK-CAT-SU25', designation: 'Sukhoi Su-25', short_name: 'Su-25',
    manufacturer: 'Sukhoi (legacy)', domain: 'air', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 1980,
    open_source_summary: 'Ground-attack — among more capable KPAF fixed-wing types; serviceability uncertain.',
    data_confidence: 'estimated', sources: [SRC_MIL, 'IISS / defence press'],
    comms: [uhfVoice('PRK-CAT-SU25')], sensors: [],
  }),
  P({
    id: 'PRK-CAT-MIG23', designation: 'MiG-23', short_name: 'MiG-23',
    manufacturer: 'Mikoyan (legacy)', domain: 'air', role: 'fighter', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 1980,
    open_source_summary: 'Variable-geometry fighter-bomber — ageing fleet; readiness questionable.',
    data_confidence: 'estimated', sources: [SRC_MIL],
    comms: [uhfVoice('PRK-CAT-MIG23')], sensors: [],
  }),
  P({
    id: 'PRK-CAT-IL28', designation: 'Il-28 / H-5 Beagle', short_name: 'Il-28',
    manufacturer: 'Ilyushin / Harbin', domain: 'air', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 1960,
    open_source_summary: 'Light bomber — very old airframes; some observed relocating in 2021 imagery studies.',
    data_confidence: 'estimated', sources: [SRC_MIL, 'IISS analysis'],
    comms: [hfVoice('PRK-CAT-IL28')], sensors: [],
  }),
  P({
    id: 'PRK-CAT-AN2', designation: 'Antonov An-2', short_name: 'An-2',
    manufacturer: 'Antonov (legacy)', domain: 'air', role: 'transport', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 1950,
    open_source_summary: 'Large biplane transport fleet — SOF infiltration narrative in OSINT.',
    data_confidence: 'medium', sources: [SRC_MIL],
    comms: [uhfVoice('PRK-CAT-AN2')], sensors: [],
  }),
  P({
    id: 'PRK-CAT-ROMEO', designation: 'Romeo-class SS', short_name: 'Romeo SS',
    manufacturer: 'DPRK (license/legacy)', domain: 'maritime', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 1970,
    open_source_summary: 'Diesel attack / conversion base — some rebuilt as tactical-nuclear SSBs.',
    data_confidence: 'estimated', sources: [SRC_38N, 'NTI submarine capabilities'],
    comms: [hfVoice('PRK-CAT-ROMEO')], sensors: [],
  }),
  P({
    id: 'PRK-CAT-SANGO', designation: 'Sang-O-class SSC', short_name: 'Sang-O',
    manufacturer: 'DPRK (state)', domain: 'maritime', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 1990,
    open_source_summary: 'Coastal submarines — infiltration / special operations role (OSINT).',
    data_confidence: 'estimated', sources: [SRC_38N, 'NTI'],
    comms: [hfVoice('PRK-CAT-SANGO')], sensors: [],
  }),
  P({
    id: 'PRK-CAT-PUKGUKSONG', designation: 'Pukguksong SLBM family', short_name: 'Pukguksong',
    manufacturer: 'DPRK (state)', domain: 'maritime', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2016,
    open_source_summary: 'Solid-fuel SLBM family — Pukguksong-1/-2 sea and land tests; -3/-4/-5 variants under development or early test (OSINT); submarine and land-mobile launch modes reported.',
    data_confidence: 'estimated', sources: [SRC_CSIS, SRC_38N],
    comms: [], sensors: [],
  }),
  P({
    id: 'PRK-CAT-M1978', designation: 'M1978 / Tokchon SPG family', short_name: 'Tokchon SPG',
    manufacturer: 'DPRK (state)', domain: 'ground', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 1978,
    open_source_summary: 'Self-propelled artillery family — mass fires component of KPA doctrine.',
    data_confidence: 'estimated', sources: [SRC_MIL],
    comms: [uhfVoice('PRK-CAT-M1978')], sensors: [],
  }),

  // ── DEPTH PASS 2 (Jul 2026) ──
  P({
    id: 'PRK-CAT-MIG21', designation: 'MiG-21 Fishbed', short_name: 'MiG-21',
    manufacturer: 'Mikoyan (legacy)', domain: 'air', role: 'fighter', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 1960,
    open_source_summary: 'Large ageing fighter fleet — voice-only C2; readiness and availability uncertain.',
    data_confidence: 'estimated', sources: [SRC_MIL],
    comms: [uhfVoice('PRK-CAT-MIG21')], sensors: [],
  }),
  P({
    id: 'PRK-CAT-MI8', designation: 'Mi-8 / Mi-17 Hip', short_name: 'Mi-8/17',
    manufacturer: 'Mil (legacy)', domain: 'air', role: 'transport', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 1970,
    open_source_summary: 'Utility / transport helicopters — primary KPA rotary lift (serviceability opaque).',
    data_confidence: 'estimated', sources: [SRC_MIL],
    comms: [uhfVoice('PRK-CAT-MI8')], sensors: [],
  }),
  P({
    id: 'PRK-CAT-KN24', designation: 'KN-24 / Hwasong-11A SRBM', short_name: 'KN-24',
    manufacturer: 'DPRK (state)', domain: 'ground', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2019,
    open_source_summary: 'Solid-fuel SRBM (ATACMS-like profile in OSINT) — road-mobile TELs; combat use reported abroad.',
    data_confidence: 'medium', sources: [SRC_CSIS, SRC_38N],
    comms: [], sensors: [],
  }),
  P({
    id: 'PRK-CAT-M1991', designation: 'M-1989 / M-1991 MLRS family', short_name: 'M-1991 MLRS',
    manufacturer: 'DPRK (state)', domain: 'ground', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 1991,
    open_source_summary: 'Large-calibre rocket artillery family — massed fires for peninsula contingencies.',
    data_confidence: 'estimated', sources: [SRC_MIL],
    comms: [uhfVoice('PRK-CAT-M1991')], sensors: [],
  }),
  P({
    id: 'PRK-CAT-KN06', designation: 'KN-06 / Pon’gae-5 SAM', short_name: 'KN-06',
    manufacturer: 'DPRK (state)', domain: 'ground', role: 'radar_ground', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2017,
    open_source_summary: 'Indigenous long-range SAM (S-300-class cues in OSINT) — complements legacy SA-5 sites.',
    data_confidence: 'estimated', sources: [SRC_MIL, 'defence press'],
    comms: [uhfVoice('PRK-CAT-KN06'), hfVoice('PRK-CAT-KN06')],
    sensors: [pinnedSensor('PRK-CAT-KN06', 'radar', 'KN-06 search/track radars', 'C',
      'area air defence', ['aircraft', 'cruise_missile'], [], 'SAM radars — descriptive; envelopes pinned')],
  }),
  P({
    id: 'PRK-CAT-NONGO', designation: 'Nongo-class FAC', short_name: 'Nongo FAC',
    manufacturer: 'DPRK (state)', domain: 'maritime', role: 'maritime_surface', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2006,
    open_source_summary: 'Fast attack craft — AShM-armed littoral strike boats (numbers and readiness estimated).',
    data_confidence: 'estimated', sources: [SRC_MIL, SRC_38N],
    comms: [uhfVoice('PRK-CAT-NONGO'), hfVoice('PRK-CAT-NONGO')], sensors: [],
  }),

  // ── DPRK GAP PASS (Claude OSINT Jul 2026) ──
  // HIGH — strategic missiles, LACM, armour mass
  P({
    id: 'PRK-CAT-HS17', designation: 'Hwasong-17 ICBM', short_name: 'Hwasong-17',
    manufacturer: 'DPRK (state)', domain: 'ground', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2022,
    open_source_summary: 'Heavy liquid-fuel road-mobile ICBM — large TEL; flight-tested; MIRV claims unverified (OSINT).',
    data_confidence: 'medium', sources: [SRC_CSIS, SRC_38N],
    comms: [], sensors: [],
  }),
  P({
    id: 'PRK-CAT-HS12', designation: 'Hwasong-12 IRBM', short_name: 'Hwasong-12',
    manufacturer: 'DPRK (state)', domain: 'ground', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2017,
    open_source_summary: 'Liquid-fuel IRBM — theatre strike; intermediate-range flights demonstrated (OSINT).',
    data_confidence: 'medium', sources: [SRC_CSIS],
    comms: [], sensors: [],
  }),
  P({
    id: 'PRK-CAT-HWASAL', designation: 'Hwasal LACM family', short_name: 'Hwasal',
    manufacturer: 'DPRK (state)', domain: 'ground', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2021,
    open_source_summary: 'Land-attack cruise missile family — ground and ship launch (incl. Choe Hyon sea trials); strategic LACM pillar (OSINT).',
    data_confidence: 'medium', sources: [SRC_CSIS, SRC_38N],
    comms: [], sensors: [],
  }),
  P({
    id: 'PRK-CAT-CHONMA2', designation: 'Chonma-2 MBT', short_name: 'Chonma-2',
    manufacturer: 'DPRK (state)', domain: 'ground', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2024,
    open_source_summary: 'Newer parade MBT (distinct from M2020 styling) — APS/APS-like fittings claimed; inventory and readiness opaque.',
    data_confidence: 'estimated', sources: [SRC_MIL, 'parade imagery 2024–26'],
    comms: [uhfVoice('PRK-CAT-CHONMA2')], sensors: [],
  }),
  P({
    id: 'PRK-CAT-CHONMAHO', designation: 'Chonma-ho MBT', short_name: 'Chonma-ho',
    manufacturer: 'DPRK (state)', domain: 'ground', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 1980,
    open_source_summary: 'Legacy T-62-derived main battle tank family — still the armour mass backbone (OSINT).',
    data_confidence: 'medium', sources: [SRC_MIL],
    comms: [uhfVoice('PRK-CAT-CHONMAHO')], sensors: [],
  }),
  // MED — SRBM/ICBM depth, ATGM, UAV, amphib, SAM, APC, midget sub
  P({
    id: 'PRK-CAT-HS11E', designation: 'Hwasong-11E SRBM', short_name: 'Hwasong-11E',
    manufacturer: 'DPRK (state)', domain: 'ground', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2024,
    open_source_summary: 'Extended Hwasong-11-family SRBM variant — solid-fuel road-mobile; distinct from KN-23/24 baseline (OSINT).',
    data_confidence: 'estimated', sources: [SRC_CSIS, SRC_38N],
    comms: [], sensors: [],
  }),
  P({
    id: 'PRK-CAT-HS15', designation: 'Hwasong-15 ICBM', short_name: 'Hwasong-15',
    manufacturer: 'DPRK (state)', domain: 'ground', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2017,
    open_source_summary: 'Heavy liquid-fuel ICBM — early strategic milestone flight; still in force structure alongside newer solids (OSINT).',
    data_confidence: 'medium', sources: [SRC_CSIS],
    comms: [], sensors: [],
  }),
  P({
    id: 'PRK-CAT-BULSAE4', designation: 'Bulsae-4 ATGM', short_name: 'Bulsae-4',
    manufacturer: 'DPRK (state)', domain: 'ground', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2016,
    open_source_summary: 'Vehicle-mounted anti-tank guided missile — top-attack cues in OSINT; exported/observed abroad.',
    data_confidence: 'estimated', sources: [SRC_MIL, 'defence press'],
    comms: [uhfVoice('PRK-CAT-BULSAE4')], sensors: [],
  }),
  P({
    id: 'PRK-CAT-ALCM', designation: 'DPRK air-launched cruise missile', short_name: 'DPRK ALCM',
    manufacturer: 'DPRK (state)', domain: 'ground', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2024,
    open_source_summary: 'Air-launched cruise missile — flight demonstrations claimed from H-5/Il-28-class carriers (OSINT; employment unproven).',
    data_confidence: 'estimated', sources: [SRC_CSIS, SRC_38N],
    comms: [], sensors: [],
  }),
  P({
    id: 'PRK-CAT-SAETBYOL4', designation: 'Saetbyol-4 (MALE UAV)', short_name: 'Saetbyol-4',
    manufacturer: 'DPRK (state)', domain: 'air', role: 'isr', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2023,
    open_source_summary: 'MQ-9-lookalike MALE ISR/strike UAV — unveiled with Saetbyol-9; operational status uncertain.',
    data_confidence: 'estimated', sources: [SRC_MIL],
    comms: [uhfVoice('PRK-CAT-SAETBYOL4')], sensors: [],
  }),
  P({
    id: 'PRK-CAT-NAMPO', designation: 'Nampo-class landing ship', short_name: 'Nampo LSL',
    manufacturer: 'DPRK (state)', domain: 'maritime', role: 'maritime_surface', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2014,
    open_source_summary: 'Amphibious landing ship — beach assault / logistics lift for peninsula contingencies (OSINT).',
    data_confidence: 'estimated', sources: [SRC_MIL, SRC_38N],
    comms: [uhfVoice('PRK-CAT-NAMPO'), hfVoice('PRK-CAT-NAMPO')], sensors: [],
  }),
  P({
    id: 'PRK-CAT-SA5', designation: 'SA-5 Gammon / S-200', short_name: 'SA-5',
    manufacturer: 'Soviet legacy / DPRK', domain: 'ground', role: 'radar_ground', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 1980,
    open_source_summary: 'Legacy long-range SAM sites — still part of DPRK IADS backbone alongside KN-06 (OSINT).',
    data_confidence: 'medium', sources: [SRC_MIL, 'defence press'],
    comms: [uhfVoice('PRK-CAT-SA5'), hfVoice('PRK-CAT-SA5')],
    sensors: [pinnedSensor('PRK-CAT-SA5', 'radar', 'SA-5 Square Pair / early-warning radars', 'C',
      'area air defence', ['aircraft'], [], 'Legacy SAM radars — descriptive; envelopes pinned')],
  }),
  P({
    id: 'PRK-CAT-VTT323', designation: 'VTT-323 APC', short_name: 'VTT-323',
    manufacturer: 'DPRK (state)', domain: 'ground', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 1973,
    open_source_summary: 'Indigenous tracked APC (Type 63 derivative) — mass mechanised infantry carrier (OSINT).',
    data_confidence: 'estimated', sources: [SRC_MIL],
    comms: [uhfVoice('PRK-CAT-VTT323')], sensors: [],
  }),
  P({
    id: 'PRK-CAT-YONO', designation: 'Yono-class midget submarine', short_name: 'Yono',
    manufacturer: 'DPRK (state)', domain: 'maritime', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2000,
    open_source_summary: 'Midget submarine — special operations / coastal attack; associated with Cheonan incident narrative (OSINT).',
    data_confidence: 'estimated', sources: [SRC_38N, 'NTI'],
    comms: [hfVoice('PRK-CAT-YONO')], sensors: [],
  }),

]
