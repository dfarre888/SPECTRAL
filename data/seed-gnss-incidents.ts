/**
 * SPECTRAL — GNSS incident seed dataset (OSINT, evidence-graded).
 * CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */

import type { GnssIncident } from '@/lib/gnss/types';

const now = '2026-06-14T00:00:00Z';

export const SEED_GNSS_INCIDENTS: GnssIncident[] = [

  // ── DOCKLANDS 2023 — the confirmed-cause anchor (ATSB AO-2023-033) ──────────
  {
    id: 'INC-2023-DOCKLANDS',
    title: 'Docklands swarm — 427 of 500 drones ditched; wind exceedance (GNSS ruled out)',
    date: '2023-07-14',
    event_context: 'Drone light show, Victoria Harbour, supporting a sporting event',
    platform: {
      drone_type: 'Damoda Newton V2.2 (725 g quadcopter)',
      category: 'show_swarm',
      positioning_resilience: ['gps_only', 'rtk'],   // GNSS + RTK network correction
      swarm_size: 500,
    },
    environment: {
      location_name: 'Victoria Harbour, Docklands, Melbourne',
      country: 'Australia',
      lat: -37.8190, lng: 144.9460,
      environment_type: 'urban_dense',
      rf_density_note: 'Dense urban harbour, high-rise on three sides. Notably, the operator anticipated magnetic interference at the launch site from steel-reinforced dock concrete — but that was not the cause.',
      near_known_interference_zone: false,
    },
    // CATEGORISATION — primarily environmental, NOT GNSS denial
    failure_family_primary: 'environmental',
    failure_family_contributing: ['human_factors', 'procedural'],
    // SPECTRUM — the operator actually ran a survey and found the bands clean
    spectrum: {
      dependencies: [
        { band: 'GPS_L1', role: 'positioning', interference_on_band: { value: false, grade: 'confirmed', basis: 'Aircraft showed 23–28 satellites and a high-accuracy RTK fix at launch; pre-show spectrum analyser found no abnormalities.', source_ref: 'ATSB AO-2023-033' }, note: 'Primary positioning band; confirmed healthy at launch.' },
        { band: 'rtk_correction_link', role: 'positioning_correction', interference_on_band: { value: false, grade: 'confirmed', basis: 'RTK fix was high-accuracy and stable pre-launch; GCS positions matched CCTV (no spoofing displacement).', source_ref: 'ATSB AO-2023-033' }, note: 'Differential ground station correction link.' },
        { band: 'control_link_2_4ghz', role: 'swarm_network', interference_on_band: { value: false, grade: 'confirmed', basis: 'Wi-Fi swarm network; no command/control anomalies recorded. ATSB also ruled out a malicious actor — no unexpected mode changes or commands.', source_ref: 'ATSB AO-2023-033' }, note: 'Wi-Fi swarm comms + 2.4 GHz VANTAC/FrSky hand controller backup.' },
      ],
      spectrum_survey_conducted: true,
      survey_finding: 'Operator set up a spectrum analyser pre-show specifically to detect GNSS interference. No abnormalities identified. This is the model behaviour the repository advocates — and here it correctly exonerated the spectrum.',
    },
    failure_mode: {
      value: 'onboard_fault',   // i.e. not RF; environmental exceedance of capability
      grade: 'confirmed',
      basis: 'ATSB final report (2025) determined the swarm encountered wind more than double the 8 m/s aircraft limit at show altitude; motors could not maintain lift/position. GNSS jamming, spoofing, and malicious control were each specifically investigated and ruled out.',
      source_ref: 'ATSB AO-2023-033',
    },
    affected_bands: {
      value: [],
      grade: 'confirmed',
      basis: 'No band was affected — the spectrum was confirmed clean. This is the dataset\u2019s proof that not every swarm loss is an RF event.',
      source_ref: 'ATSB AO-2023-033',
    },
    affected_constellations: {
      value: [],
      grade: 'confirmed',
      basis: 'GNSS confirmed healthy (23–28 satellites, RTK fix). No constellation was denied.',
      source_ref: 'ATSB AO-2023-033',
    },
    interference_source: {
      value: 'None — no interference involved',
      grade: 'confirmed',
      basis: 'Cause was environmental (wind) plus human factors. Interference explicitly excluded by investigation.',
      source_ref: 'ATSB AO-2023-033',
    },
    outcome: {
      drones_affected: 427,
      failsafe_behaviour: 'mixed',
      injuries: 0, fatalities: 0,
      property_damage: true,
      show_cancelled: true,
      regulator_action: 'ATSB final report 2025 (AO-2023-033). Three safety issues; safety recommendations to operator (ATN) and manufacturer (Damoda) for active wind-exceedance alerting.',
      description: '427 of 500 drones ditched into the harbour; 236 recovered, 191 lost. No injuries (over-water show). Caused by wind exceedance at show altitude compounded by human factors.',
    },
    mitigation_that_helped: 'Over-water siting prevented injury. Pre-show spectrum survey correctly cleared GNSS. Geofence and failsafe modes activated.',
    mitigation_that_would_have_helped: 'Use of the GCS wind-speed readout (crew were unaware it existed); a weather-drone wind check at show altitude; active wind-exceedance alerting; sterile-cockpit procedures; a more current copilot to flatten the cockpit gradient.',
    sources: [
      { type: 'ntsb_atsb', title: 'ATSB AO-2023-033 — Control issues and ditching involving RPA swarm of 500 Damoda Newton 2.2 RPA, Victoria Harbour, Docklands', url: 'https://www.atsb.gov.au/publications/investigation_reports/2025/report/ao-2023-033', reliability: 'primary', accessed: '2026-06-14' },
    ],
    overall_confidence: 'confirmed',
    analyst_notes: 'THE ANCHOR INCIDENT. The most thorough drone-swarm investigation in existence, and the only confirmed-cause entry in the dataset. Crucially, it is NOT a GNSS-denial event — the ATSB ran the spectrum check and cleared it, then proved wind + human factors. This is the repository\u2019s credibility keystone: it demonstrates the tool will say "not RF" when the evidence says not RF. Human-factors chain worth teaching in full: RPIC unaware the GCS displayed wind speed; no active wind alert; high workload from an inexperienced copilot (who was the CRP — negative cockpit gradient); client/CEO pressure; continuation bias from 30+ incident-free shows; a fixed harbour-closure window forcing launch time.',
    created_at: now, updated_at: now,
  },


  // ── VIVID SYDNEY 2026 ──────────────────────────────────────────────────────
  {
    id: 'INC-2026-SYD-VIVID',
    title: 'Vivid Sydney Star-Bound show cancelled — GPS positioning disrupted',
    date: '2026-05-26',
    event_context: 'Vivid Sydney 2026 nightly drone show, Cockle Bay, Darling Harbour',
    platform: {
      drone_type: 'Show drone (swarm)',
      category: 'show_swarm',
      positioning_resilience: ['gps_only', 'rtk'],   // show drones typically GNSS+RTK
      swarm_size: 1000,
    },
    environment: {
      location_name: 'Cockle Bay, Darling Harbour, Sydney',
      country: 'Australia',
      lat: -33.8748, lng: 151.1987,
      environment_type: 'urban_dense',
      rf_density_note: 'Dense CBD waterfront — high ambient RF, surrounded by commercial towers and transport infrastructure.',
      near_known_interference_zone: false,
    },
    failure_family_primary: 'gnss_denial',
    failure_family_contributing: [],
    spectrum: {
      dependencies: [
        { band: 'GPS_L1', role: 'positioning', interference_on_band: { value: true, grade: 'inferred', basis: 'Failure pattern consistent with L1 disruption; no source confirmed the band.', source_ref: null }, note: 'Primary positioning band for show drones.' },
        { band: 'rtk_correction_link', role: 'positioning_correction', interference_on_band: { value: false, grade: 'unknown', basis: 'RTK link status not reported.', source_ref: null }, note: 'RTK correction typically used for show accuracy.' },
      ],
      spectrum_survey_conducted: null,
      survey_finding: null,
    },
    failure_mode: {
      value: 'adjacent_band_bleed',
      grade: 'inferred',
      basis: 'Reporting referred to a "radio frequency change / adjacent-band interference" disrupting GPS. Source and exact mechanism stated as under investigation. Classification is an analyst inference, not a confirmed finding.',
      source_ref: 'ABC News 2026-05-26 (paywalled); prior A3DM case study',
    },
    affected_bands: {
      value: ['GPS_L1'],
      grade: 'inferred',
      basis: 'Show drones depend primarily on GPS L1; the failure pattern is consistent with L1 disruption. No source confirmed the specific band.',
      source_ref: null,
    },
    affected_constellations: {
      value: ['GPS'],
      grade: 'reported',
      basis: 'Reporting explicitly described GPS positioning being disrupted. Whether other constellations were affected was not stated.',
      source_ref: 'ABC News 2026-05-26',
    },
    interference_source: {
      value: 'Under investigation — not identified',
      grade: 'unknown',
      basis: 'No source identified the interference source. Officially under investigation.',
      source_ref: null,
    },
    outcome: {
      drones_affected: 1000,
      failsafe_behaviour: 'controlled_descent',
      injuries: 0, fatalities: 0,
      property_damage: false,
      show_cancelled: true,
      regulator_action: 'Investigation; remaining festival nights continued.',
      description: 'Show cancelled for safety before/early in performance. No injuries. Vivid continued on subsequent nights.',
    },
    mitigation_that_helped: 'Failsafe controlled descent prevented uncontrolled falls; pre-show decision to cancel.',
    mitigation_that_would_have_helped: 'Pre-show RF survey; multi-constellation + non-GNSS (UWB/INS) fallback for GNSS-denied resilience.',
    sources: [
      { type: 'news', title: 'ABC News — Vivid drone show cancellation', url: 'https://www.abc.net.au/news/2026-05-26/technical-issues-force-cancellation-vivid-drone-show-monday/106721200', reliability: 'secondary', accessed: '2026-05-27' },
    ],
    overall_confidence: 'inferred',
    analyst_notes: 'A near-textbook GNSS-denial event in a dense urban waterfront. Cause genuinely undetermined publicly — graded accordingly. Strong teaching example precisely because the cause is unconfirmed: operators must plan for GNSS denial even when they will never know the source.',
    created_at: now, updated_at: now,
  },

  // ── HO CHI MINH CITY 2025 ──────────────────────────────────────────────────
  {
    id: 'INC-2025-HCMC',
    title: 'Ho Chi Minh City 10,500-drone show — mass signal interference',
    date: '2025-04-30',
    event_context: '50th Reunification Anniversary celebration',
    platform: {
      drone_type: 'Show drone (swarm), DAMODA',
      category: 'show_swarm',
      positioning_resilience: ['gps_only', 'rtk'],
      swarm_size: 10500,
    },
    environment: {
      location_name: 'Ho Chi Minh City centre',
      country: 'Vietnam',
      lat: 10.7769, lng: 106.7009,
      environment_type: 'urban_dense',
      rf_density_note: 'Dense city centre; very high ambient RF in a major metropolitan area.',
      near_known_interference_zone: false,
    },
    failure_family_primary: 'gnss_denial',
    failure_family_contributing: ['environmental'],
    spectrum: {
      dependencies: [
        { band: 'unknown', role: 'positioning', interference_on_band: { value: false, grade: 'unknown', basis: 'No band-level detail reported.', source_ref: null }, note: 'Bands not disclosed.' },
      ],
      spectrum_survey_conducted: null,
      survey_finding: null,
    },
    failure_mode: {
      value: 'rf_congestion',
      grade: 'inferred',
      basis: 'Widespread simultaneous interference across all 10,500 drones. Urban RF density suspected by reporting but exact source unconfirmed. Mode is an inference.',
      source_ref: 'News reporting 2025; prior A3DM case study',
    },
    affected_bands: {
      value: ['unknown'],
      grade: 'unknown',
      basis: 'No band-level detail was reported.',
      source_ref: null,
    },
    affected_constellations: {
      value: ['unknown'],
      grade: 'unknown',
      basis: 'Constellation detail not reported; "signal interference" only.',
      source_ref: null,
    },
    interference_source: {
      value: 'Unconfirmed — urban RF density suspected',
      grade: 'reported',
      basis: 'Reporting suggested urban RF density; no confirmed source.',
      source_ref: 'News reporting 2025',
    },
    outcome: {
      drones_affected: 10500,
      failsafe_behaviour: 'mixed',
      injuries: 0, fatalities: 0,
      property_damage: true,
      show_cancelled: true,
      regulator_action: 'May 1 repeat show cancelled. Apr 28 rehearsal Guinness record still awarded.',
      description: 'Drones fell into audience area; show halted after 4–5 minutes. No confirmed injuries despite audience impact.',
    },
    mitigation_that_helped: null,
    mitigation_that_would_have_helped: 'RF survey of the dense urban site; non-GNSS positioning fallback; reduced swarm density over audience.',
    sources: [
      { type: 'news', title: 'News reporting — HCMC Reunification drone show', url: null, reliability: 'secondary', accessed: '2026-05-27' },
      { type: 'academic', title: 'arXiv — Robust Evacuation for Multi-Drone Failure in Drone Light Shows', url: 'https://arxiv.org/pdf/2601.06728', reliability: 'primary', accessed: '2026-06-14' },
    ],
    overall_confidence: 'unknown',
    analyst_notes: 'Largest swarm in the dataset and the most severe audience impact. Cause never confirmed. The scale makes it the strongest argument for mandatory RF survey at large urban shows.',
    created_at: now, updated_at: now,
  },

  // ── SEATTLE / SEATAC 2024 ──────────────────────────────────────────────────
  {
    id: 'INC-2024-SEATTLE',
    title: 'Seattle Independence Day show — 55 drones lost GPS, descended into lake',
    date: '2024-07-04',
    event_context: 'Independence Day drone show',
    platform: {
      drone_type: 'Show drone (swarm)',
      category: 'show_swarm',
      positioning_resilience: ['gps_only'],
      swarm_size: 55,
    },
    environment: {
      location_name: 'Seattle / SeaTac area, Washington',
      country: 'USA',
      lat: 47.4502, lng: -122.3088,
      environment_type: 'urban',
      rf_density_note: 'Metropolitan area; SeaTac airport vicinity raises RF complexity.',
      near_known_interference_zone: false,
    },
    failure_family_primary: 'gnss_denial',
    failure_family_contributing: [],
    spectrum: {
      dependencies: [
        { band: 'GPS_L1', role: 'positioning', interference_on_band: { value: true, grade: 'reported', basis: 'Operator attributed loss to external RF interference; band inferred from platform dependence.', source_ref: 'Operator statement 2024' }, note: 'GPS loss reported across the swarm.' },
      ],
      spectrum_survey_conducted: null,
      survey_finding: null,
    },
    failure_mode: {
      value: 'jamming_broadband',
      grade: 'reported',
      basis: 'Operator publicly confirmed "nothing wrong with drones or software" and attributed the loss to outside RF interference. Whether broadband jamming vs adjacent-band was the mechanism was not confirmed — graded reported, not confirmed.',
      source_ref: 'Operator statement; FAA investigation 2024',
    },
    affected_bands: {
      value: ['GPS_L1'],
      grade: 'inferred',
      basis: 'GPS lock lost across the swarm; L1 dependence inferred from platform type. Band not explicitly confirmed.',
      source_ref: null,
    },
    affected_constellations: {
      value: ['GPS'],
      grade: 'reported',
      basis: 'GPS loss explicitly reported.',
      source_ref: 'Operator statement 2024',
    },
    interference_source: {
      value: 'Outside RF interference — off-frequency towers or unauthorised jamming suspected; never conclusively attributed',
      grade: 'reported',
      basis: 'Operator and reporting cited outside interference; source never confirmed.',
      source_ref: 'FAA investigation 2024',
    },
    outcome: {
      drones_affected: 55,
      failsafe_behaviour: 'controlled_descent',
      injuries: 0, fatalities: 0,
      property_damage: false,
      show_cancelled: true,
      regulator_action: 'FAA investigation launched; never conclusively attributed.',
      description: '55 drones lost GPS lock and performed controlled descent into a lake. No injuries.',
    },
    mitigation_that_helped: 'Controlled-descent failsafe over water; no injuries.',
    mitigation_that_would_have_helped: 'Multi-constellation receivers; RF monitoring during show to characterise the interference.',
    sources: [
      { type: 'operator_statement', title: 'Operator statement on outside RF interference', url: null, reliability: 'primary', accessed: '2026-05-27' },
      { type: 'academic', title: 'arXiv — drone-show failure analysis (SeaTac 2024)', url: 'https://arxiv.org/pdf/2601.06728', reliability: 'primary', accessed: '2026-06-14' },
    ],
    overall_confidence: 'reported',
    analyst_notes: 'Useful because the operator explicitly ruled out aircraft/software fault — one of the cleaner "external interference" attributions, though the source was never confirmed.',
    created_at: now, updated_at: now,
  },

  // ── FOLLY BEACH 2024 ───────────────────────────────────────────────────────
  {
    id: 'INC-2024-FOLLY',
    title: 'Folly Beach NYE show — signal malfunction, one injury',
    date: '2024-12-31',
    event_context: 'New Year\'s Eve drone show',
    platform: {
      drone_type: 'Show drone (swarm)',
      category: 'show_swarm',
      positioning_resilience: ['gps_only'],
      swarm_size: 250,
    },
    environment: {
      location_name: 'Folly Beach, South Carolina',
      country: 'USA',
      lat: 32.6552, lng: -79.9403,
      environment_type: 'coastal',
      rf_density_note: 'Coastal town; lower ambient RF than a CBD but coastal maritime interference possible.',
      near_known_interference_zone: false,
    },
    failure_family_primary: 'undetermined',
    failure_family_contributing: [],
    spectrum: {
      dependencies: [
        { band: 'unknown', role: 'positioning', interference_on_band: { value: false, grade: 'unknown', basis: 'Nature of the signal malfunction not disclosed.', source_ref: null }, note: 'Cause not disclosed.' },
      ],
      spectrum_survey_conducted: null,
      survey_finding: null,
    },
    failure_mode: {
      value: 'undetermined',
      grade: 'unknown',
      basis: 'Described only as a "signal malfunction" ~3 minutes in. Nature of interference not publicly disclosed.',
      source_ref: 'FAA notification 2024/25',
    },
    affected_bands: {
      value: ['unknown'],
      grade: 'unknown',
      basis: 'No band detail disclosed.',
      source_ref: null,
    },
    affected_constellations: {
      value: ['unknown'],
      grade: 'unknown',
      basis: 'Not disclosed.',
      source_ref: null,
    },
    interference_source: {
      value: 'Not publicly disclosed',
      grade: 'unknown',
      basis: 'Nature and source of the signal malfunction not disclosed.',
      source_ref: null,
    },
    outcome: {
      drones_affected: 250,
      failsafe_behaviour: 'controlled_descent',
      injuries: 1, fatalities: 0,
      property_damage: false,
      show_cancelled: true,
      regulator_action: 'FAA notified and investigating.',
      description: 'Signal malfunction ~3 min in triggered controlled descent. One adult male struck, non-life-threatening injury. Show cancelled.',
    },
    mitigation_that_helped: 'Controlled descent limited severity.',
    mitigation_that_would_have_helped: 'Greater stand-off between swarm and crowd; documented cause would aid prevention.',
    sources: [
      { type: 'regulator', title: 'FAA notification — Folly Beach NYE incident', url: null, reliability: 'secondary', accessed: '2026-05-27' },
    ],
    overall_confidence: 'unknown',
    analyst_notes: 'Included specifically because cause was NOT disclosed — a reminder that "signal malfunction" in reporting tells an operator nothing actionable. Injury occurred despite controlled descent: crowd stand-off matters.',
    created_at: now, updated_at: now,
  },

  // ── ORLANDO 2024 ───────────────────────────────────────────────────────────
  {
    id: 'INC-2024-ORLANDO',
    title: 'Orlando drone show — collision/drop, child injured',
    date: '2024-12-21',
    event_context: 'Holiday drone show',
    platform: {
      drone_type: 'Show drone (swarm)',
      category: 'show_swarm',
      positioning_resilience: ['gps_only'],
      swarm_size: 500,
    },
    environment: {
      location_name: 'Orlando, Florida',
      country: 'USA',
      lat: 28.5384, lng: -81.3789,
      environment_type: 'urban',
      rf_density_note: 'Metropolitan area.',
      near_known_interference_zone: false,
    },
    failure_family_primary: 'equipment_firmware',
    failure_family_contributing: ['procedural'],
    spectrum: {
      dependencies: [
        { band: 'unknown', role: 'positioning', interference_on_band: { value: false, grade: 'reported', basis: 'Not attributed to RF interference; associated with collision/operational failure.', source_ref: null }, note: 'Not an RF event — counter-example.' },
      ],
      spectrum_survey_conducted: null,
      survey_finding: null,
    },
    failure_mode: {
      value: 'onboard_fault',
      grade: 'reported',
      basis: 'Reporting attributed this incident to drones colliding/dropping with a child injured; it was associated with operational failures rather than confirmed external interference. Mode graded reported and flagged as possibly NOT an RF event.',
      source_ref: 'News reporting; FAA/NTSB action 2024',
    },
    affected_bands: {
      value: ['unknown'],
      grade: 'unknown',
      basis: 'No RF/band attribution; may not be an interference event at all.',
      source_ref: null,
    },
    affected_constellations: {
      value: ['unknown'],
      grade: 'unknown',
      basis: 'Not applicable / not reported.',
      source_ref: null,
    },
    interference_source: {
      value: 'Not attributed to external interference',
      grade: 'reported',
      basis: 'This incident is associated with collision/operational failure, not confirmed RF interference. Retained in the dataset for completeness but flagged.',
      source_ref: null,
    },
    outcome: {
      drones_affected: 500,
      failsafe_behaviour: 'mixed',
      injuries: 1, fatalities: 0,
      property_damage: false,
      show_cancelled: true,
      regulator_action: 'FAA suspended operator waiver; NTSB investigation; multiple shows cancelled nationally.',
      description: 'Drones collided/dropped; a child was injured. Significant regulatory response followed.',
    },
    mitigation_that_helped: null,
    mitigation_that_would_have_helped: 'Not necessarily an RF mitigation case — included to show not every show failure is GNSS denial.',
    sources: [
      { type: 'ntsb_atsb', title: 'NTSB investigation / FAA waiver suspension', url: null, reliability: 'secondary', accessed: '2026-05-27' },
    ],
    overall_confidence: 'reported',
    analyst_notes: 'IMPORTANT for analytic honesty: this is the counter-example in the dataset. It is widely listed among "drone show failures" but is NOT a confirmed GNSS-denial event. Keeping it — correctly graded — stops the analytics from overcounting RF causation.',
    created_at: now, updated_at: now,
  },

  // ── HONG KONG 2018 ─────────────────────────────────────────────────────────
  {
    id: 'INC-2018-HONGKONG',
    title: 'Hong Kong Victoria Harbour show — 46 drones dropped into harbour',
    date: '2018-10-01',
    event_context: 'Drone light show, Victoria Harbour',
    platform: {
      drone_type: 'Show drone (swarm)',
      category: 'show_swarm',
      positioning_resilience: ['gps_only'],
      swarm_size: 46,
    },
    environment: {
      location_name: 'Victoria Harbour, Hong Kong',
      country: 'Hong Kong',
      lat: 22.2940, lng: 114.1722,
      environment_type: 'urban_dense',
      rf_density_note: 'One of the densest urban RF environments in the world; harbour surrounded by high-rise towers.',
      near_known_interference_zone: false,
    },
    failure_family_primary: 'gnss_denial',
    failure_family_contributing: [],
    spectrum: {
      dependencies: [
        { band: 'unknown', role: 'positioning', interference_on_band: { value: true, grade: 'reported', basis: 'Reported as suspected interference; band never confirmed.', source_ref: 'arXiv 2601.06728' }, note: 'Extreme-density harbour RF environment.' },
      ],
      spectrum_survey_conducted: null,
      survey_finding: null,
    },
    failure_mode: {
      value: 'jamming_narrowband',
      grade: 'reported',
      basis: 'Widely reported as suspected signal interference/jamming causing ~46 drones to drop into the harbour. Mechanism not confirmed; graded reported.',
      source_ref: 'arXiv drone-show failure analysis; contemporaneous reporting',
    },
    affected_bands: {
      value: ['unknown'],
      grade: 'unknown',
      basis: 'No band-level confirmation.',
      source_ref: null,
    },
    affected_constellations: {
      value: ['unknown'],
      grade: 'unknown',
      basis: 'Not confirmed.',
      source_ref: null,
    },
    interference_source: {
      value: 'Suspected interference — not confirmed',
      grade: 'reported',
      basis: 'Reporting cited suspected interference; source never confirmed.',
      source_ref: 'arXiv 2601.06728',
    },
    outcome: {
      drones_affected: 46,
      failsafe_behaviour: 'controlled_descent',
      injuries: 0, fatalities: 0,
      property_damage: true,
      show_cancelled: false,
      regulator_action: 'Equipment loss into harbour; no injuries.',
      description: 'Approximately 46 drones dropped into Victoria Harbour during the show.',
    },
    mitigation_that_helped: 'Descent over water avoided crowd injury.',
    mitigation_that_would_have_helped: 'RF survey in an extreme-density harbour environment; non-GNSS fallback.',
    sources: [
      { type: 'academic', title: 'arXiv — Robust Evacuation for Multi-Drone Failure in Drone Light Shows', url: 'https://arxiv.org/pdf/2601.06728', reliability: 'primary', accessed: '2026-06-14' },
    ],
    overall_confidence: 'reported',
    analyst_notes: 'Earliest incident in the dataset (2018) — establishes that this is not a new phenomenon. The "~46 drones dropped" figure is close to the "89 dropped" the operator may be recalling; worth verifying which harbour-drop event they meant.',
    created_at: now, updated_at: now,
  },

  // ── TAICHUNG 2020 ──────────────────────────────────────────────────────────
  {
    id: 'INC-2020-TAICHUNG',
    title: 'Taichung City drone show — multi-drone drop',
    date: '2020-02-08',
    event_context: 'Lantern Festival / city drone show',
    platform: {
      drone_type: 'Show drone (swarm)',
      category: 'show_swarm',
      positioning_resilience: ['gps_only'],
      swarm_size: null,
    },
    environment: {
      location_name: 'Taichung City',
      country: 'Taiwan',
      lat: 24.1477, lng: 120.6736,
      environment_type: 'urban',
      rf_density_note: 'Urban festival environment.',
      near_known_interference_zone: false,
    },
    failure_family_primary: 'undetermined',
    failure_family_contributing: [],
    spectrum: {
      dependencies: [
        { band: 'unknown', role: 'positioning', interference_on_band: { value: false, grade: 'unknown', basis: 'Cause indeterminate per academic review.', source_ref: 'arXiv 2601.06728' }, note: 'Cause indeterminate.' },
      ],
      spectrum_survey_conducted: null,
      survey_finding: null,
    },
    failure_mode: {
      value: 'undetermined',
      grade: 'unknown',
      basis: 'Documented as a multi-drone failure of indeterminate cause in academic review. Not attributed to confirmed interference.',
      source_ref: 'arXiv 2601.06728',
    },
    affected_bands: { value: ['unknown'], grade: 'unknown', basis: 'Not reported.', source_ref: null },
    affected_constellations: { value: ['unknown'], grade: 'unknown', basis: 'Not reported.', source_ref: null },
    interference_source: { value: 'Indeterminate', grade: 'unknown', basis: 'Cause indeterminate per academic review.', source_ref: 'arXiv 2601.06728' },
    outcome: {
      drones_affected: null,
      failsafe_behaviour: 'controlled_descent',
      injuries: 0, fatalities: 0,
      property_damage: true,
      show_cancelled: false,
      regulator_action: null,
      description: 'Multi-drone drop during the show; cause indeterminate.',
    },
    mitigation_that_helped: null,
    mitigation_that_would_have_helped: 'Cause-determination instrumentation (GNSS interference logging) would have made this actionable.',
    sources: [
      { type: 'academic', title: 'arXiv — Robust Evacuation for Multi-Drone Failure in Drone Light Shows', url: 'https://arxiv.org/pdf/2601.06728', reliability: 'primary', accessed: '2026-06-14' },
    ],
    overall_confidence: 'unknown',
    analyst_notes: 'Indeterminate cause. Included to keep the "unknown" category honest — a large share of real incidents are simply never explained, which is itself the headline finding.',
    created_at: now, updated_at: now,
  },

];
