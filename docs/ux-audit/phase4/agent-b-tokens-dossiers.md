# Phase 4 — Agent B: Token Sweep + Platform Dossiers

**Scope:** Sprint 2 (global token sweep) + Sprint 3 (platform dossiers)  
**Date:** July 2026  
**Excluded:** AppChrome, FullBleedLayout, MobileNavContext, layout shell files (Agent A)

---

## Sprint 2 — Global Token Sweep

### Violation count

| Metric | Count |
|--------|------:|
| **Before** (`rg "text-zinc-\|bg-zinc-\|border-zinc-\|bg-black/30" app components --glob "*.tsx"`) | **59** |
| **After** | **0** |

### Replacement rules applied

| Legacy token | Replacement |
|---|---|
| `text-zinc-400/500/600/700/800` | `store-text-muted` |
| `text-zinc-100/200/300` | `store-text-body` or `text-white` (headings) |
| `bg-zinc-*` | `bg-[var(--store-surface-2)]` |
| `border-zinc-*` | `border-[var(--store-line)]` |
| `bg-black/30` (panel wells) | `store-panel-inner` or `bg-[var(--store-surface-2)]` |

Per `.cursor/rules/12-ux-premium.mdc`.

### Files changed (token sweep)

| Module | File |
|---|---|
| GNSS | `components/gnss/ConstellationStatusPanel.tsx` |
| GNSS | `components/gnss/GnssVulnerabilityMatrix.tsx` |
| GNSS | `components/gnss/GnssIntelClient.tsx` |
| GNSS | `components/gnss/JammingIncidentsPanel.tsx` |
| Map | `app/map/MapIntelView.tsx` |
| Map | `app/map/components/IadsStackPanel.tsx` |
| Map | `app/map/components/EncounterAssessmentPanel.tsx` |
| Map | `app/map/components/FlightDetailsPanel.tsx` |
| Map | `app/map/components/CollateralRiskPanel.tsx` |
| Map | `app/map/components/RoutePlanner.tsx` |
| Map | `app/map/components/EwFootprintAnalyser.tsx` |
| Planner | `components/planner/PlanLoadDialog.tsx` |
| Planner | `components/planner/PlannerToolbar.tsx` |
| Planner | `components/planner/SalvoSimulator.tsx` |
| Planner | `components/planner/EngagementEconomicsPanel.tsx` |
| Planner | `components/planner/ExchangeRatioTable.tsx` |
| PCM | `components/pcm/AdjudicationProvenancePanel.tsx` |

**17 files** in the token sweep. Conflicts, compare, and main app routes had no remaining violations.

---

## Sprint 3 — Platform Dossiers

### Changes

`PlatformSpecSheet` rebuilt as a Jane's-style platform dossier:

1. **Sectioned layout** — Overview, Performance, Sensors, EW, Defeat, Sources
2. **Sticky in-panel nav** — anchor links (`#dossier-overview` … `#dossier-sources`) pinned under the dossier header
3. **SpecRow + ConfidenceBadge** — every quantitative field (numeric values, frequencies, costs) renders `ConfidenceBadge` from platform `data_confidence`
4. **Date of information** — `Date of information: [Month Year]` derived from `intel_update_date` → `updated_at` → current month fallback
5. **Data typography** — `font-mono tabular-nums` on all quantitative values via `SpecRow` (`mono={true}` when value contains digits or `$`)
6. **Seed fallback** — `lib/platforms/seed-fallback.ts` sets `intel_update_date: '2026-07-01'` so `/platforms/dji-mavic-3` shows full dossier with defeat note, EW bands, and Confirmed confidence (curated → high)

### Supporting changes

| File | Change |
|---|---|
| `components/ui/spec-row.tsx` | Added optional `confidence` prop; renders inline `ConfidenceBadge` |
| `components/platforms/PlatformSpecSheet.tsx` | Full dossier rewrite with sections + sticky nav |
| `lib/platforms/seed-fallback.ts` | `intel_update_date` for seed platforms |

### Seed platform verification

`/platforms/dji-mavic-3` resolves via `getPlatformById()` → `getSeedPlatformById()` when absent from Supabase. Dossier sections populate from OSINT seed row:

- **Performance:** 75 km/h, 6000 m ceiling, 15 km range, 0.9 kg MTOW
- **EW:** O3 Enterprise control link, multi-GNSS
- **Defeat:** RF jamming + GNSS spoofing assessment from `defeat_note`
- **Sources:** `intel_note` array + July 2026 date line

---

## Files changed (total)

**20 files** (17 token sweep + 3 dossier):

```
components/gnss/ConstellationStatusPanel.tsx
components/gnss/GnssVulnerabilityMatrix.tsx
components/gnss/GnssIntelClient.tsx
components/gnss/JammingIncidentsPanel.tsx
app/map/MapIntelView.tsx
app/map/components/IadsStackPanel.tsx
app/map/components/EncounterAssessmentPanel.tsx
app/map/components/FlightDetailsPanel.tsx
app/map/components/CollateralRiskPanel.tsx
app/map/components/RoutePlanner.tsx
app/map/components/EwFootprintAnalyser.tsx
components/planner/PlanLoadDialog.tsx
components/planner/PlannerToolbar.tsx
components/planner/SalvoSimulator.tsx
components/planner/EngagementEconomicsPanel.tsx
components/planner/ExchangeRatioTable.tsx
components/pcm/AdjudicationProvenancePanel.tsx
components/ui/spec-row.tsx
components/platforms/PlatformSpecSheet.tsx
lib/platforms/seed-fallback.ts
docs/ux-audit/phase4/agent-b-tokens-dossiers.md
```
