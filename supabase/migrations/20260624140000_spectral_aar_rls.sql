-- SPECTRAL PCM — RLS policies for spectral_aar_documents
-- Pattern: 20260613120003_spectral_learner_model.sql (competency records)

DROP POLICY IF EXISTS "Players view own AAR documents" ON spectral_aar_documents;
CREATE POLICY "Players view own AAR documents"
  ON spectral_aar_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM spectral_players
      WHERE auth_user_id = auth.uid() AND id = spectral_aar_documents.player_id
    )
  );

DROP POLICY IF EXISTS "DS views all AAR documents" ON spectral_aar_documents;
CREATE POLICY "DS views all AAR documents"
  ON spectral_aar_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM spectral_players
      WHERE auth_user_id = auth.uid() AND role = 'ds'
    )
  );

DROP POLICY IF EXISTS "DS inserts AAR documents" ON spectral_aar_documents;
CREATE POLICY "DS inserts AAR documents"
  ON spectral_aar_documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM spectral_players
      WHERE auth_user_id = auth.uid() AND role = 'ds'
    )
  );

DROP POLICY IF EXISTS "DS updates AAR documents" ON spectral_aar_documents;
CREATE POLICY "DS updates AAR documents"
  ON spectral_aar_documents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM spectral_players
      WHERE auth_user_id = auth.uid() AND role = 'ds'
    )
  );
