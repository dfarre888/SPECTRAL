-- Parity with the Mumbai Spectral project: platform fields used by the
-- older catalogue rows, plus the BMI exercise / ORBAT tables that lived
-- only on that project. Data was copied live onto Sydney
-- (nxnukrnkbxiqberymqzq). This migration keeps the schema in-repo.

ALTER TABLE platforms ADD COLUMN IF NOT EXISTS year_introduced SMALLINT;
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS propulsion TEXT;
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS defeat_note TEXT;
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS control_link_freq TEXT;
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS gnss_dependency TEXT;
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS side TEXT;
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS uas_group SMALLINT;

CREATE TABLE IF NOT EXISTS bmi_catalog_nations (
  code       TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  force_side TEXT NOT NULL CHECK (force_side = ANY (ARRAY['blue','red','neutral'])),
  blocs      TEXT[] NOT NULL DEFAULT '{}',
  region     TEXT
);

CREATE TABLE IF NOT EXISTS bmi_exercises (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date   DATE NOT NULL,
  note       TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS bmi_exercise_bases (
  id          TEXT PRIMARY KEY,
  exercise_id TEXT NOT NULL REFERENCES bmi_exercises(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  lat         DOUBLE PRECISION NOT NULL,
  lon         DOUBLE PRECISION NOT NULL,
  role        TEXT NOT NULL CHECK (role = ANY (ARRAY['main_operating','forward','c2','radar']))
);

CREATE TABLE IF NOT EXISTS bmi_exercise_nations (
  exercise_id   TEXT NOT NULL REFERENCES bmi_exercises(id) ON DELETE CASCADE,
  code          TEXT NOT NULL,
  name          TEXT NOT NULL,
  participation TEXT NOT NULL CHECK (participation = ANY (ARRAY['flying','embedded_personnel'])),
  first_time    BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (exercise_id, code)
);

CREATE TABLE IF NOT EXISTS bmi_exercise_platforms (
  id                   TEXT PRIMARY KEY,
  exercise_id          TEXT REFERENCES bmi_exercises(id) ON DELETE CASCADE,
  nation_code          TEXT NOT NULL,
  designation          TEXT NOT NULL,
  short_name           TEXT NOT NULL,
  domain               TEXT NOT NULL CHECK (domain = ANY (ARRAY['air','ground','maritime'])),
  role                 TEXT NOT NULL,
  qty                  INTEGER,
  base_id              TEXT REFERENCES bmi_exercise_bases(id) ON DELETE SET NULL,
  force_side           TEXT NOT NULL DEFAULT 'blue' CHECK (force_side = ANY (ARRAY['blue','red'])),
  open_source_summary  TEXT NOT NULL DEFAULT '',
  data_confidence      TEXT NOT NULL DEFAULT 'estimated'
    CHECK (data_confidence = ANY (ARRAY['high','medium','estimated','classified'])),
  sources              TEXT[] NOT NULL DEFAULT '{}',
  platform_library_id  TEXT,
  is_catalog           BOOLEAN NOT NULL DEFAULT false,
  nation_name          TEXT,
  manufacturer         TEXT,
  service_status       TEXT CHECK (service_status IS NULL OR service_status = ANY (ARRAY[
    'in_service','ordered','in_development','prototype','concept','retiring','retired'
  ])),
  ioc_year             INTEGER,
  program_stage        TEXT CHECK (program_stage IS NULL OR program_stage = ANY (ARRAY[
    'fielded','lrip','emd','technology_demonstrator','r_and_d','announced','speculative'
  ])),
  CHECK ((is_catalog = true AND nation_code IS NOT NULL) OR (is_catalog = false AND exercise_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS bmi_future_program_detail (
  platform_id      TEXT PRIMARY KEY REFERENCES bmi_exercise_platforms(id) ON DELETE CASCADE,
  program_name     TEXT NOT NULL,
  lead_contractor  TEXT,
  partner_nations  TEXT[] NOT NULL DEFAULT '{}',
  first_flight_est TEXT,
  ioc_est          TEXT,
  key_features     TEXT[] NOT NULL DEFAULT '{}',
  status_note      TEXT,
  data_confidence  TEXT NOT NULL DEFAULT 'estimated'
    CHECK (data_confidence = ANY (ARRAY['high','medium','estimated','classified'])),
  sources          TEXT[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS bmi_platform_comms (
  id                     TEXT PRIMARY KEY,
  platform_id            TEXT NOT NULL REFERENCES bmi_exercise_platforms(id) ON DELETE CASCADE,
  kind                   TEXT NOT NULL,
  standard               TEXT,
  band                   TEXT NOT NULL,
  label                  TEXT NOT NULL,
  gateway_capable        BOOLEAN NOT NULL DEFAULT false,
  comsec_note            TEXT,
  pnt_dependent          BOOLEAN NOT NULL DEFAULT false,
  data_confidence        TEXT NOT NULL DEFAULT 'estimated'
    CHECK (data_confidence = ANY (ARRAY['high','medium','estimated','classified'])),
  sources                TEXT[] NOT NULL DEFAULT '{}',
  boundary_note          TEXT,
  spectrum_capability_id UUID
);

CREATE TABLE IF NOT EXISTS bmi_platform_sensors (
  id               TEXT PRIMARY KEY,
  platform_id      TEXT NOT NULL REFERENCES bmi_exercise_platforms(id) ON DELETE CASCADE,
  kind             TEXT NOT NULL CHECK (kind = ANY (ARRAY['radar','eo_ir','esm','other'])),
  label            TEXT NOT NULL,
  band             TEXT,
  antenna          TEXT,
  role             TEXT,
  can_detect       TEXT[] NOT NULL DEFAULT '{}',
  cannot_detect    TEXT[] NOT NULL DEFAULT '{}',
  strengths        TEXT,
  limitations      TEXT,
  confidence       TEXT NOT NULL DEFAULT 'estimated' CHECK (confidence = ANY (ARRAY['curated','derived','estimated'])),
  intel_note       TEXT,
  sources          TEXT[] NOT NULL DEFAULT '{}',
  performance_ref  TEXT,
  radar_catalog_id TEXT
);

ALTER TABLE bmi_catalog_nations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bmi_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE bmi_exercise_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE bmi_exercise_nations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bmi_exercise_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE bmi_future_program_detail ENABLE ROW LEVEL SECURITY;
ALTER TABLE bmi_platform_comms ENABLE ROW LEVEL SECURITY;
ALTER TABLE bmi_platform_sensors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS auth_read_bmi_catalog_nations ON bmi_catalog_nations;
CREATE POLICY auth_read_bmi_catalog_nations ON bmi_catalog_nations
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS auth_read_bmi_exercises ON bmi_exercises;
CREATE POLICY auth_read_bmi_exercises ON bmi_exercises
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS auth_read_bmi_exercise_bases ON bmi_exercise_bases;
CREATE POLICY auth_read_bmi_exercise_bases ON bmi_exercise_bases
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS auth_read_bmi_exercise_nations ON bmi_exercise_nations;
CREATE POLICY auth_read_bmi_exercise_nations ON bmi_exercise_nations
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS auth_read_bmi_exercise_platforms ON bmi_exercise_platforms;
CREATE POLICY auth_read_bmi_exercise_platforms ON bmi_exercise_platforms
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS auth_read_bmi_future_program_detail ON bmi_future_program_detail;
CREATE POLICY auth_read_bmi_future_program_detail ON bmi_future_program_detail
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS auth_read_bmi_platform_comms ON bmi_platform_comms;
CREATE POLICY auth_read_bmi_platform_comms ON bmi_platform_comms
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS auth_read_bmi_platform_sensors ON bmi_platform_sensors;
CREATE POLICY auth_read_bmi_platform_sensors ON bmi_platform_sensors
  FOR SELECT USING (auth.uid() IS NOT NULL);

GRANT ALL ON TABLE bmi_catalog_nations, bmi_exercises, bmi_exercise_bases,
  bmi_exercise_nations, bmi_exercise_platforms, bmi_future_program_detail,
  bmi_platform_comms, bmi_platform_sensors
  TO anon, authenticated, service_role;

COMMENT ON TABLE bmi_exercises IS 'BMI exercise / ORBAT header (copied from Mumbai Spectral project)';
COMMENT ON TABLE bmi_exercise_platforms IS 'BMI air/ground/maritime ORBAT rows including catalog platforms';
