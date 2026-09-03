-- Force Catalogue extension — decouples BMI platform tables from a single exercise
-- so bmi_exercise_platforms can also hold a global, nation-scoped OrBat catalogue.
-- CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
-- OSINT-only. Sensor detection ranges / EW effectiveness NEVER seeded here —
-- those pin to SOVEREIGN_CORE_BOUNDARY and resolve in the defence IDE.

-- ── 1. Decouple platforms from a mandatory exercise ─────────────────────────────
-- Global catalogue rows carry exercise_id = NULL and is_catalog = true.
-- Exercise rows (Pitch Black) keep their exercise_id and is_catalog = false.

ALTER TABLE bmi_exercise_platforms
  ALTER COLUMN exercise_id DROP NOT NULL;

ALTER TABLE bmi_exercise_platforms
  ADD COLUMN IF NOT EXISTS is_catalog     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS nation_name    TEXT,
  ADD COLUMN IF NOT EXISTS manufacturer   TEXT,
  ADD COLUMN IF NOT EXISTS service_status TEXT
    CHECK (service_status IS NULL OR service_status IN
      ('in_service', 'ordered', 'in_development', 'prototype', 'concept', 'retiring', 'retired')),
  ADD COLUMN IF NOT EXISTS ioc_year       INT,
  ADD COLUMN IF NOT EXISTS program_stage  TEXT
    CHECK (program_stage IS NULL OR program_stage IN
      ('fielded', 'lrip', 'emd', 'technology_demonstrator', 'r_and_d', 'announced', 'speculative'));

-- A catalogue platform must name its nation; an exercise platform must name its exercise.
ALTER TABLE bmi_exercise_platforms
  DROP CONSTRAINT IF EXISTS bmi_platform_scope_ck;
ALTER TABLE bmi_exercise_platforms
  ADD CONSTRAINT bmi_platform_scope_ck CHECK (
    (is_catalog = true  AND nation_code IS NOT NULL) OR
    (is_catalog = false AND exercise_id IS NOT NULL)
  );

-- ── 2. Catalogue lookup indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS bmi_platforms_catalog
  ON bmi_exercise_platforms (is_catalog, force_side, domain, nation_code)
  WHERE is_catalog = true;

CREATE INDEX IF NOT EXISTS bmi_platforms_service_status
  ON bmi_exercise_platforms (service_status)
  WHERE is_catalog = true;

-- ── 3. Future-programs metadata (R&D landscape) ────────────────────────────────
-- Catalogue rows with program_stage in ('r_and_d','announced','speculative','technology_demonstrator')
-- are future programs. This side table holds program-specific OSINT context so the
-- platforms table stays lean. All descriptive OSINT — no classified specs.
CREATE TABLE IF NOT EXISTS bmi_future_program_detail (
  platform_id     TEXT PRIMARY KEY REFERENCES bmi_exercise_platforms(id) ON DELETE CASCADE,
  program_name    TEXT NOT NULL,
  lead_contractor TEXT,
  partner_nations TEXT[] NOT NULL DEFAULT '{}',
  first_flight_est TEXT,            -- e.g. 'est. 2028' — free text, confidence-tagged in summary
  ioc_est         TEXT,             -- e.g. 'est. 2035'
  key_features    TEXT[] NOT NULL DEFAULT '{}',   -- OSINT descriptive: 'stealth', 'CCA control', etc.
  status_note     TEXT,
  data_confidence TEXT NOT NULL DEFAULT 'estimated'
    CHECK (data_confidence IN ('high', 'medium', 'estimated', 'classified')),
  sources         TEXT[] NOT NULL DEFAULT '{}'
);

ALTER TABLE bmi_future_program_detail ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bmi_future_program_select ON bmi_future_program_detail;
CREATE POLICY bmi_future_program_select ON bmi_future_program_detail
  FOR SELECT TO authenticated USING (true);

-- ── 4. Catalogue nations reference (decoupled from any exercise) ────────────────
-- bmi_exercise_nations is exercise-scoped; the catalogue needs a standalone nation
-- registry with alliance/bloc tags for filtering Blue vs Red and NATO vs Indo-Pacific.
CREATE TABLE IF NOT EXISTS bmi_catalog_nations (
  code        TEXT PRIMARY KEY,          -- ISO-ish 3-letter, matches nation_code on platforms
  name        TEXT NOT NULL,
  force_side  TEXT NOT NULL CHECK (force_side IN ('blue', 'red', 'neutral')),
  blocs       TEXT[] NOT NULL DEFAULT '{}',  -- e.g. {'NATO','FiveEyes'} | {'Indo-Pacific'} | {'CRINK'}
  region      TEXT
);

ALTER TABLE bmi_catalog_nations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bmi_catalog_nations_select ON bmi_catalog_nations;
CREATE POLICY bmi_catalog_nations_select ON bmi_catalog_nations
  FOR SELECT TO authenticated USING (true);
