# Code Review Report

**Repository:** SPECTRAL — Military Drone Intelligence Platform  
**Date:** 7 June 2026  
**Scope:** Full codebase — compile health, Map Intel Cesium (disc/sphere refactor), SPECTRA integration, dead code, E2E flows

---

## Summary

SPECTRAL remains **two partially integrated products**: Supabase-backed Platform Library / Defeat Matrix / Map Intel, and client-seed SPECTRA (`/spectrum`) with its own platform model, radars, and effectors. The recent Map Intel **disc vs sphere** refactor is architecturally sound — UAS combat discs at `ellipse.height`, C-UAS defeat spheres ground-tangent — and the invisible-disc bug (elevated `position` + `height: 0`) is fixed with a polyline ring fallback. **`cesiumReady` now gates entity sync**, resolving the prior initial-render race.

Three **runtime defects** still need attention: terrain-masking recompute thrash, loiter wind bearing math, and SPECTRA `eff-*` ID mismatch with Map Intel slugs. **TypeScript does not compile cleanly** (`constants.ts` missing C-UAS category labels; helper script type errors). **`npm run build` fails** on Cesium worker Terser parsing — a deployment blocker unrelated to the disc refactor.

**Consensus:** Request changes — fix P0 runtime bugs and compile/build blockers before treating Map Intel + SPECTRA handoff as production-ready.

---

## Critical Issues (Require Action)

### 1. Terrain masking recompute loop
**Severity:** 🔴 HIGH  
**File:** `app/map/hooks/useTerrainMasking.ts` (lines 59–67)

`setPlacedCuas(prev => prev.map(...))` always returns a **new array reference** even when no `hasTerrainMasking` value changes. `placedCuas` is in the effect dependency array (line 67), so each masking run retriggers the effect → continuous CPU thrash for every placed C-UAS.

**Recommendation:** Remove `placedCuas` from deps (keep `cuasKey` only). Before `setPlacedCuas`, compare updates and `return prev` if nothing changed.

---

### 2. Loiter wind bearing uses swapped coordinates
**Severity:** 🔴 HIGH  
**File:** `app/map/hooks/useWindData.ts` (lines 71–75)

Loiter effective range uses `Math.atan2(u.loiter.lat - u.lat, u.loiter.lon - u.lon) + 180`. Arguments are lat/lon swapped relative to standard bearing math, and +180° inverts direction. Wind-adjusted UAS disc radius on loiter missions can be computed against the wrong heading.

**Recommendation:** Use initial great-circle bearing (`atan2(dLon * cos(meanLat), dLat)` in radians, convert to degrees). Drop +180 unless return-leg wind is explicitly intended.

---

### 3. SPECTRA effector IDs never match Map Intel assets
**Severity:** 🔴 HIGH  
**Files:** `data/seed-effectors-blue.ts`, `lib/spectrum/map-staging.ts`, `app/map/MapIntelView.tsx`

Counter/kill-chain flows stage `eff-iron-beam`, `eff-epirus-leonidas`, etc. Map Intel matches only `platforms.id` and `anti_drone_systems.id` from Supabase (`iron-beam`, `coyote-block-3`, …). Typical AeroCopilot counter-Shahed flow yields **zero sidebar highlights** after "Open in Map Intel →". No alias map exists in `map-staging.ts`.

**Recommendation:** Add canonical ID bridge (`eff-*` → C-UAS slug) in `writeMapStaging`/`readMapStaging`. Banner already documents partial match — extend with auto-translation.

---

### 4. TypeScript compile failures
**Severity:** 🔴 HIGH  
**Files:** `lib/platforms/constants.ts` (line 19), `scripts/list-map-shape-platforms.ts` (line 76)

`tsc --noEmit` fails:
- `CATEGORY_LABELS` missing five `PlatformCategory` keys added for C-UAS: `c_uas_gun`, `c_uas_laser`, `c_uas_rf`, `manpads`, `c_uas_system`
- Helper script calls `.padEnd()` / `.toFixed()` on `string | number` union

**Recommendation:** Add missing category labels (or change type to `Partial<Record<...>>`). Type the cuas sample tuples as `[string, number][]`.

---

### 5. Production build fails (Cesium workers)
**Severity:** 🔴 HIGH  
**File:** Cesium worker chunks (Terser/webpack)

`npm run build` fails: `'import' and 'export' cannot be used outside of module code` when minifying Cesium ellipse outline workers. Dev server works; **Vercel/production deploy is blocked**.

**Recommendation:** Exclude Cesium Workers from Terser, copy pre-minified workers (per project rules), or add `vercel.json` cache headers + webpack externals pattern already used for `CESIUM_BASE_URL`.

---

## Medium Issues (Should Address)

### 6. Engagement envelopes promised but not rendered
**Severity:** 🟠 MEDIUM  
**Files:** `app/spectrum/page.tsx`, `lib/spectrum/effector-types.ts`

UI copy and WOPR handoff describe 3D engagement envelopes. `buildEnvelopeRing` exists in engine + tests only. Map Intel draws placed Supabase UAS discs and C-UAS spheres — not staged SPECTRA effectors.

**Recommendation:** Implement Cesium envelope entities from staged specs, or revise copy to avoid implying live geometry.

---

### 7. Defeat-check API returns 50% for empty cells
**Severity:** 🟠 MEDIUM  
**File:** `app/api/defeat-check/route.ts` (lines 31–34)

Empty Defeat Matrix cells show `—` in UI but API returns `effectiveness_pct: 50, kind: 'estimated'`. Overlap volumes render as defeat/survivable geometry where Matrix shows no adjudication.

**Recommendation:** Return `kind: 'empty'` with no overlap volume, matching `lib/defeat/cell-value.ts`.

---

### 8. Defeat overlap refetch churn on wind updates
**Severity:** 🟠 MEDIUM  
**File:** `app/map/hooks/useDefeatOverlap.ts`

Effect depends on full `placedUas` array reference. `useWindData` updates `lateralRadius_m` on every fetch, re-firing all `/api/defeat-check` calls even when pairings unchanged.

**Recommendation:** Stable geometry key deps (`instanceId:lon:lat:radius`).

---

### 9. Legacy sphere/cylinder naming — dead envelope fields
**Severity:** 🟠 MEDIUM  
**Files:** `lib/map/range-declaration.ts`, `lib/map/format.ts`

UAS envelopes now render as **horizontal discs**, but internals still use `sphereRadiusM`, `sphereCentreAltM`, and `computeUasEnvelope` returns `cylinderCentreAlt_m` / `cylinderLength_m` — **not consumed anywhere in `app/`**. Misleading for maintainers and risks reintroducing sphere-centre overlap bugs.

**Recommendation:** Rename to `discRadiusM` / `discAltitudeM`; drop unused cylinder fields or wire overlap viz to disc altitude consistently.

---

### 10. Overlap detection vs overlap volume geometry mismatch
**Severity:** 🟠 MEDIUM  
**File:** `lib/map/overlap.ts`

`detectOverlapPairs` correctly uses `uas.discAltitude_m` for UAS centre, but `buildOverlapVolume` places heuristic midpoint spheres at `(terrainAMSL average) + radius/2` — not at disc altitude. Training viz may misrepresent defeat zones vertically.

**Recommendation:** Centre overlap volumes at mid-point between disc altitude and C-UAS sphere centre; document heuristic nature in instructor notes.

---

### 11. Effector Matrix stages polluted selection IDs
**Severity:** 🟠 MEDIUM  
**File:** `app/spectrum/page.tsx`

`selectedIds` shared across Threat Library, Radar, and Effectors. "Stage N → Map" passes all IDs including platform slugs and `radar-*` — not effectors-only.

**Recommendation:** Filter to `eff-*` (and optionally `radar-*`) at stage time.

---

### 12. LLM navigate enum missing radar/effectors pages
**Severity:** 🟠 MEDIUM  
**Files:** `lib/spectrum/aerocopilot-llm.ts`, `lib/spectrum/aerocopilot.ts`

API system prompt omits `radar` and `effectors` screens; unknown values fall through to Overview.

**Recommendation:** Align `CopilotScreen`, LLM prompt, and `Page` type.

---

### 13. Map staging not written on copilot navigate-to-map
**Severity:** 🟠 MEDIUM  
**File:** `app/spectrum/page.tsx`

`writeMapStaging` runs only on explicit "Open in Map Intel →". Copilot `navigate: 'map'` updates in-memory `highlightIds` only — new tab loses staging.

**Recommendation:** Call `writeMapStaging` inside copilot action handler when `placeIds` or `navigate === 'map'`.

---

### 14. Unauthenticated read APIs
**Severity:** 🟠 MEDIUM  
**Files:** `app/api/weather/route.ts`, `app/api/map/assets/route.ts`, `app/api/defeat-check/route.ts`

Only `/api/aerocopilot` checks session. Weather proxies burn `WINDY_API_KEY`; defeat-check exposes adjudication without auth.

**Recommendation:** Add `getUser()` check per `07-security-compliance.mdc`; return JSON 401.

---

### 15. Dual Platform models with no bridge
**Severity:** 🟠 MEDIUM  
**Files:** `lib/types/index.ts` vs `lib/spectrum/types.ts`

Same conceptual entity, incompatible TypeScript shapes. SPECTRA seeds 25 platforms; Supabase has different inventory.

**Recommendation:** Canonical slug registry; wire `usePlatforms()` to Supabase with seed fallback.

---

### 16. `windLoading` can stick true on rapid toggle
**Severity:** 🟠 MEDIUM  
**File:** `app/map/hooks/useWindData.ts` (lines 93–95)

Effect cleanup sets `cancelled = true` but not `setLoading(false)` on unmount/re-run.

---

## Low Issues (Consider Addressing)

### 17. Terrain masking uses ground-level ray origin
**File:** `lib/map/terrain-masking.ts` — optimistic vs elevated C-UAS emitters.

### 18. Loiter station circle uses hardcoded 500 m flat-earth offsets
**File:** `lib/map/cesium-sync.ts`

### 19. Stale terrain samples on rapid mouse move
**File:** `app/map/CesiumMapPanel.tsx` — no request cancellation on MOUSE_MOVE.

### 20. Four sidebar modules are stubs
**Files:** `app/(main)/gnss/page.tsx`, `conflicts/page.tsx`, `arena/page.tsx`

### 21. Dashboard links to `/conflicts/[id]` — route 404
**File:** `app/(main)/page.tsx` (line 144) — no dynamic `[id]` route under `conflicts/`.

### 22. `querySpectral` wrapper unused
**File:** `lib/claude/client.ts` — AeroCopilot bypasses project Claude wrapper.

### 23. `mapbox-gl` in package.json — no app imports
Dead dependency (~500 KB).

### 24. `spectral_seed_data.json` referenced in rules — not in repo
Seed data lives in Supabase migrations / TS seed files.

### 25. No `error.tsx` boundaries
**File:** `app/` — project rules recommend per-module error boundaries; none exist.

### 26. ESLint not configured
`npm run lint` prompts interactive setup — no `.eslintrc` committed.

### 27. Demo mode bypasses auth + uses service role
**Files:** `middleware.ts`, `lib/supabase/server.ts`

---

## Resolved Since Prior Review

| Issue | Status |
|-------|--------|
| Cesium initial sync race (pre-populated state) | **Fixed** — `cesiumReady` gates `syncMapEntities` in `CesiumMapPanel.tsx` |
| UAS invisible range envelope | **Fixed** — `syncRangeDisc` uses `ellipse.height` + polyline ring fallback |
| UAS cylinders vs combat discs | **Refactored** — UAS discs, C-UAS spheres; terrain shadows on defeat spheres |

---

## Map Intel Cesium — Current State

**Working:**
- Dynamic import + `ssr: false`; `CESIUM_BASE_URL` before init
- UAS: horizontal combat disc at `discAltitude_m` + orange ring polyline
- C-UAS: ground-tangent defeat sphere at `terrainAMSL + defeat_range_m`
- `removeStale` prevents orphan entities
- Native terrain shadows when C-UAS placed (`lib/map/cesium-shadows.ts`)
- Range tests: 14/14 pass (`lib/map/_test_range.ts`)

**Degraded:**
- Terrain masking effect loop (critical)
- Loiter wind bearing (critical when wind enabled)
- Overlap volumes approximate, not true disc∩sphere
- No SPECTRA effector envelope geometry

---

## Suggested Improvements

1. **ID alias table** — `eff-*` → `anti_drone_systems.id` in `map-staging.ts`
2. **Rename envelope internals** — `sphereRadiusM` → `discRadiusM`; remove dead cylinder fields
3. **Fix masking loop** — single-line change, high ROI
4. **Unify defeat adjudication** — Matrix empty cells = Map overlap empty
5. **Cesium build pipeline** — worker copy script before production ship
6. **Complete `CATEGORY_LABELS`** — unblock `tsc`
7. **Add `error.tsx`** per major module route group
8. **Remove `mapbox-gl`** or wire Mapbox basemap if intended

---

## Verdict

**🔴 REQUEST CHANGES**

| Priority | Action |
|----------|--------|
| P0 | Fix `useTerrainMasking` recompute loop |
| P0 | Fix loiter wind bearing in `useWindData` |
| P0 | Add effector ID alias for Map Intel staging |
| P0 | Fix `tsc` errors (`constants.ts`, helper script) |
| P0 | Fix Cesium worker production build |
| P1 | Filter Effector Matrix stage IDs; auto `writeMapStaging` on copilot map nav |
| P1 | Auth + JSON 401 on read APIs |
| P1 | Rename/clean legacy sphere/cylinder envelope fields |
| P2 | Unify defeat empty-cell semantics (API vs Matrix) |
| P2 | Overlap volume altitude alignment with disc model |
| P3 | Render SPECTRA envelopes or revise copy; stub module cleanup |

---

*Synthesized from direct codebase audit (TypeScript check, build, unit tests, Map Intel/Cesium trace, SPECTRA E2E flows). Parallel council agents did not complete — workspace is not a git repository, so staged-diff review was unavailable.*
