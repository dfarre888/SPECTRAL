# Spectrum Intelligence — build handoff

Production build of the EW / spectrum-intelligence module ("SPECTRA"). Drop-in
for the A3DM Next.js 14 App Router / TypeScript / Tailwind / Supabase stack.

**Status:** engine validated (26/26 tests), full type-check clean, all 10 mockup
frames implemented. Open-source data only. Close-hold — Allied/friendly use.

---

## What's here

```
lib/spectrum/            ← framework-agnostic engine (no React)
  types.ts               ← the type system
  scale.ts               ← log-scale math, unit conversion, axis configs, colours
  engagement.ts          ← overlap detection + outcome verdict logic + GNSS bands
  fallback.ts            ← derives bands from legacy fields when no curated rows

components/spectrum/      ← React components (all 'use client')
  tokens.ts              ← Liquid Glass design tokens + CSS string
  SpectrumCanvas.tsx     ← shared SVG renderer (all 5 analysis canvases)
  data.ts                ← Supabase queries + seed fallback + lane builders
  CommandOverview.tsx    ← Frame 01
  ThreatLibrary.tsx      ← Frame 02
  PlatformDetail.tsx     ← Frame 03
  EngagementPlanner.tsx  ← Frame 04  (+ Frame 09 canvas)
  SpectrumWorkspace.tsx  ← Frame 05  (multi-canvas shell; Frames 06-08)
  EvolutionArc.tsx       ← Frame 10
  OutcomePanel.tsx       ← engagement verdict UI (Frames 04 & 09)

components/ui/primitives.tsx   ← GlassCard, StatPuck, SideBadge, FootprintStrip…

data/                    ← seed (also the offline source of truth)
  seed-platforms.ts      ← 25 platforms (14 Red + 11 Blue)
  seed-capabilities.ts   ← curated band signatures
  seed-variants.ts       ← Shahed-136 Gen 0–4 (evolution arc)

supabase/migrations/
  0001_spectrum_intelligence.sql   ← schema + RLS + view
  0002_seed.sql                    ← INSERTs (regen with gen-seed-sql.ts)

app/spectrum/page.tsx    ← the app shell + rail nav (entry point)
```

## Install steps (Cursor)

1. **Copy files** into the repo, preserving the tree above. Adjust the relative
   imports if your alias differs (everything currently imports by relative path;
   swap to `@/lib/...` / `@/components/...` to match the project).

2. **Run the migrations** against Supabase:
   ```
   supabase migration up        # or run both .sql files via the SQL editor
   ```
   `0001` builds the schema; `0002` seeds 25 platforms, 5 variants, 99 capabilities.
   To regenerate the seed after editing the TS data: `npx tsx gen-seed-sql.ts`.

3. **Wire the Supabase client.** In `components/spectrum/data.ts`, uncomment the
   Supabase block in `usePlatforms()` and point `createClient` at the existing
   `@/lib/supabase/client`. Until then the module runs entirely off the bundled
   seed (with the fallback generator), so the UI works before the DB is seeded.

4. **Fonts.** Ensure Space Grotesk, Inter, and JetBrains Mono are loaded (already
   in the design system). The CSS variables are injected by `SPECTRUM_CSS` in the
   page shell; if you have a global stylesheet, move them there instead.

5. **Route.** `app/spectrum/page.tsx` is a complete page. Add a nav entry, or
   mount individual components (e.g. `<SpectrumWorkspace/>`) wherever you like.

## Schema notes

- `platforms` keeps the legacy quick-reference fields (`c2_uplink_mhz`,
  `gnss_used`, `satcom_band`, …). When a platform has no curated
  `spectrum_capabilities` rows, `fallback.ts` synthesises provisional bands from
  these and tags them `derived: true` — the canvas renders them dashed / low-opacity.
- `spectrum_capabilities` stores frequency in **Hz** and wavelength in **µm**.
  A row must have either a freq span or a wavelength span (`has_extent` check).
- RLS: read = authenticated, write = service_role. Adjust to your policy model.
- `v_platform_summary` uses `security_invoker = true` (matches the project's
  existing RLS-view convention).

## The engine (testable, no UI)

`assessEngagement(red, blue)` returns a verdict:
`defeat_likely | partial | no_engagement | detect_only`, plus band overlaps,
uncovered dependencies, and recommendations.

Verdicts weight `defeat_resistance` and `gnss_denied_capable` — not just
geometric overlap — so a hardened threat (CRPA antenna, AI terminal guidance)
correctly returns `partial` even when bands overlap. Run `npx tsx _test.ts` to
see the acceptance cases:

- DJI Mavic 3 vs DroneGun Tactical → **defeat_likely**
- Fibre-Optic FPV vs DroneGun Tactical → **no_engagement** (recommends HPM)
- Fibre-Optic FPV vs Epirus Leonidas (HPM) → **defeat_likely**
- Shahed-136 vs DroneGun → **partial** ("completes the attack autonomously")
- Anduril Sentry (detect-only) vs Mavic → **detect_only**

## Physics-segregated canvases

Each canvas mounts one axis via `getAxisConfig(axis)`:
- `rf` — 3 MHz → 40 GHz (frequency, log)
- `gnss` — 1.1 → 1.7 GHz (L-band detail, log)
- `eo_ir` — 0.2 → 14 µm (wavelength)
- `cbrn` — X-ray → gamma (wavelength; payload detection only)

The same `SpectrumCanvas` renders all of them; only the axis config and the
lane grouping change. Widen any domain without a rewrite.

## Data confidence

All figures are open-source band centres/ranges from published specs and open
reporting, suitable for training. Each platform carries a `confidence` flag
(`curated | derived | estimated`). Verify against current intelligence before
any operational use.

---

## Phase 2 — Radar layer + AeroCopilot (added)

### Radar EW spectrum (the "another spectrum for radar")
- **`lib/spectrum/radar-types.ts`** — `RadarSystem` model: IEEE 521-2002 bands, actual Hz span, mobility, detection envelope (`can_detect`/`cannot_detect`), ECCM, strengths/limitations, confidence flag. `RADAR_BAND_HZ` is the canonical band→frequency map. `radarToCapability()` projects a radar onto the spectrum canvas.
- **`data/seed-radars-red.ts` / `seed-radars-blue.ts` / `seed-radars-extra.ts`** — **52 radar systems** across all four mission types (Red SAM engagement, Blue C-UAS/C-RAM, early-warning both sides, ground/naval/airborne AESA). Sourced from open material (radartutorial.eu, CSIS Missile Threat, Army Recognition, manufacturer pages, IEEE 521-2002). Each carries band, range, mobility, detect/can't-detect, and an honest `confidence` flag (`curated` vs `estimated`).
- **`components/spectrum/radar-data.ts`** — `useRadars()` / `useRadar()` hooks (seed now; Supabase `radar_systems` table path documented), `radarLanesByBand()`.
- **`components/spectrum/RadarSpectrum.tsx`** — dedicated radar EW canvas: every radar plotted by frequency span across HF→Ka, Blue above / Red below the axis, greedy row-packing, role filter, hover intel card (band · range · mobility · detection envelope). New **Radar** tab in the rail.

### AeroCopilot (Level-4 assistant)
- **`lib/spectrum/aerocopilot.ts`** — the offline reasoning engine. `askCopilot(query, ctx)` returns `{ answer, reasoning[], action, refs[], followups[] }`. Intents: **placement** (→ map + staged laydown), **what-can-I-use** (→ library + survivable highlights), **what-if / compare** (→ engagement pre-selected), **counter** (ranks effectors), **explain-radar** (→ spectrum), **threat-assess**, fallback. The `action` drives app navigation and pre-selection.
- **`lib/spectrum/aerocopilot-llm.ts`** — the Claude API path, documented for Cursor: `AEROCOPILOT_SYSTEM` prompt (grounds in data, emits the same action JSON, upholds the teaching truths), `buildCopilotUserMessage()` (compact data digest), and an example `app/api/aerocopilot/route.ts` Route Handler using `claude-sonnet-4-20250514`. Same `CopilotResponse` shape → identical UI whether offline or API-backed. Falls back to offline on fetch failure.
- **`components/spectrum/AeroCopilotDock.tsx`** — the **persistent bottom dock**, mounted on every screen. Type a question → answer + reasoning + follow-up chips; fires `onAction` to navigate and highlight. Collapsible transcript, suggestion chips, thinking indicator.

### Map
- The shell adds a **`map`** page (`MapPlaceholder`) that AeroCopilot navigates to for placement, receiving the staged laydown as `highlightIds`. **CesiumJS integration is documented inline**: drop a draggable marker per system with a range ring from `instrumented_range_km`; overlapping rings reveal coverage and gaps. Wire to the existing A3DM Cesium map.

### Skill
- **`skills/military-radar-operator/SKILL.md`** — reusable radar-operator skill: the band ladder + trade-off law, counter-stealth physics, detection-envelope reasoning, mobility/survivability, placement doctrine, Red-vs-Blue identification heuristics, sourcing/honesty rules, and how to extend the dataset.

### Tests
- **`_test_radar.ts`** — 17 checks: radar dataset integrity (52 systems, band ranges, detect classes, S-400=S-band, TPY-2=X/long-range, counter-UAS + VHF counter-stealth present) and AeroCopilot intents (placement→map, what-can-I-use→library, what-if→preselected engagement, counter-fibre-optic→HPM, explain-radar→spectrum, fallback). All pass; original `_test.ts` still 26/26. Full `tsc --noEmit` clean.

Run: `npx tsx _test.ts && npx tsx _test_radar.ts`

---

## Phase 3 — F3 effector / interceptor layer (added)

The Find–Fix–Finish kill chain. SPECTRA now models shooters (SAMs, guns, HPM, lasers, interceptor drones) and their engagement geometry, for both sides, with the math the planner needs to "plan around the polygon."

### Data model
- **`lib/spectrum/effector-types.ts`** — `EffectorSystem`: tier, effect type (kinetic missile/gun, HPM, laser, interceptor drone), full `EngagementEnvelope` (min/max range, min/max **altitude band**, **no-escape zone**, azimuth), Pk, magazine (∞ for DE), reload, cost-per-shot, `defeats`/`cannot_defeat`, `cueing_radar_ids` (links FIND→FINISH), mobility, `arm_sead_vulnerability`, `emcon`, and `can_evade` (the evade side). **Static now, dynamic-ready**: `intercept_speed_mach`/`reload_min` carry the time fields a future sim needs (seams marked `// DYNAMIC-SIM`). Plus geometry helpers: `haversineKm`, `bearingDeg`, `pointInEnvelope`, `buildEnvelopeRing`, `ringsEngaging` — the Cesium hand-off math, no map dependency.
- **`data/seed-effectors-blue.ts` / `seed-effectors-red.ts`** — 24 effectors across all tiers (strategic BMD → long → medium → SHORAD → point defence → CIWS → C-UAS/DE). Blue: Leonidas HPM, Iron Beam, DragonFire, Coyote, Phalanx C-RAM, NASAMS, IRIS-T, David's Sling, Iron Dome, Patriot PAC-3, THAAD, Aegis SM-3/6, Arrow 3. Red: S-400 (40N6/48N6/9M96), S-500, Pantsir, Tor, Buk, HQ-9, plus Shahed/Lancet survivability profiles. Sourced from CSIS Missile Threat, manufacturer pages, defence press; confidence-flagged.

### Engine
- **`lib/spectrum/killchain.ts`** — the static F3 reasoning core: `canEngage` (can this effector kill this class, with cost-exchange logic — a $4M interceptor on a $50k drone is flagged `marginal`), `effectorsAgainst` (ranked defeat options), `killChainStatus` (Find/Fix/Finish completeness + which link is broken), and `analyzeRoute`/`summarizeRoute` (walk an ingress route, report coverage % and the longest gap — the seam). Verified: a low ingress slips under a high-altitude-only THAAD (0% covered), and adding a SHORAD layer closes it to 100%.

### AeroCopilot
- Now reasons across the kill chain. New **killchain** intent ("what's the kill chain on X" → Find/Fix/Finish walk). The **counter** intent uses the effector engine — "how do I defeat a Shahed-136" returns the cost-effective DE options (Leonidas, Iron Beam) staged to the map, not a $4M interceptor. Effectors flow into both the offline engine and the Claude API digest.

### UI
- **`components/spectrum/EffectorMatrix.tsx`** + **`effector-data.ts`** — the **Effectors** rail tab: layered IADS by tier, Red/Blue toggle, each card showing the engagement envelope (range/altitude/NEZ), effect type, Pk, magazine, cost-per-shot, and ARM-vulnerability. "Stage N → Map" hands a laydown to the map view.
- **Map** view renames to **Engagement Geometry** and documents the full CesiumJS hand-off inline: render each effector as a 3D envelope (range ring + altitude band + no-escape zone), each radar as a detection volume, and colour an ingress route by coverage via `analyzeRoute`.

### Tests
- **`_test_effector.ts`** (17) — effector dataset integrity, `canEngage` doctrine (HPM defeats fibre-optic, Patriot/THAAD can't waste on small drones), ranked defeat, kill-chain completeness, and the geometry (point-in-envelope, low-route-slips-under-THAAD, SHORAD-closes-the-gap). **`_test_f3.ts`** (5) — AeroCopilot F3 integration. Original suites still green (26 + 17).

Run all: `for t in _test _test_radar _test_effector _test_f3; do npx tsx $t.ts; done` — **65/65 pass, `tsc --noEmit` clean.**

### Deferred (clean seams)
1. **Dynamic engagement sim** — time-step a drone route, react turn-by-turn, resolve intercept. Data model ready (`intercept_speed_mach`, `reload_min`).
2. **Cesium envelope rendering** — wire `buildEnvelopeRing` output to Map Intel entities (rings/domes/altitude bands) and route-coverage colouring.
3. **Supabase reconciliation** — extend existing tables; add `radar_systems` + `effector_systems`. Map, don't duplicate.
