# SPECTRA — Spectrum Intelligence Handoff

Production EW / spectrum-intelligence module for SPECTRAL. Full-bleed at `/spectrum`.
OSINT-only, ITAR-compliant. Close-hold — Allied/friendly training use.

**Status:** Phase 1 engagement (5/5). Phase 2 radar (52 systems) + AeroCopilot. Phase 3 F3 effectors (24 systems) + kill-chain engine. Seed-first — Supabase migrations deferred.

---

## What's here

```
lib/spectrum/            ← framework-agnostic engine (no React)
  types.ts, scale.ts, engagement.ts, fallback.ts
  radar-types.ts         ← RadarSystem, radarToCapability()
  effector-types.ts      ← EffectorSystem, EngagementEnvelope, geometry helpers
  killchain.ts           ← canEngage, effectorsAgainst, killChainStatus, analyzeRoute
  aerocopilot.ts         ← offline askCopilot() + killchain intent
  aerocopilot-llm.ts     ← AEROCOPILOT_SYSTEM + digest (platforms, radars, effectors)
  map-staging.ts         ← sessionStorage handoff to /map Map Intel
  _test.ts               ← 5 engagement acceptance cases
  _test_radar.ts         ← 17 radar + copilot checks
  _test_effector.ts      ← 17 effector + geometry checks
  _test_f3.ts            ← 5 AeroCopilot F3 integration checks

components/spectrum/
  RadarSpectrum.tsx, radar-data.ts
  EffectorMatrix.tsx, effector-data.ts
  AeroCopilotDock.tsx    ← API + offline fallback
  … (Phase 1 frames)

data/
  seed-platforms.ts, seed-capabilities.ts, seed-variants.ts
  seed-radars-{red,blue,extra}.ts   ← 52 radars
  seed-effectors-{blue,red}.ts      ← 24 effectors

app/spectrum/page.tsx
app/api/aerocopilot/route.ts
```

## Install / run

1. Files use `@/` path aliases.
2. **Seed-first:** bundled seed for platforms, radars, effectors; Supabase optional.
3. **Deferred migrations:** `docs/spectra-migrations-deferred/` — do not apply raw SQL.
4. Route: `/spectrum` full-bleed (outside `(main)`), like `/map`.

```bash
npx tsx lib/spectrum/_test.ts
npx tsx lib/spectrum/_test_radar.ts
npx tsx lib/spectrum/_test_effector.ts
npx tsx lib/spectrum/_test_f3.ts
npx tsc --noEmit
```

## Phase 1 — Engagement engine

`assessEngagement(red, blue)` → `defeat_likely | partial | no_engagement | detect_only`.

## Phase 2 — Radar + AeroCopilot

- 52 radar systems, **Radar** tab, persistent AeroCopilot dock.
- Map dual UX: MapPlaceholder + Open in Map Intel handoff.

## Phase 3 — F3 effector / kill-chain

### Data model
- **`effector-types.ts`** — `EffectorSystem`: tier, effect type (kinetic missile/gun, HPM, laser, interceptor), `EngagementEnvelope` (range/altitude/NEZ), Pk, magazine, cost-per-shot, `cueing_radar_ids`, geometry helpers (`buildEnvelopeRing`, `pointInEnvelope`, `analyzeRoute` seam).
- **`seed-effectors-blue.ts` / `seed-effectors-red.ts`** — 24 effectors (strategic BMD → SHORAD → C-UAS/DE). Confidence-flagged OSINT.

### Engine
- **`killchain.ts`** — `canEngage` (with cost-exchange logic), `effectorsAgainst`, `killChainStatus` (Find/Fix/Finish), `analyzeRoute`/`summarizeRoute` (ingress coverage gaps).

### AeroCopilot
- **killchain** intent — "what's the kill chain on X" → FIND/FIX/FINISH walk.
- **counter** intent uses effector engine — recommends cost-effective DE (Leonidas, Iron Beam) not $4M interceptors.
- API + dock pass `effectors` in context.

### UI
- **Effectors** rail tab — `EffectorMatrix.tsx`: tier layers, Red/Blue toggle, stage laydown → map.
- **Map** view — Engagement Geometry; effector envelopes + radar volumes documented for future Cesium handoff.

### Tests
- `_test_effector.ts` (17) + `_test_f3.ts` (5). Prior suites unchanged.

## Deferred

| Item | Notes |
|---|---|
| Cesium envelope rendering | Wire `buildEnvelopeRing` to Map Intel |
| Dynamic engagement sim | `intercept_speed_mach`, `reload_min` ready |
| `effector_systems` Supabase table | Reconcile with Platform Library |
| Map Intel effector placement | Staging highlights UAS/C-UAS only |
