# Spectral — Military Drone Intelligence Platform

Next.js 14 SaaS. ITAR-compliant. OSINT-only. Defence-adjacent.

## Stack
- Next.js 14.2.29 (App Router only — no Pages Router)
- Supabase (@supabase/ssr — NOT legacy auth-helpers)
- CesiumJS 1.116.0 (browser-only, ALWAYS ssr:false, ALWAYS set CESIUM_BASE_URL)
- D3.js 7.9.0 (spectrum chart — log scale 400MHz–6GHz)
- Claude API: claude-sonnet-4-6, always use querySpectral() wrapper in lib/claude/client.ts
- Tailwind + shadcn/ui

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
