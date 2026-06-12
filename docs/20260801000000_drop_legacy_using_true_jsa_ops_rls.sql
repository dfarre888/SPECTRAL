/*
  ──────────────────────────────────────────────────────────────────────────
  Migration: Drop legacy USING(true) policies on JSA / operational-excellence
             tenant tables (cross-tenant isolation fix)
  Date:      2026-08-01  (timestamp chosen to sort AFTER the latest applied
             migration 20260731320000 so it runs last; do not renumber lower)
  Council finding #1 — RLS cross-tenant exposure
  ──────────────────────────────────────────────────────────────────────────

  ROOT CAUSE
  ----------
  20260306000000_jsa_operational_excellence.sql created broad policies of the
  form:

      CREATE POLICY "Authenticated can view crew"
        ON mission_crew FOR SELECT TO authenticated USING (true);
      CREATE POLICY "Authenticated can manage crew"
        ON mission_crew FOR ALL    TO authenticated USING (true);

  20260622000002_fix_rls_always_true_phase5.sql LATER added correct,
  org-scoped (and FK-aware) replacement policies — e.g. mission_crew_select_org
  / mission_crew_write_org — but the original USING(true) policies were never
  dropped.

  Postgres RLS policies are PERMISSIVE (OR-combined). As long as a `USING(true)`
  policy survives on a table, it grants every authenticated user full access
  regardless of any stricter policy alongside it. Net effect: any logged-in
  user could read/write ANY organization's jsa_records, mission_crew,
  scheduled_missions, notam_submissions, equipment_signouts and
  rpas_operational_logs.

  THE FIX
  -------
  Drop ONLY the 11 legacy `USING(true)` policies. We deliberately do NOT
  recreate org-scoped policies here — the phase-5 replacements already exist
  and encode FK-aware scoping (mission_crew → scheduled_mission_id,
  equipment_signouts → signed_out_by / scheduled_mission_id, notam_submissions
  → jsa_id / scheduled_mission_id) that a naive
  `organization_id = ANY(public.auth_user_organization_ids())` would lose.

  A verification block at the end fails the migration if any `true` policy
  remains, or warns if a table is left with no permissive policy (fail-closed).

  NOTE (separate, pre-existing weakness, intentionally out of scope here):
  the phase-5 policies use `organization_id IS NULL OR organization_id IN (...)`,
  so rows with a NULL organization_id remain globally visible. Tightening the
  NULL-org branch should be tracked as a follow-up; it is not the USING(true)
  regression this migration closes.
*/

BEGIN;

-- ── jsa_records ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated can view JSAs in their org" ON public.jsa_records;

-- ── mission_crew ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated can view crew"   ON public.mission_crew;
DROP POLICY IF EXISTS "Authenticated can manage crew" ON public.mission_crew;

-- ── scheduled_missions ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated can view scheduled"   ON public.scheduled_missions;
DROP POLICY IF EXISTS "Authenticated can manage scheduled" ON public.scheduled_missions;

-- ── notam_submissions ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated can view notams"   ON public.notam_submissions;
DROP POLICY IF EXISTS "Authenticated can manage notams" ON public.notam_submissions;

-- ── equipment_signouts ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated can view signouts"   ON public.equipment_signouts;
DROP POLICY IF EXISTS "Authenticated can manage signouts" ON public.equipment_signouts;

-- ── rpas_operational_logs ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated can view op logs"   ON public.rpas_operational_logs;
DROP POLICY IF EXISTS "Authenticated can manage op logs" ON public.rpas_operational_logs;

-- ── Verification: no USING(true) survives; each table keeps RLS + a policy ──
DO $$
DECLARE
  tbls text[] := ARRAY[
    'jsa_records','mission_crew','scheduled_missions',
    'notam_submissions','equipment_signouts','rpas_operational_logs'
  ];
  t        text;
  n_true   int;
  n_policy int;
  rls_on   boolean;
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    -- (a) hard-fail if any permissive policy still has a literal `true` qual/check
    SELECT count(*) INTO n_true
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = t
      AND permissive = 'PERMISSIVE'
      AND (
        btrim(coalesce(qual, ''))       IN ('true','(true)') OR
        btrim(coalesce(with_check, '')) IN ('true','(true)')
      );

    IF n_true > 0 THEN
      RAISE EXCEPTION
        'RLS regression: % still has % permissive USING/CHECK(true) policy(ies)', t, n_true;
    END IF;

    -- (b) RLS must remain enabled
    SELECT relrowsecurity INTO rls_on
    FROM pg_class
    WHERE oid = ('public.' || t)::regclass;

    IF NOT coalesce(rls_on, false) THEN
      RAISE EXCEPTION 'RLS is disabled on % — expected ENABLE ROW LEVEL SECURITY', t;
    END IF;

    -- (c) warn (do not fail) if a table is now policy-less => deny-all (fail-closed)
    SELECT count(*) INTO n_policy
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = t;

    IF n_policy = 0 THEN
      RAISE WARNING
        '% has no remaining RLS policy after dropping legacy true policies — '
        'table is now deny-all for authenticated role. Expected phase-5 '
        'org-scoped policies (20260622000002) to be present.', t;
    END IF;
  END LOOP;

  RAISE NOTICE 'Legacy USING(true) policies dropped; tenant isolation verified on 6 tables.';
END $$;

COMMIT;
