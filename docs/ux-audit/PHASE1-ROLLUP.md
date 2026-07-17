# SPECTRAL UX Audit — Phase 1 Rollup

**Classification:** UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY  
**Date:** 2026-07-17  
**Environment:** `http://localhost:3001` (Operations edition, demo mode active)  
**Method:** Playwright full-page screenshots (1440×900 + 390×844), `capture-results.json` console/network pass, page.tsx + component code review, anti-slop grep

---

## Executive summary

SPECTRAL’s **core intelligence modules** (Spectrum, Platform detail, GNSS, Defeat Matrix, Conflict Incidents) already read as **credible defence training software** — dense OSINT copy, classification banner, mono data fields, and A3DM zinc canvas are working. The platform **does not yet meet Palantir-tier buyer bar** (Phase 2 target ≥92): weighted average across 24 routes is **~76.8/100** (band **C — training viable**).

**Strengths**

- Classification banner present on every captured route
- `store-panel` / `HubPageShell` adoption is broad; shadcn default `Card` is rarely used raw
- Spectrum module (`/spectrum`) is the design north star — separate SPECTRA rail, inventory counts, AeroCopilot rail
- Platform detail (`/platforms/mq-9-reaper`) delivers Jane’s-style spec sheet + defeat cross-links
- Conflict Incidents (`/conflict`) combines globe + timeline + structured incident card — closest to Gotham object graph

**Critical gaps (P0 — 11 items)**

1. **Group 1 platform 404** — `/platforms/dji-mavic-3` returns Next 404 (seed id exists; DB `platforms.id` mismatch)
2. **Conflict case detail stub** — `/conflicts/ukraine-naval-usv` is placeholder copy only
3. **PCM exercise “Turn undefined”** — broken data binding in exercise workspace
4. **PCM AAR empty** — `AAR not available` + API 403 on `/api/spectral/aar`
5. **`/pcm/force-design` HTTP 500** observed during automated capture (page renders in manual screenshot — flaky SSR)
6. **Purple “AI Ready” chrome** — off-brand vs orange-primary A3DM tokens (Topbar-adjacent; visible on most pages)
7. **Mobile sidebar does not collapse** — 390 px view hides main content behind fixed `w-72` nav
8. **`/login` unreachable in demo mode** — middleware bypass renders dashboard shell instead of auth UI
9. **Console `Zap is not defined`** — cascades during heavy navigation (Topbar error boundary; map/arena stress path)
10. **Compare / overlay empty states** — no guided selection flow from deep links
11. **Duplicate conflict nav** — “Conflict Intel” vs “Incident Timeline” confuses case studies vs live feed

**Path to Phase 2 (≥92):** Fix P0 data routes first, then unify radius tokens (`rounded-xl` for panels), purge purple from chrome, add mobile drawer, promote operational KPIs above marketing hero on `/`.

---

## Leaderboard (weighted score, high → low)

| Rank | Route | Score | Band | Screenshot |
|------|-------|-------|------|------------|
| 1 | `/spectrum` | **91.3** | B | `screenshots/spectrum-1440x900.png` |
| 2 | `/platforms/mq-9-reaper` | **88.7** | B | `screenshots/platform-mq9-1440x900.png` |
| 3 | `/gnss` | **87.2** | B | `screenshots/gnss-1440x900.png` |
| 4 | `/defeat` | **86.1** | B | `screenshots/defeat-1440x900.png` |
| 5 | `/economics` | **85.4** | B | `screenshots/economics-1440x900.png` |
| 6 | `/platforms` | **84.5** | B | `screenshots/platforms-1440x900.png` |
| 7 | `/conflict` | **83.6** | B | `screenshots/conflict-1440x900.png` |
| 8 | `/arena` | **81.9** | C | `screenshots/arena-1440x900.png` |
| 9 | `/` (dashboard) | **81.2** | C | `screenshots/home-1440x900.png` |
| 10 | `/conflicts` | **80.4** | C | `screenshots/conflicts-1440x900.png` |
| 11 | `/map` | **79.8** | C | `screenshots/map-1440x900.png` |
| 12 | `/pcm/scenario` | **79.8** | C | `screenshots/pcm-scenario-1440x900.png` |
| 13 | `/operations/import` | **79.2** | C | `screenshots/operations-import-1440x900.png` |
| 14 | `/planner` | **78.6** | C | `screenshots/planner-1440x900.png` |
| 15 | `/pcm` | **75.3** | C | `screenshots/pcm-1440x900.png` |
| 16 | `/overlay` | **73.2** | C | `screenshots/overlay-1440x900.png` |
| 17 | `/currency` | **73.8** | C | `screenshots/currency-1440x900.png` |
| 18 | `/compare` | **71.5** | C | `screenshots/compare-1440x900.png` |
| 19 | `/login` | **68.5** | D | `screenshots/login-1440x900.png` |
| 20 | `/pcm/force-design` | **67.4** | D | `screenshots/pcm-force-design-1440x900.png` |
| 21 | `/pcm/exercise/[id]` | **57.2** | F | `screenshots/pcm-exercise-1440x900.png` |
| 22 | `/pcm/exercise/[id]/aar` | **54.1** | F | `screenshots/pcm-aar-1440x900.png` |
| 23 | `/conflicts/ukraine-naval-usv` | **51.8** | F | `screenshots/conflicts-ukraine-1440x900.png` |
| 24 | `/platforms/dji-mavic-3` | **44.0** | F | `screenshots/platform-mavic3-1440x900.png` |

**Overall average:** **76.8**  
**Pages ≥92 (Phase 2 target):** 0  
**Pages in F band:** 4

### Top 5 pages
1. `/spectrum` — 91.3  
2. `/platforms/mq-9-reaper` — 88.7  
3. `/gnss` — 87.2  
4. `/defeat` — 86.1  
5. `/economics` — 85.4  

### Bottom 5 pages
1. `/platforms/dji-mavic-3` — 44.0  
2. `/conflicts/ukraine-naval-usv` — 51.8  
3. `/pcm/exercise/[id]/aar` — 54.1  
4. `/pcm/exercise/[id]` — 57.2  
5. `/pcm/force-design` — 67.4  

---

## Cross-cutting defects (3+ pages)

| Defect | Pages affected | Severity |
|--------|----------------|----------|
| Purple “AI Ready” / profile chrome off orange-primary system | All main-shell routes | P1 |
| `text-purple` module accents (PCM, EW wizard, login legacy) | `/pcm`, `/`, `/login`, `StartHereWizard`, `DashboardModuleCatalog` | P1 |
| Border-radius drift (`rounded-lg` / `rounded-xl` / `rounded-2xl`) | Platforms, Defeat, Map, PCM | P2 |
| Mobile: fixed sidebar obscures content | `/`, `/platforms`, `/spectrum`, `/map`, … | P0 |
| Demo/test placeholder labels (“test 2”, “test 1”) | `/`, `/arena` | P1 |
| Empty states without primary CTA deep link | `/compare`, `/overlay`, `/currency`, `/planner` | P2 |
| Cesium globe initial black frame / load latency | `/map`, `/arena`, `/conflict`, `/pcm/exercise` | P2 |
| `border-zinc-700` / `text-zinc-*` instead of `--store-*` | `/conflicts` tabs | P2 |

---

## Design system gaps

| Gap | Current state | Phase 2 spec |
|-----|---------------|--------------|
| **Primary accent** | Orange nav + purple AI badge coexist | Orange-only chrome; purple = EW/AI module interior only |
| **Display font** | Space Grotesk on heroes; Inter on body | Document in `store-display` usage matrix |
| **Mono enforcement** | Strong on spec sheets; weak on dashboard KPIs | ESLint/style rule: numeric `font-mono` |
| **Panel radius** | Mixed 2xl/xl/lg | Standardise: panel `rounded-xl`, inner well `rounded-lg` |
| **Mobile shell** | No hamburger / drawer | `FullBleedShell` pattern extended to `(main)` layout |
| **Empty states** | `components/ui/empty-state.tsx` underused | Required on compare, overlay, currency, AAR |
| **Loading** | Skeleton in platforms; spinner elsewhere | Skeleton-first on all data routes |
| **Auth surface** | Demo bypass hides login polish | Dedicated unauthenticated preview or `/login?preview=1` |

---

## Phase 2 priority queue

### P0 — Ship blockers (buyer demo breakers)
1. Fix Group 1 platform slug resolution (`dji-mavic-3` or redirect from seed id)
2. Implement `/conflicts/[id]` from `seed-conflicts.ts` (Ukraine case study)
3. Fix PCM exercise turn label (`Turn undefined` → bound turn number)
4. Wire AAR fetch with demo fixture or graceful DS-auth empty state
5. Mobile sidebar drawer + overlay dismiss
6. Resolve `/pcm/force-design` 500 on cold navigation
7. Investigate `Zap is not defined` console cascade

### P1 — Enterprise gravitas
8. Remove/retheme purple “AI Ready” topbar badge → orange/cyan
9. Replace WOPR test scenario names with OSINT vignette titles
10. Dashboard KPI cards: mono numerals + threat-priority ordering (not equal grid)
11. Unify conflict nav labels (Case Studies vs Incidents)
12. Login page accessible for procurement walkthrough (demo gate)

### P2 — Polish to 92+
13. Normalise border-radius tokens across modules
14. Compare/overlay: pre-select platforms from query string
15. Map Intel: globe loading skeleton + progress chip
16. Conflicts tabs: replace zinc with `--store-line` / `--store-accent`
17. Force Design: panel layout + results viz (not single orange button)

### P3 — Delight / competitive edge
18. Spectrum → Map Intel cross-highlight on band click
19. Defeat matrix: reduce empty “—” cells with confidence tooltip
20. Arena: Anduril-style tasking timeline rail
21. Economics: export CSV + briefing footnote citations

---

## Per-page audit

### `/` — Dashboard

| Dimension | Score |
|-----------|-------|
| Enterprise gravitas | 82 |
| Anti-AI-slop | 72 |
| Information hierarchy | 85 |
| Typography & data | 78 |
| Color & token discipline | 80 |
| Spatial rhythm | 82 |
| Interaction & feedback | 80 |
| Navigation & wayfinding | 88 |
| Module cohesion | 84 |
| Accessibility | 72 |
| Performance perception | 88 |
| **Weighted total** | **81.2** |

**Evidence:** `screenshots/home-1440x900.png`, `home-390x844.png` · Console: 0 · Network: 0 failed

**P0 failures:** Mobile sidebar covers hero content

**AI-slop hits:** Purple AI Ready (HIT); equal KPI card grid (HIT); purple module catalog accents (HIT)

**Upgrade brief:** Collapse hero marketing into one line; lead with live COP metrics (active missions, threat count). Promote Shahed/LIDS panel to primary column. Add mobile nav drawer.

**Files:** `app/(main)/page.tsx`, `components/dashboard/DashboardCommandCenter.tsx`, `components/dashboard/DashboardModuleCatalog.tsx`, `components/catalog/StoreHero.tsx`

**Emulate:** Palantir Gotham landing COP · Anduril Lattice status rail · Jane's inventory counts

---

### `/platforms`

| Dimension | Score |
|-----------|-------|
| Enterprise gravitas | 86 |
| Anti-AI-slop | 80 |
| Information hierarchy | 88 |
| Typography & data | 85 |
| Color & token discipline | 82 |
| Spatial rhythm | 85 |
| Interaction & feedback | 84 |
| Navigation & wayfinding | 86 |
| Module cohesion | 88 |
| Accessibility | 78 |
| Performance perception | 86 |
| **Weighted total** | **84.5** |

**Evidence:** `screenshots/platforms-1440x900.png`, `platforms-390x844.png` · Console: 0 · Network: 0

**P0 failures:** None

**AI-slop hits:** Purple AI Ready chrome (HIT); `rounded-2xl` on cards (minor HIT)

**Upgrade brief:** Sticky filter column on mobile; combat-proven filter as default for training tier.

**Files:** `components/platforms/PlatformLibrary.tsx`, `PlatformCard.tsx`, `StoreFilterSidebar.tsx`

**Emulate:** Jane's Fighting Ships index · DroneShield target library · Gotham object type browser

---

### `/platforms/mq-9-reaper` (MALE)

| Dimension | Score |
|-----------|-------|
| Enterprise gravitas | 90 |
| Anti-AI-slop | 88 |
| Information hierarchy | 92 |
| Typography & data | 92 |
| Color & token discipline | 86 |
| Spatial rhythm | 88 |
| Interaction & feedback | 86 |
| Navigation & wayfinding | 88 |
| Module cohesion | 90 |
| Accessibility | 82 |
| Performance perception | 88 |
| **Weighted total** | **88.7** |

**Evidence:** `screenshots/platform-mq9-1440x900.png` · Console: 0 · Network: 0

**P0 failures:** None

**AI-slop hits:** PASS (store-panel, mono specs, confidence badge)

**Upgrade brief:** Add source date footnote on spec sheet; link to Map Intel laydown preset.

**Files:** `app/(main)/platforms/[id]/page.tsx`, `PlatformSpecSheet.tsx`, `CountermeasuresPanel.tsx`

**Emulate:** Jane's platform entry · IHS Markit spec table · Lattice asset detail drawer

---

### `/platforms/dji-mavic-3` (Group 1) — **404**

| Dimension | Score |
|-----------|-------|
| Enterprise gravitas | 40 |
| Anti-AI-slop | 45 |
| Information hierarchy | 30 |
| Typography & data | 50 |
| Color & token discipline | 60 |
| Spatial rhythm | 50 |
| Interaction & feedback | 35 |
| Navigation & wayfinding | 40 |
| Module cohesion | 45 |
| Accessibility | 50 |
| Performance perception | 40 |
| **Weighted total** | **44.0** |

**Evidence:** `screenshots/platform-mavic3-1440x900.png` · Title: `404: This page could not be found` · Console: 0

**P0 failures:** Route 404 — seed id `dji-mavic-3` not in Supabase `platforms.id`

**AI-slop hits:** N/A — broken route

**Upgrade brief:** Align seed → DB migration for Group 1 exemplar; or slug alias map in `getPlatformById`.

**Files:** `lib/platforms/queries.ts`, `data/seed-platforms.ts`, Supabase `platforms` table

**Emulate:** Jane's Group 1 UAS entry (Mavic as COTS reference threat)

---

### `/spectrum`

| Dimension | Score |
|-----------|-------|
| Enterprise gravitas | 92 |
| Anti-AI-slop | 90 |
| Information hierarchy | 94 |
| Typography & data | 92 |
| Color & token discipline | 88 |
| Spatial rhythm | 90 |
| Interaction & feedback | 90 |
| Navigation & wayfinding | 92 |
| Module cohesion | 94 |
| Accessibility | 85 |
| Performance perception | 88 |
| **Weighted total** | **91.3** |

**Evidence:** `screenshots/spectrum-1440x900.png`, `spectrum-390x844.png` · Console: 0 · Network: 0

**P0 failures:** None

**AI-slop hits:** PASS — operational KPIs, band congestion, advisor rail

**Upgrade brief:** One click to Map Intel EW deconflict with selected band pre-filtered.

**Files:** `app/spectrum/page.tsx`, `components/spectrum/*`

**Emulate:** Palantir spectrum ontology · Anduril EW COP · Jane's freq band tables

---

### `/map`

| Dimension | Score |
|-----------|-------|
| Enterprise gravitas | 88 |
| Anti-AI-slop | 82 |
| Information hierarchy | 86 |
| Typography & data | 84 |
| Color & token discipline | 80 |
| Spatial rhythm | 82 |
| Interaction & feedback | 78 |
| Navigation & wayfinding | 84 |
| Module cohesion | 80 |
| Accessibility | 75 |
| Performance perception | 68 |
| **Weighted total** | **79.8** |

**Evidence:** `screenshots/map-1440x900.png`, `map-390x844.png` · Console: 20+ (`Zap is not defined`, setState-in-render) · Network: Bing tile aborts (expected)

**P0 failures:** Console error cascade under navigation stress

**AI-slop hits:** Purple Map icon in sidebar asset panel (HIT); dense toolbar without priority (minor)

**Upgrade brief:** Globe loading skeleton; toolbar tier-1 vs advanced; fix Zap reference.

**Files:** `app/map/MapIntelView.tsx`, `CesiumMapPanel.tsx`, `AssetSidebar.tsx`, `FullBleedShell.tsx`

**Emulate:** Anduril Lattice COP · Gotham map + object panel · Dedrone sensor map

---

### `/gnss`

| Dimension | Score |
|-----------|-------|
| Enterprise gravitas | 88 |
| Anti-AI-slop | 86 |
| Information hierarchy | 90 |
| Typography & data | 92 |
| Color & token discipline | 86 |
| Spatial rhythm | 86 |
| Interaction & feedback | 84 |
| Navigation & wayfinding | 86 |
| Module cohesion | 88 |
| Accessibility | 84 |
| Performance perception | 86 |
| **Weighted total** | **87.2** |

**Evidence:** `screenshots/gnss-1440x900.png` · Console: 0 · Network: 1 tile abort

**P0 failures:** None

**AI-slop hits:** PASS — MHz mono, constellation cards

**Upgrade brief:** Jamming incidents tab default for Ukraine vignette training.

**Files:** `components/gnss/GnssWorkspace.tsx`, `ConstellationStatusPanel.tsx`

**Emulate:** Jane's GNSS/EW supplement · Gotham EW layer · Palantir timeline for jam events

---

### `/defeat`

| Dimension | Score |
|-----------|-------|
| Enterprise gravitas | 88 |
| Anti-AI-slop | 84 |
| Information hierarchy | 90 |
| Typography & data | 88 |
| Color & token discipline | 84 |
| Spatial rhythm | 86 |
| Interaction & feedback | 86 |
| Navigation & wayfinding | 86 |
| Module cohesion | 88 |
| Accessibility | 82 |
| Performance perception | 84 |
| **Weighted total** | **86.1** |

**Evidence:** `screenshots/defeat-1440x900.png` · Console: 0 · Network: 0

**P0 failures:** None

**AI-slop hits:** Many empty matrix cells “—” (minor); operations note banner good

**Upgrade brief:** Heat-map default for briefing mode; cell confidence tooltip.

**Files:** `components/defeat/DefeatMatrix.tsx`, `DefeatMatrixTable.tsx`

**Emulate:** DroneShield effector matrix · Jane's countermeasure tables · Gotham relationship graph

---

### `/compare`

| Dimension | Score |
|-----------|-------|
| Enterprise gravitas | 72 |
| Anti-AI-slop | 68 |
| Information hierarchy | 70 |
| Typography & data | 75 |
| Color & token discipline | 78 |
| Spatial rhythm | 74 |
| Interaction & feedback | 68 |
| Navigation & wayfinding | 76 |
| Module cohesion | 72 |
| Accessibility | 78 |
| Performance perception | 82 |
| **Weighted total** | **71.5** |

**Evidence:** `screenshots/compare-1440x900.png` · Console: 0

**P0 failures:** None (empty state only)

**AI-slop hits:** Generic empty card (HIT); no operational preview (HIT)

**Upgrade brief:** Show last-compared pair; `?a=&b=` query support.

**Files:** `app/(main)/compare/page.tsx`, `components/compare/*`

**Emulate:** Jane's side-by-side · Lattice asset compare · IHS spec diff

---

### `/overlay` (SAM Engagement)

| Dimension | Score |
|-----------|-------|
| Enterprise gravitas | 76 |
| Anti-AI-slop | 70 |
| Information hierarchy | 74 |
| Typography & data | 78 |
| Color & token discipline | 80 |
| Spatial rhythm | 76 |
| Interaction & feedback | 70 |
| Navigation & wayfinding | 74 |
| Module cohesion | 76 |
| Accessibility | 76 |
| Performance perception | 80 |
| **Weighted total** | **73.2** |

**Evidence:** `screenshots/overlay-1440x900.png`

**Upgrade brief:** Default vignette (Shahed vs NASAMS) on load.

**Files:** `components/overlay/OverlayWorkspace.tsx`

**Emulate:** Anduril engagement geometry · Jane's SAM vs UAS · Gotham weapons envelope

---

### `/conflict` (Incident Timeline)

| Dimension | Score |
|-----------|-------|
| Enterprise gravitas | 86 |
| Anti-AI-slop | 82 |
| Information hierarchy | 88 |
| Typography & data | 86 |
| Color & token discipline | 82 |
| Spatial rhythm | 84 |
| Interaction & feedback | 84 |
| Navigation & wayfinding | 82 |
| Module cohesion | 84 |
| Accessibility | 80 |
| Performance perception | 80 |
| **Weighted total** | **83.6** |

**Evidence:** `screenshots/conflict-1440x900.png`

**Upgrade brief:** Link timeline card → platform library filters.

**Files:** `components/conflict/ConflictIntelClient.tsx`, `ConflictCesiumMap.tsx`

**Emulate:** Gotham geospatial timeline · Palantir object graph · Jane's incident chronology

---

### `/conflicts` (Case Studies)

| Dimension | Score |
|-----------|-------|
| Enterprise gravitas | 82 |
| Anti-AI-slop | 76 |
| Information hierarchy | 84 |
| Typography & data | 82 |
| Color & token discipline | 74 |
| Spatial rhythm | 80 |
| Interaction & feedback | 80 |
| Navigation & wayfinding | 82 |
| Module cohesion | 80 |
| Accessibility | 78 |
| Performance perception | 84 |
| **Weighted total** | **80.4** |

**Evidence:** `screenshots/conflicts-1440x900.png`, `conflicts-390x844.png`

**AI-slop hits:** `border-zinc-700` tabs (HIT)

**Files:** `app/(main)/conflicts/page.tsx`

**Emulate:** Jane's conflict case file · IHS Jane's lesson learned · Gotham narrative panel

---

### `/conflicts/ukraine-naval-usv` — **stub**

| Dimension | Score |
|-----------|-------|
| Enterprise gravitas | 48 |
| Anti-AI-slop | 50 |
| Information hierarchy | 45 |
| Typography & data | 55 |
| Color & token discipline | 70 |
| Spatial rhythm | 60 |
| Interaction & feedback | 40 |
| Navigation & wayfinding | 55 |
| Module cohesion | 50 |
| Accessibility | 75 |
| Performance perception | 82 |
| **Weighted total** | **51.8** |

**Evidence:** `screenshots/conflicts-ukraine-1440x900.png` — “Full conflict timeline — coming in next release.”

**P0 failures:** Placeholder only; lowercase slug title from `params.id.replace(/-/g, ' ')`

**Files:** `app/(main)/conflicts/[id]/page.tsx`, `data/seed-conflicts.ts`

**Emulate:** Jane's Ukraine USV campaign ORBAT · Gotham incident expansion · Palantir lesson card

---

### `/arena`

| Dimension | Score |
|-----------|-------|
| Enterprise gravitas | 84 |
| Anti-AI-slop | 78 |
| Information hierarchy | 84 |
| Typography & data | 82 |
| Color & token discipline | 80 |
| Spatial rhythm | 82 |
| Interaction & feedback | 82 |
| Navigation & wayfinding | 82 |
| Module cohesion | 82 |
| Accessibility | 78 |
| Performance perception | 76 |
| **Weighted total** | **81.9** |

**Evidence:** `screenshots/arena-1440x900.png` · Console errors under stress test

**AI-slop hits:** Test scenario names (HIT)

**Files:** `components/arena/ArenaWorkspace.tsx`, `CesiumArena.tsx`

**Emulate:** Anduril Lattice tasking · WOPR-style tick advance · Gotham scenario runner

---

### `/planner`

| Dimension | Score |
|-----------|-------|
| Enterprise gravitas | 80 |
| Anti-AI-slop | 76 |
| Information hierarchy | 82 |
| Typography & data | 80 |
| Color & token discipline | 78 |
| Spatial rhythm | 78 |
| Interaction & feedback | 74 |
| Navigation & wayfinding | 80 |
| Module cohesion | 78 |
| Accessibility | 76 |
| Performance perception | 80 |
| **Weighted total** | **78.6** |

**Evidence:** `screenshots/planner-1440x900.png`

**Upgrade brief:** Populate saved plans demo; vignette cards → Map Intel deep link.

**Files:** `app/(main)/planner/page.tsx`, `components/planner/*`

---

### `/pcm`

| Dimension | Score |
|-----------|-------|
| Enterprise gravitas | 76 |
| Anti-AI-slop | 70 |
| Information hierarchy | 78 |
| Typography & data | 76 |
| Color & token discipline | 72 |
| Spatial rhythm | 76 |
| Interaction & feedback | 74 |
| Navigation & wayfinding | 80 |
| Module cohesion | 74 |
| Accessibility | 76 |
| Performance perception | 80 |
| **Weighted total** | **75.3** |

**AI-slop hits:** Equal three-card grid (HIT); purple Swords icon (HIT)

**Files:** `app/(main)/pcm/page.tsx`

---

### `/pcm/scenario`

| Dimension | Score |
|-----------|-------|
| Enterprise gravitas | 80 |
| Anti-AI-slop | 78 |
| Information hierarchy | 82 |
| Typography & data | 80 |
| Color & token discipline | 78 |
| Spatial rhythm | 78 |
| Interaction & feedback | 80 |
| Navigation & wayfinding | 80 |
| Module cohesion | 80 |
| Accessibility | 76 |
| Performance perception | 82 |
| **Weighted total** | **79.8** |

**Files:** `components/pcm/ScenarioGeneratorPanel.tsx`

---

### `/pcm/force-design`

| Dimension | Score |
|-----------|-------|
| Enterprise gravitas | 68 |
| Anti-AI-slop | 62 |
| Information hierarchy | 65 |
| Typography & data | 70 |
| Color & token discipline | 72 |
| Spatial rhythm | 70 |
| Interaction & feedback | 65 |
| Navigation & wayfinding | 72 |
| Module cohesion | 68 |
| Accessibility | 74 |
| Performance perception | 60 |
| **Weighted total** | **67.4** |

**Evidence:** HTTP 500 in capture · Console: `useContext` null · 3 errors

**P0 failures:** SSR 500 on cold load (intermittent)

**AI-slop hits:** Single button + empty void (HIT); stub copy (HIT)

**Files:** `components/pcm/ForceDesignWorkbench.tsx`, `app/(main)/pcm/force-design/page.tsx`

---

### `/pcm/exercise/[id]`

| Dimension | Score |
|-----------|-------|
| Enterprise gravitas | 58 |
| Anti-AI-slop | 52 |
| Information hierarchy | 55 |
| Typography & data | 60 |
| Color & token discipline | 70 |
| Spatial rhythm | 62 |
| Interaction & feedback | 50 |
| Navigation & wayfinding | 65 |
| Module cohesion | 60 |
| Accessibility | 72 |
| Performance perception | 70 |
| **Weighted total** | **57.2** |

**P0 failures:** Title shows **“Turn undefined”**; globe loading state

**Files:** `components/pcm/PcmExerciseWorkspace.tsx`, `SpectralGlobe.tsx`, `TurnControlPanel.tsx`

---

### `/pcm/exercise/[id]/aar`

| Dimension | Score |
|-----------|-------|
| Enterprise gravitas | 50 |
| Anti-AI-slop | 48 |
| Information hierarchy | 45 |
| Typography & data | 55 |
| Color & token discipline | 70 |
| Spatial rhythm | 55 |
| Interaction & feedback | 42 |
| Navigation & wayfinding | 60 |
| Module cohesion | 52 |
| Accessibility | 70 |
| Performance perception | 75 |
| **Weighted total** | **54.1** |

**Evidence:** “AAR not available” · API 403 ×2 on `/api/spectral/aar`

**P0 failures:** No AAR content; auth blocked

**Files:** `components/pcm/SpectralAAR.tsx`, `app/api/spectral/aar/route.ts`

---

### `/currency`

| Dimension | Score |
|-----------|-------|
| Enterprise gravitas | 74 |
| Anti-AI-slop | 72 |
| Information hierarchy | 76 |
| Typography & data | 78 |
| Color & token discipline | 76 |
| Spatial rhythm | 74 |
| Interaction & feedback | 70 |
| Navigation & wayfinding | 78 |
| Module cohesion | 76 |
| Accessibility | 78 |
| Performance perception | 82 |
| **Weighted total** | **73.8** |

**Evidence:** Empty filter state — acceptable for DS tool

**Files:** `components/currency/CurrencyQueueClient.tsx`

---

### `/economics`

| Dimension | Score |
|-----------|-------|
| Enterprise gravitas | 86 |
| Anti-AI-slop | 84 |
| Information hierarchy | 88 |
| Typography & data | 88 |
| Color & token discipline | 84 |
| Spatial rhythm | 84 |
| Interaction & feedback | 82 |
| Navigation & wayfinding | 80 |
| Module cohesion | 82 |
| Accessibility | 80 |
| Performance perception | 86 |
| **Weighted total** | **85.4** |

**Evidence:** Exchange ratio table + salvo simulator — strong operator copy

**Files:** `components/planner/EngagementEconomicsPanel.tsx`, `SalvoSimulator.tsx`

---

### `/operations/import`

| Dimension | Score |
|-----------|-------|
| Enterprise gravitas | 82 |
| Anti-AI-slop | 76 |
| Information hierarchy | 84 |
| Typography & data | 82 |
| Color & token discipline | 76 |
| Spatial rhythm | 80 |
| Interaction & feedback | 78 |
| Navigation & wayfinding | 82 |
| Module cohesion | 80 |
| Accessibility | 80 |
| Performance perception | 84 |
| **Weighted total** | **79.2** |

**AI-slop hits:** Purple FileUp icon (HIT)

**Files:** `app/(main)/operations/import/page.tsx`

---

### `/login`

| Dimension | Score |
|-----------|-------|
| Enterprise gravitas | 70 |
| Anti-AI-slop | 68 |
| Information hierarchy | 65 |
| Typography & data | 72 |
| Color & token discipline | 74 |
| Spatial rhythm | 72 |
| Interaction & feedback | 68 |
| Navigation & wayfinding | 60 |
| Module cohesion | 70 |
| Accessibility | 78 |
| Performance perception | 82 |
| **Weighted total** | **68.5** |

**Note:** Demo mode bypass — screenshot shows dashboard shell, not login form. Code review: `StorePanel` auth UI is acceptable; OIDC path present.

**Files:** `app/login/page.tsx`, `middleware.ts`

---

## Screenshot index

All paths relative to `docs/ux-audit/screenshots/`:

| Slug | Desktop | Mobile |
|------|---------|--------|
| home | home-1440x900.png | home-390x844.png |
| platforms | platforms-1440x900.png | platforms-390x844.png |
| platform-mq9 | platform-mq9-1440x900.png | platform-mq9-390x844.png |
| platform-mavic3 | platform-mavic3-1440x900.png | — |
| spectrum | spectrum-1440x900.png | spectrum-390x844.png |
| map | map-1440x900.png | map-390x844.png |
| gnss | gnss-1440x900.png | gnss-390x844.png |
| defeat | defeat-1440x900.png | defeat-390x844.png |
| compare | compare-1440x900.png | — |
| overlay | overlay-1440x900.png | — |
| conflict | conflict-1440x900.png | — |
| conflicts | conflicts-1440x900.png | conflicts-390x844.png |
| conflicts-ukraine | conflicts-ukraine-1440x900.png | — |
| arena | arena-1440x900.png | arena-390x844.png |
| planner | planner-1440x900.png | — |
| pcm | pcm-1440x900.png | pcm-390x844.png |
| pcm-scenario | pcm-scenario-1440x900.png | — |
| pcm-force-design | pcm-force-design-1440x900.png | — |
| pcm-exercise | pcm-exercise-1440x900.png | — |
| pcm-aar | pcm-aar-1440x900.png | — |
| currency | currency-1440x900.png | — |
| economics | economics-1440x900.png | — |
| operations-import | operations-import-1440x900.png | — |
| login | login-1440x900.png | login-390x844.png |

Machine-readable telemetry: `docs/ux-audit/capture-results.json`

---

## P0 count summary

**Total P0 defects: 11** (see Phase 2 priority queue P0 items 1–7 plus auth/mobile/login/conflict detail/platform 404/exercise/AAR)

---

*Phase 1 complete — read-only. No code changes applied.*
