-- SCHEMA ONLY: append-only log of every AI answer shown to a user
-- CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
--
-- One row per answer: the question, which engine produced the answer (offline
-- rules engine or Claude via AWS Bedrock), the model id if any, a SHA-256 of
-- the answer text, the library records it cited, and who recorded it.
-- The answer text itself is not stored; the hash lets anyone check that an
-- answer quoted later is the one that was shown.
--
-- Append-only: UPDATE, DELETE and TRUNCATE are revoked from the API roles and
-- refused by triggers for every role. Only a database owner who drops the
-- triggers could change history.

CREATE TABLE IF NOT EXISTS public.ai_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tenant_id UUID REFERENCES public.tenants(id),
  user_id UUID,
  feature TEXT NOT NULL DEFAULT 'aerocopilot' CHECK (char_length(feature) BETWEEN 1 AND 64),
  question TEXT NOT NULL CHECK (char_length(question) BETWEEN 1 AND 4000),
  engine TEXT NOT NULL CHECK (engine IN ('offline', 'bedrock')),
  model_id TEXT CHECK (model_id IS NULL OR char_length(model_id) <= 200),
  answer_sha256 TEXT NOT NULL CHECK (answer_sha256 ~ '^[0-9a-f]{64}$'),
  answer_chars INTEGER CHECK (answer_chars IS NULL OR answer_chars >= 0),
  refs JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(refs) = 'array'),
  -- 'server': written by the route that called the model.
  -- 'client': offline answer computed in the browser and reported by it.
  recorded_by TEXT NOT NULL CHECK (recorded_by IN ('server', 'client')),
  -- true when Bedrock was selected but failed and the offline engine answered.
  fallback BOOLEAN NOT NULL DEFAULT false,
  classification TEXT NOT NULL DEFAULT 'UNCLASSIFIED'
);

COMMENT ON TABLE public.ai_audit_log IS
  'Append-only record of AI answers (engine, model, answer SHA-256, cited records). See app/api/v1/ai-audit.';

CREATE INDEX IF NOT EXISTS ai_audit_log_tenant_created
  ON public.ai_audit_log (tenant_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.ai_audit_log_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'ai_audit_log is append-only: % is not permitted', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

DROP TRIGGER IF EXISTS ai_audit_log_no_update_delete ON public.ai_audit_log;
CREATE TRIGGER ai_audit_log_no_update_delete
  BEFORE UPDATE OR DELETE ON public.ai_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.ai_audit_log_append_only();

DROP TRIGGER IF EXISTS ai_audit_log_no_truncate ON public.ai_audit_log;
CREATE TRIGGER ai_audit_log_no_truncate
  BEFORE TRUNCATE ON public.ai_audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION public.ai_audit_log_append_only();

REVOKE UPDATE, DELETE, TRUNCATE ON public.ai_audit_log FROM anon, authenticated, service_role;
REVOKE ALL ON public.ai_audit_log FROM anon;

ALTER TABLE public.ai_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_audit_log_insert_own ON public.ai_audit_log;
CREATE POLICY ai_audit_log_insert_own ON public.ai_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (
      tenant_id IS NULL
      OR tenant_id IN (SELECT auth_user_tenant_ids())
    )
  );

DROP POLICY IF EXISTS ai_audit_log_select_scope ON public.ai_audit_log;
CREATE POLICY ai_audit_log_select_scope ON public.ai_audit_log
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (
      tenant_id IS NOT NULL
      AND tenant_id IN (SELECT auth_user_tenant_ids())
    )
  );
