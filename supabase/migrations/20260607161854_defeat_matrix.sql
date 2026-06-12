-- ═══════════════════════════════════════════════════════════════════
-- SPECTRAL — Defeat Matrix adjudication fields + extended seed
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE defeat_effectiveness ADD COLUMN IF NOT EXISTS is_immune BOOLEAN DEFAULT false;
ALTER TABLE defeat_effectiveness ADD COLUMN IF NOT EXISTS immune_reason TEXT;
ALTER TABLE defeat_effectiveness ADD COLUMN IF NOT EXISTS adjudication_rationale TEXT;
ALTER TABLE defeat_effectiveness ADD COLUMN IF NOT EXISTS modifiers JSONB DEFAULT '[]';
ALTER TABLE defeat_effectiveness ADD COLUMN IF NOT EXISTS recommended_response TEXT;

-- Additional defeat systems
INSERT INTO anti_drone_systems (
  id, name, manufacturer, country, defeat_method, effective_range_m,
  portability, conflict_validated, data_confidence, sources
) VALUES
  ('iron-beam', 'Iron Beam', 'Rafael', 'Israel',
   ARRAY['laser','directed_energy'], 10000, 'vehicle', true, 'high', ARRAY['Rafael Iron Beam OSINT']),
  ('anvil-interceptor', 'Anduril Anvil', 'Anduril', 'United States',
   ARRAY['kinetic'], 5000, 'man-portable', true, 'medium', ARRAY['Anduril product page']),
  ('net-gun-system', 'Skywall Net Capture', 'OpenWorks Engineering', 'United Kingdom',
   ARRAY['net','kinetic'], 100, 'man-portable', true, 'medium', ARRAY['OpenWorks datasheet'])
ON CONFLICT (id) DO NOTHING;

-- Additional platform
INSERT INTO platforms (
  id, name, manufacturer, country_of_origin, category,
  max_speed_kmh, service_ceiling_m, range_km, endurance_hrs, mtow_kg,
  guidance_type, data_confidence, sources, gnss_used, nav_backup, weapon_types, sensor_suite,
  known_operators, conflict_deployments
) VALUES
  ('v2u-autonomous', 'V2U Autonomous LM', 'Reported Russian field program', 'Russia', 'loitering_munition',
   120, 1000, 30, 1, 8,
   'autonomous', 'estimated', ARRAY['OSINT: SPECTRAL intel update 2025'],
   ARRAY[]::TEXT[], ARRAY['computer_vision','INS'], ARRAY['HE warhead'], ARRAY['EO terminal'],
   ARRAY['Russian forces'], ARRAY['Ukraine'])
ON CONFLICT (id) DO NOTHING;

-- Update fibre-optic FPV RF rows to IMMUNE
UPDATE defeat_effectiveness SET
  is_immune = true,
  immune_reason = 'No RF datalink — physical fibre-optic tether',
  adjudication_rationale = 'Platform uses fibre-optic C2 tether. No RF emissions to jam. RF defeat systems cannot disrupt physical cable link.',
  modifiers = '[{"type":"emcon","label":"RF signature","impact":"None — no RF link"},{"type":"altitude","label":"Low altitude","impact":"-15% kinetic Pk below 50m AGL"}]'::jsonb,
  recommended_response = 'Kinetic intercept only. Deploy FPV interceptor or SHORAD. Visual/acoustic detection required.'
WHERE platform_id = 'fpv-fibre-optic' AND defeat_system_id IN ('drone-dome', 'dronegun-tactical');

-- Iron Beam effectiveness rows
INSERT INTO defeat_effectiveness (
  platform_id, defeat_system_id, rf_jamming_pct, kinetic_pct, dew_pct,
  data_confidence, weather_limited, is_immune, adjudication_rationale, modifiers, recommended_response, special_notes
) VALUES
  ('mq-9-reaper', 'iron-beam', NULL, NULL, 90, 'high', true,
   false, 'HEL DEW — 100kW class. No electronic countermeasure. Weather degrades beam propagation.',
   '[{"type":"weather","label":"Fog/dust/smoke","impact":"-50% DEW effectiveness"}]'::jsonb,
   'Engage in clear air. Maintain beam director line-of-sight. No RF defeat applicable.',
   'Weather-limited — fog, dust, smoke degrade beam'),
  ('fpv-fibre-optic', 'iron-beam', NULL, NULL, 95, 'high', true,
   false, 'Small target — high Pk in clear air at <1km. Fibre-optic immunity irrelevant to DEW.',
   '[{"type":"weather","label":"Dust/smoke","impact":"-40% DEW in contested visibility"}]'::jsonb,
   'Primary defeat for fibre-optic FPV when weather permits.',
   'Assessed 95% in clear air per HELIOS-class benchmarks'),
  ('fpv-fibre-optic', 'anvil-interceptor', NULL, 60, NULL, 'medium', false,
   false, 'Drone-on-drone kinetic intercept. Effective against fibre-optic FPV where RF jamming fails.',
   '[{"type":"altitude","label":"Low altitude","impact":"Engagement geometry challenging"}]'::jsonb,
   'Deploy interceptor UAS screen. Prioritise over RF jamming for fibre-optic targets.',
   'Kinetic intercept — ~60% Pk per OSINT adjudication'),
  ('v2u-autonomous', 'dronegun-tactical', 0, NULL, NULL, 'estimated', false,
   true, 'GNSS-free computer vision navigation. RF jamming of nav band ineffective.',
   '[{"type":"emcon","label":"No RF datalink","impact":"RF jamming 0% — autonomous terminal guidance"}]'::jsonb,
   'Kinetic or DEW only. RF defeat doctrine does not apply.',
   'V2U — RF jammer (nav) 0% per intel doc'),
  ('v2u-autonomous', 'iron-beam', NULL, NULL, 70, 'high', true,
   false, 'Only reliable defeat for GNSS-free autonomous LM. Kinetic magazine depth critical.',
   '[{"type":"swarm","label":"Mass salvo","impact":"Magazine saturation risk at 30+ inbound"}]'::jsonb,
   'Iron Beam or Anvil interceptors. Accept magazine depth constraints.',
   'Kinetic/laser ~70% — only reliable defeat path'),
  ('shahed-136', 'iron-beam', NULL, NULL, 85, 'high', true,
   false, 'OWA-class target — confirmed DEW intercept capability in clear conditions.',
   '[{"type":"weather","label":"Maritime haze","impact":"-30% range in Red Sea conditions"}]'::jsonb,
   'Layer DEW with kinetic interceptors for magazine depth.',
   'Exchange ratio still favours Shahed cost economics')
ON CONFLICT (platform_id, defeat_system_id) DO UPDATE SET
  rf_jamming_pct = EXCLUDED.rf_jamming_pct,
  kinetic_pct = EXCLUDED.kinetic_pct,
  dew_pct = EXCLUDED.dew_pct,
  is_immune = EXCLUDED.is_immune,
  adjudication_rationale = EXCLUDED.adjudication_rationale,
  modifiers = EXCLUDED.modifiers,
  recommended_response = EXCLUDED.recommended_response,
  special_notes = EXCLUDED.special_notes;
