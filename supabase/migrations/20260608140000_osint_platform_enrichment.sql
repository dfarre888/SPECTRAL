-- ═══════════════════════════════════════════════════════════════════
-- SPECTRAL — OSINT platform enrichment (Jun 2026)
-- Sources: Deagel, OSMP, Airforce Technology, SPECTRAL_INTEL_UPDATE_2025
-- CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
-- ═══════════════════════════════════════════════════════════════════

-- ─── Extended kinematics / procurement fields ───────────────────────
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS length_m NUMERIC;
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS wingspan_m NUMERIC;
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS height_m NUMERIC;
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS unit_cost_usd BIGINT;
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS ioc_year SMALLINT;
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS terminal_speed_kmh SMALLINT;
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS armor_piercing_mm SMALLINT;
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS engine_type TEXT;

-- ─── OSINT updates — Confirmed / Assessed per source tier ─────────

-- Bayraktar TB2 — OSINT: Deagel (Assessed Jun 2026)
UPDATE platforms SET
  mtow_kg = 650,
  length_m = 6.5,
  wingspan_m = 12,
  height_m = 2.2,
  unit_cost_usd = 5000000,
  ioc_year = 2016,
  engine_type = 'Rotax 912 iS (piston, pusher)',
  endurance_hrs = 27,
  sources = array_cat(sources, ARRAY['OSINT: Deagel — Assessed Jun 2026'])
WHERE id = 'tb2-bayraktar';

-- ZALA Lancet-3 — OSINT: Deagel (Assessed Jun 2026)
UPDATE platforms SET
  max_speed_kmh = 110,
  terminal_speed_kmh = 300,
  armor_piercing_mm = 300,
  endurance_hrs = 0.67,
  ioc_year = 2019,
  sources = array_cat(sources, ARRAY['OSINT: Deagel Lancet — Assessed Jun 2026'])
WHERE id = 'lancet-3';

-- Shahed-136 — OSINT: OSMP (Confirmed dimensions; warhead variant range)
UPDATE platforms SET
  length_m = 3.5,
  wingspan_m = 2.5,
  engine_type = 'Mado MD550 Wankel rotary',
  stealth_features = array_cat(
    COALESCE(stealth_features, ARRAY[]::TEXT[]),
    ARRAY['Honeycomb composite RCS reduction (OSMP)']
  ),
  sources = array_cat(sources, ARRAY['OSINT: OSMP Shahed-136 — Confirmed Jun 2026'])
WHERE id = 'shahed-136';

-- MQ-9 Reaper — OSINT: Airforce Technology (Assessed)
UPDATE platforms SET
  sensor_suite = array_cat(
    COALESCE(sensor_suite, ARRAY[]::TEXT[]),
    ARRAY['Lynx SAR/GMTI','ASIP SIGINT','RDESS ESM']
  ),
  sources = array_cat(sources, ARRAY['OSINT: Airforce Technology MQ-9 — Assessed Jun 2026'])
WHERE id = 'mq-9-reaper';

-- TB-001 — combat envelope note (ferry vs operational)
UPDATE platforms SET
  sources = array_cat(sources, ARRAY['OSINT: SPECTRAL range model — combat radius ~1500 km from 6000 km ferry'])
WHERE id = 'tb-001';

-- Wing Loong II — OSINT: SPECTRAL_INTEL_UPDATE_2025 (Confirmed)
UPDATE platforms SET
  ioc_year = 2018,
  engine_type = 'piston (turboprop-class, assessed)',
  sources = array_cat(sources, ARRAY['OSINT: CAIG Wing Loong II export specs — Confirmed'])
WHERE id = 'wing-loong-2';

-- Kargu-2 — already in intel update; add spectrum-relevant note
UPDATE platforms SET
  ai_autonomous = true,
  swarm_capable = true
WHERE id = 'kargu-2';

-- ─── Spectrum capabilities — platforms missing DB coverage ────────
-- Append only where no row exists for (platform_id, function, label)

-- TB2 Bayraktar
INSERT INTO spectrum_capabilities (platform_id, side, layer, function, label, freq_low_hz, freq_high_hz, note, doctrine_role, sort_order)
SELECT v.* FROM (VALUES
  ('tb2-bayraktar', 'red', 'comms', 'datalink', 'C-band LOS datalink', 4000000000::BIGINT, 8000000000::BIGINT, 'OSINT: Baykar LOS C2 — 150 km class', 'ED', 1),
  ('tb2-bayraktar', 'red', 'navigation', 'navigation', 'GNSS L1 GPS', 1574420000::BIGINT, 1576420000::BIGINT, 'Primary nav', 'ED', 2),
  ('tb2-bayraktar', 'red', 'navigation', 'navigation', 'GLONASS G1', 1598000000::BIGINT, 1606000000::BIGINT, 'Secondary nav', 'ED', 3)
) AS v(platform_id, side, layer, function, label, freq_low_hz, freq_high_hz, note, doctrine_role, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM spectrum_capabilities sc
  WHERE sc.platform_id = v.platform_id AND sc.function = v.function AND sc.label = v.label
);

INSERT INTO spectrum_capabilities (platform_id, side, layer, function, label, wavelength_low_um, wavelength_high_um, note, doctrine_role, sort_order)
SELECT v.* FROM (VALUES
  ('tb2-bayraktar', 'red', 'eo_ir', 'sensor', 'EO/IR gimbal (MWIR)', 3.0::NUMERIC, 5.0::NUMERIC, 'OSINT: Baykar EO/IR payload', 'ED', 4),
  ('tb2-bayraktar', 'red', 'eo_ir', 'laser', 'Laser designator 1.06 µm', 1.06::NUMERIC, 1.06::NUMERIC, 'MAM-L guidance', 'ED', 5)
) AS v(platform_id, side, layer, function, label, wavelength_low_um, wavelength_high_um, note, doctrine_role, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM spectrum_capabilities sc
  WHERE sc.platform_id = v.platform_id AND sc.function = v.function AND sc.label = v.label
);

-- Lancet-3
INSERT INTO spectrum_capabilities (platform_id, side, layer, function, label, freq_low_hz, freq_high_hz, note, doctrine_role, sort_order)
SELECT v.* FROM (VALUES
  ('lancet-3', 'red', 'comms', 'control', 'C2 — 2.4 GHz', 2400000000::BIGINT, 2483500000::BIGINT, 'OSINT: Deagel — 40 km range', 'ED', 1),
  ('lancet-3', 'red', 'comms', 'video', 'Video — 5.8 GHz', 5725000000::BIGINT, 5875000000::BIGINT, 'Real-time terminal video', 'ED', 2),
  ('lancet-3', 'red', 'navigation', 'navigation', 'GLONASS G1', 1598000000::BIGINT, 1606000000::BIGINT, 'Mid-course nav', 'ED', 3)
) AS v(platform_id, side, layer, function, label, freq_low_hz, freq_high_hz, note, doctrine_role, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM spectrum_capabilities sc
  WHERE sc.platform_id = v.platform_id AND sc.function = v.function AND sc.label = v.label
);

INSERT INTO spectrum_capabilities (platform_id, side, layer, function, label, wavelength_low_um, wavelength_high_um, note, defeat_resistance, doctrine_role, sort_order)
SELECT v.* FROM (VALUES
  ('lancet-3', 'red', 'eo_ir', 'sensor', 'EO terminal seeker', 0.4::NUMERIC, 0.7::NUMERIC, 'OSINT: 300 km/h terminal — 300 mm AP', ARRAY['gnss_denied_capable']::TEXT[], 'ED', 4)
) AS v(platform_id, side, layer, function, label, wavelength_low_um, wavelength_high_um, note, defeat_resistance, doctrine_role, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM spectrum_capabilities sc
  WHERE sc.platform_id = v.platform_id AND sc.function = v.function AND sc.label = v.label
);

-- MQ-9 enrichment (ASIP / RDESS / Ku SATCOM correction)
INSERT INTO spectrum_capabilities (platform_id, side, layer, function, label, freq_low_hz, freq_high_hz, note, doctrine_role, sort_order)
SELECT v.* FROM (VALUES
  ('mq-9-reaper', 'red', 'comms', 'datalink', 'Ku-band SATCOM (primary C2)', 12000000000::BIGINT, 18000000000::BIGINT, 'OSINT: Airforce Technology — BLOS C2', 'ED', 10),
  ('mq-9-reaper', 'red', 'comms', 'sensor', 'ASIP SIGINT (passive)', 500000000::BIGINT, 18000000000::BIGINT, 'OSINT: Northrop ASIP wideband', 'ES', 11),
  ('mq-9-reaper', 'red', 'comms', 'sensor', 'RDESS passive ESM', 100000000::BIGINT, 6000000000::BIGINT, 'OSINT: Reaper Defense ESM', 'ES', 12),
  ('mq-9-reaper', 'red', 'comms', 'control', 'UHF/VHF radio relay', 225000000::BIGINT, 400000000::BIGINT, 'OSINT: USAF fact sheet', 'ED', 13)
) AS v(platform_id, side, layer, function, label, freq_low_hz, freq_high_hz, note, doctrine_role, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM spectrum_capabilities sc
  WHERE sc.platform_id = v.platform_id AND sc.function = v.function AND sc.label = v.label
);

-- Intel-update platforms (representative spectrum stubs)
INSERT INTO spectrum_capabilities (platform_id, side, layer, function, label, freq_low_hz, freq_high_hz, note, doctrine_role, sort_order)
SELECT v.* FROM (VALUES
  ('uj-22-airborne', 'red', 'navigation', 'navigation', 'GPS L1', 1574420000::BIGINT, 1576420000::BIGINT, 'OSINT: UkrJet — INS+GPS', 'ED', 1),
  ('uj-22-airborne', 'red', 'comms', 'control', 'LOS C2 — UHF', 860000000::BIGINT, 920000000::BIGINT, 'Assessed datalink', 'ED', 2),
  ('baba-yaga', 'red', 'comms', 'control', 'C2 — 2.4 GHz', 2400000000::BIGINT, 2483500000::BIGINT, 'OSINT: Field hexacopter', 'ED', 1),
  ('baba-yaga', 'red', 'navigation', 'navigation', 'GPS L1', 1574420000::BIGINT, 1576420000::BIGINT, 'Primary nav', 'ED', 2),
  ('v2u', 'red', 'navigation', 'navigation', 'Visual/LiDAR (no GNSS)', NULL::BIGINT, NULL::BIGINT, 'GNSS-independent — RF jamming limited', 'ED', 1),
  ('kargu-2', 'red', 'comms', 'control', 'C2 — 2.4 GHz', 2400000000::BIGINT, 2483500000::BIGINT, 'OSINT: STM — swarm capable', 'ED', 1),
  ('kargu-2', 'red', 'navigation', 'navigation', 'GPS L1', 1574420000::BIGINT, 1576420000::BIGINT, 'Transit nav', 'ED', 2),
  ('wing-loong-2', 'red', 'comms', 'datalink', 'Ku-band SATCOM', 12000000000::BIGINT, 18000000000::BIGINT, 'OSINT: CAIG BLOS', 'ED', 1),
  ('wing-loong-2', 'red', 'navigation', 'navigation', 'BeiDou B1', 1560098000::BIGINT, 1562098000::BIGINT, 'Primary PRC nav', 'ED', 2),
  ('ch-4-rainbow', 'red', 'comms', 'datalink', 'Ku-band SATCOM', 12000000000::BIGINT, 18000000000::BIGINT, 'OSINT: CASC MALE', 'ED', 1),
  ('tb-001', 'red', 'comms', 'datalink', 'Ku-band SATCOM + LOS', 12000000000::BIGINT, 18000000000::BIGINT, 'OSINT: AVIC Twin-Tailed Scorpion', 'ED', 1),
  ('tb-001', 'red', 'navigation', 'navigation', 'BeiDou B1 + GPS L1', 1560098000::BIGINT, 1576420000::BIGINT, 'Dual constellation', 'ED', 2)
) AS v(platform_id, side, layer, function, label, freq_low_hz, freq_high_hz, note, doctrine_role, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM spectrum_capabilities sc
  WHERE sc.platform_id = v.platform_id AND sc.function = v.function AND sc.label = v.label
);

-- Blue effectors — HEL / kinetic spectrum stubs
INSERT INTO spectrum_capabilities (defeat_system_id, side, layer, function, label, wavelength_low_um, wavelength_high_um, note, doctrine_role, sort_order)
SELECT v.* FROM (VALUES
  ('iron-beam', 'blue', 'eo_ir', 'laser_defeat', '100 kW-class HEL', 1.0::NUMERIC, 1.07::NUMERIC, 'OSINT: Rafael — ~4 km vs Group 1–2', 'EA', 1),
  ('dragonfire', 'blue', 'eo_ir', 'laser_defeat', '50 kW+ HEL demonstrator', 1.0::NUMERIC, 1.07::NUMERIC, 'OSINT: RN contract — assessed 3 km', 'EA', 1),
  ('coyote-block-3', 'blue', 'comms', 'sensor', 'Passive RF seeker', 400000000::BIGINT, 6000000000::BIGINT, 'Hunts emitter — limited vs RF-silent', 'EA', 1)
) AS v(defeat_system_id, side, layer, function, label, wavelength_low_um, wavelength_high_um, note, doctrine_role, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM spectrum_capabilities sc
  WHERE sc.defeat_system_id = v.defeat_system_id AND sc.function = v.function AND sc.label = v.label
);
