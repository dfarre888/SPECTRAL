-- Accredited Pk: Shahed-136 vs Coyote Block 3 (PCM Iron Crow default kinetic layer)
-- CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY

INSERT INTO accredited_defeat_pk (
  id, platform_id, defeat_system_id,
  pd_detect_pct, pk_kinetic_pct, pk_rf_jamming_pct, pk_dew_pct,
  is_immune, immune_reason, data_provenance, confidence, caveat
) VALUES (
  'acc-pk-shahed-coyote', 'shahed-136', 'coyote-block-3',
  72, 85, NULL, NULL,
  false, NULL, 'training_contract_analogue', 'Assessed',
  'NOT MoD-verified Pk. Training-contract kinetic analogue for Coyote Block 3 vs Shahed-136 PCM exercises.'
) ON CONFLICT (platform_id, defeat_system_id) DO UPDATE
  SET pk_kinetic_pct = EXCLUDED.pk_kinetic_pct,
      pd_detect_pct = EXCLUDED.pd_detect_pct,
      confidence = EXCLUDED.confidence,
      caveat = EXCLUDED.caveat;
