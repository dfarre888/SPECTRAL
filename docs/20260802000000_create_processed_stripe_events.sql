/*
  ──────────────────────────────────────────────────────────────────────────
  Migration: processed_stripe_events — webhook idempotency ledger
  Date:      2026-08-02  (sorts after 20260801; do not renumber lower)
  Council finding #3 — Stripe webhook deduplication
  ──────────────────────────────────────────────────────────────────────────

  Stripe delivers webhooks at-least-once and replays on delivery failure. The
  subscription webhook (app/api/webhooks/stripe-subscription/route.ts) records
  each verified event.id here AFTER successful processing and short-circuits if
  it has already been seen — a belt-and-suspenders layer over the per-operation
  idempotency that already exists (exam-token `fulfillmentExists`, idempotent
  org `update`).

  Written to by the service role only; never read by end users. RLS is ENABLED
  with NO policies so that — even if the anon/authenticated key is used — the
  table is deny-all to everyone except the service role (which bypasses RLS).
  This also keeps the Supabase security advisor green (no rls_disabled flag).
*/

BEGIN;

CREATE TABLE IF NOT EXISTS public.processed_stripe_events (
  stripe_event_id TEXT PRIMARY KEY,
  processed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Supports the 90-day TTL sweep below.
CREATE INDEX IF NOT EXISTS idx_processed_stripe_events_processed_at
  ON public.processed_stripe_events (processed_at);

-- Deny-all to authenticated/anon; service role bypasses RLS entirely.
ALTER TABLE public.processed_stripe_events ENABLE ROW LEVEL SECURITY;

-- ── 90-day TTL cleanup (prevents unbounded growth) ──────────────────────────
CREATE OR REPLACE FUNCTION public.cleanup_processed_stripe_events()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted integer;
BEGIN
  DELETE FROM public.processed_stripe_events
  WHERE processed_at < now() - interval '90 days';
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_processed_stripe_events() FROM PUBLIC;

-- Schedule daily via pg_cron when available; otherwise the function can be
-- called from a Vercel cron route. Guarded so the migration never fails if
-- pg_cron is not installed on this project.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'cleanup-processed-stripe-events',
      '17 3 * * *',  -- 03:17 daily
      $cron$ SELECT public.cleanup_processed_stripe_events(); $cron$
    );
  ELSE
    RAISE NOTICE 'pg_cron not installed — call public.cleanup_processed_stripe_events() from a scheduled job (e.g. a Vercel cron route).';
  END IF;
END $$;

COMMIT;
