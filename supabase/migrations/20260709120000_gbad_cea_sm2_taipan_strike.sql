-- SPECTRAL — GBAD CEA-SM-2 AUS (Taipan Strike 26)
-- Exercise Taipan Strike 26, Woomera Test Range, June 2026
-- First integration: CEA CEAFAR2-L radar + Lockheed Martin Aegis Combat System + SM-2 Block IIIB
-- Source: Australian Department of Defence press release, 9 July 2026 (public OSINT)
-- All data OSINT. CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY

-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 1 — GBAD CEA / SM-2 AUS — DEFEAT SYSTEM (ANTI_DRONE_SYSTEMS TABLE)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO anti_drone_systems (
  id, name, manufacturer, country,
  defeat_method, effective_range_m, portability,
  conflict_validated, conflict_notes, data_confidence, sources,
  frequency_bands_covered
) VALUES

-- ── GBAD CEA/SM-2 (prototype, Taipan Strike 26) ───────────────────────────────
('gbad-cea-sm2-aus',
 'GBAD SM-2 / CEA-Aegis — Australian Medium-Range Ground-Based Air Defence (Prototype)',
 'CEA Technologies / Lockheed Martin', 'Australia',
 ARRAY['kinetic']::TEXT[], 166000, 'vehicle', false,
 'Prototype ground-based air and missile defence system. First-of-type integration between a CEA Technologies CEAFAR2-L active phased array radar and the US Aegis Combat System (Lockheed Martin weapon control system + MK 41 VLS-class launcher). Effector: Standard Missile-2 (SM-2) Block IIIB — medium-range, dual-mode semi-active/active radar homing. Successfully demonstrated live-fire intercept of an airborne cruise missile target at Woomera Test Range, South Australia, during Exercise Taipan Strike 26 (June 2026). OSINT-stated range: ~166 km (SM-2 Block IIIB). ADF directed by 2026 National Defence Strategy to accelerate medium-range ground-based air defence against long-range and high-speed missile threats. STATUS: prototype evaluation — not in operational ADF service. Key sovereignty note: Australian missile (SM-2), Australian radar (CEA CEAFAR2-L), US Aegis fire control — sovereign Australian sensor front-end with allied fire control. CEA CEAFAR pedigree: operational on all three RAN Hobart-class AWD Aegis-equipped destroyers — land-based adaptation de-risked by existing naval integration. IADS tier: fills medium layer (~40–166 km) above NASAMS SHORAD and below any future ballistic missile defence tier. Engagement altitude vs cruise: ~2,000–24,000 m (SM-2 IIIB rated ceiling; practical vs terrain-following cruise constrained by radar horizon). NOT rated vs hypersonic terminal phase (Kinzhal/Zircon class). Taipan Strike 26 designed as Air Force-led IAMD activity to explore capability options and inform acquisition decisions.',
 'high',
 ARRAY[
   'OSINT: Australian DoD press release, 9 July 2026 — Taipan Strike 26 SM-2 live-fire confirmed (public)',
   'OSINT: ABC News Australia, 9 July 2026 — ADF missile interceptor test, 166 km range cited',
   'OSINT: Mirage News (DoD verbatim relay), 9 July 2026 — CEA / Lockheed Martin / Aegis confirmed',
   'OSINT: Deputy Prime Minister Richard Marles statement, 9 July 2026 — first-of-type integration live fire',
   'OSINT: Chief of Air Force Air Marshal Stephen Chappell — Taipan Strike 26 IAMD options exploration',
   'OSINT: 2026 National Defence Strategy — medium-range ground-based air defence acceleration directed',
   'OSINT: CEA Technologies CEAFAR2-L — operational Hobart-class AWD; land-based variant integration',
   'OSINT: Raytheon/Lockheed SM-2 Block IIIB public specs — range ~166 km (90 nm), active terminal seeker'
 ]::TEXT[],
 '{"CEA_CEAFAR2_L_band_primary_mhz": "1000-2000", "Aegis_fire_control_S_band_mhz": "3100-3500", "SM2_Ka_band_terminal_seeker_mhz": "33000-36000"}'::jsonb),

-- ── CEA CEAFAR2-L (ground-based sensor — sovereign radar) ─────────────────────
('ceafar2-l-gbad',
 'CEA CEAFAR2-L — Ground-Based Active Phased Array Radar (AUS)',
 'CEA Technologies', 'Australia',
 ARRAY['detect']::TEXT[], 400000, 'vehicle', false,
 'Ground-based active electronically scanned array (AESA) radar. Land-based adaptation of the CEAFAR2-L system operational on RAN Hobart-class Aegis destroyers. L-band primary with multifunction AESA architecture — simultaneous search, track, and fire control. Tailored by CEA Technologies as sovereign Australian sensor front-end for the Taipan Strike 26 ground-based Aegis fire control integration. Range: assessed ~300-400+ km vs large target (based on naval CEAFAR performance). Small UAS detection: L-band effective vs medium-RCS targets; limited vs micro-UAS. Primary role: area surveillance and fire control cueing for SM-2 engagement. Sovereign: designed and manufactured in Australia (Canberra). The CEAFAR2-L is the critical sovereign component that differentiates the Australian GBAD from a straight US Aegis IBMS export — Australian-controlled sensor, Australian configuration authority.',
 'high',
 ARRAY[
   'OSINT: CEA Technologies CEAFAR2-L product brief (public) — Hobart-class AWD integration',
   'OSINT: RAN AWD Alliance — CEAFAR2-L operational Hobart-class 2017-present',
   'OSINT: DoD press release 9 July 2026 — CEA radar identified as core integration element',
   'OSINT: Australian Defence Magazine 2024 — CEA CEAFAR2-L land-based adaptation noted',
   'OSINT: Janes Naval Weapons Systems 2025 — CEAFAR2-L: L-band AESA, multifunction, simultaneous search/track/FC'
 ]::TEXT[],
 '{"CEA_L_band_primary_mhz": "1000-2000"}'::jsonb)

ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 2 — DEFEAT EFFECTIVENESS (OSINT training estimates)
-- SM-2 Block IIIB kinetic Pk vs threat platforms in SPECTRAL database
-- Note: SM-2 is NOT a BMD interceptor — hypersonic entries excluded by design
-- Kalibr/Kh-101/LACM class: core mission
-- SRBM (KN-23): marginally rated, noted as below-threshold — PAC-3 MSE / SM-3 preferred
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO defeat_effectiveness (
  platform_id, defeat_system_id, rf_jamming_pct, kinetic_pct, dew_pct,
  swarm_engagement_pct, data_confidence, weather_limited, special_notes
) VALUES

-- ─── KALIBR 3M-14 ────────────────────────────────────────────────────────────
('kalibr-3m14', 'gbad-cea-sm2-aus', NULL, 78, NULL, NULL, 'estimated', false,
 'SM-2 IIIB vs terrain-following cruise missile. CEA CEAFAR2-L provides fire control cueing. Radar horizon at 50-100m AGL limits detection range to ~60-80 km for cruise-profile Kalibr, compressing engagement window. SM-2 active terminal seeker autonomous — no continuous ground illumination required in terminal phase. Pk estimate based on SM-2 naval employment record vs cruise-class and NASAMS/PAC-3 composite Ukraine data (~80% composite). Ground-based deployment adds radar horizon challenge not present in naval Aegis. Prototype status — operational Pk classified SOVEREIGN_CORE_BOUNDARY.'),

-- ─── KH-101 ──────────────────────────────────────────────────────────────────
('kh-101', 'gbad-cea-sm2-aus', NULL, 55, NULL, NULL, 'estimated', false,
 'Kh-101 low observable (~0.01 m² RCS) significantly degrades CEA CEAFAR detection range vs standard cruise missile profile. Reduces cuing range and engagement window. SM-2 IIIB active terminal seeker compensates partially — autonomous track in terminal phase independent of ground radar illumination. Kh-101 terminal phase is PASSIVE EO (zero RF) — SM-2 active radar homing unaffected by this. Lower Pk than vs Kalibr principally due to reduced detection range and tighter engagement geometry.'),

-- ─── MOHAJER-10 (MALE-class) ─────────────────────────────────────────────────
('mohajer-10', 'gbad-cea-sm2-aus', NULL, 88, NULL, NULL, 'estimated', false,
 'SM-2 IIIB vs MALE-class UAS target. High Pk expected vs slow non-manoeuvring target at altitude. CEA CEAFAR detection of MALE-class RCS effective at extended range. Economically unfavourable (SM-2 ~$2.5M vs Mohajer ~$100k) — NASAMS AMRAAM-ER preferred for cost-exchange. SM-2 engagement reserved for layered coverage when closer-range systems saturated.'),

-- ─── SHAHED-136 ──────────────────────────────────────────────────────────────
('shahed-136', 'gbad-cea-sm2-aus', NULL, 82, NULL, NULL, 'estimated', false,
 'SM-2 IIIB technically capable vs Shahed-136 class. High kinetic Pk at range. CEA CEAFAR effective at detecting low-slow targets. However: SM-2 per-round cost ($2.5M) vs Shahed ($20k) = 125:1 cost-exchange catastrophe. In operational doctrine, Gepard/VSHORAD/NASAMS handle Shahed — SM-2 noted here for completeness. Emergency engagement only. Swarm saturation risk: magazine (8-16 rounds VLS) depleted rapidly vs large Shahed salvo.'),

-- ─── LANCET-3M ───────────────────────────────────────────────────────────────
('lancet-3m', 'gbad-cea-sm2-aus', NULL, 68, NULL, NULL, 'estimated', false,
 'SM-2 vs Lancet-3M: engagement geometry challenge given Lancet manoeuvre capability in terminal dive. CEA CEAFAR L-band detection effective. Pk reduced vs Shahed due to target size and manoeuvre. Not economically or tactically appropriate — VAMPIRE/Gepard preferred. Listed to define system boundary.'),

-- ─── KN-23 (SRBM — edge of SM-2 capability) ─────────────────────────────────
('kn-23', 'gbad-cea-sm2-aus', NULL, 22, NULL, NULL, 'estimated', false,
 'SM-2 Block IIIB is NOT a ballistic missile defence (BMD) interceptor. KN-23 quasi-ballistic trajectory at terminal phase presents engagement geometry that exceeds SM-2 designed seeker and manoeuvre envelope. Notional 22% Pk reflects tail-chase intercept attempt geometry only — SM-2 cannot reliably defeat a ballistic re-entry vehicle. PAC-3 MSE or SM-3 is the appropriate defeat layer for KN-23 class. Entry retained to define SM-2 capability limit in training scenarios.')

ON CONFLICT (platform_id, defeat_system_id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 3 — ACCREDITED Pk ENTRIES
-- Server-side only — enforced by SPECTRAL_ACCREDITED_RESOLVER
-- Actual Pk values are SOVEREIGN_CORE_BOUNDARY; these rows carry provenance metadata
-- Confidence: Assessed (one confirmed live-fire intercept, SM-2 naval pedigree)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO accredited_defeat_pk (
  id, platform_id, defeat_system_id,
  pd_detect_pct, pk_rf_jamming_pct, pk_kinetic_pct, pk_dew_pct,
  is_immune, immune_reason,
  data_provenance, confidence, caveat
) VALUES

('acc-pk-gbad-sm2-kalibr',
 'kalibr-3m14', 'gbad-cea-sm2-aus',
 NULL, NULL, 78, NULL, false, NULL,
 'training_contract_analogue', 'Assessed',
 'SM-2 Block IIIB vs cruise missile: interpolated from RAN Aegis/SM-2 naval pedigree and US Navy fleet engagement records. Ground-based CEA CEAFAR2-L cueing substitutes for SPY-1 naval radar. Radar horizon constraint at low AGL altitude reduces cue range vs naval Aegis — noted in Pk assessment. One confirmed live intercept of cruise-class target, Woomera, June 2026. UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY — Assessed estimate. Actual Pk SOVEREIGN_CORE_BOUNDARY.'),

('acc-pk-gbad-sm2-kh101',
 'kh-101', 'gbad-cea-sm2-aus',
 NULL, NULL, 55, NULL, false, NULL,
 'training_contract_analogue', 'Assessed',
 'Kh-101 low-RCS airframe (~0.01 m²) degrades CEA CEAFAR detection range. SM-2 IIIB active terminal seeker provides autonomous track — not dependent on continuous ground illumination. Kh-101 terminal phase is passive EO (zero RF emission) — does not affect SM-2 engagement. Assessed Pk lower than vs Kalibr due to constrained cue time from reduced radar detection range at low altitude. UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY — Assessed estimate. Actual Pk SOVEREIGN_CORE_BOUNDARY.')

ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 4 — ACCREDITED WAVEFORM PROFILES (CEA CEAFAR2-L ground-based)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO accredited_waveform_profiles (
  id, system_id, capability_fn, label,
  freq_low_hz, freq_high_hz, waveform_family,
  bandwidth_hz, hop_rate_hz,
  data_provenance, confidence, caveat
) VALUES

('acc-wf-ceafar2l-l',
 'ceafar2-l-gbad', 'fire_control_search',
 'CEA CEAFAR2-L L-band Active AESA (ground-based)',
 1000000000, 2000000000, 'phased_array_pulse_doppler',
 1000000000, NULL,
 'training_contract_analogue', 'Assessed',
 'CEA Technologies public product brief and RAN AWD integration documentation (OSINT). L-band primary: 1–2 GHz. Multifunction simultaneous search/track/fire control. Ground-based land adaptation of naval CEAFAR2-L — frequency architecture unchanged. UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY — OSINT basis. Spectral characteristics SOVEREIGN_CORE_BOUNDARY.')

ON CONFLICT (id) DO NOTHING;
