# Test Plan — Webhook Idempotency & Unauthenticated Parse/AI Rate-Limiting

Council follow-up to findings #3 (webhook idempotency) and the AI/parse cost-abuse
surface. Scoped, drop-in test specs that match the real code paths in this repo.

---

## 3. Webhook idempotency — duplicate delivery must not double-fulfil

### What we're actually guarding

Stripe guarantees *at-least-once* delivery: the same event (same `event.id`,
same `checkout.session.completed` with the same `session.id`) can arrive 2+
times. The handler `app/api/webhooks/stripe-subscription/route.ts` must produce
the same end state on the 2nd delivery as the 1st.

Good news from the code read — the money path is **already idempotency-keyed**,
so this is a *regression lock*, not a new feature:

| Path | Mechanism | File |
|---|---|---|
| Exam-token fulfilment | `fulfillmentExists()` checks `exam_tokens.stripe_payment_id == key`; key = `` `${prefix}:${tokenType}:${i}` `` | `lib/exam-token-fulfillment.ts` |
| Subscription → org sync | `organizations.update(payload).eq('id', orgId)` — naturally idempotent (same payload → same row) | webhook `syncSubscriptionToOrg()` |

There is **no** global `processed_stripe_events` table. That's acceptable given
the above, but a global dedup table is the more robust long-term design — see
"Optional hardening" below.

### Test type & level

Integration test against a real/staging Supabase (service-role seed), driving
`fulfillExamTokensFromStripe()` directly. We test the **fulfilment function**,
not the HTTP signature layer — signature verification is Stripe's code and is
already exercised by `13-stripe-billing-flows.spec.ts`. This keeps the test
deterministic (no need to forge `stripe-signature`).

### Coverage targets

- Replay of the same checkout fulfilment → **token count unchanged** (0 new).
- A *different* session id for the same org → new tokens created (proves the key
  is the discriminator, not a blanket "skip if any exist").
- `created + skipped` accounting is correct on the 2nd call.

### Example spec — `tests/journeys/41-webhook-idempotency.spec.ts`

```ts
import { test, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { fulfillExamTokensFromStripe } from '@/lib/exam-token-fulfillment';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CONFIGURED = Boolean(URL && SRK);
const TAG = `idem-${Date.now()}`;

test.describe('Journey 41 — Stripe webhook fulfilment idempotency (finding #3)', () => {
  test.skip(!CONFIGURED, 'Supabase service-role env not configured');

  let admin: SupabaseClient;
  let orgId: string;
  const purchasedBy = '00000000-0000-0000-0000-000000000000'; // system/service principal

  test.beforeAll(async () => {
    admin = createClient(URL!, SRK!, { auth: { persistSession: false } });
    const { data, error } = await admin
      .from('organizations').insert({ name: `${TAG}-org` }).select('id').single();
    if (error) throw error;
    orgId = data!.id;
  });

  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('exam_tokens').delete().like('stripe_payment_id', `${TAG}%`);
    await admin.from('organizations').delete().eq('id', orgId);
  });

  test('replaying the same checkout session does not double-issue tokens', async () => {
    const args = {
      organizationId: orgId,
      purchasedBy,
      idempotencyKey: `${TAG}:checkout:cs_test_DUPLICATE`, // same prefix == same Stripe session
      // shape this to whatever fulfillExamTokensFromStripe expects for a
      // BVLOS exam pack (qty/tokenType/entitlements) — mirror a real
      // checkout.session.completed payload for an exam add-on.
    } as Parameters<typeof fulfillExamTokensFromStripe>[1];

    const first = await fulfillExamTokensFromStripe(admin, args);
    const second = await fulfillExamTokensFromStripe(admin, args); // ← replay

    const { count } = await admin
      .from('exam_tokens')
      .select('id', { count: 'exact', head: true })
      .like('stripe_payment_id', `${TAG}:checkout:cs_test_DUPLICATE%`);

    expect(first.created).toBeGreaterThan(0);     // 1st delivery issues tokens
    expect(second.created).toBe(0);               // replay issues none
    expect(second.skipped).toBe(first.created);   // all recognised as already-fulfilled
    expect(count).toBe(first.created);            // DB holds exactly one set
  });

  test('a different session id for the same org DOES issue new tokens', async () => {
    const mk = (cs: string) =>
      ({ organizationId: orgId, purchasedBy, idempotencyKey: `${TAG}:checkout:${cs}` }) as
        Parameters<typeof fulfillExamTokensFromStripe>[1];

    const a = await fulfillExamTokensFromStripe(admin, mk('cs_test_AAA'));
    const b = await fulfillExamTokensFromStripe(admin, mk('cs_test_BBB'));
    expect(a.created).toBeGreaterThan(0);
    expect(b.created).toBeGreaterThan(0); // distinct key ⇒ distinct fulfilment
  });
});
```

> Implementation note: align the `args` object with the real second-parameter
> type of `fulfillExamTokensFromStripe` (token type, quantity, entitlements,
> metadata). The point under test is the `idempotencyKey`/`stripe_payment_id`
> discriminator, which is already wired.

### Optional hardening (separate ticket)

Add `processed_stripe_events(event_id text primary key, processed_at timestamptz)`
and short-circuit at the top of the handler:

```ts
const { error: dupe } = await admin
  .from('processed_stripe_events')
  .insert({ event_id: event.id });           // PK conflict ⇒ already processed
if (dupe?.code === '23505') return NextResponse.json({ received: true, duplicate: true });
```

Test: insert an event id, POST the same event, assert `duplicate: true` and that
no side-effect ran. This makes *every* handler branch idempotent, not just
fulfilment + org-sync.

---

## 4. Rate-limiting the 5 unauthenticated parse/AI endpoints

### The endpoints (all `POST`, no auth guard today)

| Route | Body | Backend cost |
|---|---|---|
| `app/api/parse-pdf/route.ts` | multipart `file` | PDF parse |
| `app/api/parse-dji-log/route.ts` | multipart `file` | DJI log parse |
| `app/api/parse-notam-pdf/route.ts` | multipart `file` | PDF parse |
| `app/api/parse-emirates-ofp/route.ts` | multipart `file` | PDF parse |
| `app/api/notam/summarize/route.ts` | JSON `{ text }` | **Gemini LLM call** ($) |

`lib/rate-limit.ts` already exists and exports `checkRateLimit()` (returns
`{ limited, retryAfter, ... }`); `adsb`/`flight-tracks` already return 429. The
fix is to apply it to these 5; the tests below assert it's applied.

### Implementation the tests assume

Add to the top of each handler, **before** body parsing / API-key checks so the
429 short-circuits the expensive work:

```ts
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const rl = await checkRateLimit(req, { key: 'parse-pdf', limit: 10, windowSec: 60 });
  if (rl.limited) {
    return NextResponse.json({ error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });
  }
  // …existing logic
}
```

### Test type & level

Fast API-only tests (no browser), in the spirit of `29-api-security-sweep.spec.ts`.
Drive each endpoint past its window and assert the limiter trips. The IP/key
basis means tests run from one client and share the bucket.

### Coverage targets

- Burst beyond `limit` within `windowSec` → at least one `429`.
- `429` carries a `Retry-After` header.
- `notam/summarize`: limiter trips **before** the `503 (no API key)` / `400`
  branches — i.e. an over-limit caller never reaches the paid Gemini call.
- (Regression) a single request still returns its normal status (not 429 at n=1).

### Example spec — `tests/journeys/42-parse-ai-ratelimit.spec.ts`

```ts
import { test, expect } from '@playwright/test';

const PARSE_ENDPOINTS = [
  '/api/parse-pdf',
  '/api/parse-dji-log',
  '/api/parse-notam-pdf',
  '/api/parse-emirates-ofp',
];
const LIMIT = 10;        // keep in sync with handler config
const BURST = LIMIT + 5;

test.describe('Journey 42 — Unauthenticated parse/AI endpoints are rate-limited', () => {
  for (const path of PARSE_ENDPOINTS) {
    test(`${path}: bursts past the window return 429 with Retry-After`, async ({ request }) => {
      const tiny = Buffer.from('%PDF-1.4\n%minimal\n');
      const statuses: number[] = [];
      let retryAfterSeen = false;

      for (let i = 0; i < BURST; i++) {
        const res = await request.post(path, {
          multipart: { file: { name: 'x.pdf', mimeType: 'application/pdf', buffer: tiny } },
        });
        statuses.push(res.status());
        if (res.status() === 429 && res.headers()['retry-after']) retryAfterSeen = true;
      }

      expect(statuses.filter((s) => s === 429).length).toBeGreaterThan(0);
      expect(retryAfterSeen).toBe(true);
    });
  }

  test('notam/summarize: limiter trips before the paid Gemini path', async ({ request }) => {
    const statuses: number[] = [];
    for (let i = 0; i < BURST; i++) {
      const res = await request.post('/api/notam/summarize', {
        data: { text: 'RWY 16/34 CLSD 2609010000-2609012359' },
      });
      statuses.push(res.status());
    }
    // Over-limit callers must be 429'd — never silently 503/200 into the LLM.
    expect(statuses).toContain(429);
    const firstLimited = statuses.indexOf(429);
    expect(firstLimited).toBeGreaterThan(0);      // 1st call not limited
    expect(firstLimited).toBeLessThanOrEqual(LIMIT + 1);
  });
});
```

> Note: if `checkRateLimit` is IP-keyed and the Playwright runner reuses one
> origin, the shared bucket makes the burst deterministic. If it's keyed per
> route+IP, the loop above still trips it. Confirm the `key`/window passed in
> each handler matches `LIMIT`/window in the test, or export the config from a
> shared const both sides import.

---

## Suite placement summary

| Spec | Journey | Type | Needs |
|---|---|---|---|
| `40-cross-tenant-rls-isolation.spec.ts` *(shipped)* | 40 | Integration (RLS) | service-role + Supabase env |
| `41-webhook-idempotency.spec.ts` | 41 | Integration | service-role + Supabase env |
| `42-parse-ai-ratelimit.spec.ts` | 42 | API smoke | running app only |

41 and 42 are written as plans here; promote to real specs once the rate-limit
guards are added to the 5 handlers and the `fulfillExamTokensFromStripe` arg
shape is pinned.
