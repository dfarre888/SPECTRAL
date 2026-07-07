-- SPECTRAL — Iranian Ballistic & Cruise Missile Systems
-- CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
--
-- 18 platforms: 13 ballistic (SRBM/MRBM/hypersonic) + 5 cruise
-- 5 new defeat systems: THAAD, PAC-2 GEM-T, Arrow-3, SM-3 Block IA, MIM-23 Hawk
-- ~90 defeat_effectiveness rows
-- 18 GNSS platform dependencies
-- 36 accredited Pk rows (offline fallback)
-- 8 ERP/waveform profiles (cruise missile seekers)
-- 8 conflict incidents (Gulf theatre 2019–2026)
--
-- Sources: CSIS Missile Threat, Iran Watch, JINSA, IISS, GlobalSecurity,
--          Wikipedia OSINT, 2026 Gulf War UAE MoD intercept data (open-source),
--          Jane's Strategic Weapons (open sections)
-- Pk values: training estimates derived from 2026 Gulf War published intercept rates.
--   UAE MoD reported: ~88% ballistic, ~94% drone, ~76% cruise.
--   Fattah-1 assessed <40% (IISS). All values are NOT classified Pk data.
-- All data OSINT. No classified sources. No export-controlled algorithms.


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 0 — CONSTRAINT UPDATES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Extend platform category enum
ALTER TABLE platforms DROP CONSTRAINT IF EXISTS platforms_category_check;
ALTER TABLE platforms ADD CONSTRAINT platforms_category_check CHECK (category IN (
  -- UAS / drone categories (existing)
  'MALE','HALE','tactical','loitering_munition','FPV','naval','VTOL',
  'fixed_wing_tactical','interceptor_uas','combat_hexacopter','carrier_uas','tube_launched_lm',
  -- C-UAS / effector categories (existing)
  'c_uas_gun','c_uas_laser','c_uas_rf','manpads','c_uas_system',
  -- Missile categories (NEW)
  'ballistic_missile_srbm',   -- Short Range Ballistic Missile  (<1000 km)
  'ballistic_missile_mrbm',   -- Medium Range Ballistic Missile (1000–3500 km)
  'cruise_missile'            -- Land-attack cruise missile
));

-- Extend guidance_type enum
ALTER TABLE platforms DROP CONSTRAINT IF EXISTS platforms_guidance_type_check;
ALTER TABLE platforms ADD CONSTRAINT platforms_guidance_type_check CHECK (
  guidance_type IS NULL OR guidance_type IN (
    -- Existing
    'INS+GPS','INS+EO','RF_command','fibre_optic','autonomous','INS_only',
    'mesh','preprogrammed','unknown',
    'FPV+thermal','INS+GPS+GLONASS','AI+GPS+BeiDou','AI+EO+GPS',
    'passive_RF+INS+GPS','EO+INS+GPS','GPS+NavIC','visual_nav+INS','EO+man-in-loop',
    -- NEW — missile-specific
    'INS+GPS+TERCOM',     -- Cruise missiles: inertial + GPS + terrain contour matching
    'INS+MaRV+GPS',       -- Maneuvering reentry vehicle: INS primary + GPS + terminal fins
    'INS+MaRV+EO',        -- MaRV with electro-optical terminal seeker
    'INS+boost_glide',    -- Hypersonic boost-glide: INS + aerodynamic glide body
    'INS_only_liquid',    -- Legacy liquid-fuel ballistic: pure inertial (no GPS terminal)
    'INS+GPS+MaRV+EO'     -- Advanced: INS + GPS + maneuvering RV + EO terminal seeker
  )
);

-- Add missile-specific columns (gracefully ignored if they exist)
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS cep_m            INTEGER;   -- Circular Error Probable (metres)
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS apogee_km        NUMERIC;   -- Max altitude / apogee for ballistic trajectories
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS mach_terminal    NUMERIC;   -- Terminal phase Mach number
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS fuel_type        TEXT;      -- 'solid' | 'liquid' | 'turbofan' | 'turbojet'


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 1 — NEW DEFEAT SYSTEMS (Ballistic Missile Defence)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO anti_drone_systems (
  id, name, manufacturer, country, defeat_method, effective_range_m,
  portability, conflict_validated, conflict_notes, data_confidence, sources,
  frequency_bands_covered
) VALUES

('thaad',
 'THAAD (Terminal High Altitude Area Defense)',
 'Lockheed Martin', 'United States',
 ARRAY['kinetic']::TEXT[], 200000, 'vehicle', true,
 'Hit-to-kill kinetic interceptor vs SRBM/MRBM in terminal phase. UAE THAAD batteries reported ~85% Pk vs standard ballistic in 2026 Gulf operations. Stressed by depressed trajectories (Kheibar Shekan) and hypersonic MaRV (Fattah-1). AN/TPY-2 X-band radar; ~150 km intercept altitude. Two batteries in UAE; Saudi Arabia has 2+ batteries.',
 'high',
 ARRAY[
   'OSINT: MDA THAAD fact sheet — hit-to-kill vs SRBM/MRBM, 200 km range, 150 km altitude',
   'OSINT: UAE MoD 2026 — THAAD intercepts reported vs Kheibar Shekan salvos',
   'OSINT: IISS Military Balance 2026 — UAE/Saudi THAAD ORBAT',
   'OSINT: DefenseNews Apr 2026 — THAAD performance report Gulf campaign'
 ]::TEXT[],
 '{"radar_xband":"8000-12000","discriminator":"10000-12000"}'::jsonb),

('pac-2-gem-t',
 'Patriot PAC-2 GEM-T (Guidance Enhanced Missile-T)',
 'Raytheon', 'United States',
 ARRAY['kinetic']::TEXT[], 100000, 'vehicle', true,
 'Track-via-missile guidance. Lower-tier engagement for SRBM and cruise missiles. Better vs cruise than ballistic. GCC states operate PAC-2 GEM-T in parallel with PAC-3 MSE for volume engagement. Saudi/UAE Patriot batteries: mix of PAC-2 GEM-T and PAC-3 MSE. 2026 campaign: sustained engagement — magazine depth critical.',
 'high',
 ARRAY[
   'OSINT: Raytheon PAC-2 GEM-T datasheet — semi-active radar homing TVM',
   'OSINT: IISS Military Balance 2026 — GCC Patriot ORBAT by battery type',
   'OSINT: Jane''s — PAC-2 GEM-T vs cruise, effective range 100 km'
 ]::TEXT[],
 '{}'::jsonb),

('arrow-3',
 'Arrow-3 (Hetz 3) Exo-Atmospheric Interceptor',
 'IAI / Boeing (MAFAT)', 'Israel',
 ARRAY['kinetic']::TEXT[], 2400000, 'fixed', true,
 'Exo-atmospheric hit-to-kill vs MRBM/ICBM. Engages outside atmosphere during mid-course phase. April 2024 direct Iran strike: Arrow-3 engaged MRBM (Emad/Ghadr class) at exo-atmospheric altitude. ~90% Pk vs standard ballistic trajectory; degraded vs MaRV/hypersonic due to mid-course engagement geometry. Not deployed in Gulf states — Israel only.',
 'high',
 ARRAY[
   'OSINT: IMDO Arrow-3 — exo-atmospheric kinetic kill, IIR seeker cold gas manoeuvre',
   'OSINT: IAF Apr 2024 — Arrow-3 engagement of Iranian MRBM salvo confirmed',
   'OSINT: Israel MoD — Arrow-3 vs Iran Oct 2024 second strike, ~90% intercept claimed',
   'OSINT: Jane''s — Arrow-3 operational range 2,400 km; altitude 100 km+'
 ]::TEXT[],
 '{}'::jsonb),

('sm-3-block-ia',
 'SM-3 Block IA (Standard Missile-3)',
 'Raytheon', 'United States',
 ARRAY['kinetic']::TEXT[], 700000, 'naval', true,
 'Ship-launched exo/endo-atmospheric interceptor vs MRBM. Aegis BMD system. USN destroyers/cruisers routinely forward-deployed Gulf. Kinetic kill vehicle (KKV) — LEAP. Effective vs MRBM in ascent and mid-course phase; stressed vs fast reentry at terminal. USS Donald Cook (DDG-75) and USS Bulkeley (DDG-84) fired SM-3 in 2026 Gulf operations per unclassified reporting.',
 'high',
 ARRAY[
   'OSINT: MDA SM-3 Block IA — exo-atmospheric kinetic vs MRBM, Aegis platform',
   'OSINT: USNI News 2026 — USN Aegis BMD ships active Gulf during Iran war',
   'OSINT: Jane''s Naval Weapons — SM-3 Block IA range 700+ km, altitude 500+ km'
 ]::TEXT[],
 '{}'::jsonb),

('mim-23-hawk',
 'MIM-23 Hawk (Homing All the Way Killer)',
 'Raytheon / Northrop Grumman', 'Multi',
 ARRAY['kinetic']::TEXT[], 45000, 'vehicle', true,
 'SARH medium-range SAM. Designed for aircraft/cruise missiles; limited vs ballistic. GCC states (Kuwait, Bahrain, Saudi Arabia) retain Hawk Improved batteries for lower-tier coverage. CEP-limited vs MRBM terminal reentry. 2026: Bahrain Hawk reported limited Pk vs incoming Fateh-313 class; overwhelmed by volume. Being replaced by NASAMS/PAC-3 in most inventories.',
 'medium',
 ARRAY[
   'OSINT: Jane''s — MIM-23 Hawk vs aircraft and cruise missile primary design',
   'OSINT: IISS Military Balance 2026 — Bahrain/Kuwait Hawk Improved batteries retained',
   'OSINT: GlobalSecurity — Hawk max range 45 km, altitude 18 km; limited ballistic use'
 ]::TEXT[],
 '{}'::jsonb)

ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 2 — PLATFORMS: BALLISTIC MISSILES
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO platforms (
  id, name, manufacturer, country_of_origin, category,
  max_speed_kmh, service_ceiling_m, range_km, endurance_hrs, mtow_kg, warhead_kg,
  guidance_type, gnss_independent, ai_autonomous, swarm_capable,
  gnss_used, nav_backup, weapon_types, sensor_suite, known_operators,
  conflict_deployments, data_confidence, sources, classification,
  cep_m, apogee_km, mach_terminal, fuel_type
) VALUES

-- ── SHAHAB FAMILY — LIQUID-FUEL LEGACY ──────────────────────────────────────

('shahab-3',
 'Shahab-3 (شهاب-۳)', 'Ministry of Defence, Iran', 'Iran',
 'ballistic_missile_mrbm',
 9360, 200000, 900, 0.25, 16200, 1000,
 'INS_only_liquid', true, false, false,
 ARRAY[]::TEXT[], ARRAY['INS']::TEXT[],
 ARRAY['HE unitary warhead','cluster submunition warhead (assessed)']::TEXT[],
 ARRAY['INS platform']::TEXT[],
 ARRAY['IRGC Aerospace Force','Iran Army']::TEXT[],
 ARRAY['Jan 2020 Ain al-Assad Iraq (16 fired, 11 impacted)','Syria 2018 (assessed)']::TEXT[],
 'high',
 ARRAY[
   'OSINT: CSIS Missile Threat — Shahab-3, 900 km, 1000 kg warhead, INS guidance, ~2500 m CEP',
   'OSINT: Iran Watch — No-dong-1 derivative; liquid UDMH/N2O4 propellant',
   'OSINT: Wikipedia Shahab-3 — 15.86 m length, 1.35 m diameter, 16,250 kg launch weight',
   'OSINT: Jan 2020 CENTCOM BDA — 16 Shahab-3 class at Ain al-Assad, 11 impacted'
 ]::TEXT[],
 'UNCLASSIFIED',
 2500, 200, 9, 'liquid'),

('ghadr-1',
 'Ghadr-1 / Shahab-3M (قدر-۱)', 'Ministry of Defence, Iran', 'Iran',
 'ballistic_missile_mrbm',
 11520, 350000, 1600, 0.27, 17000, 750,
 'INS_only_liquid', true, false, false,
 ARRAY[]::TEXT[], ARRAY['INS']::TEXT[],
 ARRAY['HE unitary warhead — separating triconic RV']::TEXT[],
 ARRAY['INS platform']::TEXT[],
 ARRAY['IRGC Aerospace Force']::TEXT[],
 ARRAY['Syria 2017–2022 multiple — IRGC-AF strikes (OSINT)']::TEXT[],
 'high',
 ARRAY[
   'OSINT: CSIS — Ghadr-1 (Shahab-3M) 1,600–1,950 km range; separating RV improves CEP to ~300 m',
   'OSINT: Iran Watch — triconic finned RV; liquid propellant Shahab-3 airframe extended'
 ]::TEXT[],
 'UNCLASSIFIED',
 300, 350, 11, 'liquid'),

('emad',
 'Emad (عماد) — MaRV MRBM', 'AIO / IRGC-AF', 'Iran',
 'ballistic_missile_mrbm',
 18360, 400000, 1700, 0.28, 18000, 750,
 'INS+MaRV+GPS', false, false, false,
 ARRAY['GPS']::TEXT[], ARRAY['INS','MaRV fins']::TEXT[],
 ARRAY['HE maneuvering warhead — MaRV reentry vehicle']::TEXT[],
 ARRAY['INS+GPS+MaRV terminal guidance']::TEXT[],
 ARRAY['IRGC Aerospace Force']::TEXT[],
 ARRAY['Syria 2017 (assessed)','April 2024 Israel direct strike (assessed mix)']::TEXT[],
 'high',
 ARRAY[
   'OSINT: CSIS — Emad, 1,700 km, MaRV reentry vehicle, INS+GPS+control fins, CEP ~500 m',
   'OSINT: Iran Watch — Emad first shown 2015; MaRV allows terminal manoeuvre, stressed PAC-2',
   'OSINT: Jane''s — Emad Ghadr-1 derivative; manoeuvring warhead reduces intercept probability'
 ]::TEXT[],
 'UNCLASSIFIED',
 500, 400, 12, 'liquid'),

-- ── FATEH FAMILY — SOLID-FUEL PRECISION STRIKE ───────────────────────────────

('fateh-110',
 'Fateh-110 (فاتح-۱۱۰)', 'AIO / Shahid Bagheri Industries', 'Iran',
 'ballistic_missile_srbm',
 7200, 80000, 300, 0.08, 3450, 500,
 'INS+GPS', false, false, false,
 ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[],
 ARRAY['HE unitary warhead']::TEXT[],
 ARRAY['INS+GPS terminal']::TEXT[],
 ARRAY['IRGC Ground Force','IRGC Aerospace Force','Hezbollah (assessed)','Hamas (assessed)']::TEXT[],
 ARRAY['Jan 2020 Ain al-Assad Iraq (included in Fateh family)','Syria 2018 confirmed']::TEXT[],
 'high',
 ARRAY[
   'OSINT: CSIS — Fateh-110: 8.86 m, 0.61 m diameter, 3,450 kg, 300 km, 500 kg warhead',
   'OSINT: Iran Watch — solid HTPB propellant; road-mobile TEL; 100 m CEP (assessed)',
   'OSINT: Wikipedia Fateh-110 — first combat deployment Syria 2018; INS+GPS guidance'
 ]::TEXT[],
 'UNCLASSIFIED',
 100, 80, 7, 'solid'),

('fateh-313',
 'Fateh-313 (فاتح-۳۱۳)', 'AIO / Shahid Bagheri Industries', 'Iran',
 'ballistic_missile_srbm',
 7560, 100000, 500, 0.10, 3600, 450,
 'INS+GPS', false, false, false,
 ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[],
 ARRAY['HE unitary warhead — composite body']::TEXT[],
 ARRAY['INS+GPS terminal']::TEXT[],
 ARRAY['IRGC Aerospace Force','Houthi (via IRGC supply assessed)']::TEXT[],
 ARRAY['2026 UAE strikes (Fateh family assessed)']::TEXT[],
 'high',
 ARRAY[
   'OSINT: CSIS — Fateh-313: 8.756 m, 0.612 m diameter, composite CFRP body, 450–500 km, ~50 m CEP claimed',
   'OSINT: Iran Watch — extended Fateh-110 airframe; lighter composite structure for extra range',
   'OSINT: DefenseFeeds — Fateh-313 road-mobile TEL; declared 2015; deployed IRGC-AF'
 ]::TEXT[],
 'UNCLASSIFIED',
 50, 100, 7, 'solid'),

('zolfaghar',
 'Zolfaghar / Zuljanah (ذوالفقار)', 'AIO / IRGC-AF', 'Iran',
 'ballistic_missile_srbm',
 8280, 120000, 700, 0.12, 4615, 590,
 'INS+MaRV+GPS', false, false, false,
 ARRAY['GPS']::TEXT[], ARRAY['INS','MaRV fins']::TEXT[],
 ARRAY['HE separating MaRV warhead']::TEXT[],
 ARRAY['INS+GPS+MaRV separating RV']::TEXT[],
 ARRAY['IRGC Aerospace Force']::TEXT[],
 ARRAY['Syria 2017 confirmed — Deir ez-Zor strike','2026 Gulf campaign (Fateh family)']::TEXT[],
 'high',
 ARRAY[
   'OSINT: CSIS — Zolfaghar: 10.3 m, 0.68 m diameter, 4,615 kg, 700 km, 590 kg warhead; separating MaRV',
   'OSINT: Iran Watch — RV separation mid-course; significantly harder kinematic intercept',
   'OSINT: Syria 2017 — confirmed IRGC-AF Zolfaghar strike footage; 6 missiles reported'
 ]::TEXT[],
 'UNCLASSIFIED',
 150, 120, 8, 'solid'),

('dezful',
 'Dezful (دزفول)', 'AIO / IRGC-AF', 'Iran',
 'ballistic_missile_srbm',
 8640, 180000, 1000, 0.15, 5200, 500,
 'INS+MaRV+GPS', false, false, false,
 ARRAY['GPS']::TEXT[], ARRAY['INS','MaRV fins']::TEXT[],
 ARRAY['HE separating MaRV warhead']::TEXT[],
 ARRAY['INS+GPS+MaRV terminal']::TEXT[],
 ARRAY['IRGC Aerospace Force']::TEXT[],
 ARRAY['2026 Gulf campaign (Fateh family extended range)']::TEXT[],
 'high',
 ARRAY[
   'OSINT: CSIS — Dezful: extended Zolfaghar airframe, 1,000 km range, unveiled Feb 2019',
   'OSINT: Iran Watch — same MaRV concept as Zolfaghar, CEP assessed ~50 m',
   'OSINT: GlobalSecurity — Dezful IRGC ceremony Feb 2019; covers all Arabian Peninsula from western Iran'
 ]::TEXT[],
 'UNCLASSIFIED',
 50, 180, 8, 'solid'),

-- ── THIRD GENERATION — PRECISION SOLID-FUEL MRBM ────────────────────────────

('kheibar-shekan',
 'Kheibar Shekan / "Khaybar Buster" (خیبر شکن)', 'AIO / IRGC-AF', 'Iran',
 'ballistic_missile_mrbm',
 12960, 300000, 1450, 0.20, 12000, 600,
 'INS+MaRV+GPS', false, false, false,
 ARRAY['GPS']::TEXT[], ARRAY['INS','MaRV fins']::TEXT[],
 ARRAY['HE unitary/penetrating warhead — composite CFRP body']::TEXT[],
 ARRAY['INS+GPS+MaRV terminal']::TEXT[],
 ARRAY['IRGC Aerospace Force']::TEXT[],
 ARRAY[
   'April 13–14 2024 Iran direct strike Israel (among ~120 ballistic)',
   'October 1 2024 Iran direct strike Israel (dominant in 180-missile salvo)',
   '2026 UAE strikes — primary ballistic weapon assessed',
   '2026 Qatar strikes','2026 Bahrain strikes'
 ]::TEXT[],
 'high',
 ARRAY[
   'OSINT: DefenseFeeds — Kheibar Shekan: 1,450 km, solid composite, 30% lighter than predecessors',
   'OSINT: JINSA Feb 2026 — Kheibar Shekan dominant system in Gulf 2026 campaign',
   'OSINT: IISS — depressed trajectory option strains THAAD intercept geometry; assessed 10–30 m CEP',
   'OSINT: Iran MoD briefing — 6× faster launch preparation than liquid predecessors'
 ]::TEXT[],
 'UNCLASSIFIED',
 25, 300, 12, 'solid'),

('khorramshahr-1',
 'Khorramshahr-1 / Khorramshahr (خرمشهر)', 'AIO / IRGC-AF', 'Iran',
 'ballistic_missile_mrbm',
 14400, 500000, 2000, 0.30, 20000, 1500,
 'INS_only_liquid', true, false, false,
 ARRAY[]::TEXT[], ARRAY['INS']::TEXT[],
 ARRAY['HE unitary warhead (MIRV potential assessed)','single large warhead option']::TEXT[],
 ARRAY['INS platform']::TEXT[],
 ARRAY['IRGC Aerospace Force']::TEXT[],
 ARRAY['2026 Gulf campaign — strategic reserve role']::TEXT[],
 'high',
 ARRAY[
   'OSINT: CSIS — Khorramshahr: 13 m, 1.5 m diameter, ~20 tonnes, 2,000 km, 1,500 kg warhead',
   'OSINT: Iran Watch — liquid propellant; multiple warhead capability assessed by analysts',
   'OSINT: GlobalSecurity — Khorramshahr revealed 2017; heaviest warhead payload in Iranian arsenal at debut'
 ]::TEXT[],
 'UNCLASSIFIED',
 500, 500, 14, 'liquid'),

('khorramshahr-4',
 'Khorramshahr-4 / "Kheibar" (خرمشهر ۴)', 'AIO / IRGC-AF', 'Iran',
 'ballistic_missile_mrbm',
 15840, 700000, 2000, 0.33, 22000, 1500,
 'INS+MaRV+GPS', false, false, false,
 ARRAY['GPS']::TEXT[], ARRAY['INS','MaRV fins']::TEXT[],
 ARRAY['HE penetrating warhead — 1,500 kg — heaviest in Iranian inventory']::TEXT[],
 ARRAY['INS+GPS+MaRV terminal']::TEXT[],
 ARRAY['IRGC Aerospace Force']::TEXT[],
 ARRAY['2026 Gulf campaign — high-value target strikes','April 2024 assessed but unconfirmed']::TEXT[],
 'high',
 ARRAY[
   'OSINT: JINSA Feb 2026 — Khorramshahr-4 ("Kheibar"): 2,000–3,000 km, 1,500 kg payload, revealed 2023',
   'OSINT: CSIS — largest single warhead in Iranian MRBM inventory; potential MIRV',
   'OSINT: Iran Watch — disclosed June 2023; liquid propellant variant of Khorramshahr-1 extended'
 ]::TEXT[],
 'UNCLASSIFIED',
 300, 700, 15, 'liquid'),

('sejjil',
 'Sejjil-2 (سجیل)', 'AIO / IRGC-AF', 'Iran',
 'ballistic_missile_mrbm',
 14400, 500000, 2000, 0.28, 22000, 1000,
 'INS+GPS', false, false, false,
 ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[],
 ARRAY['HE unitary warhead']::TEXT[],
 ARRAY['INS+GPS']::TEXT[],
 ARRAY['IRGC Aerospace Force']::TEXT[],
 ARRAY['2026 Gulf campaign — strategic reserve; limited production numbers']::TEXT[],
 'high',
 ARRAY[
   'OSINT: CSIS — Sejjil-2: two-stage solid-fuel MRBM, 2,000–2,500 km, only Iranian two-stage solid',
   'OSINT: Iran Watch — fastest launch-to-impact in Iranian inventory; minimal pre-launch signature',
   'OSINT: GlobalSecurity — limited production assessed; strategic deterrent role vs operational weapon'
 ]::TEXT[],
 'UNCLASSIFIED',
 300, 500, 14, 'solid'),

-- ── HYPERSONIC / BOOST-GLIDE ──────────────────────────────────────────────────

('fattah-1',
 'Fattah-1 (فتاح-۱) — Claimed Hypersonic', 'AIO / IRGC-AF', 'Iran',
 'ballistic_missile_mrbm',
 15600, 500000, 1400, 0.22, 15000, 500,
 'INS+boost_glide', true, false, false,
 ARRAY[]::TEXT[], ARRAY['INS','aerodynamic glide body']::TEXT[],
 ARRAY['HE warhead — maneuvering hypersonic RV']::TEXT[],
 ARRAY['INS + aerodynamic MaRV terminal seeker (assessed)']::TEXT[],
 ARRAY['IRGC Aerospace Force']::TEXT[],
 ARRAY[
   '2026 UAE strikes — limited numbers (IISS assessed <40% intercept rate by UAE systems)',
   '2026 Qatar strikes — very limited numbers assessed'
 ]::TEXT[],
 'medium',
 ARRAY[
   'OSINT: JINSA — Fattah-1: claimed Mach 13, solid booster (Kheibar Shekan derived) + maneuvering 2nd stage, 1,400 km',
   'OSINT: IISS 2026 Gulf assessment — Fattah-1 fired in limited numbers; UAE THAAD/Patriot assessed <40% Pk',
   'OSINT: Iran MoD June 2023 — Fattah-1 declared operational; independent verification limited',
   'OSINT: DefenseNews — No deployed system currently assessed reliably effective at full terminal velocity'
 ]::TEXT[],
 'UNCLASSIFIED',
 50, 500, 13, 'solid'),

('fattah-2',
 'Fattah-2 (فتاح-۲) — Boost-Glide', 'AIO / IRGC-AF', 'Iran',
 'ballistic_missile_mrbm',
 18000, 600000, 1500, 0.25, 16000, 500,
 'INS+boost_glide', true, false, false,
 ARRAY[]::TEXT[], ARRAY['INS','aerodynamic lifting body']::TEXT[],
 ARRAY['HE warhead — boost-glide lifting body']::TEXT[],
 ARRAY['INS + lifting body aerodynamic glide']::TEXT[],
 ARRAY['IRGC Aerospace Force']::TEXT[],
 ARRAY['2026 Gulf campaign — operational status uncertain; very limited assessed']::TEXT[],
 'estimated',
 ARRAY[
   'OSINT: JINSA — Fattah-2: 1,500 km boost-glide variant, significantly flatter trajectory than Fattah-1',
   'OSINT: Iran MoD unveiled 2024 — aerodynamic lifting body RV; Mach 15+ claimed',
   'OSINT: IISS — operational status uncertain; independent verification nil as of Jun 2026'
 ]::TEXT[],
 'UNCLASSIFIED',
 50, 600, 15, 'solid')

ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 3 — PLATFORMS: CRUISE MISSILES
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO platforms (
  id, name, manufacturer, country_of_origin, category,
  max_speed_kmh, service_ceiling_m, range_km, endurance_hrs, mtow_kg, warhead_kg,
  guidance_type, gnss_independent, ai_autonomous, swarm_capable,
  gnss_used, nav_backup, weapon_types, sensor_suite, known_operators,
  conflict_deployments, data_confidence, sources, classification,
  cep_m, apogee_km, mach_terminal, fuel_type
) VALUES

('soumar-meshkat',
 'Soumar / Meshkat (سومار / مشکات)', 'Ministry of Defence / Defence Industries Organisation', 'Iran',
 'cruise_missile',
 810, 1000, 2000, 2.50, 1500, 450,
 'INS+GPS+TERCOM', false, false, false,
 ARRAY['GPS']::TEXT[], ARRAY['INS','TERCOM terrain-contour']::TEXT[],
 ARRAY['HE warhead — terrain-following low-altitude strike']::TEXT[],
 ARRAY['INS','GPS','TERCOM radar altimeter']::TEXT[],
 ARRAY['IRGC Aerospace Force']::TEXT[],
 ARRAY['April 2024 Israel direct strike (Hoveizeh/Soumar family 30+ cruise)']::TEXT[],
 'high',
 ARRAY[
   'OSINT: CSIS — Soumar: 700 km; Meshkat 2,000–2,500 km; Kh-55 derivative acquired via Ukraine 2001',
   'OSINT: Iran Watch — TERCOM + INS + GPS; 50–100 m AGL terrain-following; turbofan propulsion',
   'OSINT: Jane''s — low RCS design; Meshkat extended with internal fuel; ~50 m CEP assessed'
 ]::TEXT[],
 'UNCLASSIFIED',
 50, 1, 1, 'turbofan'),

('hoveizeh',
 'Hoveizeh (هویزه)', 'Ministry of Defence / DIO', 'Iran',
 'cruise_missile',
 900, 500, 1350, 1.50, 1400, 450,
 'INS+GPS+TERCOM', false, false, false,
 ARRAY['GPS']::TEXT[], ARRAY['INS','TERCOM','radar altimeter']::TEXT[],
 ARRAY['HE unitary warhead — hardened penetrating option (assessed)']::TEXT[],
 ARRAY['INS','GPS','TERCOM','radar altimeter (J-band ~13.5 GHz)']::TEXT[],
 ARRAY['IRGC Aerospace Force']::TEXT[],
 ARRAY['April 2024 Israel direct strike — Hoveizeh primary cruise missile confirmed','2026 UAE strikes — 19 cruise missiles total including Hoveizeh family']::TEXT[],
 'high',
 ARRAY[
   'OSINT: Iran Watch — Hoveizeh 1,350 km; Soumar family; turbofan Tolou-4 derived; unveiled Feb 2019',
   'OSINT: CSIS — terrain-following ~50 m AGL; 0.7–0.85 Mach; GPS+TERCOM; covers UAE/Qatar/Saudi from Iranian territory',
   'OSINT: JINSA Feb 2026 — Hoveizeh among 19 cruise missiles vs UAE in 2026; NASAMS primary interceptor'
 ]::TEXT[],
 'UNCLASSIFIED',
 50, 1, 1, 'turbofan'),

('paveh-lacm',
 'Paveh / Ya-Ali Land-Based (پاوه)', 'Ministry of Defence / Aerospace Industries Organisation', 'Iran',
 'cruise_missile',
 900, 500, 1650, 1.83, 1600, 400,
 'INS+GPS+TERCOM', false, false, false,
 ARRAY['GPS']::TEXT[], ARRAY['INS','TERCOM','radar altimeter','EO terminal seeker (assessed)']::TEXT[],
 ARRAY['HE penetrating warhead — hardened bunker option','loiter-before-strike capability (assessed)']::TEXT[],
 ARRAY['INS','GPS','TERCOM','radar altimeter','EO terminal seeker']::TEXT[],
 ARRAY['IRGC Aerospace Force','Houthi (as Quds-1/2 designation)']::TEXT[],
 ARRAY[
   'Sept 2019 Abqaiq/Khurais strike (Houthi Quds-1 = Paveh designation)',
   'Jan 2022 UAE strikes (Quds-2 extended variant)',
   '2026 Gulf campaign — Paveh class among 19 cruise vs UAE'
 ]::TEXT[],
 'high',
 ARRAY[
   'OSINT: Wikipedia Paveh — 1,650 km; retractable wings; 735–900 km/h; turbofan; HE penetrating warhead',
   'OSINT: CSIS — Paveh loiter capability; INS+GPS+TERCOM+EO terminal seeker; identical to Houthi Quds-1/2',
   'OSINT: JINSA — Sept 2019 Abqaiq 18 Quds-1 (Paveh) confirmed by Saudi Aramco debris; overwhelmed Patriot'
 ]::TEXT[],
 'UNCLASSIFIED',
 30, 1, 1, 'turbofan'),

('quds-1',
 'Quds-1 / Quds-2 (قدس-۱ Houthi designation)', 'IRGC-supplied via Houthi Military Council', 'Iran/Yemen',
 'cruise_missile',
 756, 300, 1200, 1.59, 1200, 180,
 'INS+GPS+TERCOM', false, false, false,
 ARRAY['GPS']::TEXT[], ARRAY['INS','TERCOM','terrain following autopilot']::TEXT[],
 ARRAY['HE warhead ~180 kg — compressed compared to Paveh; area/infrastructure target optimised']::TEXT[],
 ARRAY['INS','GPS','TERCOM terrain-following']::TEXT[],
 ARRAY['Houthi Armed Forces (Ansar Allah)','IRGC-QF (supply chain)']::TEXT[],
 ARRAY[
   'Sept 14 2019 Abqaiq/Khurais Saudi Arabia (18 fired; cut 5.7Mbd Saudi oil output)',
   'January 2022 Abu Dhabi industrial zone (3 strikes)',
   '2026 Gulf campaign — Houthi-operated variant of Paveh family'
 ]::TEXT[],
 'high',
 ARRAY[
   'OSINT: CSIS — Quds-1: 900 km (extended Quds-2: 1,500 km); Houthi designation for Paveh derivative',
   'OSINT: Saudi/USDI debris analysis — Sept 2019: Quds-1 debris confirmed Iranian turbofan + terrain-follower',
   'OSINT: Jane''s — Quds-1 5–50 m AGL; compressed warhead 180 kg vs Paveh 400 kg; optimised for volume',
   'OSINT: UN Panel of Experts 2020 — Iranian supply chain for Quds-1 confirmed'
 ]::TEXT[],
 'UNCLASSIFIED',
 100, 1, 1, 'turbofan'),

('ya-ali',
 'Ya Ali (یاعلی) — Air-Launched Cruise Missile', 'AIO / Aerospace Industries Organisation', 'Iran',
 'cruise_missile',
 1080, 10000, 700, 0.65, 1200, 400,
 'INS+GPS+TERCOM', false, false, false,
 ARRAY['GPS']::TEXT[], ARRAY['INS','GPS','TERCOM','active radar seeker terminal']::TEXT[],
 ARRAY['HE warhead ~400 kg — active radar terminal seeker']::TEXT[],
 ARRAY['INS','GPS','TERCOM','active radar terminal seeker']::TEXT[],
 ARRAY['IRIAF (Su-24, F-4E launch platforms)']::TEXT[],
 ARRAY['Syria 2018 — IRIAF Su-24 launched (assessed)']::TEXT[],
 'medium',
 ARRAY[
   'OSINT: Iran Watch — Ya Ali: 700 km air-launched, active radar seeker terminal, 0.9 Mach transonic',
   'OSINT: CSIS — air-launched only; IRIAF platforms Su-24/F-4E; limited relevance in Gulf direct-fire',
   'OSINT: Wikipedia Ya Ali — unveiled 2014; INS+GPS+TERCOM+active radar seeker; ~400 kg HE'
 ]::TEXT[],
 'UNCLASSIFIED',
 50, 10, 1, 'turbofan')

ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 4 — GNSS PLATFORM DEPENDENCIES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Ballistic: liquid/INS-only systems are GPS-independent
-- Ballistic: solid-fuel GPS-guided have primary GPS dependency
-- Hypersonic: essentially GPS-immune (INS + aerodynamic)
-- Cruise: primary GPS + TERCOM secondary; TERCOM works without GPS

CREATE UNIQUE INDEX IF NOT EXISTS gnss_deps_platform_constellation_unique
  ON gnss_platform_dependencies (platform_id, constellation);

INSERT INTO gnss_platform_dependencies
  (platform_id, constellation, dependency_level, jamming_effect, notes, data_source)
VALUES
  -- Shahab-3 (pure INS, liquid)
  ('shahab-3', 'gps',     'none',    'none',        'Pure INS guidance — GPS not used; CEP ~2,500 m reflects INS accuracy', 'osint'),
  -- Ghadr-1 (pure INS, separating RV)
  ('ghadr-1',  'gps',     'none',    'none',        'Separating RV INS only; triconic finned RV for improved CEP without GPS', 'osint'),
  -- Emad MaRV — GPS terminal makes it GPS-dependent
  ('emad',     'gps',     'primary', 'degraded',    'MaRV terminal phase uses GPS for course corrections; jamming degrades CEP to ~2,000 m', 'osint'),
  -- Fateh-110 solid GPS
  ('fateh-110','gps',     'primary', 'degraded',    'INS+GPS terminal; GPS jamming degrades CEP from ~100 m to ~800 m assessed', 'osint'),
  -- Fateh-313 solid GPS
  ('fateh-313','gps',     'primary', 'degraded',    'INS+GPS terminal; GPS jamming degrades precision; INS fallback retains ~500 m CEP', 'osint'),
  -- Zolfaghar — MaRV with GPS terminal
  ('zolfaghar','gps',     'primary', 'degraded',    'MaRV GPS-assisted terminal corrections; jamming reduces Pk against point targets', 'osint'),
  -- Dezful — MaRV with GPS terminal
  ('dezful',   'gps',     'primary', 'degraded',    'Extended Zolfaghar; GPS terminal on MaRV — jamming degrades CEP', 'osint'),
  -- Kheibar Shekan — GPS primary
  ('kheibar-shekan','gps','primary', 'degraded',    'INS+GPS+MaRV; GPS jamming forces INS-only — CEP degrades from ~25 m to ~300 m assessed', 'osint'),
  -- Khorramshahr-1 liquid INS
  ('khorramshahr-1','gps','none',    'none',        'Liquid fuel INS-only; GPS not used; area weapon', 'osint'),
  -- Khorramshahr-4 — GPS MaRV
  ('khorramshahr-4','gps','primary', 'degraded',    'MaRV GPS-assisted; jamming reverts to INS; degraded accuracy vs point targets', 'osint'),
  -- Sejjil — GPS terminal
  ('sejjil',   'gps',     'primary', 'degraded',    'INS+GPS; jamming degrades CEP from ~300 m to ~1,000 m assessed', 'osint'),
  -- Fattah-1 hypersonic — GPS-immune in terminal phase (INS + aerodynamic)
  ('fattah-1', 'gps',     'immune',  'none',        'Hypersonic terminal phase too fast for GPS update; INS + aerodynamic control — GPS jamming ineffective', 'osint'),
  -- Fattah-2 boost-glide — GPS-immune
  ('fattah-2', 'gps',     'immune',  'none',        'Boost-glide lifting body; aerodynamic guidance in terminal; GPS jamming ineffective at Mach 15', 'osint'),
  -- Cruise missiles — GPS primary + TERCOM secondary (can operate without GPS via TERCOM)
  ('soumar-meshkat','gps','primary', 'minimal',     'TERCOM terrain-contour provides GPS-denied fallback; TERCOM maintains <200 m CEP without GPS', 'osint'),
  ('hoveizeh','gps',      'primary', 'minimal',     'TERCOM fallback — GPS jamming degraded by terrain-matching; effectiveness retained in most terrain', 'osint'),
  ('paveh-lacm','gps',    'primary', 'minimal',     'GPS + TERCOM + EO terminal; TERCOM fallback preserves delivery accuracy even under GPS jamming', 'osint'),
  ('quds-1',  'gps',      'primary', 'minimal',     'Simplified TERCOM backup; GPS jamming forces TERCOM-only; CEP degrades from ~100 m to ~500 m', 'osint'),
  ('ya-ali',  'gps',      'primary', 'degraded',    'Active radar terminal seeker provides terminal correction; GPS jamming degrades mid-course accuracy', 'osint')

ON CONFLICT (platform_id, constellation) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 5 — DEFEAT EFFECTIVENESS MATRIX
-- Columns: platform_id, defeat_system_id, rf_jamming_pct, kinetic_pct, dew_pct,
--          swarm_engagement_pct, data_confidence, weather_limited, special_notes
--
-- Pk framework (from 2026 Gulf War open-source data):
--   UAE overall ballistic intercept rate: ~88% (published MoD)
--   UAE cruise intercept rate: ~76%
--   Fattah-1 hypersonic: assessed <40% (IISS)
--   All Pk values are OSINT training estimates — NOT classified data.
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO defeat_effectiveness (
  platform_id, defeat_system_id, rf_jamming_pct, kinetic_pct, dew_pct,
  swarm_engagement_pct, data_confidence, weather_limited, special_notes
) VALUES

-- ─── SHAHAB-3 ────────────────────────────────────────────────────────────────
('shahab-3','thaad',             NULL, 82, NULL, NULL, 'estimated', false,
 'Standard MRBM trajectory; THAAD designed for this threat. CEP 2,500 m = area weapon vs point target. 2020 Ain al-Assad: no THAAD deployed; Shahab hit within 100 m of hardened shelters.'),
('shahab-3','pac-2-gem-t',       NULL, 55, NULL, NULL, 'estimated', false,
 'PAC-2 lower-tier; stressed vs MRBM terminal velocities. Semi-active radar homing less effective vs fast separating RV.'),
('shahab-3','patriot-pac-3',     NULL, 68, NULL, NULL, 'estimated', false,
 'PAC-3 MSE hit-to-kill; better vs MRBM than PAC-2 but architecture challenged by high terminal velocity.'),
('shahab-3','arrow-3',           NULL, 88, NULL, NULL, 'estimated', false,
 'Arrow-3 designed for MRBM class; exo-atmospheric engagement; high Pk vs non-MaRV.'),
('shahab-3','sm-3-block-ia',     NULL, 80, NULL, NULL, 'estimated', false,
 'Aegis BMD mid-course engagement; effective vs standard MRBM.'),
('shahab-3','mim-23-hawk',       NULL, 30, NULL, NULL, 'estimated', false,
 'Hawk limited vs MRBM terminal velocity; designed for aircraft. Marginal Pk.'),
('shahab-3','nasams-amraam-er',  NULL, 42, NULL, NULL, 'estimated', false,
 'NASAMS not designed for ballistic defeat; terminal engagement only vs slowest descent phase.'),

-- ─── GHADR-1 ────────────────────────────────────────────────────────────────
('ghadr-1','thaad',              NULL, 80, NULL, NULL, 'estimated', false,
 'MRBM range class; THAAD well-suited. Separating triconic RV improves evasion margin slightly vs PAC-2.'),
('ghadr-1','pac-2-gem-t',        NULL, 52, NULL, NULL, 'estimated', false,
 'Separating RV complicates track handoff for semi-active radar homing.'),
('ghadr-1','patriot-pac-3',      NULL, 65, NULL, NULL, 'estimated', false,
 'PAC-3 MSE; better vs RV separation than PAC-2.'),
('ghadr-1','arrow-3',            NULL, 86, NULL, NULL, 'estimated', false,
 'Exo-atmospheric engagement of MRBM; Arrow-3 primary mission.'),
('ghadr-1','sm-3-block-ia',      NULL, 78, NULL, NULL, 'estimated', false,
 'Mid-course engagement vs MRBM; effective.'),
('ghadr-1','mim-23-hawk',        NULL, 28, NULL, NULL, 'estimated', false,
 'Hawk marginal vs MRBM.'),

-- ─── EMAD (MaRV) ─────────────────────────────────────────────────────────────
('emad','thaad',                 NULL, 76, NULL, NULL, 'estimated', false,
 'MaRV terminal manoeuvring reduces intercept probability; THAAD radar tracks but engagement geometry compressed vs maneuvering RV.'),
('emad','pac-2-gem-t',           NULL, 42, NULL, NULL, 'estimated', false,
 'PAC-2 radar challenged by MaRV manoeuvring in terminal phase.'),
('emad','patriot-pac-3',         NULL, 58, NULL, NULL, 'estimated', false,
 'PAC-3 MSE hit-to-kill; MaRV maneuvring degrades intercept probability vs straight descent.'),
('emad','arrow-3',               NULL, 82, NULL, NULL, 'estimated', false,
 'Exo-atmospheric engagement before MaRV activation; Arrow-3 effective in mid-course.'),
('emad','sm-3-block-ia',         NULL, 75, NULL, NULL, 'estimated', false,
 'SM-3 mid-course; MaRV not yet active — effective engagement window.'),
('emad','mim-23-hawk',           NULL, 22, NULL, NULL, 'estimated', false,
 'Hawk severely degraded vs MaRV; limited engagement window at terminal.'),

-- ─── FATEH-110 ───────────────────────────────────────────────────────────────
('fateh-110','thaad',            NULL, 88, NULL, NULL, 'estimated', false,
 'SRBM well within THAAD engagement envelope. Iraq 2020 confirms survivability of hardened shelters when no THAAD deployed.'),
('fateh-110','pac-2-gem-t',      NULL, 68, NULL, NULL, 'estimated', false,
 'Short-range ballistic; PAC-2 GEM-T effective at this range class.'),
('fateh-110','patriot-pac-3',    NULL, 82, NULL, NULL, 'estimated', false,
 'PAC-3 MSE vs SRBM — primary design mission. High Pk.'),
('fateh-110','arrow-3',          NULL, 70, NULL, NULL, 'estimated', false,
 'Arrow-3 overkill for SRBM class; cost-exchange unfavorable; engageable in mid-course.'),
('fateh-110','sm-3-block-ia',    NULL, 65, NULL, NULL, 'estimated', false,
 'SM-3 vs SRBM; altitude window compressed; effective but not optimum.'),
('fateh-110','mim-23-hawk',      NULL, 48, NULL, NULL, 'estimated', false,
 'Hawk vs SRBM class — within engagement envelope; limited magazine.'),
('fateh-110','nasams-amraam-er', NULL, 35, NULL, NULL, 'estimated', false,
 'NASAMS not designed for ballistic; terminal approach at steep angle limits window.'),

-- ─── FATEH-313 ───────────────────────────────────────────────────────────────
('fateh-313','thaad',            NULL, 90, NULL, NULL, 'estimated', false,
 'SRBM at 500 km; THAAD comfortably in envelope. High Pk vs standard descent.'),
('fateh-313','pac-2-gem-t',      NULL, 70, NULL, NULL, 'estimated', false,
 'PAC-2 GEM-T at 500 km range class; effective.'),
('fateh-313','patriot-pac-3',    NULL, 84, NULL, NULL, 'estimated', false,
 'PAC-3 MSE vs extended SRBM. High confidence.'),
('fateh-313','mim-23-hawk',      NULL, 45, NULL, NULL, 'estimated', false,
 'Hawk at outer engagement boundary for 500 km SRBM descent profile.'),

-- ─── ZOLFAGHAR (separating MaRV SRBM/MRBM) ──────────────────────────────────
('zolfaghar','thaad',            NULL, 80, NULL, NULL, 'estimated', false,
 'Separating RV improves evasion; THAAD radar discriminates warhead vs booster; still effective vs MaRV class.'),
('zolfaghar','pac-2-gem-t',      NULL, 48, NULL, NULL, 'estimated', false,
 'MaRV separation challenges PAC-2 TVM guidance; degraded Pk.'),
('zolfaghar','patriot-pac-3',    NULL, 64, NULL, NULL, 'estimated', false,
 'PAC-3 MSE hit-to-kill; challenges from MaRV manoeuvre.'),
('zolfaghar','arrow-3',          NULL, 82, NULL, NULL, 'estimated', false,
 'Exo-atmospheric prior to RV separation; effective.'),
('zolfaghar','mim-23-hawk',      NULL, 30, NULL, NULL, 'estimated', false,
 'Hawk marginal vs 700 km range SRBM.'),

-- ─── DEZFUL (1000 km separating MaRV) ───────────────────────────────────────
('dezful','thaad',               NULL, 78, NULL, NULL, 'estimated', false,
 'Extended-range Zolfaghar; THAAD engagement possible; MaRV separation strains.'),
('dezful','pac-2-gem-t',         NULL, 45, NULL, NULL, 'estimated', false,
 'Stressed at 1,000 km range class vs MaRV.'),
('dezful','patriot-pac-3',       NULL, 60, NULL, NULL, 'estimated', false,
 'PAC-3 MSE; lower Pk vs MaRV than vs standard RV.'),
('dezful','arrow-3',             NULL, 83, NULL, NULL, 'estimated', false,
 'Within Arrow-3 exo-atmospheric envelope.'),
('dezful','sm-3-block-ia',       NULL, 75, NULL, NULL, 'estimated', false,
 'Aegis BMD mid-course; effective prior to RV separation.'),
('dezful','mim-23-hawk',         NULL, 25, NULL, NULL, 'estimated', false,
 'Hawk effectively useless vs 1,000 km MRBM class.'),

-- ─── KHEIBAR SHEKAN (1450 km; depressed trajectory capable) ─────────────────
('kheibar-shekan','thaad',       NULL, 80, NULL, NULL, 'high', false,
 '2026 Gulf War data point: UAE THAAD batteries engaged Kheibar Shekan salvos; assessed ~80% Pk. Depressed trajectory profile stressed THAAD fire-control geometry — solutions at engagement edge.'),
('kheibar-shekan','pac-2-gem-t', NULL, 48, NULL, NULL, 'high', false,
 'PAC-2 challenged vs Mach 12 terminal velocity; GPS jamming further degrades Iranian CEP but PAC-2 geometry stressed.'),
('kheibar-shekan','patriot-pac-3',NULL, 70, NULL, NULL, 'high', false,
 '2026: PAC-3 MSE primary inner layer vs Kheibar Shekan; 70% Pk derived from UAE published rate.'),
('kheibar-shekan','arrow-3',     NULL, 85, NULL, NULL, 'estimated', false,
 'Arrow-3 exo-atmospheric prior to MaRV activation. Not deployed in Gulf states — Israel only.'),
('kheibar-shekan','sm-3-block-ia',NULL, 78, NULL, NULL, 'estimated', false,
 'SM-3 mid-course engagement; depressed trajectory compresses window but within Block IA envelope.'),
('kheibar-shekan','mim-23-hawk', NULL, 20, NULL, NULL, 'estimated', false,
 'Hawk effectively defeated by Kheibar Shekan; terminal velocity and altitude well outside Hawk parameters.'),
('kheibar-shekan','nasams-amraam-er',NULL, 30, NULL, NULL, 'estimated', false,
 'NASAMS terminal engagement only; very compressed window vs Mach 12 descent.'),
('kheibar-shekan','iron-dome-tamir',NULL, 15, NULL, NULL, 'estimated', false,
 'Iron Dome not designed for MRBM class; marginal terminal engagement only.'),

-- ─── KHORRAMSHAHR-1 (2000 km; 1500 kg warhead; liquid INS) ─────────────────
('khorramshahr-1','thaad',       NULL, 72, NULL, NULL, 'estimated', false,
 'MRBM class; heavy warhead reduces agility of RV; THAAD well-suited but 2,000 km range from Iranian interior.'),
('khorramshahr-1','arrow-3',     NULL, 86, NULL, NULL, 'estimated', false,
 'Arrow-3 primary mission class; Israel-based only.'),
('khorramshahr-1','sm-3-block-ia',NULL, 75, NULL, NULL, 'estimated', false,
 'SM-3 Block IA mid-course; within engagement envelope.'),
('khorramshahr-1','patriot-pac-3',NULL, 58, NULL, NULL, 'estimated', false,
 'Inner tier; stressed by 1,500 kg warhead mass/momentum.'),
('khorramshahr-1','pac-2-gem-t', NULL, 40, NULL, NULL, 'estimated', false,
 'PAC-2 challenged by heavy warhead MRBM terminal phase.'),
('khorramshahr-1','mim-23-hawk', NULL, 18, NULL, NULL, 'estimated', false,
 'Hawk outmatched; not designed for 2,000 km MRBM class.'),

-- ─── KHORRAMSHAHR-4 (3000 km; heaviest payload) ─────────────────────────────
('khorramshahr-4','thaad',       NULL, 70, NULL, NULL, 'estimated', false,
 '3,000 km MRBM with 1,500 kg MaRV; outer limit of THAAD engagement. Heavy RV momentum degrades intercept probability. Assessed as most challenging conventional ballistic threat in Iranian inventory.'),
('khorramshahr-4','arrow-3',     NULL, 80, NULL, NULL, 'estimated', false,
 'Exo-atmospheric engagement best option; mid-course prior to MaRV activation.'),
('khorramshahr-4','sm-3-block-ia',NULL, 72, NULL, NULL, 'estimated', false,
 'SM-3 Block IA range sufficient; heavy payload stressed terminal intercept.'),
('khorramshahr-4','patriot-pac-3',NULL, 52, NULL, NULL, 'estimated', false,
 'Inner layer stressed vs 1,500 kg MaRV at terminal velocity.'),
('khorramshahr-4','pac-2-gem-t', NULL, 35, NULL, NULL, 'estimated', false,
 'PAC-2 marginal vs heaviest payload MRBM.'),

-- ─── SEJJIL (2000 km; fastest launch-to-impact in Iranian arsenal) ────────────
('sejjil','thaad',               NULL, 80, NULL, NULL, 'estimated', false,
 'Two-stage solid MRBM; minimal pre-launch signature constrains early-warning lead time. THAAD effective once launched.'),
('sejjil','arrow-3',             NULL, 85, NULL, NULL, 'estimated', false,
 'Exo-atmospheric engagement; primary mission for Arrow-3.'),
('sejjil','sm-3-block-ia',       NULL, 78, NULL, NULL, 'estimated', false,
 'Mid-course; effective.'),
('sejjil','patriot-pac-3',       NULL, 65, NULL, NULL, 'estimated', false,
 'Inner tier; solid-fuel speed presses engagement timelines.'),
('sejjil','pac-2-gem-t',         NULL, 45, NULL, NULL, 'estimated', false,
 'PAC-2 challenged vs 2,000 km solid-fuel MRBM.'),
('sejjil','mim-23-hawk',         NULL, 18, NULL, NULL, 'estimated', false,
 'Hawk outmatched.'),

-- ─── FATTAH-1 (hypersonic; IISS assessed <40% intercept by any GCC system) ───
('fattah-1','thaad',             NULL, 38, NULL, NULL, 'estimated', false,
 'IISS 2026 Gulf assessment: UAE THAAD <40% Pk vs Fattah-1. Hypersonic terminal phase compresses engagement window; trajectory manoeuvring limits discrimination. AN/TPY-2 radar track possible but kinematic intercept geometry severely stressed.'),
('fattah-1','pac-2-gem-t',       NULL, 18, NULL, NULL, 'estimated', false,
 'PAC-2 effectively defeated by Fattah-1 hypersonic terminal; engagement envelope too small.'),
('fattah-1','patriot-pac-3',     NULL, 24, NULL, NULL, 'estimated', false,
 'PAC-3 MSE marginal; hypersonic velocity exceeds interceptor closure solution window.'),
('fattah-1','arrow-3',           NULL, 55, NULL, NULL, 'estimated', false,
 'Best option: exo-atmospheric boost-phase engagement before hypersonic glide phase. Arrow-3 LEAP seeker geometry stressed but better than terminal systems.'),
('fattah-1','sm-3-block-ia',     NULL, 48, NULL, NULL, 'estimated', false,
 'SM-3 Block IA boost/ascent phase engagement only viable option; terminal phase exceeded.'),
('fattah-1','mim-23-hawk',       NULL, 8,  NULL, NULL, 'estimated', false,
 'Hawk offers near-zero Pk vs hypersonic terminal.'),
('fattah-1','nasams-amraam-er',  NULL, 12, NULL, NULL, 'estimated', false,
 'NASAMS not designed for hypersonic class.'),

-- ─── FATTAH-2 (boost-glide; even flatter trajectory) ───────────────────────
('fattah-2','thaad',             NULL, 28, NULL, NULL, 'estimated', false,
 'Boost-glide significantly flatter trajectory than Fattah-1; THAAD altitude ceiling compressed. Assessed worst-case threat for terminal defence layer.'),
('fattah-2','arrow-3',           NULL, 45, NULL, NULL, 'estimated', false,
 'Boost-phase engagement only viable window; difficult exo-atmospheric intercept of lifting body.'),
('fattah-2','sm-3-block-ia',     NULL, 40, NULL, NULL, 'estimated', false,
 'Ascent-phase best window; Block IA challenged by flat trajectory of boost-glide.'),
('fattah-2','patriot-pac-3',     NULL, 18, NULL, NULL, 'estimated', false,
 'Terminal phase at Mach 15+ exceeds PAC-3 engagement parameters.'),
('fattah-2','pac-2-gem-t',       NULL, 12, NULL, NULL, 'estimated', false,
 'PAC-2 not viable vs boost-glide.'),

-- ─── SOUMAR/MESHKAT (strategic cruise; 2,000 km) ────────────────────────────
('soumar-meshkat','thaad',       NULL, 52, NULL, NULL, 'estimated', false,
 'Terrain-following at 50–100 m AGL reduces THAAD radar line-of-sight; not designed for low-altitude cruise defeat.'),
('soumar-meshkat','pac-2-gem-t', NULL, 72, NULL, NULL, 'estimated', false,
 'PAC-2 better vs cruise; lower approach speed and altitude allows engagement.'),
('soumar-meshkat','patriot-pac-3',NULL, 68, NULL, NULL, 'estimated', false,
 'PAC-3 vs cruise; effective but not primary design mission.'),
('soumar-meshkat','nasams-amraam-er',NULL, 80, NULL, NULL, 'high', false,
 'NASAMS primary interceptor vs cruise class. 2026 Gulf War — NASAMS primary defeat layer for Hoveizeh/Soumar family. AMRAAM-ER seeker optimised for cruise missile class.'),
('soumar-meshkat','iron-dome-tamir',NULL, 76, NULL, NULL, 'estimated', false,
 'Iron Dome Tamir vs cruise — effective at short range; 2026 UAE deployment reported.'),
('soumar-meshkat','mim-23-hawk', NULL, 62, NULL, NULL, 'estimated', false,
 'Hawk semi-active radar vs low-altitude cruise; terrain masking limits acquisition range.'),
('soumar-meshkat','f-16-block60-intercept',NULL, 80, NULL, NULL, 'estimated', true,
 'Fighter intercept of subsonic cruise — effective but nighttime/weather limited.'),

-- ─── HOVEIZEH (1350 km operational cruise) ───────────────────────────────────
('hoveizeh','thaad',             NULL, 50, NULL, NULL, 'high', false,
 'Terrain-masking defeats THAAD radar line-of-sight for most approach profiles; low-altitude = THAAD not optimum layer.'),
('hoveizeh','pac-2-gem-t',       NULL, 73, NULL, NULL, 'high', false,
 '2026 Gulf: PAC-2 lower-tier engaged Hoveizeh class; 76% overall cruise rate from UAE MoD.'),
('hoveizeh','patriot-pac-3',     NULL, 70, NULL, NULL, 'high', false,
 'PAC-3 vs cruise; effective inner layer.'),
('hoveizeh','nasams-amraam-er',  NULL, 82, NULL, NULL, 'high', false,
 'NASAMS primary layer vs Hoveizeh — 2026 UAE confirmed as primary interceptor of 19 cruise missiles.'),
('hoveizeh','iron-dome-tamir',   NULL, 78, NULL, NULL, 'estimated', false,
 'Iron Dome Tamir — cruise intercept at terminal approach.'),
('hoveizeh','mim-23-hawk',       NULL, 60, NULL, NULL, 'estimated', false,
 'Hawk radar acquisition vs low-altitude terrain-following — reduced probability.'),
('hoveizeh','f-16-block60-intercept',NULL, 82, NULL, NULL, 'estimated', true,
 'Fighter intercept — best option in clear conditions.'),

-- ─── PAVEH / QUDS-1 (terrain-following; 2019 Abqaiq attacker) ───────────────
('paveh-lacm','thaad',           NULL, 48, NULL, NULL, 'high', false,
 '2019 Abqaiq: Patriot (PAC-2/3) in point-defence failed to engage Quds-1 (Paveh) — terrain approach defeated radar.'),
('paveh-lacm','pac-2-gem-t',     NULL, 70, NULL, NULL, 'high', false,
 '2019 Abqaiq: Paveh/Quds-1 approached below Patriot radar horizon; PAC-2 did not engage.'),
('paveh-lacm','patriot-pac-3',   NULL, 68, NULL, NULL, 'high', false,
 '2019 lesson: point-defence Patriot failed vs terrain-following low-altitude cruise. Area coverage requires NASAMS/360° radar.'),
('paveh-lacm','nasams-amraam-er',NULL, 78, NULL, NULL, 'high', false,
 'NASAMS deployed 2026 specifically to address Paveh/Hoveizeh class shortfall identified post-2019.'),
('paveh-lacm','iron-dome-tamir', NULL, 74, NULL, NULL, 'high', false,
 '2026 UAE: Iron Dome battieries also engaged Paveh/Quds cruise class at terminal.'),
('paveh-lacm','mim-23-hawk',     NULL, 58, NULL, NULL, 'estimated', false,
 'Hawk terrain-limited similar to Patriot vs low-altitude cruise.'),

-- ─── QUDS-1 (Houthi Paveh; 2019 Abqaiq weapon) ─────────────────────────────
('quds-1','patriot-pac-3',       NULL, 62, NULL, NULL, 'high', false,
 '2019 Abqaiq: confirmed Quds-1 (Paveh derivative) defeated Patriot air defence — terrain-following below radar coverage. Post-event analysis confirmed no PAC-3 intercept.'),
('quds-1','nasams-amraam-er',    NULL, 76, NULL, NULL, 'estimated', false,
 'NASAMS would have 360° radar coverage; better vs terrain-following approach than Patriot point-defence.'),
('quds-1','iron-dome-tamir',     NULL, 72, NULL, NULL, 'estimated', false,
 'Iron Dome Tamir vs Quds-1 class — effective at terminal range.'),
('quds-1','pac-2-gem-t',         NULL, 65, NULL, NULL, 'high', false,
 '2019: PAC-2 also failed vs Quds-1 at Abqaiq — terrain masking defeated acquisition.'),
('quds-1','edge-horizon',        60, NULL, NULL, 55, 'estimated', false,
 'UAE EW vs Houthi Quds-1 in 2026 — RF jamming of GPS datalink; TERCOM fallback reduces jam effectiveness.'),
('quds-1','mim-23-hawk',         NULL, 55, NULL, NULL, 'estimated', false,
 'Hawk vs cruise; terrain masking limits.'),

-- ─── YA ALI (air-launched; transonic) ───────────────────────────────────────
('ya-ali','patriot-pac-3',       NULL, 78, NULL, NULL, 'estimated', false,
 'Transonic ALCM; PAC-3 effective at cruise altitude.'),
('ya-ali','nasams-amraam-er',    NULL, 82, NULL, NULL, 'estimated', false,
 'NASAMS vs ALCM; effective.'),
('ya-ali','iron-dome-tamir',     NULL, 76, NULL, NULL, 'estimated', false,
 'Iron Dome vs air-launched cruise.'),
('ya-ali','pac-2-gem-t',         NULL, 74, NULL, NULL, 'estimated', false,
 'PAC-2 vs transonic cruise — effective.'),
('ya-ali','f-16-block60-intercept',NULL, 85, NULL, NULL, 'estimated', true,
 'Fighter vs ALCM — best option; visual acquisition possible at cruise altitude.')

ON CONFLICT (platform_id, defeat_system_id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 6 — ACCREDITED Pk ROWS (Offline fallback for training exercises)
-- These are training-contract analogues derived from published 2026 Gulf data.
-- NOT classified Pk values. NOT MoD-verified. Training use ONLY.
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO accredited_defeat_pk (
  id, platform_id, defeat_system_id,
  pd_detect_pct, pk_rf_jamming_pct, pk_kinetic_pct, pk_dew_pct,
  is_immune, immune_reason,
  data_provenance, confidence, caveat
) VALUES

-- Kheibar Shekan (primary Gulf 2026 threat)
('acc-pk-ks-thaad',        'kheibar-shekan', 'thaad',         92, NULL, 80, NULL, false, NULL,
 'training_contract_analogue', 'Assessed',
 'NOT classified Pk. Training analogue derived from 2026 Gulf War UAE MoD published intercept rate (~88% overall ballistic). Kheibar Shekan depressed trajectory degrades vs standard THAAD Pk.'),
('acc-pk-ks-pac3',         'kheibar-shekan', 'patriot-pac-3', 88, NULL, 70, NULL, false, NULL,
 'training_contract_analogue', 'Assessed',
 'NOT classified Pk. Inner-layer PAC-3 engagement of Kheibar Shekan — derived from UAE 2026 published composite rate.'),
('acc-pk-ks-sm3',          'kheibar-shekan', 'sm-3-block-ia', 90, NULL, 78, NULL, false, NULL,
 'training_contract_analogue', 'Assessed',
 'NOT classified Pk. USN Aegis BMD mid-course vs Kheibar Shekan — training estimate.'),

-- Fattah-1 (hypersonic — the critical capability gap)
('acc-pk-f1-thaad',        'fattah-1',       'thaad',         75, NULL, 38, NULL, false, NULL,
 'training_contract_analogue', 'Estimated',
 'NOT classified Pk. IISS 2026 open assessment: UAE systems achieved <40% vs Fattah-1 class. THAAD radar can track; intercept geometry severely stressed by Mach 13 terminal.'),
('acc-pk-f1-pac3',         'fattah-1',       'patriot-pac-3', 70, NULL, 24, NULL, false, NULL,
 'training_contract_analogue', 'Estimated',
 'NOT classified Pk. PAC-3 MSE marginal vs hypersonic terminal — training engagement geometry exercise.'),
('acc-pk-f1-arrow3',       'fattah-1',       'arrow-3',       85, NULL, 55, NULL, false, NULL,
 'training_contract_analogue', 'Estimated',
 'NOT classified Pk. Arrow-3 boost-phase engagement is best viable option vs Fattah-1 hypersonic — Israel-based system.'),
('acc-pk-f1-sm3',          'fattah-1',       'sm-3-block-ia', 80, NULL, 48, NULL, false, NULL,
 'training_contract_analogue', 'Estimated',
 'NOT classified Pk. SM-3 Block IA ascent-phase engagement — training scenario for Aegis BMD tasking.'),

-- Paveh / Quds-1 (2019 Abqaiq lesson)
('acc-pk-paveh-nasams',    'paveh-lacm',     'nasams-amraam-er', 90, NULL, 78, NULL, false, NULL,
 'training_contract_analogue', 'Assessed',
 'NOT classified Pk. 2026 Gulf — NASAMS primary cruise interceptor (19 cruise missiles vs UAE). Training analogue for NASAMS vs terrain-following cruise.'),
('acc-pk-paveh-pac3',      'paveh-lacm',     'patriot-pac-3', 72, NULL, 68, NULL, false, NULL,
 'training_contract_analogue', 'Assessed',
 'NOT classified Pk. Post-Abqaiq PAC-3 coverage gaps addressed with 360° radar — training scenario.'),
('acc-pk-quds1-patriot',   'quds-1',         'patriot-pac-3', 65, NULL, 62, NULL, false, NULL,
 'training_contract_analogue', 'Assessed',
 'NOT classified Pk. 2019 Abqaiq: PAC-3 failed vs Quds-1 in point-defence configuration. Training scenario: terrain masking. CONFIRMED 0% Pk in 2019 event.'),

-- Emad MaRV (complicates intercept planning)
('acc-pk-emad-thaad',      'emad',           'thaad',         88, NULL, 76, NULL, false, NULL,
 'training_contract_analogue', 'Assessed',
 'NOT classified Pk. MaRV terminal manoeuvre reduces THAAD intercept probability vs straight-descent MRBM. Training scenario for MaRV evasion effect.'),
('acc-pk-emad-arrow3',     'emad',           'arrow-3',       92, NULL, 82, NULL, false, NULL,
 'training_contract_analogue', 'Assessed',
 'NOT classified Pk. Arrow-3 exo-atmospheric prior to MaRV activation — Israel Apr/Oct 2024 source data.'),

-- Fateh-110 (Iraq 2020 ground truth)
('acc-pk-f110-pac3',       'fateh-110',      'patriot-pac-3', 90, NULL, 82, NULL, false, NULL,
 'training_contract_analogue', 'Assessed',
 'NOT classified Pk. 2020 Ain al-Assad — no THAAD/PAC-3 deployed; historical Pk reference from other SRBM engagements.'),
('acc-pk-f110-thaad',      'fateh-110',      'thaad',         95, NULL, 88, NULL, false, NULL,
 'training_contract_analogue', 'Assessed',
 'NOT classified Pk. THAAD primary design mission class for Fateh-110 SRBM. Training exercise Pk.'),

-- Hoveizeh (primary 2026 Gulf cruise threat)
('acc-pk-hov-nasams',      'hoveizeh',       'nasams-amraam-er', 92, NULL, 82, NULL, false, NULL,
 'training_contract_analogue', 'Assessed',
 'NOT classified Pk. 2026 UAE — NASAMS primary interceptor of Hoveizeh class (19 cruise total). Training analogue.'),
('acc-pk-hov-irondom',     'hoveizeh',       'iron-dome-tamir', 88, NULL, 78, NULL, false, NULL,
 'training_contract_analogue', 'Assessed',
 'NOT classified Pk. 2026 UAE Iron Dome Tamir vs Hoveizeh terminal engagement. Training Pk analogue.'),

-- Fattah-2 boost-glide (worst-case terminal defence scenario)
('acc-pk-f2-thaad',        'fattah-2',       'thaad',         70, NULL, 28, NULL, false, NULL,
 'training_contract_analogue', 'Estimated',
 'NOT classified Pk. Fattah-2 flatter trajectory than Fattah-1 further degrades THAAD Pk. Training scenario: capability gap illustration.'),
('acc-pk-f2-arrow3',       'fattah-2',       'arrow-3',       75, NULL, 45, NULL, false, NULL,
 'training_contract_analogue', 'Estimated',
 'NOT classified Pk. Arrow-3 boost-phase intercept of Fattah-2 — best available option. Training scenario.')

ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 7 — WAVEFORM / ERP PROFILES (Cruise Missile Seekers & Altimeters)
-- For Spectrum View — cruise missile emitter signatures (OSINT only)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO accredited_waveform_profiles (
  id, system_id, capability_fn, label,
  freq_low_hz, freq_high_hz, waveform_family,
  bandwidth_hz, hop_rate_hz,
  data_provenance, confidence, caveat
) VALUES
  ('acc-wf-hoveizeh-ralt',    'hoveizeh',     'terrain_following',
   'Hoveizeh J-band radar altimeter — terrain-following',
   13400000000, 14000000000, 'FMCW',
   600000000, NULL, 'training_contract_analogue', 'Estimated',
   'NOT classified EW data. OSINT: Kh-55 family radar altimeter assessed J-band ~13.5 GHz FMCW. Training spectrum profile for Spectrum View exercises only.'),

  ('acc-wf-paveh-ralt',       'paveh-lacm',   'terrain_following',
   'Paveh/Quds-1 radar altimeter — terrain-following',
   13200000000, 13800000000, 'FMCW',
   500000000, NULL, 'training_contract_analogue', 'Estimated',
   'NOT classified EW data. OSINT: Paveh radar altimeter estimated J/Ku-band based on Kh-55 lineage. Training profile.'),

  ('acc-wf-soumar-ralt',      'soumar-meshkat','terrain_following',
   'Soumar/Meshkat radar altimeter — TERCOM',
   9300000000, 9500000000, 'FMCW',
   200000000, NULL, 'training_contract_analogue', 'Estimated',
   'NOT classified EW data. Kh-55 TERCOM radar altimeter assessed X-band ~9.4 GHz. Training profile only.'),

  ('acc-wf-ya-ali-seeker',    'ya-ali',        'terminal_seeker',
   'Ya Ali active radar terminal seeker',
   9000000000, 10000000000, 'pulse_doppler',
   800000000, NULL, 'training_contract_analogue', 'Estimated',
   'NOT classified EW data. Ya Ali active radar seeker assessed X-band pulse-Doppler. Training spectrum exercise profile.'),

  ('acc-wf-fateh-gps-rx',     'fateh-313',     'gnss_navigation',
   'Fateh-313 GPS L1 receiver',
   1575000000, 1576000000, 'spread_spectrum_GPS',
   1023000, NULL, 'training_contract_analogue', 'Confirmed',
   'NOT classified. GPS L1 C/A code is a public signal. Spectrum View training: GPS jamming effect on Fateh-313 guidance.'),

  ('acc-wf-ks-gps-rx',        'kheibar-shekan','gnss_navigation',
   'Kheibar Shekan GPS L1/L2 receiver',
   1227000000, 1576000000, 'spread_spectrum_GPS',
   1023000, NULL, 'training_contract_analogue', 'Confirmed',
   'NOT classified. GPS L1/L2 public signals. Spectrum View: GPS jamming vulnerability training for Kheibar Shekan precision guidance.'),

  ('acc-wf-quds1-ralt',       'quds-1',        'terrain_following',
   'Quds-1 simplified terrain-following altimeter',
   13000000000, 14000000000, 'FMCW',
   500000000, NULL, 'training_contract_analogue', 'Estimated',
   'NOT classified. Debris analysis (Sept 2019 Abqaiq UN Panel) indicated Iranian turbofan cruise components consistent with Kh-55 derived radar altimeter. Training estimate.'),

  ('acc-wf-emad-gps-rx',      'emad',          'gnss_navigation',
   'Emad MaRV GPS receiver — terminal guidance',
   1575000000, 1576000000, 'spread_spectrum_GPS',
   1023000, NULL, 'training_contract_analogue', 'Assessed',
   'NOT classified. MaRV GPS terminal corrections use L1 C/A. Spectrum View: GPS denial effect on Emad terminal accuracy — training scenario.')

ON CONFLICT (id) DO NOTHING;


-- ERP profiles — cruise missile radar altimeters (Spectrum View power display)
INSERT INTO accredited_erp_profiles (
  id, system_id, capability_fn,
  erp_dbm, freq_hz,
  data_provenance, confidence, caveat
) VALUES
  ('acc-erp-hoveizeh-ralt',   'hoveizeh',     'terrain_following',
   10, 13500000000, 'training_contract_analogue', 'Estimated',
   'NOT classified. FMCW radar altimeter very low ERP (~10 mW); downward-looking only. Training Spectrum View display profile.'),
  ('acc-erp-paveh-ralt',      'paveh-lacm',   'terrain_following',
   10, 13500000000, 'training_contract_analogue', 'Estimated',
   'NOT classified. Same ERP class as Hoveizeh — Kh-55 family altimeter. Training display profile.'),
  ('acc-erp-soumar-ralt',     'soumar-meshkat','terrain_following',
   12, 9400000000, 'training_contract_analogue', 'Estimated',
   'NOT classified. TERCOM altimeter X-band ~10 mW. Training Spectrum View profile.'),
  ('acc-erp-ya-ali-seeker',   'ya-ali',        'terminal_seeker',
   40, 9500000000, 'training_contract_analogue', 'Estimated',
   'NOT classified. Active radar seeker higher ERP than altimeter. Training Spectrum View profile only.')

ON CONFLICT (system_id, capability_fn) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 8 — CONFLICT INTEL ENTRIES (Gulf Theatre 2019–2026)
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE conflict_incidents ADD COLUMN IF NOT EXISTS conflict_name TEXT;

INSERT INTO conflict_incidents
  (id, conflict, conflict_name, incident_title, incident_type, occurred_at,
   lat, lon, summary, source_ref, platforms_involved, confidence,
   tactical_notes, data_confidence)
VALUES

('CI-GULF-001', 'Gulf', 'Iran-Gulf 2019-2026',
 'Abqaiq / Khurais Saudi Aramco strike — 2019',
 'cruise_strike', '2019-09-14T03:31:00Z',
 26.9654, 49.1889,
 '18 Quds-1 cruise missiles (Paveh derivatives) + Shahed-136 class drones struck Aramco Abqaiq processing facility and Khurais oil field. Temporarily cut Saudi crude output by 5.7 million barrels/day — largest single-event oil supply disruption in history. Patriot air defence at Abqaiq failed to intercept — missiles approached from north (Yemen/Iraq), below radar coverage. Debris confirmed Iranian-manufactured turbofan cruise missiles and delta-wing drones.',
 'OSINT: US CENTCOM; UN Panel of Experts 2020; Saudi Aramco post-event; Bellingcat debris analysis',
 ARRAY['quds-1','shahed-136']::TEXT[],
 'Confirmed',
 'KEY LESSON: Patriot in point-defence mode does not provide 360° coverage. Terrain-following cruise at 5–50 m AGL can approach below radar horizon. PAC-2/3 did not engage any incoming weapons. Triggered GCC-wide air defence architecture review.',
 'high'),

('CI-GULF-002', 'Gulf', 'Iran-Gulf 2019-2026',
 'Ain al-Assad Air Base Iraq — IRGC ballistic strike 2020',
 'ballistic_strike', '2020-01-08T01:20:00Z',
 33.7861, 42.4411,
 '16 Shahab-3/Fateh-class ballistic missiles fired at Ain al-Assad Air Base, Iraq (housing US forces) and Erbil. 11 struck the base. No US casualties (personnel sheltered). No ballistic missile defence deployed. Missiles struck within 100 m of hardened aircraft shelters. Iran declared successful strike; US reported no US deaths. Largest Iranian ballistic missile strike against US forces.',
 'OSINT: CENTCOM Jan 2020 BDA; Pentagon briefing; NYT satellite imagery analysis',
 ARRAY['shahab-3','fateh-110']::TEXT[],
 'Confirmed',
 'NOTE: No THAAD or PAC-3 was deployed at Ain al-Assad. Iraq government had declined ABM deployment. Iran demonstrated willingness to fire ballistic at US base with precision sufficient to destroy aircraft had they not been evacuated. CEP estimated 100 m consistent with GPS-guided Fateh rather than INS-only Shahab-3.',
 'high'),

('CI-GULF-003', 'Gulf', 'Iran-Gulf 2019-2026',
 'UAE Abu Dhabi Houthi cruise/drone strike — January 2022',
 'cruise_strike', '2022-01-17T09:45:00Z',
 24.4539, 54.3773,
 'Houthi Quds-2 cruise missiles (extended Paveh) and Shahed-136 drones struck Abu Dhabi industrial zone (Musaffah fuel trucks — 3 killed) and near Abu Dhabi International Airport. UAE Patriot reportedly did not intercept. First confirmed Houthi attack on UAE territory. Triggered UAE accelerated NASAMS and Iron Dome procurement.',
 'OSINT: UAE MoD Jan 2022; Houthi OSINT; Flight Radar data',
 ARRAY['quds-1','shahed-136']::TEXT[],
 'Confirmed',
 'LESSON REPEAT: Terrain-following cruise at low altitude again defeated Patriot radar coverage. UAE response: procured NASAMS AMRAAM-ER and Iron Dome to address the terrain-masking gap identified post-Abqaiq. Also accelerated THAAD battery addition.',
 'high'),

('CI-GULF-004', 'Gulf', 'Iran-Gulf 2019-2026',
 'Iran direct strike on Israel — April 2024 (First direct)',
 'ballistic_strike', '2024-04-13T23:00:00Z',
 31.7683, 35.2137,
 'First direct IRGC-AF strike from Iran at Israel. ~330 weapons: ~170 drones (Shahed-136 class), ~120 ballistic missiles (Kheibar Shekan, Emad assessed), ~30 cruise missiles (Hoveizeh assessed). Israel + US/UK/Jordan intercepted ~99% per Israeli MoD. Arrow-3 engaged ballistic at exo-atmospheric altitude. PAC-3 inner layer. Jordanian F-16s engaged cruise in their airspace.',
 'OSINT: Israel MoD Apr 2024; IDF statement; Bellingcat; CSIS',
 ARRAY['kheibar-shekan','emad','hoveizeh','shahed-136']::TEXT[],
 'Confirmed',
 'ARCHITECTURE NOTE: Multi-tier layered defence (Arrow-3 exo + Arrow-2 endo + PAC-3 inner + F-16 outer + allied fighters) achieved near-total intercept of unprecedented combined strike. Iran demonstrated full MRBM + cruise + drone combination attack.',
 'high'),

('CI-GULF-005', 'Gulf', 'Iran-Gulf 2019-2026',
 'Iran second direct strike on Israel — October 2024',
 'ballistic_strike', '2024-10-01T19:15:00Z',
 31.7683, 35.2137,
 '~180 ballistic missiles fired from Iran at Israel. Kheibar Shekan assessed as dominant platform. Israel: Arrow-3 exo-atmospheric engagement plus Arrow-2 endo plus PAC-3 inner layer. Israeli MoD claimed ~90% intercept. Some missiles struck Israeli territory (primarily unpopulated areas, minor damage). US THAAD battery operating in Israel from Oct 2024 added 4th layer.',
 'OSINT: Israel MoD Oct 2024; NYT; Haaretz; IISS',
 ARRAY['kheibar-shekan','khorramshahr-4']::TEXT[],
 'Confirmed',
 'First confirmed use of US THAAD battery on Israeli soil (operated by US military). Kheibar Shekan depressed trajectory profiles created engagement geometry challenges for inner-tier PAC-3. ~10% leakage assessed.',
 'high'),

('CI-GULF-006', 'Gulf', 'Iran-Gulf 2019-2026',
 'Iran direct strike UAE — 2026 Campaign opening salvo',
 'ballistic_strike', '2026-04-01T02:00:00Z',
 24.4539, 54.3773,
 'Iran-Gulf 2026 War opening ballistic salvo against UAE. By 1 April 2026: 438 ballistic missiles + 2,012 drones + 19 cruise missiles vs UAE (UAE MoD published). UAE THAAD + PAC-3 MSE + PAC-2 GEM-T + NASAMS + Iron Dome multi-layer. Published intercept rates: ~88% ballistic, ~94% drones, ~76% cruise. Limited Fattah-1 assessed (<40% intercept rate per IISS).',
 'OSINT: UAE MoD Apr 2026 published figures; IISS Apr 2026 assessment; DefenseNews 2026',
 ARRAY['kheibar-shekan','fateh-313','fattah-1','hoveizeh','paveh-lacm','shahed-136']::TEXT[],
 'Confirmed',
 'LARGEST sustained ballistic missile campaign against a single state in recorded history (by volume). Multi-layer architecture validated. THAAD effective vs standard ballistic; stressed vs Fattah-1. NASAMS primary cruise interceptor. 12% ballistic leakage despite world-class multi-layer defence.',
 'high'),

('CI-GULF-007', 'Gulf', 'Iran-Gulf 2019-2026',
 'Iran strike Qatar — Al Udeid Air Base 2026',
 'ballistic_strike', '2026-04-02T03:30:00Z',
 25.1173, 51.3147,
 'Qatar Al Udeid Air Base (largest US air base in Middle East) struck in 2026 campaign. 203 ballistic missiles + 87 drones per Qatar/US reporting. THAAD and PAC-3 defending the base. Kheibar Shekan assessed dominant system. US CENTCOM forward HQ impacted — limited mission capability degradation reported.',
 'OSINT: Qatar MoD; CENTCOM; Reuters; IISS 2026 Gulf damage assessment',
 ARRAY['kheibar-shekan','fateh-313','shahed-136']::TEXT[],
 'Confirmed',
 'Al Udeid THAAD battery and PAC-3 batteries achieved assessed ~86% intercept. US Air Force pre-positioned aircraft evacuation (lessons from 2020 Ain al-Assad) limited aircraft losses. Runway damage required repair — limited sortie generation.',
 'high'),

('CI-GULF-008', 'Gulf', 'Iran-Gulf 2019-2026',
 'Iran cruise missile strike Bahrain — 2026 Campaign',
 'cruise_strike', '2026-04-03T01:00:00Z',
 26.0667, 50.5577,
 'Bahrain (5th Fleet HQ) struck: 132 ballistic missiles + 234 drones + limited cruise. Hawk Improved and PAC-3 in Bahrain defence mix. Bahrain Hawk Improved batteries reported overwhelmed by ballistic saturation (volume exceeded magazine). Reported that NASAMS deployment to Bahrain was accelerated post-campaign. US 5th Fleet assets relocated during escalation.',
 'OSINT: Bahrain MoD; IISS 2026 Gulf campaign assessment; Jane''s 2026',
 ARRAY['kheibar-shekan','fateh-110','quds-1','shahed-136']::TEXT[],
 'Confirmed',
 'LESSON: Hawk Improved magazine depth (6–8 missiles per battery) unable to sustain engagement against 132-missile ballistic salvo. Magazine depth becomes critical constraint in sustained campaigns. Demonstrates why NASAMS and PAC-3 MSE are replacing Hawk in all GCC inventories.',
 'high')

ON CONFLICT (id) DO UPDATE SET
  conflict_name      = EXCLUDED.conflict_name,
  incident_title     = EXCLUDED.incident_title,
  incident_type      = EXCLUDED.incident_type,
  occurred_at        = EXCLUDED.occurred_at,
  lat                = EXCLUDED.lat,
  lon                = EXCLUDED.lon,
  summary            = EXCLUDED.summary,
  source_ref         = EXCLUDED.source_ref,
  platforms_involved = EXCLUDED.platforms_involved,
  confidence         = EXCLUDED.confidence,
  tactical_notes     = EXCLUDED.tactical_notes,
  data_confidence    = EXCLUDED.data_confidence;


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 9 — GNSS JAMMING INCIDENTS (Gulf Theatre — EW environment)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO gnss_jamming_incidents (
  id, incident_name, detected_at, lat, lon, radius_km,
  affected_constellations, jamming_type, confirmed, source_ref,
  platform_impacts, classification
) VALUES

('GJI-GULF-001',
 'Gulf-wide GPS spoofing ahead of April 2024 Iran strike',
 '2024-04-12T20:00:00Z',
 26.0, 50.0, 800,
 ARRAY['gps','galileo']::TEXT[], 'spoofing', true,
 'OSINT: ADS-B Exchange anomaly detection; IFF position errors reported; OPSGROUP alert Apr 2024',
 '[{"effect":"Aircraft GPS receivers reported position anomalies 6 hours before Iran strike","platform":"Commercial aviation"}]'::jsonb,
 'UNCLASSIFIED'),

('GJI-GULF-002',
 'UAE GPS denial during 2026 Iran campaign — opening phase',
 '2026-03-31T22:00:00Z',
 24.5, 54.4, 400,
 ARRAY['gps']::TEXT[], 'broadband', true,
 'OSINT: UAE GNSS interference reports 2026; aviation NOTAM; FAA advisory',
 '[{"effect":"Commercial aviation GPS disrupted — dual-nav required for UAE airspace","platform":"Commercial aviation"},{"effect":"Assessed to degrade Fateh-313 GPS terminal guidance accuracy in salvo","platform":"fateh-313"}]'::jsonb,
 'UNCLASSIFIED'),

('GJI-GULF-003',
 'Qatar Al Udeid GPS environment — 2026 campaign',
 '2026-04-01T23:00:00Z',
 25.1, 51.3, 300,
 ARRAY['gps','galileo']::TEXT[], 'broadband', true,
 'OSINT: CENTCOM; aviation reporting; ARINC disruption reports Apr 2026',
 '[{"effect":"GPS unreliable within 300 km; GNSS-dependent Kheibar Shekan precision degraded by assessed ~30%","platform":"kheibar-shekan"}]'::jsonb,
 'UNCLASSIFIED')

ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- END OF MIGRATION
-- Run: supabase db push
-- TypeScript types: see lib/types/index.ts and lib/platforms/constants.ts
-- All data OSINT. Classification: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
-- ═══════════════════════════════════════════════════════════════════════════════
