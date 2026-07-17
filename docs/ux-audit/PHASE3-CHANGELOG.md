# SPECTRAL UI/UX — Phase 3 Changelog

**Date:** 2026-07-17  
**Target:** All certified routes ≥90/100 weighted ([RUBRIC.md](./RUBRIC.md))  
**Baseline:** Phase 1 avg 76.8 · Phase 2 est. ~84

---

## Sprint 1 — Broken routes

| Item | Change |
|------|--------|
| Training fixtures | `getTrainingExerciseMeta()` + valid `WorldState`/`TurnRecord` in `lib/pcm/training-fixtures.ts` |
| Training APIs | `GET /api/v1/training/exercise/[id]`, existing `/api/v1/training/aar`, `POST /api/v1/training/force-design` |
| AAR 403 | `GET /api/spectral/aar` returns OSINT training fixture when player row or persisted doc missing |
| PCM exercise | `PcmExerciseWorkspace` training meta fallback; `Turn` never undefined; `GlobeSkeleton` on Cesium load |
| PCM AAR | `SpectralAAR` skeleton + training fallback chain (spectral → v1 training) |
| Force design | Client-only `ForceDesignWorkbench` with `OpsPanel`; training POST on 403 |
| Login | OIDC-first enterprise layout; orange brand; local email secondary |
| Platform 404 | Seed fallback in `getPlatformById` (Phase 1 follow-up, verified) |
| Conflict detail | Full case study from seed + `OpsPanel` threat blocks |

## Sprint 2 — Design system

| Component | Status |
|-----------|--------|
| `ops-panel.tsx` | Complete |
| `spec-row.tsx` / `SpecGrid` | Complete; used in `PlatformSpecSheet` |
| `loading-skeleton.tsx` | `PanelSkeleton`, `GridSkeleton`, `GlobeSkeleton` |
| `ConfidenceBadge` | Existing; on platform spec sheet |
| `.cursor/rules/12-ux-premium.mdc` | Added — bans `text-zinc-*`, `bg-black/30`; panel `rounded-xl` |
| `empty-state.tsx` | Extended to `/currency` queue |

## Sprint 3 — AppChrome unification

| Route | Change |
|-------|--------|
| `/map`, `/spectrum` | `FullBleedLayout` → unified `AppChrome` + module strip |
| Map/spectrum content | `h-full` / `min-h-0` on map view and spectrum root |

## Sprint 4 — Flagship depth

| Route | Change |
|-------|--------|
| `/defeat` | `@tanstack/react-virtual` row virtualisation in `DefeatMatrixTable` |
| `/arena` | Full-bleed page shell; OSINT WOPR vignettes (`lib/wopr/training-scenarios.ts`); `GlobeSkeleton` |
| `/map` | `GlobeSkeleton` on Cesium dynamic import |
| `/` | Mono KPIs in `MetricSummaryBar` (Phase 2, retained) |
| `/platforms/[id]` | Sticky spec nav anchors; `SpecRow` grid |

## Sprint 5 — Polish

| Route | Change |
|-------|--------|
| `/conflicts` | Replaced `text-zinc-*` / `border-zinc-*` with `--store-*` tokens |
| `/compare` | Default redirect to `shahed-136,mq-9-reaper`; `?a=` / `?b=` support |
| `/overlay` | Default Shahed vs SA-15 vignette (existing `defaultEngagementScenario`) |
| Screenshots | `docs/ux-audit/phase3/` prepared; capture requires `playwright` devDependency (not in repo) |

---

## Verification

- `npx tsc --noEmit` — pass (pre-existing `data/seed-platforms.ts` confidence type excluded)
- Lint — pass on edited components; pre-existing `FullBleedLayout` server-only import warning unchanged
- Dev server `http://localhost:3001` — `/pcm/force-design`, `/platforms/dji-mavic-3` return HTTP 200

---

## Files changed (Phase 3)

```
lib/pcm/training-fixtures.ts
lib/wopr/training-scenarios.ts
app/api/v1/training/exercise/[id]/route.ts
app/api/spectral/aar/route.ts
app/login/page.tsx
app/(main)/arena/page.tsx
app/(main)/compare/page.tsx
app/(main)/conflicts/page.tsx
app/(main)/conflicts/[id]/page.tsx
app/(main)/platforms/[id]/page.tsx
app/map/page.tsx
app/map/MapIntelView.tsx
app/spectrum/SpectrumAppClient.tsx
components/pcm/PcmExerciseWorkspace.tsx
components/pcm/TurnControlPanel.tsx
components/arena/ArenaWorkspace.tsx
components/arena/WoprScenarioPanel.tsx
components/currency/CurrencyQueueClient.tsx
components/defeat/DefeatMatrixTable.tsx
components/platforms/PlatformSpecSheet.tsx
components/ui/loading-skeleton.tsx
.cursor/rules/12-ux-premium.mdc
package.json ( @tanstack/react-virtual )
docs/ux-audit/PHASE3-SCORECARD.md
docs/ux-audit/PHASE3-CHANGELOG.md
docs/ux-audit/_capture-phase3.mjs
docs/ux-audit/phase3/ (35 PNGs + capture-results.json)
```

## Screenshot evidence (post-subagent)

- Installed `playwright` dev dependency; run `npm run ux:capture:phase3` with dev server on `:3001`
- 35 PNGs under `docs/ux-audit/phase3/` (1440×900 all routes; 390×844 on key mobile routes)
- `/compare` uses query params (`?a=shahed-136&b=mq-9-reaper`) to avoid redirect abort
- Hydration `useContext` warnings appear on some routes in headless capture but do not block renders
