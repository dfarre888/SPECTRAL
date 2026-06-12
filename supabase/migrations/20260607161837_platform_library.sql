-- ═══════════════════════════════════════════════════════════════════
-- SPECTRAL — Platform Library + Defeat Effectiveness
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE platforms ADD COLUMN IF NOT EXISTS guidance_type TEXT
  CHECK (guidance_type IN (
    'INS+GPS','INS+EO','RF_command','fibre_optic',
    'autonomous','INS_only','mesh','preprogrammed','unknown'
  ));

CREATE TABLE IF NOT EXISTS defeat_effectiveness (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id        TEXT NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
  defeat_system_id   TEXT NOT NULL REFERENCES anti_drone_systems(id) ON DELETE CASCADE,
  rf_jamming_pct     SMALLINT CHECK (rf_jamming_pct BETWEEN 0 AND 100),
  kinetic_pct        SMALLINT CHECK (kinetic_pct BETWEEN 0 AND 100),
  dew_pct            SMALLINT CHECK (dew_pct BETWEEN 0 AND 100),
  data_confidence    TEXT CHECK (data_confidence IN ('high','medium','estimated')),
  weather_limited    BOOLEAN DEFAULT false,
  special_notes      TEXT,
  UNIQUE (platform_id, defeat_system_id)
);

ALTER TABLE defeat_effectiveness ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_platforms" ON platforms;
CREATE POLICY "auth_read_platforms" ON platforms
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "public_read_defeat" ON anti_drone_systems;
CREATE POLICY "auth_read_defeat" ON anti_drone_systems
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "auth_read_defeat_effectiveness" ON defeat_effectiveness
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ─── Seed: Platforms ───────────────────────────────────────────────
INSERT INTO platforms (
  id, name, manufacturer, country_of_origin, nato_reporting_name, category,
  max_speed_kmh, service_ceiling_m, range_km, endurance_hrs, mtow_kg, warhead_kg,
  c2_uplink_mhz, c2_downlink_mhz, data_link_mhz, frequency_hopping,
  gnss_used, rtk_capable, nav_backup, weapon_types, sensor_suite,
  known_operators, conflict_deployments, guidance_type, data_confidence, sources
) VALUES
  ('mq-9-reaper', 'MQ-9 Reaper', 'General Atomics', 'United States', NULL, 'MALE',
   482, 15240, 1850, 27, 4760, 340,
   ARRAY[2400, 5800]::NUMERIC[], ARRAY[2400, 5800]::NUMERIC[], ARRAY[2400]::NUMERIC[], true,
   ARRAY['GPS','GLONASS'], false, ARRAY['INS'], ARRAY['Hellfire','GBU-12'],
   ARRAY['EO/IR','SAR','SIGINT'], ARRAY['USAF','RAF','ITA'], ARRAY['Iraq','Afghanistan','Syria'],
   'INS+GPS', 'high', ARRAY['USAF fact sheet']),
  ('shahed-136', 'Shahed-136 / Geran-2', 'HESA / Iran Aircraft Manufacturing', 'Iran', 'Geran-2', 'loitering_munition',
   185, 4000, 2500, 10, 200, 50,
   ARRAY[868]::NUMERIC[], NULL, NULL, false,
   ARRAY['GPS','GLONASS'], false, ARRAY['INS'], ARRAY['HE warhead'],
   ARRAY['INS+GPS guidance'], ARRAY['IRGC','Russian VKS'], ARRAY['Ukraine','Middle East'],
   'preprogrammed', 'high', ARRAY['OSINT: Ukraine War tracking']),
  ('tb2-bayraktar', 'Bayraktar TB2', 'Baykar', 'Turkey', NULL, 'MALE',
   220, 8230, 300, 27, 700, 55,
   ARRAY[2400]::NUMERIC[], ARRAY[2400]::NUMERIC[], ARRAY[2400]::NUMERIC[], true,
   ARRAY['GPS','GLONASS'], false, ARRAY['INS'], ARRAY['MAM-L','MAM-C'],
   ARRAY['EO/IR','laser designator'], ARRAY['Turkey','Ukraine','Poland'], ARRAY['Ukraine','Libya','Nagorno-Karabakh'],
   'RF_command', 'high', ARRAY['Baykar datasheet']),
  ('fpv-fibre-optic', 'FPV Strike Drone (Fibre-Optic)', 'COTS / Field-modified', 'Ukraine', NULL, 'FPV',
   80, 500, 10, 0.5, 1.5, 1.5,
   NULL, NULL, NULL, false,
   ARRAY[]::TEXT[], false, ARRAY['visual'], ARRAY['RPG warhead','grenade'],
   ARRAY['EO camera'], ARRAY['Ukraine AFU','Russian VDV'], ARRAY['Ukraine','Bakhmut'],
   'fibre_optic', 'high', ARRAY['OSINT: Ukraine field reporting Sep 2025']),
  ('lancet-3', 'Lancet-3', 'ZALA Aero / Kalashnikov', 'Russia', NULL, 'loitering_munition',
   300, 5000, 40, 0.75, 12, 3,
   ARRAY[2400]::NUMERIC[], ARRAY[2400]::NUMERIC[], ARRAY[2400]::NUMERIC[], true,
   ARRAY['GLONASS'], false, ARRAY['INS','EO terminal'], ARRAY['HEAT warhead'],
   ARRAY['EO/IR seeker'], ARRAY['Russian MoD'], ARRAY['Ukraine'],
   'INS+EO', 'high', ARRAY['OSINT: Oryx losses'])
ON CONFLICT (id) DO NOTHING;

-- ─── Seed: Anti-Drone Systems ────────────────────────────────────────
INSERT INTO anti_drone_systems (
  id, name, manufacturer, country, defeat_method, effective_range_m,
  portability, conflict_validated, data_confidence, sources
) VALUES
  ('drone-dome', 'Drone Dome', 'Rafael', 'Israel',
   ARRAY['RF_jamming','kinetic'], 3500, 'vehicle', true, 'high', ARRAY['Rafael brochure']),
  ('dronegun-tactical', 'DroneGun Tactical', 'DroneShield', 'Australia',
   ARRAY['RF_jamming'], 2000, 'man-portable', true, 'high', ARRAY['DroneShield datasheet']),
  ('coyote-block-3', 'Coyote Block 3', 'Raytheon', 'United States',
   ARRAY['kinetic'], 15000, 'vehicle', true, 'high', ARRAY['Raytheon press release'])
ON CONFLICT (id) DO NOTHING;

-- ─── Seed: Defeat Effectiveness ──────────────────────────────────────
INSERT INTO defeat_effectiveness (
  platform_id, defeat_system_id, rf_jamming_pct, kinetic_pct, dew_pct,
  data_confidence, weather_limited, special_notes
) VALUES
  ('mq-9-reaper', 'drone-dome', 60, 85, NULL, 'high', false, 'SATCOM/LOS datalink — military EW required for reliable jamming'),
  ('mq-9-reaper', 'dronegun-tactical', 20, NULL, NULL, 'medium', false, 'Low-power jammer — limited effect on MALE SATCOM'),
  ('mq-9-reaper', 'coyote-block-3', NULL, 85, NULL, 'high', false, 'Patriot-class intercept — confirmed MALE defeat'),
  ('shahed-136', 'drone-dome', 40, 70, NULL, 'high', false, 'GNSS jamming only — pre-programmed INS backup limits RF defeat'),
  ('shahed-136', 'dronegun-tactical', 30, NULL, NULL, 'estimated', false, 'GNSS band jamming — partial nav degradation'),
  ('shahed-136', 'coyote-block-3', NULL, 70, NULL, 'high', false, 'OWA intercept — exchange ratio favours attacker cost'),
  ('tb2-bayraktar', 'drone-dome', 55, 80, NULL, 'high', false, 'LOS datalink — contested EW environment degrades C2'),
  ('tb2-bayraktar', 'coyote-block-3', NULL, 75, NULL, 'high', false, 'Confirmed losses to SAM in Nagorno-Karabakh and Ukraine'),
  ('fpv-fibre-optic', 'drone-dome', 0, 65, NULL, 'high', false, 'No RF datalink — RF jamming ineffective; kinetic only'),
  ('fpv-fibre-optic', 'dronegun-tactical', 0, NULL, NULL, 'high', false, 'IMMUNE to RF — fibre-optic tether; no RF environment disruption possible'),
  ('fpv-fibre-optic', 'coyote-block-3', NULL, 60, NULL, 'medium', false, 'Small/fast/low — SHORAD Pk degraded at <50m AGL'),
  ('lancet-3', 'drone-dome', 45, 55, NULL, 'high', false, 'Terminal EO guidance — RF jamming of uplink has limited window'),
  ('lancet-3', 'dronegun-tactical', 35, NULL, NULL, 'estimated', false, 'Brief RF link during terminal phase only'),
  ('lancet-3', 'coyote-block-3', NULL, 50, NULL, 'medium', false, 'Small RCS — detection range limits intercept window')
ON CONFLICT (platform_id, defeat_system_id) DO NOTHING;
