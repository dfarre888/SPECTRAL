-- Drop legacy accredited-routing flag from currency updates (manual SME handoff only).
DROP INDEX IF EXISTS idx_spectral_currency_accredited;
ALTER TABLE spectral_currency_updates DROP COLUMN IF EXISTS requires_accredited_implementation;
