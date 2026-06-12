-- ═══════════════════════════════════════════════════════════════════
-- SPECTRAL — Intelligence Update 2025-06-07
-- Source: docs/SPECTRAL_INTEL_UPDATE_2025.md (OSINT)
-- ═══════════════════════════════════════════════════════════════════

-- Expand platform categories
ALTER TABLE platforms DROP CONSTRAINT IF EXISTS platforms_category_check;
ALTER TABLE platforms ADD CONSTRAINT platforms_category_check CHECK (category IN (
  'MALE','HALE','tactical','loitering_munition','FPV','naval','VTOL','fixed_wing_tactical',
  'interceptor_uas','combat_hexacopter','carrier_uas','tube_launched_lm'
));

ALTER TABLE platforms ADD COLUMN IF NOT EXISTS gnss_independent BOOLEAN DEFAULT false;
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS ai_autonomous BOOLEAN DEFAULT false;
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS swarm_capable BOOLEAN DEFAULT false;
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS intel_update_date DATE DEFAULT '2026-06-07';

ALTER TABLE defeat_effectiveness ADD COLUMN IF NOT EXISTS swarm_engagement_pct SMALLINT
  CHECK (swarm_engagement_pct IS NULL OR swarm_engagement_pct BETWEEN 0 AND 100);

-- Migrate v2u-autonomous → v2u (insert v2u first — FK requires parent row)
INSERT INTO platforms (
  id, name, manufacturer, country_of_origin, category,
  max_speed_kmh, service_ceiling_m, range_km, endurance_hrs, mtow_kg, warhead_kg,
  guidance_type, gnss_independent, ai_autonomous, swarm_capable,
  gnss_used, nav_backup, weapon_types, sensor_suite, known_operators, conflict_deployments,
  data_confidence, sources
) VALUES (
  'v2u', 'V2U Autonomous LM', 'Reported Russian program', 'Russia', 'loitering_munition',
  60, 1000, 30, 1, 8, 3.5, 'autonomous', true, true, false,
  ARRAY[]::TEXT[], ARRAY['computer_vision','LiDAR','terrain matching'], ARRAY['KOFZBCh-3 HEAT'],
  ARRAY['EO','downward LiDAR'], ARRAY['Russian MoD'], ARRAY['Ukraine','Sumy Feb 2025'], 'high',
  ARRAY['OSINT: SPECTRAL_INTEL_UPDATE_2025 — Confirmed captured hardware']
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  guidance_type = EXCLUDED.guidance_type,
  gnss_independent = EXCLUDED.gnss_independent,
  ai_autonomous = EXCLUDED.ai_autonomous,
  data_confidence = EXCLUDED.data_confidence,
  sources = EXCLUDED.sources,
  conflict_deployments = EXCLUDED.conflict_deployments;

UPDATE defeat_effectiveness SET platform_id = 'v2u' WHERE platform_id = 'v2u-autonomous';
DELETE FROM platforms WHERE id = 'v2u-autonomous';

-- ─── New Platforms (SPECTRAL_INTEL_UPDATE_2025 §4) ─────────────────
INSERT INTO platforms (
  id, name, manufacturer, country_of_origin, category,
  max_speed_kmh, service_ceiling_m, range_km, endurance_hrs, mtow_kg, warhead_kg,
  guidance_type, gnss_independent, ai_autonomous, swarm_capable,
  gnss_used, nav_backup, weapon_types, sensor_suite, known_operators, conflict_deployments,
  data_confidence, sources
) VALUES
  ('uj-22-airborne', 'UJ-22 Airborne', 'UkrJet', 'Ukraine', 'loitering_munition',
   160, 6000, 800, 8, 45, 20, 'INS+GPS', false, true, false,
   ARRAY['GPS'], ARRAY['INS','autonomous waypoint'], ARRAY['HE warhead'], ARRAY['EO'],
   ARRAY['Ukraine AFU'], ARRAY['Ukraine'], 'medium',
   ARRAY['OSINT: SPECTRAL_INTEL_UPDATE_2025 — Assessed']),
  ('uj-26-bober', 'UJ-26 Bober / Beaver', 'UkrJet', 'Ukraine', 'loitering_munition',
   180, 5000, 1000, 10, 50, 20, 'INS+GPS', false, false, false,
   ARRAY['GPS'], ARRAY['INS'], ARRAY['HE warhead'], ARRAY['EO'], ARRAY['Ukraine AFU'], ARRAY['Ukraine'],
   'medium', ARRAY['OSINT: SPECTRAL_INTEL_UPDATE_2025 — Assessed']),
  ('baba-yaga', 'Baba Yaga Hexacopter', 'Field-modified', 'Ukraine', 'combat_hexacopter',
   60, 500, 60, 1, 25, 20, 'RF_command', false, false, false,
   ARRAY['GPS'], ARRAY['visual'], ARRAY['grenade','RPG'], ARRAY['EO camera'],
   ARRAY['Ukraine AFU','Russia'], ARRAY['Ukraine','Bakhmut'], 'high',
   ARRAY['OSINT: SPECTRAL_INTEL_UPDATE_2025 — Confirmed']),
  ('vampire', 'Vampire Combat Drone', 'Ukraine', 'Ukraine', 'combat_hexacopter',
   70, 600, 60, 1.5, 30, 15, 'RF_command', false, false, false,
   ARRAY['GPS'], ARRAY['INS'], ARRAY['drop munitions'], ARRAY['EO/IR'],
   ARRAY['Ukraine AFU'], ARRAY['Ukraine'], 'estimated',
   ARRAY['OSINT: SPECTRAL_INTEL_UPDATE_2025 — Reported']),
  ('kazhan', 'Kazhan AI FPV Strike', 'Ukraine', 'Ukraine', 'FPV',
   90, 400, 15, 0.5, 2, 2, 'autonomous', false, true, false,
   ARRAY['GPS'], ARRAY['AI targeting','visual'], ARRAY['RPG warhead'], ARRAY['EO+AI FC'],
   ARRAY['Ukraine AFU'], ARRAY['Ukraine'], 'estimated',
   ARRAY['OSINT: SPECTRAL_INTEL_UPDATE_2025 — Reported']),
  ('fpv-interceptor', 'FPV Interceptor UAS', 'Multi-nation', 'Ukraine', 'interceptor_uas',
   120, 300, 5, 0.25, 1, NULL, 'INS+EO', false, false, false,
   ARRAY[]::TEXT[], ARRAY['visual','EO seeker'], ARRAY['kinetic ram'], ARRAY['EO seeker'],
   ARRAY['Ukraine','Russia'], ARRAY['Ukraine'], 'high',
   ARRAY['OSINT: SPECTRAL_INTEL_UPDATE_2025 — Confirmed Jul 2024 Mi-8 intercept']),
  ('rotem-l', 'IAI Rotem L', 'Israel Aerospace Industries', 'Israel', 'loitering_munition',
   80, 500, 10, 0.5, 4, 1, 'INS+EO', false, false, false,
   ARRAY['GPS'], ARRAY['EO/IIR seeker'], ARRAY['HEAT'], ARRAY['EO/IIR'],
   ARRAY['IDF'], ARRAY[]::TEXT[], 'high', ARRAY['OSINT: SPECTRAL_INTEL_UPDATE_2025 — Confirmed']),
  ('kargu-2', 'STM Kargu-2', 'STM / ROKETSAN', 'Turkey', 'loitering_munition',
   145, 2800, 10, 0.5, 7, 1.4, 'autonomous', false, true, true,
   ARRAY['GPS'], ARRAY['ML target selection'], ARRAY['HE warhead'], ARRAY['EO'],
   ARRAY['Turkey'], ARRAY['Libya','Nagorno-Karabakh'], 'high',
   ARRAY['OSINT: SPECTRAL_INTEL_UPDATE_2025 — Confirmed Libya 2020 autonomous engagement']),
  ('alpagu', 'STM Alpagu', 'STM / ROKETSAN', 'Turkey', 'tube_launched_lm',
   120, 200, 8, 0.25, 2, 0.5, 'INS+GPS', false, false, false,
   ARRAY['GPS'], ARRAY['INS'], ARRAY['HE'], ARRAY['EO'], ARRAY['Turkey'], ARRAY[]::TEXT[],
   'high', ARRAY['OSINT: SPECTRAL_INTEL_UPDATE_2025 — Confirmed']),
  ('wing-loong-1', 'CAIG Wing Loong I', 'AVIC / CAIG', 'China', 'MALE',
   280, 5000, 4000, 20, 1100, 200, 'RF_command', false, false, false,
   ARRAY['GPS','BeiDou'], ARRAY['INS'], ARRAY['AR-1','FT-9'], ARRAY['EO/IR','SAR'],
   ARRAY['UAE','Pakistan','Saudi Arabia','Egypt'], ARRAY['Libya','Yemen'], 'high',
   ARRAY['OSINT: SPECTRAL_INTEL_UPDATE_2025 — Confirmed']),
  ('wing-loong-2', 'CAIG Wing Loong II', 'AVIC / CAIG', 'China', 'MALE',
   370, 9000, 1500, 32, 4200, 480, 'RF_command', false, false, false,
   ARRAY['GPS','BeiDou'], ARRAY['INS'], ARRAY['AR-1','FT-9'], ARRAY['EO/IR','SAR'],
   ARRAY['UAE','Pakistan','Saudi Arabia'], ARRAY['Libya','Ethiopia'], 'high',
   ARRAY['OSINT: SPECTRAL_INTEL_UPDATE_2025 — Confirmed']),
  ('ch-4-rainbow', 'CASC CH-4 Rainbow', 'CASC', 'China', 'MALE',
   205, 7500, 5000, 40, 1300, 345, 'RF_command', false, false, false,
   ARRAY['GPS','BeiDou'], ARRAY['INS'], ARRAY['AR-1'], ARRAY['EO/IR'],
   ARRAY['Pakistan','Iraq','Jordan','Saudi Arabia'], ARRAY['Iraq','Yemen'], 'high',
   ARRAY['OSINT: SPECTRAL_INTEL_UPDATE_2025 — Confirmed']),
  ('ch-5-rainbow', 'CASC CH-5 Rainbow', 'CASC', 'China', 'MALE',
   300, 9000, 10000, 60, 3300, 1000, 'RF_command', false, false, false,
   ARRAY['GPS','BeiDou'], ARRAY['INS'], ARRAY['AR-1','FT-9'], ARRAY['EO/IR','SAR'],
   ARRAY['China PLA'], ARRAY[]::TEXT[], 'high',
   ARRAY['OSINT: SPECTRAL_INTEL_UPDATE_2025 — Confirmed']),
  ('tb-001', 'AVIC TB-001 Twin-Tailed Scorpion', 'AVIC', 'China', 'MALE',
   300, 8000, 6000, 35, 2800, 400, 'RF_command', false, false, false,
   ARRAY['GPS','BeiDou'], ARRAY['INS'], ARRAY['precision munitions'], ARRAY['EO/IR','SAR'],
   ARRAY['PLA'], ARRAY['Taiwan ADIZ'], 'medium',
   ARRAY['OSINT: SPECTRAL_INTEL_UPDATE_2025 — Assessed']),
  ('mq-1c-gray-eagle', 'MQ-1C Gray Eagle', 'General Atomics', 'United States', 'MALE',
   280, 8840, 400, 25, 1630, 163, 'INS+GPS', false, false, false,
   ARRAY['GPS'], ARRAY['INS'], ARRAY['Hellfire','Stinger'], ARRAY['SAR/GMTI','EO/IR'],
   ARRAY['US Army'], ARRAY['Iraq','Afghanistan'], 'high',
   ARRAY['OSINT: SPECTRAL_INTEL_UPDATE_2025 — Confirmed; procurement ceased Apr 2025']),
  ('rq-7b-shadow', 'RQ-7B Shadow', 'AAI / Textron', 'United States', 'tactical',
   200, 4570, 109, 7, 186, NULL, 'RF_command', false, false, false,
   ARRAY['GPS'], ARRAY['INS'], ARRAY[]::TEXT[], ARRAY['EO/IR'],
   ARRAY['US Army'], ARRAY['Iraq','Afghanistan'], 'high',
   ARRAY['OSINT: SPECTRAL_INTEL_UPDATE_2025 — Retired 2024']),
  ('mq-25-stingray', 'MQ-25 Stingray', 'Boeing', 'United States', 'carrier_uas',
   740, 12500, 930, 12, 20000, NULL, 'INS+GPS', false, false, false,
   ARRAY['GPS'], ARRAY['INS'], ARRAY[]::TEXT[], ARRAY['ISR'],
   ARRAY['US Navy'], ARRAY[]::TEXT[], 'high',
   ARRAY['OSINT: SPECTRAL_INTEL_UPDATE_2025 — Confirmed test 2026']),
  ('anduril-anvil', 'Anduril Anvil', 'Anduril', 'United States', 'interceptor_uas',
   150, 500, 5, 0.2, 2, NULL, 'INS+EO', false, false, false,
   ARRAY[]::TEXT[], ARRAY['Lattice C2','EO'], ARRAY['kinetic intercept'], ARRAY['EO'],
   ARRAY['US DoD'], ARRAY['Falcon Peak 2025'], 'high',
   ARRAY['OSINT: SPECTRAL_INTEL_UPDATE_2025 — Confirmed']),
  ('skydio-x10d', 'Skydio X10D', 'Skydio', 'United States', 'tactical',
   65, 500, 10, 0.75, 2.5, NULL, 'INS+GPS', false, false, false,
   ARRAY['GPS'], ARRAY['visual SLAM','INS'], ARRAY[]::TEXT[], ARRAY['EO/IR FLIR Boson+'],
   ARRAY['US Army','Spain MoD'], ARRAY[]::TEXT[], 'high',
   ARRAY['OSINT: SPECTRAL_INTEL_UPDATE_2025 — Blue UAS Confirmed'])
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  manufacturer = EXCLUDED.manufacturer,
  category = EXCLUDED.category,
  max_speed_kmh = EXCLUDED.max_speed_kmh,
  service_ceiling_m = EXCLUDED.service_ceiling_m,
  range_km = EXCLUDED.range_km,
  endurance_hrs = EXCLUDED.endurance_hrs,
  mtow_kg = EXCLUDED.mtow_kg,
  warhead_kg = EXCLUDED.warhead_kg,
  guidance_type = EXCLUDED.guidance_type,
  gnss_independent = EXCLUDED.gnss_independent,
  ai_autonomous = EXCLUDED.ai_autonomous,
  swarm_capable = EXCLUDED.swarm_capable,
  data_confidence = EXCLUDED.data_confidence,
  sources = EXCLUDED.sources,
  conflict_deployments = EXCLUDED.conflict_deployments;

-- ─── New C-UAS / Defeat Systems (§3) ───────────────────────────────
INSERT INTO anti_drone_systems (
  id, name, manufacturer, country, defeat_method, effective_range_m,
  portability, conflict_validated, data_confidence, sources, price_usd_approx
) VALUES
  ('lite-beam', 'Rafael Lite Beam', 'Rafael', 'Israel',
   ARRAY['laser','directed_energy'], 2000, 'vehicle', true, 'high',
   ARRAY['OSINT: SPECTRAL_INTEL_UPDATE_2025'], 5000000),
  ('dragonfire', 'MBDA DragonFire', 'MBDA / Leonardo / QinetiQ', 'United Kingdom',
   ARRAY['laser','directed_energy'], 3000, 'naval', true, 'high',
   ARRAY['OSINT: SPECTRAL_INTEL_UPDATE_2025 — RN contract £316M'], NULL),
  ('pulsar-l', 'Anduril Pulsar-L', 'Anduril', 'United States',
   ARRAY['RF_jamming','cyber'], 5000, 'man-portable', true, 'high',
   ARRAY['OSINT: SPECTRAL_INTEL_UPDATE_2025 — JCO 5th demo'], 250000),
  ('pulsar-v', 'Anduril Pulsar-V', 'Anduril', 'United States',
   ARRAY['RF_jamming'], 8000, 'vehicle', true, 'high',
   ARRAY['OSINT: SPECTRAL_INTEL_UPDATE_2025 — JCO 5th demo'], 500000),
  ('dronesentry-sentrycs', 'DroneSentry + Sentrycs', 'DroneShield', 'Australia',
   ARRAY['RF_jamming','cyber','combined'], 4000, 'vehicle', true, 'high',
   ARRAY['OSINT: SPECTRAL_INTEL_UPDATE_2025 — Avalon 2025'], 750000),
  ('jco-swarm-kit', 'JCO Swarm Kit (Multi-vendor)', 'JCO / Multi', 'United States',
   ARRAY['RF_jamming','kinetic','combined'], 10000, 'vehicle', true, 'high',
   ARRAY['OSINT: SPECTRAL_INTEL_UPDATE_2025 — Yuma PG Jun 2024'], NULL),
  ('fpv-interceptor', 'FPV Interceptor UAS', 'Multi-nation', 'Ukraine',
   ARRAY['kinetic'], 300, 'man-portable', true, 'high',
   ARRAY['OSINT: SPECTRAL_INTEL_UPDATE_2025 — Confirmed Jul 2024 Mi-8 intercept'], NULL),
  ('anduril-anvil', 'Anduril Anvil', 'Anduril', 'United States',
   ARRAY['kinetic'], 500, 'man-portable', true, 'high',
   ARRAY['OSINT: SPECTRAL_INTEL_UPDATE_2025 — Confirmed'], NULL)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  defeat_method = EXCLUDED.defeat_method,
  effective_range_m = EXCLUDED.effective_range_m,
  data_confidence = EXCLUDED.data_confidence,
  sources = EXCLUDED.sources;

-- Update iron-beam with full OSINT spec
UPDATE anti_drone_systems SET
  power_output_w = 100000,
  price_usd_approx = 3,
  conflict_notes = '100kW HEL — ~$3/shot vs $50k+ missile intercept. Weather-limited.',
  sources = ARRAY['OSINT: SPECTRAL_INTEL_UPDATE_2025 — Confirmed Dec 2025 delivery']
WHERE id = 'iron-beam';

-- ─── Defeat Effectiveness — Special Cases (§4) + matrix expansion ──
INSERT INTO defeat_effectiveness (
  platform_id, defeat_system_id, rf_jamming_pct, kinetic_pct, dew_pct,
  swarm_engagement_pct, data_confidence, is_immune, immune_reason,
  adjudication_rationale, modifiers, recommended_response, weather_limited, special_notes
) VALUES
  -- V2U special cases
  ('v2u', 'dronegun-tactical', 0, NULL, NULL, NULL, 'high', true,
   'GNSS-free computer vision navigation',
   'V2U uses terrain-matched computer vision — RF jamming of nav bands ineffective.',
   '[{"type":"emcon","label":"No GPS dependency","impact":"RF nav jamming 0%"}]'::jsonb,
   'Kinetic intercept or HEL only. RF defeat doctrine does not apply.', false,
   'RF Jammer (nav) 0% per intel doc'),
  ('v2u', 'pulsar-l', 40, NULL, NULL, NULL, 'estimated', false, NULL,
   'Possible datalink disruption if RF link active during terminal phase — assessed 40%.',
   '[{"type":"emcon","label":"Autonomous terminal","impact":"Limited RF window"}]'::jsonb,
   'Prioritise kinetic/DEW. RF only if datalink confirmed active.', false, NULL),
  ('v2u', 'iron-beam', NULL, NULL, 70, NULL, 'high', false, NULL,
   'Only reliable defeat path for GNSS-free autonomous LM.',
   '[{"type":"swarm","label":"Mass salvo","impact":"Magazine saturation at 30+ inbound"}]'::jsonb,
   'Iron Beam + Anvil interceptors. Accept magazine depth constraints.', true,
   'Kinetic/laser ~70% — only reliable defeat'),
  -- Fibre-optic FPV vs FPV interceptor
  ('fpv-fibre-optic', 'fpv-interceptor', NULL, 60, NULL, NULL, 'medium', false, NULL,
   'Drone-on-drone kinetic intercept — effective where RF jamming fails.',
   '[{"type":"altitude","label":"Low altitude","impact":"Engagement geometry challenging"}]'::jsonb,
   'Deploy FPV interceptor screen against fibre-optic attack drones.', false,
   'FPV Interceptor ~60% per intel doc'),
  ('fpv-fibre-optic', 'anduril-anvil', NULL, 65, NULL, NULL, 'medium', false, NULL,
   'Lattice-managed kinetic intercept complements EW defeat.',
   '[]'::jsonb, 'Anvil intercept when RF defeat confirmed ineffective.', false, NULL),
  -- Kargu-2 swarm saturation
  ('kargu-2', 'dronegun-tactical', 20, NULL, NULL, 15, 'high', false, NULL,
   'Single RF jammer vs autonomous swarm — saturation degrades effectiveness.',
   '[{"type":"swarm","label":"Swarm saturation","impact":"-80% effectiveness vs homogeneous swarm"}]'::jsonb,
   'Layer multiple EW nodes. JCO rule: 5 tracks per Pulsar node max.', false,
   'Single RF jammer ~20% vs Kargu-2 swarm'),
  ('kargu-2', 'jco-swarm-kit', 55, 70, 75, 65, 'high', false, NULL,
   'Multi-vendor layered C-UAS designed for 40+ UAS swarm sessions.',
   '[{"type":"swarm","label":"40+ targets","impact":"Saturation at 6+ simultaneous per node"}]'::jsonb,
   'Deploy layered detect-decide-defeat. Pulsar + kinetic + DEW combination.', false,
   'JCO 5th demo Yuma PG 2024'),
  ('kargu-2', 'pulsar-l', 45, NULL, NULL, 50, 'high', false, NULL,
   'AI-adaptive EW — better swarm handling than legacy jammers.',
   '[{"type":"swarm","label":"ML threat classification","impact":"Improved vs legacy RF"}]'::jsonb,
   'Deploy multiple Pulsar-L nodes. 5-track capacity per node.', false, NULL),
  -- Iron Beam universal high DEW
  ('baba-yaga', 'iron-beam', NULL, NULL, 90, NULL, 'high', false, NULL,
   'HEL effective against hexacopter class in clear air.',
   '[{"type":"weather","label":"Dust/smoke","impact":"-40% in degraded visibility"}]'::jsonb,
   'Primary DEW defeat for heavy hexacopter threats.', true, NULL),
  ('uj-26-bober', 'coyote-block-3', NULL, 65, NULL, NULL, 'medium', false, NULL,
   'Long-range OWA — intercept window limited by detection range.',
   '[]'::jsonb, 'Layer SHORAD with persistent ISR cueing.', false, NULL),
  ('ch-5-rainbow', 'iron-beam', NULL, NULL, 75, NULL, 'high', false, NULL,
   'High-altitude MALE — DEW range/atmosphere limits engagement geometry.',
   '[{"type":"altitude","label":"9000m ceiling","impact":"Reduced DEW Pk at extreme range"}]'::jsonb,
   'Patriot-class kinetic for high-altitude MALE. DEW for descent phase.', true, NULL),
  ('mq-1c-gray-eagle', 'drone-dome', 55, 80, NULL, NULL, 'high', false, NULL,
   'Legacy MALE — well-characterised EW and kinetic defeat profile.',
   '[]'::jsonb, 'Standard layered C-UAS. System obsolete but threat profile valid.', false, NULL)
ON CONFLICT (platform_id, defeat_system_id) DO UPDATE SET
  rf_jamming_pct = EXCLUDED.rf_jamming_pct,
  kinetic_pct = EXCLUDED.kinetic_pct,
  dew_pct = EXCLUDED.dew_pct,
  swarm_engagement_pct = EXCLUDED.swarm_engagement_pct,
  is_immune = EXCLUDED.is_immune,
  immune_reason = EXCLUDED.immune_reason,
  adjudication_rationale = EXCLUDED.adjudication_rationale,
  modifiers = EXCLUDED.modifiers,
  recommended_response = EXCLUDED.recommended_response,
  weather_limited = EXCLUDED.weather_limited,
  special_notes = EXCLUDED.special_notes;

-- Flag platforms per intel doc §5
UPDATE platforms SET gnss_independent = true, ai_autonomous = true
  WHERE id IN ('v2u', 'kargu-2', 'kazhan');
UPDATE platforms SET gnss_independent = true WHERE id = 'v2u';
UPDATE platforms SET swarm_capable = true WHERE id IN ('kargu-2');

-- ─── Conflict Incidents (key engagements from intel doc) ───────────
INSERT INTO conflict_incidents (
  id, conflict, date_range, location, platform_used, mission_type, result,
  defeat_method, tactical_notes, lessons_learned, data_confidence, sources
) VALUES
  ('ukraine-fpv-mi8-intercept', 'Ukraine', 'Jul 2024', 'Eastern Ukraine', 'fpv-interceptor',
   'kinetic intercept', 'success', 'kinetic',
   'First confirmed FPV drone destruction of Mi-8 helicopter in combat.',
   'FPV interceptors viable against crewed aviation at low altitude — doctrine implication for force protection.',
   'high', ARRAY['OSINT: SPECTRAL_INTEL_UPDATE_2025']),
  ('ukraine-v2u-sumy', 'Ukraine', 'Feb 2025', 'Sumy region', 'v2u',
   'autonomous strike', 'partial', 'kinetic',
   'First confirmed V2U combat employment. GNSS-free CV navigation defeated Ukrainian EW.',
   'RF-centric C-UAS doctrine insufficient against CV-nav autonomous LMs. Kinetic/DEW mandatory.',
   'high', ARRAY['OSINT: SPECTRAL_INTEL_UPDATE_2025']),
  ('libya-kargu-autonomous', 'Libya', '2020', 'Tripoli area', 'kargu-2',
   'autonomous lethal engagement', 'success', 'kinetic',
   'UN Panel of Experts reported first autonomous lethal engagement by Kargu-2.',
   'Swarm-capable autonomous LM changes ROE and human-in-loop requirements.',
   'high', ARRAY['OSINT: UN Panel of Experts via SPECTRAL_INTEL_UPDATE_2025']),
  ('jco-yuma-swarm-demo', 'USA (training)', 'Jun 2024', 'Yuma Proving Ground, Arizona', NULL,
   'C-UAS evaluation', 'partial', 'combined',
   'JCO 5th demonstration: 58 proposals, 9 systems selected, 40+ UAS per session.',
   'Swarm saturation is primary C-UAS challenge — single-system defeat inadequate.',
   'high', ARRAY['OSINT: SPECTRAL_INTEL_UPDATE_2025'])
ON CONFLICT (id) DO NOTHING;

-- ─── WOPR Scenario Templates (§6) ──────────────────────────────────
INSERT INTO scenario_templates (
  name, description, terrain_type, ew_environment, gnss_availability,
  weather, time_of_day, red_platforms, blue_systems, duration_mins, difficulty
) VALUES
  (
    'SCN-JCO Swarm Attack',
    'JCO-derived: 40+ Kargu-2 swarm + 10 FPV + 5 Baba Yaga vs Pulsar-L + DroneSentry + Iron Beam. Adjudication: swarm saturation threshold.',
    'flat_open', 'contested', 'multi_constellation',
    'clear', 'day',
    ARRAY['kargu-2','fpv-fibre-optic','baba-yaga'],
    ARRAY['pulsar-l','dronesentry-sentrycs','iron-beam'],
    90, 'expert'
  ),
  (
    'SCN-GPS-Denied Autonomous Strike',
    '30× V2U autonomous LMs — no GPS, no RF link. Standard RF defeat ineffective. Forces kinetic-only response.',
    'urban', 'denied', 'denied',
    'overcast', 'night',
    ARRAY['v2u'],
    ARRAY['iron-beam','anduril-anvil','coyote-block-3'],
    60, 'expert'
  );
