-- SPECTRAL — SA-1 to SA-24 SAM Family
-- CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
--
-- Migration: SA-2 through SA-24 surface-to-air missile systems
-- Populates: anti_drone_systems (19 systems) + defeat_effectiveness (171 rows)
--
-- Sources: Jane's Air & Space, DIA open assessments,
--          Ukraine conflict BDA 2022-2025 (OSINT), GlobalSecurity.org
-- Note: SA-22 Pantsir (pantsir-s1-cuas) pre-exists — not re-inserted.
-- All Pk values are OSINT-derived training estimates, not classified data.

-- ─── ANTI-DRONE SYSTEMS ──────────────────────────────────────────────────────

INSERT INTO anti_drone_systems
  (id, name, manufacturer, country, defeat_method, effective_range_m,
   portability, conflict_validated, conflict_notes, data_confidence)
VALUES

-- MANPADS family
('sa-7-grail',
 'SA-7 Grail (9K32 Strela-2)', 'KBM Kolomna', 'Russia/Export',
 ARRAY['kinetic'], 4200, 'man-portable', true,
 'Wide export use. Limited effectiveness vs modern UAS low-IR targets. Ukraine/Syria confirmed.',
 'high'),

('sa-14-gremlin',
 'SA-14 Gremlin (9K34 Strela-3)', 'KBM Kolomna', 'Russia/Export',
 ARRAY['kinetic'], 4500, 'man-portable', true,
 'Gen 2 cooled seeker. Africa/ME export inventory. Better OWA Pk than SA-7.',
 'medium'),

('sa-16-gimlet',
 'SA-16 Gimlet (9K310 Igla-1)', 'KBM Kolomna', 'Russia/Export',
 ARRAY['kinetic'], 5200, 'man-portable', true,
 'IFF interrogator fitted. Ukraine-confirmed OWA kills at close range.',
 'high'),

('sa-18-grouse',
 'SA-18 Grouse (9K38 Igla)', 'KBM Kolomna', 'Russia/Export',
 ARRAY['kinetic'], 5200, 'man-portable', true,
 'IIR two-colour seeker. Most capable Russian MANPADS vs OWA before Igla-S.',
 'high'),

('sa-24-grinch',
 'SA-24 Grinch (9K338 Igla-S)', 'KBM Kolomna', 'Russia',
 ARRAY['kinetic'], 6000, 'man-portable', true,
 'Enlarged 2.5 kg warhead. Best MANPADS in Russian inventory vs small UAS.',
 'high'),

-- Short-range vehicle systems
('sa-8-gecko',
 'SA-8 Gecko (9K33 Osa)', 'NPO Fazotron', 'Russia/Export',
 ARRAY['kinetic'], 10000, 'vehicle', true,
 'SARH clutter limits OWA Pk at low altitude. 6-missile launcher.',
 'high'),

('sa-13-gopher',
 'SA-13 Gopher (9K35 Strela-10)', 'KBM Kolomna', 'Russia/Export',
 ARRAY['kinetic'], 5000, 'vehicle', true,
 'Passive IR — zero RF emissions. 4-missile limit on saturation engagements.',
 'high'),

('sa-15-gauntlet',
 'SA-15 Gauntlet (9K330 Tor-M2)', 'IEMZ Kupol', 'Russia',
 ARRAY['kinetic'], 12000, 'vehicle', true,
 'Active radar seeker. Ukraine OSINT: effective vs Shahed and Lancet. Magazine the limiting factor in mass attacks.',
 'high'),

('sa-19-grison',
 'SA-19 Grison (2K22 Tunguska-M1)', 'KBP Tula', 'Russia',
 ARRAY['kinetic'], 8000, 'vehicle', true,
 '30mm guns + 9M311 missiles. Gun effective <2000m vs FPV. Dual-mode inner-zone layering.',
 'high'),

-- Medium-range systems
('sa-6-gainful',
 'SA-6 Gainful (2K12 Kub)', 'NPO Fazotron', 'Russia/Export',
 ARRAY['kinetic'], 22000, 'vehicle', true,
 '4 km dead zone. Min speed 100 km/h limits OWA. Syria/Ukraine operator use.',
 'high'),

('sa-11-gadfly',
 'SA-11 Gadfly (9K37 Buk-M1)', 'NIIP Tikhomirov', 'Russia/Export',
 ARRAY['kinetic'], 25000, 'vehicle', true,
 'Ukraine: shot down MH17. SARH TVM. 70 kg warhead lethal to MALE with proximity.',
 'high'),

('sa-17-grizzly',
 'SA-17 Grizzly (9K37M1-2 Buk-M1-2)', 'NIIP Tikhomirov', 'Russia',
 ARRAY['kinetic'], 45000, 'vehicle', true,
 '9M317 active radar terminal. Ukraine-confirmed OWA and MALE kills 2022-2025.',
 'high'),

-- Long-range systems
('sa-10-grumble',
 'SA-10 Grumble (S-300P)', 'Fakel/Almaz', 'Russia',
 ARRAY['kinetic'], 90000, 'vehicle', true,
 'TVM guidance. Backbone of Russian IADS. Low Pk vs slow/low UAS due to TVM clutter.',
 'high'),

('sa-20-gargoyle',
 'SA-20 Gargoyle (S-300PMU-2)', 'Fakel/Almaz', 'Russia/Export',
 ARRAY['kinetic'], 195000, 'vehicle', true,
 '48N6DM missile. Export: China, India, Algeria, Vietnam, Slovakia. Key IADS backbone.',
 'high'),

('sa-21-growler',
 'SA-21 Growler (S-400 Triumf)', 'Fakel/Almaz', 'Russia',
 ARRAY['kinetic'], 400000, 'vehicle', true,
 '9M96E2 active radar. Dedicated counter-UAV mode in later firmware. Longest-range operational SAM.',
 'high'),

-- Legacy/export systems
('sa-2-guideline',
 'SA-2 Guideline (S-75 Dvina)', 'Lavochkin OKB', 'Russia/Export',
 ARRAY['kinetic'], 29000, 'vehicle', true,
 '7km dead zone + 1000m min alt excludes most UAS. Operator context: Syria, DPRK, Iran, Vietnam.',
 'high'),

('sa-3-goa',
 'SA-3 Goa (S-125 Neva/Pechora)', 'Fakel', 'Russia/Export',
 ARRAY['kinetic'], 25000, 'vehicle', true,
 'Export: Serbia, Libya, Ethiopia. 80 km/h min speed limits OWA engagement. Some upgraded variants (Pechora-2M) improved.',
 'high'),

('sa-12a-gladiator',
 'SA-12A Gladiator (S-300V/9M83)', 'Fakel/Almaz', 'Russia',
 ARRAY['kinetic'], 75000, 'vehicle', false,
 'Army AD variant. Tracked vehicles. Active 9M83 radar. Primary role: ballistic missile defence.',
 'medium'),

('sa-23-giant',
 'SA-23 Giant (S-300VM Antey-2500)', 'Fakel/Almaz', 'Russia/Export',
 ARRAY['kinetic'], 200000, 'vehicle', false,
 'Export: Venezuela, Algeria. Active 9M82M. Syrian IADS context alongside Russian systems.',
 'medium')

ON CONFLICT (id) DO NOTHING;


-- ─── DEFEAT EFFECTIVENESS ─────────────────────────────────────────────────────
-- 171 rows: 19 SAM systems × 9 drone platforms
-- Platform IDs: fpv-rc, shahed-136, geran-2, lancet-3, kargu-2,
--               orlan-10, tb2-bayraktar, mq-9-reaper, rq-4-global-hawk

INSERT INTO defeat_effectiveness
  (platform_id, defeat_system_id, kinetic_pct, data_confidence,
   weather_limited, special_notes, is_immune, immune_reason, swarm_engagement_pct)
VALUES

-- ── BATCH 1: MANPADS ─────────────────────────────────────────────────────────

-- SA-7 Grail (gen1 IR, max 2300m — HALE immune)
('fpv-rc',           'sa-7-grail',  2,  'estimated', true,  'Gen1 IR — minimal IR signature from FPV motor; near-zero seeker acquisition probability.',  false, null, 1),
('shahed-136',       'sa-7-grail',  8,  'estimated', true,  'Low-slow OWA — small piston engine IR signature at limits of Gen1 seeker sensitivity.',      false, null, 5),
('geran-2',          'sa-7-grail',  8,  'estimated', true,  'Same OWA class as Shahed-136.',                                                               false, null, 5),
('lancet-3',         'sa-7-grail',  5,  'estimated', true,  'Small loitering munition — low IR return.',                                                   false, null, 3),
('kargu-2',          'sa-7-grail',  4,  'estimated', true,  'Autonomous loitering munition — very small IR cross-section.',                                false, null, 2),
('orlan-10',         'sa-7-grail',  18, 'estimated', true,  'Prop-driven ISR — marginal but within altitude/speed envelope.',                              false, null, 12),
('tb2-bayraktar',    'sa-7-grail',  55, 'estimated', true,  'MALE turboprop — adequate IR signature for Gen1 seeker at range.',                            false, null, 40),
('mq-9-reaper',      'sa-7-grail',  55, 'estimated', true,  'MALE turboprop — similar signature class to TB2.',                                            false, null, 40),
('rq-4-global-hawk', 'sa-7-grail',  0,  'estimated', false, null, true, 'HALE altitude (~18000m) exceeds SA-7 max ceiling of 2300m.', null),

-- SA-14 Gremlin (gen2 cooled, max 3000m — HALE immune)
('fpv-rc',           'sa-14-gremlin',  4,  'estimated', true,  'Gen2 cooled seeker — marginally better FPV acquisition vs SA-7 but still very limited.',  false, null, 2),
('shahed-136',       'sa-14-gremlin',  15, 'estimated', true,  'All-aspect cooled seeker — improved OWA acquisition over SA-7.',                          false, null, 10),
('geran-2',          'sa-14-gremlin',  15, 'estimated', true,  'Same OWA class.',                                                                         false, null, 10),
('lancet-3',         'sa-14-gremlin',  10, 'estimated', true,  'Small loitering munition — limited.',                                                     false, null, 6),
('kargu-2',          'sa-14-gremlin',  8,  'estimated', true,  'Very small target.',                                                                       false, null, 5),
('orlan-10',         'sa-14-gremlin',  28, 'estimated', true,  'Tactical ISR within envelope.',                                                            false, null, 18),
('tb2-bayraktar',    'sa-14-gremlin',  62, 'estimated', true,  'MALE — good IR signature for Gen2 seeker.',                                                false, null, 45),
('mq-9-reaper',      'sa-14-gremlin',  62, 'estimated', true,  'MALE turboprop.',                                                                          false, null, 45),
('rq-4-global-hawk', 'sa-14-gremlin',  0,  'estimated', false, null, true, 'HALE altitude exceeds SA-14 max ceiling of 3000m.', null),

-- SA-16 Gimlet (IFF + IIR, max 3500m — HALE immune)
('fpv-rc',           'sa-16-gimlet',  8,  'estimated', true,  'Improved seeker — IFF interrogator reduces blue-on-blue. FPV still marginal.',              false, null, 5),
('shahed-136',       'sa-16-gimlet',  22, 'high',      true,  'Ukraine-confirmed kills of Shahed-type OWA at close range.',                               false, null, 15),
('geran-2',          'sa-16-gimlet',  22, 'high',      true,  'Same platform class as Shahed-136.',                                                        false, null, 15),
('lancet-3',         'sa-16-gimlet',  15, 'estimated', true,  'Loitering munition within envelope.',                                                       false, null, 10),
('kargu-2',          'sa-16-gimlet',  12, 'estimated', true,  'Small autonomous target.',                                                                  false, null, 8),
('orlan-10',         'sa-16-gimlet',  38, 'estimated', true,  'Tactical ISR at closer ranges.',                                                            false, null, 25),
('tb2-bayraktar',    'sa-16-gimlet',  68, 'estimated', true,  'MALE — effective within altitude ceiling.',                                                 false, null, 50),
('mq-9-reaper',      'sa-16-gimlet',  68, 'estimated', true,  'MALE turboprop.',                                                                           false, null, 50),
('rq-4-global-hawk', 'sa-16-gimlet',  0,  'estimated', false, null, true, 'HALE altitude exceeds SA-16 max ceiling of 3500m.', null),

-- SA-18 Grouse (IIR two-colour, max 3500m — HALE immune)
('fpv-rc',           'sa-18-grouse',  14, 'estimated', true,  'IIR two-colour seeker — improved small-target acquisition vs earlier family.',              false, null, 9),
('shahed-136',       'sa-18-grouse',  35, 'high',      true,  'Ukraine-confirmed OWA kills. IIR seeker handles low-IR OWA better.',                       false, null, 22),
('geran-2',          'sa-18-grouse',  35, 'high',      true,  'Same OWA class.',                                                                          false, null, 22),
('lancet-3',         'sa-18-grouse',  22, 'estimated', true,  'Loitering munition — within envelope.',                                                     false, null, 14),
('kargu-2',          'sa-18-grouse',  18, 'estimated', true,  'Small autonomous target — IIR seeker marginal.',                                            false, null, 12),
('orlan-10',         'sa-18-grouse',  50, 'estimated', true,  'Tactical ISR — good IR signature.',                                                         false, null, 35),
('tb2-bayraktar',    'sa-18-grouse',  75, 'estimated', true,  'MALE turboprop — high-confidence engagement.',                                              false, null, 55),
('mq-9-reaper',      'sa-18-grouse',  75, 'estimated', true,  'MALE turboprop.',                                                                           false, null, 55),
('rq-4-global-hawk', 'sa-18-grouse',  0,  'estimated', false, null, true, 'HALE altitude exceeds SA-18 max ceiling of 3500m.', null),

-- SA-24 Grinch (IIR+ enlarged warhead, max 3500m — HALE immune)
('fpv-rc',           'sa-24-grinch',  20, 'estimated', true,  'IIR+ with enlarged 2.5 kg warhead. Best MANPADS Pk vs FPV in Russian inventory.',          false, null, 12),
('shahed-136',       'sa-24-grinch',  45, 'high',      true,  'Ukraine conflict — SA-24 reported effective vs Shahed-class OWA.',                         false, null, 28),
('geran-2',          'sa-24-grinch',  45, 'high',      true,  'Same OWA class.',                                                                          false, null, 28),
('lancet-3',         'sa-24-grinch',  32, 'estimated', true,  'Enhanced proximity fuze increases near-miss lethality vs small LM.',                       false, null, 20),
('kargu-2',          'sa-24-grinch',  28, 'estimated', true,  'Small autonomous — enlarged warhead compensates vs marginal miss.',                          false, null, 18),
('orlan-10',         'sa-24-grinch',  58, 'estimated', true,  'Tactical ISR well within envelope.',                                                        false, null, 40),
('tb2-bayraktar',    'sa-24-grinch',  80, 'estimated', true,  'MALE — high Pk at closer ranges within envelope.',                                          false, null, 60),
('mq-9-reaper',      'sa-24-grinch',  80, 'estimated', true,  'MALE turboprop.',                                                                           false, null, 60),
('rq-4-global-hawk', 'sa-24-grinch',  0,  'estimated', false, null, true, 'HALE altitude exceeds SA-24 max ceiling of 3500m.', null),

-- ── BATCH 2: SHORT-RANGE VEHICLE ──────────────────────────────────────────────

-- SA-8 Gecko (SARH, max 5000m — RQ-4 marginal at ceiling only)
('fpv-rc',           'sa-8-gecko',  5,  'estimated', false, 'SARH clutter — slow low-flying FPV below radar track stability threshold.',                   false, null, 3),
('shahed-136',       'sa-8-gecko',  28, 'estimated', false, 'OWA within range but SARH low-alt clutter degrades Pk. 6 missiles allow re-engagement.',     false, null, 18),
('geran-2',          'sa-8-gecko',  28, 'estimated', false, 'Same OWA class.',                                                                            false, null, 18),
('lancet-3',         'sa-8-gecko',  20, 'estimated', false, 'Manoeuvring LM degrades SARH track.',                                                        false, null, 12),
('kargu-2',          'sa-8-gecko',  16, 'estimated', false, 'Small autonomous target.',                                                                    false, null, 10),
('orlan-10',         'sa-8-gecko',  42, 'estimated', false, 'Tactical ISR at medium altitude — improved SARH track.',                                      false, null, 28),
('tb2-bayraktar',    'sa-8-gecko',  65, 'estimated', false, 'MALE at altitude — SARH performs well above clutter.',                                        false, null, 48),
('mq-9-reaper',      'sa-8-gecko',  65, 'estimated', false, 'MALE turboprop.',                                                                             false, null, 48),
('rq-4-global-hawk', 'sa-8-gecko',  45, 'estimated', false, 'HALE at edge of SA-8 ceiling (5000m vs RQ-4 18000m). Only lower-altitude transit phases.',   false, null, 32),

-- SA-13 Gopher (passive IR, max 3500m — HALE immune)
('fpv-rc',           'sa-13-gopher',  5,  'estimated', true,  'Passive IR — zero emissions but FPV motor IR marginal.',                                    false, null, 3),
('shahed-136',       'sa-13-gopher',  22, 'estimated', true,  'OWA within envelope. IR seeker handles piston engine signature.',                           false, null, 14),
('geran-2',          'sa-13-gopher',  22, 'estimated', true,  'Same OWA class.',                                                                          false, null, 14),
('lancet-3',         'sa-13-gopher',  18, 'estimated', true,  'Within envelope at short range.',                                                           false, null, 11),
('kargu-2',          'sa-13-gopher',  15, 'estimated', true,  'Small autonomous target.',                                                                  false, null, 10),
('orlan-10',         'sa-13-gopher',  38, 'estimated', true,  'Tactical ISR within range.',                                                                false, null, 24),
('tb2-bayraktar',    'sa-13-gopher',  62, 'estimated', true,  'MALE — adequate IR signature.',                                                             false, null, 45),
('mq-9-reaper',      'sa-13-gopher',  60, 'estimated', true,  'MALE turboprop.',                                                                           false, null, 44),
('rq-4-global-hawk', 'sa-13-gopher',  0,  'estimated', false, null, true, 'HALE altitude exceeds SA-13 max ceiling of 3500m.', null),

-- SA-15 Gauntlet (active radar, max 6000m — Ukraine high-confidence)
('fpv-rc',           'sa-15-gauntlet',  22, 'high',      false, 'Active radar seeker — track not RCS limited. Ukraine: Tor engaged small FPV in point-defence role.', false, null, 14),
('shahed-136',       'sa-15-gauntlet',  62, 'high',      false, 'Ukraine-confirmed: Tor-M2 effective vs Shahed mass attacks. Magazine limiting factor.',            false, null, 38),
('geran-2',          'sa-15-gauntlet',  65, 'high',      false, 'Same OWA class — confirmed combat use.',                                                          false, null, 40),
('lancet-3',         'sa-15-gauntlet',  50, 'high',      false, 'Ukraine: Tor-M2 vs Lancet — active radar tracks manoeuvring target.',                             false, null, 32),
('kargu-2',          'sa-15-gauntlet',  42, 'estimated', false, 'Small autonomous — active radar seeker handles low RCS.',                                         false, null, 26),
('orlan-10',         'sa-15-gauntlet',  70, 'high',      false, 'Tactical ISR — high-confidence engagement. Orlan-10 losses to Tor confirmed.',                    false, null, 52),
('tb2-bayraktar',    'sa-15-gauntlet',  80, 'high',      false, 'MALE — TB2 losses to Tor-M2 documented in Libya, Nagorno-Karabakh.',                              false, null, 62),
('mq-9-reaper',      'sa-15-gauntlet',  80, 'estimated', false, 'MALE at altitude — high Pk.',                                                                     false, null, 62),
('rq-4-global-hawk', 'sa-15-gauntlet',  72, 'estimated', false, 'HALE at lower transit altitude within envelope. Marginal at cruise altitude.',                    false, null, 55),

-- SA-19 Grison (30mm gun + active radar missile, dual-mode)
('fpv-rc',           'sa-19-grison',  18, 'estimated', false, '30mm gun dominates FPV engagement <2000m — high burst-rate intercept. Pk driven by geometry.', false, null, 12),
('shahed-136',       'sa-19-grison',  52, 'high',      false, 'Ukraine: Tunguska employed vs OWA. Gun effective <2km; missile handles 2-8km band.',          false, null, 32),
('geran-2',          'sa-19-grison',  52, 'high',      false, 'Same OWA class.',                                                                             false, null, 32),
('lancet-3',         'sa-19-grison',  40, 'estimated', false, 'Manoeuvring LM — gun preferred <2km; missile active radar handles beyond.',                    false, null, 25),
('kargu-2',          'sa-19-grison',  35, 'estimated', false, 'Small autonomous — gun preferred at close range.',                                             false, null, 22),
('orlan-10',         'sa-19-grison',  65, 'estimated', false, 'ISR at medium range — missile engagement zone.',                                               false, null, 48),
('tb2-bayraktar',    'sa-19-grison',  68, 'estimated', false, 'MALE at range — 9M311 missile engagement.',                                                    false, null, 50),
('mq-9-reaper',      'sa-19-grison',  68, 'estimated', false, 'MALE turboprop.',                                                                              false, null, 50),
('rq-4-global-hawk', 'sa-19-grison',  45, 'estimated', false, 'HALE at edge of missile envelope ceiling.',                                                   false, null, 30),

-- ── BATCH 3: MEDIUM-RANGE ─────────────────────────────────────────────────────

-- SA-6 Gainful (SARH, 4km dead zone, min speed 100 km/h)
('fpv-rc',           'sa-6-gainful',  2,  'estimated', false, 'SARH — 4km dead zone inner ring. FPV at short range immune. Min speed 100 km/h limits engagement.', false, null, 1),
('shahed-136',       'sa-6-gainful',  15, 'estimated', false, 'OWA low-slow — min range dead zone and min speed limit reduces OWA engagement options.',            false, null, 8),
('geran-2',          'sa-6-gainful',  12, 'estimated', false, 'Same OWA class — slightly lower speed variant.',                                                    false, null, 7),
('lancet-3',         'sa-6-gainful',  12, 'estimated', false, 'Manoeuvring loitering munition — SARH tracking difficulty.',                                        false, null, 7),
('kargu-2',          'sa-6-gainful',  10, 'estimated', false, 'Slow autonomous — may fall below min speed threshold.',                                             false, null, 6),
('orlan-10',         'sa-6-gainful',  40, 'estimated', false, 'Tactical ISR at medium altitude — within SARH competence zone.',                                    false, null, 28),
('tb2-bayraktar',    'sa-6-gainful',  65, 'high',      false, 'MALE — SA-6 confirmed TB2 kills (Syria, Libya context).',                                           false, null, 48),
('mq-9-reaper',      'sa-6-gainful',  65, 'estimated', false, 'MALE turboprop.',                                                                                   false, null, 48),
('rq-4-global-hawk', 'sa-6-gainful',  55, 'estimated', false, 'HALE within upper envelope — SARH good performance at altitude.',                                   false, null, 40),

-- SA-11 Gadfly (SARH TVM, 3km dead zone)
('fpv-rc',           'sa-11-gadfly',  4,  'estimated', false, 'SARH TVM — FPV below tracking sensitivity. 3km min range dead zone.',                       false, null, 2),
('shahed-136',       'sa-11-gadfly',  35, 'high',      false, 'Ukraine: Buk-M1 confirms OWA kills. Lower min speed vs SA-6 allows more OWA engagements.', false, null, 22),
('geran-2',          'sa-11-gadfly',  32, 'high',      false, 'Same OWA class.',                                                                          false, null, 20),
('lancet-3',         'sa-11-gadfly',  28, 'estimated', false, 'SARH tracking on manoeuvring LM — moderate Pk.',                                            false, null, 18),
('kargu-2',          'sa-11-gadfly',  22, 'estimated', false, 'Small autonomous LM.',                                                                      false, null, 14),
('orlan-10',         'sa-11-gadfly',  55, 'high',      false, 'Tactical ISR — 70kg warhead lethal at proximity detonation.',                               false, null, 40),
('tb2-bayraktar',    'sa-11-gadfly',  75, 'high',      false, 'MALE — multiple TB2 kills by Buk-M1 confirmed (Armenia 2020, Ukraine 2022).',               false, null, 55),
('mq-9-reaper',      'sa-11-gadfly',  75, 'estimated', false, 'MALE turboprop — comparable to TB2 Pk.',                                                    false, null, 55),
('rq-4-global-hawk', 'sa-11-gadfly',  65, 'high',      false, 'HALE — Iran used Buk-derivative to shoot down RQ-4 (IRGC 2019, similar system).',          false, null, 48),

-- SA-17 Grizzly (9M317 active radar terminal)
('fpv-rc',           'sa-17-grizzly',  6,  'estimated', false, '9M317 active radar — improved RCS sensitivity vs SA-11 but FPV still marginal.',               false, null, 4),
('shahed-136',       'sa-17-grizzly',  45, 'high',      false, 'Ukraine: Buk-M1-2 active radar OWA kills. Better than SA-11 due to active terminal homing.', false, null, 28),
('geran-2',          'sa-17-grizzly',  42, 'high',      false, 'Same OWA class.',                                                                             false, null, 26),
('lancet-3',         'sa-17-grizzly',  38, 'estimated', false, 'Active radar terminal tracks manoeuvring LM better than SARH SA-11.',                         false, null, 24),
('kargu-2',          'sa-17-grizzly',  32, 'estimated', false, 'Autonomous small LM — active seeker marginal.',                                               false, null, 20),
('orlan-10',         'sa-17-grizzly',  65, 'high',      false, 'Tactical ISR — confirmed kills.',                                                             false, null, 48),
('tb2-bayraktar',    'sa-17-grizzly',  80, 'high',      false, 'MALE — Buk-M1-2 Ukraine-confirmed TB2 intercepts.',                                           false, null, 60),
('mq-9-reaper',      'sa-17-grizzly',  80, 'estimated', false, 'MALE turboprop.',                                                                              false, null, 60),
('rq-4-global-hawk', 'sa-17-grizzly',  72, 'estimated', false, 'HALE within ceiling.',                                                                        false, null, 54),

-- ── BATCH 4: LONG-RANGE ───────────────────────────────────────────────────────

-- SA-10 Grumble (TVM, 5km dead zone)
('fpv-rc',           'sa-10-grumble',  3,  'estimated', false, 'TVM requires FC radar illumination. FPV below min speed / ground clutter floor.',           false, null, 2),
('shahed-136',       'sa-10-grumble',  28, 'estimated', false, 'OWA — TVM performance limited at low alt by ground clutter. 5km dead zone inside min range.', false, null, 16),
('geran-2',          'sa-10-grumble',  25, 'estimated', false, 'Same OWA class.',                                                                           false, null, 14),
('lancet-3',         'sa-10-grumble',  20, 'estimated', false, 'Manoeuvring LM — TVM SARH component challenges.',                                           false, null, 12),
('kargu-2',          'sa-10-grumble',  15, 'estimated', false, 'Small autonomous target.',                                                                  false, null, 9),
('orlan-10',         'sa-10-grumble',  38, 'estimated', false, 'Tactical ISR at medium altitude — FC radar tracks adequately.',                              false, null, 26),
('tb2-bayraktar',    'sa-10-grumble',  72, 'estimated', false, 'MALE at altitude — good TVM performance above clutter.',                                    false, null, 52),
('mq-9-reaper',      'sa-10-grumble',  72, 'estimated', false, 'MALE turboprop.',                                                                           false, null, 52),
('rq-4-global-hawk', 'sa-10-grumble',  78, 'high',      false, 'HALE — S-300 designed for this target class. Confirmed analogous system kills.',            false, null, 60),

-- SA-20 Gargoyle (48N6DM, improved low-alt vs SA-10)
('fpv-rc',           'sa-20-gargoyle',  5,  'estimated', false, '48N6DM lower min altitude. FPV still marginal but better than base S-300.',                false, null, 3),
('shahed-136',       'sa-20-gargoyle',  38, 'estimated', false, 'OWA — improved low-alt performance vs SA-10. 5km dead zone remains.',                      false, null, 22),
('geran-2',          'sa-20-gargoyle',  35, 'estimated', false, 'Same OWA class.',                                                                         false, null, 20),
('lancet-3',         'sa-20-gargoyle',  30, 'estimated', false, 'Manoeuvring LM — improved TVM.',                                                          false, null, 18),
('kargu-2',          'sa-20-gargoyle',  22, 'estimated', false, 'Small autonomous target.',                                                                 false, null, 13),
('orlan-10',         'sa-20-gargoyle',  48, 'estimated', false, 'Tactical ISR — better low-alt tracking vs SA-10.',                                         false, null, 32),
('tb2-bayraktar',    'sa-20-gargoyle',  78, 'high',      false, 'MALE at altitude — confirmed S-300PMU export-country engagements.',                        false, null, 58),
('mq-9-reaper',      'sa-20-gargoyle',  78, 'estimated', false, 'MALE turboprop.',                                                                          false, null, 58),
('rq-4-global-hawk', 'sa-20-gargoyle',  83, 'estimated', false, 'HALE — primary target class for S-300PMU-2.',                                              false, null, 64),

-- SA-21 Growler (9M96E2 active radar, dedicated UAV mode)
('fpv-rc',           'sa-21-growler',  12, 'estimated', false, '9M96E2 active radar + 5m min altitude. Dedicated counter-UAV mode in later firmware. Best long-range SAM vs FPV.', false, null, 7),
('shahed-136',       'sa-21-growler',  55, 'high',      false, 'S-400 confirmed OWA kills. 9M96E2 active radar handles slow-low targets better than TVM predecessors.',           false, null, 32),
('geran-2',          'sa-21-growler',  52, 'high',      false, 'Same OWA class — confirmed Russian S-400 employment.',                                                             false, null, 30),
('lancet-3',         'sa-21-growler',  45, 'estimated', false, 'Active radar 9M96 tracks manoeuvring LM.',                                                                        false, null, 26),
('kargu-2',          'sa-21-growler',  38, 'estimated', false, 'Small autonomous — active radar preferred; 9M96 short-range version handles it.',                                  false, null, 22),
('orlan-10',         'sa-21-growler',  62, 'high',      false, 'Tactical ISR — S-400 kills documented in Ukraine context.',                                                        false, null, 44),
('tb2-bayraktar',    'sa-21-growler',  88, 'high',      false, 'MALE — S-400 designed to engage this and higher target class. High-confidence.',                                   false, null, 65),
('mq-9-reaper',      'sa-21-growler',  88, 'estimated', false, 'MALE turboprop — primary target class.',                                                                           false, null, 65),
('rq-4-global-hawk', 'sa-21-growler',  92, 'estimated', false, 'HALE — primary design target class for S-400. 40N6E missile range 400km.',                                        false, null, 72),

-- ── BATCH 5: LEGACY / EXPORT ──────────────────────────────────────────────────

-- SA-2 Guideline (SARH, 7km dead zone, 1000m min alt, 300 km/h min speed)
('fpv-rc',           'sa-2-guideline',  1,  'estimated', false, '7km dead zone + 1000m min alt + 300 km/h min speed — FPV effectively immune inside dead zone.',  false, null, 1),
('shahed-136',       'sa-2-guideline',  5,  'estimated', false, 'OWA too slow (150-200 km/h) for SA-2 min speed and too low in most profiles.',                   false, null, 3),
('geran-2',          'sa-2-guideline',  4,  'estimated', false, 'Same OWA class.',                                                                                false, null, 2),
('lancet-3',         'sa-2-guideline',  3,  'estimated', false, 'Manoeuvring LM — min speed limits engagement.',                                                  false, null, 2),
('kargu-2',          'sa-2-guideline',  2,  'estimated', false, 'Small slow autonomous — below min speed threshold.',                                             false, null, 1),
('orlan-10',         'sa-2-guideline',  18, 'estimated', false, 'Tactical ISR may transit above 1000m min alt — marginal SARH engagement.',                       false, null, 11),
('tb2-bayraktar',    'sa-2-guideline',  45, 'estimated', false, 'MALE at altitude — within SA-2 design envelope (high-altitude jets were primary target).',       false, null, 32),
('mq-9-reaper',      'sa-2-guideline',  45, 'estimated', false, 'MALE turboprop.',                                                                                false, null, 32),
('rq-4-global-hawk', 'sa-2-guideline',  52, 'high',      false, 'HALE at altitude — S-75 was specifically designed to engage U-2 class targets. Francis Gary Powers precedent.', false, null, 38),

-- SA-3 Goa (SARH, 200m min alt, 80 km/h min speed)
('fpv-rc',           'sa-3-goa',  2,  'estimated', false, 'SARH — 200m min alt + 80 km/h min speed limits FPV at ground-hugging profiles.',               false, null, 1),
('shahed-136',       'sa-3-goa',  8,  'estimated', false, 'OWA above 80 km/h transit threshold — marginal SARH engagement at low altitude.',               false, null, 5),
('geran-2',          'sa-3-goa',  7,  'estimated', false, 'Same OWA class.',                                                                              false, null, 4),
('lancet-3',         'sa-3-goa',  5,  'estimated', false, 'Manoeuvring LM.',                                                                              false, null, 3),
('kargu-2',          'sa-3-goa',  4,  'estimated', false, 'Small slow autonomous.',                                                                       false, null, 2),
('orlan-10',         'sa-3-goa',  22, 'estimated', false, 'Tactical ISR above min alt — SARH adequate at medium altitude.',                                false, null, 14),
('tb2-bayraktar',    'sa-3-goa',  48, 'estimated', false, 'MALE — within S-125 design envelope.',                                                         false, null, 34),
('mq-9-reaper',      'sa-3-goa',  48, 'estimated', false, 'MALE turboprop.',                                                                              false, null, 34),
('rq-4-global-hawk', 'sa-3-goa',  50, 'estimated', false, 'HALE — some altitude transit within envelope. Serbia: F-117 shoot-down used S-125 (analogous engagement).', false, null, 36),

-- SA-12A Gladiator (active 9M83, 6km dead zone)
('fpv-rc',           'sa-12a-gladiator',  3,  'estimated', false, '6km dead zone limits inner engagement. Active radar but FPV below sensitivity threshold.',   false, null, 2),
('shahed-136',       'sa-12a-gladiator',  25, 'estimated', false, 'OWA — 6km dead zone means launch from distance. Active 9M83 better than SARH.',             false, null, 15),
('geran-2',          'sa-12a-gladiator',  22, 'estimated', false, 'Same OWA class.',                                                                           false, null, 13),
('lancet-3',         'sa-12a-gladiator',  18, 'estimated', false, 'Manoeuvring LM — active radar handles better.',                                             false, null, 11),
('kargu-2',          'sa-12a-gladiator',  14, 'estimated', false, 'Small autonomous LM.',                                                                      false, null, 9),
('orlan-10',         'sa-12a-gladiator',  40, 'estimated', false, 'Tactical ISR within engagement zone.',                                                      false, null, 28),
('tb2-bayraktar',    'sa-12a-gladiator',  68, 'estimated', false, 'MALE — within S-300V envelope.',                                                            false, null, 50),
('mq-9-reaper',      'sa-12a-gladiator',  68, 'estimated', false, 'MALE turboprop.',                                                                           false, null, 50),
('rq-4-global-hawk', 'sa-12a-gladiator',  72, 'estimated', false, 'HALE — S-300V originally designed for cruise/ballistic threat; HALE within envelope.',      false, null, 54),

-- SA-23 Giant (active 9M82M, 4km dead zone)
('fpv-rc',           'sa-23-giant',  4,  'estimated', false, '4km dead zone + active radar. Export variant (Venezuela, Algeria).',                         false, null, 2),
('shahed-136',       'sa-23-giant',  32, 'estimated', false, 'OWA — active 9M82M improved low-alt capability vs S-300V base.',                             false, null, 19),
('geran-2',          'sa-23-giant',  28, 'estimated', false, 'Same OWA class.',                                                                           false, null, 17),
('lancet-3',         'sa-23-giant',  24, 'estimated', false, 'Manoeuvring LM — active radar.',                                                            false, null, 15),
('kargu-2',          'sa-23-giant',  18, 'estimated', false, 'Small autonomous.',                                                                         false, null, 11),
('orlan-10',         'sa-23-giant',  45, 'estimated', false, 'Tactical ISR within engagement zone.',                                                       false, null, 32),
('tb2-bayraktar',    'sa-23-giant',  72, 'estimated', false, 'MALE — within S-300VM envelope.',                                                            false, null, 52),
('mq-9-reaper',      'sa-23-giant',  72, 'estimated', false, 'MALE turboprop.',                                                                            false, null, 52),
('rq-4-global-hawk', 'sa-23-giant',  78, 'estimated', false, 'HALE — S-300VM design target class.',                                                       false, null, 58)

ON CONFLICT (platform_id, defeat_system_id) DO NOTHING;


-- ─── VERIFICATION ─────────────────────────────────────────────────────────────
-- Run after apply to confirm counts:
--   SELECT COUNT(*) FROM anti_drone_systems WHERE id LIKE 'sa-%';  -- expect ≥19
--   SELECT COUNT(*) FROM defeat_effectiveness
--     WHERE defeat_system_id IN ('sa-2-guideline','sa-3-goa','sa-6-gainful',
--     'sa-7-grail','sa-8-gecko','sa-10-grumble','sa-11-gadfly','sa-12a-gladiator',
--     'sa-13-gopher','sa-14-gremlin','sa-15-gauntlet','sa-16-gimlet','sa-17-grizzly',
--     'sa-18-grouse','sa-19-grison','sa-20-gargoyle','sa-21-growler',
--     'sa-23-giant','sa-24-grinch');  -- expect 171
