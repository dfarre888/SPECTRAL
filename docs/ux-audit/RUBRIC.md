# SPECTRAL UX Audit Rubric — Phase 1

**Classification:** UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY  
**Audit date:** 2026-07-17  
**Auditor role:** Senior product design director (defence-grade SaaS)  
**Phase 2 target:** Weighted total ≥ 92 per page on priority routes

---

## Scoring dimensions (0–100 each)

| # | Dimension | Weight | What “100” looks like |
|---|-----------|--------|------------------------|
| 1 | Enterprise gravitas | 15% | Palantir/Anduril briefing-room tone — classification visible, operational lexicon, no consumer SaaS vibes |
| 2 | Anti-AI-slop | 12% | Zero template drift; every surface feels authored for drone threat analysis |
| 3 | Information hierarchy | 12% | Commander reads primary effect in ≤10 s; secondary detail available on demand |
| 4 | Typography & data | 10% | JetBrains Mono on all quantitative fields; Space Grotesk on display; Inter on prose |
| 5 | Color & token discipline | 8% | `--store-*` tokens only; orange primary, cyan data, purple EW-only |
| 6 | Spatial rhythm | 8% | 8 px grid; consistent panel padding; no orphan whitespace |
| 7 | Interaction & feedback | 10% | Five-state controls; loading skeletons; error surfaces with recovery |
| 8 | Navigation & wayfinding | 8% | Sidebar + breadcrumbs + cross-links; no dead routes |
| 9 | Module cohesion | 7% | Shared `HubPageShell` / `store-panel` patterns across modules |
| 10 | Accessibility | 5% | Landmarks, labels, focus rings, 4.5:1 contrast, 44 px targets |
| 11 | Performance perception | 5% | Clean console; fast first paint; no spinner-only dead ends |

**Weighted total** = Σ (score × weight ÷ 100)

---

## Grade bands

| Band | Score | Buyer read |
|------|-------|------------|
| **A — Briefing ready** | 92–100 | Palantir-tier; ship to Boeing/Thales eval |
| **B — Strong with gaps** | 82–91 | Credible; polish pass before enterprise POC |
| **C — Training viable** | 72–81 | Usable for Milskil cohort; not procurement-grade |
| **D — Stub / risk** | 60–71 | Placeholder UX; blocks paid tier |
| **F — Broken** | 0–59 | 404, runtime errors, or empty shell |

---

## Anti-AI-slop checklist

Flag each hit as **HIT** or **PASS** per page.

| # | Pattern | Detection hint |
|---|---------|----------------|
| 1 | Default shadcn `Card` without `store-panel` | `components/ui/card.tsx` import without `StorePanel` / `store-panel` class |
| 2 | Purple/blue accent off-brand | `text-purple`, `bg-purple`, `text-blue-*` on chrome (not EW indicators) |
| 3 | Hero with no operational data | Marketing headline only; no counts, status, or intel date |
| 4 | Inconsistent border-radius | Mix of `rounded-lg`, `rounded-xl`, `rounded-2xl` on same module tier |
| 5 | Non-mono numeric data | km, MHz, %, coordinates without `font-mono` |
| 6 | Icon buttons without `aria-label` | Bell/settings/compare icons |
| 7 | Generic welcome copy | “Welcome”, “Get started”, vendor fluff |
| 8 | Equal card grids without priority | 3+ identical-weight cards when one action is primary |
| 9 | Light-mode leaks in dark shell | `bg-white`, `text-gray-900`, un-prefixed slate in dark routes |
| 10 | Spinner-only loading | Indefinite spinner with no skeleton or status text |

---

## Competitor benchmarks (emulation targets)

| Competitor | Emulate | Avoid |
|------------|---------|-------|
| **Palantir Gotham** | Object-centric panels, time slider, provenance chips | Empty graph nodes |
| **Anduril Lattice** | Live COP + tasking rail; force-colour discipline | Generic map pins |
| **Jane's / IHS** | Spec tables, confidence language, source dates | Marketing superlatives |
| **DroneShield / Dedrone** | C-UAS alert density, sensor status | Consumer drone-shop UI |

---

## Evidence requirements (Phase 1)

Per audited route:

- Screenshot 1440×900 (`docs/ux-audit/screenshots/{slug}-1440x900.png`)
- Screenshot 390×844 where applicable (`{slug}-390x844.png`)
- Console error count (`docs/ux-audit/capture-results.json`)
- Failed network requests (same JSON)
- Component/file hints from DOM + codebase grep
- Top 3 competitor references to emulate (per page, in rollup)

---

## Phase 2 exit criteria

- Overall platform average ≥ **82** (currently ~**77**)
- Zero **F-band** routes on core module nav
- All **P0** items closed (see `PHASE1-ROLLUP.md`)
- Mobile: sidebar collapses; no content truncation at 390 px
- Purple restricted to EW/AI affordances per `10-a3dm-design-reference.mdc`
