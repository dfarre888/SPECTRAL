-- ═══════════════════════════════════════════════════════════════════
-- SPECTRAL — Spectrum capabilities (EW Spectrum Map)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE platform_variants (
  id                  TEXT PRIMARY KEY,
  platform_id         TEXT NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
  label               TEXT NOT NULL,
  effective_from      DATE,
  intelligence_note   TEXT
);

CREATE TABLE spectrum_capabilities (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id         TEXT REFERENCES platforms(id) ON DELETE CASCADE,
  variant_id          TEXT REFERENCES platform_variants(id) ON DELETE CASCADE,
  defeat_system_id    TEXT REFERENCES anti_drone_systems(id) ON DELETE CASCADE,
  side                TEXT NOT NULL CHECK (side IN ('red', 'blue')),
  layer               TEXT NOT NULL CHECK (layer IN ('comms', 'navigation', 'radar', 'eo_ir', 'cbrn')),
  function            TEXT NOT NULL,
  label               TEXT NOT NULL,
  freq_low_hz         BIGINT,
  freq_high_hz        BIGINT,
  wavelength_low_um   NUMERIC,
  wavelength_high_um  NUMERIC,
  note                TEXT,
  defeat_resistance   TEXT[] DEFAULT '{}',
  doctrine_role       TEXT CHECK (doctrine_role IN ('EA', 'ED', 'ES')),
  sort_order          INT DEFAULT 0,
  CONSTRAINT spectrum_cap_parent CHECK (
    (platform_id IS NOT NULL AND defeat_system_id IS NULL)
    OR (defeat_system_id IS NOT NULL AND platform_id IS NULL)
    OR (variant_id IS NOT NULL)
  )
);

CREATE INDEX idx_spectrum_cap_platform ON spectrum_capabilities(platform_id);
CREATE INDEX idx_spectrum_cap_variant ON spectrum_capabilities(variant_id);
CREATE INDEX idx_spectrum_cap_defeat ON spectrum_capabilities(defeat_system_id);
CREATE INDEX idx_spectrum_cap_layer ON spectrum_capabilities(layer);

ALTER TABLE platform_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE spectrum_capabilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_variants" ON platform_variants
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_spectrum_caps" ON spectrum_capabilities
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "public_read_variants" ON platform_variants
  FOR SELECT USING (true);
CREATE POLICY "public_read_spectrum_caps" ON spectrum_capabilities
  FOR SELECT USING (true);

-- ─── GNSS constellations (L-band reference) ───────────────────────
INSERT INTO gnss_constellations (
  id, full_name, operator_country, frequency_bands, constellation_size,
  accuracy_standard_m, accuracy_rtk_m, military_signal, spoofing_resistance, jamming_vulnerability, notes
) VALUES
  ('gps', 'GPS (Navstar)', 'United States',
   '[{"name":"L1 C/A","mhz":1575.42,"bandwidth_mhz":2.046,"signal_type":"civil"},{"name":"L2","mhz":1227.60,"bandwidth_mhz":20,"signal_type":"military"},{"name":"L5","mhz":1176.45,"bandwidth_mhz":10,"signal_type":"civil"}]'::jsonb,
   31, 3.5, 0.02, true, 'medium', 'high', 'Primary Western GNSS — ARNS-protected L1/L5'),
  ('glonass', 'GLONASS', 'Russia',
   '[{"name":"G1","mhz":1602,"bandwidth_mhz":8,"signal_type":"FDMA"},{"name":"G2","mhz":1246,"bandwidth_mhz":8,"signal_type":"military"}]'::jsonb,
   24, 5.0, NULL, true, 'low', 'high', 'FDMA L1 band — radiolocation-shared G2'),
  ('galileo', 'Galileo', 'European Union',
   '[{"name":"E1","mhz":1575.42,"bandwidth_mhz":2.046,"signal_type":"civil"},{"name":"E5a","mhz":1176.45,"bandwidth_mhz":10,"signal_type":"civil"},{"name":"E6","mhz":1278.75,"bandwidth_mhz":40,"signal_type":"commercial"}]'::jsonb,
   28, 1.0, 0.01, true, 'high', 'medium', 'Multi-frequency civil GNSS'),
  ('beidou', 'BeiDou', 'China',
   '[{"name":"B1","mhz":1561.098,"bandwidth_mhz":4,"signal_type":"civil"},{"name":"B2","mhz":1207.14,"bandwidth_mhz":20,"signal_type":"civil"},{"name":"B3","mhz":1268.52,"bandwidth_mhz":20,"signal_type":"military"}]'::jsonb,
   35, 3.0, 0.02, true, 'medium', 'high', 'Regional + global constellation'),
  ('qzss', 'QZSS (Michibiki)', 'Japan',
   '[{"name":"L1","mhz":1575.42,"bandwidth_mhz":2,"signal_type":"civil"},{"name":"L6 LEX","mhz":1278.75,"bandwidth_mhz":20,"signal_type":"augmentation"}]'::jsonb,
   4, 2.0, 0.01, false, 'medium', 'medium', 'GPS overlay — regional augmentation'),
  ('navic', 'NavIC (IRNSS)', 'India',
   '[{"name":"L5","mhz":1176.45,"bandwidth_mhz":10,"signal_type":"civil"},{"name":"S-band","mhz":2492.028,"bandwidth_mhz":16,"signal_type":"military"}]'::jsonb,
   7, 5.0, NULL, true, 'medium', 'high', 'Regional Indian GNSS')
ON CONFLICT (id) DO UPDATE SET
  frequency_bands = EXCLUDED.frequency_bands,
  notes = EXCLUDED.notes;

-- ─── Platform variants (Shahed evolution arc) ─────────────────────
INSERT INTO platform_variants (id, platform_id, label, effective_from, intelligence_note) VALUES
  ('shahed-136-gen0', 'shahed-136', 'Gen 0 — GNSS + INS only', '2022-09-01',
   'Pure GNSS + INS pre-programmed flight. NAVWAR effective.'),
  ('shahed-136-gen1', 'shahed-136', 'Gen 1 — Multi-constellation GNSS', '2023-06-01',
   'Upgraded GNSS module — L5 and multi-constellation hardening.'),
  ('shahed-136-gen2', 'shahed-136', 'Gen 2 — Cellular RTK', '2024-03-01',
   '3G/LTE modem for RTK corrections within cellular coverage.'),
  ('shahed-136-gen3', 'shahed-136', 'Gen 3 — CRPA anti-jam', '2024-11-01',
   '8-element CRPA — GNSS jamming degraded.'),
  ('shahed-136-gen4', 'shahed-136', 'Gen 4 — Edge-AI terminal guidance', '2025-06-01',
   'Jetson Orin + IR camera — terminal phase GNSS-independent. No RF C2 link.')
ON CONFLICT (id) DO NOTHING;

-- ─── Helper: standard ISM / drone band constants (Hz) ─────────────
-- 433: 433050000–434790000
-- 915: 902000000–928000000
-- GNSS L-band: 1160000000–1610000000
-- 2.4G: 2400000000–2483500000
-- 5.8G: 5725000000–5875000000

-- Skydio X10D (C8 DJI-class stand-in)
INSERT INTO spectrum_capabilities (platform_id, side, layer, function, label, freq_low_hz, freq_high_hz, note, doctrine_role, sort_order) VALUES
  ('skydio-x10d', 'red', 'comms', 'control', 'C2 2.4 GHz (Skydio Link)', 2400000000, 2483500000, 'OSINT: Blue UAS — 2.4 GHz control', 'ED', 1),
  ('skydio-x10d', 'red', 'comms', 'video', 'Video 5.8 GHz', 5725000000, 5875000000, 'OSINT: FPV/telemetry downlink band', 'ED', 2),
  ('skydio-x10d', 'red', 'navigation', 'navigation', 'GNSS L1 (GPS/Galileo)', 1565000000, 1585000000, 'Multi-constellation L1', 'ED', 3),
  ('skydio-x10d', 'red', 'navigation', 'navigation', 'GNSS L2', 1217000000, 1237000000, 'GPS L2', 'ED', 4);

-- fpv-fibre-optic: NO comms/GNSS — EO/IR stub only
INSERT INTO spectrum_capabilities (platform_id, side, layer, function, label, wavelength_low_um, wavelength_high_um, note, defeat_resistance, doctrine_role, sort_order) VALUES
  ('fpv-fibre-optic', 'red', 'eo_ir', 'sensor', 'EO FPV camera (visible)', 0.4, 0.7,
   'Fibre-optic tether — zero RF emission. RF jamming not applicable.', ARRAY['rf_jamming_immune','gnss_jamming_immune'], 'ED', 1);

-- MQ-9 Reaper
INSERT INTO spectrum_capabilities (platform_id, side, layer, function, label, freq_low_hz, freq_high_hz, note, doctrine_role, sort_order) VALUES
  ('mq-9-reaper', 'red', 'comms', 'control', 'C2 SATCOM Ku-band', 14000000000, 14500000000, 'Beyond line-of-sight C2 — outside MVP axis', 'ED', 1),
  ('mq-9-reaper', 'red', 'comms', 'datalink', 'LOS C2 datalink', 2400000000, 2483500000, 'Tactical LOS link when in range', 'ED', 2),
  ('mq-9-reaper', 'red', 'navigation', 'navigation', 'GNSS L1 multi-constellation', 1565000000, 1606000000, 'GPS/GLONASS/Galileo', 'ED', 3),
  ('mq-9-reaper', 'red', 'navigation', 'navigation', 'GNSS L5', 1170000000, 1180000000, 'GPS L5 civil', 'ED', 4);

-- Shahed base platform (default = Gen 4 capabilities on main row)
INSERT INTO spectrum_capabilities (platform_id, side, layer, function, label, freq_low_hz, freq_high_hz, note, defeat_resistance, doctrine_role, sort_order) VALUES
  ('shahed-136', 'red', 'navigation', 'navigation', 'GNSS L1/L2 multi-constellation', 1176000000, 1606000000, 'INS backup — partial NAVWAR resistance', ARRAY['gnss_jamming_medium'], 'ED', 1),
  ('shahed-136', 'red', 'comms', 'datalink', 'Cellular LTE RTK', 700000000, 2700000000, 'RTK corrections when in cellular coverage', '{}', 'ED', 2);

INSERT INTO spectrum_capabilities (platform_id, side, layer, function, label, wavelength_low_um, wavelength_high_um, note, doctrine_role, sort_order) VALUES
  ('shahed-136', 'red', 'eo_ir', 'sensor', 'IR terminal guidance (MWIR)', 3.0, 5.0, 'Edge-AI terminal — GNSS-denied strike capable', 'ED', 3);

-- Shahed variants
INSERT INTO spectrum_capabilities (variant_id, side, layer, function, label, freq_low_hz, freq_high_hz, note, defeat_resistance, doctrine_role, sort_order) VALUES
  ('shahed-136-gen0', 'red', 'navigation', 'navigation', 'GNSS L1 only', 1565000000, 1585000000, 'Gen 0 — pure GNSS+INS', '{}', 'ED', 1),
  ('shahed-136-gen1', 'red', 'navigation', 'navigation', 'GNSS L1/L2/L5 multi-constellation', 1176000000, 1606000000, 'Gen 1 — hardened GNSS module', ARRAY['gnss_jamming_medium'], 'ED', 1),
  ('shahed-136-gen2', 'red', 'navigation', 'navigation', 'GNSS L1/L2/L5', 1176000000, 1606000000, 'Gen 2 — same as Gen 1 nav', ARRAY['gnss_jamming_medium'], 'ED', 1),
  ('shahed-136-gen2', 'red', 'comms', 'datalink', 'Cellular LTE RTK', 700000000, 2700000000, 'Gen 2 — RTK via cellular', '{}', 'ED', 2),
  ('shahed-136-gen3', 'red', 'navigation', 'navigation', 'GNSS + CRPA 8-element', 1176000000, 1606000000, 'Gen 3 — CRPA anti-jam', ARRAY['gnss_jamming_high','gnss_spoofing_high'], 'ED', 1),
  ('shahed-136-gen3', 'red', 'comms', 'datalink', 'Cellular LTE RTK', 700000000, 2700000000, 'Gen 3 — RTK path', '{}', 'ED', 2),
  ('shahed-136-gen4', 'red', 'navigation', 'navigation', 'GNSS + CRPA (terminal GNSS-independent)', 1176000000, 1606000000, 'Gen 4 — nav for transit only', ARRAY['gnss_jamming_high'], 'ED', 1),
  ('shahed-136-gen4', 'red', 'comms', 'datalink', 'Cellular LTE RTK', 700000000, 2700000000, 'Gen 4 — RTK when in coverage', '{}', 'ED', 2);

INSERT INTO spectrum_capabilities (variant_id, side, layer, function, label, wavelength_low_um, wavelength_high_um, note, doctrine_role, sort_order) VALUES
  ('shahed-136-gen4', 'red', 'eo_ir', 'sensor', 'IR terminal guidance (MWIR)', 3.0, 5.0, 'Gen 4 — Jetson Orin edge-AI; NAVWAR defeated in terminal phase', 'ED', 3);

-- Blue: DroneGun Tactical (C8 effector)
INSERT INTO spectrum_capabilities (defeat_system_id, side, layer, function, label, freq_low_hz, freq_high_hz, note, doctrine_role, sort_order) VALUES
  ('dronegun-tactical', 'blue', 'comms', 'jam_control', '433 MHz jam', 433050000, 434790000, 'DroneShield datasheet — ISM control band', 'EA', 1),
  ('dronegun-tactical', 'blue', 'comms', 'jam_control', '915 MHz jam', 902000000, 928000000, 'Long-range RC / ELRS band', 'EA', 2),
  ('dronegun-tactical', 'blue', 'comms', 'jam_control', '2.4 GHz jam', 2400000000, 2483500000, 'DJI / Wi-Fi / Bluetooth band', 'EA', 3),
  ('dronegun-tactical', 'blue', 'comms', 'jam_video', '5.8 GHz jam', 5725000000, 5875000000, 'FPV video downlink band', 'EA', 4),
  ('dronegun-tactical', 'blue', 'navigation', 'jam_gnss', 'GNSS L-band jam', 1160000000, 1610000000, 'GPS/GLONASS/Galileo denial', 'EA', 5);

-- Blue: Drone Dome
INSERT INTO spectrum_capabilities (defeat_system_id, side, layer, function, label, freq_low_hz, freq_high_hz, note, doctrine_role, sort_order) VALUES
  ('drone-dome', 'blue', 'comms', 'jam_control', '2.4 GHz jam', 2400000000, 2483500000, 'Rafael Drone Dome RF defeat', 'EA', 1),
  ('drone-dome', 'blue', 'comms', 'jam_video', '5.8 GHz jam', 5725000000, 5875000000, 'Video band coverage', 'EA', 2),
  ('drone-dome', 'blue', 'navigation', 'jam_gnss', 'GNSS L-band jam', 1160000000, 1610000000, 'Navigation denial', 'EA', 3);

-- Blue: Pulsar-L / Pulsar-V
INSERT INTO spectrum_capabilities (defeat_system_id, side, layer, function, label, freq_low_hz, freq_high_hz, note, doctrine_role, sort_order) VALUES
  ('pulsar-l', 'blue', 'comms', 'jam_control', '2.4 GHz adaptive jam', 2400000000, 2483500000, 'Anduril Pulsar-L — JCO demo', 'EA', 1),
  ('pulsar-l', 'blue', 'comms', 'jam_video', '5.8 GHz jam', 5725000000, 5875000000, 'Video band', 'EA', 2),
  ('pulsar-l', 'blue', 'navigation', 'jam_gnss', 'GNSS L-band', 1160000000, 1610000000, 'GNSS denial', 'EA', 3),
  ('pulsar-v', 'blue', 'comms', 'jam_control', 'Multi-band RF jam', 400000000, 6000000000, 'Vehicle-mounted broad coverage', 'EA', 1),
  ('pulsar-v', 'blue', 'navigation', 'jam_gnss', 'GNSS L-band', 1160000000, 1610000000, 'GNSS denial', 'EA', 2);

-- Populate anti_drone_systems.frequency_bands_covered for all C-UAS
UPDATE anti_drone_systems SET frequency_bands_covered = '{"433_mhz":"433-435","915_mhz":"902-928","2.4_ghz":"2400-2483","5.8_ghz":"5725-5875","gnss_lband":"1160-1610"}'::jsonb
WHERE id = 'dronegun-tactical';

UPDATE anti_drone_systems SET frequency_bands_covered = '{"2.4_ghz":"2400-2483","5.8_ghz":"5725-5875","gnss_lband":"1160-1610"}'::jsonb
WHERE id = 'drone-dome';

UPDATE anti_drone_systems SET frequency_bands_covered = '{"2.4_ghz":"2400-2483","5.8_ghz":"5725-5875","gnss_lband":"1160-1610"}'::jsonb
WHERE id IN ('pulsar-l', 'dronesentry-sentrycs');

UPDATE anti_drone_systems SET frequency_bands_covered = '{"rf_broad":"400-6000","gnss_lband":"1160-1610"}'::jsonb
WHERE id IN ('pulsar-v', 'jco-swarm-kit');

UPDATE anti_drone_systems SET frequency_bands_covered = '{}'::jsonb
WHERE id IN ('coyote-block-3', 'iron-beam', 'lite-beam', 'dragonfire', 'fpv-interceptor', 'anduril-anvil', 'anvil-interceptor', 'net-gun-system');
