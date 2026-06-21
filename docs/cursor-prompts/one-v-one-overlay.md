# SPECTRAL — 1v1 Engagement Overlay (Module 7)
## Cursor Prompt

CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY

---

## What to build

The 1v1 Overlay module — single-platform vs single-defeat-system engagement analysis.
Full-page layout with a CesiumJS 3D engagement geometry view on the left and a
detailed analysis panel on the right.

---

## Files to create / modify

| Action | File |
|--------|------|
| CREATE | `app/overlay/page.tsx` |
| CREATE | `app/overlay/components/EngagementPanel.tsx` |
| CREATE | `app/overlay/components/EngagementGeometry.tsx` (Cesium wrapper) |
| CREATE | `lib/overlay/engagement-calc.ts` |

---

## 1. `lib/overlay/engagement-calc.ts`

Pure calculation — no Cesium, no React.

```ts
import { computeSamIntercept, getSamProfile } from '@/lib/risk/sam-intercept'
import type { SamInterceptResult, UasTargetCategory, EcmLevel } from '@/lib/risk/sam-intercept'

export interface EngagementScenario {
  // Defeat system
  system_id:     string
  // UAS target
  platform_id:   string
  target_cat:    UasTargetCategory
  // Geometry
  uas_lon:       number
  uas_lat:       number
  uas_alt_m:     number
  sam_lon:       number
  sam_lat:       number
  sam_alt_m:     number    // terrain elevation of launcher
  // Electronic environment
  ecm_level:     EcmLevel
  salvo_count:   number
}

export interface EngagementResult {
  scenario:        EngagementScenario
  slant_range_m:   number
  intercept:       SamInterceptResult | null
  // Derived geometry
  bearing_deg:     number    // SAM → UAS bearing
  time_of_flight_s: number   // missile TTI at mean speed 800 m/s
  // Engagement timeline
  detect_range_m:  number    // radar detection range estimate
  track_range_m:   number    // fire-control track range
  launch_range_m:  number    // optimal launch range (80% of max)
  lethal_range_m:  number    // system max effective range
  // Status
  phase: 'outside_detect' | 'detect' | 'track' | 'launch' | 'intercept' | 'post_intercept'
}

export function haversineM(
  lon1: number, lat1: number,
  lon2: number, lat2: number,
): number {
  const R = 6_371_000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 +
            Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

export function computeEngagement(s: EngagementScenario): EngagementResult {
  const profile = getSamProfile(s.system_id)
  const groundRange = haversineM(s.sam_lon, s.sam_lat, s.uas_lon, s.uas_lat)
  const altDiff = s.uas_alt_m - s.sam_alt_m
  const slant_range_m = Math.sqrt(groundRange ** 2 + altDiff ** 2)

  const bearing_deg = Math.atan2(
    s.uas_lon - s.sam_lon, s.uas_lat - s.sam_lat
  ) * 180 / Math.PI

  const intercept = computeSamIntercept(
    {
      system_id:       s.system_id,
      target_category: s.target_cat,
      slant_range_m,
      target_alt_m:    s.uas_alt_m,
      ecm_level:       s.ecm_level,
      salvo_count:     s.salvo_count,
    },
    []
  )

  const maxRange  = profile?.max_range_m ?? 15000
  const detect_range_m  = maxRange * 1.4    // search radar beyond engagement envelope
  const track_range_m   = maxRange * 1.1    // FC radar
  const launch_range_m  = maxRange * 0.85   // optimal launch point
  const lethal_range_m  = maxRange

  const time_of_flight_s = slant_range_m / 800

  let phase: EngagementResult['phase'] = 'outside_detect'
  if (slant_range_m <= lethal_range_m)  phase = 'intercept'
  else if (slant_range_m <= launch_range_m) phase = 'launch'
  else if (slant_range_m <= track_range_m)  phase = 'track'
  else if (slant_range_m <= detect_range_m) phase = 'detect'

  return {
    scenario: s, slant_range_m, intercept, bearing_deg, time_of_flight_s,
    detect_range_m, track_range_m, launch_range_m, lethal_range_m, phase,
  }
}
```

---

## 2. `app/overlay/components/EngagementGeometry.tsx`

CesiumJS 3D view of the engagement.

```tsx
'use client'
// ALWAYS dynamic import — never top-level
```

### What to render

- **SAM site** — red billboard icon at `(sam_lon, sam_lat, sam_alt_m)`
- **UAS** — orange diamond/aircraft icon at `(uas_lon, uas_lat, uas_alt_m)`
- **LOS line** — polyline connecting the two, dashed white
- **Range rings** (ellipses on ground, `CLAMP_TO_GROUND`, `ClassificationType.TERRAIN`):
  - Detect ring: `detect_range_m`, blue/10% fill, blue outline
  - Track ring: `track_range_m`, amber/15% fill
  - Launch ring: `launch_range_m`, orange/20% fill
  - Lethal ring: `lethal_range_m`, red/25% fill

- **Missile trajectory arc** (if `phase === 'intercept'` or `launch`):
  - Parabolic polyline from SAM to UAS midpoint apex, cyan colour

- **Phase label** billboard above the SAM site showing current `phase` text

### Props

```ts
interface EngagementGeometryProps {
  result: EngagementResult
  onSamMove:  (lon: number, lat: number) => void
  onUasMove:  (lon: number, lat: number) => void
}
```

Make SAM and UAS billboards draggable using the same `ScreenSpaceEventHandler`
pattern from `app/map/hooks/usePlatformDrag.ts`.

### Cesium import pattern (mandatory)

```ts
const Cesium = await import('cesium')
// CESIUM_BASE_URL must be set in next.config.js — do not add it here
```

Dynamic component wrapper:
```ts
import dynamic from 'next/dynamic'
const EngagementGeometry = dynamic(
  () => import('./EngagementGeometry'),
  { ssr: false }
)
```

---

## 3. `app/overlay/components/EngagementPanel.tsx`

```tsx
'use client'
```

Right-side panel (400px wide), scrollable.

### Sections

**System selector**
- SAM system dropdown: all `SAM_SYSTEM_IDS`
- UAS platform dropdown: populated from `platforms` table (group filter)
- Target category auto-set from platform group, but overridable

**Geometry inputs** (lat/lon/alt for both)
- Two coordinate pairs — can also be dragged on globe

**Electronic environment**
- ECM level pills
- Salvo count stepper (1–4)

**Result display**

```
ENGAGEMENT PHASE
[ INTERCEPT ]   ← large coloured badge

SLANT RANGE      12,450 m
TIME OF FLIGHT    15.6 s
BEARING           042°

──────────────────────────────
Pk SINGLE         0.62
Pk SALVO (×2)     0.86
──────────────────────────────

RANGE ENVELOPE
  Detect     17,500 m  ✓
  Track      13,200 m  ✓
  Launch     12,750 m  ✓
  Lethal     15,000 m  ✓

ENGAGEMENT NOTES
• Active radar seeker handles OWA at this range...
• Magazine: 8 missiles ready
```

Phase badge colours:
- `outside_detect` → grey `#374151`
- `detect` → blue `#1d4ed8`
- `track` → amber `#b45309`
- `launch` → orange `#c2410c`
- `intercept` → red `#991b1b`
- `post_intercept` → green `#15803d`

---

## 4. `app/overlay/page.tsx`

```tsx
// Server component shell
export default async function OverlayPage() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0A0A0F]">
      {/* Classification banner — non-removable */}
      <ClassificationBanner />

      {/* Left: 3D geometry */}
      <div className="flex-1 relative">
        <EngagementGeometry result={result} onSamMove={...} onUasMove={...} />
      </div>

      {/* Right: analysis panel */}
      <div className="w-[400px] border-l border-white/10 overflow-y-auto">
        <EngagementPanel
          result={result}
          onScenarioChange={setScenario}
        />
      </div>
    </div>
  )
}
```

Use `useState` + `useCallback` at client-island level for scenario and result state.
Recompute result via `computeEngagement()` whenever scenario changes.

---

## Colour reference

```
Background:           #0A0A0F
Orange accent:        #F97316
Cyan accent:          #06B6D4
SAM icon:             #EF4444 (red)
UAS icon:             #F97316 (orange)
LOS line:             rgba(255,255,255,0.4)
Detect ring:          rgba(59,130,246,0.10)
Track ring:           rgba(234,179,8,0.15)
Launch ring:          rgba(249,115,22,0.20)
Lethal ring:          rgba(239,68,68,0.25)
Missile arc:          #06B6D4
Data values:          font-family: 'JetBrains Mono', monospace
```
