-- SPECTRAL — SA-22 Greyhound + Pantsir defeat rows
-- CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
--
-- Adds SA-22 Greyhound to anti_drone_systems and defeat_effectiveness for
-- 9 SAM matrix platforms. Backfills pantsir-s1-cuas rows where missing.

INSERT INTO anti_drone_systems
  (id, name, manufacturer, country, defeat_method, effective_range_m,
   portability, conflict_validated, conflict_notes, data_confidence)
VALUES
('sa-22-greyhound',
 'SA-22 Greyhound (96K6 Pantsir-S1)', 'KBP Tula', 'Russia/Export',
 ARRAY['kinetic'], 20000, 'vehicle', true,
 '57E6 active radar + 2×30 mm guns. Inner-layer point defence for IADS nodes. Ukraine/Red Sea mixed combat reporting vs saturation UAS.',
 'high')
ON CONFLICT (id) DO NOTHING;

-- SA-22 defeat effectiveness — base_pk × 100 from sam-intercept profile
INSERT INTO defeat_effectiveness
  (platform_id, defeat_system_id, kinetic_pct, data_confidence,
   weather_limited, special_notes, is_immune, immune_reason, swarm_engagement_pct)
VALUES
('fpv-rc',           'sa-22-greyhound', 20, 'high',      false, '57E6 active radar + 30 mm gun layer effective <2 km vs FPV.', false, null, 12),
('shahed-136',       'sa-22-greyhound', 58, 'high',      false, 'Ukraine/Red Sea: Pantsir employed vs OWA — mixed results under saturation.', false, null, 32),
('geran-2',          'sa-22-greyhound', 58, 'high',      false, 'Same OWA class as Shahed-136.', false, null, 32),
('lancet-3',         'sa-22-greyhound', 48, 'estimated', false, 'Active radar terminal vs manoeuvring LM.', false, null, 26),
('kargu-2',          'sa-22-greyhound', 38, 'estimated', false, 'Small autonomous LM — gun preferred at close range.', false, null, 22),
('orlan-10',         'sa-22-greyhound', 68, 'high',      false, 'Tactical ISR within Pantsir envelope.', false, null, 44),
('tb2-bayraktar',    'sa-22-greyhound', 75, 'estimated', false, 'MALE at medium altitude — 57E6 missile engagement.', false, null, 52),
('mq-9-reaper',      'sa-22-greyhound', 75, 'estimated', false, 'MALE turboprop.', false, null, 52),
('rq-4-global-hawk', 'sa-22-greyhound', 55, 'estimated', false, 'HALE at lower transit altitude within 15 km ceiling; marginal at cruise.', false, null, 38)
ON CONFLICT (platform_id, defeat_system_id) DO NOTHING;

-- Pantsir-S1 C-UAS row backfill (same 9 platforms)
INSERT INTO defeat_effectiveness
  (platform_id, defeat_system_id, kinetic_pct, data_confidence,
   weather_limited, special_notes, is_immune, immune_reason, swarm_engagement_pct)
VALUES
('fpv-rc',           'pantsir-s1-cuas', 20, 'high',      false, '57E6 + 30 mm — gun layer vs FPV <2 km.', false, null, 12),
('shahed-136',       'pantsir-s1-cuas', 58, 'high',      false, 'Pantsir-S1 vs OWA — OSINT combat reporting 2022-2026.', false, null, 32),
('geran-2',          'pantsir-s1-cuas', 58, 'high',      false, 'Same OWA class.', false, null, 32),
('lancet-3',         'pantsir-s1-cuas', 48, 'estimated', false, 'Manoeuvring LM — missile + gun dual mode.', false, null, 26),
('kargu-2',          'pantsir-s1-cuas', 38, 'estimated', false, 'Small autonomous LM.', false, null, 22),
('orlan-10',         'pantsir-s1-cuas', 68, 'high',      false, 'Tactical ISR within envelope.', false, null, 44),
('tb2-bayraktar',    'pantsir-s1-cuas', 75, 'estimated', false, 'MALE engagement zone.', false, null, 52),
('mq-9-reaper',      'pantsir-s1-cuas', 75, 'estimated', false, 'MALE turboprop.', false, null, 52),
('rq-4-global-hawk', 'pantsir-s1-cuas', 55, 'estimated', false, 'HALE transit phases within ceiling.', false, null, 38)
ON CONFLICT (platform_id, defeat_system_id) DO NOTHING;
