# SPECTRAL — Platform Library Detail View
## Cursor Prompt

CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY

---

## What to build

Full-detail slide-out drawer for the Platform Library (Module 1).
When a threat card is clicked, a 480px right-side drawer opens with all OSINT fields,
spectrum data, defeat matchups, and a mini Cesium globe showing operational range.

---

## Files to create / modify

| Action | File |
|--------|------|
| CREATE | `app/threats/components/PlatformDrawer.tsx` |
| CREATE | `app/threats/components/PlatformDrawer.css` (if needed) |
| CREATE | `lib/threats/fetch-platform-detail.ts` |
| MODIFY | `app/threats/components/ThreatCard.tsx` — add `onClick` |
| MODIFY | `app/threats/page.tsx` — add drawer state |

---

## 1. `lib/threats/fetch-platform-detail.ts`

```ts
import { createClient } from '@/lib/supabase/server'
import type { Platform } from '@/lib/types'

export interface PlatformDetail extends Platform {
  defeat_matchups: {
    defeat_system_id: string
    system_name:      string
    kinetic_pct:      number
    rf_jamming_pct:   number | null
    dew_pct:          number | null
    is_immune:        boolean
    immune_reason:    string | null
    data_confidence:  string
    weather_limited:  boolean
    special_notes:    string | null
  }[]
}

export async function fetchPlatformDetail(id: string): Promise<PlatformDetail | null> {
  const supabase = createClient()

  const [{ data: platform }, { data: matchups }] = await Promise.all([
    supabase.from('platforms').select('*').eq('id', id).single(),
    supabase
      .from('defeat_effectiveness')
      .select(`
        defeat_system_id,
        kinetic_pct,
        rf_jamming_pct,
        dew_pct,
        is_immune,
        immune_reason,
        data_confidence,
        weather_limited,
        special_notes,
        anti_drone_systems ( name )
      `)
      .eq('platform_id', id)
      .order('kinetic_pct', { ascending: false }),
  ])

  if (!platform) return null

  return {
    ...platform,
    defeat_matchups: (matchups ?? []).map(m => ({
      ...m,
      system_name: (m.anti_drone_systems as any)?.name ?? m.defeat_system_id,
    })),
  }
}
```

---

## 2. `app/threats/components/PlatformDrawer.tsx`

```tsx
'use client'
```

### Props

```ts
interface PlatformDrawerProps {
  platformId: string | null
  onClose:    () => void
}
```

Fetch detail on `platformId` change:
```ts
const [detail, setDetail] = useState<PlatformDetail | null>(null)
useEffect(() => {
  if (!platformId) return
  fetch(`/api/platform/${platformId}`).then(r => r.json()).then(setDetail)
}, [platformId])
```

### Layout

**Drawer container**: `position: fixed`, right-0, top-0, bottom-0, w-[480px],
bg `#0A0A0F`, border-left `1px solid rgba(255,255,255,0.08)`, `z-index: 50`,
slide-in animation `translateX(480px → 0)` 200ms ease-out.

**Header**
```
[←]  {platform.name}                      [✕]
     {platform.manufacturer} · {platform.country_of_origin}
     GROUP: {platform.group}   YEAR: {platform.year_introduced}
```
Platform name: 20px bold white. Metadata: 12px grey `#94a3b8`.

---

### Section 1 — Identity & Specs

Two-column grid, all values in JetBrains Mono:

```
Max Range          {max_range_km} km
Cruise Speed       {cruise_speed_kmh} km/h
Max Altitude       {max_altitude_m} m
Wingspan           {wingspan_m} m
Weight             {mtow_kg} kg
Endurance          {endurance_hours} hr
Payload            {payload_kg} kg
Warhead            {warhead_kg ?? '—'} kg
Propulsion         {propulsion_type}
Guidance           {guidance_type}
```

---

### Section 2 — RF & GNSS Profile

```
Control Freq    {control_link_freq ?? 'Unknown'}
GNSS Dep        {gnss_dependency}   [badge]
RF Signature    {rf_signature_notes ?? '—'}
```

GNSS dependency badges:
- `high` → red pill `HIGH`
- `medium` → amber pill `MEDIUM`
- `low` → green pill `LOW`
- `none` → grey pill `NONE`

---

### Section 3 — Spectrum View mini-strip

If `spectrum_low_mhz` and `spectrum_high_mhz` are populated:

Render a mini horizontal D3 log-scale bar (400MHz–6GHz range)
showing the platform's control link band as a highlighted region.
Same colours as the main Spectrum View module.
Height: 40px. Width: 100% of drawer.

```ts
// D3 log scale — same as SpectrumWorkspace but compact
const x = d3.scaleLog().domain([400, 6000]).range([0, drawerWidth])
```

---

### Section 4 — Defeat Matchups

Sorted by `kinetic_pct` descending.

```
DEFEAT EFFECTIVENESS
─────────────────────────────────────────
SA-21 Growler     ████████████░░  88%  ●
SA-15 Gauntlet    ████████░░░░░░  80%  ●
SA-17 Grizzly     ████████░░░░░░  80%  ●
SA-11 Gadfly      ███████░░░░░░░  75%  ●
SA-7 Grail        █████░░░░░░░░░  55%  ○
```

Each row:
- System name (12px, truncated at 160px)
- Horizontal bar: width = `kinetic_pct%`, colour from heat-map scale
- Percentage in JetBrains Mono
- Confidence dot: cyan=high, amber=estimated, grey=medium
- Weather icon `⛈` if `weather_limited`
- If `is_immune`: show `✕ IMMUNE` in red instead of bar

On hover: tooltip showing `special_notes`.

---

### Section 5 — Conflict Intel & Defeat Note

```
DEFEAT NOTE
{platform.defeat_note}

OSINT CONFIDENCE
{platform.data_confidence}  ●
```

---

### Section 6 — Operational Range Globe (optional, low priority)

Small Cesium globe (240px × 180px) showing a circle at `(0°,0°)` with radius
= `max_range_km * 1000` metres, orange colour, `CLAMP_TO_GROUND`.

```tsx
const MiniGlobe = dynamic(() => import('./MiniGlobe'), { ssr: false })
```

Only render if `platform.max_range_km > 0`.

---

## 3. Wire into `app/threats/page.tsx`

```tsx
const [selectedId, setSelectedId] = useState<string | null>(null)

// Pass to grid:
<ThreatGrid onCardClick={(id) => setSelectedId(id)} />

// Drawer:
<PlatformDrawer platformId={selectedId} onClose={() => setSelectedId(null)} />
```

---

## API route — `app/api/platform/[id]/route.ts`

```ts
import { fetchPlatformDetail } from '@/lib/threats/fetch-platform-detail'
import { NextResponse } from 'next/server'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const detail = await fetchPlatformDetail(params.id)
  if (!detail) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(detail)
}
```

---

## Colour reference

```
Background:           #0A0A0F
Drawer border:        rgba(255,255,255,0.08)
Section header:       #F97316 (orange), 11px uppercase tracking-widest
Label text:           #94a3b8 (slate-400)
Value text:           #f1f5f9 (slate-100), JetBrains Mono
Bar high (70%+):      #991b1b
Bar mid (30-69%):     #c2410c
Bar low (<30%):       #14532d
Immune text:          #EF4444
Confidence high:      #06B6D4
Confidence est:       #EAB308
Confidence medium:    #6b7280
```
