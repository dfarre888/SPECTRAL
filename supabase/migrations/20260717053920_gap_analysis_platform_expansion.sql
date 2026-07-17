-- SPECTRAL Gap Analysis Platform Expansion
-- CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
-- Applied: 2026-07-17 as gap_analysis_platform_expansion_v3
-- 11 confirmed-missing platforms from gap analysis
-- Adds: MQ-28A Ghost Bat, Orlan-30, BZK-005, Sirius/Inokhodets, ScanEagle,
--        Sea Baby USV, Ocius Bluebottle, Ghost Shark XLUAV (AUV),
--        HELIOS-60kW (c_uas_laser), Murmansk-BN (strategic_ew), Krasukha-2 (strategic_ew)
-- Also adds HELIOS to anti_drone_systems for defeat matrix FK integrity

-- ── SECTION 1: Category constraint extension ─────────────────────────────────
ALTER TABLE platforms DROP CONSTRAINT IF EXISTS platforms_category_check;
ALTER TABLE platforms ADD CONSTRAINT platforms_category_check CHECK (category IN (
  'MALE','HALE','tactical','loitering_munition','FPV','naval','VTOL',
  'fixed_wing_tactical','interceptor_uas','combat_hexacopter','carrier_uas','tube_launched_lm',
  'c_uas_gun','c_uas_laser','c_uas_rf','manpads','c_uas_system',
  'ballistic_missile_srbm','ballistic_missile_mrbm','cruise_missile','hypersonic_missile',
  'ballistic_missile_slbm',
  'AUV',
  'strategic_ew'
));

-- ── SECTION 2: Platform INSERTs ───────────────────────────────────────────────
INSERT INTO platforms (
  id, name, manufacturer, country_of_origin, category,
  max_speed_kmh, service_ceiling_m, range_km, endurance_hrs, mtow_kg, warhead_kg,
  guidance_type, gnss_independent, ai_autonomous, swarm_capable,
  gnss_used, nav_backup, weapon_types, sensor_suite, known_operators, conflict_deployments,
  data_confidence, sources
) VALUES

('mq-28a-ghost-bat',
 'Boeing MQ-28A Ghost Bat',
 'Boeing Australia', 'Australia', 'MALE',
 1000, 13700, 3700, NULL, 2270, NULL,
 'INS+GPS', true, true, true,
 ARRAY['GPS']::TEXT[], ARRAY['INS','terrain_ref']::TEXT[],
 ARRAY['configurable_payload_bay']::TEXT[],
 ARRAY['EO/IR','AESA_radar_assessed','ESM']::TEXT[],
 ARRAY['RAAF']::TEXT[], ARRAY[]::TEXT[],
 'medium',
 ARRAY['OSINT: Boeing Australia public releases 2023-2025','ADM/RAAF press 2025-26','Jane''s All the World''s Aircraft']),

('orlan-30',
 'Orlan-30',
 'Special Technology Centre (STC)', 'Russia', 'tactical',
 150, 5000, 300, 16, 16, NULL,
 'INS+GPS', false, false, false,
 ARRAY['GPS','GLONASS']::TEXT[], ARRAY['INS']::TEXT[],
 ARRAY[]::TEXT[],
 ARRAY['EO/IR','laser_designator']::TEXT[],
 ARRAY['Russian Ground Forces','Russian Aerospace Forces']::TEXT[],
 ARRAY['Ukraine 2022-present']::TEXT[],
 'high',
 ARRAY['OSINT: Ukrainian battlefield captures 2022-24','Janes Defence 2024','open-source imagery analysis']),

('bzk-005',
 'BZK-005 Chang Ying (Sea Eagle)',
 'Harbin Aircraft Manufacturing Corporation (HAIG)', 'China', 'HALE',
 240, 9000, 2400, 40, 1250, NULL,
 'INS+GPS', false, false, false,
 ARRAY['GPS','BeiDou']::TEXT[], ARRAY['INS']::TEXT[],
 ARRAY[]::TEXT[],
 ARRAY['SAR','EO/IR','AIS_receiver']::TEXT[],
 ARRAY['PLA Navy','PLA Army Aviation']::TEXT[],
 ARRAY['South China Sea ISR operations']::TEXT[],
 'medium',
 ARRAY['OSINT: Airshow China 2022','PLA daily statements','Jane''s 2024']),

('sirius-inokhodets',
 'Kronshtadt Sirius (Inokhodets-RU)',
 'Kronshtadt Group', 'Russia', 'MALE',
 350, 7500, 3500, 24, 5000, 500,
 'INS+GPS', false, true, false,
 ARRAY['GLONASS','GPS']::TEXT[], ARRAY['INS']::TEXT[],
 ARRAY['guided_bombs','anti_tank_missiles']::TEXT[],
 ARRAY['EO/IR','SAR_assessed','SIGINT']::TEXT[],
 ARRAY['Russian Aerospace Forces (in development)']::TEXT[], ARRAY[]::TEXT[],
 'estimated',
 ARRAY['OSINT: Kronshtadt public statements 2023-24','Russian MoD press releases','The Warzone analysis 2024']),

('scaneagle',
 'Boeing Insitu ScanEagle',
 'Boeing Insitu', 'United States', 'tactical',
 148, 5943, 1500, 24, 22, NULL,
 'INS+GPS', false, false, false,
 ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[],
 ARRAY[]::TEXT[],
 ARRAY['EO/IR','SIGINT_optional','AIS_receiver_optional']::TEXT[],
 ARRAY['US Navy','US Marines','USSOCOM','Australia ADF','Canada','Colombia','Netherlands','Philippines','Poland','Tunisia','UAE']::TEXT[],
 ARRAY['Iraq','Afghanistan','Libya','Somalia']::TEXT[],
 'high',
 ARRAY['OSINT: Boeing Insitu public datasheet','Jane''s All the World''s Aircraft 2024','DoD press releases']),

('sea-baby-usv',
 'Sea Baby USV',
 'Ukrainian Security Service (SBU)', 'Ukraine', 'naval',
 80, 0, 850, NULL, 1000, 450,
 'preprogrammed', false, false, false,
 ARRAY['GPS']::TEXT[], ARRAY['INS','visual_nav+INS']::TEXT[],
 ARRAY['MLRS_80mm_pod','shaped_charge_warhead']::TEXT[],
 ARRAY['EO/IR','forward_camera']::TEXT[],
 ARRAY['Ukraine SBU']::TEXT[],
 ARRAY['Black Sea 2023-present','Kerch Bridge attack 2023']::TEXT[],
 'high',
 ARRAY['OSINT: SBU press releases 2023','Ukrainian media video evidence','Reuters/BBC 2023-24']),

('ocius-bluebottle',
 'Ocius Bluebottle USV',
 'Ocius Technology', 'Australia', 'naval',
 7, 0, NULL, 2160, 300, NULL,
 'preprogrammed', true, true, false,
 ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[],
 ARRAY[]::TEXT[],
 ARRAY['EO/IR','sonar_passive','AIS_receiver','weather_sensor']::TEXT[],
 ARRAY['Royal Australian Navy','Australian Border Force (trials)']::TEXT[],
 ARRAY['Pacific maritime surveillance trials 2022-25']::TEXT[],
 'high',
 ARRAY['OSINT: Ocius Technology public releases','RAN/DST Group trials 2022-25','PACIFIC 2023 conference papers']),

('anduril-ghost-shark',
 'Anduril Ghost Shark XLUAV',
 'Anduril Australia', 'Australia', 'AUV',
 NULL, NULL, NULL, NULL, NULL, NULL,
 'autonomous', true, true, false,
 ARRAY[]::TEXT[], ARRAY['INS']::TEXT[],
 ARRAY['configurable_mission_payload']::TEXT[],
 ARRAY['sonar_passive','sonar_active_optional','EO_optional']::TEXT[],
 ARRAY['Royal Australian Navy']::TEXT[], ARRAY[]::TEXT[],
 'medium',
 ARRAY['OSINT: Anduril Australia press release Nov 2023','RAN public statements 2023-24','AUKUS Pillar II reporting','Jane''s 2024']),

-- guidance_type NULL for DEW/EW systems (not guided munitions — no guidance type applies)
('helios-60kw',
 'HELIOS 60kW (High Energy Laser with Integrated Optical-dazzler and Surveillance)',
 'Lockheed Martin', 'United States', 'c_uas_laser',
 NULL, NULL, 3, NULL, NULL, NULL,
 NULL, true, true, false,
 ARRAY[]::TEXT[], ARRAY[]::TEXT[],
 ARRAY['60kW_solid_state_laser','optical_dazzler']::TEXT[],
 ARRAY['EO/IR_tracker','fire_control_radar']::TEXT[],
 ARRAY['US Navy (USS Preble DDG-88)']::TEXT[],
 ARRAY['USN operational evaluation 2021-present']::TEXT[],
 'high',
 ARRAY['OSINT: LM HELIOS press releases 2021','USNI News DDG-88 installation 2021','CRS DEW report 2023']),

('murmansk-bn',
 'Murmansk-BN Strategic HF Jamming Complex',
 'KRET / Rostec', 'Russia', 'strategic_ew',
 NULL, NULL, 5000, NULL, NULL, NULL,
 NULL, true, false, false,
 ARRAY[]::TEXT[], ARRAY[]::TEXT[],
 ARRAY[]::TEXT[],
 ARRAY['HF_jammer_3-30MHz','direction_finding']::TEXT[],
 ARRAY['Russian Armed Forces','deployed Kaliningrad','deployed Arctic','deployed Syria']::TEXT[],
 ARRAY['Syria 2015-present','Ukraine conflict EW operations']::TEXT[],
 'high',
 ARRAY['OSINT: Jane''s Electronic Mission Aircraft 2022','EW World 2019','Bellingcat deployment tracking','IISS Military Balance 2024']),

('krasukha-2',
 'Krasukha-2 (1RL257) S-Band EW Complex',
 'KRET / Rostec', 'Russia', 'strategic_ew',
 NULL, NULL, 250, NULL, NULL, NULL,
 NULL, true, false, false,
 ARRAY[]::TEXT[], ARRAY[]::TEXT[],
 ARRAY[]::TEXT[],
 ARRAY['S-band_active_jammer','AWACS_suppression']::TEXT[],
 ARRAY['Russian Armed Forces']::TEXT[],
 ARRAY['Syria 2015-present','Ukraine EW operations 2022-present']::TEXT[],
 'high',
 ARRAY['OSINT: Jane''s Electronic Mission Aircraft 2022','EW World/Signal Magazine','IISS Military Balance 2024','US Army TRADOC OPFOR assessments'])

ON CONFLICT (id) DO NOTHING;

-- ── SECTION 3: Add HELIOS to anti_drone_systems ──────────────────────────────
-- Pattern: iron-beam and dragonfire also exist in both platforms AND anti_drone_systems.
-- defeat_effectiveness.defeat_system_id → anti_drone_systems(id) via FK.
INSERT INTO anti_drone_systems (
  id, name, manufacturer, country, defeat_method,
  effective_range_m, power_output_w,
  conflict_validated, conflict_notes, data_confidence, sources
) VALUES (
  'helios-60kw',
  'HELIOS 60kW DEW',
  'Lockheed Martin', 'United States',
  ARRAY['DEW_laser','optical_dazzler']::TEXT[],
  3000, 60000,
  false,
  'Operational evaluation ongoing USS Preble DDG-88 2021-present; not combat-deployed',
  'high',
  ARRAY['OSINT: LM press releases 2021','USNI News 2021','CRS DEW report 2023']
) ON CONFLICT (id) DO NOTHING;

-- ── SECTION 4: GNSS dependencies ─────────────────────────────────────────────
-- Columns: platform_id, constellation, dependency_level, jamming_effect, notes, data_source
INSERT INTO gnss_platform_dependencies
  (platform_id, constellation, dependency_level, jamming_effect, notes, data_source)
SELECT v.platform_id, v.constellation, v.dependency_level, v.jamming_effect, v.notes, 'osint'
FROM (VALUES
  ('mq-28a-ghost-bat','gps','secondary','degraded','AI-autonomous fallback with terrain-ref INS; GPS denial degrades precision but not mission-kill'),
  ('orlan-30','gps','primary','mission_kill','GPS L1/GLONASS co-primary. Denial forces RTB or loiter. Confirmed from battlefield captures.'),
  ('orlan-30','glonass','primary','mission_kill','GLONASS co-primary navigation'),
  ('bzk-005','gps','secondary','degraded','GPS for WGS-84 positioning; BeiDou primary'),
  ('bzk-005','beidou','primary','mission_kill','BeiDou primary nav; MEO coverage over Pacific/SCS'),
  ('sirius-inokhodets','glonass','primary','mission_kill','GLONASS primary (domestically sourced post-2022 sanctions)'),
  ('scaneagle','gps','primary','degraded','GPS primary; INS backup sufficient for short loiter; denial degrades geolocation accuracy'),
  ('sea-baby-usv','gps','primary','mission_kill','GPS primary waypoint nav; full denial forces abort — terminal EO fallback within visual range only'),
  ('ocius-bluebottle','gps','primary','degraded','GPS for position-hold and reporting; wave-power propulsion continues without GNSS'),
  ('anduril-ghost-shark','gps','secondary','minimal','Surface GPS fix at start/end of mission only; submerged INS primary; GNSS denial minimal impact')
) AS v(platform_id, constellation, dependency_level, jamming_effect, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM gnss_platform_dependencies g
  WHERE g.platform_id = v.platform_id AND g.constellation = v.constellation
);

-- ── SECTION 5: Defeat effectiveness ──────────────────────────────────────────
-- platform_id → platforms(id)  |  defeat_system_id → anti_drone_systems(id)
INSERT INTO defeat_effectiveness (
  platform_id, defeat_system_id,
  rf_jamming_pct, kinetic_pct, dew_pct,
  data_confidence, weather_limited, special_notes
) VALUES
  ('orlan-30','dronegun-tactical',  50,   25,   NULL, 'estimated', false, 'GPS/GLONASS jam effective; INS may sustain loiter'),
  ('orlan-30','drone-dome',         70,   35,   NULL, 'estimated', false, 'RF defeat highly effective; loiter pattern predictable'),
  ('orlan-30','iron-beam',          NULL, NULL, 85,   'estimated', true,  'Laser highly effective on composite airframe; weather-limited'),
  ('orlan-30','iris-t-slm-cuas',    80,   NULL, NULL, 'estimated', false, 'IRIS-T SLM RF defeat effective; no warhead secondary risk'),
  ('bzk-005','patriot-pac-3',       60,   NULL, NULL, 'estimated', false, 'PAC-3 altitude envelope required; BeiDou jamming degrades nav'),
  ('bzk-005','military-ew-generic', 55,   NULL, NULL, 'estimated', false, 'BeiDou jamming partially effective; INS fallback limits defeat'),
  ('scaneagle','dronegun-tactical', 50,   30,   NULL, 'estimated', false, 'Small RCS; GPS denial effective at short range'),
  ('scaneagle','drone-dome',        65,   40,   NULL, 'estimated', false, 'RF defeat effective; loiter altitude may limit engagement'),
  ('sea-baby-usv','phalanx-ciws',   NULL, 80,   NULL, 'medium',   false, 'CIWS kinetic highly effective if cueing acquired; small RCS challenge'),
  ('mq-28a-ghost-bat','patriot-pac-3', 55, NULL, NULL, 'estimated', false, 'AI autonomous may detect/evade; GNSS denial degrades not mission-kills'),
  ('shahed-136','helios-60kw',      NULL, NULL, 90,   'estimated', true,  'Laser highly effective on composite airframe at 1-2 km; weather-limited'),
  ('orlan-10','helios-60kw',        NULL, NULL, 88,   'estimated', true,  'Small UAS — laser dwell time sufficient for defeat'),
  ('fpv-rc','helios-60kw',          NULL, NULL, 70,   'estimated', true,  'Fast manoeuvring FPV; engagement window narrow; weather-limited')

ON CONFLICT (platform_id, defeat_system_id) DO NOTHING;
