-- ═══════════════════════════════════════════════════════════════════
-- SPECTRAL — Initial Schema Migration
-- Run: supabase db push  (or paste into Supabase SQL editor)
-- ═══════════════════════════════════════════════════════════════════

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for text search

-- ───────────────────────────────────────────────────────────────────
-- PLATFORMS (UAS database)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE platforms (
  id                     TEXT PRIMARY KEY,
  name                   TEXT NOT NULL,
  manufacturer           TEXT,
  country_of_origin      TEXT,
  nato_reporting_name    TEXT,
  category               TEXT CHECK (category IN (
    'MALE','HALE','tactical','loitering_munition','FPV','naval','VTOL','fixed_wing_tactical'
  )),
  max_speed_kmh          NUMERIC,
  service_ceiling_m      INTEGER,
  range_km               NUMERIC,
  endurance_hrs          NUMERIC,
  mtow_kg                NUMERIC,
  warhead_kg             NUMERIC,
  radar_cross_section_m2 NUMERIC,
  rcs_notes              TEXT,
  c2_uplink_mhz          NUMERIC[],
  c2_downlink_mhz        NUMERIC[],
  data_link_mhz          NUMERIC[],
  frequency_hopping      BOOLEAN DEFAULT false,
  gnss_used              TEXT[]  DEFAULT '{}',
  rtk_capable            BOOLEAN DEFAULT false,
  nav_backup             TEXT[]  DEFAULT '{}',
  stealth_features       TEXT[]  DEFAULT '{}',
  payload_hardpoints     INTEGER,
  weapon_types           TEXT[]  DEFAULT '{}',
  sensor_suite           TEXT[]  DEFAULT '{}',
  known_operators        TEXT[]  DEFAULT '{}',
  conflict_deployments   TEXT[]  DEFAULT '{}',
  itar_controlled        BOOLEAN DEFAULT false,
  data_confidence        TEXT    CHECK (data_confidence IN ('high','medium','estimated','classified')),
  sources                TEXT[]  DEFAULT '{}',
  created_at             TIMESTAMPTZ DEFAULT now(),
  updated_at             TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_platforms_category ON platforms(category);
CREATE INDEX idx_platforms_country  ON platforms(country_of_origin);
CREATE INDEX idx_platforms_name_trgm ON platforms USING gin(name gin_trgm_ops);

-- ───────────────────────────────────────────────────────────────────
-- GNSS CONSTELLATIONS
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE gnss_constellations (
  id                      TEXT PRIMARY KEY,
  full_name               TEXT NOT NULL,
  operator_country        TEXT,
  frequency_bands         JSONB DEFAULT '[]',
  constellation_size      INTEGER,
  accuracy_standard_m     NUMERIC,
  accuracy_rtk_m          NUMERIC,
  military_signal         BOOLEAN DEFAULT false,
  military_signal_details TEXT,
  spoofing_resistance     TEXT,
  jamming_vulnerability   TEXT,
  notes                   TEXT
);

-- ───────────────────────────────────────────────────────────────────
-- GNSS JAMMERS (Tier 1 military / Tier 2 SDR / Tier 3 COTS)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE gnss_jammers (
  id                       TEXT PRIMARY KEY,
  name                     TEXT NOT NULL,
  manufacturer             TEXT,
  country_of_origin        TEXT,
  type                     TEXT CHECK (type IN ('portable','vehicle','fixed','airborne','man-portable')),
  vehicle_platform         TEXT,
  jammer_tier              TEXT CHECK (jammer_tier IN ('tier_1_military','tier_2_sdr','tier_3_cots')),
  procurement              TEXT,
  cost_usd_approx          NUMERIC,
  frequency_bands_jammed   JSONB DEFAULT '{}',
  effective_radius_km      NUMERIC,
  power_watts              NUMERIC,
  spoofing_capable         BOOLEAN DEFAULT false,
  spoofing_software        TEXT,
  also_jams                TEXT[] DEFAULT '{}',
  defeat_drones            TEXT[] DEFAULT '{}',
  does_not_defeat          TEXT[] DEFAULT '{}',
  known_operators          TEXT[] DEFAULT '{}',
  conflict_use             TEXT[] DEFAULT '{}',
  skill_required           TEXT,
  self_jamming_risk        TEXT,
  legal_status             TEXT,
  notes                    TEXT,
  data_confidence          TEXT CHECK (data_confidence IN ('high','medium','estimated','classified'))
);

CREATE INDEX idx_jammers_tier ON gnss_jammers(jammer_tier);

-- ───────────────────────────────────────────────────────────────────
-- ANTI-DRONE SYSTEMS
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE anti_drone_systems (
  id                      TEXT PRIMARY KEY,
  name                    TEXT NOT NULL,
  manufacturer            TEXT,
  country                 TEXT,
  defeat_method           TEXT[] DEFAULT '{}',
  frequency_bands_covered JSONB DEFAULT '{}',
  effective_range_m       INTEGER,
  power_output_w          NUMERIC,
  weight_kg               NUMERIC,
  portability             TEXT CHECK (portability IN ('man-portable','vehicle','fixed','airborne','naval')),
  price_usd_approx        NUMERIC,
  platforms_can_defeat    TEXT[] DEFAULT '{}',
  conflict_validated      BOOLEAN DEFAULT false,
  conflict_notes          TEXT,
  sources                 TEXT[] DEFAULT '{}',
  data_confidence         TEXT CHECK (data_confidence IN ('high','medium','estimated','classified'))
);

-- ───────────────────────────────────────────────────────────────────
-- CONFLICT INCIDENTS
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE conflict_incidents (
  id                   TEXT PRIMARY KEY,
  conflict             TEXT NOT NULL,
  date_range           TEXT,
  location             TEXT,
  platform_used        TEXT REFERENCES platforms(id) ON DELETE SET NULL,
  mission_type         TEXT,
  result               TEXT CHECK (result IN ('success','partial','defeat','unknown')),
  defeat_system_used   TEXT REFERENCES anti_drone_systems(id) ON DELETE SET NULL,
  defeat_method        TEXT,
  tactical_notes       TEXT,
  lessons_learned      TEXT,
  sources              TEXT[] DEFAULT '{}',
  data_confidence      TEXT CHECK (data_confidence IN ('high','medium','estimated','classified')),
  created_at           TIMESTAMPTZ DEFAULT now()
);

-- ───────────────────────────────────────────────────────────────────
-- NAV DENIAL COUNTERMEASURES
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE nav_countermeasures (
  id                          TEXT PRIMARY KEY,
  name                        TEXT NOT NULL,
  type                        TEXT,
  accuracy_m                  NUMERIC,
  jamming_resistance          TEXT CHECK (jamming_resistance IN ('none','low','medium','high','immune')),
  spoofing_resistance         TEXT,
  cost_tier                   TEXT CHECK (cost_tier IN ('low','medium','high','very_high')),
  weight_g                    NUMERIC,
  military_suitable           BOOLEAN DEFAULT false,
  max_speed_suitable_kmh      NUMERIC,
  altitude_range_m            TEXT,
  limitations                 TEXT,
  notes                       TEXT
);

-- ───────────────────────────────────────────────────────────────────
-- SCENARIO TEMPLATES
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE scenario_templates (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name              TEXT NOT NULL,
  description       TEXT,
  terrain_type      TEXT CHECK (terrain_type IN (
    'urban','desert','mountainous','coastal','jungle','arctic','flat_open'
  )),
  ew_environment    TEXT CHECK (ew_environment IN ('clean','degraded','contested','denied')),
  gnss_availability TEXT CHECK (gnss_availability IN (
    'full','multi_constellation','rtk_only','denied'
  )),
  weather           TEXT,
  time_of_day       TEXT,
  red_platforms     TEXT[] DEFAULT '{}',
  blue_systems      TEXT[] DEFAULT '{}',
  inject_pool       JSONB DEFAULT '[]',
  duration_mins     INTEGER DEFAULT 60,
  difficulty        TEXT CHECK (difficulty IN ('intro','standard','advanced','expert')),
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ───────────────────────────────────────────────────────────────────
-- SCENARIO INJECTS (Random disruptors)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE scenario_injects (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title        TEXT NOT NULL,
  description  TEXT NOT NULL,
  type         TEXT CHECK (type IN ('environmental','threat','friendly','comms','roe','logistics')),
  severity     TEXT CHECK (severity IN ('low','medium','high','critical')),
  timing_hint  TEXT,   -- 'early' | 'mid' | 'late' | 'any'
  ew_required  TEXT,   -- only show in 'contested' or 'denied' EW environments
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Seed injects
INSERT INTO scenario_injects (title, description, type, severity, timing_hint) VALUES
  ('GNSS Degraded',          'Jammer deployed 2km north. GNSS accuracy degrades to ±50m. All platforms affected.', 'environmental', 'high',     'mid'),
  ('ROE Change',             'Authority withdraws kinetic approval. No lethal defeat permitted in current sector.', 'roe',           'critical',  'any'),
  ('Blue Comms Failure',     'RF interference — 30% C2 link degradation to all Blue systems for 8 minutes.',         'comms',         'high',     'any'),
  ('Red Reinforcement',      'Intel update: additional 5 Red platforms inbound from bearing 045, ETA 12 minutes.',   'threat',        'high',     'mid'),
  ('Civilian Drone Incursion','Commercial quad enters engagement area from south. Fratricide risk — hold fire.',       'roe',           'critical', 'any'),
  ('Weather Change',         'Visibility drops to 200m. Optical defeat systems degraded. Radar unaffected.',          'environmental', 'medium',   'any'),
  ('Low-Altitude Profile',   'Red platform drops to 30m AGL — terrain masking active. Radar coverage gap.',           'threat',        'high',     'mid'),
  ('Power Failure',          'Generator fault. Blue control station on UPS — 20 min backup only.',                    'logistics',     'critical', 'late'),
  ('Route Adaptation',       'Red platform changes course, exploiting valley for radar shadow. New bearing: 290.',    'threat',        'medium',   'mid'),
  ('Friendly Fire Incident', 'Blue kinetic system engaged wrong target. IFF failure. Stand down all kinetic.',        'friendly',      'critical', 'any'),
  ('Battery Warning',        'Blue defeat system battery at 15%. Recharge or RTB required within 10 minutes.',        'logistics',     'medium',   'late'),
  ('Swarm Detected',         'Radar tracks split — now showing 12 distinct tracks instead of 4. Swarm tactic.',       'threat',        'critical', 'mid'),
  ('Spoof Alert',            'GNSS receiver reporting position 3km from actual. Spoofing in progress.',               'environmental', 'critical', 'any'),
  ('Fiber Optic FPV',        'Red platform shows no RF signature. Suspected fiber-optic C2 link — RF defeat ineffective.', 'threat',   'critical', 'any'),
  ('Media Coverage',         'News drone in area. Non-combatant. Engagement will be on camera. ROE applies.',         'roe',           'medium',   'any');

-- ───────────────────────────────────────────────────────────────────
-- Row Level Security (enable for production)
-- ───────────────────────────────────────────────────────────────────
ALTER TABLE platforms          ENABLE ROW LEVEL SECURITY;
ALTER TABLE gnss_jammers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE anti_drone_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE conflict_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE nav_countermeasures ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_templates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_injects    ENABLE ROW LEVEL SECURITY;

-- Public read for now (lock down per org when auth is wired)
CREATE POLICY "public_read_platforms"          ON platforms          FOR SELECT USING (true);
CREATE POLICY "public_read_jammers"            ON gnss_jammers       FOR SELECT USING (true);
CREATE POLICY "public_read_defeat"             ON anti_drone_systems FOR SELECT USING (true);
CREATE POLICY "public_read_incidents"          ON conflict_incidents FOR SELECT USING (true);
CREATE POLICY "public_read_nav"                ON nav_countermeasures FOR SELECT USING (true);
CREATE POLICY "public_read_scenarios"          ON scenario_templates  FOR SELECT USING (true);
CREATE POLICY "public_read_injects"            ON scenario_injects    FOR SELECT USING (true);
