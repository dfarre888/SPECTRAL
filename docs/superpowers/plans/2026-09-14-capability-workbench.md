# Capability Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Compare-tab capability grid with a roster / coverage / inspector workbench under a spectrum ribbon, with URL-persisted benching and link-variant-aware comms analysis.

**Architecture:** Pure models first (`link-variants`, `bench-url`, `spectrum-bands`, `coverage-model`) each with vitest coverage; then presentational components under `components/force-catalog/workbench/`; then wiring in `ForceCatalogClient` and deletion of `ForceCatalogMatrix`. The interop engine keeps its public API and learns variants internally.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript strict, vitest, Tailwind + Dark Frame tokens in `app/globals.css`, d3-force (d3 ^7.9 already installed), lucide-react.

**Spec:** `docs/superpowers/specs/2026-09-14-capability-workbench-design.md`

## Global Constraints

- Work in `~/dev/spectral`; run `npx tsc --noEmit -p .` and `npx vitest run` before every commit; copy changed files to the OneDrive tree after each commit.
- OSINT only. Never invent a band, variant, Pk or spec. Unknown stays unknown and is labelled so.
- No text under 11px. JetBrains Mono (`font-mono`) for every data value. Colour belongs to the data: blue = `--store-accent`, red = neutral grey, neutral = `--store-ink-mute`.
- Motion: quiet register, 150–250ms, ease-out; `prefers-reduced-motion` makes everything instant. No load choreography.
- Tests live beside code as `_test_<name>.test.ts`.
- Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

---

### Task 1: Link variants and variant-aware nets

**Files:**
- Create: `lib/coalition/link-variants.ts`, `lib/coalition/_test_link-variants.test.ts`
- Modify: `lib/bmi/bmi-types.ts` (CommsBearer), `lib/coalition/interop.ts` (InteropBearer, netKeyFor), `lib/coalition/catalog-adapter.ts`, `lib/coalition/_test_interop.test.ts` (append)

**Interfaces:**
- Produces: `variantGroup(standard: string | null, variant?: string | null): string | null` — returns the net-group suffix for a bearer (`null` = no split). `VARIANT_GROUPS: Record<string, { group: string; label: string; note: string }>` keyed `<standard>/<variant>`.
- Produces: `InteropBearer.variant?: string | null`; net keys become `std:<standard>` or `std:<standard>/<group>`.

- [ ] **Step 1: Failing test**

```ts
// lib/coalition/_test_link-variants.test.ts
import { describe, expect, it } from 'vitest'
import { variantGroup, VARIANT_GROUPS } from './link-variants'

describe('variantGroup', () => {
  it('returns null when variant is unknown (assume compatible)', () => {
    expect(variantGroup('link16', null)).toBeNull()
    expect(variantGroup('link16', undefined)).toBeNull()
  })
  it('groups Link 22 HF and UHF legs separately', () => {
    expect(variantGroup('link22', 'link22-hf')).toBe('hf')
    expect(variantGroup('link22', 'link22-uhf')).toBe('uhf')
  })
  it('keeps MIDS-JTRS and MIDS-LVT on one Link 16 net', () => {
    expect(variantGroup('link16', 'mids-jtrs')).toBe(variantGroup('link16', 'mids-lvt'))
  })
  it('every table entry has a note citing why it splits or not', () => {
    for (const v of Object.values(VARIANT_GROUPS)) expect(v.note.length).toBeGreaterThan(10)
  })
})
```

- [ ] **Step 2: Run** `npx vitest run lib/coalition/_test_link-variants.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
// lib/coalition/link-variants.ts
/**
 * Datalink variants. Same standard does not mean same net: a Link 22 fit with
 * only an HF leg cannot join a UHF-only Link 22 net without a relay. Groups are
 * OSINT (NILE programme documentation, MIDS programme office public material).
 */
export interface VariantGroup { group: string; label: string; note: string }

export const VARIANT_GROUPS: Record<string, VariantGroup> = {
  'link22/link22-hf':  { group: 'hf',  label: 'Link 22 HF leg',  note: 'HF (2–30 MHz) beyond-line-of-sight leg; UHF-only terminals cannot hear it.' },
  'link22/link22-uhf': { group: 'uhf', label: 'Link 22 UHF leg', note: 'UHF (225–400 MHz) line-of-sight leg; HF-only terminals cannot hear it.' },
  'link16/mids-jtrs':  { group: 'l16', label: 'MIDS-JTRS',       note: 'Same J-series net as MIDS-LVT; terminal generation does not split the net.' },
  'link16/mids-lvt':   { group: 'l16', label: 'MIDS-LVT',        note: 'Same J-series net as MIDS-JTRS; terminal generation does not split the net.' },
  'link11/link11-hf':  { group: 'hf',  label: 'Link 11 HF',      note: 'HF netted operation; UHF-only Link 11 cannot join.' },
  'link11/link11-uhf': { group: 'uhf', label: 'Link 11 UHF',     note: 'UHF netted operation; HF-only Link 11 cannot join.' },
}

/** Net-group suffix, or null when the variant is unknown or does not split the net. */
export function variantGroup(standard: string | null, variant?: string | null): string | null {
  if (!standard || !variant) return null
  const g = VARIANT_GROUPS[`${standard}/${variant}`]
  if (!g) return null
  // Only standards with more than one distinct group actually split.
  const groups = new Set(Object.entries(VARIANT_GROUPS).filter(([k]) => k.startsWith(`${standard}/`)).map(([, v]) => v.group))
  return groups.size > 1 ? g.group : null
}
```

Then in `lib/bmi/bmi-types.ts` add to `CommsBearer`: `variant?: string | null`. In `interop.ts` add `variant?: string | null` to `InteropBearer`, and in `netKeyFor` replace the coalition-wide return with:

```ts
const grp = variantGroup(spec.standard, b.variant)
return grp
  ? { key: `std:${spec.standard}/${grp}`, label: `${spec.label} · ${grp.toUpperCase()}`, scope: null }
  : { key: `std:${spec.standard}`, label: spec.label, scope: null }
```

In `buildTier` the bridge union uses `std:${br.a}`; also union `std:${br.a}/<g>` keys for every group present (loop over `nets.keys()` and union any key starting with `std:${br.a}` to `std:${br.a}` root). In `catalog-adapter.ts` pass `variant: c.variant ?? null` through.

- [ ] **Step 4: Append interop test**

```ts
it('splits Link 22 HF-only and UHF-only fits into separate islands', () => {
  const r = analyseInterop([
    { id: 'A', label: 'A', nationCode: 'AUS', bearers: [{ standard: 'link22', variant: 'link22-hf', kind: 'datalink', gatewayCapable: false, pntDependent: true, label: 'L22' }] },
    { id: 'B', label: 'B', nationCode: 'AUS', bearers: [{ standard: 'link22', variant: 'link22-uhf', kind: 'datalink', gatewayCapable: false, pntDependent: true, label: 'L22' }] },
  ])
  expect(r.track.islands.length).toBe(2)
})
```

- [ ] **Step 5: Run** all tests → PASS. **Commit:** `feat(coalition): link variants split nets`.

---

### Task 2: Bench URL codec

**Files:** Create `lib/force-catalog/bench-url.ts`, `lib/force-catalog/_test_bench-url.test.ts`.

**Interfaces:** `parseBench(param: string | null, knownIds: Set<string>): string[]`; `serialiseBench(ids: string[]): string | null` (null when empty).

- [ ] **Step 1: Test**

```ts
import { describe, expect, it } from 'vitest'
import { parseBench, serialiseBench } from './bench-url'
const known = new Set(['A', 'B', 'C'])
describe('bench url', () => {
  it('round-trips', () => { expect(parseBench(serialiseBench(['B', 'A']), known)).toEqual(['B', 'A']) })
  it('drops unknown and duplicate ids', () => { expect(parseBench('A,Z,A', known)).toEqual(['A']) })
  it('serialises empty as null', () => { expect(serialiseBench([])).toBeNull() })
  it('decodes url-encoded commas', () => { expect(parseBench('A%2CB', known)).toEqual(['A', 'B']) })
})
```

- [ ] **Step 2: Implement**

```ts
export function parseBench(param: string | null, knownIds: Set<string>): string[] {
  if (!param) return []
  const out: string[] = []
  for (const raw of decodeURIComponent(param).split(',')) {
    const id = raw.trim()
    if (id && knownIds.has(id) && !out.includes(id)) out.push(id)
  }
  return out
}
export function serialiseBench(ids: string[]): string | null {
  return ids.length ? ids.join(',') : null
}
```

- [ ] **Step 3:** tests PASS. **Commit:** `feat(force-catalog): bench url codec`.

---

### Task 3: Sensor bands, sensors_status, spectrum band model

**Files:** Modify `lib/bmi/bmi-types.ts`; create `lib/force-catalog/spectrum-bands.ts`, `_test_spectrum-bands.test.ts`.

**Interfaces:**
- `SensorBand = FreqBand | 'IR' | 'VIS' | 'NIR' | 'SWIR' | 'MWIR' | 'LWIR' | 'UV' | 'laser'`; `PlatformSensor.bands?: SensorBand[]`.
- `sensorBands(s: PlatformSensor): SensorBand[]` → `s.bands ?? (s.band ? [s.band as SensorBand] : [])`.
- `SENSING_BANDS: SensorBand[]` ordered `HF VHF UHF L S C X Ku Ka LWIR MWIR SWIR NIR VIS UV laser`.
- `sensorsStatus(p: { sensors: unknown[] }): 'listed' | 'gap'`.
- `bandFill(platforms, benched: Set<string>): { band: SensorBand; active: number; total: number }[]`.
- `commsFill(interop: InteropResult, benched: Set<string>)` is done in Task 4's coverage model, not here.

- [ ] **Step 1: Test**

```ts
import { describe, expect, it } from 'vitest'
import { SENSING_BANDS, bandFill, sensorBands, sensorsStatus } from './spectrum-bands'
const s = (band: string | null, bands?: string[]) => ({ band, bands } as any)
describe('spectrum bands', () => {
  it('falls back to band when bands is absent', () => { expect(sensorBands(s('X'))).toEqual(['X']) })
  it('prefers bands[]', () => { expect(sensorBands(s('IR', ['MWIR', 'VIS']))).toEqual(['MWIR', 'VIS']) })
  it('orders LWIR before VIS', () => { expect(SENSING_BANDS.indexOf('LWIR')).toBeLessThan(SENSING_BANDS.indexOf('VIS')) })
  it('marks empty sensors as gap', () => { expect(sensorsStatus({ sensors: [] })).toBe('gap') })
  it('drains a band when its only holder is benched', () => {
    const ps = [{ id: 'A', sensors: [s('X')] }, { id: 'B', sensors: [s('S')] }] as any
    const fill = bandFill(ps, new Set(['A']))
    expect(fill.find((f) => f.band === 'X')).toEqual({ band: 'X', active: 0, total: 1 })
  })
})
```

- [ ] **Step 2: Implement** per the interfaces above (straightforward loops; `bandFill` returns one entry per `SENSING_BANDS` member, counting distinct platforms).

- [ ] **Step 3:** PASS. **Commit:** `feat(force-catalog): sensor band vocabulary and fill model`.

---

### Task 4: Coverage model

**Files:** Create `lib/force-catalog/coverage-model.ts`, `_test_coverage-model.test.ts`.

**Interfaces:**
```ts
export type CoverageSectionKind = 'nets' | 'radar' | 'eoir' | 'esm' | 'other'
export interface CoverageRow {
  id: string; kind: CoverageSectionKind; label: string; band: string | null
  active: number; ghost: number            // ghost = count before benching
  bySide: { blue: number; red: number; neutral: number }
  holderIds: string[]                     // active holders
  lostWith: string[]                      // short_names of benched holders when active === 0 && ghost > 0
  noData: boolean                         // all candidate holders are gap platforms
  tier?: ConnTier; gateways?: number      // nets only
}
export interface CoverageSection { kind: CoverageSectionKind; label: string; rows: CoverageRow[] }
export function buildCoverage(args: {
  platforms: ForceCatalogPlatformFull[]; benched: Set<string>; sort: 'coverage' | 'rarest' | 'az'
}): { sections: CoverageSection[]; activeCount: number; benchedCount: number; coveragePct: number }
```
Nets come from `analyseInterop(toInteropPlatforms(activePlatforms))` for `active`, and from the un-benched set for `ghost`. Radar/EO-IR/ESM rows come from `sensorBands` grouped by `kind`; `other` rows come from `buildMatrixView` comms rows that are not datalinks (voice bearers) plus any capability not already covered.

- [ ] **Step 1: Test** (fixtures: three platforms; A blue with Link 16 + X radar; B red with Link 16; C blue with no sensors)

```ts
it('ghosts the pre-bench count and lists what was lost', () => {
  const r = buildCoverage({ platforms: [A, B, C], benched: new Set(['A']), sort: 'coverage' })
  const x = r.sections.find((s) => s.kind === 'radar')!.rows.find((row) => row.band === 'X')!
  expect(x).toMatchObject({ active: 0, ghost: 1, lostWith: ['A'] })
})
it('marks rows held only by gap platforms as noData', () => { /* C has sensors: [] → radar rows for C do not exist; assert a net row is not noData and C appears in gap count */ })
it('segments bars by side', () => {
  const r = buildCoverage({ platforms: [A, B, C], benched: new Set(), sort: 'coverage' })
  const l16 = r.sections[0].rows.find((row) => row.id === 'std:link16')!
  expect(l16.bySide).toEqual({ blue: 1, red: 1, neutral: 0 })
})
```

- [ ] **Step 2: Implement**, then **Step 3:** PASS. **Commit:** `feat(force-catalog): coverage model`.

---

### Task 5: Spectrum ribbon component

**Files:** Create `components/force-catalog/workbench/SpectrumRibbon.tsx`; append CSS to `app/globals.css`.

**Interfaces:** `<SpectrumRibbon comms={{key,label,spans,active,total}[]} sensing={{band,active,total}[]} focusBand={string|null} onHoverBand={(b|null)=>void} onToggleBand={(b)=>void} />`. Comms lane: an SVG 100%×36 with log-x from 2 MHz to 40 GHz (`x = log10(mhz/2)/log10(20000)`); each span a `<rect>` with height = 36·active/total (min 2px when total>0), `fill=var(--store-accent)` opacity 0.85, ghosted `stroke=var(--store-line)` full-height outline. Sensing lane: flex row of 16 equal cells, each a bar with the same fill rule; label under each in `text-[11px] font-mono`. `data-band-state` from `lib/ui/band-focus.ts` for focus/dim.

- [ ] Build, `npx tsc --noEmit`, screenshot via Playwright at 1440px, commit `feat(workbench): spectrum ribbon`.

---

### Task 6: Roster component

**Files:** Create `components/force-catalog/workbench/Roster.tsx`.

**Interfaces:** `<Roster platforms benched:Set<string> tierById:Record<string,ConnTier> sensorsStatusById selectedId onSelect(p) onBench(ids:string[]) onRestore(ids:string[]) />`. Rows 36px; side dot 6px; tier mark `T/D/V/–` in `font-mono`; gap mark a hollow circle with `title="No sensors listed (OSINT gap)"`. ✕ button `min-h-8 min-w-8`. Shift/cmd click extends selection (local state `selectedIds`); a footer button "Bench selected (n)". Benched tray: `<details>` "Benched (n)" with Restore per row and "Restore all". Transition: `transition-[opacity,transform] duration-200` on rows; keyed by id so React moves them.

- [ ] Build, tsc, commit `feat(workbench): roster`.

---

### Task 7: Coverage component

**Files:** Create `components/force-catalog/workbench/Coverage.tsx`; CSS for `.cov-bar` in `app/globals.css`.

Row layout: `grid grid-cols-[minmax(160px,1fr)_minmax(200px,3fr)_56px]`; bar is a `div.cov-bar` with three side segments (`--store-accent`, `#8A8A8E`, `var(--store-ink-mute)`) whose widths are `active_side/maxRowCount·100%` and `transition: width 250ms cubic-bezier(0.22,1,0.36,1)`; ghost is an absolutely-positioned outline at `ghost/max`. Zero-after-bench rows get `gloss-tile purple` on the row container and a second line "lost with: …". `noData` rows: hatched bar via `repeating-linear-gradient(45deg, transparent 0 4px, var(--store-line) 4px 5px)` and label "no data". Section headers `text-[11px] uppercase tracking-wider store-text-muted`. Sort control (Coverage / Rarest / A–Z) in the pane header. `data-band-state` per row for ribbon hover.

- [ ] Build, tsc, commit `feat(workbench): coverage pane`.

---

### Task 8: Inspector and talk graph

**Files:** Create `components/force-catalog/workbench/Inspector.tsx`, `TalkGraph.tsx`.

**Interfaces:** `Inspector` props `{ mode: {type:'platform', platform} | {type:'capability', row: CoverageRow, holders: ForceCatalogPlatformFull[]} | {type:'net', netKey, interop: InteropResult, denied: InteropResult, platforms} | null; onBench(id); onSelect(p) }`. `TalkGraph` props `{ net: InteropNet; islands: InteropIsland[]; platforms; tierById; gnssDenied: boolean; fadedIds: Set<string> }`: `d3-force` (`forceSimulation`, `forceManyBody().strength(-60)`, `forceLink().distance(40)`, `forceCollide(14)`, `alphaDecay(0.08)`), rendered as SVG, nodes 10px circles filled by tier (`track` accent, `data` `#2997FF`, `voice` `#8A8A8E`, none outline), edges between island members; gateway platforms get a dashed ring. Under `prefers-reduced-motion` run the simulation to completion synchronously (`sim.tick(300)`) before first paint. Platform mode shows sensors with `sensorBands` chips and bearers with `variant ?? 'variant unknown'`.

- [ ] Build, tsc, commit `feat(workbench): inspector and talk graph`.

---

### Task 9: Workbench assembly, URL wiring, delete grid

**Files:** Create `components/force-catalog/workbench/Workbench.tsx`; modify `components/force-catalog/ForceCatalogClient.tsx`; delete `components/force-catalog/ForceCatalogMatrix.tsx`; remove the `[data-motion]` CSS block from `app/globals.css`; modify `lib/force-catalog/_test_*` if any import the matrix.

`Workbench` owns: `benched` (from `parseBench(searchParams.get('bench'), knownIds)`, written back with `router.replace` via a `setBench(ids)` that mirrors `useHubTab.setTab`'s URLSearchParams pattern), `sort`, `focusBand`, `inspector` mode. It memoises `buildCoverage`, `analyseInterop`, `interopUnderDenial`, `bandFill`. Layout: `grid grid-rows-[auto_1fr] gap-3`; body `grid grid-cols-[280px_minmax(0,1fr)_360px] gap-3 min-h-0`, each pane `overflow-auto max-h-[calc(100vh-260px)]`; below 1280px collapse to two columns with the inspector as a right-side `<dialog>`-style sheet.

In `ForceCatalogClient`: replace the `activeTab === 'compare'` `ForceCatalogMatrix` block with `<Workbench platforms={comparePlatforms} nations={bundle.nations} onSelect={onSelect} onClear={clearAll} scopedFromBattle=… onClearScope=… />`; delete the motion toggle and `MatrixMotion` import; hide the stat-chip row when `activeTab === 'compare'`.

- [ ] Build, `npx tsc --noEmit`, `npx vitest run`, Playwright screenshots (default, after benching two platforms, net mode, platform mode), commit `feat(force-catalog): capability workbench replaces compare grid`.

---

### Task 10: EO/IR band retag (OSINT)

**Files:** Modify the `data/force-catalog/*.ts` entries whose `kind === 'eo_ir'` (32 sensors), and `lib/force-catalog/_test_sensor-bands-data.test.ts` (new).

Rule: set `bands` only where a public manufacturer or programme page states the band. Add the URL to the sensor's `sources`. Known from public material: AN/AAQ-40 EOTS is MWIR (Lockheed Martin product page); AN/AAQ-37 DAS is MWIR (Northrop Grumman); Sniper ATP is MWIR + visible TV (Lockheed Martin); Litening is MWIR + CCD (Rafael); MX-15/MX-20 turrets are MWIR + colour/low-light EO (L3Harris WESCAM). Everything else keeps `IR`.

Test: every `eo_ir` sensor with `bands` has at least one `sources` entry containing `http`.

- [ ] Commit `data(force-catalog): EO/IR bands from public sources`.

---

### Task 11: Verification and sync

- [ ] `npx tsc --noEmit -p .`; `npx vitest run` (expect ≥ 870 passing); Playwright: `/force-catalog?tab=compare`, `?tab=compare&bench=AUS-CAT-E7A`, pop-out route; confirm no console errors other than favicon.
- [ ] Copy changed files to the OneDrive tree; push branch.
