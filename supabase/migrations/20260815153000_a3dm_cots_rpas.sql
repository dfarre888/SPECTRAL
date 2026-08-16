-- Shared A3DM ↔ Spectral COTS RPAS catalog
-- Runtime seed: data/a3dm/*.json via scripts/import-a3dm-rpas.py
-- Re-import is idempotent on MFR-### / DRN-#### / PLD-#### / CMP-####.

ALTER TABLE platforms DROP CONSTRAINT IF EXISTS platforms_category_check;
ALTER TABLE platforms ADD CONSTRAINT platforms_category_check CHECK (category IN (
  'MALE','HALE','tactical','loitering_munition','FPV','naval','VTOL',
  'fixed_wing_tactical','interceptor_uas','combat_hexacopter','carrier_uas','tube_launched_lm',
  'c_uas_gun','c_uas_laser','c_uas_rf','manpads','c_uas_system',
  'ballistic_missile_srbm','ballistic_missile_mrbm','cruise_missile','hypersonic_missile','ballistic_missile_slbm',
  'AUV','strategic_ew','cots'
));

ALTER TABLE platforms ADD COLUMN IF NOT EXISTS a3dm_drone_id TEXT;
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS dry_weight_kg NUMERIC;
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS max_payload_kg NUMERIC;
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS a3dm_category TEXT;
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS sub_category TEXT;
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS catalog_tier TEXT;
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS retired BOOLEAN DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_platforms_a3dm_drone_id
  ON platforms (a3dm_drone_id) WHERE a3dm_drone_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_platforms_catalog_tier ON platforms (catalog_tier);

CREATE TABLE IF NOT EXISTS manufacturers (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  country     TEXT,
  type        TEXT,
  website     TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payloads (
  id                  TEXT PRIMARY KEY,
  manufacturer_id     TEXT REFERENCES manufacturers(id) ON DELETE SET NULL,
  name                TEXT NOT NULL,
  type                TEXT NOT NULL,
  weight_g            NUMERIC,
  mount_type          TEXT,
  notes               TEXT,
  spectrum_eligible   BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform_payload_compatibility (
  id              TEXT PRIMARY KEY,
  platform_id     TEXT REFERENCES platforms(id) ON DELETE CASCADE,
  payload_id      TEXT REFERENCES payloads(id) ON DELETE CASCADE,
  a3dm_drone_id   TEXT,
  notes           TEXT,
  UNIQUE (platform_id, payload_id)
);

CREATE INDEX IF NOT EXISTS idx_payloads_type ON payloads (type);
CREATE INDEX IF NOT EXISTS idx_compat_platform ON platform_payload_compatibility (platform_id);
CREATE INDEX IF NOT EXISTS idx_compat_payload ON platform_payload_compatibility (payload_id);

ALTER TABLE manufacturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_payload_compatibility ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS auth_read_manufacturers ON manufacturers;
CREATE POLICY auth_read_manufacturers ON manufacturers
  FOR SELECT USING (auth.uid() IS NOT NULL OR true);

DROP POLICY IF EXISTS auth_read_payloads ON payloads;
CREATE POLICY auth_read_payloads ON payloads
  FOR SELECT USING (auth.uid() IS NOT NULL OR true);

DROP POLICY IF EXISTS auth_read_compat ON platform_payload_compatibility;
CREATE POLICY auth_read_compat ON platform_payload_compatibility
  FOR SELECT USING (auth.uid() IS NOT NULL OR true);

COMMENT ON TABLE manufacturers IS 'Shared A3DM/Spectral OEM master (MFR-###)';
COMMENT ON TABLE payloads IS 'Shared A3DM/Spectral bolt-on sensors and accessories (PLD-####)';
COMMENT ON TABLE platform_payload_compatibility IS 'Drone × payload mount map (CMP-####)';
