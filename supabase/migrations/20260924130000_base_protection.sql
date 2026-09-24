-- Base Protection module
--   base_protection_site_plans: per-tenant planned C-UAS package per Defence site
--     (planning input only; not a record of what is fielded). No row = none assigned.
--   base_protection_evidence:   append-only Counter-UXS incident evidence log.
--     Each row is one version of a record. record_hash is SHA-384 (hex) of the
--     canonical JSON of {record_id, version, prev_hash, created_at, payload},
--     computed server-side (lib/base-protection/evidence-hash.ts). Amendments are
--     new versions whose prev_hash is the previous version's record_hash.
--     UPDATE and DELETE are blocked by trigger.
-- Seeds three EXERCISE records (training examples, not real incidents) for the
-- demo tenant. Hashes were generated with the application code so they verify.
-- CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY

CREATE TABLE IF NOT EXISTS base_protection_site_plans (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(items) = 'array'),
  radius_m INTEGER CHECK (radius_m IS NULL OR radius_m BETWEEN 100 AND 100000),
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, site_id)
);

ALTER TABLE base_protection_site_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS base_protection_site_plans_select ON base_protection_site_plans;
DROP POLICY IF EXISTS base_protection_site_plans_insert ON base_protection_site_plans;
DROP POLICY IF EXISTS base_protection_site_plans_update ON base_protection_site_plans;
DROP POLICY IF EXISTS base_protection_site_plans_delete ON base_protection_site_plans;

CREATE POLICY base_protection_site_plans_select ON base_protection_site_plans
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT auth_user_tenant_ids()));
CREATE POLICY base_protection_site_plans_insert ON base_protection_site_plans
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT auth_user_tenant_ids()));
CREATE POLICY base_protection_site_plans_update ON base_protection_site_plans
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT auth_user_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT auth_user_tenant_ids()));
CREATE POLICY base_protection_site_plans_delete ON base_protection_site_plans
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT auth_user_tenant_ids()));

COMMENT ON TABLE base_protection_site_plans IS
  'Planned C-UAS package per Defence site, per tenant. Planning input only; not a record of fielded capability.';

CREATE TABLE IF NOT EXISTS base_protection_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  record_id UUID NOT NULL,
  version INTEGER NOT NULL CHECK (version >= 1),
  prev_hash TEXT CHECK (prev_hash IS NULL OR prev_hash ~ '^[0-9a-f]{96}$'),
  record_hash TEXT NOT NULL CHECK (record_hash ~ '^[0-9a-f]{96}$'),
  payload JSONB NOT NULL,
  is_exercise BOOLEAN NOT NULL DEFAULT false,
  site_id TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT base_protection_evidence_version_unique UNIQUE (tenant_id, record_id, version),
  CONSTRAINT base_protection_evidence_hash_unique UNIQUE (record_hash),
  CONSTRAINT base_protection_evidence_chain CHECK ((version = 1) = (prev_hash IS NULL))
);

CREATE INDEX IF NOT EXISTS base_protection_evidence_tenant_created
  ON base_protection_evidence (tenant_id, created_at DESC);

ALTER TABLE base_protection_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS base_protection_evidence_select ON base_protection_evidence;
DROP POLICY IF EXISTS base_protection_evidence_insert ON base_protection_evidence;

CREATE POLICY base_protection_evidence_select ON base_protection_evidence
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT auth_user_tenant_ids()));
CREATE POLICY base_protection_evidence_insert ON base_protection_evidence
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT auth_user_tenant_ids()));
-- No UPDATE or DELETE policies: the log is append-only.

CREATE OR REPLACE FUNCTION base_protection_evidence_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Escape hatch for an administrator purging a whole tenant: SET LOCAL spectral.evidence_purge = 'on'.
  IF TG_OP = 'DELETE' AND coalesce(current_setting('spectral.evidence_purge', true), '') = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'base_protection_evidence is append-only; record an amendment as a new version';
END;
$$;

DROP TRIGGER IF EXISTS base_protection_evidence_no_update ON base_protection_evidence;
CREATE TRIGGER base_protection_evidence_no_update
  BEFORE UPDATE OR DELETE ON base_protection_evidence
  FOR EACH ROW EXECUTE FUNCTION base_protection_evidence_append_only();

COMMENT ON TABLE base_protection_evidence IS
  'Append-only Counter-UXS incident evidence log. Structured to support reporting under the Counter-UXS Measures Regulations 2025; not a compliance claim.';

-- Exercise records for the demo tenant (training examples, not real incidents).
INSERT INTO base_protection_evidence
  (id, tenant_id, record_id, version, prev_hash, record_hash, payload, is_exercise, site_id, created_by, created_at)
SELECT v.* FROM (VALUES
  ('b9a1c0de-0000-4000-8000-000000000101'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'b9a1c0de-0001-4000-8000-000000000001'::uuid, 1, NULL::text, '9602dbe630c71c3cac0abe01c3e01250b53084e58b04fbda8d9abce1005c91c0aeb12d052b18945dbcfac099ba6d4a29', '{"schema":"spectral.counter-uxs-evidence/1","exercise":true,"site_id":"raaf-williamtown","site_name":"RAAF Base Williamtown","occurred":{"local":"2026-07-11T21:40","time_zone":"Australia/Sydney","utc_offset":"+10:00","utc":"2026-07-11T11:40:00.000Z"},"detection":{"method":"visual","sensor":"Security patrol with night-vision binoculars"},"track":{"heading_deg":250,"altitude_m_agl":120,"drone_type":"Small multirotor, type not identified","description":"Exercise. Single light hovering near the northern boundary, moved towards the runway threshold, then left to the west after about 6 minutes."},"threat":{"level":"medium","rationale":"Unidentified drone in restricted airspace near an active runway during a flying window."},"action":{"taken":"observe","detail":"Observed and logged. No measure used."},"authorising_officer_role":"Duty Base Security Officer","police":{"agency":"NSW Police Force","reference":"","notified_local":"2026-07-11T22:05"},"evidence_items":[{"description":"Patrol log extract (exercise placeholder file)","algorithm":"SHA-384","checksum":"eebc35fc081fd5edc34b3be8fb277cd0bc3663c961b8c50a271f43c7a11dbacc32bd133ace8b983e2c5be9cd13073ddb"},{"description":"Handheld video, 42 s (exercise placeholder file)","algorithm":"SHA-384","checksum":"afc879967f73db7fe4c4934e53e9ef0724380b7b19daabdf616ed9fbc718266a2bd35104ae9acb0d74aabd9722656833"}],"notes":"Exercise record. Training example modelled on the publicly reported July 2026 pattern at Williamtown. Not a real incident and not real police data."}'::jsonb, true, 'raaf-williamtown', NULL::uuid, '2026-07-11T12:30:00.000Z'::timestamptz),
  ('b9a1c0de-0000-4000-8000-000000000102'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'b9a1c0de-0001-4000-8000-000000000001'::uuid, 2, '9602dbe630c71c3cac0abe01c3e01250b53084e58b04fbda8d9abce1005c91c0aeb12d052b18945dbcfac099ba6d4a29', '1ac34a45138c97390109cdf599891cd450f125d71ea8c168560ceef0c46c4a77ce7e4d29bdf483429adc4dfad603a3d1', '{"schema":"spectral.counter-uxs-evidence/1","exercise":true,"site_id":"raaf-williamtown","site_name":"RAAF Base Williamtown","occurred":{"local":"2026-07-11T21:40","time_zone":"Australia/Sydney","utc_offset":"+10:00","utc":"2026-07-11T11:40:00.000Z"},"detection":{"method":"visual","sensor":"Security patrol with night-vision binoculars"},"track":{"heading_deg":250,"altitude_m_agl":120,"drone_type":"Small multirotor, type not identified","description":"Exercise. Single light hovering near the northern boundary, moved towards the runway threshold, then left to the west after about 6 minutes."},"threat":{"level":"medium","rationale":"Unidentified drone in restricted airspace near an active runway during a flying window."},"action":{"taken":"observe","detail":"Observed and logged. No measure used."},"authorising_officer_role":"Duty Base Security Officer","police":{"agency":"NSW Police Force","reference":"EX-NSWPF-0711-01","notified_local":"2026-07-11T22:05"},"evidence_items":[{"description":"Patrol log extract (exercise placeholder file)","algorithm":"SHA-384","checksum":"eebc35fc081fd5edc34b3be8fb277cd0bc3663c961b8c50a271f43c7a11dbacc32bd133ace8b983e2c5be9cd13073ddb"},{"description":"Handheld video, 42 s (exercise placeholder file)","algorithm":"SHA-384","checksum":"afc879967f73db7fe4c4934e53e9ef0724380b7b19daabdf616ed9fbc718266a2bd35104ae9acb0d74aabd9722656833"}],"notes":"Exercise record. Training example modelled on the publicly reported July 2026 pattern at Williamtown. Not a real incident and not real police data.","amendment_reason":"Police reference added after the call-back."}'::jsonb, true, 'raaf-williamtown', NULL::uuid, '2026-07-12T00:10:00.000Z'::timestamptz),
  ('b9a1c0de-0000-4000-8000-000000000201'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'b9a1c0de-0002-4000-8000-000000000002'::uuid, 1, NULL::text, '3d97908996009d6fbb0012d6fd48739fea0bf8d7f1f508b4206e479c41f9635801af14c9692fad32434b40e852f290f2', '{"schema":"spectral.counter-uxs-evidence/1","exercise":true,"site_id":"raaf-williamtown","site_name":"RAAF Base Williamtown","occurred":{"local":"2026-08-04T19:15","time_zone":"Australia/Sydney","utc_offset":"+10:00","utc":"2026-08-04T09:15:00.000Z"},"detection":{"method":"rf","sensor":"Portable RF detector (exercise kit)"},"track":{"heading_deg":90,"altitude_m_agl":80,"drone_type":"Consumer quadcopter, DJI-class RF signature","description":"Exercise. Control link detected north-east of the base; operator not located. The drone held station for about 4 minutes, then left to the east."},"threat":{"level":"medium","rationale":"Repeat activity in the same area within a month."},"action":{"taken":"detect","detail":"RF detection and bearing logged. No measure used."},"authorising_officer_role":"Duty Base Security Officer","police":{"agency":"NSW Police Force","reference":"EX-NSWPF-0804-02","notified_local":"2026-08-04T19:40"},"evidence_items":[{"description":"RF detector log export, CSV (exercise placeholder file)","algorithm":"SHA-384","checksum":"063d0c448df7352862fb7c874ab4bfae5773049cb3f0e1812a04681784d0c3231189f46d6ee37f63af4bff80c39c5b72"}],"notes":"Exercise record. Training example modelled on the publicly reported August 2026 pattern. Not real data."}'::jsonb, true, 'raaf-williamtown', NULL::uuid, '2026-08-04T10:05:00.000Z'::timestamptz),
  ('b9a1c0de-0000-4000-8000-000000000301'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'b9a1c0de-0003-4000-8000-000000000003'::uuid, 1, NULL::text, 'c5a7b56d9bd009b17607276ee69d8adc5b2c63b2759e13b82b6da215eafcc8ec8d22711cb10c07179cad645855d70d48', '{"schema":"spectral.counter-uxs-evidence/1","exercise":true,"site_id":"raaf-darwin","site_name":"RAAF Base Darwin","occurred":{"local":"2026-09-10T02:30","time_zone":"Australia/Darwin","utc_offset":"+09:30","utc":"2026-09-09T17:00:00.000Z"},"detection":{"method":"radar","sensor":"Exercise radar feed"},"track":{"heading_deg":180,"altitude_m_agl":60,"drone_type":"Small fixed-wing, type not identified","description":"Exercise inject. Low, fast track from the harbour towards the flight line."},"threat":{"level":"high","rationale":"Heading for parked aircraft at night with no flight notification."},"action":{"taken":"disable","detail":"Simulated RF defeat under exercise control. No emission was made."},"authorising_officer_role":"Base Commander (exercise role)","police":{"agency":"NT Police","reference":"EX-NTPOL-0910-01","notified_local":"2026-09-10T02:50"},"evidence_items":[{"description":"Radar track export (exercise placeholder file)","algorithm":"SHA-384","checksum":"4660d36ffef270b04a0e220d6154f5b36d0cf8ab22016d6586692f41908800c92564cdeecfebd91496150ff96093e971"}],"notes":"Exercise record. Synthetic inject for training. Not a real incident."}'::jsonb, true, 'raaf-darwin', NULL::uuid, '2026-09-09T17:40:00.000Z'::timestamptz)
) AS v(id, tenant_id, record_id, version, prev_hash, record_hash, payload, is_exercise, site_id, created_by, created_at)
WHERE EXISTS (SELECT 1 FROM tenants t WHERE t.id = '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;
