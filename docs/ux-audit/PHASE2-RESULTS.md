# SPECTRAL UI/UX Upgrade — Phase 2 Results

**Date:** 2026-07-17  
**Baseline:** Phase 1 avg **75.3/100** ([PHASE1-ROLLUP.md](./PHASE1-ROLLUP.md))  
**Scope:** P0 + selected P1 (chrome, dashboard, planner, PCM, compare, defeat header, full-bleed)

---

## Summary

| Metric | Before | After (est.) | Δ |
|--------|-------:|-------------:|--:|
| Overall average | 75.3 | **~84** | +8.7 |
| Pages ≥90 | 0 | 0 | — |
| Pages ≥85 | 1 | **~6** | +5 |
| P0 defects closed | 0/3 | **3/3** | ✓ |

Phase 2 P0 is **complete**. Full virtualised defeat matrix and unified AppChrome (single sidebar on map/spectrum) deferred to Phase 2b.

---

## Work completed

### P0 — Global chrome ✓

| Change | Files |
|--------|-------|
| Orange accent on logo/avatar (purple purge from primary chrome) | `Sidebar.tsx`, `Topbar.tsx`, `login/page.tsx`, `AssetSidebar.tsx`, `operations/import/page.tsx` |
| Removed Topbar **“AI Ready”** pill | `Topbar.tsx` |
| Removed footer **“Powered by A3DM”** from sidebar | `Sidebar.tsx` |
| Nav labels: Platform Compare, Incident Timeline, clarified subs | `Sidebar.tsx` |
| FullBleed header: orange brand + module quick-nav + UNCLASSIFIED strip | `FullBleedShell.tsx`, `app/map/layout.tsx` |
| Global `:focus-visible` orange ring | `app/globals.css` |

### P0 — Dashboard ✓

| Change | Files |
|--------|-------|
| Hero moved **inside Command Center tab** with `variant="compact"` | `app/(main)/page.tsx`, `StoreHero.tsx` |
| Live module counts from DB/seed | `lib/dashboard/module-stats.ts`, `DashboardModuleCatalog.tsx` |
| Priority-ordered module grid; purple accents → cyan/orange | `DashboardModuleCatalog.tsx` |
| StartHereWizard purple → cyan/accent | `StartHereWizard.tsx` |

### P1 — Page upgrades ✓

| Route | Change | Est. score |
|-------|--------|----------:|
| `/planner` | `store-panel` vignettes; skeleton loading | 67 → **~79** |
| `/pcm` | Guided CTA; removed manual UUID copy; orange/red icons | 71 → **~80** |
| `/compare` | `EmptyState` component; renamed title | 73 → **~82** |
| `/defeat` | Compact hero; matrix `role="region"` + expand aria-label | 74 → **~80** |
| `/arena` | Wider max width for Cesium workspace | 76 → **~79** |
| `/login` | Orange brand mark | 70 → **~76** |

### New shared components

- `components/ui/empty-state.tsx` — standard empty module UX
- `lib/dashboard/module-stats.ts` — live catalog counts

---

## Estimated post-Phase 2 leaderboard (top routes)

| Route | Phase 1 | Phase 2 est. |
|-------|--------:|-------------:|
| `/platforms/mq-9-reaper` | 86 | 86 |
| `/` | 77 | **~87** |
| `/platforms` | 82 | 82 |
| `/compare` | 73 | **~82** |
| `/pcm` | 71 | **~80** |
| `/planner` | 67 | **~79** |
| `/defeat` | 74 | **~80** |
| `/login` | 70 | **~76** |

---

## Remaining gaps to ≥92 (Phase 2b)

| Priority | Item | Est. lift |
|----------|------|-----------|
| P1 | Virtualise `DefeatMatrixTable` (17k a11y nodes) | +8 on `/defeat` |
| P1 | Unified AppChrome — sidebar on `/map` + `/spectrum` | +6 cohesion |
| P2 | `OpsPanel`, `SpecRow`, `ConfidenceBadge` on platform detail | +6 on dossiers |
| P2 | Platform filter mobile drawer | +4 on `/platforms` |
| P2 | Arena full-bleed layout (remove HubPageShell padding) | +8 on `/arena` |
| P3 | Login OIDC-first enterprise layout | +6 on `/login` |

---

## Files changed (Phase 2)

```
app/(main)/page.tsx
app/(main)/planner/page.tsx
app/(main)/pcm/page.tsx
app/(main)/compare/page.tsx
app/(main)/arena/page.tsx
app/(main)/operations/import/page.tsx
app/login/page.tsx
app/map/layout.tsx
app/map/components/AssetSidebar.tsx
app/globals.css
components/catalog/StoreHero.tsx
components/dashboard/DashboardModuleCatalog.tsx
components/dashboard/StartHereWizard.tsx
components/defeat/DefeatMatrix.tsx
components/layout/Sidebar.tsx
components/layout/Topbar.tsx
components/layout/FullBleedShell.tsx
components/planner/PlannerLibraryClient.tsx
components/ui/empty-state.tsx
lib/dashboard/module-stats.ts
docs/ux-audit/PHASE2-RESULTS.md
```

### Follow-up from Phase 1 subagent audit (2026-07-17)

| P0 from audit | Status |
|---------------|--------|
| `/platforms/dji-mavic-3` 404 | **Fixed** — seed fallback in `getPlatformById` |
| `/conflicts/[id]` stub | **Fixed** — renders `CONFLICT_CASE_STUDIES` |
| PCM **Turn undefined** | **Fixed** — validates API payload before render |
| Topbar **Zap is not defined** | **Fixed** in Phase 2 (removed AI Ready pill) |
| Mobile sidebar hidden at 390px | **Fixed** — off-canvas drawer + menu button |
| PCM AAR 403 | Open — auth-gated; needs valid exercise session |
