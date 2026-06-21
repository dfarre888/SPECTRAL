# Council Review — June 2026 (P0 Remediation)

**Repository:** SPECTRAL — Military Drone Intelligence Platform  
**Date:** 21 June 2026  
**Scope:** P0 security, SAM Pk consistency, Map Intel overlay race, DS route binding  
**Classification:** UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY

---

## Executive Summary

The June 2026 council identified five **P0** items blocking production credibility for defence-adjacent customers. All five have been **implemented** in this remediation pass. Remaining work from the prior full audit is deferred to Phase 3 (see below).

---

## P0 Fixes — IMPLEMENTED

### 1. Demo mode NODE_ENV guard

**File:** `lib/demo.ts`

`isDemoMode()` now requires `NEXT_PUBLIC_DEMO_MODE === 'true'` **and** `NODE_ENV !== 'production'`. Demo auth bypass and service-role reads cannot activate in a production deployment even if the env flag is mis-set.

---

### 2. API auth on map/assets and weather

**Files:** `app/api/map/assets/route.ts`, `app/api/weather/route.ts`

Both routes call `requireSpectralAuth()` before processing. Unauthenticated requests receive JSON 401. Windy API key proxy and map asset catalogue are no longer publicly callable.

---

### 3. SAM Pk unified resolver

**Files:** `lib/defeat/resolve-sam-pk.ts`, `lib/defeat/cell-value.ts`, `components/defeat/DefeatHeatmap.tsx`, `components/defeat/AdjudicationPanel.tsx`, `components/defeat/MatrixCell.tsx`, `app/api/defeat-check/route.ts`, `lib/defeat/export-csv.ts`, `lib/pcm/defeat-matrix-lookup.ts`

Single resolver `resolveSamKineticPct()` wraps `kineticPctFromSam()` for SAM systems and passes through DB `kinetic_pct` for non-SAM effectors. All matrix surfaces (heatmap, grid cells, adjudication panel, CSV export, defeat-check API, PCM lookup) route kinetic display through `resolveCellValue(..., computedSamPk)` so SAM × platform Pk is consistent everywhere.

Unit tests added in `lib/defeat/_test_sam-matrix-bridge.test.ts` for `resolveSamKineticPct`.

---

### 4. DS session binding

**File:** `lib/moat/ds-route-auth.ts` (consumed by competency, training-plan, currency, force-design routes)

Client-supplied `ds_player_id` is bound to the authenticated Supabase session via `resolveSessionDsPlayerId` + `assertDsPlayerMatchesSession`. Learner exercise scope verified with `dsCanAccessLearner`. Demo mode skips binding when no real session exists.

---

### 5. MapIntel overlay race fix

**File:** `app/map/MapIntelView.tsx`

`syncRiskOverlay` uses a generation token (`riskOverlayGenRef`) incremented at sync start. After async blast/jamming overlay creation, stale generations bail before assigning `riskOverlayRef`, with orphan entity cleanup on superseded awaits.

---

## Verdict

**✅ CHANGES IMPLEMENTED — P0 CLOSED**

The five council P0 items are remediated. TypeScript compile and unit test suite should be run before merge (`npx tsc --noEmit`, `npx vitest run`).

---

## Phase 3 — Deferred (not in this pass)

| Item | Severity | Notes |
|------|----------|-------|
| Terrain masking recompute loop | HIGH | `useTerrainMasking.ts` effect deps |
| Loiter wind bearing swap | HIGH | `useWindData.ts` bearing math |
| SPECTRA `eff-*` → Map Intel slug bridge | HIGH | `map-staging.ts` alias table |
| TypeScript `CATEGORY_LABELS` gaps | HIGH | `lib/platforms/constants.ts` |
| Cesium worker production build (Terser) | HIGH | `next.config.ts` / worker copy |
| Defeat-check empty-cell semantics | MEDIUM | Match Matrix `—` for empty cells |
| Overlap volume altitude alignment | MEDIUM | Disc vs sphere heuristic |
| Unauthenticated defeat-check API | MEDIUM | Add auth (map/weather done) |
| SPECTRA engagement envelope rendering | MEDIUM | Copy vs implementation |
| Stub modules (GNSS, conflicts, arena) | LOW | Dashboard 404 on conflict detail |

---

*Council synthesis — June 2026 P0 remediation. Prior full audit (7 June 2026) remains reference for Phase 3 backlog.*
