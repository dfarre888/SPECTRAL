-- ============================================================
-- SPECTRAL Persistent Combat Model
-- Phase 1 — Supabase Database Schema
-- Migration: 001_spectral_world_state_engine
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE exercise_phase AS ENUM (
  'setup', 'permissive', 'contested', 'denied', 'culminating', 'complete'
);

CREATE TYPE time_of_day AS ENUM (
  'dawn', 'morning', 'midday', 'afternoon', 'dusk',
  'night_transition', 'night', 'pre_dawn'
);

CREATE TYPE force_id AS ENUM ('RED', 'BLUE');

CREATE TYPE platform_status AS ENUM (
  'pre_launch', 'airborne_tasked', 'airborne_loiter',
  'airborne_returning', 'ground_ready', 'ground_reloading',
  'ground_maintenance', 'destroyed', 'mission_complete'
);

CREATE TYPE platform_group AS ENUM (
  'OWA', 'loitering_munition', 'FPV', 'MALE_strike', 'MALE_isr',
  'HALE_isr', 'UCAV', 'CCA', 'nano_isr', 'EW', 'decoy', 'USV',
  'UGV', 'c_uas_detect', 'c_uas_defeat_kinetic',
  'c_uas_defeat_ew', 'c_uas_defeat_dew'
);

CREATE TYPE inject_category AS ENUM (
  'environmental', 'red_offensive', 'blue_pressure', 'doctrine_strategic'
);

CREATE TYPE inject_status AS ENUM (
  'queued', 'fired', 'cancelled', 'held'
);

CREATE TYPE contact_confidence AS ENUM (
  'confirmed', 'high', 'medium', 'low', 'possible'
);

CREATE TYPE comms_status AS ENUM (
  'nominal', 'degraded_light', 'degraded_moderate',
  'degraded_heavy', 'degraded_critical', 'severed'
);

CREATE TYPE turn_outcome AS ENUM (
  'continues', 'blue_wins', 'red_wins', 'stalemate', 'withdrawal'
);

CREATE TYPE player_role AS ENUM (
  'red_commander', 'blue_commander', 'ds', 'observer', 'ai'
);

CREATE TYPE difficulty_level AS ENUM ('base', 'advanced', 'expert');

CREATE TYPE gap_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- ============================================================
-- USERS / PLAYERS
-- ============================================================

CREATE TABLE spectral_players (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  callsign        TEXT NOT NULL,
  organisation    TEXT,
  role            player_role NOT NULL DEFAULT 'blue_commander',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(auth_user_id)
);

-- ============================================================
-- SCENARIOS (static, authored content)
-- ============================================================

CREATE TABLE spectral_scenarios (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT NOT NULL,        -- e.g. "Operation IRON CROW"
  code                TEXT NOT NULL UNIQUE, -- e.g. "IRON-CROW"
  classification      TEXT NOT NULL DEFAULT 'UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY',
  description         TEXT NOT NULL,
  threat_model        TEXT NOT NULL,
  key_lesson          TEXT NOT NULL,
  historical_basis    TEXT NOT NULL,
  primary_terrain     JSONB NOT NULL,       -- Terrain object
  initial_weather     JSONB NOT NULL,       -- Weather object
  red_base_orbat      JSONB NOT NULL,       -- ForceOrbat object
  blue_base_orbat     JSONB NOT NULL,
  objectives          JSONB NOT NULL,       -- Objective[]
  inject_library      JSONB NOT NULL,       -- Inject[]
  ds_objectives       TEXT[] NOT NULL,
  max_turns           INT NOT NULL DEFAULT 18,
  available_difficulties  difficulty_level[] NOT NULL DEFAULT '{base}',
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- EXERCISES (live instances)
-- ============================================================

CREATE TABLE spectral_exercises (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scenario_id                 UUID NOT NULL REFERENCES spectral_scenarios(id),
  session_number              INT NOT NULL DEFAULT 1,
  difficulty                  difficulty_level NOT NULL DEFAULT 'base',
  status                      TEXT NOT NULL DEFAULT 'setup'
                              CHECK (status IN ('setup','active','paused','complete')),
  -- Player assignments (null = AI-controlled)
  red_player_id               UUID REFERENCES spectral_players(id),
  blue_player_id              UUID REFERENCES spectral_players(id),
  ds_player_id                UUID NOT NULL REFERENCES spectral_players(id),
  blind_mode                  BOOLEAN NOT NULL DEFAULT true,
  -- Current world state (the live battlespace)
  current_world_state         JSONB NOT NULL,
  current_turn                INT NOT NULL DEFAULT 0,
  -- Orders pending for current turn
  red_orders_submitted        BOOLEAN NOT NULL DEFAULT false,
  blue_orders_submitted       BOOLEAN NOT NULL DEFAULT false,
  red_orders_current          JSONB,
  blue_orders_current         JSONB,
  -- Outcome
  outcome                     turn_outcome,
  blue_final_win_probability  NUMERIC(4,3),
  -- Meta
  started_at                  TIMESTAMPTZ,
  completed_at                TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TURN RECORDS (exercise history — append-only)
-- ============================================================

CREATE TABLE spectral_turn_records (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exercise_id             UUID NOT NULL REFERENCES spectral_exercises(id) ON DELETE CASCADE,
  turn                    INT NOT NULL,
  world_state_snapshot    JSONB NOT NULL,  -- full WorldState at start of turn
  red_orders              JSONB,
  blue_orders             JSONB,
  adjudication_result     JSONB NOT NULL,  -- AdjudicationResult
  -- Quick-access fields (derived from adjudication_result)
  outcome                 turn_outcome NOT NULL,
  blue_win_probability    NUMERIC(4,3) NOT NULL,
  key_decision_turn       BOOLEAN NOT NULL DEFAULT false,
  injects_fired           TEXT[],
  -- Sensor pictures (stored separately for efficient player queries)
  red_sensor_picture      JSONB NOT NULL,  -- Contact[] after fog of war
  blue_sensor_picture     JSONB NOT NULL,
  -- DS briefing and suggestion
  ds_briefing             TEXT NOT NULL,
  blue_suggestion         TEXT,
  timestamp               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(exercise_id, turn)
);

-- ============================================================
-- PLAYER BEHAVIOUR PROFILES
-- ============================================================

CREATE TABLE spectral_player_profiles (
  id                              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id                       UUID NOT NULL REFERENCES spectral_players(id) ON DELETE CASCADE,
  -- Session history
  session_history                 UUID[] NOT NULL DEFAULT '{}',
  total_turns_observed            INT NOT NULL DEFAULT 0,
  -- Decision speed (seconds)
  decision_speed_baseline_sec     INT,
  decision_speed_under_ew_sec     INT,
  decision_speed_under_saturation_sec INT,
  decision_speed_at_night_sec     INT,
  decision_speed_assessment       TEXT,
  -- Tactical profile (JSONB arrays for flexibility)
  tactical_tendencies             JSONB NOT NULL DEFAULT '[]',
  knowledge_gaps                  JSONB NOT NULL DEFAULT '[]',
  risk_profile                    JSONB NOT NULL DEFAULT '{}',
  exploit_recommendations         JSONB NOT NULL DEFAULT '[]',
  -- Outcomes
  win_count                       INT NOT NULL DEFAULT 0,
  loss_count                      INT NOT NULL DEFAULT 0,
  stalemate_count                 INT NOT NULL DEFAULT 0,
  current_difficulty              difficulty_level NOT NULL DEFAULT 'base',
  -- Meta
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(player_id)
);

-- ============================================================
-- POST-GAME ANALYSES
-- ============================================================

CREATE TABLE spectral_post_game_analyses (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exercise_id                 UUID NOT NULL REFERENCES spectral_exercises(id) ON DELETE CASCADE,
  generated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Game tree
  simulations_run             INT NOT NULL,
  branches                    JSONB NOT NULL,   -- GameTreeBranch[]
  blue_win_probability        NUMERIC(4,3) NOT NULL,
  red_win_probability         NUMERIC(4,3) NOT NULL,
  stalemate_probability       NUMERIC(4,3) NOT NULL,
  -- Key decision
  key_decision_turn           INT NOT NULL,
  key_decision_description    TEXT NOT NULL,
  key_decision_wrong_call_pct NUMERIC(5,2) NOT NULL,
  key_decision_error_type     TEXT NOT NULL
                              CHECK (key_decision_error_type IN (
                                'knowledge_gap','tactical_error','information_failure'
                              )),
  -- Recommendations
  curriculum_recommendations  JSONB NOT NULL,   -- CurriculumRecommendation[]
  next_session_recommendations TEXT[] NOT NULL,
  -- Full DS report
  ds_report                   TEXT NOT NULL,
  -- Access control
  ds_only                     BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(exercise_id)
);

-- ============================================================
-- INJECT LIBRARY (global, reusable across scenarios)
-- ============================================================

CREATE TABLE spectral_inject_library (
  id                  TEXT PRIMARY KEY,   -- e.g. "RED-001", "ENV-003"
  name                TEXT NOT NULL,
  category            inject_category NOT NULL,
  description         TEXT NOT NULL,
  effect_summary      TEXT NOT NULL,
  targets_weakness    TEXT NOT NULL,
  teaching_objective  TEXT NOT NULL,
  world_state_delta   JSONB NOT NULL DEFAULT '{}',
  applicable_scenarios UUID[],   -- null = all scenarios
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PLATFORM CATALOGUE (doctrine database)
-- ============================================================

CREATE TABLE spectral_platform_catalogue (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type_name           TEXT NOT NULL UNIQUE,  -- e.g. "Shahed-136"
  display_name        TEXT NOT NULL,
  country_of_origin   TEXT NOT NULL,
  dod_group           TEXT,                  -- "1","2","3","4","5"
  nato_class          TEXT,                  -- "I","II","III"
  platform_group      platform_group NOT NULL,
  mtow_kg             NUMERIC,
  payload_kg          NUMERIC,
  endurance_hr        NUMERIC,
  ceiling_ft          INT,
  speed_kt_cruise     INT,
  speed_kt_max        INT,
  range_km            INT,
  rcs_class           TEXT NOT NULL DEFAULT 'medium'
                      CHECK (rcs_class IN ('very_low','low','medium','high')),
  ew_immune           BOOLEAN NOT NULL DEFAULT false,
  combat_proven       BOOLEAN NOT NULL DEFAULT false,
  combat_record       TEXT,
  operators           TEXT[],
  cost_usd_approx     INT,
  notes               TEXT,
  -- SPECTRAL-specific
  is_active           BOOLEAN NOT NULL DEFAULT true,
  source              TEXT,                 -- OSINT source
  last_verified_at    TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SPECTRAL-INT DOCTRINE UPDATES (autonomous OSINT feed)
-- ============================================================

CREATE TABLE spectral_int_updates (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_url          TEXT,
  source_name         TEXT NOT NULL,
  detected_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  update_type         TEXT NOT NULL
                      CHECK (update_type IN (
                        'new_platform','capability_update','doctrine_change',
                        'new_threat','export_control','operator_change'
                      )),
  platform_type       TEXT,
  summary             TEXT NOT NULL,
  full_content        TEXT,
  -- Review workflow
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','approved','rejected','superseded')),
  reviewed_by         UUID REFERENCES spectral_players(id),
  reviewed_at         TIMESTAMPTZ,
  review_notes        TEXT,
  -- If approved — which platform catalogue entry was updated
  platform_catalogue_id UUID REFERENCES spectral_platform_catalogue(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Exercises
CREATE INDEX idx_exercises_scenario_id ON spectral_exercises(scenario_id);
CREATE INDEX idx_exercises_status ON spectral_exercises(status);
CREATE INDEX idx_exercises_red_player ON spectral_exercises(red_player_id);
CREATE INDEX idx_exercises_blue_player ON spectral_exercises(blue_player_id);
CREATE INDEX idx_exercises_ds_player ON spectral_exercises(ds_player_id);
CREATE INDEX idx_exercises_created ON spectral_exercises(created_at DESC);

-- Turn records (most queried table in a live exercise)
CREATE INDEX idx_turns_exercise_turn ON spectral_turn_records(exercise_id, turn);
CREATE INDEX idx_turns_key_decision ON spectral_turn_records(exercise_id, key_decision_turn)
  WHERE key_decision_turn = true;

-- Profiles
CREATE INDEX idx_profiles_player ON spectral_player_profiles(player_id);

-- Platform catalogue
CREATE INDEX idx_spectral_platform_catalogue_group ON spectral_platform_catalogue(platform_group);
CREATE INDEX idx_spectral_platform_catalogue_country ON spectral_platform_catalogue(country_of_origin);

-- SPECTRAL-INT
CREATE INDEX idx_int_status ON spectral_int_updates(status);
CREATE INDEX idx_int_type ON spectral_int_updates(update_type);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE spectral_players              ENABLE ROW LEVEL SECURITY;
ALTER TABLE spectral_scenarios            ENABLE ROW LEVEL SECURITY;
ALTER TABLE spectral_exercises            ENABLE ROW LEVEL SECURITY;
ALTER TABLE spectral_turn_records         ENABLE ROW LEVEL SECURITY;
ALTER TABLE spectral_player_profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE spectral_post_game_analyses   ENABLE ROW LEVEL SECURITY;
ALTER TABLE spectral_inject_library       ENABLE ROW LEVEL SECURITY;
ALTER TABLE spectral_platform_catalogue   ENABLE ROW LEVEL SECURITY;
ALTER TABLE spectral_int_updates          ENABLE ROW LEVEL SECURITY;

-- ── Helper function: get current player's SPECTRAL role ──────────────
CREATE OR REPLACE FUNCTION spectral_get_player_role(exercise_uuid UUID)
RETURNS player_role AS $$
DECLARE
  v_role player_role;
  v_player_id UUID;
BEGIN
  SELECT id INTO v_player_id
  FROM spectral_players
  WHERE auth_user_id = auth.uid();

  IF v_player_id IS NULL THEN RETURN NULL; END IF;

  SELECT
    CASE
      WHEN ds_player_id = v_player_id   THEN 'ds'::player_role
      WHEN red_player_id = v_player_id  THEN 'red_commander'::player_role
      WHEN blue_player_id = v_player_id THEN 'blue_commander'::player_role
      ELSE NULL
    END
  INTO v_role
  FROM spectral_exercises
  WHERE id = exercise_uuid;

  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── spectral_players ────────────────────────────────────────────────
CREATE POLICY "Players can view their own record"
  ON spectral_players FOR SELECT
  USING (auth_user_id = auth.uid());

CREATE POLICY "DS can view all players"
  ON spectral_players FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM spectral_players p
      WHERE p.auth_user_id = auth.uid()
      AND p.role = 'ds'
    )
  );

CREATE POLICY "Players can update their own record"
  ON spectral_players FOR UPDATE
  USING (auth_user_id = auth.uid());

-- ── spectral_scenarios ──────────────────────────────────────────────
-- All authenticated users can read scenarios
CREATE POLICY "Authenticated users can read scenarios"
  ON spectral_scenarios FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Only DS role can modify scenarios
CREATE POLICY "DS can modify scenarios"
  ON spectral_scenarios FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM spectral_players
      WHERE auth_user_id = auth.uid()
      AND role = 'ds'
    )
  );

-- ── spectral_exercises ──────────────────────────────────────────────
CREATE POLICY "Players can view exercises they are assigned to"
  ON spectral_exercises FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM spectral_players p
      WHERE p.auth_user_id = auth.uid()
      AND (
        p.id = spectral_exercises.red_player_id OR
        p.id = spectral_exercises.blue_player_id OR
        p.id = spectral_exercises.ds_player_id
      )
    )
  );

CREATE POLICY "DS can create and manage exercises"
  ON spectral_exercises FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM spectral_players p
      WHERE p.auth_user_id = auth.uid()
      AND p.id = spectral_exercises.ds_player_id
    )
  );

-- ── spectral_turn_records ───────────────────────────────────────────
-- Critical: players only see their own sensor picture, not the full record
-- This is enforced at the API layer, not RLS, because of JSONB column complexity
-- RLS just ensures players can only read records from their exercises

CREATE POLICY "Players can read turn records from their exercises"
  ON spectral_turn_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM spectral_players p
      JOIN spectral_exercises e ON (
        p.id = e.red_player_id OR
        p.id = e.blue_player_id OR
        p.id = e.ds_player_id
      )
      WHERE p.auth_user_id = auth.uid()
      AND e.id = spectral_turn_records.exercise_id
    )
  );

CREATE POLICY "System can insert turn records"
  ON spectral_turn_records FOR INSERT
  WITH CHECK (true);  -- Enforced at API layer via service role

-- ── spectral_player_profiles ────────────────────────────────────────
CREATE POLICY "Players can view their own profile"
  ON spectral_player_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM spectral_players
      WHERE auth_user_id = auth.uid()
      AND id = spectral_player_profiles.player_id
    )
  );

CREATE POLICY "DS can view all profiles"
  ON spectral_player_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM spectral_players
      WHERE auth_user_id = auth.uid()
      AND role = 'ds'
    )
  );

-- ── spectral_post_game_analyses ─────────────────────────────────────
-- DS-only by default; player access requires explicit grant
CREATE POLICY "DS can view all post-game analyses"
  ON spectral_post_game_analyses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM spectral_players p
      JOIN spectral_exercises e ON e.id = spectral_post_game_analyses.exercise_id
      WHERE p.auth_user_id = auth.uid()
      AND p.id = e.ds_player_id
    )
  );

CREATE POLICY "Players can view non-DS-only analyses from their exercises"
  ON spectral_post_game_analyses FOR SELECT
  USING (
    ds_only = false AND
    EXISTS (
      SELECT 1 FROM spectral_players p
      JOIN spectral_exercises e ON (
        p.id = e.red_player_id OR p.id = e.blue_player_id
      )
      WHERE p.auth_user_id = auth.uid()
      AND e.id = spectral_post_game_analyses.exercise_id
    )
  );

-- ── spectral_inject_library ─────────────────────────────────────────
CREATE POLICY "DS can view all injects"
  ON spectral_inject_library FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM spectral_players
      WHERE auth_user_id = auth.uid()
      AND role = 'ds'
    )
  );

-- ── spectral_platform_catalogue ─────────────────────────────────────
CREATE POLICY "All authenticated users can read platform catalogue"
  ON spectral_platform_catalogue FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "DS can modify platform catalogue"
  ON spectral_platform_catalogue FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM spectral_players
      WHERE auth_user_id = auth.uid()
      AND role = 'ds'
    )
  );

-- ── spectral_int_updates ────────────────────────────────────────────
CREATE POLICY "DS can view and manage SPECTRAL-INT updates"
  ON spectral_int_updates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM spectral_players
      WHERE auth_user_id = auth.uid()
      AND role = 'ds'
    )
  );

-- ============================================================
-- REALTIME (enable for live exercise sync)
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE spectral_exercises;
ALTER PUBLICATION supabase_realtime ADD TABLE spectral_turn_records;

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER spectral_players_updated_at
  BEFORE UPDATE ON spectral_players
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER spectral_scenarios_updated_at
  BEFORE UPDATE ON spectral_scenarios
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER spectral_exercises_updated_at
  BEFORE UPDATE ON spectral_exercises
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER spectral_profiles_updated_at
  BEFORE UPDATE ON spectral_player_profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER spectral_platforms_updated_at
  BEFORE UPDATE ON spectral_platform_catalogue
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ============================================================
-- SEED: INJECT LIBRARY (core 20 injects)
-- ============================================================

INSERT INTO spectral_inject_library (id, name, category, description, effect_summary, targets_weakness, teaching_objective, world_state_delta) VALUES

-- Environmental
('ENV-001', 'Unexpected thunderstorm', 'environmental',
 'A fast-moving thunderstorm cell moves through the operating area.',
 'EO/IR degraded 60%, RF range reduced 40%, FPV comms disrupted',
 'Over-reliance on single sensor type',
 'Forces adaptation to degraded sensor environment',
 '{"weather_update": {"precipitation": "heavy_rain", "visibility_km": 2.0, "eo_ir_modifier": 0.4, "rf_propagation_modifier": 0.6, "fpv_flyable": false}}'),

('ENV-002', 'Dust storm onset', 'environmental',
 'A haboob engulfs the southern sector.',
 'Visual nil, radar clutter +35%, FPV impossible',
 'FPV dependence in contested environments',
 'Multi-sensor redundancy in degraded conditions',
 '{"weather_update": {"precipitation": "dust", "visibility_km": 0.2, "eo_ir_modifier": 0.1, "radar_modifier": 0.65, "fpv_flyable": false}}'),

('ENV-003', 'Night transition', 'environmental',
 'Daylight fades. Thermal advantage shifts to Red Force FPV operators.',
 'EO degraded 70%, thermal advantage shifts, GPS-denied FPV dominant',
 'Failure to anticipate night-period threat shift',
 'Time-of-day threat profile changes',
 '{"time_of_day": "night_transition", "weather_update": {"eo_ir_modifier": 0.45}}'),

-- Red Force Offensive
('RED-001', 'OWA saturation launch', 'red_offensive',
 '24x Shahed-136 OWA launched from concealed truck-mounted rails at ECHO-7, mixed with 16x Gerbera decoys.',
 '40x contacts inbound, mixed real/decoy, bearing 247, altitude 200m AGL',
 'c-UAS magazine management, decoy/real sort',
 'Magazine depth mathematics under saturation attack',
 '{"red_launch": {"platform_id": "RED-UAS-01", "quantity": 24, "decoy_quantity": 16}}'),

('RED-002', 'EW surge', 'red_offensive',
 'Red Force activates broadband EW from Krasukha-4 analogue at HOTEL-9.',
 'Blue datalinks degraded 60% for 4 turns, Link-16 affected',
 'Comms-dependent decision-making',
 'Operating under comms-denied conditions — backup procedures',
 '{"ew_surge": {"duration_turns": 4, "blue_comms_modifier": 0.4}}'),

('RED-003', 'Fibre-optic FPV swarm', 'red_offensive',
 'Red deploys 50x fibre-optic FPV drones from pre-positioned urban hides. RF jamming has zero effect.',
 'EW defeat ineffective, kinetic intercept only. 50 FPVs inbound at 50m AGL.',
 'EW over-reliance — failure to reserve kinetic c-UAS for fibre-optic threat',
 'Fibre-optic FPV — the EW-immune threat and kinetic-only response',
 '{"red_launch": {"platform_id": "RED-FPV-01", "quantity": 50, "ew_immune": true}}'),

('RED-004', 'Heavy decoy package', 'red_offensive',
 'Red launches a decoy-heavy OWA package — 70% Gerbera decoys, 30% real Shahed.',
 '35x contacts, 70% decoy — Blue must sort under time pressure',
 'Target classification, decoy recognition',
 'Discriminating real OWA from decoys under time pressure',
 '{"red_launch": {"quantity": 10, "decoy_quantity": 25, "decoy_ratio": 0.7}}'),

('RED-007', 'Anti-radiation missile', 'red_offensive',
 'Red Force fires ARM against Blue radar-emitting c-UAS detect assets.',
 'Blue radar-emitting c-UAS at risk. EMCON violation is fatal.',
 'EMCON discipline — continuous radar emission',
 'Anti-radiation missile threat and EMCON protocols',
 '{"arm_threat": {"target_type": "c_uas_detect", "targeting_method": "radar_emissions"}}'),

('RED-008', 'USV threat', 'red_offensive',
 'Magura-class USV detected approaching Blue logistics pier from the south.',
 'USV contact inbound at 22kt. Multi-domain threat — air defences are not configured for surface.',
 'Multi-domain awareness, USV threat recognition',
 'Uncrewed surface vessel threat and naval c-UAS doctrine',
 '{"red_launch": {"platform_id": "RED-USV-01", "platform_type": "Magura_V5"}}'),

-- Blue Force Pressure
('BLUE-001', 'MALE ISR platform lost', 'blue_pressure',
 'Blue TB2 MALE ISR platform takes a Lancet strike while holding over the northern sector. Loss confirmed.',
 'Primary ISR asset destroyed. Blue targeting picture degraded. Assets now must operate blind.',
 'ISR redundancy planning',
 'Degraded ISR operations — adapting when primary sensors are lost',
 '{"blue_platform_lost": {"platform_id": "BLUE-MALE-01"}}'),

('BLUE-002', 'GCS comms disrupted', 'blue_pressure',
 'Blue GCS primary comms link severed by EW. Platform defaults to last waypoint autonomous mode.',
 'Blue MALE platform goes autonomous — fine control lost for up to 4 turns',
 'Contingency planning for GCS comms loss',
 'Autonomous mode protocols — lost link procedures',
 '{"blue_comms": {"status": "severed", "platform_id": "BLUE-MALE-01", "autonomous_mode": true}}'),

('BLUE-003', 'Intercept magazine exhausted', 'blue_pressure',
 'Blue Coyote battery has expended all 12 intercepts — 6 on decoys, 6 on real OWA. Zero remaining.',
 'Kinetic c-UAS nil. Soft-kill only from this point.',
 'Magazine management — reserving intercepts vs committing early',
 'Magazine depth — the consequence of early commit on decoys',
 '{"blue_platform_update": {"platform_id": "BLUE-CUAS-02", "magazine_remaining": 0}}'),

('BLUE-004', 'Allied asset enters battlespace', 'blue_pressure',
 'A coalition partner nation aircraft enters Blue airspace without prior coordination.',
 'Unknown contact on Blue picture — must be deconflicted immediately. Cannot engage without IFF confirmation.',
 'Coalition deconfliction procedures',
 'Multi-lateral IFF and deconfliction under operational pressure',
 '{"allied_entry": {"contact_id": "ALLIED-01", "confidence": "medium", "classification": "unknown_air"}}'),

-- Doctrine / Strategic
('DOC-001', 'ROE expansion — weapons free', 'doctrine_strategic',
 'Higher command authorises weapons free within the declared engagement zone.',
 'Blue can now engage previously restricted contacts without individual authorisation',
 'ROE application under time pressure',
 'Rapid ROE transition — applying expanded ROE correctly and immediately',
 '{"roe_update": {"weapons_free": true, "engagement_zone": "declared_EZ"}}'),

('DOC-002', 'ROE restriction imposed', 'doctrine_strategic',
 'Strategic communications incident. Higher command imposes hold-fire pending investigation.',
 'All Blue kinetic engagements suspended pending HQ clearance. Each engagement now requires individual authorisation.',
 'ROE compliance under operational pressure',
 'ROE restrictions mid-battle — compliance without mission failure',
 '{"roe_update": {"hold_fire": true, "requires_hq_clearance": true}}'),

('DOC-003', 'Media presence confirmed', 'doctrine_strategic',
 'OSINT confirms a journalist embedded with civilian population in proposed Blue strike corridor.',
 'Media presence in Blue target area. Every engagement now carries escalation and information environment risk.',
 'Information environment awareness',
 'Targeting decisions in a media-present environment — LOAC and optics',
 '{"media_presence": {"grid": "447", "risk_level": "high"}}'),

('DOC-004', 'CASEVAC required', 'doctrine_strategic',
 'Blue forward element reports 3x casualties. CASEVAC required immediately.',
 'Blue must divert UAS asset to CASEVAC escort. Primary mission assets reduced.',
 'Prioritisation under competing resource demands',
 'Resource prioritisation — primary mission vs force protection',
 '{"blue_task": {"priority_task": "CASEVAC_escort", "diverts_platform": "BLUE-MALE-01"}}'),

('DOC-005', 'Political deadline imposed', 'doctrine_strategic',
 'Blue receives strategic signal — operation must conclude within 4 turns. Political window closing.',
 'Strategic clock imposed. Blue must achieve objectives or accept withdrawal in 4 turns.',
 'Decision-making under political time pressure',
 'Strategic time pressure and operational decision tempo',
 '{"strategic_deadline": {"turns_remaining": 4, "consequence": "withdrawal"}}'),

('DOC-007', 'Third party enters battlespace', 'doctrine_strategic',
 'Unknown national actor aircraft entering from the north — unknown intent, unknown capability.',
 'Third actor now present. Rules of engagement do not cover this actor. Escalation risk is real.',
 'Escalation management, third-party deconfliction',
 'Third-party entry — escalation management and ROE gaps',
 '{"third_party_entry": {"contact_id": "UNKNOWN-01", "bearing": 5, "classification": "unknown_military"}}'),

('DOC-008', 'Coalition withdrawal', 'doctrine_strategic',
 'Coalition partner withdraws support — citing national caveats. Blue ORBAT immediately reduced.',
 'Blue loses 30% of ORBAT without warning. Mission continues with reduced assets.',
 'Adaptive planning under unexpected ORBAT reduction',
 'Coalition fragility — adapting to sudden asset loss',
 '{"blue_orbat_reduction": {"reason": "coalition_withdrawal", "reduction_percent": 30}}');

-- ============================================================
-- SEED: PLATFORM CATALOGUE (key platforms from SPECTRAL spec)
-- ============================================================

INSERT INTO spectral_platform_catalogue
  (type_name, display_name, country_of_origin, dod_group, platform_group,
   mtow_kg, payload_kg, endurance_hr, ceiling_ft, speed_kt_cruise,
   range_km, rcs_class, ew_immune, combat_proven, combat_record, cost_usd_approx)
VALUES
  ('Shahed-136', 'Shahed-136 / Geran-2 OWA', 'Iran', '2', 'OWA',
   200, 50, 5, 10000, 100, 2500, 'low', false, true,
   '57,000+ expended against Ukraine 2022-2026. Iran strikes Israel 2024-2025.', 20000),

  ('Shahed-238', 'Shahed-238 / Geran-3 Turbojet OWA', 'Iran', '3', 'OWA',
   220, 50, 3, 12000, 280, 1200, 'low', false, true,
   'Turbojet variant — 520 km/h cruise significantly reduces intercept window.', 35000),

  ('Lancet-3', 'Lancet-3 Loitering Munition', 'Russia', '1', 'loitering_munition',
   12, 3, 1, 5000, 70, 70, 'very_low', false, true,
   'Ukraine 2022-2026 — precision strikes on artillery, air defence, armour.', 35000),

  ('Gerbera', 'Gerbera Decoy Drone', 'Russia', '1', 'decoy',
   5, 0, 1, 5000, 100, 500, 'low', false, true,
   'Saturates Ukrainian c-UAS magazine alongside real OWA packages.', 5000),

  ('Bayraktar TB2', 'Bayraktar TB2 MALE UCAV', 'Turkey', '3', 'MALE_strike',
   650, 150, 27, 27000, 70, 300, 'medium', false, true,
   'Nagorno-Karabakh 2020, Ukraine 2022, Libya, Syria, Mali, Ethiopia.', 5000000),

  ('Bayraktar TB3', 'Bayraktar TB3 Naval MALE UCAV', 'Turkey', '4', 'MALE_strike',
   1400, 280, 24, 30000, 90, 400, 'medium', false, false,
   'First UCAV to take off and land from a short-deck vessel (TCG Anadolu LHD).', 12000000),

  ('Bayraktar Akinci', 'Bayraktar Akinci HALE UCAV', 'Turkey', '5', 'UCAV',
   6000, 1500, 24, 40000, 130, 750, 'medium', false, false,
   'Pençe-Kilit ops vs PKK. Located Iranian President Raisi crash site May 2024.', 30000000),

  ('Bayraktar Kizilelma', 'Bayraktar Kizilelma Jet UCAV', 'Turkey', '5', 'UCAV',
   6000, 1500, 5, 45000, 450, 1000, 'low', false, false,
   'First jet UCAV into Turkish inventory 2026. Air-to-air test Nov 2025.', 25000000),

  ('MQ-9B SkyGuardian', 'MQ-9B SkyGuardian MALE', 'USA', '5', 'MALE_strike',
   5670, 2155, 40, 40000, 210, 6500, 'medium', false, true,
   'MQ-9 family: 1,000+ strikes Iraq, Afghanistan, Syria, Somalia, Libya, Yemen.', 32000000),

  ('GJ-11 Sharp Sword', 'GJ-11 Sharp Sword Stealth UCAV', 'China', '5', 'UCAV',
   10000, 2000, 6, 50000, 400, 2000, 'very_low', false, false,
   'Tibet (Shigatse) operational deployment Aug-Sep 2025. Victory Day parade carrier variant.', NULL),

  ('Wing Loong II', 'Wing Loong II (GJ-2) MALE UCAV', 'China', '5', 'MALE_strike',
   4200, 480, 32, 30000, 200, 4000, 'medium', false, true,
   'Libya, Saudi Arabia vs Houthi, Nigeria vs Boko Haram, Ethiopia.', 2000000),

  ('Skydio X10D', 'Skydio X10D Tactical Nano ISR', 'USA', '1', 'nano_isr',
   2, 0.5, 0.5, 1200, 30, 5, 'very_low', false, false,
   'US Army SRR Tranche 2. Deployed to Norway and Spain. GPS-denied capable.', 25000),

  ('Black Hornet 4', 'Black Hornet 4 Personal Recon System', 'Norway/USA', '1', 'nano_isr',
   0.07, 0.01, 0.5, 1200, 20, 2, 'very_low', false, true,
   'US Army, UK, AUS, Norway, France, Germany. Combat use Afghanistan, Ukraine (UK).', 50000),

  ('Switchblade 600', 'Switchblade 600 Anti-Armour Loitering Munition', 'USA', '2', 'loitering_munition',
   23, 6, 0.7, 15000, 60, 90, 'low', false, false,
   'FMS to Ukraine and Taiwan. Block 2 with AI-ATR announced Oct 2025.', 80000),

  ('Altius 600', 'Altius 600 Air-Launched Effect', 'USA', '2', 'loitering_munition',
   14, 3, 4, 18000, 90, 500, 'low', false, false,
   'FMS to Taiwan 291x. USAF A2E contract $50M Oct 2025. MQ-9 mothership deployment.', 60000),

  ('Coyote Block 2', 'Raytheon Coyote Block 2 C-UAS Interceptor', 'USA', '1', 'c_uas_defeat_kinetic',
   6, 1, 0.5, 10000, 80, 10, 'very_low', false, false,
   'US Replicator 2 C-UAS programme. Kinetic intercept for Group 1-3 threats.', 75000),

  ('DroneShield DroneSentinel', 'DroneShield DroneSentinel RF Detect', 'Australia', NULL, 'c_uas_detect',
   30, NULL, NULL, NULL, NULL, 8, 'high', false, true,
   'Ukraine, Middle East, NATO members. Detect range 8km. Multi-sensor fusion.', 200000),

  ('Magura V5', 'Magura V5 Armed USV', 'Ukraine', NULL, 'USV',
   1100, 320, NULL, NULL, 42, 740, 'low', false, true,
   'First USV to sink an enemy warship in combat (Feb 2024). Shot down 2x SU-30 and 2x helos.', 280000),

  ('MQ-28A Ghost Bat', 'Boeing MQ-28A Ghost Bat CCA', 'Australia', '5', 'CCA',
   3175, 500, 6, 45000, 400, 3000, 'low', false, false,
   'Live AIM-120 AMRAAM kill Dec 2025 — first validated CCA air-to-air kill.', 15000000),

  ('YFQ-44 Fury', 'Anduril YFQ-44 Fury CCA', 'USA', '5', 'CCA',
   2500, 400, 4, 50000, 450, 2000, 'low', false, false,
   'First flight 31 Oct 2025 Victorville CA. 2x AIM-120. Lattice autonomy stack.', NULL);

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE spectral_exercises IS
  'Live exercise instances. Each row is one Red vs Blue game session.';
COMMENT ON TABLE spectral_turn_records IS
  'Append-only turn-by-turn history. Never update, only insert.';
COMMENT ON TABLE spectral_player_profiles IS
  'Cross-session persistent player behaviour profiles. Updated by SPECTRAL-REF after each turn.';
COMMENT ON TABLE spectral_post_game_analyses IS
  'Game tree analysis generated by SPECTRAL-REF after exercise completion. DS-only by default.';
COMMENT ON TABLE spectral_int_updates IS
  'SPECTRAL-INT autonomous OSINT feed. All updates require SME approval before platform catalogue update.';
COMMENT ON COLUMN spectral_turn_records.adjudication_result IS
  'Full AdjudicationResult JSON from SPECTRAL-REF. Contains ground truth — never expose to players directly.';
COMMENT ON COLUMN spectral_exercises.current_world_state IS
  'Live WorldState JSON. Updated by SPECTRAL-REF after every turn adjudication.';
