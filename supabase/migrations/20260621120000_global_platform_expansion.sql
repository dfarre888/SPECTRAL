-- SPECTRAL — Global Platform Expansion
-- 23 new platforms: Ukraine, Russia, Iran, Houthi, China, DPRK, Turkey, Israel, India, USA
-- CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
-- All data OSINT. Sources cited per entry.


-- Expand guidance_type check for OSINT-expanded platform entries
ALTER TABLE platforms DROP CONSTRAINT IF EXISTS platforms_guidance_type_check;
ALTER TABLE platforms ADD CONSTRAINT platforms_guidance_type_check CHECK (
  guidance_type IS NULL OR guidance_type IN (
    'INS+GPS', 'INS+EO', 'RF_command', 'fibre_optic', 'autonomous', 'INS_only',
    'mesh', 'preprogrammed', 'unknown',
    'FPV+thermal', 'INS+GPS+GLONASS', 'AI+GPS+BeiDou', 'AI+EO+GPS',
    'passive_RF+INS+GPS', 'EO+INS+GPS', 'GPS+NavIC', 'visual_nav+INS', 'EO+man-in-loop'
  )
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. Add NavIC GNSS constellation (India regional — used by Nagastra-1)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO gnss_constellations (
  id, full_name, display_name, operator, operator_country, status, signal_bands,
  satellites_nominal, satellites_active, constellation_size, notes, updated_at
) VALUES (
  'navic', 'NavIC', 'NavIC (IRNSS)', 'ISRO', 'India', 'operational',
  '[{"band":"L5","freq_mhz":1176.45},{"band":"S","freq_mhz":2492.028}]'::jsonb,
  7, 7, 7,
  'Indian Regional Navigation Satellite System — L5 and S-band, 1500 km coverage radius over Indian subcontinent and 1500 km beyond borders',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PLATFORMS
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO platforms (
  id, name, manufacturer, country_of_origin, category,
  max_speed_kmh, service_ceiling_m, range_km, endurance_hrs, mtow_kg, warhead_kg,
  guidance_type, gnss_independent, ai_autonomous, swarm_capable,
  gnss_used, nav_backup, weapon_types, sensor_suite, known_operators, conflict_deployments,
  data_confidence, sources, classification
) VALUES

-- ── UKRAINE ──────────────────────────────────────────────────────────────────

('uj-26-bober',
 'UJ-26 Bober (Beaver)', 'UkrJet', 'Ukraine', 'loitering_munition',
 200, 3000, 1000, 6, 150, 20,
 'INS+GPS', false, false, false,
 ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[],
 ARRAY['HE warhead']::TEXT[], ARRAY['INS']::TEXT[],
 ARRAY['Ukraine AFU','Ukraine GUR']::TEXT[], ARRAY['Ukraine']::TEXT[],
 'high',
 ARRAY[
   'OSINT: UkrJet UJ-26 Bober — Ukrainian long-range OWA 1000km range 20kg warhead',
   'OSINT: GUR "Black Box" programme — strikes Moscow and deep Russian rear 2023-2024',
   'OSINT: INS+GPS nav canard layout inverted tail — Hisutton Covert Shores analysis'
 ]::TEXT[], 'UNCLASSIFIED'),

('vyriy-molfar',
 'Vyriy Molfar FPV', 'Vyriy Drone', 'Ukraine', 'FPV',
 120, 500, 10, 0.25, 2, 0.5,
 'RF_command', true, false, false,
 ARRAY[]::TEXT[], ARRAY['visual','pilot_skill']::TEXT[],
 ARRAY['HE warhead','shaped charge']::TEXT[], ARRAY['EO camera']::TEXT[],
 ARRAY['Ukraine AFU']::TEXT[], ARRAY['Ukraine']::TEXT[],
 'medium',
 ARRAY[
   'OSINT: Vyriy Drone sub-1GHz FPV — designed to evade standard 2.4/5.8GHz jammers',
   'OSINT: Ukraine MoD codification 2024 — fully domestic components',
   'OSINT: Considered elite FPV within UA inventory — frontline use 2023-2025'
 ]::TEXT[], 'UNCLASSIFIED'),

('vyriy-max15',
 'Vyriy MAX 15 Heavy FPV', 'Vyriy Drone', 'Ukraine', 'FPV',
 120, 500, 30, 0.5, 15, 8,
 'RF_command', true, false, false,
 ARRAY[]::TEXT[], ARRAY['visual','pilot_skill']::TEXT[],
 ARRAY['HE warhead','anti-armour warhead']::TEXT[], ARRAY['EO camera']::TEXT[],
 ARRAY['Ukraine AFU']::TEXT[], ARRAY['Ukraine']::TEXT[],
 'medium',
 ARRAY[
   'OSINT: Vyriy MAX 15 — 15-inch frame 8kg payload 30km range heavy FPV',
   'OSINT: Passed Ukraine combat testing without design changes — MoD codified 2024',
   'OSINT: Targeting Russian fortifications and rear-area logistics'
 ]::TEXT[], 'UNCLASSIFIED'),

('aerorozvidka-r18',
 'Aerorozvidka R-18 Octocopter', 'Aerorozvidka', 'Ukraine', 'tactical',
 60, 1000, 20, 0.75, 10, 5,
 'FPV+thermal', false, false, false,
 ARRAY['GPS']::TEXT[], ARRAY['visual','pilot_skill']::TEXT[],
 ARRAY['grenade drop','anti-armour grenade','RPG warhead']::TEXT[], ARRAY['EO camera','thermal IR']::TEXT[],
 ARRAY['Ukraine AFU','Aerorozvidka unit']::TEXT[], ARRAY['Ukraine','Donbas']::TEXT[],
 'high',
 ARRAY[
   'OSINT: Aerorozvidka R-18 octocopter — 8-prop strike platform since 2019',
   'OSINT: 5kg payload anti-armour munitions — documented tank kills 2022-2024',
   'OSINT: Night ops thermal imaging primary — 45 min endurance 5km radius'
 ]::TEXT[], 'UNCLASSIFIED'),

('dovbush-t10',
 'Dovbush T10 FPV Carrier', 'Dovbush', 'Ukraine', 'fixed_wing_tactical',
 80, 2000, 40, 1, 30, NULL,
 'INS+GPS', false, false, true,
 ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[],
 ARRAY['FPV drone carrier x6','reconnaissance']::TEXT[], ARRAY['EO']::TEXT[],
 ARRAY['Ukraine AFU']::TEXT[], ARRAY['Ukraine']::TEXT[],
 'medium',
 ARRAY[
   'OSINT: Dovbush T10 — carrier drone deploying up to 6 FPV kamikaze drones',
   'OSINT: 40km range — ISR + artillery correction + FPV deployment combined',
   'OSINT: Mass production from Dec 2022 — 10+ units/day reported'
 ]::TEXT[], 'UNCLASSIFIED'),

-- ── RUSSIA ────────────────────────────────────────────────────────────────────

('geran-2',
 'Geran-2 (Geranium-2)', 'Assessed Russian domestic production', 'Russia', 'loitering_munition',
 185, 4000, 2000, 11, 200, 50,
 'INS+GPS+GLONASS', false, false, true,
 ARRAY['GPS','GLONASS']::TEXT[], ARRAY['INS']::TEXT[],
 ARRAY['HE warhead','fragmentation']::TEXT[], ARRAY['INS']::TEXT[],
 ARRAY['Russia']::TEXT[], ARRAY['Ukraine']::TEXT[],
 'high',
 ARRAY[
   'OSINT: Geran-2 — Russian Shahed-136 derivative with 50kg warhead (vs 36kg Shahed)',
   'OSINT: Mass saturation use Ukraine 2022-2025 — hundreds per attack wave',
   'OSINT: Russia claims domestic production; OSINT confirms design origin HESA Iran',
   'OSINT: Romania impact incident 2026 — confirmed cross-border stray'
 ]::TEXT[], 'UNCLASSIFIED'),

('orlan-10',
 'Orlan-10', 'Special Technology Centre (STC)', 'Russia', 'fixed_wing_tactical',
 150, 5000, 600, 18, 18, NULL,
 'INS+GPS+GLONASS', false, false, false,
 ARRAY['GPS','GLONASS']::TEXT[], ARRAY['INS']::TEXT[],
 ARRAY[]::TEXT[], ARRAY['EO camera','video downlink','EW relay payload']::TEXT[],
 ARRAY['Russia']::TEXT[], ARRAY['Ukraine','Syria']::TEXT[],
 'high',
 ARRAY[
   'OSINT: Orlan-10 ISR/EW relay — STC St. Petersburg — production >1000/yr as of Feb 2024',
   'OSINT: Western component analysis confirmed — Canon EOS camera, Japanese fuel pump',
   'OSINT: Primary targeting and artillery correction platform Ukraine conflict',
   'OSINT: Used as EW relay node extending jamming range for other systems'
 ]::TEXT[], 'UNCLASSIFIED'),

('kronshtadt-orion',
 'Kronshtadt Orion', 'Kronshtadt Group', 'Russia', 'MALE',
 220, 7500, 250, 24, 1000, 100,
 'INS+GPS+GLONASS', false, false, false,
 ARRAY['GLONASS','GPS']::TEXT[], ARRAY['INS','EO/IR']::TEXT[],
 ARRAY['precision guided munitions']::TEXT[], ARRAY['EO/IR','SAR']::TEXT[],
 ARRAY['Russia']::TEXT[], ARRAY['Ukraine']::TEXT[],
 'medium',
 ARRAY[
   'OSINT: Kronshtadt Orion MALE — 7500m ceiling — downed Ukraine 2023',
   'OSINT: Limited operational effectiveness reported — significant capability gap vs MQ-9',
   'OSINT: Used for strike missions over Ukraine 2022-2023'
 ]::TEXT[], 'UNCLASSIFIED'),

-- ── IRAN ──────────────────────────────────────────────────────────────────────

('mohajer-6',
 'Mohajer-6', 'Qods Aviation Industries (IRGC)', 'Iran', 'MALE',
 200, 5500, 250, 12, 175, 40,
 'INS+GPS', false, false, false,
 ARRAY['GPS']::TEXT[], ARRAY['INS','EO/IR']::TEXT[],
 ARRAY['Qaem-5 guided bomb','Qaem-9','Almas ATGM']::TEXT[], ARRAY['EO/IR targeting pod']::TEXT[],
 ARRAY['Iran IRGC','Russia (supplied 2022)','Venezuela']::TEXT[], ARRAY['Ukraine (Russian service)','Yemen']::TEXT[],
 'high',
 ARRAY[
   'OSINT: Qods Mohajer-6 ISTAR/strike MALE — 4 precision-guided munitions',
   'OSINT: Iran-Russia transfer 2022 confirmed — employed over Ukraine by Russia',
   'OSINT: Houthi use Yemen/Red Sea — supplied via Iran',
   'OSINT: Venezuela confirmed operator — geopolitical significance'
 ]::TEXT[], 'UNCLASSIFIED'),

('shahed-238',
 'Shahed-238 (Jet OWA)', 'HESA (Shahed Aviation Industries)', 'Iran', 'loitering_munition',
 520, 5000, 1500, 3, 350, 50,
 'INS+GPS', false, false, false,
 ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[],
 ARRAY['HE warhead']::TEXT[], ARRAY['INS']::TEXT[],
 ARRAY['Iran IRGC','Russia (assessed)']::TEXT[], ARRAY['Ukraine (assessed)']::TEXT[],
 'medium',
 ARRAY[
   'OSINT: Shahed-238 jet-powered OWA — TJ150 Czech turbojet engine confirmed from wreckage',
   'OSINT: 520 km/h vs 180 km/h Shahed-136 — dramatically harder to intercept',
   'OSINT: Wreckage recovered Ukraine — exact operational numbers unconfirmed'
 ]::TEXT[], 'UNCLASSIFIED'),

('qasef-2k',
 'Qasef-2K', 'HESA / Houthi (Ababil-T derivative)', 'Iran', 'loitering_munition',
 250, 5000, 100, 1.67, 35, 30,
 'INS+GPS', false, false, false,
 ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[],
 ARRAY['proximity fuze fragmentation warhead']::TEXT[], ARRAY['INS']::TEXT[],
 ARRAY['Houthi (Yemen)','Iran IRGC']::TEXT[], ARRAY['Yemen','Saudi Arabia','UAE','Red Sea']::TEXT[],
 'high',
 ARRAY[
   'OSINT: Qasef-2K — Ababil-T derivative 1.2m length 2.2m wingspan 30kg warhead',
   'OSINT: Proximity fuze detonates 10-20m above target — 30-80m shrapnel radius',
   'OSINT: Extensively used Houthi vs Saudi/UAE 2019-2024 — Red Sea shipping 2023-2024'
 ]::TEXT[], 'UNCLASSIFIED'),

-- ── HOUTHI / YEMEN ────────────────────────────────────────────────────────────

('samad-3',
 'Samad-3', 'Houthi/Iran', 'Yemen', 'loitering_munition',
 200, 4000, 1800, 9, 175, 25,
 'INS+GPS', false, false, false,
 ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[],
 ARRAY['HE warhead']::TEXT[], ARRAY['INS']::TEXT[],
 ARRAY['Houthi (Yemen)']::TEXT[], ARRAY['Yemen','Saudi Arabia','UAE','Red Sea']::TEXT[],
 'medium',
 ARRAY[
   'OSINT: Samad-3 OWA — 4.5m wingspan conformal fuel tank dorsal mount',
   'OSINT: 1500-1800 km range — Red Sea shipping strikes 2023-2024 confirmed',
   'OSINT: Design origin assessed Iran — supplied via IRGC logistics chain'
 ]::TEXT[], 'UNCLASSIFIED'),

-- ── CHINA ─────────────────────────────────────────────────────────────────────

('blowfish-a3',
 'Ziyan Blowfish A3', 'Zhuhai Ziyan UAS', 'China', 'tactical',
 100, 4000, 50, 1, 35, 10,
 'AI+GPS+BeiDou', false, true, true,
 ARRAY['GPS','BeiDou']::TEXT[], ARRAY['AI autonomous','obstacle avoidance']::TEXT[],
 ARRAY['precision strike munition','HEAT warhead']::TEXT[], ARRAY['EO','AI target tracking']::TEXT[],
 ARRAY['China PLA (assessed)','Middle East export (assessed)']::TEXT[], ARRAY[]::TEXT[],
 'medium',
 ARRAY[
   'OSINT: Ziyan Blowfish A3 autonomous VTOL helicopter UAS — AI swarm up to 10 units',
   'OSINT: Autonomous target detection/ID/tracking — operates independently if GCS link lost',
   'OSINT: US SecDef concern re Middle East export 2019 — first AI-swarm UAS to export market',
   'OSINT: BeiDou primary constellation — GPS secondary'
 ]::TEXT[], 'UNCLASSIFIED'),

-- ── NORTH KOREA ───────────────────────────────────────────────────────────────

('saebyeol-4',
 'Saebyeol-4 (RQ-4 analogue)', 'Korean People''s Army Air Force', 'North Korea', 'fixed_wing_tactical',
 600, 18000, 16000, 32, 8000, NULL,
 'INS+GPS', false, false, false,
 ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[],
 ARRAY[]::TEXT[], ARRAY['EO/IR','SAR (assessed)']::TEXT[],
 ARRAY['North Korea KPAAF']::TEXT[], ARRAY[]::TEXT[],
 'estimated',
 ARRAY[
   'OSINT: Saebyeol-4 — DPRK RQ-4 Global Hawk analogue prototype — ~40m wingspan',
   'OSINT: First flight assessed Sep 2025 — Panghyon airfield — not operational',
   'OSINT: Chinese and domestic electronics — satellite-linked control antenna confirmed',
   'OSINT: Saebyeol-9 is the companion strike variant (even less OSINT data)'
 ]::TEXT[], 'UNCLASSIFIED'),

-- ── TURKEY ────────────────────────────────────────────────────────────────────

('akinci',
 'Bayraktar Akinci UCAV', 'Baykar', 'Turkey', 'MALE',
 360, 12192, 1500, 24, 6000, 280,
 'INS+GPS+GLONASS', false, false, false,
 ARRAY['GPS','GLONASS']::TEXT[], ARRAY['INS','EO/IR']::TEXT[],
 ARRAY['SOM cruise missile','MAM-T','TEBER guided bomb','CIRIT rocket']::TEXT[],
 ARRAY['ASELFLIR-500','SAR','ELINT','SIGINT']::TEXT[],
 ARRAY['Turkey','Ukraine','Azerbaijan','Pakistan']::TEXT[], ARRAY['Ukraine','Azerbaijan-Armenia 2020','Libya']::TEXT[],
 'high',
 ARRAY[
   'OSINT: Bayraktar Akinci UCAV — 20m wingspan 1350kg payload 40000ft ceiling',
   'OSINT: First documented UAS air-to-air kill 2026 — EREN loitering munition vs Shahed-type',
   'OSINT: Turkey export to Azerbaijan, Pakistan, Ukraine confirmed',
   'OSINT: ASELFLIR-500 EO/IR + SAR + ELINT/SIGINT — full ISR stack'
 ]::TEXT[], 'UNCLASSIFIED'),

('aksungur',
 'TAI Aksungur', 'Turkish Aerospace Industries (TAI)', 'Turkey', 'MALE',
 200, 12000, 2000, 50, 3300, 200,
 'INS+GPS', false, false, false,
 ARRAY['GPS']::TEXT[], ARRAY['INS','EO/IR']::TEXT[],
 ARRAY['MAM-C','MAM-L','CIRIT rocket','precision munitions']::TEXT[], ARRAY['EO/IR','maritime radar']::TEXT[],
 ARRAY['Turkey']::TEXT[], ARRAY['Turkey domestic operations']::TEXT[],
 'medium',
 ARRAY[
   'OSINT: TAI Aksungur large MALE — 50hr endurance 750kg payload 3300kg MTOW',
   'OSINT: Naval/maritime surveillance primary role + strike capability',
   'OSINT: Competing with Akinci for export contracts — Turkey domestic use'
 ]::TEXT[], 'UNCLASSIFIED'),

('stm-alpagu',
 'STM Alpagu', 'STM Defence Technologies', 'Turkey', 'loitering_munition',
 72, 200, 8, 0.25, 2, 0.3,
 'AI+EO+GPS', false, true, false,
 ARRAY['GPS']::TEXT[], ARRAY['AI visual tracking','EO seeker']::TEXT[],
 ARRAY['pre-fragmented HE warhead (anti-personnel)']::TEXT[], ARRAY['EO','deep learning AI tracker']::TEXT[],
 ARRAY['Turkey']::TEXT[], ARRAY['Turkey domestic operations']::TEXT[],
 'high',
 ARRAY[
   'OSINT: STM Alpagu fixed-wing loitering munition — 1950g total 883mm wingspan',
   'OSINT: AI deep-learning terminal guidance — no operator input in terminal phase',
   'OSINT: 270-300g pre-fragmented warhead — anti-personnel/soft target primary',
   'OSINT: Delivered Turkish security forces 2023 — exported globally 2023-2024'
 ]::TEXT[], 'UNCLASSIFIED'),

('stm-alpagu-b',
 'STM Alpagu-B', 'STM Defence Technologies', 'Turkey', 'loitering_munition',
 100, 500, 40, 0.5, 10, 1,
 'AI+EO+GPS', false, true, false,
 ARRAY['GPS']::TEXT[], ARRAY['AI visual tracking']::TEXT[],
 ARRAY['HE warhead']::TEXT[], ARRAY['EO','AI target tracking']::TEXT[],
 ARRAY['Turkey']::TEXT[], ARRAY[]::TEXT[],
 'medium',
 ARRAY[
   'OSINT: STM Alpagu-B — larger Alpagu variant 40km LOS range',
   'OSINT: World debut SAHA 2026 defence exhibition — not yet in service',
   'OSINT: AI-powered target tracking — operator-optional terminal phase'
 ]::TEXT[], 'UNCLASSIFIED'),

-- ── ISRAEL ────────────────────────────────────────────────────────────────────

('harpy-ng',
 'IAI Harpy NG', 'Israel Aerospace Industries (IAI)', 'Israel', 'loitering_munition',
 200, 5000, 500, 9, 160, 15,
 'passive_RF+INS+GPS', false, false, false,
 ARRAY['GPS']::TEXT[], ARRAY['passive RF seeker','INS']::TEXT[],
 ARRAY['HE anti-radiation warhead']::TEXT[], ARRAY['passive RF seeker 0.8-18GHz']::TEXT[],
 ARRAY['Israel','India','South Korea (assessed)']::TEXT[], ARRAY['Israel']::TEXT[],
 'high',
 ARRAY[
   'OSINT: IAI Harpy NG anti-radiation loitering munition — 9hr endurance 160kg',
   'OSINT: 0.8-18 GHz passive RF seeker — autonomously hunts active radar emitters',
   'OSINT: 15kg warhead — radar system kill on impact',
   'OSINT: Exported India and South Korea — combat use attributed regional conflicts'
 ]::TEXT[], 'UNCLASSIFIED'),

('spike-firefly',
 'Rafael Spike FireFly', 'Rafael Advanced Defense Systems', 'Israel', 'loitering_munition',
 70, 500, 1, 0.33, 3, 0.5,
 'EO+man-in-loop', true, false, false,
 ARRAY[]::TEXT[], ARRAY['visual tracking','EO seeker']::TEXT[],
 ARRAY['HE warhead','shaped charge']::TEXT[], ARRAY['EO/IR seeker']::TEXT[],
 ARRAY['Israel IDF']::TEXT[], ARRAY['Gaza','Lebanon']::TEXT[],
 'high',
 ARRAY[
   'OSINT: Rafael Spike FireFly 3kg mini loitering munition — 15kg full system',
   'OSINT: Man-in-the-loop EO/IR — wave-off and re-engage capable — no GNSS required',
   'OSINT: IDF confirmed use Gaza and Lebanon operations 2023-2025',
   'OSINT: 60-70 km/h cruise 0.5km urban / 1km open range — confined urban ops'
 ]::TEXT[], 'UNCLASSIFIED'),

('green-dragon',
 'IAI Green Dragon', 'Israel Aerospace Industries (IAI)', 'Israel', 'loitering_munition',
 180, 3000, 150, 1, 15, 3,
 'EO+INS+GPS', false, false, false,
 ARRAY['GPS']::TEXT[], ARRAY['INS','EO seeker']::TEXT[],
 ARRAY['HE warhead']::TEXT[], ARRAY['MicroPop EO/IR gimbal']::TEXT[],
 ARRAY['Israel','export (assessed)']::TEXT[], ARRAY['Israel']::TEXT[],
 'medium',
 ARRAY[
   'OSINT: IAI Green Dragon loitering munition — 15kg EO/IR MicroPop gimbal payload',
   'OSINT: 3kg warhead — ISR + strike dual role',
   'OSINT: Naval ship-launched variant confirmed — maritime strike capability'
 ]::TEXT[], 'UNCLASSIFIED'),

-- ── INDIA ─────────────────────────────────────────────────────────────────────

('nagastra-1',
 'Nagastra-1', 'Economic Explosives Ltd / Z-Motion Autonomous Systems', 'India', 'loitering_munition',
 100, 4000, 40, 0.5, 9, 1,
 'GPS+NavIC', false, false, false,
 ARRAY['GPS','NavIC']::TEXT[], ARRAY['INS']::TEXT[],
 ARRAY['pre-fragmented HE warhead (anti-personnel)']::TEXT[], ARRAY['EO']::TEXT[],
 ARRAY['India Army']::TEXT[], ARRAY[]::TEXT[],
 'high',
 ARRAY[
   'OSINT: Nagastra-1 — EEL/Z-Motion dual GNSS GPS+NavIC 2m CEP autonomous mode',
   'OSINT: 480 units delivered India Army June 2024 — 450 additional units ordered',
   'OSINT: NavIC makes GPS-only jamming insufficient — significant C-UAS implication',
   'OSINT: 15km man-in-loop / 30-40km autonomous modes — 1kg pre-fragmented warhead'
 ]::TEXT[], 'UNCLASSIFIED'),

-- ── UNITED STATES ─────────────────────────────────────────────────────────────

('phoenix-ghost',
 'Phoenix Ghost', 'AEVEX Aerospace', 'United States', 'loitering_munition',
 150, 5000, 40, 6, 30, 3,
 'visual_nav+INS', false, false, false,
 ARRAY['GPS']::TEXT[], ARRAY['visual navigation','landmark tracking','INS']::TEXT[],
 ARRAY['kinetic strike warhead']::TEXT[], ARRAY['EO','visual nav sensors']::TEXT[],
 ARRAY['United States','Ukraine (supplied 2022+)']::TEXT[], ARRAY['Ukraine']::TEXT[],
 'high',
 ARRAY[
   'OSINT: AEVEX Phoenix Ghost Group 3 loitering munition — 40km range 6hr endurance',
   'OSINT: 5000+ delivered Ukraine by Dec 2024 — active use 2022-2025',
   'OSINT: Visual-based navigation primary — reduced GNSS reliance by design',
   'OSINT: EW-resistant vs Switchblade — visual landmark following vs GNSS-dependent nav'
 ]::TEXT[], 'UNCLASSIFIED')

ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. GNSS PLATFORM DEPENDENCIES
-- ─────────────────────────────────────────────────────────────────────────────

-- UJ-26 Bober — GPS secondary (INS primary for transit, GPS for target nav)
INSERT INTO gnss_platform_dependencies (platform_id, constellation, dependency_level, jamming_effect, notes)
SELECT 'uj-26-bober', 'gps', 'secondary', 'degraded', 'INS primary transit nav; GPS used for waypoint guidance — jamming degrades accuracy not mission-kills'
WHERE NOT EXISTS (SELECT 1 FROM gnss_platform_dependencies WHERE platform_id = 'uj-26-bober' AND constellation = 'gps');

-- Vyriy Molfar — GNSS immune (visual/RF only, sub-1GHz)
INSERT INTO gnss_platform_dependencies (platform_id, constellation, dependency_level, jamming_effect, notes)
SELECT 'vyriy-molfar', 'gps', 'immune', 'none', 'Visual/RF FPV guidance sub-1GHz — GNSS not used'
WHERE NOT EXISTS (SELECT 1 FROM gnss_platform_dependencies WHERE platform_id = 'vyriy-molfar' AND constellation = 'gps');

-- Vyriy MAX 15 — GNSS immune
INSERT INTO gnss_platform_dependencies (platform_id, constellation, dependency_level, jamming_effect, notes)
SELECT 'vyriy-max15', 'gps', 'immune', 'none', 'Visual/RF FPV heavy frame — no GNSS used'
WHERE NOT EXISTS (SELECT 1 FROM gnss_platform_dependencies WHERE platform_id = 'vyriy-max15' AND constellation = 'gps');

-- Aerorozvidka R-18 — GPS minimal (RTH function only)
INSERT INTO gnss_platform_dependencies (platform_id, constellation, dependency_level, jamming_effect, notes)
SELECT 'aerorozvidka-r18', 'gps', 'secondary', 'minimal', 'FPV primary control; GPS used for RTH failsafe only — denial forces manual pilot control'
WHERE NOT EXISTS (SELECT 1 FROM gnss_platform_dependencies WHERE platform_id = 'aerorozvidka-r18' AND constellation = 'gps');

-- Dovbush T10 — GPS secondary
INSERT INTO gnss_platform_dependencies (platform_id, constellation, dependency_level, jamming_effect, notes)
SELECT 'dovbush-t10', 'gps', 'secondary', 'degraded', 'GPS-aided waypoint navigation for carrier transit; FPV payload guidance GNSS-immune'
WHERE NOT EXISTS (SELECT 1 FROM gnss_platform_dependencies WHERE platform_id = 'dovbush-t10' AND constellation = 'gps');

-- Geran-2 — GPS+GLONASS primary
INSERT INTO gnss_platform_dependencies (platform_id, constellation, dependency_level, jamming_effect, notes)
SELECT 'geran-2', 'gps', 'primary', 'mission_kill', 'GNSS primary navigation — GPS denial mission-kills unless INS maintains acceptable drift'
WHERE NOT EXISTS (SELECT 1 FROM gnss_platform_dependencies WHERE platform_id = 'geran-2' AND constellation = 'gps');

INSERT INTO gnss_platform_dependencies (platform_id, constellation, dependency_level, jamming_effect, notes)
SELECT 'geran-2', 'glonass', 'primary', 'mission_kill', 'GLONASS co-primary — simultaneous GPS+GLONASS jamming required for full denial'
WHERE NOT EXISTS (SELECT 1 FROM gnss_platform_dependencies WHERE platform_id = 'geran-2' AND constellation = 'glonass');

-- Orlan-10 — GPS+GLONASS primary
INSERT INTO gnss_platform_dependencies (platform_id, constellation, dependency_level, jamming_effect, notes)
SELECT 'orlan-10', 'gps', 'primary', 'mission_kill', 'GNSS primary nav — ISR mission-killed by GPS denial; cannot maintain designated patrol pattern'
WHERE NOT EXISTS (SELECT 1 FROM gnss_platform_dependencies WHERE platform_id = 'orlan-10' AND constellation = 'gps');

INSERT INTO gnss_platform_dependencies (platform_id, constellation, dependency_level, jamming_effect, notes)
SELECT 'orlan-10', 'glonass', 'primary', 'mission_kill', 'GLONASS co-primary constellation'
WHERE NOT EXISTS (SELECT 1 FROM gnss_platform_dependencies WHERE platform_id = 'orlan-10' AND constellation = 'glonass');

-- Kronshtadt Orion — GPS+GLONASS primary
INSERT INTO gnss_platform_dependencies (platform_id, constellation, dependency_level, jamming_effect, notes)
SELECT 'kronshtadt-orion', 'gps', 'primary', 'mission_kill', 'GNSS primary — mission-kill on GPS denial; no confirmed GNSS-backup capability'
WHERE NOT EXISTS (SELECT 1 FROM gnss_platform_dependencies WHERE platform_id = 'kronshtadt-orion' AND constellation = 'gps');

INSERT INTO gnss_platform_dependencies (platform_id, constellation, dependency_level, jamming_effect, notes)
SELECT 'kronshtadt-orion', 'glonass', 'primary', 'mission_kill', 'GLONASS co-primary'
WHERE NOT EXISTS (SELECT 1 FROM gnss_platform_dependencies WHERE platform_id = 'kronshtadt-orion' AND constellation = 'glonass');

-- Mohajer-6 — GPS primary
INSERT INTO gnss_platform_dependencies (platform_id, constellation, dependency_level, jamming_effect, notes)
SELECT 'mohajer-6', 'gps', 'primary', 'mission_kill', 'GPS primary nav — Iran platform lacks GLONASS/Galileo; GPS denial = mission kill'
WHERE NOT EXISTS (SELECT 1 FROM gnss_platform_dependencies WHERE platform_id = 'mohajer-6' AND constellation = 'gps');

-- Shahed-238 — GPS primary (jet-powered — higher speed reduces jamming window)
INSERT INTO gnss_platform_dependencies (platform_id, constellation, dependency_level, jamming_effect, notes)
SELECT 'shahed-238', 'gps', 'primary', 'mission_kill', 'GPS primary — 520 km/h speed reduces jamming engagement window vs slower Shahed-136'
WHERE NOT EXISTS (SELECT 1 FROM gnss_platform_dependencies WHERE platform_id = 'shahed-238' AND constellation = 'gps');

-- Qasef-2K — GPS primary
INSERT INTO gnss_platform_dependencies (platform_id, constellation, dependency_level, jamming_effect, notes)
SELECT 'qasef-2k', 'gps', 'primary', 'mission_kill', 'GPS primary autopilot guidance — denial mission-kills navigation accuracy'
WHERE NOT EXISTS (SELECT 1 FROM gnss_platform_dependencies WHERE platform_id = 'qasef-2k' AND constellation = 'gps');

-- Samad-3 — GPS primary
INSERT INTO gnss_platform_dependencies (platform_id, constellation, dependency_level, jamming_effect, notes)
SELECT 'samad-3', 'gps', 'primary', 'mission_kill', 'GPS primary — 1800km range demands accurate GNSS nav; denial degrades to non-target accuracy'
WHERE NOT EXISTS (SELECT 1 FROM gnss_platform_dependencies WHERE platform_id = 'samad-3' AND constellation = 'gps');

-- Blowfish A3 — GPS+BeiDou secondary (AI autonomy reduces GNSS reliance)
INSERT INTO gnss_platform_dependencies (platform_id, constellation, dependency_level, jamming_effect, notes)
SELECT 'blowfish-a3', 'gps', 'secondary', 'degraded', 'GPS secondary — AI obstacle avoidance and target tracking operates with degraded/no GNSS'
WHERE NOT EXISTS (SELECT 1 FROM gnss_platform_dependencies WHERE platform_id = 'blowfish-a3' AND constellation = 'gps');

INSERT INTO gnss_platform_dependencies (platform_id, constellation, dependency_level, jamming_effect, notes)
SELECT 'blowfish-a3', 'beidou', 'secondary', 'degraded', 'BeiDou co-primary — Chinese platform uses BDS preferentially; AI compensates on denial'
WHERE NOT EXISTS (SELECT 1 FROM gnss_platform_dependencies WHERE platform_id = 'blowfish-a3' AND constellation = 'beidou');

-- Saebyeol-4 — GPS primary (prototype)
INSERT INTO gnss_platform_dependencies (platform_id, constellation, dependency_level, jamming_effect, notes)
SELECT 'saebyeol-4', 'gps', 'primary', 'mission_kill', 'GPS primary — DPRK platform assessed no indigenous GNSS; Chinese GPS receiver components confirmed'
WHERE NOT EXISTS (SELECT 1 FROM gnss_platform_dependencies WHERE platform_id = 'saebyeol-4' AND constellation = 'gps');

-- Akinci — GPS+GLONASS primary
INSERT INTO gnss_platform_dependencies (platform_id, constellation, dependency_level, jamming_effect, notes)
SELECT 'akinci', 'gps', 'primary', 'mission_kill', 'GPS primary nav — MALE platform requires continuous GNSS for 24hr endurance operations'
WHERE NOT EXISTS (SELECT 1 FROM gnss_platform_dependencies WHERE platform_id = 'akinci' AND constellation = 'gps');

INSERT INTO gnss_platform_dependencies (platform_id, constellation, dependency_level, jamming_effect, notes)
SELECT 'akinci', 'glonass', 'secondary', 'degraded', 'GLONASS secondary — dual-constellation receiver confirmed'
WHERE NOT EXISTS (SELECT 1 FROM gnss_platform_dependencies WHERE platform_id = 'akinci' AND constellation = 'glonass');

-- Aksungur — GPS primary
INSERT INTO gnss_platform_dependencies (platform_id, constellation, dependency_level, jamming_effect, notes)
SELECT 'aksungur', 'gps', 'primary', 'mission_kill', 'GPS primary — 50hr endurance maritime MALE requires GNSS throughout'
WHERE NOT EXISTS (SELECT 1 FROM gnss_platform_dependencies WHERE platform_id = 'aksungur' AND constellation = 'gps');

-- STM Alpagu — GPS minimal (AI visual terminal — GNSS for waypoint transit only)
INSERT INTO gnss_platform_dependencies (platform_id, constellation, dependency_level, jamming_effect, notes)
SELECT 'stm-alpagu', 'gps', 'secondary', 'minimal', 'GPS for transit waypoint only — AI EO terminal guidance operates without GNSS; jamming has minimal effect on terminal phase'
WHERE NOT EXISTS (SELECT 1 FROM gnss_platform_dependencies WHERE platform_id = 'stm-alpagu' AND constellation = 'gps');

-- STM Alpagu-B — GPS minimal
INSERT INTO gnss_platform_dependencies (platform_id, constellation, dependency_level, jamming_effect, notes)
SELECT 'stm-alpagu-b', 'gps', 'secondary', 'minimal', 'GPS transit waypoint only — AI visual terminal unchanged by GNSS denial'
WHERE NOT EXISTS (SELECT 1 FROM gnss_platform_dependencies WHERE platform_id = 'stm-alpagu-b' AND constellation = 'gps');

-- Harpy NG — GPS minimal (passive RF seeker primary in terminal)
INSERT INTO gnss_platform_dependencies (platform_id, constellation, dependency_level, jamming_effect, notes)
SELECT 'harpy-ng', 'gps', 'secondary', 'minimal', 'GPS for loiter transit — passive RF anti-radiation seeker autonomous in terminal; GNSS denial has minimal terminal effect'
WHERE NOT EXISTS (SELECT 1 FROM gnss_platform_dependencies WHERE platform_id = 'harpy-ng' AND constellation = 'gps');

-- Spike FireFly — GNSS immune (visual only)
INSERT INTO gnss_platform_dependencies (platform_id, constellation, dependency_level, jamming_effect, notes)
SELECT 'spike-firefly', 'gps', 'immune', 'none', 'EO/IR man-in-loop only — no GNSS used at any phase; fully jammer-immune for navigation'
WHERE NOT EXISTS (SELECT 1 FROM gnss_platform_dependencies WHERE platform_id = 'spike-firefly' AND constellation = 'gps');

-- Green Dragon — GPS secondary
INSERT INTO gnss_platform_dependencies (platform_id, constellation, dependency_level, jamming_effect, notes)
SELECT 'green-dragon', 'gps', 'secondary', 'degraded', 'GPS mid-course nav; EO/IR man-in-loop terminal — jamming degrades but does not mission-kill'
WHERE NOT EXISTS (SELECT 1 FROM gnss_platform_dependencies WHERE platform_id = 'green-dragon' AND constellation = 'gps');

-- Nagastra-1 — GPS+NavIC dual primary
INSERT INTO gnss_platform_dependencies (platform_id, constellation, dependency_level, jamming_effect, notes)
SELECT 'nagastra-1', 'gps', 'primary', 'degraded', 'GPS co-primary with NavIC — GPS-only jamming forces fallback to NavIC; full denial requires broadband L-band + S-band simultaneous jam'
WHERE NOT EXISTS (SELECT 1 FROM gnss_platform_dependencies WHERE platform_id = 'nagastra-1' AND constellation = 'gps');

INSERT INTO gnss_platform_dependencies (platform_id, constellation, dependency_level, jamming_effect, notes)
SELECT 'nagastra-1', 'navic', 'primary', 'mission_kill', 'NavIC co-primary on L5+S-band — requires simultaneous GPS+NavIC broadband jamming for full denial'
WHERE NOT EXISTS (SELECT 1 FROM gnss_platform_dependencies WHERE platform_id = 'nagastra-1' AND constellation = 'navic');

-- Phoenix Ghost — GPS minimal (visual nav primary)
INSERT INTO gnss_platform_dependencies (platform_id, constellation, dependency_level, jamming_effect, notes)
SELECT 'phoenix-ghost', 'gps', 'secondary', 'minimal', 'Visual landmark navigation primary — GPS backup only; designed EW-resistant; GNSS denial has minimal operational effect'
WHERE NOT EXISTS (SELECT 1 FROM gnss_platform_dependencies WHERE platform_id = 'phoenix-ghost' AND constellation = 'gps');

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. DEFEAT EFFECTIVENESS
-- Key pairings only — platforms with confirmed OSINT C-UAS engagement data
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO defeat_effectiveness (
  platform_id, defeat_system_id, rf_jamming_pct, kinetic_pct, dew_pct,
  data_confidence, weather_limited, is_immune, immune_reason, special_notes
) VALUES

-- UJ-26 Bober
('uj-26-bober', 'dronegun-tactical', 20, NULL, NULL, 'estimated', false, false, NULL,
 'RF jamming limited effect — INS keeps flight on track; GPS denial degrades accuracy but long range ingress'),
('uj-26-bober', 'drone-dome', 30, 55, NULL, 'estimated', false, false, NULL,
 'Drone Dome kinetic layer viable; RF jamming partial — INS backup limits denial window'),
('uj-26-bober', 'iron-beam', NULL, NULL, 80, 'estimated', true, false, NULL,
 'DEW effective — slow loitering munition; weather/cloud degradation significant'),
('uj-26-bober', 'iris-t-slm-cuas', NULL, 75, NULL, 'estimated', false, false, NULL,
 'IRIS-T kinetic intercept viable — OWA RCS detectable; confirmed intercept of similar profiles Ukraine'),
('uj-26-bober', 'zu-23-2', NULL, 30, NULL, 'estimated', false, false, NULL,
 'AAA suppression viable at close range — 200 km/h slow enough for ZU-23 tracking'),

-- Vyriy Molfar (sub-1GHz FPV — jammer-resistant)
('vyriy-molfar', 'dronegun-tactical', 15, NULL, NULL, 'estimated', false, false, NULL,
 'Sub-1GHz operation below standard jammer coverage — DroneGun 2.4/5.8GHz bands ineffective'),
('vyriy-molfar', 'military-ew-generic', 25, NULL, NULL, 'estimated', false, false, NULL,
 'Military EW with broadband sweep may cover sub-1GHz bands — not guaranteed'),
('vyriy-molfar', 'drone-dome', 20, 70, NULL, 'estimated', false, false, NULL,
 'Drone Dome kinetic layer primary — RF defeat unreliable; small RCS makes kinetic challenging'),
('vyriy-molfar', 'zu-23-2', NULL, 40, NULL, 'estimated', false, false, NULL,
 'Unguided AAA suppression viable at close range — small fast target degrades hit probability'),

-- Vyriy MAX 15
('vyriy-max15', 'dronegun-tactical', 15, NULL, NULL, 'estimated', false, false, NULL,
 'Sub-1GHz — same jamming resistance as Molfar; larger frame increases kinetic intercept probability'),
('vyriy-max15', 'drone-dome', 20, 65, NULL, 'estimated', false, false, NULL,
 'Larger RCS than standard FPV — kinetic layer more viable; RF still limited'),
('vyriy-max15', 'zu-23-2', NULL, 45, NULL, 'estimated', false, false, NULL,
 'Larger 15-inch frame — higher kinetic Pk than sub-250g FPV'),

-- Aerorozvidka R-18
('aerorozvidka-r18', 'dronegun-tactical', 60, NULL, NULL, 'estimated', false, false, NULL,
 'FPV RF 2.4GHz video/control within DroneGun coverage; GPS RTH disrupted'),
('aerorozvidka-r18', 'drone-dome', 65, 55, NULL, 'high', false, false, NULL,
 'Drone Dome RF and kinetic both viable vs octocopter profile — confirmed system class'),
('aerorozvidka-r18', 'military-ew-generic', 55, NULL, NULL, 'estimated', false, false, NULL,
 'Standard FPV frequency — military EW effective vs RF C2 link'),
('aerorozvidka-r18', 'zu-23-2', NULL, 45, NULL, 'estimated', false, false, NULL,
 'Low-altitude rotary wing — ZU-23 viable at close engagement range'),

-- Geran-2 (OWA saturation — primary defeat challenge is volume)
('geran-2', 'dronegun-tactical', 35, NULL, NULL, 'estimated', false, false, NULL,
 'GPS/GLONASS jamming degrades accuracy; INS backup limits full denial — range means jamming window brief'),
('geran-2', 'drone-dome', 40, 60, NULL, 'high', false, false, NULL,
 'Drone Dome effective vs Geran-2 profile — confirmed intercepts Ukraine; saturation limits Pk per battery'),
('geran-2', 'iron-beam', NULL, NULL, 75, 'estimated', true, false, NULL,
 'DEW effective vs slow OWA — weather-limited; Rafael Iron Beam tested vs this class'),
('geran-2', 'iris-t-slm-cuas', NULL, 80, NULL, 'high', false, false, NULL,
 'IRIS-T confirmed effective vs Geran-2/Shahed class — Germany Ukraine deployment data'),
('geran-2', 'zu-23-2', NULL, 40, NULL, 'high', false, false, NULL,
 'ZU-23-2 Ukraine documented intercepts — acoustic detection + optical tracking viable'),
('geran-2', 'military-ew-generic', 45, NULL, NULL, 'estimated', false, false, NULL,
 'GPS+GLONASS dual jamming required for nav denial — single-constellation jamming insufficient'),

-- Orlan-10 (ISR — defeat prevents reconnaissance not strike)
('orlan-10', 'dronegun-tactical', 65, NULL, NULL, 'estimated', false, false, NULL,
 'GPS/GLONASS jamming disrupts nav; RF datalink disruption forces RTL or loiter failure'),
('orlan-10', 'drone-dome', 70, 55, NULL, 'estimated', false, false, NULL,
 'Drone Dome RF denial effective at close range; kinetic viable vs medium-RCS ISR platform'),
('orlan-10', 'military-ew-generic', 70, NULL, NULL, 'high', false, false, NULL,
 'Military EW primary defeat method — disrupts datalink + nav; ISR mission-kill without physical destruction'),
('orlan-10', 'stinger-shorad', NULL, 55, NULL, 'estimated', false, false, NULL,
 'MANPADS viable — Orlan-10 flies within Stinger engagement envelope at ISR altitude'),

-- Akinci (MALE UCAV — harder intercept)
('akinci', 'iron-beam', NULL, NULL, 60, 'estimated', true, false, NULL,
 'DEW effective at range vs MALE profile — weather significantly limits; 40000ft ceiling above most DEW'),
('akinci', 'iris-t-slm-cuas', NULL, 70, NULL, 'estimated', false, false, NULL,
 'IRIS-T SLM viable vs MALE at medium altitude — engagement envelope covers Akinci cruise altitude'),
('akinci', 'military-ew-generic', 30, NULL, NULL, 'estimated', false, false, NULL,
 'EW GPS+GLONASS denial degrades nav; advanced Turkish EO/IR backup reduces effect'),

-- STM Alpagu (AI terminal — jamming less effective in terminal phase)
('stm-alpagu', 'dronegun-tactical', 20, NULL, NULL, 'estimated', false, false, NULL,
 'GPS transit jamming has minimal effect — AI EO terminal guidance immune to RF; RF C2 link standard bands'),
('stm-alpagu', 'drone-dome', 25, 50, NULL, 'estimated', false, false, NULL,
 'Kinetic primary defeat layer — small RCS challenges acquisition; RF limited vs AI terminal'),
('stm-alpagu', 'iron-beam', NULL, NULL, 85, 'estimated', false, false, NULL,
 'DEW highly effective vs small LM — 1.95kg total; very short dwell time needed'),
('stm-alpagu', 'zu-23-2', NULL, 30, NULL, 'estimated', false, false, NULL,
 'Very small RCS and low speed — ZU-23 viable but hit probability reduced vs larger targets'),

-- Harpy NG (ARM — hunting our radars)
('harpy-ng', 'iron-beam', NULL, NULL, 70, 'estimated', true, false, NULL,
 'DEW effective vs loitering ARM — must engage before RF seeker acquires radar; weather-limited'),
('harpy-ng', 'drone-dome', 15, 55, NULL, 'estimated', false, false, NULL,
 'Drone Dome RF jammer could attract Harpy seeker if transmitting — kinetic layer primary defeat'),
('harpy-ng', 'iris-t-slm-cuas', NULL, 75, NULL, 'estimated', false, false, NULL,
 'IRIS-T kinetic intercept viable — engage from stand-off; critical to not activate radar'),

-- Spike FireFly (GNSS-immune, short range — defeat is kinetic only)
('spike-firefly', 'dronegun-tactical', 0, NULL, NULL, 'high', false, true, 'No RF nav link — EO/IR man-in-loop only; RF jamming completely ineffective',
 'IMMUNE to RF jamming — visual guidance; kinetic intercept only viable defeat'),
('spike-firefly', 'iron-beam', NULL, NULL, 90, 'estimated', false, false, NULL,
 'DEW highly effective — 3kg target; short range means DEW engagement window available'),
('spike-firefly', 'zu-23-2', NULL, 35, NULL, 'estimated', false, false, NULL,
 'Very small fast target in close urban range — ZU-23 engagement difficult'),

-- Nagastra-1 (dual GNSS — harder to jam)
('nagastra-1', 'military-ew-generic', 25, NULL, NULL, 'estimated', false, false, NULL,
 'GPS-only jamming insufficient — NavIC L5+S-band requires broadband simultaneous jam; harder to defeat electronically'),
('nagastra-1', 'dronegun-tactical', 15, NULL, NULL, 'estimated', false, false, NULL,
 'RF defeat limited — dual GNSS reduces denial effectiveness; standard DroneGun GPS-only bands insufficient'),
('nagastra-1', 'iron-beam', NULL, NULL, 80, 'estimated', false, false, NULL,
 'DEW effective vs sub-10kg loitering munition — NavIC dual-band irrelevant to laser defeat'),
('nagastra-1', 'zu-23-2', NULL, 45, NULL, 'estimated', false, false, NULL,
 'Kinetic viable vs small LM at close range — detection and tracking primary challenge'),

-- Phoenix Ghost (visual nav — jamming limited)
('phoenix-ghost', 'dronegun-tactical', 20, NULL, NULL, 'estimated', false, false, NULL,
 'GPS denial minimal effect — visual nav primary; RF C2 link may be in standard bands'),
('phoenix-ghost', 'drone-dome', 25, 55, NULL, 'estimated', false, false, NULL,
 'Kinetic layer primary defeat — RF jamming partially effective if C2 link jammed; visual nav resilient'),
('phoenix-ghost', 'iron-beam', NULL, NULL, 80, 'estimated', false, false, NULL,
 'DEW effective vs Group 3 loitering munition — small mass low speed')

ON CONFLICT (platform_id, defeat_system_id) DO NOTHING;
