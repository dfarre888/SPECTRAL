-- ============================================================
-- SPECTRAL — Moat-Builder Schema
-- Migration: 003_spectral_learner_model
-- Longitudinal learner model, curriculum loop, currency engine,
-- sovereign data control, force-design records.
-- Requires: 20260613120000_spectral_world_state_engine.sql
-- ============================================================

CREATE TABLE spectral_competency_records (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id               UUID NOT NULL REFERENCES spectral_players(id) ON DELETE CASCADE,
  callsign                TEXT NOT NULL,
  competencies            JSONB NOT NULL DEFAULT '{}',
  blind_spots             JSONB NOT NULL DEFAULT '[]',
  total_exercises         INT NOT NULL DEFAULT 0,
  total_turns             INT NOT NULL DEFAULT 0,
  first_exercise_at       TIMESTAMPTZ,
  most_recent_exercise_at TIMESTAMPTZ,
  decision_speed_profile  JSONB NOT NULL DEFAULT '{}',
  overall_level           TEXT NOT NULL DEFAULT 'trainee'
                          CHECK (overall_level IN ('trainee','qualified','experienced','expert')),
  competency_summary      JSONB NOT NULL DEFAULT '{}',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(player_id)
);

CREATE TABLE spectral_training_plans (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id           UUID NOT NULL REFERENCES spectral_players(id) ON DELETE CASCADE,
  callsign            TEXT NOT NULL,
  generated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assignments         JSONB NOT NULL DEFAULT '[]',
  instructor_brief    TEXT NOT NULL,
  success_definition  TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','superseded','completed')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE spectral_currency_updates (
  id                                  TEXT PRIMARY KEY,
  type                                TEXT NOT NULL,
  title                               TEXT NOT NULL,
  summary                             TEXT NOT NULL,
  source_type                         TEXT NOT NULL
                                      CHECK (source_type IN ('osint','sme_input','after_action','partner_share')),
  source_reference                    TEXT NOT NULL,
  detected_at                         TIMESTAMPTZ NOT NULL,
  proposed_effect                     TEXT NOT NULL,
  affects                             JSONB NOT NULL DEFAULT '{}',
  status                              TEXT NOT NULL DEFAULT 'proposed'
                                      CHECK (status IN ('proposed','under_review','approved','rejected','superseded')),
  reviewed_by                         UUID REFERENCES spectral_players(id),
  reviewed_at                         TIMESTAMPTZ,
  review_notes                        TEXT,
  requires_accredited_implementation  BOOLEAN NOT NULL DEFAULT false,
  created_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE spectral_sovereign_platforms (
  id                  TEXT PRIMARY KEY,
  display_name        TEXT NOT NULL,
  origin_country      TEXT NOT NULL CHECK (origin_country IN ('Australia','UK','USA')),
  category            TEXT NOT NULL,
  role                TEXT NOT NULL CHECK (role IN ('blue_force','blue_or_red','enabler')),
  sovereign_program   TEXT NOT NULL,
  status              TEXT NOT NULL CHECK (status IN ('in_service','in_development','trials','announced')),
  open_source_summary TEXT NOT NULL,
  performance_ref     TEXT NOT NULL DEFAULT 'SOVEREIGN_CORE_BOUNDARY'
                      CHECK (performance_ref = 'SOVEREIGN_CORE_BOUNDARY'),
  open_sources        TEXT[] NOT NULL DEFAULT '{}',
  classification      TEXT NOT NULL DEFAULT 'UNCLASSIFIED',
  releasability       TEXT NOT NULL DEFAULT 'UNCLASSIFIED_PUBLIC'
                      CHECK (releasability IN ('AUS_ONLY','AUKUS','FVEY','UNCLASSIFIED_PUBLIC')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE spectral_force_design_reports (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question            JSONB NOT NULL,
  findings            JSONB NOT NULL DEFAULT '[]',
  recommendation      TEXT NOT NULL,
  caveats             TEXT[] NOT NULL DEFAULT '{}',
  data_provenance     TEXT NOT NULL
                      CHECK (data_provenance IN ('accredited_engine','external_accredited_sim','open_build_placeholder')),
  generated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          UUID REFERENCES spectral_players(id)
);

CREATE INDEX idx_spectral_competency_player ON spectral_competency_records(player_id);
CREATE INDEX idx_spectral_training_plans_player ON spectral_training_plans(player_id);
CREATE INDEX idx_spectral_training_plans_status ON spectral_training_plans(status);
CREATE INDEX idx_spectral_currency_status ON spectral_currency_updates(status);
CREATE INDEX idx_spectral_currency_accredited ON spectral_currency_updates(requires_accredited_implementation);
CREATE INDEX idx_spectral_sovereign_role ON spectral_sovereign_platforms(role);

ALTER TABLE spectral_competency_records   ENABLE ROW LEVEL SECURITY;
ALTER TABLE spectral_training_plans       ENABLE ROW LEVEL SECURITY;
ALTER TABLE spectral_currency_updates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE spectral_sovereign_platforms  ENABLE ROW LEVEL SECURITY;
ALTER TABLE spectral_force_design_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players view own competency record"
  ON spectral_competency_records FOR SELECT
  USING (EXISTS (SELECT 1 FROM spectral_players WHERE auth_user_id = auth.uid() AND id = spectral_competency_records.player_id));

CREATE POLICY "DS views all competency records"
  ON spectral_competency_records FOR SELECT
  USING (EXISTS (SELECT 1 FROM spectral_players WHERE auth_user_id = auth.uid() AND role = 'ds'));

CREATE POLICY "Players view own training plans"
  ON spectral_training_plans FOR SELECT
  USING (EXISTS (SELECT 1 FROM spectral_players WHERE auth_user_id = auth.uid() AND id = spectral_training_plans.player_id));

CREATE POLICY "DS manages training plans"
  ON spectral_training_plans FOR ALL
  USING (EXISTS (SELECT 1 FROM spectral_players WHERE auth_user_id = auth.uid() AND role = 'ds'));

CREATE POLICY "DS manages currency updates"
  ON spectral_currency_updates FOR ALL
  USING (EXISTS (SELECT 1 FROM spectral_players WHERE auth_user_id = auth.uid() AND role = 'ds'));

CREATE POLICY "Authenticated read sovereign platforms"
  ON spectral_sovereign_platforms FOR SELECT TO authenticated USING (true);

CREATE POLICY "DS writes sovereign platforms"
  ON spectral_sovereign_platforms FOR ALL
  USING (EXISTS (SELECT 1 FROM spectral_players WHERE auth_user_id = auth.uid() AND role = 'ds'));

CREATE POLICY "DS manages force design reports"
  ON spectral_force_design_reports FOR ALL
  USING (EXISTS (SELECT 1 FROM spectral_players WHERE auth_user_id = auth.uid() AND role = 'ds'));

CREATE TRIGGER spectral_competency_updated_at
  BEFORE UPDATE ON spectral_competency_records
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER spectral_sovereign_platforms_updated_at
  BEFORE UPDATE ON spectral_sovereign_platforms
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Sovereign platform catalogue (UNCLASSIFIED descriptive only)
INSERT INTO spectral_sovereign_platforms
  (id, display_name, origin_country, category, role, sovereign_program, status, open_source_summary, open_sources)
VALUES
  ('AUS-CCA-GHOSTBAT', 'MQ-28A Ghost Bat', 'Australia', 'Collaborative Combat Aircraft (CCA)', 'blue_force', 'Boeing Australia / RAAF', 'trials', 'Australian-designed collaborative combat aircraft. Publicly reported first validated air-to-air engagement in late 2025.', ARRAY['RAAF / Boeing Australia public releases', 'ADM reporting 2025-26']),
  ('AUS-OWA-OWLB', 'Innovaero OWL-B', 'Australia', 'One-Way-Attack munition', 'blue_or_red', 'Innovaero / ASCA AUKUS Pillar II', 'trials', 'Australian OWA munition demonstrated during AUKUS Maritime Big Play (2026).', ARRAY['Defence.gov.au Maritime Big Play release 2026']),
  ('AUS-UUV-SPEARTOOTH', 'C2 Robotics Speartooth', 'Australia', 'Large Uncrewed Underwater Vehicle', 'blue_force', 'C2 Robotics / AUKUS Pillar II', 'trials', 'Australian large UUV test-bed during Maritime Big Play (2026).', ARRAY['Defence.gov.au 2026', 'Janes 2026']),
  ('AUS-UUV-GHOSTSHARK', 'Ghost Shark', 'Australia', 'Extra-Large Autonomous Undersea Vehicle', 'blue_force', 'Anduril Australia / RAN', 'in_development', 'Australian extra-large autonomous undersea vehicle program.', ARRAY['RAN / Anduril Australia public releases']),
  ('AUS-EW-GRASSHOPPER', 'ADT GRASSHOPPER payload', 'Australia', 'Electronic Warfare payload', 'enabler', 'Advanced Design Technology / AUKUS Pillar II EW Challenge', 'trials', 'Australian EW payload, AUKUS Pillar II EW Innovation Challenge winner.', ARRAY['Janes 2026', 'Defence.gov.au 2026'])
ON CONFLICT (id) DO NOTHING;

-- Demo currency updates (proposed — SME review required)
INSERT INTO spectral_currency_updates
  (id, type, title, summary, source_type, source_reference, detected_at, proposed_effect, affects, status, requires_accredited_implementation)
VALUES
  ('CU-SEED-FO-FPV', 'new_tactic', 'Fibre-optic FPV defeats RF-based counter-UAS',
   'Fibre-optic guided FPV drones are immune to RF jamming and SIGINT detection. Observed at scale in Ukraine.',
   'osint', 'OSINT Ukraine conflict reporting 2025-26', NOW(),
   'Add training emphasis: recognise EW-immune threat; do not rely on EW defeat. Pedagogy and scenario-emphasis change only.',
   '{"competencies":["adaptation"],"scenarios":[],"injects":["RED-003"]}', 'proposed', false),
  ('CU-SEED-DECOY', 'doctrine_shift', 'Decoy-heavy OWA packages to deplete interceptor magazines',
   'Attackers mix low-cost decoys with real OWA to force defenders to expend interceptors on decoys.',
   'osint', 'OSINT Ukraine saturation tactics 2025-26', NOW(),
   'Strengthen magazine-management and threat-classification training emphasis. Inject-narrative change only.',
   '{"competencies":["magazine_management","threat_classification"],"scenarios":[],"injects":["RED-001","RED-004"]}', 'proposed', false),
  ('CU-SEED-TURBOJET', 'doctrine_shift', 'Turbojet OWA variants compress the intercept window',
   'Turbojet-powered OWA variants travel faster, reducing detection-to-impact time.',
   'osint', 'OSINT reporting 2025-26', NOW(),
   'Emphasise decision-tempo training under compressed timelines. Pedagogy change only.',
   '{"competencies":["tempo_and_initiative","decision_under_uncertainty"],"scenarios":[],"injects":[]}', 'proposed', false)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE spectral_competency_records IS
  'Longitudinal per-commander competency record. The core training differentiator.';
COMMENT ON COLUMN spectral_sovereign_platforms.performance_ref IS
  'Always SOVEREIGN_CORE_BOUNDARY in the open build. Real performance data resides in the accredited catalogue.';
