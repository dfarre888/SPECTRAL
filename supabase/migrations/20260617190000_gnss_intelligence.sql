-- SPECTRAL GNSS Intelligence module
-- CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY

ALTER TABLE gnss_constellations
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS operator TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('operational','degraded','testing')),
  ADD COLUMN IF NOT EXISTS signal_bands JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS satellites_nominal INT,
  ADD COLUMN IF NOT EXISTS satellites_active INT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS gnss_platform_dependencies (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id      TEXT NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
  constellation    TEXT NOT NULL REFERENCES gnss_constellations(id),
  dependency_level TEXT NOT NULL CHECK (dependency_level IN ('primary','secondary','none','immune')),
  jamming_effect   TEXT NOT NULL CHECK (jamming_effect IN ('mission_kill','degraded','minimal','none')),
  notes            TEXT,
  data_source      TEXT NOT NULL DEFAULT 'osint'
);

CREATE TABLE IF NOT EXISTS gnss_jamming_incidents (
  id                      TEXT PRIMARY KEY,
  incident_name           TEXT NOT NULL,
  detected_at             TIMESTAMPTZ NOT NULL,
  lat                     DOUBLE PRECISION NOT NULL,
  lon                     DOUBLE PRECISION NOT NULL,
  radius_km               DOUBLE PRECISION,
  affected_constellations TEXT[] NOT NULL DEFAULT '{}',
  jamming_type            TEXT NOT NULL CHECK (jamming_type IN ('broadband','meaconing','spoofing','selective')),
  confirmed               BOOLEAN NOT NULL DEFAULT false,
  source_ref              TEXT NOT NULL,
  platform_impacts        JSONB NOT NULL DEFAULT '[]',
  classification          TEXT NOT NULL DEFAULT 'UNCLASSIFIED'
);
INSERT INTO gnss_constellations (
  id, full_name, display_name, operator, operator_country, status, signal_bands,
  satellites_nominal, satellites_active, constellation_size, notes, updated_at
) VALUES
  ('gps', 'GPS', 'GPS (NAVSTAR)', 'USA', 'United States', 'operational',
   '[{"band":"L1","freq_mhz":1575.42},{"band":"L2","freq_mhz":1227.60},{"band":"L5","freq_mhz":1176.45}]'::jsonb,
   31, 31, 31, 'Multi-frequency civil/military GNSS', NOW()),
  ('glonass', 'GLONASS', 'GLONASS', 'Russia', 'Russia', 'operational',
   '[{"band":"L1","freq_mhz":1602},{"band":"L2","freq_mhz":1246}]'::jsonb,
   24, 23, 24, 'Russian GNSS constellation', NOW()),
  ('beidou', 'BeiDou', 'BeiDou (BDS)', 'China', 'China', 'operational',
   '[{"band":"B1","freq_mhz":1561},{"band":"B2","freq_mhz":1207},{"band":"B3","freq_mhz":1268}]'::jsonb,
   45, 45, 35, 'PRC global constellation', NOW()),
  ('galileo', 'Galileo', 'Galileo', 'EU', 'European Union', 'operational',
   '[{"band":"E1","freq_mhz":1575.42},{"band":"E5","freq_mhz":1191},{"band":"E6","freq_mhz":1278}]'::jsonb,
   28, 26, 28, 'EU GNSS service', NOW())
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  operator = EXCLUDED.operator,
  status = EXCLUDED.status,
  signal_bands = EXCLUDED.signal_bands,
  satellites_nominal = EXCLUDED.satellites_nominal,
  satellites_active = EXCLUDED.satellites_active,
  updated_at = NOW();
INSERT INTO gnss_platform_dependencies (platform_id, constellation, dependency_level, jamming_effect, notes) VALUES
  ('shahed-136', 'gps', 'primary', 'mission_kill', 'OWA transit nav'),
  ('shahed-136', 'glonass', 'secondary', 'degraded', 'Multi-constellation'),
  ('shahed-131', 'gps', 'primary', 'mission_kill', 'Geran-1 OWA'),
  ('shahed-131', 'glonass', 'secondary', 'degraded', 'Dual constellation'),
  ('lancet-3', 'gps', 'primary', 'mission_kill', 'Transit GNSS'),
  ('tb2-bayraktar', 'gps', 'primary', 'mission_kill', 'MALE nav'),
  ('tb2-bayraktar', 'glonass', 'secondary', 'degraded', 'Export configs'),
  ('mq-9-reaper', 'gps', 'primary', 'mission_kill', 'MALE BLOS'),
  ('mq-1c-gray-eagle', 'gps', 'primary', 'mission_kill', 'US Army MALE'),
  ('rq-4-global-hawk', 'gps', 'primary', 'mission_kill', 'HALE ISR'),
  ('ch-4-rainbow', 'beidou', 'primary', 'mission_kill', 'PRC MALE'),
  ('ch-4-rainbow', 'gps', 'secondary', 'degraded', 'GPS fallback'),
  ('ch-5-rainbow', 'beidou', 'primary', 'mission_kill', 'Large MALE'),
  ('ch-5-rainbow', 'gps', 'secondary', 'degraded', 'Secondary GPS'),
  ('wing-loong-2', 'beidou', 'primary', 'mission_kill', 'Export MALE'),
  ('wing-loong-2', 'gps', 'secondary', 'degraded', 'GPS fallback'),
  ('gj-11-sharp-sword', 'beidou', 'primary', 'mission_kill', 'Stealth UCAV'),
  ('switchblade-300', 'gps', 'primary', 'mission_kill', 'Tube LM'),
  ('switchblade-600', 'gps', 'primary', 'mission_kill', 'Anti-armour LM'),
  ('hero-400', 'gps', 'primary', 'mission_kill', 'Hero LM'),
  ('harop', 'gps', 'secondary', 'degraded', 'IIR terminal'),
  ('kargu-2', 'gps', 'secondary', 'minimal', 'IR terminal nav'),
  ('fpv-rc', 'gps', 'none', 'none', 'Visual FPV'),
  ('fpv-fibre-optic', 'gps', 'immune', 'none', 'Fibre — GNSS immune'),
  ('fpv-swarm-coord', 'gps', 'secondary', 'degraded', 'Mixed swarm'),
  ('uj-22-airborne', 'gps', 'primary', 'mission_kill', 'Ukrainian OWA'),
  ('uj-22-airborne', 'glonass', 'secondary', 'degraded', 'Dual GNSS'),
  ('xq-58a-valkyrie', 'gps', 'primary', 'mission_kill', 'Loyal wingman');
INSERT INTO gnss_jamming_incidents (
  id, incident_name, detected_at, lat, lon, radius_km, affected_constellations,
  jamming_type, confirmed, source_ref, platform_impacts, classification
) VALUES
  ('INC-GNSS-001', 'Eastern Mediterranean GPS Jamming Zone', '2024-01-01T00:00:00Z',
   36.0, 36.5, 450, ARRAY['gps','galileo']::TEXT[], 'broadband', true,
   'Aviation safety reports NOTAM 2024, multiple commercial pilot reports',
   '[{"platform_id":"mq-9-reaper","observed_effect":"degraded"}]'::jsonb, 'UNCLASSIFIED'),
  ('INC-GNSS-002', 'Black Sea Meaconing Events', '2023-06-01T00:00:00Z',
   43.5, 33.0, 300, ARRAY['gps']::TEXT[], 'meaconing', true,
   'C4ADS GPS spoofing study 2023; GPSD analysis',
   '[{"platform_id":"shahed-136","observed_effect":"mission_kill"}]'::jsonb, 'UNCLASSIFIED'),
  ('INC-GNSS-003', 'Kaliningrad GPS Jamming', '2022-03-01T00:00:00Z',
   54.7, 20.5, 400, ARRAY['gps','galileo']::TEXT[], 'broadband', true,
   'OPSGROUP safety reports 2022-2024', '[]'::jsonb, 'UNCLASSIFIED'),
  ('INC-GNSS-004', 'Ukraine Frontline GNSS Denial', '2022-02-24T00:00:00Z',
   48.5, 35.5, 200, ARRAY['gps','glonass']::TEXT[], 'broadband', true,
   'OSINT Ukraine conflict reporting 2022-2024',
   '[{"platform_id":"fpv-rc","observed_effect":"minimal"}]'::jsonb, 'UNCLASSIFIED'),
  ('INC-GNSS-005', 'Red Sea / Gulf of Aden Spoofing', '2023-11-01T00:00:00Z',
   13.0, 43.5, 350, ARRAY['gps']::TEXT[], 'spoofing', true,
   'Maritime GNSS spoofing reports 2023-24; GPSD dataset',
   '[{"platform_id":"shahed-136","observed_effect":"degraded"}]'::jsonb, 'UNCLASSIFIED')
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_gnss_deps_platform ON gnss_platform_dependencies(platform_id);
CREATE INDEX IF NOT EXISTS idx_gnss_deps_constellation ON gnss_platform_dependencies(constellation);
CREATE INDEX IF NOT EXISTS idx_gnss_incidents_detected ON gnss_jamming_incidents(detected_at);
CREATE INDEX IF NOT EXISTS idx_gnss_incidents_confirmed ON gnss_jamming_incidents(confirmed);

ALTER TABLE gnss_platform_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE gnss_jamming_incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gnss_deps_auth_read ON gnss_platform_dependencies;
CREATE POLICY gnss_deps_auth_read ON gnss_platform_dependencies
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS gnss_incidents_auth_read ON gnss_jamming_incidents;
CREATE POLICY gnss_incidents_auth_read ON gnss_jamming_incidents
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS gnss_constellations_auth_read ON gnss_constellations;
CREATE POLICY gnss_constellations_auth_read ON gnss_constellations
  FOR SELECT TO authenticated USING (true);
