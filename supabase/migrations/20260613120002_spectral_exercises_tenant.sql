-- Optional tenant isolation for Operations-grade PCM building footprints
-- FK to tenants is added only when Operations edition schema is present.
ALTER TABLE spectral_exercises
  ADD COLUMN IF NOT EXISTS tenant_id UUID;

DO $$
BEGIN
  IF to_regclass('public.tenants') IS NOT NULL THEN
    ALTER TABLE spectral_exercises
      DROP CONSTRAINT IF EXISTS spectral_exercises_tenant_id_fkey;
    ALTER TABLE spectral_exercises
      ADD CONSTRAINT spectral_exercises_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_spectral_exercises_tenant
  ON spectral_exercises(tenant_id)
  WHERE tenant_id IS NOT NULL;

COMMENT ON COLUMN spectral_exercises.tenant_id IS
  'Operations edition: tenant for building footprint load during pair adjudication.';
