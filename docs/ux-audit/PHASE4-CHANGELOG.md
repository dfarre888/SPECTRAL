# SPECTRAL UI/UX — Phase 4 Changelog

**Date:** 2026-07-17  
**Target:** All certified routes ≥92/100 weighted ([RUBRIC.md](./RUBRIC.md) A-band)  
**Baseline:** Phase 3 avg 91.4 · Phase 4 avg **93.3**

---

## Agent A — Hydration + Shell (Sprint 0)

| Item | Change |
|------|--------|
| Root cause | `FullBleedLayout.tsx` mixed `server-only` queries with client `AppChrome` — broke React context graph |
| Fix | Extended `MainShell` with `fullBleed` / `moduleLabel`; async layouts in `app/map/layout.tsx` + `app/spectrum/layout.tsx` |
| Deleted | `FullBleedLayout.tsx`, `FullBleedShell.tsx` |
| Result | Zero `useContext` pageerrors on `/`, `/map`, and all main routes |

See [phase4/agent-a-hydration.md](./phase4/agent-a-hydration.md).

---

## Agent B — Token Sweep + Dossiers (Sprint 2 + 3)

| Item | Change |
|------|--------|
| Zinc violations | 59 → **0** across `app/` + `components/` |
| Platform dossier | `PlatformSpecSheet` rebuilt — sections, sticky nav, `SpecRow` + `ConfidenceBadge`, date of information |
| Seed fallback | `lib/platforms/seed-fallback.ts` — `intel_update_date: 2026-07-01` |
| Files | 17 token-sweep + 3 dossier (20 total) |

See [phase4/agent-b-tokens-dossiers.md](./phase4/agent-b-tokens-dossiers.md).

---

## Synthesis Agent — Sprint 1 + 4 + Capture

### Sprint 1 — Re-audit lifts (routes formerly ~90)

| Route | Change |
|-------|--------|
| `/currency` | `HubPageShell` + date-of-information header |
| `/pcm` | `rounded-xl` panels; Jul 2026 intel date; guided CTA retained |
| `/planner` | Header meta with vignette count + date |
| `/conflicts` | Date-of-information headerAction |
| `/operations/import` | Date-of-information headerAction |
| `/platforms` | Intel date bumped to Jul 2026 |
| `/` | Threat-priority module order (Defeat → GNSS → Conflicts → COP → Arena …); `tabular-nums` on sidebar KPIs |
| `ModuleCard` | `rounded-xl`; mono tabular count typography |

### Sprint 4 — Flagship depth

| Route | Change |
|-------|--------|
| `/defeat` | Arrow-key / Home / End cell navigation in virtualised `DefeatMatrixTable`; `role="grid"` + focus ring |
| `/arena` | Third OSINT vignette: *Bakhmut FPV Corridor — Lancet vs Armour* in `lib/wopr/training-scenarios.ts` |
| `/map` | `CesiumMapPanel` — terrain epoch parent callback deferred to `useEffect` (eliminates setState-during-render warning) |
| `/platforms/[id]` | Inherited Agent B dossier rebuild |

### Playwright capture

| Item | Detail |
|------|--------|
| Script | `docs/ux-audit/_capture-phase4.mjs` |
| npm | `ux:capture:phase4` |
| Output | `docs/ux-audit/phase4/` — 24 routes, desktop + mobile where applicable |
| Compare URL | `/compare?a=shahed-136&b=mq-9-reaper` |
| Heavy routes | `domcontentloaded` + 90s timeout (arena, map, pcm-exercise, spectrum, conflict, compare) |
| Result | **Exit 0 · 0 pageerror** |

---

## Verification

| Check | Result |
|-------|--------|
| `npm run ux:capture:phase4` | ✅ 24/24 routes, 0 pageerror |
| `npm run type-check` | ✅ Pass except pre-existing `data/seed-platforms.ts` confidence type |
| Lint (edited files) | ✅ No new diagnostics |
| Classification banner | ✅ Unchanged on all routes |
| Cesium `ssr:false` | ✅ Unchanged |

---

## Files changed (Phase 4 synthesis only)

```
docs/ux-audit/_capture-phase4.mjs
docs/ux-audit/PHASE4-SCORECARD.md
docs/ux-audit/PHASE4-CHANGELOG.md
docs/ux-audit/phase4/capture-results.json
docs/ux-audit/phase4/*.png
package.json
components/dashboard/DashboardModuleCatalog.tsx
components/catalog/ModuleCard.tsx
components/defeat/DefeatMatrixTable.tsx
components/defeat/MatrixCell.tsx
components/defeat/DefeatMatrix.tsx
components/platforms/PlatformLibrary.tsx
app/map/CesiumMapPanel.tsx
app/(main)/currency/page.tsx
app/(main)/pcm/page.tsx
app/(main)/planner/page.tsx
app/(main)/conflicts/page.tsx
app/(main)/operations/import/page.tsx
lib/wopr/training-scenarios.ts
```

---

## Scorecard

[PHASE4-SCORECARD.md](./PHASE4-SCORECARD.md) — platform average **93.3**, all routes ≥92.
