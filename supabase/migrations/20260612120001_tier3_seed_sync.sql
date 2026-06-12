-- Tier 3 promoted platforms — spectrum_capabilities sync (already in platforms table)
-- Idempotent inserts for intel_update_2025 platforms now in TS seeds

INSERT INTO spectrum_capabilities (platform_id, side, layer, function, label, freq_low_hz, freq_high_hz, note, sort_order)
SELECT v.* FROM (VALUES
  ('uj-22-airborne', 'red', 'comms', 'datalink', 'C2 datalink — 2.4 GHz', 2400000000::bigint, 2483500000::bigint, 'UkrJet LM family', 1),
  ('uj-26-bober', 'red', 'comms', 'datalink', 'C2 datalink — 2.4 GHz', 2400000000::bigint, 2483500000::bigint, 'Bober kamikaze LM', 1),
  ('v2u', 'red', 'eo_ir', 'sensor', 'CV/LiDAR nav — GNSS-free', NULL::bigint, NULL::bigint, 'RF jam ineffective', 1),
  ('tb-001', 'red', 'comms', 'datalink', 'LOS datalink — C-band', 4000000000::bigint, 8000000000::bigint, 'Combat envelope capped in Map Intel', 1),
  ('ch-5-rainbow', 'red', 'comms', 'datalink', 'LOS datalink — C-band', 4000000000::bigint, 8000000000::bigint, 'Heavy MALE strike', 1),
  ('wing-loong-1', 'red', 'comms', 'datalink', 'LOS datalink — C-band', 4000000000::bigint, 8000000000::bigint, 'Export MALE', 1),
  ('mq-1c-gray-eagle', 'red', 'comms', 'datalink', 'LOS datalink — C-band', 4000000000::bigint, 8000000000::bigint, 'US Army MALE', 1),
  ('fpv-interceptor', 'red', 'comms', 'control', 'Short-range C2 — 2.4 GHz', 2400000000::bigint, 2483500000::bigint, 'Kinetic intercept', 1)
) AS v(platform_id, side, layer, function, label, freq_low_hz, freq_high_hz, note, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM spectrum_capabilities sc
  WHERE sc.platform_id = v.platform_id AND sc.function = v.function AND sc.label = v.label
);
