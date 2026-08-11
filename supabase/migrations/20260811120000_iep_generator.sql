-- Sage IEP Generator — participants (Sage-equivalent) + NCCD IEP tables
-- CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY

-- ─── Sage participant domain (prerequisite for IEP) ─────────────────────────

CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  preferred_name TEXT,
  date_of_birth DATE,
  primary_disability TEXT,
  diagnoses TEXT[] NOT NULL DEFAULT '{}',
  communication_notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS participants_tenant ON participants (tenant_id);

CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  domain TEXT NOT NULL DEFAULT 'daily_living',
  progress INT NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  target_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS goals_participant ON goals (participant_id);

CREATE TABLE IF NOT EXISTS participant_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  doc_type TEXT NOT NULL DEFAULT 'report'
    CHECK (doc_type IN ('report', 'psych', 'ot', 'speech', 'school', 'medical', 'other')),
  storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES participant_documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  embedding_model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS document_chunks_document ON document_chunks (document_id);

CREATE TABLE IF NOT EXISTS participant_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE UNIQUE,
  recommendations JSONB NOT NULL DEFAULT '[]',
  support_gaps JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS participant_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  granted_by_user_id UUID NOT NULL,
  parent_carer_name TEXT,
  parent_carer_relationship TEXT,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS participant_consents_lookup
  ON participant_consents (participant_id, consent_type, expires_at DESC);

-- ─── IEP tables ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS iep_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_review', 'approved', 'archived')),
  state_territory TEXT NOT NULL DEFAULT 'NSW'
    CHECK (state_territory IN ('NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT')),
  document_title TEXT NOT NULL DEFAULT 'Individual Learning Plan',
  school_name TEXT,
  school_contact TEXT,
  year_level TEXT,
  classroom_teacher TEXT,
  nccd_adjustment_level TEXT
    CHECK (nccd_adjustment_level IS NULL OR nccd_adjustment_level IN ('qdtp', 'supplementary', 'substantial', 'extensive')),
  nccd_category TEXT
    CHECK (nccd_category IS NULL OR nccd_category IN ('sensory', 'physical', 'cognitive', 'social_emotional')),
  nccd_level_rationale TEXT,
  present_levels JSONB NOT NULL DEFAULT '{}',
  student_profile JSONB NOT NULL DEFAULT '{}',
  parent_carer_goals TEXT,
  student_voice TEXT,
  consultation_notes TEXT,
  monitoring_plan JSONB NOT NULL DEFAULT '{}',
  ai_generated BOOLEAN NOT NULL DEFAULT true,
  ai_model_id TEXT,
  iep_model_override TEXT,
  ai_disclaimer_accepted_at TIMESTAMPTZ,
  placeholders_acknowledged BOOLEAN NOT NULL DEFAULT false,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  reviewer_role TEXT CHECK (reviewer_role IS NULL OR reviewer_role IN ('teacher', 'coordinator', 'allied_health')),
  version INT NOT NULL DEFAULT 1,
  supersedes_id UUID REFERENCES iep_plans(id) ON DELETE SET NULL,
  school_year INT NOT NULL DEFAULT EXTRACT(YEAR FROM now())::INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS iep_plans_participant ON iep_plans (participant_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS iep_plans_tenant ON iep_plans (tenant_id);

CREATE TABLE IF NOT EXISTS iep_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  iep_plan_id UUID NOT NULL REFERENCES iep_plans(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  ndis_goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  baseline TEXT,
  target TEXT,
  measurement_method TEXT,
  target_date DATE,
  progress_notes TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  ai_drafted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS iep_goals_plan ON iep_goals (iep_plan_id, sort_order);

CREATE TABLE IF NOT EXISTS iep_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  iep_plan_id UUID NOT NULL REFERENCES iep_plans(id) ON DELETE CASCADE,
  support_area TEXT NOT NULL
    CHECK (support_area IN (
      'curriculum', 'communication', 'health_personal_care', 'movement', 'social_emotional'
    )),
  adjustment_type TEXT,
  description TEXT NOT NULL,
  frequency TEXT,
  intensity TEXT,
  start_date DATE,
  end_date DATE,
  delivered_by TEXT,
  funding_source TEXT NOT NULL DEFAULT 'school'
    CHECK (funding_source IN ('school', 'ndis', 'both', 'family')),
  evidence_method TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS iep_adjustments_plan ON iep_adjustments (iep_plan_id, support_area);

CREATE TABLE IF NOT EXISTS iep_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  iep_plan_id UUID NOT NULL REFERENCES iep_plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  organisation TEXT,
  contact TEXT,
  attended_meeting BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS iep_team_members_plan ON iep_team_members (iep_plan_id);

-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE iep_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE iep_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE iep_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE iep_team_members ENABLE ROW LEVEL SECURITY;

-- Participants: tenant-scoped
CREATE POLICY participants_tenant_select ON participants FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT auth_user_tenant_ids()));
CREATE POLICY participants_tenant_insert ON participants FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT auth_user_tenant_ids()) AND created_by = auth.uid());
CREATE POLICY participants_tenant_update ON participants FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT auth_user_tenant_ids()));

-- Goals: via participant tenant
CREATE POLICY goals_tenant_select ON goals FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM participants p WHERE p.id = participant_id AND p.tenant_id IN (SELECT auth_user_tenant_ids())));
CREATE POLICY goals_tenant_insert ON goals FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM participants p WHERE p.id = participant_id AND p.tenant_id IN (SELECT auth_user_tenant_ids())));

-- Documents + chunks
CREATE POLICY participant_documents_tenant ON participant_documents FOR ALL TO authenticated
  USING (tenant_id IN (SELECT auth_user_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT auth_user_tenant_ids()));

CREATE POLICY document_chunks_tenant ON document_chunks FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM participant_documents d
    WHERE d.id = document_id AND d.tenant_id IN (SELECT auth_user_tenant_ids())
  ));

-- Insights
CREATE POLICY participant_insights_tenant ON participant_insights FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM participants p WHERE p.id = participant_id AND p.tenant_id IN (SELECT auth_user_tenant_ids())))
  WITH CHECK (EXISTS (SELECT 1 FROM participants p WHERE p.id = participant_id AND p.tenant_id IN (SELECT auth_user_tenant_ids())));

-- Consents
CREATE POLICY participant_consents_tenant ON participant_consents FOR ALL TO authenticated
  USING (tenant_id IN (SELECT auth_user_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT auth_user_tenant_ids()));

-- IEP plans
CREATE POLICY iep_plans_tenant_select ON iep_plans FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT auth_user_tenant_ids()));
CREATE POLICY iep_plans_tenant_insert ON iep_plans FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT auth_user_tenant_ids()) AND created_by = auth.uid());
CREATE POLICY iep_plans_tenant_update ON iep_plans FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT auth_user_tenant_ids()));

-- Child tables via iep_plans tenant
CREATE POLICY iep_goals_tenant ON iep_goals FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM iep_plans p WHERE p.id = iep_plan_id AND p.tenant_id IN (SELECT auth_user_tenant_ids())))
  WITH CHECK (EXISTS (SELECT 1 FROM iep_plans p WHERE p.id = iep_plan_id AND p.tenant_id IN (SELECT auth_user_tenant_ids())));

CREATE POLICY iep_adjustments_tenant ON iep_adjustments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM iep_plans p WHERE p.id = iep_plan_id AND p.tenant_id IN (SELECT auth_user_tenant_ids())))
  WITH CHECK (EXISTS (SELECT 1 FROM iep_plans p WHERE p.id = iep_plan_id AND p.tenant_id IN (SELECT auth_user_tenant_ids())));

CREATE POLICY iep_team_members_tenant ON iep_team_members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM iep_plans p WHERE p.id = iep_plan_id AND p.tenant_id IN (SELECT auth_user_tenant_ids())))
  WITH CHECK (EXISTS (SELECT 1 FROM iep_plans p WHERE p.id = iep_plan_id AND p.tenant_id IN (SELECT auth_user_tenant_ids())));

COMMENT ON TABLE iep_plans IS 'Sage IEP Generator — NCCD-compliant Individual Learning Plans (ILP/IEP/NEP/PLSP).';
