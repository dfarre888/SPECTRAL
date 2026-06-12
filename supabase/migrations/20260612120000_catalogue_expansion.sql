-- SPECTRAL Catalogue Expansion — Tiers 1, 2, 5 platforms + Tier 4 effectors
-- CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
-- Generated: 2026-06-12

INSERT INTO platforms (
  id, name, manufacturer, country_of_origin, category,
  max_speed_kmh, service_ceiling_m, range_km, endurance_hrs, mtow_kg, warhead_kg,
  guidance_type, gnss_independent, ai_autonomous, swarm_capable,
  gnss_used, nav_backup, weapon_types, sensor_suite, known_operators, conflict_deployments,
  data_confidence, sources
) VALUES
  ('zala-eleron-3sv', 'ZALA Eleron-3SV', 'ZALA', 'Russia', 'tactical',
   110, 5000, 120, 1.09, 15, NULL,
   'INS+GPS', false, false, false,
   ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[], ARRAY[]::TEXT[], ARRAY['EO']::TEXT[],
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('supercam-s350', 'Supercam S350', 'UAV Production', 'Russia', 'tactical',
   90, 4000, 100, 1.11, 12, NULL,
   'INS+GPS', false, false, false,
   ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[], ARRAY[]::TEXT[], ARRAY['EO']::TEXT[],
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('supercam-s250', 'Supercam S250', 'UAV Production', 'Russia', 'tactical',
   85, 3500, 80, 0.94, 8, NULL,
   'INS+GPS', false, false, false,
   ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[], ARRAY[]::TEXT[], ARRAY['EO']::TEXT[],
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('st-35-silent-thunder', 'Athlon-Avia ST-35 Silent Thunder', 'Athlon-Avia', 'Ukraine', 'loitering_munition',
   150, 2000, 45, 0.3, 5, 3,
   'preprogrammed', false, false, false,
   ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[], ARRAY[]::TEXT[], ARRAY['EO']::TEXT[],
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('cdet-ram', 'CDET RAM', 'CDET', 'Ukraine', 'loitering_munition',
   120, 1500, 30, 0.25, 4, 2,
   'preprogrammed', false, false, false,
   ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[], ARRAY[]::TEXT[], ARRAY['EO']::TEXT[],
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('uj-32-lastivka', 'UKRJET UJ-32 Lastivka', 'UkrJet', 'Ukraine', 'loitering_munition',
   140, 3000, 400, 2.86, 30, 10,
   'preprogrammed', false, false, false,
   ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[], ARRAY[]::TEXT[], ARRAY['EO']::TEXT[],
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('gerbera-parody', 'Gerbera / Parody Decoy', 'assessed', 'Russia', 'loitering_munition',
   200, 4000, 500, 2.5, 50, NULL,
   'preprogrammed', false, false, false,
   ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[], ARRAY[]::TEXT[], ARRAY['EO']::TEXT[],
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('privet-82', 'Privet-82', 'assessed', 'Russia', 'loitering_munition',
   130, 2000, 60, 0.46, 6, 5,
   'preprogrammed', false, false, false,
   ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[], ARRAY[]::TEXT[], ARRAY['EO']::TEXT[],
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('molniya-2-fpv', 'Molniya-2 FPV', 'assessed', 'Russia', 'FPV',
   150, 300, 10, 0.07, 1, 2,
   'RF_command', false, false, false,
   ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[], ARRAY[]::TEXT[], ARRAY['EO']::TEXT[],
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('shahed-129', 'HESA Shahed-129', 'HESA', 'Iran', 'MALE',
   150, 7600, 1700, 11.33, 450, 40,
   'RF_command', false, false, false,
   ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[], ARRAY[]::TEXT[], ARRAY['EO']::TEXT[],
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('shahed-149-gaza', 'HESA Shahed-149 Gaza', 'HESA', 'Iran', 'MALE',
   200, 6000, 1000, 5, 350, 30,
   'RF_command', false, false, false,
   ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[], ARRAY[]::TEXT[], ARRAY['EO']::TEXT[],
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('mohajer-6', 'Qods Mohajer-6', 'Qods', 'Iran', 'MALE',
   200, 5500, 200, 1, 600, 40,
   'RF_command', false, false, false,
   ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[], ARRAY[]::TEXT[], ARRAY['EO']::TEXT[],
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('mohajer-mersad', 'Mohajer / Mersad Series', 'Qods', 'Iran', 'tactical',
   180, 4500, 150, 0.83, 80, NULL,
   'INS+GPS', false, false, false,
   ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[], ARRAY[]::TEXT[], ARRAY['EO']::TEXT[],
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('qasef-1', 'HESA Qasef-1', 'HESA', 'Iran', 'loitering_munition',
   200, 3000, 150, 0.75, 30, 30,
   'preprogrammed', false, false, false,
   ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[], ARRAY[]::TEXT[], ARRAY['EO']::TEXT[],
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('arash-kian', 'DIO Arash / Kian', 'DIO', 'Iran', 'loitering_munition',
   250, 4000, 100, 0.4, 20, 15,
   'preprogrammed', false, false, false,
   ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[], ARRAY[]::TEXT[], ARRAY['EO']::TEXT[],
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('samad-2', 'Samad-2 OWA', 'assessed', 'Yemen', 'loitering_munition',
   200, 5000, 1800, 9, 50, 18,
   'preprogrammed', false, false, false,
   ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[], ARRAY[]::TEXT[], ARRAY['EO']::TEXT[],
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('shahed-238', 'Shahed-238 / Geran-3', 'HESA', 'Iran', 'loitering_munition',
   500, 8000, 2500, 5, 200, 50,
   'preprogrammed', false, false, false,
   ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[], ARRAY[]::TEXT[], ARRAY['EO']::TEXT[],
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('elbit-skystriker', 'Elbit Skystriker', 'Elbit', 'Israel', 'loitering_munition',
   180, 4000, 100, 0.56, 35, 10,
   'preprogrammed', false, false, false,
   ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[], ARRAY[]::TEXT[], ARRAY['EO']::TEXT[],
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('iai-point-blank', 'IAI Point Blank', 'IAI', 'Israel', 'loitering_munition',
   100, 500, 15, 0.15, 3, 0.5,
   'preprogrammed', false, false, false,
   ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[], ARRAY[]::TEXT[], ARRAY['EO']::TEXT[],
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('iai-green-dragon', 'IAI Green Dragon', 'IAI', 'Israel', 'loitering_munition',
   130, 2000, 50, 0.38, 8, 2,
   'preprogrammed', false, false, false,
   ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[], ARRAY[]::TEXT[], ARRAY['EO']::TEXT[],
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('rafael-spike-firefly', 'Rafael SPIKE Firefly', 'Rafael', 'Israel', 'loitering_munition',
   60, 200, 1, 0.02, 3, 0.35,
   'preprogrammed', false, false, false,
   ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[], ARRAY[]::TEXT[], ARRAY['EO']::TEXT[],
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('uvision-hero-30', 'UVision Hero-30', 'UVision', 'Israel', 'loitering_munition',
   100, 500, 10, 0.1, 3, 0.5,
   'preprogrammed', false, false, false,
   ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[], ARRAY[]::TEXT[], ARRAY['EO']::TEXT[],
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('uvision-hero-70', 'UVision Hero-70', 'UVision', 'Israel', 'loitering_munition',
   120, 1500, 40, 0.33, 7, 1.2,
   'preprogrammed', false, false, false,
   ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[], ARRAY[]::TEXT[], ARRAY['EO']::TEXT[],
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('uvision-hero-900', 'UVision Hero-900', 'UVision', 'Israel', 'loitering_munition',
   150, 4000, 150, 1, 25, 8,
   'preprogrammed', false, false, false,
   ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[], ARRAY[]::TEXT[], ARRAY['EO']::TEXT[],
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('aeronautics-orbiter', 'Aeronautics Orbiter', 'Aeronautics', 'Israel', 'tactical',
   120, 5000, 100, 0.83, 30, NULL,
   'INS+GPS', false, false, false,
   ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[], ARRAY[]::TEXT[], ARRAY['EO']::TEXT[],
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('casc-ch-901', 'CASC CH-901', 'CASC', 'China', 'loitering_munition',
   120, 1000, 15, 0.13, 9, 3,
   'preprogrammed', false, false, false,
   ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[], ARRAY[]::TEXT[], ARRAY['EO']::TEXT[],
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('northrop-jackal', 'Northrop Grumman Jackal', 'Northrop', 'USA', 'loitering_munition',
   200, 3000, 80, 0.4, 15, 5,
   'preprogrammed', false, false, false,
   ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[], ARRAY[]::TEXT[], ARRAY['EO']::TEXT[],
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('ncsist-chien-hsiang', 'NCSIST Chien Hsiang', 'NCSIST', 'Taiwan', 'loitering_munition',
   250, 5000, 1000, 4, 50, 20,
   'preprogrammed', false, false, false,
   ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[], ARRAY[]::TEXT[], ARRAY['EO']::TEXT[],
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('lentatek-kargi', 'Lentatek Kargi', 'Lentatek', 'Turkey', 'loitering_munition',
   130, 1000, 15, 0.12, 5, 1,
   'preprogrammed', false, false, false,
   ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[], ARRAY[]::TEXT[], ARRAY['EO']::TEXT[],
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('bayraktar-kizilelma', 'Bayraktar Kizilelma', 'Baykar', 'Turkey', 'MALE',
   900, 12000, 900, 1, 5500, 1500,
   'RF_command', false, false, false,
   ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[], ARRAY[]::TEXT[], ARRAY['EO']::TEXT[],
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('tai-anka', 'TAI Anka', 'TAI', 'Turkey', 'MALE',
   220, 9000, 200, 0.91, 1700, 200,
   'RF_command', false, false, false,
   ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[], ARRAY[]::TEXT[], ARRAY['EO']::TEXT[],
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('avic-nine-sky', 'AVIC Nine Sky (SS-UAV)', 'AVIC', 'China', 'MALE',
   350, 10000, 7000, 20, 4000, 500,
   'RF_command', false, false, false,
   ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[], ARRAY[]::TEXT[], ARRAY['EO']::TEXT[],
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('ga-xq-67a-obss', 'GA XQ-67A OBSS', 'GA-ASI', 'USA', 'MALE',
   800, 12000, 3000, 3.75, 2500, NULL,
   'RF_command', false, false, false,
   ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[], ARRAY[]::TEXT[], ARRAY['EO']::TEXT[],
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('ga-mq-20-avenger', 'GA MQ-20 Avenger', 'GA-ASI', 'USA', 'MALE',
   740, 15000, 2900, 3.92, 8000, 1360,
   'RF_command', false, false, false,
   ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[], ARRAY[]::TEXT[], ARRAY['EO']::TEXT[],
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('rq-4-global-hawk', 'RQ-4 Global Hawk', 'Northrop', 'USA', 'HALE',
   650, 18000, 22780, 35.05, 14600, NULL,
   'RF_command', false, false, false,
   ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[], ARRAY[]::TEXT[], ARRAY['EO']::TEXT[],
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('mq-1-predator', 'MQ-1 Predator', 'GA-ASI', 'USA', 'MALE',
   217, 7620, 1100, 5.07, 1020, 204,
   'RF_command', false, false, false,
   ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[], ARRAY[]::TEXT[], ARRAY['EO']::TEXT[],
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('schiebel-camcopter-s100', 'Schiebel Camcopter S-100', 'Schiebel', 'Austria', 'VTOL',
   220, 5500, 200, 0.91, 110, NULL,
   'INS+GPS', false, false, false,
   ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[], ARRAY[]::TEXT[], ARRAY['EO']::TEXT[],
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('ncsist-cardinal', 'NCSIST Cardinal', 'NCSIST', 'Taiwan', 'tactical',
   80, 1000, 15, 0.19, 2, NULL,
   'INS+GPS', false, false, false,
   ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[], ARRAY[]::TEXT[], ARRAY['EO']::TEXT[],
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('magura-v5', 'Magura V5 USV', 'Ukraine', 'Ukraine', 'naval',
   75, 0, 800, 10.67, 1000, 300,
   'INS+GPS', false, false, false,
   ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[], ARRAY[]::TEXT[], ARRAY['EO']::TEXT[],
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('houthi-owa-maritime', 'Houthi OWA-UAV (Maritime)', 'Yemen', 'Yemen', 'loitering_munition',
   200, 5000, 1800, 9, 50, 18,
   'preprogrammed', false, false, false,
   ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[], ARRAY[]::TEXT[], ARRAY['EO']::TEXT[],
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('black-sea-usv-swarm', 'Black Sea Baby Drone Boats', 'assessed', 'Ukraine', 'naval',
   60, 0, 50, 0.83, 200, 50,
   'INS+GPS', false, false, false,
   ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[], ARRAY[]::TEXT[], ARRAY['EO']::TEXT[],
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12'])
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, category = EXCLUDED.category,
  max_speed_kmh = EXCLUDED.max_speed_kmh, range_km = EXCLUDED.range_km,
  data_confidence = EXCLUDED.data_confidence, sources = EXCLUDED.sources;

INSERT INTO anti_drone_systems (
  id, name, manufacturer, country, defeat_method, effective_range_m,
  portability, conflict_validated, data_confidence, sources
) VALUES
  ('goalkeeper-ciws', 'Goalkeeper CIWS', 'OSINT assessed', 'Multi',
   ARRAY['kinetic']::TEXT[], 1500, 'naval', true, 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('searam', 'SeaRAM', 'OSINT assessed', 'Multi',
   ARRAY['kinetic']::TEXT[], 9000, 'naval', true, 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('millennium-35mm', '35 mm Millennium', 'OSINT assessed', 'Multi',
   ARRAY['kinetic']::TEXT[], 3500, 'naval', true, 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('dardo-fast-forty', 'Dardo / Fast Forty', 'OSINT assessed', 'Multi',
   ARRAY['kinetic']::TEXT[], 4000, 'naval', true, 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('starstreak-hvm', 'Starstreak HVM', 'OSINT assessed', 'Multi',
   ARRAY['kinetic']::TEXT[], 7000, 'vehicle', true, 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('hq-17', 'HQ-17', 'OSINT assessed', 'Multi',
   ARRAY['kinetic']::TEXT[], 15000, 'vehicle', true, 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('eos-slinger', 'EOS Slinger', 'OSINT assessed', 'Multi',
   ARRAY['kinetic']::TEXT[], 2000, 'vehicle', true, 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('smash-hopper', 'Smart Shooter SMASH Hopper', 'OSINT assessed', 'Multi',
   ARRAY['kinetic']::TEXT[], 800, 'vehicle', true, 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12']),
  ('phalanx-ciws', 'Phalanx CIWS', 'OSINT assessed', 'Multi',
   ARRAY['kinetic']::TEXT[], 3600, 'naval', true, 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12'])
ON CONFLICT (id) DO UPDATE SET
  effective_range_m = EXCLUDED.effective_range_m,
  data_confidence = EXCLUDED.data_confidence;

-- Defeat matrix rows for OWA/maritime vs naval CIWS
INSERT INTO defeat_effectiveness (platform_id, defeat_system_id, kinetic_pct, dew_pct, rf_jamming_pct, data_confidence)
SELECT 'shahed-136', 'goalkeeper-ciws', 75, NULL, NULL, 'medium'
WHERE NOT EXISTS (SELECT 1 FROM defeat_effectiveness WHERE platform_id = 'shahed-136' AND defeat_system_id = 'goalkeeper-ciws');
INSERT INTO defeat_effectiveness (platform_id, defeat_system_id, kinetic_pct, dew_pct, rf_jamming_pct, data_confidence)
SELECT 'shahed-136', 'searam', 75, NULL, NULL, 'medium'
WHERE NOT EXISTS (SELECT 1 FROM defeat_effectiveness WHERE platform_id = 'shahed-136' AND defeat_system_id = 'searam');
INSERT INTO defeat_effectiveness (platform_id, defeat_system_id, kinetic_pct, dew_pct, rf_jamming_pct, data_confidence)
SELECT 'shahed-136', 'phalanx-ciws', 75, NULL, NULL, 'medium'
WHERE NOT EXISTS (SELECT 1 FROM defeat_effectiveness WHERE platform_id = 'shahed-136' AND defeat_system_id = 'phalanx-ciws');
INSERT INTO defeat_effectiveness (platform_id, defeat_system_id, kinetic_pct, dew_pct, rf_jamming_pct, data_confidence)
SELECT 'shahed-136', 'iron-beam', NULL, 85, NULL, 'medium'
WHERE NOT EXISTS (SELECT 1 FROM defeat_effectiveness WHERE platform_id = 'shahed-136' AND defeat_system_id = 'iron-beam');
INSERT INTO defeat_effectiveness (platform_id, defeat_system_id, kinetic_pct, dew_pct, rf_jamming_pct, data_confidence)
SELECT 'shahed-136', 'drone-dome', NULL, NULL, 40, 'medium'
WHERE NOT EXISTS (SELECT 1 FROM defeat_effectiveness WHERE platform_id = 'shahed-136' AND defeat_system_id = 'drone-dome');
INSERT INTO defeat_effectiveness (platform_id, defeat_system_id, kinetic_pct, dew_pct, rf_jamming_pct, data_confidence)
SELECT 'samad-2', 'goalkeeper-ciws', 75, NULL, NULL, 'medium'
WHERE NOT EXISTS (SELECT 1 FROM defeat_effectiveness WHERE platform_id = 'samad-2' AND defeat_system_id = 'goalkeeper-ciws');
INSERT INTO defeat_effectiveness (platform_id, defeat_system_id, kinetic_pct, dew_pct, rf_jamming_pct, data_confidence)
SELECT 'samad-2', 'searam', 75, NULL, NULL, 'medium'
WHERE NOT EXISTS (SELECT 1 FROM defeat_effectiveness WHERE platform_id = 'samad-2' AND defeat_system_id = 'searam');
INSERT INTO defeat_effectiveness (platform_id, defeat_system_id, kinetic_pct, dew_pct, rf_jamming_pct, data_confidence)
SELECT 'samad-2', 'phalanx-ciws', 75, NULL, NULL, 'medium'
WHERE NOT EXISTS (SELECT 1 FROM defeat_effectiveness WHERE platform_id = 'samad-2' AND defeat_system_id = 'phalanx-ciws');
INSERT INTO defeat_effectiveness (platform_id, defeat_system_id, kinetic_pct, dew_pct, rf_jamming_pct, data_confidence)
SELECT 'samad-2', 'iron-beam', NULL, 85, NULL, 'medium'
WHERE NOT EXISTS (SELECT 1 FROM defeat_effectiveness WHERE platform_id = 'samad-2' AND defeat_system_id = 'iron-beam');
INSERT INTO defeat_effectiveness (platform_id, defeat_system_id, kinetic_pct, dew_pct, rf_jamming_pct, data_confidence)
SELECT 'samad-2', 'drone-dome', NULL, NULL, 40, 'medium'
WHERE NOT EXISTS (SELECT 1 FROM defeat_effectiveness WHERE platform_id = 'samad-2' AND defeat_system_id = 'drone-dome');
INSERT INTO defeat_effectiveness (platform_id, defeat_system_id, kinetic_pct, dew_pct, rf_jamming_pct, data_confidence)
SELECT 'mohajer-6', 'goalkeeper-ciws', 75, NULL, NULL, 'medium'
WHERE NOT EXISTS (SELECT 1 FROM defeat_effectiveness WHERE platform_id = 'mohajer-6' AND defeat_system_id = 'goalkeeper-ciws');
INSERT INTO defeat_effectiveness (platform_id, defeat_system_id, kinetic_pct, dew_pct, rf_jamming_pct, data_confidence)
SELECT 'mohajer-6', 'searam', 75, NULL, NULL, 'medium'
WHERE NOT EXISTS (SELECT 1 FROM defeat_effectiveness WHERE platform_id = 'mohajer-6' AND defeat_system_id = 'searam');
INSERT INTO defeat_effectiveness (platform_id, defeat_system_id, kinetic_pct, dew_pct, rf_jamming_pct, data_confidence)
SELECT 'mohajer-6', 'phalanx-ciws', 75, NULL, NULL, 'medium'
WHERE NOT EXISTS (SELECT 1 FROM defeat_effectiveness WHERE platform_id = 'mohajer-6' AND defeat_system_id = 'phalanx-ciws');
INSERT INTO defeat_effectiveness (platform_id, defeat_system_id, kinetic_pct, dew_pct, rf_jamming_pct, data_confidence)
SELECT 'mohajer-6', 'iron-beam', NULL, 85, NULL, 'medium'
WHERE NOT EXISTS (SELECT 1 FROM defeat_effectiveness WHERE platform_id = 'mohajer-6' AND defeat_system_id = 'iron-beam');
INSERT INTO defeat_effectiveness (platform_id, defeat_system_id, kinetic_pct, dew_pct, rf_jamming_pct, data_confidence)
SELECT 'mohajer-6', 'drone-dome', NULL, NULL, 40, 'medium'
WHERE NOT EXISTS (SELECT 1 FROM defeat_effectiveness WHERE platform_id = 'mohajer-6' AND defeat_system_id = 'drone-dome');
INSERT INTO defeat_effectiveness (platform_id, defeat_system_id, kinetic_pct, dew_pct, rf_jamming_pct, data_confidence)
SELECT 'gerbera-parody', 'goalkeeper-ciws', 75, NULL, NULL, 'medium'
WHERE NOT EXISTS (SELECT 1 FROM defeat_effectiveness WHERE platform_id = 'gerbera-parody' AND defeat_system_id = 'goalkeeper-ciws');
INSERT INTO defeat_effectiveness (platform_id, defeat_system_id, kinetic_pct, dew_pct, rf_jamming_pct, data_confidence)
SELECT 'gerbera-parody', 'searam', 75, NULL, NULL, 'medium'
WHERE NOT EXISTS (SELECT 1 FROM defeat_effectiveness WHERE platform_id = 'gerbera-parody' AND defeat_system_id = 'searam');
INSERT INTO defeat_effectiveness (platform_id, defeat_system_id, kinetic_pct, dew_pct, rf_jamming_pct, data_confidence)
SELECT 'gerbera-parody', 'phalanx-ciws', 75, NULL, NULL, 'medium'
WHERE NOT EXISTS (SELECT 1 FROM defeat_effectiveness WHERE platform_id = 'gerbera-parody' AND defeat_system_id = 'phalanx-ciws');
INSERT INTO defeat_effectiveness (platform_id, defeat_system_id, kinetic_pct, dew_pct, rf_jamming_pct, data_confidence)
SELECT 'gerbera-parody', 'iron-beam', NULL, 85, NULL, 'medium'
WHERE NOT EXISTS (SELECT 1 FROM defeat_effectiveness WHERE platform_id = 'gerbera-parody' AND defeat_system_id = 'iron-beam');
INSERT INTO defeat_effectiveness (platform_id, defeat_system_id, kinetic_pct, dew_pct, rf_jamming_pct, data_confidence)
SELECT 'gerbera-parody', 'drone-dome', NULL, NULL, 40, 'medium'
WHERE NOT EXISTS (SELECT 1 FROM defeat_effectiveness WHERE platform_id = 'gerbera-parody' AND defeat_system_id = 'drone-dome');
INSERT INTO defeat_effectiveness (platform_id, defeat_system_id, kinetic_pct, dew_pct, rf_jamming_pct, data_confidence)
SELECT 'houthi-owa-maritime', 'goalkeeper-ciws', 75, NULL, NULL, 'medium'
WHERE NOT EXISTS (SELECT 1 FROM defeat_effectiveness WHERE platform_id = 'houthi-owa-maritime' AND defeat_system_id = 'goalkeeper-ciws');
INSERT INTO defeat_effectiveness (platform_id, defeat_system_id, kinetic_pct, dew_pct, rf_jamming_pct, data_confidence)
SELECT 'houthi-owa-maritime', 'searam', 75, NULL, NULL, 'medium'
WHERE NOT EXISTS (SELECT 1 FROM defeat_effectiveness WHERE platform_id = 'houthi-owa-maritime' AND defeat_system_id = 'searam');
INSERT INTO defeat_effectiveness (platform_id, defeat_system_id, kinetic_pct, dew_pct, rf_jamming_pct, data_confidence)
SELECT 'houthi-owa-maritime', 'phalanx-ciws', 75, NULL, NULL, 'medium'
WHERE NOT EXISTS (SELECT 1 FROM defeat_effectiveness WHERE platform_id = 'houthi-owa-maritime' AND defeat_system_id = 'phalanx-ciws');
INSERT INTO defeat_effectiveness (platform_id, defeat_system_id, kinetic_pct, dew_pct, rf_jamming_pct, data_confidence)
SELECT 'houthi-owa-maritime', 'iron-beam', NULL, 85, NULL, 'medium'
WHERE NOT EXISTS (SELECT 1 FROM defeat_effectiveness WHERE platform_id = 'houthi-owa-maritime' AND defeat_system_id = 'iron-beam');
INSERT INTO defeat_effectiveness (platform_id, defeat_system_id, kinetic_pct, dew_pct, rf_jamming_pct, data_confidence)
SELECT 'houthi-owa-maritime', 'drone-dome', NULL, NULL, 40, 'medium'
WHERE NOT EXISTS (SELECT 1 FROM defeat_effectiveness WHERE platform_id = 'houthi-owa-maritime' AND defeat_system_id = 'drone-dome');

-- Gerbera decoy special case
INSERT INTO defeat_effectiveness (platform_id, defeat_system_id, rf_jamming_pct, kinetic_pct, special_notes, data_confidence)
SELECT 'gerbera-parody', 'drone-dome', 90, 20, 'Decoy — RF jam effective but exchange ratio poor; kinetic wasteful', 'medium'
WHERE NOT EXISTS (SELECT 1 FROM defeat_effectiveness WHERE platform_id = 'gerbera-parody' AND defeat_system_id = 'drone-dome');
