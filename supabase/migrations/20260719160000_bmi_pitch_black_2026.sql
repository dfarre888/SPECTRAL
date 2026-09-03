-- BMI — Battlespace Management & Interoperability (Pitch Black 2026)
-- CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY

CREATE TABLE IF NOT EXISTS bmi_exercises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  note TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS bmi_exercise_nations (
  exercise_id TEXT NOT NULL REFERENCES bmi_exercises(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  participation TEXT NOT NULL CHECK (participation IN ('flying', 'embedded_personnel')),
  first_time BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (exercise_id, code)
);

CREATE TABLE IF NOT EXISTS bmi_exercise_bases (
  id TEXT PRIMARY KEY,
  exercise_id TEXT NOT NULL REFERENCES bmi_exercises(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('main_operating', 'forward', 'c2', 'radar'))
);

CREATE TABLE IF NOT EXISTS bmi_exercise_platforms (
  id TEXT PRIMARY KEY,
  exercise_id TEXT NOT NULL REFERENCES bmi_exercises(id) ON DELETE CASCADE,
  nation_code TEXT NOT NULL,
  designation TEXT NOT NULL,
  short_name TEXT NOT NULL,
  domain TEXT NOT NULL CHECK (domain IN ('air', 'ground', 'maritime')),
  role TEXT NOT NULL,
  qty INT,
  base_id TEXT REFERENCES bmi_exercise_bases(id) ON DELETE SET NULL,
  force_side TEXT NOT NULL DEFAULT 'blue' CHECK (force_side IN ('blue', 'red')),
  open_source_summary TEXT NOT NULL DEFAULT '',
  data_confidence TEXT NOT NULL DEFAULT 'estimated'
    CHECK (data_confidence IN ('high', 'medium', 'estimated', 'classified')),
  sources TEXT[] NOT NULL DEFAULT '{}',
  platform_library_id TEXT
);

CREATE TABLE IF NOT EXISTS bmi_platform_sensors (
  id TEXT PRIMARY KEY,
  platform_id TEXT NOT NULL REFERENCES bmi_exercise_platforms(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('radar', 'eo_ir', 'esm', 'other')),
  label TEXT NOT NULL,
  band TEXT,
  antenna TEXT,
  role TEXT,
  can_detect TEXT[] NOT NULL DEFAULT '{}',
  cannot_detect TEXT[] NOT NULL DEFAULT '{}',
  strengths TEXT,
  limitations TEXT,
  confidence TEXT NOT NULL DEFAULT 'estimated'
    CHECK (confidence IN ('curated', 'derived', 'estimated')),
  intel_note TEXT,
  sources TEXT[] NOT NULL DEFAULT '{}',
  performance_ref TEXT,
  radar_catalog_id TEXT
);

CREATE TABLE IF NOT EXISTS bmi_platform_comms (
  id TEXT PRIMARY KEY,
  platform_id TEXT NOT NULL REFERENCES bmi_exercise_platforms(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  standard TEXT,
  band TEXT NOT NULL,
  label TEXT NOT NULL,
  gateway_capable BOOLEAN NOT NULL DEFAULT false,
  comsec_note TEXT,
  pnt_dependent BOOLEAN NOT NULL DEFAULT false,
  data_confidence TEXT NOT NULL DEFAULT 'estimated'
    CHECK (data_confidence IN ('high', 'medium', 'estimated', 'classified')),
  sources TEXT[] NOT NULL DEFAULT '{}',
  boundary_note TEXT,
  spectrum_capability_id UUID
);

CREATE INDEX IF NOT EXISTS bmi_platforms_exercise ON bmi_exercise_platforms (exercise_id);
CREATE INDEX IF NOT EXISTS bmi_sensors_platform ON bmi_platform_sensors (platform_id);
CREATE INDEX IF NOT EXISTS bmi_comms_platform ON bmi_platform_comms (platform_id);

ALTER TABLE bmi_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE bmi_exercise_nations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bmi_exercise_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE bmi_exercise_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE bmi_platform_sensors ENABLE ROW LEVEL SECURITY;
ALTER TABLE bmi_platform_comms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bmi_exercises_select ON bmi_exercises;
DROP POLICY IF EXISTS bmi_nations_select ON bmi_exercise_nations;
DROP POLICY IF EXISTS bmi_bases_select ON bmi_exercise_bases;
DROP POLICY IF EXISTS bmi_platforms_select ON bmi_exercise_platforms;
DROP POLICY IF EXISTS bmi_sensors_select ON bmi_platform_sensors;
DROP POLICY IF EXISTS bmi_comms_select ON bmi_platform_comms;

CREATE POLICY bmi_exercises_select ON bmi_exercises FOR SELECT TO authenticated USING (true);
CREATE POLICY bmi_nations_select ON bmi_exercise_nations FOR SELECT TO authenticated USING (true);
CREATE POLICY bmi_bases_select ON bmi_exercise_bases FOR SELECT TO authenticated USING (true);
CREATE POLICY bmi_platforms_select ON bmi_exercise_platforms FOR SELECT TO authenticated USING (true);
CREATE POLICY bmi_sensors_select ON bmi_platform_sensors FOR SELECT TO authenticated USING (true);
CREATE POLICY bmi_comms_select ON bmi_platform_comms FOR SELECT TO authenticated USING (true);

-- Exercise meta seed
INSERT INTO bmi_exercises (id, name, start_date, end_date, note) VALUES (
  'PITCH_BLACK_2026',
  'Exercise Pitch Black 2026',
  '2026-07-20',
  '2026-08-07',
  'Multinational air combat exercise — refine OrBat against official RAAF participant page.'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  note = EXCLUDED.note;

-- Full platform/sensor/comms seed loaded from data/seed-bmi-pitchblack2026.ts at runtime fallback;
-- apply extended INSERTs via `supabase db push` or MCP when syncing TS seed to SQL.
