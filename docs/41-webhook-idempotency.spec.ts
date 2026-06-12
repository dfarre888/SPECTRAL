import { test, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

/**
 * Journey 41 — Stripe webhook idempotency (replay protection)
 *
 * Council finding #3. Guards:
 *   • migration 20260802000000_create_processed_stripe_events.sql
 *   • dedup wiring in app/api/webhooks/stripe-subscription/route.ts
 *
 * Stripe replays webhooks on delivery failure. We deliver the SAME event id
 * twice and assert the second delivery short-circuits (200 + duplicate:true)
 * and issues zero additional exam_tokens.
 *
 * The payload uses `mode: 'payment'` so the handler's side-effecting branch
 * (`if (session.mode === 'subscription')`) is a clean no-op — no live Stripe
 * subscription retrieve is required, isolating the NEW dedup layer. The
 * exam-token fulfilment path itself is already idempotent via
 * `fulfillmentExists()` (lib/exam-token-fulfillment.ts) and is exercised by
 * Journey 13 — so we deliberately don't re-test token issuance here.
 *
 * Requires service-role + the same Stripe secrets the route needs. Skips
 * cleanly otherwise (mirrors Journey 40).
 */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const WEBHOOK_SECRET = process.env.STRIPE_SUBSCRIPTION_WEBHOOK_SECRET;

const CONFIGURED = Boolean(URL && SRK && STRIPE_SECRET && WEBHOOK_SECRET);
const SKIP_MESSAGE =
  'Requires NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, STRIPE_SUBSCRIPTION_WEBHOOK_SECRET';

const WEBHOOK_PATH = '/api/webhooks/stripe-subscription';

test.describe('Journey 41 — Stripe webhook idempotency (finding #3)', () => {
  test.skip(!CONFIGURED, SKIP_MESSAGE);

  let admin: SupabaseClient;
  let stripe: Stripe;
  const eventId = `evt_test_idem_${Date.now()}`;

  test.beforeAll(() => {
    admin = createClient(URL!, SRK!, { auth: { persistSession: false, autoRefreshToken: false } });
    stripe = new Stripe(STRIPE_SECRET!, { apiVersion: '2026-02-25.clover' });
  });

  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('processed_stripe_events').delete().eq('stripe_event_id', eventId);
  });

  test('replaying the same event id returns 200 duplicate and issues zero new tokens', async ({ request }) => {
    // A signed checkout.session.completed event. mode:'payment' ⇒ handler no-op,
    // so the FIRST delivery succeeds without any live Stripe API calls.
    const payload = JSON.stringify({
      id: eventId,
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: `cs_test_${Date.now()}`,
          object: 'checkout.session',
          mode: 'payment',
          metadata: {},
        },
      },
    });

    const sign = (body: string) =>
      stripe.webhooks.generateTestHeaderString({ payload: body, secret: WEBHOOK_SECRET! });

    const deliver = async (body: string) => {
      const res = await request.post(WEBHOOK_PATH, {
        headers: { 'stripe-signature': sign(body), 'content-type': 'application/json' },
        data: body,
      });
      return { status: res.status(), json: (await res.json()) as { received?: boolean; duplicate?: boolean } };
    };

    const countTokens = async () => {
      const { count, error } = await admin
        .from('exam_tokens')
        .select('id', { count: 'exact', head: true });
      expect(error).toBeNull();
      return count ?? 0;
    };

    // ── First delivery ────────────────────────────────────────────────────
    const first = await deliver(payload);
    expect(first.status).toBe(200);
    expect(first.json.received).toBe(true);
    expect(first.json.duplicate, 'first delivery is not a duplicate').toBeFalsy();

    const tokensAfterFirst = await countTokens();

    // ── Replay (same event id, same signed body) ────────────────────────────
    const second = await deliver(payload);
    expect(second.status, 'replay still acks 200 so Stripe stops retrying').toBe(200);
    expect(second.json.duplicate, 'replay is recognised as a duplicate').toBe(true);

    const tokensAfterReplay = await countTokens();
    expect(tokensAfterReplay, 'replay must not issue additional exam tokens').toBe(tokensAfterFirst);

    // Ledger holds exactly one row for the event id.
    const { count: ledgerRows, error: ledgerErr } = await admin
      .from('processed_stripe_events')
      .select('stripe_event_id', { count: 'exact', head: true })
      .eq('stripe_event_id', eventId);
    expect(ledgerErr).toBeNull();
    expect(ledgerRows).toBe(1);
  });

  test('an unsigned / tampered payload is rejected (400) and not recorded', async ({ request }) => {
    const body = JSON.stringify({ id: `${eventId}-tampered`, type: 'checkout.session.completed', data: { object: {} } });
    const res = await request.post(WEBHOOK_PATH, {
      headers: { 'stripe-signature': 't=1,v1=deadbeef', 'content-type': 'application/json' },
      data: body,
    });
    expect(res.status()).toBe(400); // constructEvent rejects before any dedup/fulfilment

    const { count } = await admin
      .from('processed_stripe_events')
      .select('stripe_event_id', { count: 'exact', head: true })
      .eq('stripe_event_id', `${eventId}-tampered`);
    expect(count).toBe(0);
  });
});
