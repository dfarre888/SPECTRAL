-- SCHEMA ONLY — restore audit_log + least-privilege RLS
-- CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  user_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  classification TEXT NOT NULL DEFAULT 'UNCLASSIFIED',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_tenant_created
  ON audit_log (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_log_user_created
  ON audit_log (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_log_insert_own ON audit_log;
CREATE POLICY audit_log_insert_own ON audit_log
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (
      tenant_id IS NULL
      OR tenant_id IN (SELECT auth_user_tenant_ids())
    )
  );

DROP POLICY IF EXISTS audit_log_select_scope ON audit_log;
CREATE POLICY audit_log_select_scope ON audit_log
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (
      tenant_id IS NOT NULL
      AND tenant_id IN (SELECT auth_user_tenant_ids())
    )
  );
