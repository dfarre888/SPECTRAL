-- Wild Hornet — Ukrainian OEM FPV strike family (OSINT training catalogue)
-- CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY

INSERT INTO platforms (
  id, name, manufacturer, country_of_origin, category,
  max_speed_kmh, service_ceiling_m, range_km, endurance_hrs, mtow_kg, warhead_kg,
  guidance_type, gnss_independent, ai_autonomous, swarm_capable,
  gnss_used, nav_backup, weapon_types, sensor_suite, known_operators, conflict_deployments,
  data_confidence, sources, classification
) VALUES (
  'wild-hornet',
  'Wild Hornet FPV Strike Drone',
  'Wild Hornets (Ukrainian OEM)',
  'Ukraine',
  'FPV',
  120,
  500,
  5,
  0.25,
  2,
  0.3,
  'RF_command',
  false,
  false,
  false,
  ARRAY[]::TEXT[],
  ARRAY['visual', 'pilot_skill', 'fibre_optic']::TEXT[],
  ARRAY['HE warhead', 'RPG warhead']::TEXT[],
  ARRAY['EO camera']::TEXT[],
  ARRAY['Ukraine AFU']::TEXT[],
  ARRAY['Ukraine']::TEXT[],
  'medium',
  ARRAY[
    'OSINT: Wild Hornets Ukrainian domestic OEM',
    'OSINT: Zaporizhzhia and Donetsk oblast employment 2023+',
    'OSINT: RF-linked and fibre-optic variants documented — fibre variant RF-immune'
  ]::TEXT[],
  'UNCLASSIFIED'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO defeat_effectiveness (
  platform_id, defeat_system_id, rf_jamming_pct, kinetic_pct, dew_pct,
  data_confidence, weather_limited, is_immune, immune_reason, special_notes
) VALUES
  ('wild-hornet', 'dronegun-tactical', 55, NULL, NULL, 'estimated', false, false, NULL,
   'DroneShield-class RF jam — effective vs RF-linked variant; fibre-optic variant immune'),
  ('wild-hornet', 'military-ew-generic', 45, NULL, NULL, 'estimated', false, false, NULL,
   'Military EW vs RF C2 — fibre-optic variant immune'),
  ('wild-hornet', 'stinger-shorad', NULL, 15, NULL, 'estimated', false, false, NULL,
   'Low-altitude small RCS — Stinger engagement marginal'),
  ('wild-hornet', 'zu-23-2', NULL, 35, NULL, 'estimated', false, false, NULL,
   'Unguided AAA suppression viable at close range')
ON CONFLICT (platform_id, defeat_system_id) DO NOTHING;

INSERT INTO gnss_platform_dependencies (platform_id, constellation, dependency_level, jamming_effect, notes)
SELECT 'wild-hornet', 'gps', 'none', 'none', 'FPV visual/RF guidance — GNSS not primary nav'
WHERE NOT EXISTS (
  SELECT 1 FROM gnss_platform_dependencies WHERE platform_id = 'wild-hornet' AND constellation = 'gps'
);

INSERT INTO gnss_platform_dependencies (platform_id, constellation, dependency_level, jamming_effect, notes)
SELECT 'wild-hornet', 'glonass', 'none', 'none', 'Same — operator line-of-sight primary'
WHERE NOT EXISTS (
  SELECT 1 FROM gnss_platform_dependencies WHERE platform_id = 'wild-hornet' AND constellation = 'glonass'
);
