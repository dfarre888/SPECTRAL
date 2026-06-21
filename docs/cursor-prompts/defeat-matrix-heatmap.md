# SPECTRAL — Defeat Matrix Heat-Map View
## Cursor Prompt

CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY

---

## What to build

Replace or augment the existing Defeat Matrix table with an interactive heat-map grid
that visualises `defeat_effectiveness.kinetic_pct` (and optionally rf/dew) for every
SAM/C-UAS system vs every drone platform in the database.

---

## Files to create / modify

| Action | File |
|--------|------|
| CREATE | `app/defeat/components/DefeatHeatmap.tsx` |
| CREATE | `lib/defeat/fetch-matrix.ts` — server-side data fetch |
| MODIFY | `app/defeat/page.tsx` — add view-toggle (table ↔ heatmap) |

---

## 1. `lib/defeat/fetch-matrix.ts`

Server-only data fetch (no `'use client'`).

```ts
import { createClient } from '@/lib/supabase/server'

export interface MatrixCell {
  platform_id:        string
  defeat_system_id:   string
  kinetic_pct:        number
  rf_jamming_pct:     number | null
  dew_pct:            number | null
  is_immune:          boolean
  swarm_engagement_pct: number | null
  data_confidence:    string
  weather_limited:    boolean
}

export interface MatrixData {
  cells:              MatrixCell[]
  platform_ids:       string[]   // ordered: FPV → HALE
  system_ids:         string[]   // ordered: MANPADS → long-range
  platform_labels:    Record<string, string>
  system_labels:      Record<string, string>
}

export async function fetchDefeatMatrix(): Promise<MatrixData> {
  const supabase = createClient()

  const [{ data: cells }, { data: platforms }, { data: systems }] = await Promise.all([
    supabase
      .from('defeat_effectiveness')
      .select('platform_id,defeat_system_id,kinetic_pct,rf_jamming_pct,dew_pct,is_immune,swarm_engagement_pct,data_confidence,weather_limited'),
    supabase
      .from('platforms')
      .select('id,name,group')
      .in('group', ['fpv','owa','loitering_munition','tactical_isr','male','hale']),
    supabase
      .from('anti_drone_systems')
      .select('id,name'),
  ])

  const platform_ids = (platforms ?? []).map(p => p.id)
  const system_ids   = (systems ?? []).map(s => s.id)

  const platform_labels = Object.fromEntries((platforms ?? []).map(p => [p.id, p.name]))
  const system_labels   = Object.fromEntries((systems ?? []).map(s => [s.id, s.name]))

  return {
    cells:           (cells ?? []) as MatrixCell[],
    platform_ids,
    system_ids,
    platform_labels,
    system_labels,
  }
}
```

---

## 2. `app/defeat/components/DefeatHeatmap.tsx`

```tsx
'use client'
```

### Props

```ts
interface DefeatHeatmapProps {
  data: MatrixData
}
```

### Cell colour mapping

```ts
function pkColor(pct: number, isImmune: boolean): string {
  if (isImmune)  return '#1a1a2e'                // near-black — immune
  if (pct === 0) return '#0f0f1a'                // black — zero but not immune
  if (pct < 15)  return '#052e16'                // very dark green — very low
  if (pct < 30)  return '#14532d'                // dark green — low
  if (pct < 50)  return '#854d0e'                // amber/brown — medium
  if (pct < 70)  return '#c2410c'                // orange-red — high
  return '#991b1b'                                // deep red — very high
}

function pkTextColor(pct: number): string {
  return pct >= 30 ? '#fef3c7' : '#6ee7b7'
}
```

### Grid layout

```
                 │ FPV  │ Shahed │ Geran │ Lancet │ Kargu │ Orlan │ TB2  │ MQ-9 │ RQ-4 │
─────────────────┼──────┼────────┼───────┼────────┼───────┼───────┼──────┼──────┼──────┤
SA-7 Grail       │  2%  │   8%   │   8%  │   5%   │   4%  │  18%  │  55% │  55% │  ✕   │
SA-14 Gremlin    │  4%  │  15%   │  15%  │  10%   │   8%  │  28%  │  62% │  62% │  ✕   │
SA-15 Gauntlet   │ 22%  │  62%   │  65%  │  50%   │  42%  │  70%  │  80% │  80% │  72% │
SA-21 Growler    │ 12%  │  55%   │  52%  │  45%   │  38%  │  62%  │  88% │  88% │  92% │
...
```

Each cell:
- Background from `pkColor(kinetic_pct, is_immune)`
- Text: `{kinetic_pct}%` or `✕` if immune, in JetBrains Mono 11px
- Tooltip on hover: `{system_name} vs {platform_name}: {kinetic_pct}% Pk. Confidence: {data_confidence}. {weather_limited ? '⚠ Weather limited' : ''}`
- Data confidence indicator: small dot top-right of cell
  - `high` → cyan dot
  - `estimated` → amber dot
  - `medium` → grey dot

### Toolbar controls (above heatmap)

```tsx
// Effect type toggle
type EffectMode = 'kinetic' | 'rf_jamming' | 'dew' | 'swarm'

// System group filter
type SystemGroup = 'all' | 'manpads' | 'short_range' | 'medium' | 'long_range' | 'legacy'

// Sort options
type SortMode = 'threat_level' | 'alphabetical' | 'range'
```

Render as pill button rows above the grid. Active pill: orange bg.

### Legend (below grid)

```
■ 0%    ■ 1-14%    ■ 15-29%    ■ 30-49%    ■ 50-69%    ■ 70%+    ✕ Immune
  ● High confidence    ● Estimated    ● Medium
```

### Sticky headers

Platform names across top — rotated 45° (`writing-mode: vertical-rl` or CSS transform).
System names down left column — horizontal, truncated with `max-w-[160px]`.

Both row and column headers stick when scrolling (use `position: sticky`).

---

## 3. Wire into `app/defeat/page.tsx`

```tsx
// Server component — fetch at page level
import { fetchDefeatMatrix } from '@/lib/defeat/fetch-matrix'

// View state (client island or URL param)
const [view, setView] = useState<'table' | 'heatmap'>('heatmap')

// In JSX:
<div className="flex gap-2 mb-4">
  <button onClick={() => setView('table')}   className={view==='table'   ? 'btn-active' : 'btn'}>Table</button>
  <button onClick={() => setView('heatmap')} className={view==='heatmap' ? 'btn-active' : 'btn'}>Heat Map</button>
</div>

{view === 'heatmap' && <DefeatHeatmap data={matrixData} />}
```

---

## Scrollable container

The grid will be wider than the viewport. Wrap in:
```tsx
<div className="overflow-auto max-h-[calc(100vh-200px)]">
  {/* grid */}
</div>
```

Min cell width: 52px. System name column: 180px fixed.

---

## Colour reference

```
Background:          #0A0A0F
Grid line:           rgba(255,255,255,0.05)
Header bg:           #111118
Header text:         #94a3b8
Immune cell:         #1a1a2e
Pk 0%:              #0f0f1a
Pk 1-14%:           #052e16
Pk 15-29%:          #14532d
Pk 30-49%:          #854d0e
Pk 50-69%:          #c2410c
Pk 70%+:            #991b1b
Cell text:           JetBrains Mono 11px
Confidence high:     #06B6D4
Confidence est:      #EAB308
Confidence medium:   #6b7280
```
