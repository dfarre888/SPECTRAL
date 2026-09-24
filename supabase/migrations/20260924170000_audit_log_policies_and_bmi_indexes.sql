-- Parity with the retired Mumbai project before it is deleted.
--   Sydney never recorded 20260719180000/1_restore_audit_log_rls or the index
--   parts of 20260719160000_bmi_pitch_black_2026; a later parity copy brought
--   the tables and rows across but not these. audit_log has RLS on and no
--   policies in Sydney, so a signed-in (non-demo) session cannot write or
--   read its own audit rows. Definitions are copied from the Mumbai schema
--   dump of 24 Sep 2026. BMI read policies already exist in Sydney under
--   other names and are not duplicated here. Idempotent.
-- CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY

DROP POLICY IF EXISTS audit_log_insert_own ON public.audit_log;
CREATE POLICY audit_log_insert_own ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (tenant_id IS NULL OR tenant_id IN (SELECT public.auth_user_tenant_ids()))
  );

DROP POLICY IF EXISTS audit_log_select_scope ON public.audit_log;
CREATE POLICY audit_log_select_scope ON public.audit_log
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (tenant_id IS NOT NULL AND tenant_id IN (SELECT public.auth_user_tenant_ids()))
  );

CREATE INDEX IF NOT EXISTS audit_log_user_created
  ON public.audit_log (user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS bmi_comms_platform ON public.bmi_platform_comms (platform_id);
CREATE INDEX IF NOT EXISTS bmi_sensors_platform ON public.bmi_platform_sensors (platform_id);
CREATE INDEX IF NOT EXISTS bmi_platforms_exercise ON public.bmi_exercise_platforms (exercise_id);
CREATE INDEX IF NOT EXISTS bmi_platforms_catalog
  ON public.bmi_exercise_platforms (is_catalog, force_side, domain, nation_code) WHERE is_catalog = true;
CREATE INDEX IF NOT EXISTS bmi_platforms_service_status
  ON public.bmi_exercise_platforms (service_status) WHERE is_catalog = true;
