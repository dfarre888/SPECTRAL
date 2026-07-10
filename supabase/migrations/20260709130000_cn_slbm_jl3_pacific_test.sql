-- SPECTRAL — Chinese JL-3 SLBM (Pacific test, 6 July 2026)
-- First Chinese SLBM test into the Pacific since 2019
-- Type 094A Jin-class SSBN, SCS launch, ~7,300 km range, impact ~300 km east of Tonga
-- All data OSINT. CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
--
-- TRAINING INTENT: This migration establishes the JL-3 SLBM threat entry, the two
-- primary detection sensors (JORN + Exmouth C-band SSR), and defeat_effectiveness
-- rows that EXPLICITLY show Pk = 0 for all current ADF organic systems.
-- The ADF capability gap against ICBM/SLBM class is itself the training outcome.
-- Students must understand the threat their country faces and why SM-3 / BMD
-- cooperation under AUKUS is strategically important.

-- ═══════════════════════════════════════════════════════════════════════════════

-- Extend taxonomy for SLBM entries
ALTER TABLE platforms DROP CONSTRAINT IF EXISTS platforms_category_check;
ALTER TABLE platforms ADD CONSTRAINT platforms_category_check CHECK (category IN (
  'MALE','HALE','tactical','loitering_munition','FPV','naval','VTOL',
  'fixed_wing_tactical','interceptor_uas','combat_hexacopter','carrier_uas','tube_launched_lm',
  'c_uas_gun','c_uas_laser','c_uas_rf','manpads','c_uas_system',
  'ballistic_missile_srbm','ballistic_missile_mrbm','cruise_missile','hypersonic_missile',
  'ballistic_missile_slbm'
));

-- SECTION 1 — JL-3 SLBM PLATFORM ENTRY
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO platforms (
  id, name, manufacturer, country_of_origin, category,
  max_speed_kmh, service_ceiling_m, range_km, endurance_hrs, mtow_kg, warhead_kg,
  guidance_type, gnss_independent, ai_autonomous, swarm_capable,
  gnss_used, nav_backup, weapon_types, sensor_suite, known_operators, conflict_deployments,
  data_confidence, sources, classification
) VALUES

('cn-jl3-slbm',
 'JL-3 (Julang-3 / CSS-N-14 Mod) — Chinese Submarine-Launched Ballistic Missile',
 'China Aerospace Science and Industry Corporation (CASIC)', 'China',
 'ballistic_missile_slbm',
 -- Reentry body speed: ~25,000 km/h (Mach ~20+ at terminal; 7 km/s)
 25200,
 -- Apogee: ~1,000–1,200 km altitude on standard trajectory (space-border crossing)
 1200000,
 -- Max range: 10,000–12,000 km (JL-3); test range 7,300 km (SCS → east of Tonga)
 12000,
 -- Time of flight SCS to ~7,300 km: ~30–35 min
 0.55,
 -- Launch mass: not publicly confirmed; estimated ~40,000–50,000 kg (3-stage solid)
 NULL,
 -- Payload mass: assessed ~2,200 kg (MIRV payload bus + 3–5 RVs + penetration aids)
 2200,
 'INS+GLONASS',
 -- Stellar inertial provides GNSS-independent guidance — can defeat GPS jamming/spoofing entirely
 true,
 false,
 -- MIRV: NOT swarm — note separately; swarm_capable field covers cooperative UAS behaviour
 false,
 ARRAY['Beidou']::TEXT[],
 ARRAY['stellar_inertial']::TEXT[],
 ARRAY['nuclear_mirv']::TEXT[],
 -- No sensor suite in the targeting sense — passive reentry bodies
 ARRAY[]::TEXT[],
 ARRAY['PLAN (People''s Liberation Army Navy) — Type 094/094A Jin-class SSBN (12 missiles per hull, 6 hulls assessed operational/in-build)']::TEXT[],
 ARRAY['Pacific SLBM test, 6 July 2026, 04:01 UTC — SCS launch, impact ~300 km east of Tonga. Type not officially confirmed. Analysts and Chinese commentators assess JL-3 (10,000–12,000 km range). JL-2A also possible (range ~8,000–9,000 km; test range 7,300 km is within both envelopes). Flight path: overflew northern Philippines/Luzon. Simulated training warhead. Most PLAN analysts assess the test as operational validation of JL-3 on upgraded Type 094A hulls. This was the first PLAN SLBM test into international Pacific waters since 2019. Timed concurrent with PLA/Russia annual exercise and three days before Taipan Strike 26 ADF media release — deliberate signalling context.']::TEXT[],
 'medium',
 ARRAY[
   'OSINT: USNI News, 6 Jul 2026 — China tests SLBM, kicks off annual exercise with Russia',
   'OSINT: The Warzone (TWZ), 6 Jul 2026 — China SLBM test in Pacific is a big deal (analysis)',
   'OSINT: CSIS Missile Threat, Jul 2026 — JL-3 SLBM Pacific test analysis',
   'OSINT: The Diplomat, Jul 2026 — China Pacific SLBM test new phase in undersea nuclear competition',
   'OSINT: US State Department, 6 Jul 2026 — statement: China launches nuclear-capable ballistic missile',
   'OSINT: Janes, Jul 2026 — Special report Chinese SLBM test undersea nuclear deterrent capability',
   'OSINT: Missile Defense Advocacy — JL-3 profile (range, MIRV, guidance)',
   'OSINT: GlobalSecurity.org — JL-3 / JL-2C specifications',
   'OSINT: ABC News Australia, 9 Jul 2026 — cited as context for Taipan Strike 26 release',
   'OSINT: MilitaryWatch Magazine, Jul 2026 — Type 094A SSBN intercontinental show-of-force'
 ]::TEXT[],
 'UNCLASSIFIED')

ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 2 — DETECTION SYSTEMS
-- Two AUS/allied systems that CAN detect the JL-3 (contrast with Pk = 0 below)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO anti_drone_systems (
  id, name, manufacturer, country,
  defeat_method, effective_range_m, portability,
  conflict_validated, conflict_notes, data_confidence, sources,
  frequency_bands_covered
) VALUES

-- ── JORN — Jindalee Operational Radar Network ─────────────────────────────────
('jorn-hf-oth-aus',
 'JORN — Jindalee Operational Radar Network (AUS OTH)',
 'BAE Systems Australia / Northrop Grumman', 'Australia',
 ARRAY['detect']::TEXT[], 3700000, 'fixed', true,
 'Australian sovereign over-the-horizon radar (OTH) network. Three nodes: Longreach QLD, Alice Springs NT, Laverton WA. Coverage: ~1,000–3,700 km from Australia — reaches South China Sea, western Pacific, Indian Ocean approaches. Operating principle: High Frequency (HF) electromagnetic waves refracted off the ionosphere, enabling detection of targets thousands of km beyond the horizon. Primary peacetime mission: maritime patrol, aircraft detection. Ballistic missile detection: demonstrated capability. In 1997, prototype JORN detected Chinese missile launches near Taiwan and passed data to US. ADF scientists and US analysts have assessed JORN as potentially integratable into a multilateral BMD early warning architecture. JL-3 Pacific test (6 Jul 2026): JORN would have been in tracking arc for launch detection from SCS. Note: JORN detects the launch plume and early boost phase, not the reentry body. Pd vs SLBM launch in SCS from JORN geometry: Assessed ~0.65 (ionospheric conditions dependent; HF propagation variability limits reliability vs satellite IR which achieves ~0.99). Not a defeat system — detect only.',
 'high',
 ARRAY[
   'OSINT: BAE Systems Australia — JORN public product brief',
   'OSINT: DST (Defence Science Technology) — JORN capability overview',
   'OSINT: Arms Control Association — US/allied BMD in Asia-Pacific; JORN integration potential',
   'OSINT: Australian Defence Magazine — JORN and the art of missile defence',
   'OSINT: Wikipedia / Jindalee Operational Radar Network — confirmed 1997 China missile detection',
   'OSINT: Missile Defense Advocacy — Australia BMD cooperation; JORN noted as early warning asset'
 ]::TEXT[],
 '{"HF_OTH_band_mhz": "5-30"}'::jsonb),

-- ── Exmouth C-Band Space Surveillance Radar (NCS Harold E. Holt) ──────────────
('ssr-cband-exmouth-aus',
 'C-Band Space Surveillance Radar — NCS Harold E. Holt, Exmouth WA (AUS/US)',
 'US Space Force / Raytheon', 'Australia/USA',
 ARRAY['detect']::TEXT[], NULL, 'fixed', false,
 'C-Band Space Surveillance Radar located at Naval Communication Station Harold E. Holt (NCS HEH), north of Exmouth, Western Australia (North West Cape ~21.8°S 114.2°E). Joint Australian/US facility. Mission: provides southern hemisphere coverage of resident space objects for Space Surveillance Network (SSN) catalogue maintenance, space object identification (SOI), and support for special events. Frequency: C-band (~5.4–5.9 GHz). Can track several hundred space objects per day including debris, satellites, and ballistic reentry bodies. History: radar originated at NASA Carnarvon tracking station (1963), subsequently operated from Antigua for US launch telemetry tracking (Cape Canaveral launches), relocated to Exmouth ~2012. Reached Full Operational Capability (FOC) 2017. Relevance to ICBM/SLBM: C-band radars of this class can track ballistic reentry vehicles on terminal phase trajectories in the southern hemisphere tracking arc. JL-3 Pacific test (6 Jul 2026): impact was ~300 km east of Tonga — this falls within C-band SSR tracking geometry from Exmouth for the terminal and post-impact phase. Pd vs ballistic body in southern hemisphere arc: Assessed ~0.85+ for terminal phase track. NOTE: effective_range_m is NULL — space surveillance operates against objects at altitude 200–36,000+ km; classical range metric does not apply.',
 'high',
 ARRAY[
   'OSINT: Australia Defence Ministers — Space Surveillance Radar reaches FOC, 7 Mar 2017',
   'OSINT: AFSPC (Air Force Space Command) — C-Band Holt Radar one year on, 2017',
   'OSINT: Wikipedia — NCS Harold E. Holt; C-band radar mission and capability description',
   'OSINT: RAAFA — C-band radar (Exmouth) public overview',
   'OSINT: Nautilus Institute — NCS Harold E. Holt (North West Cape) facility analysis',
   'OSINT: Raytheon Australia — We Are Space; Exmouth SSR contribution to space domain',
   'OSINT: MIT Lincoln Laboratory — Reagan Test Site; C-band ALCOR/TRADEX class radar BMD tracking role'
 ]::TEXT[],
 '{"C_band_primary_mhz": "5400-5900"}'::jsonb)

ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 3 — DEFEAT EFFECTIVENESS: JL-3 vs ADF SYSTEMS
-- KEY TRAINING OUTCOME: Every ADF organic system returns Pk = 0
-- This is not a data error — it is the correct answer and the point of the lesson
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO defeat_effectiveness (
  platform_id, defeat_system_id, rf_jamming_pct, kinetic_pct, dew_pct,
  swarm_engagement_pct, data_confidence, weather_limited, special_notes
) VALUES

-- ─── vs GBAD SM-2 / CEA-Aegis (prototype AUS) ────────────────────────────────
('cn-jl3-slbm', 'gbad-cea-sm2-aus', NULL, 0, NULL, NULL, 'high', false,
 'DEFEAT NOT POSSIBLE. SM-2 Block IIIB max engagement altitude: ~24 km. JL-3 reentry body crosses 100 km altitude at ~7 km/s (Mach ~23). At SM-2 engagement ceiling the reentry body has already completed all of its flyout — the SM-2 would need to launch to intercept altitude, and is architecturally incapable of the velocity differential required for a terminal intercept against a body moving at this speed. SM-2 is a theatre air defence missile against aircraft and cruise missiles. It is NOT a ballistic missile defence (BMD) system. Detection Pd via CEA CEAFAR2-L (ground-based): ASSESSED ~0.30 for terminal phase tracking at 100+ km altitude — CEAFAR2-L can detect but cannot engage. TRAINING POINT: ADF GBAD organic Pk vs ICBM/SLBM = ZERO.'),

-- ─── vs NASAMS AMRAAM-ER ─────────────────────────────────────────────────────
('cn-jl3-slbm', 'nasams-amraam-er', NULL, 0, NULL, NULL, 'high', false,
 'DEFEAT NOT POSSIBLE. NASAMS AMRAAM-ER max altitude: ~21 km, max target speed: ~4 km/s. JL-3 reentry body: ~7 km/s at terminal. Speed differential and altitude constraint make intercept geometrically impossible. NASAMS is a SHORAD system. TRAINING POINT: Pk = 0.'),

-- ─── vs GEPARD VSHORAD ───────────────────────────────────────────────────────
('cn-jl3-slbm', 'gepard-spaag', NULL, 0, NULL, NULL, 'high', false,
 'DEFEAT NOT POSSIBLE. Gepard 35mm autocannon max ceiling: ~4.5 km. JL-3 SLBM not engageable by any gun/VSHORAD system. Pk = 0. Note: Gepard can engage the Shahed-136 that the JL-3 is designed to hold a target state at risk of. These are categorically different threat tiers.'),

-- ─── vs JORN detect ──────────────────────────────────────────────────────────
('cn-jl3-slbm', 'jorn-hf-oth-aus', NULL, 0, NULL, NULL, 'high', false,
 'DETECT ONLY — no defeat capability. JORN provides early warning detection of SLBM launch from SCS region. Pd (probability of detection) vs JL-3 launch: ASSESSED ~0.65 (ionospheric propagation variability; HF OTH dependent on sky-wave propagation conditions, less reliable than IR satellite detection). JORN can provide launch bearing and approximate trajectory data for cueing higher-tier tracking sensors. Kinetic Pk = 0 — JORN is purely a detection and early warning system.'),

-- ─── vs Exmouth C-band SSR ───────────────────────────────────────────────────
('cn-jl3-slbm', 'ssr-cband-exmouth-aus', NULL, 0, NULL, NULL, 'high', false,
 'DETECT ONLY — no defeat capability. Exmouth C-band space surveillance radar can track the JL-3 reentry body during terminal phase in southern hemisphere arc. Pd (terminal tracking) vs JL-3 reentry body in southern hemisphere track: ASSESSED ~0.85. C-band provides precision tracking data — object identification, trajectory, and possible impact prediction. Data feeds into US Space Surveillance Network (SSN) and can cue allied BMD assets. Kinetic Pk = 0 — space surveillance radar; no defeat capability.')

ON CONFLICT (platform_id, defeat_system_id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 4 — ACCREDITED Pk ENTRIES
-- National-level BMD Pk data is classified SOVEREIGN_CORE_BOUNDARY
-- These entries record the framework; values resolved server-side by accredited build
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO accredited_defeat_pk (
  id, platform_id, defeat_system_id, pd_detect_pct, pk_kinetic_pct,
  data_provenance, confidence, caveat
) VALUES

('acc-pk-jl3-jorn-detect',
 'cn-jl3-slbm', 'jorn-hf-oth-aus',
 65, 0,
 'training_contract_analogue', 'Assessed',
 'JORN detection probability vs SLBM launch from SCS — training estimate 65%. Defeat Pk = 0. UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY.'),

('acc-pk-jl3-cband-detect',
 'cn-jl3-slbm', 'ssr-cband-exmouth-aus',
 85, 0,
 'training_contract_analogue', 'Assessed',
 'Exmouth C-band SSR terminal tracking vs JL-3 reentry — training estimate 85%. Defeat Pk = 0. UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY.')

ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 5 — WAVEFORM PROFILES
-- Detection sensors only — no defeat waveforms
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO accredited_waveform_profiles (
  id, system_id, capability_fn, label,
  freq_low_hz, freq_high_hz, waveform_family,
  bandwidth_hz, hop_rate_hz,
  data_provenance, confidence, caveat
) VALUES

('acc-wf-jorn-hf',
 'jorn-hf-oth-aus', 'over_horizon_early_warning',
 'JORN HF Over-The-Horizon Radar (OTH)',
 5000000, 30000000, 'hf_sky_wave_oth',
 25000000, NULL,
 'training_contract_analogue', 'Assessed',
 'UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY — OSINT basis. JORN operating parameters SOVEREIGN_CORE_BOUNDARY.'),

('acc-wf-cband-exmouth',
 'ssr-cband-exmouth-aus', 'space_surveillance_tracking',
 'Exmouth C-Band Space Surveillance Radar',
 5400000000, 5900000000, 'c_band_tracking_pulse',
 500000000, NULL,
 'training_contract_analogue', 'Assessed',
 'UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY — OSINT basis. Waveform parameters SOVEREIGN_CORE_BOUNDARY.')

ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 6 — CONFLICT INCIDENT (conditional on schema)
-- TODO: Confirm conflict_incidents table schema before applying this section
-- Apply once schema confirmed; this is the instruction set only
--
-- Incident: JL-3 SLBM Pacific test, 6 July 2026
-- Type: strategic_missile_test (not combat — but operationally significant)
-- Location: South China Sea (launch) → Tonga East (impact)
-- Platform: cn-jl3-slbm
-- ═══════════════════════════════════════════════════════════════════════════════

-- [PENDING SCHEMA CONFIRMATION — do not apply until conflict_incidents columns verified]
-- INSERT INTO conflict_incidents (...)
-- See above intent; apply in next migration once schema confirmed.
