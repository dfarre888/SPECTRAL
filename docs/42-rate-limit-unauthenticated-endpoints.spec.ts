import { test, expect, type APIRequestContext } from '@playwright/test';

/**
 * Journey 42 — Rate-limiting on unauthenticated parse/AI/payment endpoints
 *
 * Council finding #4. Guards the route-level checkRateLimit() wiring added to:
 *   parse-pdf (20/min), parse-dji-log (20/min), parse-notam-pdf (20/min),
 *   notam/summarize (10/min), repl/public-payment-intent (5/min).
 *
 * The limiter is Upstash-backed and FAILS OPEN when Upstash is not configured
 * (so a Redis outage never takes the platform down). That means these
 * assertions only hold with UPSTASH_REDIS_REST_URL/_TOKEN set — skip otherwise,
 * mirroring the env-guard pattern in Journey 40.
 *
 * Buckets are keyed per client IP; the Playwright runner shares one IP, so a
 * burst from a single worker fills the bucket deterministically.
 */

const UPSTASH_CONFIGURED = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);
const SKIP_MESSAGE = 'Upstash not configured (UPSTASH_REDIS_REST_URL / _TOKEN) — limiter fails open';

const RATE_LIMIT_MESSAGE = 'Too many requests. Please wait before retrying.';

const tinyPdf = () => Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');

const PARSE_ENDPOINTS: { path: string; limit: number }[] = [
  { path: '/api/parse-pdf', limit: 20 },
  { path: '/api/parse-dji-log', limit: 20 },
  { path: '/api/parse-notam-pdf', limit: 20 },
];

/** Fire `n` requests sequentially, return the status list. */
async function burst(
  fn: (i: number) => Promise<{ status: number; retryAfter: string | null; body: string }>,
  n: number,
): Promise<{ status: number; retryAfter: string | null; body: string }[]> {
  const out: { status: number; retryAfter: string | null; body: string }[] = [];
  for (let i = 0; i < n; i++) out.push(await fn(i));
  return out;
}

async function postMultipart(request: APIRequestContext, path: string) {
  const res = await request.post(path, {
    multipart: { file: { name: 'x.pdf', mimeType: 'application/pdf', buffer: tinyPdf() } },
  });
  return { status: res.status(), retryAfter: res.headers()['retry-after'] ?? null, body: await res.text() };
}

async function postJson(request: APIRequestContext, path: string, data: unknown) {
  const res = await request.post(path, { data });
  return { status: res.status(), retryAfter: res.headers()['retry-after'] ?? null, body: await res.text() };
}

test.describe('Journey 42 — Unauthenticated endpoint rate limiting (finding #4)', () => {
  test.skip(!UPSTASH_CONFIGURED, SKIP_MESSAGE);

  for (const { path, limit } of PARSE_ENDPOINTS) {
    test(`${path}: bursting past ${limit}/min returns 429 + Retry-After`, async ({ request }) => {
      const results = await burst(() => postMultipart(request, path), limit + 8);
      const limited = results.filter((r) => r.status === 429);

      expect(limited.length, 'at least one request should be rate-limited').toBeGreaterThan(0);
      expect(limited.every((r) => r.retryAfter !== null), 'every 429 carries Retry-After').toBe(true);
      // first request must not be limited (n=1 under the cap)
      expect(results[0].status).not.toBe(429);
    });
  }

  test('/api/notam/summarize: bursting past 10/min returns 429 BEFORE the Gemini path', async ({ request }) => {
    const results = await burst(
      () => postJson(request, '/api/notam/summarize', { text: 'RWY 16/34 CLSD 2609010000-2609012359' }),
      18,
    );
    const limited = results.filter((r) => r.status === 429);

    expect(limited.length, 'AI summarize must be rate-limited').toBeGreaterThan(0);
    expect(limited.every((r) => r.retryAfter !== null)).toBe(true);

    // The guard is the first statement in the handler (before hasGeminiKey() and
    // before `new GoogleGenAI(...)`). Proven behaviourally: a 429 returns the
    // rate-limit body — never the 503 "no API key" body and never a summary —
    // so the paid Gemini client is never instantiated on a limited request.
    for (const r of limited) {
      const json = JSON.parse(r.body) as { error?: string; summary?: string };
      expect(json.error).toBe(RATE_LIMIT_MESSAGE);
      expect(json.summary).toBeUndefined();
      expect(json.error).not.toMatch(/API key/i);
    }
  });

  test('/api/repl/public-payment-intent: bursting past 5/min returns 429 before Stripe', async ({ request }) => {
    const results = await burst(
      () => postJson(request, '/api/repl/public-payment-intent', { buyerType: 'individual', seats: 1 }),
      13,
    );
    const limited = results.filter((r) => r.status === 429);

    expect(limited.length, 'guest payment-intent must be rate-limited').toBeGreaterThan(0);
    expect(limited.every((r) => r.retryAfter !== null)).toBe(true);
    for (const r of limited) {
      const json = JSON.parse(r.body) as { error?: string; clientSecret?: string };
      expect(json.error).toBe(RATE_LIMIT_MESSAGE);
      expect(json.clientSecret, 'no PaymentIntent created on a 429 path').toBeUndefined();
    }
  });
});
