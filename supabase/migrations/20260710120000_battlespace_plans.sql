-- SPECTRAL Planner — battlespace plans + engagement economics
-- CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY

CREATE TABLE IF NOT EXISTS battlespace_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Untitled plan',
  classification TEXT NOT NULL DEFAULT 'UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY',
  phase TEXT NOT NULL DEFAULT 'plan'
    CHECK (phase IN ('plan', 'rehearse', 'archived')),
  vignette_id TEXT,
  laydown JSONB NOT NULL DEFAULT '{"version":1,"uas":[],"cuas":[],"radars":[],"effectors":[]}',
  iads_stacks JSONB NOT NULL DEFAULT '[]',
  economics_scenarios JSONB NOT NULL DEFAULT '[]',
  adjudication_pairs JSONB,
  published_wopr_id UUID REFERENCES wopr_scenarios(id) ON DELETE SET NULL,
  published_pcm_exercise_id UUID REFERENCES spectral_exercises(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS battlespace_plans_user_updated
  ON battlespace_plans (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS battlespace_plans_tenant
  ON battlespace_plans (tenant_id) WHERE tenant_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS battlespace_plan_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES battlespace_plans(id) ON DELETE CASCADE,
  revision INT NOT NULL,
  laydown JSONB NOT NULL,
  iads_stacks JSONB NOT NULL DEFAULT '[]',
  adjudication_pairs JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (plan_id, revision)
);

CREATE TABLE IF NOT EXISTS engagement_economics (
  id TEXT PRIMARY KEY,
  platform_id TEXT NOT NULL,
  defeat_system_id TEXT NOT NULL,
  unit_cost_usd BIGINT,
  magazine_rounds INT,
  reload_min NUMERIC,
  cost_confidence TEXT NOT NULL DEFAULT 'Estimated'
    CHECK (cost_confidence IN ('Confirmed', 'Assessed', 'Estimated', 'Reported', 'Suspected')),
  source_ref TEXT NOT NULL DEFAULT '',
  UNIQUE (platform_id, defeat_system_id)
);

ALTER TABLE battlespace_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE battlespace_plan_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_economics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS battlespace_plans_select ON battlespace_plans;
DROP POLICY IF EXISTS battlespace_plans_insert ON battlespace_plans;
DROP POLICY IF EXISTS battlespace_plans_update ON battlespace_plans;
DROP POLICY IF EXISTS battlespace_plans_delete ON battlespace_plans;

CREATE POLICY battlespace_plans_select ON battlespace_plans
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (tenant_id IS NOT NULL AND tenant_id IN (SELECT auth_user_tenant_ids()))
  );

CREATE POLICY battlespace_plans_insert ON battlespace_plans
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (tenant_id IS NULL OR tenant_id IN (SELECT auth_user_tenant_ids()))
  );

CREATE POLICY battlespace_plans_update ON battlespace_plans
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY battlespace_plans_delete ON battlespace_plans
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY battlespace_plan_revisions_select ON battlespace_plan_revisions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM battlespace_plans p
      WHERE p.id = plan_id
        AND (p.user_id = auth.uid() OR (p.tenant_id IS NOT NULL AND p.tenant_id IN (SELECT auth_user_tenant_ids())))
    )
  );

CREATE POLICY battlespace_plan_revisions_insert ON battlespace_plan_revisions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM battlespace_plans p WHERE p.id = plan_id AND p.user_id = auth.uid())
  );

CREATE POLICY engagement_economics_read ON engagement_economics
  FOR SELECT TO authenticated USING (true);

INSERT INTO engagement_economics (id, platform_id, defeat_system_id, unit_cost_usd, magazine_rounds, reload_min, cost_confidence, source_ref) VALUES
  ('eco-shahed-gepard', 'shahed-136', 'gepard-spaag', 40000, 1000, 0.5, 'Assessed', 'OSINT: RUSI Ukraine 2023 — Gepard AHEAD ~EUR 40k/kill vs Shahed ~$20k'),
  ('eco-shahed-pac3', 'shahed-136', 'patriot-pac-3', 4000000, 16, 30, 'Estimated', 'OSINT: PAC-3 MSE unit cost ~$4M vs Shahed ~$20k — 200:1 exchange'),
  ('eco-shahed-nasams', 'shahed-136', 'nasams-amraam-er', 1000000, 6, 15, 'Estimated', 'OSINT: AMRAAM-ER ~$1M vs Shahed'),
  ('eco-kalibr-gbad', 'kalibr-3m14', 'gbad-cea-sm2-aus', 2500000, 16, 45, 'Assessed', 'OSINT: SM-2 Block IIIB ~$2.5M; Taipan Strike 26 live-fire anchor'),
  ('eco-kalibr-nasams', 'kalibr-3m14', 'nasams-amraam-er', 1000000, 6, 15, 'Assessed', 'OSINT: Ukraine NASAMS primary cruise interceptor'),
  ('eco-jassm-s400', 'jassm-er', 's-400-triumf', 2000000, 8, 60, 'Estimated', 'OSINT: JASSM-ER ~$2M vs S-400 engagement cost context'),
  ('eco-lancet-gepard', 'lancet-3m', 'gepard-spaag', 40000, 1000, 0.5, 'Assessed', 'OSINT: Lancet ~$6k vs Gepard AHEAD'),
  ('eco-lancet-lmadis', 'lancet-3m', 'lmadis', 500000, 999, 0, 'Estimated', 'OSINT: LMADIS RF — zero effect on GPS-independent Lancet')
ON CONFLICT (platform_id, defeat_system_id) DO NOTHING;

COMMENT ON TABLE battlespace_plans IS 'SPECTRAL Planner — persisted Map Intel laydown + IADS stacks + economics scenarios.';
