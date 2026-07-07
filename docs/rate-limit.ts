/**
 * Upstash Redis rate limiter — gracefully degrades to no-op when env vars are absent.
 *
 * Usage in API routes (optional belt-and-suspenders layer; primary enforcement is
 * in middleware.ts where no route code needs to change):
 *
 *   import { checkRateLimit } from '@/lib/rate-limit';
 *   const rl = await checkRateLimit(userId ?? ip);
 *   if (rl.limited) return new Response('Too many requests', { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });
 */

import { Ratelimit } from '@upstash/ratelimit';
// Use the Cloudflare/Edge-compatible entry point so this module can be imported
// from middleware.ts (Edge Runtime) without triggering the
// "process.version is not supported" warning.
import { Redis } from '@upstash/redis/cloudflare';
import type { NextRequest } from 'next/server';

// ── Tier definitions ──────────────────────────────────────────────────────────
// Default: 20 AI calls per minute per user/IP.
// Burst tier (superadmin): 200 per minute — effectively unlimited in practice.
const DEFAULT_REQUESTS = 20;
const DEFAULT_WINDOW = '1 m';
const BURST_REQUESTS = 200;

// ── Lazy singleton initialisation ─────────────────────────────────────────────
let defaultLimiter: Ratelimit | null = null;
let burstLimiter: Ratelimit | null = null;
let initAttempted = false;

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function getLimiters(): { default: Ratelimit; burst: Ratelimit } | null {
  if (initAttempted) return defaultLimiter ? { default: defaultLimiter, burst: burstLimiter! } : null;
  initAttempted = true;

  const redis = getRedis();
  if (!redis) return null;

  defaultLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(DEFAULT_REQUESTS, DEFAULT_WINDOW),
    analytics: true,
    prefix: 'a3dm:rl:default',
  });

  burstLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(BURST_REQUESTS, DEFAULT_WINDOW),
    analytics: true,
    prefix: 'a3dm:rl:burst',
  });

  return { default: defaultLimiter, burst: burstLimiter };
}

// ── Custom per-route limiters ───────────────────────────────────────────────
// The default/burst tiers above are fixed at 20/200 per minute. Routes that need
// a different limit (e.g. 10/min for AI, 5/min for payment intents) pass an
// explicit config; each (prefix+requests+window) gets its own cached limiter so
// routes never share a counter. Response shape is unchanged (RateLimitResult).

/** Upstash sliding-window duration, e.g. '1 m', '60 s'. */
export type RateLimitWindow = `${number} ${'ms' | 's' | 'm' | 'h' | 'd'}`;

export interface RateLimitOptions {
  /** Max requests allowed within `window`. */
  requests: number;
  /** Sliding-window duration. */
  window: RateLimitWindow;
  /** Bucket namespace — give each route a distinct value so buckets are isolated. */
  prefix: string;
}

const customLimiters = new Map<string, Ratelimit>();

function getCustomLimiter(opts: RateLimitOptions): Ratelimit | null {
  const cacheKey = `${opts.prefix}:${opts.requests}:${opts.window}`;
  const cached = customLimiters.get(cacheKey);
  if (cached) return cached;

  const redis = getRedis();
  if (!redis) return null;

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(opts.requests, opts.window),
    analytics: true,
    prefix: `a3dm:rl:${opts.prefix}`,
  });
  customLimiters.set(cacheKey, limiter);
  return limiter;
}

/**
 * Derive a stable rate-limit bucket key from the request's client IP.
 *
 * Trust model: on Vercel `req.ip` is set from the real TCP connection and is
 * NOT client-spoofable — always prefer it. `x-forwarded-for` IS client-controllable,
 * so we only fall back to its FIRST hop (the original client per the XFF spec)
 * when `req.ip` is absent (e.g. local dev). Behind a non-Vercel proxy, the edge
 * must strip/replace inbound XFF or this fallback can be spoofed to evade limits.
 */
export function rateLimitKeyFromRequest(req: NextRequest): string {
  const raw =
    req.ip ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip')?.trim() ??
    'unknown';
  return normaliseIp(raw);
}

/** Normalise an IP so the same client always maps to one bucket (IPv6 zone/brackets, IPv4-mapped, :port). */
function normaliseIp(ip: string): string {
  let v = ip.trim().toLowerCase();
  if (!v) return 'unknown';
  // Strip IPv6 brackets: [::1]:443 → ::1   ([host]:port form)
  if (v.startsWith('[')) {
    const close = v.indexOf(']');
    v = close > 0 ? v.slice(1, close) : v.slice(1);
  }
  // Strip IPv6 zone id: fe80::1%eth0 → fe80::1
  v = v.split('%')[0];
  // IPv4-mapped IPv6 → IPv4: ::ffff:1.2.3.4 → 1.2.3.4
  const mapped = v.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) return mapped[1];
  // Strip :port only for IPv4 (IPv6 legitimately contains colons)
  if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(v)) return v.split(':')[0];
  return ipBucket(v);
}

/**
 * Collapse an address to its rate-limit bucket. IPv4 maps 1:1, but IPv6 is
 * bucketed by /64 (the first 4 hextets): end users are routinely allocated a
 * full /64, so without this an attacker could rotate addresses within their
 * own /64 to get a fresh limiter bucket per request and evade the limit.
 */
function ipBucket(v: string): string {
  if (!v.includes(':')) return v; // IPv4, hostname, or 'unknown'
  const head = v.split('::')[0]; // network portion before any zero-compression
  const groups = head.split(':').filter(Boolean).slice(0, 4);
  return groups.length ? `${groups.join(':')}::/64` : v;
}

export interface RateLimitResult {
  /** true = request should be blocked */
  limited: boolean;
  /** seconds until the rate-limit window resets */
  retryAfter: number;
  /** remaining requests in the current window (undefined when Upstash is not configured) */
  remaining?: number;
}

/**
 * Check whether `key` (userId or IP address) has exceeded the AI-route rate limit.
 *
 * @param key       Identifier for the requester — prefer Supabase user ID when available.
 * @param isBurst   Pass `true` for superadmin accounts to use the higher-limit tier.
 */
export async function checkRateLimit(
  key: string,
  isBurst = false,
  options?: RateLimitOptions,
): Promise<RateLimitResult> {
  // Custom per-route limiter (explicit limit/window). `isBurst` is ignored here.
  const limiter = options ? getCustomLimiter(options) : getLimiters()?.[isBurst ? 'burst' : 'default'];

  // No Upstash configured — pass through (useful during local dev before setup).
  if (!limiter) {
    return { limited: false, retryAfter: 0 };
  }

  try {
    const { success, reset, remaining } = await limiter.limit(key);
    const retryAfter = success ? 0 : Math.ceil((reset - Date.now()) / 1000);
    return { limited: !success, retryAfter, remaining };
  } catch (err) {
    // Redis connection failure — fail open so a Redis outage doesn't take down the platform.
    console.error('[rate-limit] Upstash error, failing open:', err);
    return { limited: false, retryAfter: 0 };
  }
}
