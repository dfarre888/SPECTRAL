import { test, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Journey 40 — Cross-tenant RLS isolation (USING(true) regression guard)
 *
 * Council finding #1. Guards migration:
 *   20260801000000_drop_legacy_using_true_jsa_ops_rls.sql
 *
 * The 20260306000000 operational-excellence migration shipped
 * `FOR ALL TO authenticated USING (true)` policies on tenant tables. Because
 * Postgres RLS policies are OR-combined, those `true` policies let ANY
 * authenticated user read/write EVERY organization's rows — even after later
 * org-scoped policies were added. This spec proves the hole is closed.
 *
 * Strategy (does not depend on app insert flows):
 *   1. Service-role client seeds org A + org B, two confirmed users (one per
 *      org via organization_members), and one row each in jsa_records,
 *      scheduled_missions and mission_crew owned by org A.
 *   2. Two anon clients sign in as user A / user B — their queries go through
 *      PostgREST, which enforces RLS for the `authenticated` role.
 *   3. Assert:
 *        • user A (owner) CAN see org A's rows  — proves policies aren't deny-all
 *        • user B (other org) sees ZERO of org A's rows — proves isolation
 *
 * Seeded org_id is non-null on purpose: the phase-5 policies treat NULL-org
 * rows as globally visible, which is a separate caveat — this test isolates
 * the USING(true) regression specifically.
 *
 * Requires service-role + Supabase env. Skips cleanly if not configured
 * (mirrors the ownerCredentialsConfigured() pattern used elsewhere).
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const CONFIGURED = Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY);
const SKIP_MESSAGE =
  'Supabase env not configured (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)';

const PASSWORD = 'SecureFlight2026!';
const TAG = `rls40-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

interface Seed {
  orgA: string;
  orgB: string;
  userAId: string;
  userBId: string;
  emailA: string;
  emailB: string;
  jsaA: string;
  missionA: string;
  crewA: string;
}

test.describe('Journey 40 — Cross-tenant RLS isolation (regression, finding #1)', () => {
  test.skip(!CONFIGURED, SKIP_MESSAGE);

  let admin: SupabaseClient;
  let clientA: SupabaseClient;
  let clientB: SupabaseClient;
  const seed = {} as Seed;

  test.beforeAll(async () => {
    admin = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // ── Organizations ────────────────────────────────────────────────────
    const { data: orgs, error: orgErr } = await admin
      .from('organizations')
      .insert([{ name: `${TAG}-orgA` }, { name: `${TAG}-orgB` }])
      .select('id, name');
    if (orgErr) throw orgErr;
    seed.orgA = orgs!.find((o) => o.name.endsWith('orgA'))!.id;
    seed.orgB = orgs!.find((o) => o.name.endsWith('orgB'))!.id;

    // ── Confirmed users (one per org) ────────────────────────────────────
    seed.emailA = `${TAG}-a@example.test`;
    seed.emailB = `${TAG}-b@example.test`;
    const { data: ua, error: uaErr } = await admin.auth.admin.createUser({
      email: seed.emailA,
      password: PASSWORD,
      email_confirm: true,
    });
    if (uaErr) throw uaErr;
    seed.userAId = ua.user!.id;
    const { data: ub, error: ubErr } = await admin.auth.admin.createUser({
      email: seed.emailB,
      password: PASSWORD,
      email_confirm: true,
    });
    if (ubErr) throw ubErr;
    seed.userBId = ub.user!.id;

    // ── Memberships — drives public.auth_user_organization_ids() ─────────
    const { error: memErr } = await admin.from('organization_members').insert([
      { organization_id: seed.orgA, user_id: seed.userAId, role: 'ceo' },
      { organization_id: seed.orgB, user_id: seed.userBId, role: 'ceo' },
    ]);
    if (memErr) throw memErr;

    // ── Org-A owned rows in the three targeted tables ────────────────────
    const { data: jsa, error: jsaErr } = await admin
      .from('jsa_records')
      .insert({ organization_id: seed.orgA, jsa_number: `${TAG}-JSA` })
      .select('id')
      .single();
    if (jsaErr) throw jsaErr;
    seed.jsaA = jsa!.id;

    const { data: mission, error: missionErr } = await admin
      .from('scheduled_missions')
      .insert({
        organization_id: seed.orgA,
        jsa_id: seed.jsaA,
        mission_date: '2026-09-01',
        start_time: '09:00',
      })
      .select('id')
      .single();
    if (missionErr) throw missionErr;
    seed.missionA = mission!.id;

    // crew row owned by user A (so isolation can't pass via the
    // `user_id = auth.uid()` self-visibility branch for user B)
    const { data: crew, error: crewErr } = await admin
      .from('mission_crew')
      .insert({
        scheduled_mission_id: seed.missionA,
        user_id: seed.userAId,
        role: 'RP',
      })
      .select('id')
      .single();
    if (crewErr) throw crewErr;
    seed.crewA = crew!.id;

    // ── Authenticated clients (RLS-enforcing) ────────────────────────────
    clientA = createClient(SUPABASE_URL!, ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    clientB = createClient(SUPABASE_URL!, ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const signinA = await clientA.auth.signInWithPassword({ email: seed.emailA, password: PASSWORD });
    expect(signinA.error, 'user A sign-in').toBeNull();
    const signinB = await clientB.auth.signInWithPassword({ email: seed.emailB, password: PASSWORD });
    expect(signinB.error, 'user B sign-in').toBeNull();
  });

  test.afterAll(async () => {
    if (!admin) return;
    // children → parents → users (best-effort)
    await admin.from('mission_crew').delete().eq('id', seed.crewA ?? '00000000-0000-0000-0000-000000000000');
    await admin.from('scheduled_missions').delete().eq('id', seed.missionA ?? '00000000-0000-0000-0000-000000000000');
    await admin.from('jsa_records').delete().eq('id', seed.jsaA ?? '00000000-0000-0000-0000-000000000000');
    await admin.from('organization_members').delete().in('organization_id', [seed.orgA, seed.orgB].filter(Boolean));
    await admin.from('organizations').delete().in('id', [seed.orgA, seed.orgB].filter(Boolean));
    if (seed.userAId) await admin.auth.admin.deleteUser(seed.userAId).catch(() => undefined);
    if (seed.userBId) await admin.auth.admin.deleteUser(seed.userBId).catch(() => undefined);
  });

  // ── Sanity: owner CAN see own rows (guards against deny-all false pass) ──
  test('owner (org A) can read its own jsa_records / scheduled_missions / mission_crew', async () => {
    const jsa = await clientA.from('jsa_records').select('id').eq('id', seed.jsaA);
    expect(jsa.error).toBeNull();
    expect(jsa.data, 'org A should see its own JSA').toHaveLength(1);

    const mission = await clientA.from('scheduled_missions').select('id').eq('id', seed.missionA);
    expect(mission.error).toBeNull();
    expect(mission.data, 'org A should see its own scheduled mission').toHaveLength(1);

    const crew = await clientA.from('mission_crew').select('id').eq('id', seed.crewA);
    expect(crew.error).toBeNull();
    expect(crew.data, 'org A should see its own crew row').toHaveLength(1);
  });

  // ── Isolation: org B CANNOT see org A's rows ────────────────────────────
  test('org B cannot SELECT org A jsa_records', async () => {
    const res = await clientB.from('jsa_records').select('id').eq('id', seed.jsaA);
    expect(res.error).toBeNull(); // RLS filters rows, it does not error
    expect(res.data, 'org B must not see org A JSA records').toHaveLength(0);
  });

  test('org B cannot SELECT org A scheduled_missions', async () => {
    const res = await clientB.from('scheduled_missions').select('id').eq('id', seed.missionA);
    expect(res.error).toBeNull();
    expect(res.data, 'org B must not see org A scheduled missions').toHaveLength(0);
  });

  test('org B cannot SELECT org A mission_crew', async () => {
    const res = await clientB.from('mission_crew').select('id').eq('id', seed.crewA);
    expect(res.error).toBeNull();
    expect(res.data, 'org B must not see org A mission crew').toHaveLength(0);
  });

  // ── Isolation also holds for unfiltered list reads (no id predicate) ────
  test('org B unfiltered list reads exclude org A rows', async () => {
    const jsa = await clientB.from('jsa_records').select('id, organization_id');
    expect(jsa.error).toBeNull();
    expect((jsa.data ?? []).some((r) => r.organization_id === seed.orgA)).toBe(false);

    const missions = await clientB.from('scheduled_missions').select('id, organization_id');
    expect(missions.error).toBeNull();
    expect((missions.data ?? []).some((r) => r.organization_id === seed.orgA)).toBe(false);
  });
});
