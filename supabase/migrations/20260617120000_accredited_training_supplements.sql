-- Accredited training-contract analogues for catalogue data gaps (NOT classified / MoD data)
-- CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY

ALTER TABLE catalogue_data_gaps
  ADD COLUMN IF NOT EXISTS resolved BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS caveat TEXT,
  ADD COLUMN IF NOT EXISTS supplement_count INTEGER NOT NULL DEFAULT 0;


CREATE TABLE IF NOT EXISTS accredited_waveform_profiles (
  id TEXT PRIMARY KEY,
  system_id TEXT NOT NULL,
  capability_fn TEXT NOT NULL,
  label TEXT NOT NULL,
  freq_low_hz BIGINT NOT NULL,
  freq_high_hz BIGINT NOT NULL,
  waveform_family TEXT NOT NULL,
  bandwidth_hz BIGINT,
  hop_rate_hz NUMERIC,
  data_provenance TEXT NOT NULL DEFAULT 'training_contract_analogue' CHECK (
    data_provenance IN (
      'training_contract_analogue',
      'customer_proprietary',
      'accredited_engine',
      'mod_verified',
      'classified_contract'
    )
  ),
  confidence TEXT NOT NULL DEFAULT 'Assessed' CHECK (
    confidence IN ('Confirmed', 'Assessed', 'Estimated', 'Reported', 'Suspected')
  ),
  caveat TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS accredited_waveform_profiles_system
  ON accredited_waveform_profiles (system_id);

CREATE TABLE IF NOT EXISTS accredited_erp_profiles (
  id TEXT PRIMARY KEY,
  system_id TEXT NOT NULL,
  capability_fn TEXT NOT NULL,
  erp_dbm NUMERIC NOT NULL,
  freq_hz BIGINT NOT NULL,
  data_provenance TEXT NOT NULL DEFAULT 'training_contract_analogue' CHECK (
    data_provenance IN (
      'training_contract_analogue',
      'customer_proprietary',
      'accredited_engine',
      'mod_verified',
      'classified_contract'
    )
  ),
  confidence TEXT NOT NULL DEFAULT 'Assessed' CHECK (
    confidence IN ('Confirmed', 'Assessed', 'Estimated', 'Reported', 'Suspected')
  ),
  caveat TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (system_id, capability_fn)
);

CREATE TABLE IF NOT EXISTS accredited_defeat_pk (
  id TEXT PRIMARY KEY,
  platform_id TEXT NOT NULL,
  defeat_system_id TEXT NOT NULL,
  pd_detect_pct SMALLINT CHECK (pd_detect_pct IS NULL OR (pd_detect_pct >= 0 AND pd_detect_pct <= 100)),
  pk_rf_jamming_pct SMALLINT CHECK (pk_rf_jamming_pct IS NULL OR (pk_rf_jamming_pct >= 0 AND pk_rf_jamming_pct <= 100)),
  pk_kinetic_pct SMALLINT CHECK (pk_kinetic_pct IS NULL OR (pk_kinetic_pct >= 0 AND pk_kinetic_pct <= 100)),
  pk_dew_pct SMALLINT CHECK (pk_dew_pct IS NULL OR (pk_dew_pct >= 0 AND pk_dew_pct <= 100)),
  is_immune BOOLEAN NOT NULL DEFAULT false,
  immune_reason TEXT,
  data_provenance TEXT NOT NULL DEFAULT 'training_contract_analogue' CHECK (
    data_provenance IN (
      'training_contract_analogue',
      'customer_proprietary',
      'accredited_engine',
      'mod_verified',
      'classified_contract'
    )
  ),
  confidence TEXT NOT NULL DEFAULT 'Assessed' CHECK (
    confidence IN ('Confirmed', 'Assessed', 'Estimated', 'Reported', 'Suspected')
  ),
  caveat TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (platform_id, defeat_system_id)
);

INSERT INTO accredited_waveform_profiles (
  id, system_id, capability_fn, label, freq_low_hz, freq_high_hz, waveform_family,
  bandwidth_hz, hop_rate_hz, data_provenance, confidence, caveat
) VALUES
  ('acc-wf-edge-jam-control', 'edge-horizon', 'jam_control', 'Training analogue — 2.4 GHz ISM noise jam profile', 2400000000, 2483500000, 'wideband_noise', 50000000, NULL, 'training_contract_analogue', 'Assessed', 'NOT classified Edge Group data. Synthetic training profile for Spectral Operations contract exercises only.'),
  ('acc-wf-edge-jam-video', 'edge-horizon', 'jam_video', 'Training analogue — 5.8 GHz video downlink jam profile', 5725000000, 5875000000, 'wideband_noise', 40000000, NULL, 'training_contract_analogue', 'Assessed', 'NOT classified Edge Group data. Synthetic training profile for Spectral Operations contract exercises only.'),
  ('acc-wf-edge-jam-gnss', 'edge-horizon', 'jam_gnss', 'Training analogue — GNSS L-band denial profile', 1160000000, 1610000000, 'gnss_chirp', 2000000, NULL, 'training_contract_analogue', 'Reported', 'NOT classified Edge Group data. Synthetic training profile for Spectral Operations contract exercises only.'),
  ('acc-wf-edge-detect-rf', 'edge-horizon', 'detect_rf', 'Training analogue — wideband RF survey profile', 400000000, 6000000000, 'wideband_survey', 5600000000, NULL, 'training_contract_analogue', 'Assessed', 'NOT classified Edge Group data. Synthetic training profile for Spectral Operations contract exercises only.')
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, caveat = EXCLUDED.caveat, confidence = EXCLUDED.confidence;

INSERT INTO accredited_erp_profiles (
  id, system_id, capability_fn, erp_dbm, freq_hz, data_provenance, confidence, caveat
) VALUES
  ('acc-erp-edge-jam-control', 'edge-horizon', 'jam_control', 47, 2441500000, 'training_contract_analogue', 'Assessed', 'NOT accredited propagation-engine output. Training-contract ERP analogue for exercise adjudication.'),
  ('acc-erp-edge-jam-video', 'edge-horizon', 'jam_video', 45, 5800000000, 'training_contract_analogue', 'Assessed', 'NOT accredited propagation-engine output. Training-contract ERP analogue for exercise adjudication.'),
  ('acc-erp-edge-jam-gnss', 'edge-horizon', 'jam_gnss', 43, 1575420000, 'training_contract_analogue', 'Reported', 'NOT accredited propagation-engine output. Training-contract ERP analogue for exercise adjudication.'),
  ('acc-erp-edge-detect-rf', 'edge-horizon', 'detect_rf', 38, 3000000000, 'training_contract_analogue', 'Estimated', 'NOT accredited propagation-engine output. Training-contract ERP analogue for exercise adjudication.')
ON CONFLICT (id) DO UPDATE SET erp_dbm = EXCLUDED.erp_dbm, caveat = EXCLUDED.caveat, confidence = EXCLUDED.confidence;

INSERT INTO accredited_defeat_pk (
  id, platform_id, defeat_system_id, pd_detect_pct, pk_rf_jamming_pct, pk_kinetic_pct, pk_dew_pct,
  is_immune, immune_reason, data_provenance, confidence, caveat
) VALUES
  ('acc-pk-shahed-martlet', 'shahed-136', 'martlet-airborne-cuas', 52, NULL, 72, NULL, false, NULL, 'training_contract_analogue', 'Assessed', 'NOT MoD-verified Pk. Training-contract defeat analogue for UK airborne kinetic layer exercises.'),
  ('acc-pk-shahed-land-ceptor', 'shahed-136', 'land-ceptor-cuas', 54, NULL, 82, NULL, false, NULL, 'training_contract_analogue', 'Assessed', 'NOT MoD-verified Pk. Training-contract defeat analogue for Land Ceptor CAMM layer exercises.'),
  ('acc-pk-shahed-edge', 'shahed-136', 'edge-horizon', 61, 74, NULL, NULL, false, NULL, 'training_contract_analogue', 'Reported', 'NOT classified Edge Group effectiveness data. Training-contract EW defeat analogue.'),
  ('acc-pk-shahed-iron-dome', 'shahed-136', 'iron-dome-tamir', 68, NULL, 88, NULL, false, NULL, 'training_contract_analogue', 'Assessed', 'NOT MoD-verified Pk. Training-contract kinetic analogue for Tamir vs OWA exercises.'),
  ('acc-pk-shahed-nasams', 'shahed-136', 'nasams-amraam-er', 52, NULL, 86, NULL, false, NULL, 'training_contract_analogue', 'Assessed', 'NOT MoD-verified Pk. Training-contract kinetic analogue for NASAMS AMRAAM-ER layer exercises.'),
  ('acc-pk-fpv-edge-immune', 'fpv-fibre-optic', 'edge-horizon', 35, 0, NULL, NULL, true, 'Fibre-optic C2 — RF jamming ineffective (training analogue)', 'training_contract_analogue', 'Confirmed', 'NOT MoD-verified immunity table. Training-contract analogue for fibre-optic FPV RF immunity.'),
  ('acc-pk-fpv-martlet-kinetic', 'fpv-fibre-optic', 'martlet-airborne-cuas', 48, NULL, 65, NULL, false, NULL, 'training_contract_analogue', 'Reported', 'NOT MoD-verified Pk. Training-contract kinetic-only defeat path for fibre FPV.')
ON CONFLICT (id) DO UPDATE SET pd_detect_pct = EXCLUDED.pd_detect_pct, pk_rf_jamming_pct = EXCLUDED.pk_rf_jamming_pct, pk_kinetic_pct = EXCLUDED.pk_kinetic_pct, is_immune = EXCLUDED.is_immune, immune_reason = EXCLUDED.immune_reason, caveat = EXCLUDED.caveat, confidence = EXCLUDED.confidence;

UPDATE catalogue_data_gaps SET resolved = true, supplement_count = 4, caveat = 'Filled with training_contract_analogue waveform profiles — NOT classified REACH-S parameters.', resolution_path = 'accredited_resolver' WHERE id = 'edge-horizon-waveform-classified';
UPDATE catalogue_data_gaps SET resolved = true, supplement_count = 4, caveat = 'Filled with training_contract_analogue ERP figures — NOT accredited propagation-engine output.', resolution_path = 'accredited_resolver' WHERE id = 'edge-horizon-erp-accredited';
UPDATE catalogue_data_gaps SET resolved = true, supplement_count = 7, caveat = 'Filled with training_contract_analogue Pd/Pk pairs — NOT government-verified defeat tables.', resolution_path = 'accredited_resolver' WHERE id = 'mod-verified-pk-tier';

ALTER TABLE accredited_waveform_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accredited_erp_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accredited_defeat_pk ENABLE ROW LEVEL SECURITY;

CREATE POLICY accredited_waveform_profiles_read ON accredited_waveform_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY accredited_erp_profiles_read ON accredited_erp_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY accredited_defeat_pk_read ON accredited_defeat_pk FOR SELECT TO authenticated USING (true);

COMMENT ON TABLE accredited_waveform_profiles IS 'Training-contract waveform analogues — not classified vendor waveforms.';
COMMENT ON TABLE accredited_erp_profiles IS 'Training-contract ERP analogues — not accredited propagation-engine figures.';
COMMENT ON TABLE accredited_defeat_pk IS 'Training-contract Pd/Pk analogues — not MoD-verified defeat tables.';
