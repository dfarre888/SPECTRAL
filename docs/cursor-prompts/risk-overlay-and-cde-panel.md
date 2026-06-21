# SPECTRAL — Risk Overlay + CDE Panel
## Cursor Prompt

CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY

---

## What to build

Three connected pieces:

1. **`lib/risk/` is already written** — `types.ts`, `warhead-db.ts`, `cde-engine.ts`, `ew-radius.ts`.
   Import from `@/lib/risk` — do not rewrite these files.

2. **CDE / Collateral Damage Panel** — `app/map/components/CollateralRiskPanel.tsx`
   Right-side overlay that shows blast zone summary and CDE calculation.

3. **Cesium risk circle overlays** — `lib/map/risk-overlay.ts`
   Draws and moves draggable concentric circles on the globe for both blast and jamming modes.

4. **Wire into MapIntelView** — add risk overlay state and toggle button to the existing map.

---

## 1. `app/map/components/CollateralRiskPanel.tsx`

```tsx
'use client'
```

Panel rendered over the map (absolute-positioned, right side) when a risk overlay is active.

### Props
```ts
interface CollateralRiskPanelProps {
  mode: 'blast' | 'jamming'
  blastResult?: CdeResult | null      // from lib/risk/cde-engine.ts
  jammingRadii?: JammingRadii | null  // from lib/risk/ew-radius.ts
  weaponName?: string
  jammerName?: string
  popTier: PopulationDensityTier
  timeOfDay: TimeOfDay
  buildingProtection: BuildingProtection
  onPopTierChange: (v: PopulationDensityTier) => void
  onTimeChange: (v: TimeOfDay) => void
  onProtectionChange: (v: BuildingProtection) => void
  onClose: () => void
}
```

### Layout

Dark panel (bg `#0A0A0F`, border `var(--store-line)`) — 320px wide — sits in top-right corner below the classification banner.

**Blast mode sections:**
- Header row: `⚠ COLLATERAL DAMAGE ESTIMATE` in orange `#F97316`
- Weapon line: `weaponName` in JetBrains Mono
- **Risk category badge**: GREEN=`#22C55E` / AMBER=`#EAB308` / RED=`#EF4444` / BLACK=`#7F1D1D` bg — large pill with category text
- **ECCas row**: `Expected Casualties` label, value in JetBrains Mono large text
- **Blast rings table** (4 rows): Lethal / Injury / Structural / Hazard with radius in metres
- **Environment controls** (3 select dropdowns):
  - Population density (remote / rural / suburban / urban / dense_urban)
  - Time of day (5 options)
  - Building protection (3 options)
- **Infrastructure flags** — if any, red warning list
- **Authority required** — text in amber/red depending on category
- **Proportionality summary** — small grey text block (collapsible)

**Jamming mode sections:**
- Header: `⚡ EW JAMMING FOOTPRINT` in cyan `#06B6D4`
- Jammer name in JetBrains Mono
- Ring table: GPS L1 radius / RC link radius / Max radius
- Band list: which frequency bands active
- **Civilian GPS systems affected** — orange warning list
- ERP power in watts

All numerical values (ranges, radii, casualties) in `font-family: 'JetBrains Mono', monospace`.

---

## 2. `lib/map/risk-overlay.ts`

Cesium entity management for blast/jamming circles. All CesiumJS imports must be:
```ts
// ALWAYS dynamic import — never top-level
const Cesium = await import('cesium')
```

### Exported functions

```ts
export interface RiskOverlayEntities {
  anchor: Cesium.Entity       // the draggable centre point billbard
  rings: Cesium.Entity[]      // one entity per ring
}

/**
 * Add blast radius rings to the viewer.
 * Colors: lethal=red/80%, injury=orange/50%, structural=yellow/30%, hazard=blue/15%
 */
export async function addBlastOverlay(
  viewer: CesiumViewer,
  lon: number,
  lat: number,
  rings: { lethal_m: number; injury_m: number; structural_m: number; hazard_m: number },
  label: string,
): Promise<RiskOverlayEntities>

/**
 * Add EW jamming radius rings to the viewer.
 * Colors: gps_ring=red/60%, rc_ring=orange/40%, max_ring=yellow/20%
 */
export async function addJammingOverlay(
  viewer: CesiumViewer,
  lon: number,
  lat: number,
  gps_m: number,
  rc_m: number,
  max_m: number,
  label: string,
): Promise<RiskOverlayEntities>

/** Move all entities to a new lon/lat */
export async function moveRiskOverlay(
  viewer: CesiumViewer,
  entities: RiskOverlayEntities,
  lon: number,
  lat: number,
): Promise<void>

/** Remove all overlay entities */
export function removeRiskOverlay(
  viewer: CesiumViewer,
  entities: RiskOverlayEntities,
): void
```

### Cesium entity pattern (use EllipseGraphics — most accurate for ground radii)

```ts
viewer.entities.add({
  position: Cesium.Cartesian3.fromDegrees(lon, lat),
  ellipse: {
    semiMinorAxis: radius_m,
    semiMajorAxis: radius_m,
    material: new Cesium.ColorMaterialProperty(
      Cesium.Color.RED.withAlpha(0.25)
    ),
    outline: true,
    outlineColor: Cesium.Color.RED.withAlpha(0.9),
    outlineWidth: 2,
    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
    classificationType: Cesium.ClassificationType.TERRAIN,
  },
})
```

**Anchor billboard** — use a crosshair/target icon. Make it left-clickable to start drag mode. When dragging, call `moveRiskOverlay` on `MOUSE_MOVE`. End drag on `LEFT_UP`.

Implement drag using the existing Cesium handler pattern in `app/map/hooks/usePlatformDrag.ts` for reference (same `ScreenSpaceEventHandler` pattern).

---

## 3. Wire into `app/map/MapIntelView.tsx`

### State to add
```ts
const [riskMode, setRiskMode] = useState<'blast' | 'jamming' | 'none'>('none')
const [riskLon, setRiskLon] = useState<number | null>(null)
const [riskLat, setRiskLat] = useState<number | null>(null)
const [selectedWarhead, setSelectedWarhead] = useState<BlastRadii | null>(null)
const [selectedJammer, setSelectedJammer] = useState<JammingRadii | null>(null)
const [riskPopTier, setRiskPopTier] = useState<PopulationDensityTier>('urban')
const [riskTimeOfDay, setRiskTimeOfDay] = useState<TimeOfDay>('business_day')
const [riskProtection, setRiskProtection] = useState<BuildingProtection>('light')
const [cdeResult, setCdeResult] = useState<CdeResult | null>(null)
const riskOverlayRef = useRef<RiskOverlayEntities | null>(null)
```

### Toolbar buttons

Add to the existing map toolbar (near the laydown controls):

```
[💥 Blast] [⚡ EW Jam]
```

Clicking `Blast` sets `riskMode='blast'` and places the overlay at the globe centre (or last clicked position). Clicking `EW Jam` does the same for jamming.

Show a small dropdown to select which warhead / jammer — populate from `WARHEAD_DB` and `JAMMER_DB` from `@/lib/risk`.

### CDE recompute

Whenever `riskLon`, `riskLat`, `selectedWarhead`, `riskPopTier`, `riskTimeOfDay`, or `riskProtection` changes, recompute CDE:

```ts
useEffect(() => {
  if (!selectedWarhead || riskLon === null || riskLat === null) return
  const result = computeCde({
    impact_lon: riskLon,
    impact_lat: riskLat,
    blast: selectedWarhead,
    population_tier: riskPopTier,
    time_of_day: riskTimeOfDay,
    building_protection: riskProtection,
    nearby_infrastructure: ['none'],
  })
  setCdeResult(result)
}, [selectedWarhead, riskLon, riskLat, riskPopTier, riskTimeOfDay, riskProtection])
```

### Globe click handler

When `riskMode !== 'none'`, clicking the globe moves the risk overlay anchor to that lat/lon.
Reuse `onGlobeClick` prop already on `CesiumMapPanel`.

### CollateralRiskPanel placement

Render when `riskMode !== 'none'`:
```tsx
{riskMode !== 'none' && (
  <CollateralRiskPanel
    mode={riskMode}
    blastResult={cdeResult}
    jammingRadii={selectedJammer}
    weaponName={selectedWarhead?.weapon_name}
    jammerName={selectedJammer?.jammer_name}
    popTier={riskPopTier}
    timeOfDay={riskTimeOfDay}
    buildingProtection={riskProtection}
    onPopTierChange={setRiskPopTier}
    onTimeChange={setRiskTimeOfDay}
    onProtectionChange={setRiskProtection}
    onClose={() => {
      setRiskMode('none')
      if (cesiumCtx && riskOverlayRef.current) {
        removeRiskOverlay(cesiumCtx.viewer, riskOverlayRef.current)
        riskOverlayRef.current = null
      }
    }}
  />
)}
```

---

## Colour reference

```
Background:          #0A0A0F
Orange accent:       #F97316
Cyan accent:         #06B6D4
Lethal ring:         rgba(239,  68,  68, 0.25) outline full opacity red
Injury ring:         rgba(249, 115,  22, 0.20) outline orange
Structural ring:     rgba(234, 179,   8, 0.15) outline yellow
Hazard ring:         rgba( 59, 130, 246, 0.10) outline blue
GPS jamming ring:    rgba(239,  68,  68, 0.20) outline red
RC jamming ring:     rgba(249, 115,  22, 0.15) outline orange
Max jam ring:        rgba(234, 179,   8, 0.10) outline yellow
Data values:         font-family: 'JetBrains Mono', monospace
```

---

## Files to create / modify

| Action | File |
|--------|------|
| CREATE | `app/map/components/CollateralRiskPanel.tsx` |
| CREATE | `lib/map/risk-overlay.ts` |
| MODIFY | `app/map/MapIntelView.tsx` — add state, toolbar buttons, CDE recompute, panel |
| DO NOT TOUCH | `lib/risk/*.ts` — already written |
