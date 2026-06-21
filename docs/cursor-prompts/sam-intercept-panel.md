# SPECTRAL — SAM Intercept Calculator Panel
## Cursor Prompt

CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY

---

## What to build

A right-side analysis panel that uses `lib/risk/sam-intercept.ts` to compute single-shot and
salvo kill probability for any SAM system against any UAS target category.

Wires into the existing Defeat Matrix module or can be rendered as a standalone overlay.

---

## Files to create / modify

| Action | File |
|--------|------|
| CREATE | `app/defeat/components/SamInterceptPanel.tsx` |
| CREATE | `app/defeat/components/SamInterceptPanel.css` (or use Tailwind only) |
| MODIFY | `app/defeat/page.tsx` — add panel toggle and state |
| DO NOT TOUCH | `lib/risk/sam-intercept.ts` — already written |

---

## 1. `app/defeat/components/SamInterceptPanel.tsx`

```tsx
'use client'
```

### Imports (all from existing lib)

```ts
import {
  computeSamIntercept,
  getSamProfile,
  SAM_SYSTEM_IDS,
  type UasTargetCategory,
  type EcmLevel,
  type SamInterceptResult,
} from '@/lib/risk/sam-intercept'
```

### Props

```ts
interface SamInterceptPanelProps {
  onClose: () => void
}
```

### State

```ts
const [systemId, setSystemId]           = useState<string>(SAM_SYSTEM_IDS[0])
const [target, setTarget]               = useState<UasTargetCategory>('owa')
const [slantRange, setSlantRange]       = useState<number>(8000)      // metres
const [targetAlt, setTargetAlt]         = useState<number>(500)       // metres
const [ecmLevel, setEcmLevel]           = useState<EcmLevel>('none')
const [salvoCount, setSalvoCount]       = useState<number>(2)
const [result, setResult]               = useState<SamInterceptResult | null>(null)
```

### Compute on change

```ts
useEffect(() => {
  const r = computeSamIntercept(
    { system_id: systemId, target_category: target,
      slant_range_m: slantRange, target_alt_m: targetAlt,
      ecm_level: ecmLevel, salvo_count: salvoCount },
    []   // empty = use internal SAM_PROFILES default
  )
  setResult(r)
}, [systemId, target, slantRange, targetAlt, ecmLevel, salvoCount])
```

### Layout (320px panel, bg `#0A0A0F`, border `var(--store-line)`)

**Header**
```
⚡ SAM INTERCEPT CALCULATOR        [✕]
```
Orange `#F97316`, JetBrains Mono.

**System selector** — `<select>` over `SAM_SYSTEM_IDS`, display label =
`getSamProfile(id)?.nato_designation ?? id`

**Target selector** — 6 pill buttons (one per `UasTargetCategory`):
`fpv | owa | loitering_munition | tactical_isr | male | hale`
Active pill: orange bg, white text. Inactive: dark border.

**Input sliders** (two columns):
- Slant Range: 0–40 000 m (step 500), value in JetBrains Mono
- Target Altitude: 0–30 000 m (step 100)
- Salvo Count: 1–4 missiles (step buttons, not slider)

**ECM Level** — 4 radio pills: `none | basic | advanced | military_grade`

---

**Result block** (shown only when `result !== null`):

```
┌─────────────────────────────────────────┐
│  IN ENVELOPE: YES / NO                  │  ← green/red badge
│                                         │
│  Pk SINGLE          0.62                │
│  Pk SALVO (×2)      0.86                │
│                                         │
│  Range factor       0.95                │
│  Altitude factor    1.00                │
│  ECM factor         0.65                │
│                                         │
│  NOTES                                  │
│  • Active radar seeker — ...            │
│  • Magazine limit ...                   │
│                                         │
│  RECOMMENDED RESPONSE                   │
│  Employ 2-missile salvo...              │
└─────────────────────────────────────────┘
```

All numeric values in JetBrains Mono, large (24px) for Pk figures.

Pk SINGLE bar: horizontal progress bar, colour-coded:
- 0–0.30 → green (`#22C55E`)
- 0.30–0.60 → amber (`#EAB308`)
- 0.60+ → red (`#EF4444`)

Pk SALVO bar: same colour scale, always ≥ Pk SINGLE.

If `result.in_envelope === false`:
```
OUT OF ENGAGEMENT ENVELOPE
```
Red badge full-width. No Pk values shown.

---

## 2. Wire into `app/defeat/page.tsx`

Add to existing toolbar:

```tsx
const [showSamCalc, setShowSamCalc] = useState(false)

// In toolbar JSX:
<button
  onClick={() => setShowSamCalc(v => !v)}
  className="btn-toolbar"
>
  ⚡ SAM Pk Calc
</button>

// Alongside existing content:
{showSamCalc && (
  <div className="absolute right-4 top-16 z-50">
    <SamInterceptPanel onClose={() => setShowSamCalc(false)} />
  </div>
)}
```

---

## Colour reference

```
Background:      #0A0A0F
Panel border:    1px solid rgba(255,255,255,0.08)
Orange accent:   #F97316
Cyan accent:     #06B6D4
Pk low (safe):   #22C55E
Pk mid:          #EAB308
Pk high:         #EF4444
Out of envelope: #7F1D1D background, #EF4444 text
Data values:     font-family: 'JetBrains Mono', monospace
```
