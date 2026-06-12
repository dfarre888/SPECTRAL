-- Spectral Operations Edition — tenant isolation, audit, imports, scenarios
-- CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  edition TEXT NOT NULL DEFAULT 'operations' CHECK (edition IN ('training', 'operations')),
  classification_default TEXT NOT NULL DEFAULT 'UNCLASSIFIED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_members (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('operator', 'analyst', 'commander', 'admin')),
  PRIMARY KEY (tenant_id, user_id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  user_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  classification TEXT NOT NULL DEFAULT 'UNCLASSIFIED',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_tenant_created ON audit_log (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS session_classification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  classification TEXT NOT NULL DEFAULT 'UNCLASSIFIED',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id)
);

CREATE TABLE IF NOT EXISTS customer_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  classification TEXT NOT NULL DEFAULT 'UNCLASSIFIED',
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL CHECK (job_type IN ('platform', 'document', 'buildings')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  payload JSONB NOT NULL DEFAULT '{}',
  result JSONB,
  error TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS building_footprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('osm', 'customer_upload')),
  classification TEXT NOT NULL DEFAULT 'UNCLASSIFIED',
  geometry JSONB NOT NULL,
  height_m DOUBLE PRECISION NOT NULL DEFAULT 10,
  material_class TEXT NOT NULL DEFAULT 'concrete',
  properties JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS building_footprints_tenant ON building_footprints (tenant_id);

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

ALTER TABLE platforms ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'osint';
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS classification TEXT DEFAULT 'UNCLASSIFIED';

-- RLS: tenant isolation when enabled
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE building_footprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE wopr_scenarios ENABLE ROW LEVEL SECURITY;
