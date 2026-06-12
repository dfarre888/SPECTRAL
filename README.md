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
