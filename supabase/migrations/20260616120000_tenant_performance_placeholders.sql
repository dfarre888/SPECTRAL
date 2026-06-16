-- Bootstrap tenants if operations edition migration was not applied on remote
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

CREATE TABLE IF NOT EXISTS import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  payload JSONB NOT NULL DEFAULT '{}',
  result JSONB,
  error TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tenant-scoped defeat effectiveness + catalogue gap markers (Operations edition)
-- CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY

CREATE TABLE IF NOT EXISTS catalogue_data_gaps (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  reason TEXT NOT NULL,
  resolution_path TEXT NOT NULL CHECK (
    resolution_path IN (
      'tenant_defeat_effectiveness',
      'tenant_platform_extensions',
      'accredited_resolver'
    )
  ),
  related_platform_id TEXT,
  related_system_id TEXT
);

INSERT INTO catalogue_data_gaps (id, label, reason, resolution_path, related_platform_id, related_system_id)
VALUES
  (
    'edge-horizon-waveform-classified',
    'REACH-S / Edge Horizon classified waveforms',
    'Classified Edge Group waveform parameters are contract-gated and cannot ship in the OSINT Training catalogue.',
    'accredited_resolver',
    NULL,
    'edge-horizon'
  ),
  (
    'edge-horizon-erp-accredited',
    'Horizon ERP accredited figures',
    'Exact effective radiated power (ERP) figures require accredited propagation engine data under customer contract — not OSINT-publishable.',
    'tenant_defeat_effectiveness',
    NULL,
    'edge-horizon'
  ),
  (
    'mod-verified-pk-tier',
    'MoD-verified Pk tables',
    'Government-verified defeat probability (Pk) and detection probability (Pd) tables are not releasable in the global OSINT seed.',
    'tenant_defeat_effectiveness',
    NULL,
    NULL
  )
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  reason = EXCLUDED.reason,
  resolution_path = EXCLUDED.resolution_path,
  related_platform_id = EXCLUDED.related_platform_id,
  related_system_id = EXCLUDED.related_system_id;

CREATE TABLE IF NOT EXISTS tenant_platform_extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  platform_id TEXT NOT NULL,
  name TEXT NOT NULL,
  manufacturer TEXT,
  category TEXT NOT NULL DEFAULT 'uas',
  capabilities JSONB NOT NULL DEFAULT '[]',
  data_provenance TEXT NOT NULL DEFAULT 'customer_proprietary' CHECK (
    data_provenance IN (
      'customer_proprietary',
      'accredited_engine',
      'mod_verified',
      'classified_contract'
    )
  ),
  classification TEXT NOT NULL DEFAULT 'UNCLASSIFIED',
  approved BOOLEAN NOT NULL DEFAULT false,
  approved_by UUID,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, platform_id)
);

CREATE INDEX IF NOT EXISTS tenant_platform_extensions_tenant
  ON tenant_platform_extensions (tenant_id);

CREATE TABLE IF NOT EXISTS tenant_defeat_effectiveness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  platform_id TEXT,
  defeat_system_id TEXT,
  rf_jamming_pct SMALLINT CHECK (rf_jamming_pct IS NULL OR (rf_jamming_pct >= 0 AND rf_jamming_pct <= 100)),
  kinetic_pct SMALLINT CHECK (kinetic_pct IS NULL OR (kinetic_pct >= 0 AND kinetic_pct <= 100)),
  dew_pct SMALLINT CHECK (dew_pct IS NULL OR (dew_pct >= 0 AND dew_pct <= 100)),
  pd_detect_pct SMALLINT CHECK (pd_detect_pct IS NULL OR (pd_detect_pct >= 0 AND pd_detect_pct <= 100)),
  data_provenance TEXT NOT NULL DEFAULT 'customer_proprietary' CHECK (
    data_provenance IN (
      'customer_proprietary',
      'accredited_engine',
      'mod_verified',
      'classified_contract'
    )
  ),
  confidence TEXT NOT NULL DEFAULT 'Reported' CHECK (
    confidence IN ('Confirmed', 'Assessed', 'Estimated', 'Reported', 'Suspected')
  ),
  classification TEXT NOT NULL DEFAULT 'UNCLASSIFIED',
  source_notes TEXT,
  approved_by UUID,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS tenant_defeat_effectiveness_unique_pair
  ON tenant_defeat_effectiveness (tenant_id, platform_id, defeat_system_id)
  WHERE platform_id IS NOT NULL AND defeat_system_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS tenant_defeat_effectiveness_tenant
  ON tenant_defeat_effectiveness (tenant_id);

ALTER TABLE import_jobs DROP CONSTRAINT IF EXISTS import_jobs_job_type_check;
ALTER TABLE import_jobs ADD CONSTRAINT import_jobs_job_type_check
  CHECK (job_type IN ('platform', 'document', 'buildings', 'defeat_matrix'));

CREATE OR REPLACE FUNCTION auth_user_tenant_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
$$;

ALTER TABLE catalogue_data_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_platform_extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_defeat_effectiveness ENABLE ROW LEVEL SECURITY;

CREATE POLICY catalogue_data_gaps_read ON catalogue_data_gaps
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY tenant_platform_extensions_select ON tenant_platform_extensions
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT auth_user_tenant_ids()));

CREATE POLICY tenant_platform_extensions_insert ON tenant_platform_extensions
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT auth_user_tenant_ids()));

CREATE POLICY tenant_platform_extensions_update ON tenant_platform_extensions
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT auth_user_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT auth_user_tenant_ids()));

CREATE POLICY tenant_defeat_effectiveness_select ON tenant_defeat_effectiveness
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT auth_user_tenant_ids()));

CREATE POLICY tenant_defeat_effectiveness_insert ON tenant_defeat_effectiveness
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT auth_user_tenant_ids()));

CREATE POLICY tenant_defeat_effectiveness_update ON tenant_defeat_effectiveness
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT auth_user_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT auth_user_tenant_ids()));

COMMENT ON TABLE catalogue_data_gaps IS
  'Documents OSINT catalogue slots intentionally absent due to contract/classification gates.';
COMMENT ON TABLE tenant_defeat_effectiveness IS
  'Tenant-scoped Pd/Pk defeat matrix overrides for Operations customers.';
COMMENT ON TABLE tenant_platform_extensions IS
  'Tenant-scoped proprietary platform stubs keyed by customer slug.';
