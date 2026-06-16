-- Bootstrap wopr_scenarios + tenant RLS (remote may lack operations_edition migration)
-- CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  edition TEXT NOT NULL DEFAULT 'operations',
  classification_default TEXT NOT NULL DEFAULT 'UNCLASSIFIED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_members (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator',
  PRIMARY KEY (tenant_id, user_id)
);

CREATE TABLE IF NOT EXISTS wopr_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  classification TEXT NOT NULL DEFAULT 'UNCLASSIFIED',
  world_state JSONB NOT NULL DEFAULT '{}',
  elapsed_min NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'complete')),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION auth_user_tenant_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid();
$$;

ALTER TABLE wopr_scenarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wopr_scenarios_select ON wopr_scenarios;
DROP POLICY IF EXISTS wopr_scenarios_insert ON wopr_scenarios;
DROP POLICY IF EXISTS wopr_scenarios_update ON wopr_scenarios;
DROP POLICY IF EXISTS wopr_scenarios_delete ON wopr_scenarios;

CREATE POLICY wopr_scenarios_select ON wopr_scenarios
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT auth_user_tenant_ids()));

CREATE POLICY wopr_scenarios_insert ON wopr_scenarios
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT auth_user_tenant_ids()));

CREATE POLICY wopr_scenarios_update ON wopr_scenarios
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT auth_user_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT auth_user_tenant_ids()));

CREATE POLICY wopr_scenarios_delete ON wopr_scenarios
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT auth_user_tenant_ids()));

COMMENT ON TABLE wopr_scenarios IS
  'Tenant-scoped WOPR Red/Blue scenario state for Operations edition arena.';
