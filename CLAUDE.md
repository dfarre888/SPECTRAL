# Spectral — Military Drone Intelligence Platform

Next.js 14 SaaS. ITAR-compliant. OSINT-only. Defence-adjacent.

## Stack
- Next.js 14.2.29 (App Router only — no Pages Router)
- Supabase (@supabase/ssr — NOT legacy auth-helpers)
- CesiumJS 1.116.0 (browser-only, ALWAYS ssr:false, ALWAYS set CESIUM_BASE_URL)
- D3.js 7.9.0 (spectrum chart — log scale 400MHz–6GHz)
- Claude API: claude-sonnet-4-6, always use querySpectral() wrapper in lib/claude/client.ts
- Tailwind + shadcn/ui

## Deployment Environment
- IDE: [Cursor / other] on [protected network name, e.g. "DSTG Secure Workstation" or "ITAR-segregated dev machine"]
- Network: [internet-egress blocked / air-gapped / PROTECTED network]
- Accredited resolver active: SPECTRAL_ACCREDITED_RESOLVER=true
- Supabase project: [your project ref, e.g. "xyzabc"] — region ap-southeast-2
- Admin access: service role key available server-side

## Tables — Where Data Lives
| Data | Table | How to add |
|------|-------|------------|
| Platforms | `platforms` | New migration in `supabase/migrations/` OR Supabase MCP `execute_sql` |
| Defeat matrix | `defeat_matrix_entries` | Same — migration or MCP |
| Accredited Pk | `accredited_defeat_pk` | Same, OR add row to `OFFLINE_ACCREDITED_DEFEAT_PK` in `lib/operations/accredited-supplements-data.ts` for offline fallback |
| Accredited ERP | `accredited_erp_profiles` | Same pattern |
| Accredited waveforms | `accredited_waveform_profiles` | Same pattern |
| Learner model | `spectral_competency_records`, `spectral_training_plans` | Only via `processMoatAfterTurn()` — never direct insert |

## Adding a Platform (standard flow)
1. Write INSERT into a new migration file: `supabase/migrations/YYYYMMDDHHMMSS_add_platform_X.sql`
2. Run `supabase db push` or apply via Supabase MCP `apply_migration`
3. Add platform to `pcm-platform-ids.ts` if it appears in PCM exercises
4. Add Pk rows to `accredited_defeat_pk` for any defeat pairings that need accredited data

## Critical Rules
- Classification banner `UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY` on every page — non-removable
- SUPABASE_SERVICE_ROLE_KEY and ANTHROPIC_API_KEY are server-only — NEVER in client code
- CesiumJS: NEVER top-level import, ALWAYS dynamic import with ssr:false
- All data is OSINT — no classified sources, no export-controlled algorithms
- JetBrains Mono for ALL data values (frequencies, ranges, coordinates, speeds)
- Background: #0A0A0F | Orange: #F97316 | Cyan: #06B6D4

## 7 Modules
1. Platform Library — drone/jammer/constellation database
2. Spectrum View — D3 log-scale EW chart
3. GNSS Intelligence — constellation vulnerability mapping
4. Defeat Matrix — platform vs defeat system matching
5. Conflict Intel — incident timeline and geo
6. Red/Blue Arena — CesiumJS 3D wargame (WOPR engine)
7. 1v1 Overlay — single-platform engagement analysis

## Full Rules
See `.cursor/rules/` — 10 MDC files cover everything.
