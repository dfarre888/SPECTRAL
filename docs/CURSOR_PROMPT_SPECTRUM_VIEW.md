# SPECTRAL — Spectrum View Redesign
## Cursor Implementation Prompt

---

## CONTEXT

Replace the existing `/spectrum` D3 chart entirely with a tile-based electromagnetic spectrum intelligence view. This is a ground-up rebuild — delete the old D3 implementation and start fresh.

Stack constraints from `CLAUDE.md`:
- Next.js 14.2.29 App Router only — NO pages router
- Supabase `@supabase/ssr` — NOT legacy auth-helpers
- Tailwind + shadcn/ui
- JetBrains Mono for ALL frequency/wavelength numeric values
- Background `#0A0A0F` | Orange `#F97316` | Cyan `#06B6D4`
- Classification banner `UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY` — non-removable, appears on every page
- `SUPABASE_SERVICE_ROLE_KEY` and `ANTHROPIC_API_KEY` — server-only, NEVER in client code

---

## ARCHITECTURE OVERVIEW

```
app/spectrum/
├── page.tsx                     ← replaces existing spectrum page
components/spectrum/
├── SpectrumView.tsx             ← main container, manages global state
├── BandTile.tsx                 ← individual frequency band tile
├── AllocationLayer.tsx          ← AUS/US frequency allocation overlay (SVG)
├── PlatformMarker.tsx           ← platform freq marker on tile
├── JammingOverlay.tsx           ← jamming interference visualization
├── BandControls.tsx             ← per-tile: checkbox, transparency, zoom btn
├── CountryToggle.tsx            ← AUS / US toggle
├── CategoryFilter.tsx           ← ACMA/NTIA colour-category filter chips
├── TileZoomModal.tsx            ← full-screen tile zoom view
lib/data/
├── spectrum-bands.ts            ← band definitions (freq range, image path, wavelength)
├── frequency-allocations.ts    ← full AUS+US allocation dataset
├── acma-categories.ts           ← ACMA colour codes and service categories
├── ntia-categories.ts           ← NTIA colour codes and service categories
hooks/
├── useSpectrumData.ts           ← Supabase: fetch platforms + their freq data
├── useSpectrumState.ts          ← tile visibility, transparency, zoom state
types/
├── spectrum.ts                  ← TypeScript types for all spectrum entities
```

---

## TYPES — `types/spectrum.ts`

```typescript
export type FrequencyBand = {
  id: string
  name: string          // 'VLF' | 'LF' | 'MF' | 'HF' | 'VHF' | 'UHF' | 'SHF' | 'EHF'
                        // | 'INFRARED' | 'VISIBLE' | 'UV' | 'XRAY' | 'GAMMA' | 'GNSS'
  label: string         // Display: 'Very Low Frequency'
  freq_low_hz: number   // Lower bound in Hz (0 for non-RF bands)
  freq_high_hz: number  // Upper bound in Hz
  wavelength_min_m: number
  wavelength_max_m: number
  image_path: string    // /spectrum/band-vhf.webp etc
  order: number         // Display order 1-14
  is_rf: boolean        // false for IR/Visible/UV/XRay/Gamma
  military_relevance: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW'
}

export type FrequencyAllocation = {
  id: string
  band_id: string
  service_name: string          // 'AERONAUTICAL MOBILE', 'RADIOLOCATION', etc.
  service_code: string          // 'AM', 'RL', 'RN', 'FS', 'MS', 'BS', etc.
  freq_low_hz: number
  freq_high_hz: number
  country: 'AUS' | 'US' | 'BOTH'
  priority: 'PRIMARY' | 'SECONDARY'
  category: string              // ACMA/NTIA colour category code
  color_hex: string             // Rendered colour from ACMA/NTIA chart
  military: boolean
  notes?: string
}

export type PlatformFrequency = {
  platform_id: string
  platform_name: string
  platform_type: string
  band_id: string
  freq_hz: number               // Centre frequency
  freq_low_hz?: number          // Bandwidth start
  freq_high_hz?: number         // Bandwidth end
  link_type: 'CONTROL' | 'VIDEO' | 'TELEMETRY' | 'GNSS' | 'EW' | 'RADAR' | 'COMMS' | 'DEW'
  is_jamming_source: boolean    // True for EW/jamming platforms
  jamming_bandwidth_hz?: number // Effective jamming bandwidth
}

export type SpectrumTileState = {
  band_id: string
  visible: boolean
  transparency: number          // 0-1 (1 = fully opaque)
  zoomed: boolean
}

export type AllocationFilter = {
  country: 'AUS' | 'US'
  categories: string[]          // Active ACMA/NTIA category codes (empty = all)
  show_military_only: boolean
}
```

---

## BAND DEFINITIONS — `lib/data/spectrum-bands.ts`

Define all 14 tiles in order. Images are at `/public/spectrum/` — see image paths below:

```typescript
import type { FrequencyBand } from '@/types/spectrum'

export const SPECTRUM_BANDS: FrequencyBand[] = [
  {
    id: 'VLF',
    name: 'VLF',
    label: 'Very Low Frequency',
    freq_low_hz: 3_000,
    freq_high_hz: 30_000,
    wavelength_min_m: 10_000,
    wavelength_max_m: 100_000,
    image_path: '/spectrum/band-vlf.webp',
    order: 1,
    is_rf: true,
    military_relevance: 'HIGH',
  },
  {
    id: 'LF',
    name: 'LF',
    label: 'Low Frequency',
    freq_low_hz: 30_000,
    freq_high_hz: 300_000,
    wavelength_min_m: 1_000,
    wavelength_max_m: 10_000,
    image_path: '/spectrum/band-lf.webp',
    order: 2,
    is_rf: true,
    military_relevance: 'MODERATE',
  },
  {
    id: 'MF',
    name: 'MF',
    label: 'Medium Frequency',
    freq_low_hz: 300_000,
    freq_high_hz: 3_000_000,
    wavelength_min_m: 100,
    wavelength_max_m: 1_000,
    image_path: '/spectrum/band-mf.webp',
    order: 3,
    is_rf: true,
    military_relevance: 'MODERATE',
  },
  {
    id: 'HF',
    name: 'HF',
    label: 'High Frequency',
    freq_low_hz: 3_000_000,
    freq_high_hz: 30_000_000,
    wavelength_min_m: 10,
    wavelength_max_m: 100,
    image_path: '/spectrum/band-hf.webp',
    order: 4,
    is_rf: true,
    military_relevance: 'HIGH',
  },
  {
    id: 'VHF',
    name: 'VHF',
    label: 'Very High Frequency',
    freq_low_hz: 30_000_000,
    freq_high_hz: 300_000_000,
    wavelength_min_m: 1,
    wavelength_max_m: 10,
    image_path: '/spectrum/band-vhf.webp',
    order: 5,
    is_rf: true,
    military_relevance: 'CRITICAL',
  },
  {
    id: 'UHF',
    name: 'UHF',
    label: 'Ultra High Frequency',
    freq_low_hz: 300_000_000,
    freq_high_hz: 3_000_000_000,
    wavelength_min_m: 0.1,
    wavelength_max_m: 1,
    image_path: '/spectrum/band-uhf.webp',
    order: 6,
    is_rf: true,
    military_relevance: 'CRITICAL',
  },
  {
    id: 'SHF',
    name: 'SHF',
    label: 'Super High Frequency',
    freq_low_hz: 3_000_000_000,
    freq_high_hz: 30_000_000_000,
    wavelength_min_m: 0.01,
    wavelength_max_m: 0.1,
    image_path: '/spectrum/band-shf.webp',
    order: 7,
    is_rf: true,
    military_relevance: 'CRITICAL',
  },
  {
    id: 'EHF',
    name: 'EHF',
    label: 'Extremely High Frequency',
    freq_low_hz: 30_000_000_000,
    freq_high_hz: 300_000_000_000,
    wavelength_min_m: 0.001,
    wavelength_max_m: 0.01,
    image_path: '/spectrum/band-ehf.webp',
    order: 8,
    is_rf: true,
    military_relevance: 'HIGH',
  },
  {
    id: 'INFRARED',
    name: 'IR',
    label: 'Infrared',
    freq_low_hz: 300_000_000_000,
    freq_high_hz: 430_000_000_000_000,
    wavelength_min_m: 700e-9,
    wavelength_max_m: 1e-3,
    image_path: '/spectrum/band-infrared.webp',
    order: 9,
    is_rf: false,
    military_relevance: 'CRITICAL',
  },
  {
    id: 'VISIBLE',
    name: 'VIS',
    label: 'Visible Light',
    freq_low_hz: 430_000_000_000_000,
    freq_high_hz: 770_000_000_000_000,
    wavelength_min_m: 390e-9,
    wavelength_max_m: 700e-9,
    image_path: '/spectrum/band-visible.webp',
    order: 10,
    is_rf: false,
    military_relevance: 'HIGH',
  },
  {
    id: 'UV',
    name: 'UV',
    label: 'Ultraviolet',
    freq_low_hz: 770_000_000_000_000,
    freq_high_hz: 30_000_000_000_000_000,
    wavelength_min_m: 10e-9,
    wavelength_max_m: 390e-9,
    image_path: '/spectrum/band-uv.webp',
    order: 11,
    is_rf: false,
    military_relevance: 'MODERATE',
  },
  {
    id: 'XRAY',
    name: 'X-Ray',
    label: 'X-Ray',
    freq_low_hz: 30_000_000_000_000_000,
    freq_high_hz: 30_000_000_000_000_000_000,
    wavelength_min_m: 1e-11,
    wavelength_max_m: 10e-9,
    image_path: '/spectrum/band-xray.webp',
    order: 12,
    is_rf: false,
    military_relevance: 'MODERATE',
  },
  {
    id: 'GAMMA',
    name: 'γ-Ray',
    label: 'Gamma Ray',
    freq_low_hz: 30_000_000_000_000_000_000,
    freq_high_hz: Number.MAX_SAFE_INTEGER,
    wavelength_min_m: 0,
    wavelength_max_m: 1e-11,
    image_path: '/spectrum/band-gamma.webp',
    order: 13,
    is_rf: false,
    military_relevance: 'MODERATE',
  },
  {
    id: 'GNSS',
    name: 'GNSS',
    label: 'GNSS Constellation',
    freq_low_hz: 1_164_000_000,   // L5 lower
    freq_high_hz: 1_610_000_000,  // GLONASS upper
    wavelength_min_m: 0.186,
    wavelength_max_m: 0.257,
    image_path: '/spectrum/band-gnss.webp',
    order: 14,
    is_rf: true,
    military_relevance: 'CRITICAL',
  },
]
```

---

## FREQUENCY ALLOCATIONS — `lib/data/frequency-allocations.ts`

Build a comprehensive dataset. The minimum required allocations per band — expand from these. Key defense/aviation entries must be included.

**ACMA colour categories (Australia):**
```typescript
export const ACMA_CATEGORIES = {
  'AM':  { label: 'Aeronautical Mobile',          color: '#2E8B57' },
  'AMR': { label: 'Aeronautical Mobile Route',    color: '#228B22' },
  'ARN': { label: 'Aeronautical Radionavigation', color: '#8B0000' },
  'BS':  { label: 'Broadcasting',                 color: '#DAA520' },
  'FS':  { label: 'Fixed Service',                color: '#4169E1' },
  'ISM': { label: 'Industrial Scientific Medical',color: '#808080' },
  'MM':  { label: 'Maritime Mobile',              color: '#008080' },
  'MRN': { label: 'Maritime Radionavigation',     color: '#006400' },
  'MIL': { label: 'Military / Government',        color: '#8B4513' },
  'MS':  { label: 'Mobile Service',               color: '#4682B4' },
  'RNS': { label: 'Radionavigation Satellite',    color: '#9932CC' },
  'RL':  { label: 'Radiolocation',               color: '#B8860B' },
  'SAT': { label: 'Space / Satellite',            color: '#191970' },
  'DEW': { label: 'Directed Energy / Optical',    color: '#FF4500' },
}

export const NTIA_CATEGORIES = {
  'GOV': { label: 'Government Exclusive',        color: '#FFFF00' },  // Yellow
  'NGV': { label: 'Non-Government Exclusive',    color: '#00CC00' },  // Green
  'SHR': { label: 'Shared Primary Govt',         color: '#0066FF' },  // Blue
  'SHN': { label: 'Shared Non-Govt Primary',     color: '#99FF99' },  // Light green
  'GOV_SEC': { label: 'Govt Secondary',          color: '#FFFF99' },  // Light yellow
}
```

**Core allocation data (build the full array — include at minimum these entries):**

```typescript
export const FREQUENCY_ALLOCATIONS: FrequencyAllocation[] = [
  // VHF MILITARY TACTICAL (30-88 MHz)
  { id: 'vhf-mil-01', band_id: 'VHF', service_name: 'Military Mobile (NATO Tactical)', service_code: 'MIL',
    freq_low_hz: 30e6, freq_high_hz: 88e6, country: 'BOTH', priority: 'PRIMARY',
    category: 'MIL', color_hex: '#8B4513', military: true,
    notes: 'VHF-FM tactical comms, SINCGARS, Bowman radios' },
  // VHF AVIATION (108-137 MHz)
  { id: 'vhf-avn-01', band_id: 'VHF', service_name: 'Aeronautical Radionavigation (VOR/ILS/MB)', service_code: 'ARN',
    freq_low_hz: 108e6, freq_high_hz: 118e6, country: 'BOTH', priority: 'PRIMARY',
    category: 'ARN', color_hex: '#8B0000', military: false, notes: 'VOR, ILS Localizer, Marker Beacons' },
  { id: 'vhf-avn-02', band_id: 'VHF', service_name: 'Aeronautical Mobile Route (ATC Voice)', service_code: 'AMR',
    freq_low_hz: 118e6, freq_high_hz: 137e6, country: 'BOTH', priority: 'PRIMARY',
    category: 'AMR', color_hex: '#228B22', military: true, notes: 'ATC voice, military guard 121.5 MHz' },
  // VHF MARITIME (156-174 MHz)
  { id: 'vhf-mar-01', band_id: 'VHF', service_name: 'Maritime Mobile (VHF Marine)', service_code: 'MM',
    freq_low_hz: 156e6, freq_high_hz: 174e6, country: 'BOTH', priority: 'PRIMARY',
    category: 'MM', color_hex: '#008080', military: false, notes: 'Ch16 distress 156.8 MHz, AIS 161.975/162.025 MHz' },

  // UHF GPS L-BANDS
  { id: 'uhf-gps-l1', band_id: 'UHF', service_name: 'GPS L1 (1575.42 MHz)', service_code: 'RNS',
    freq_low_hz: 1563e6, freq_high_hz: 1587e6, country: 'BOTH', priority: 'PRIMARY',
    category: 'RNS', color_hex: '#9932CC', military: true, notes: 'GPS L1 C/A + P(Y), SBAS, Galileo E1, BeiDou B1C' },
  { id: 'uhf-gps-l2', band_id: 'UHF', service_name: 'GPS L2 (1227.60 MHz)', service_code: 'RNS',
    freq_low_hz: 1215e6, freq_high_hz: 1240e6, country: 'BOTH', priority: 'PRIMARY',
    category: 'RNS', color_hex: '#9932CC', military: true, notes: 'GPS L2C + L2P(Y) military encrypted' },
  { id: 'uhf-gps-l5', band_id: 'UHF', service_name: 'GPS L5 / Galileo E5a (1176.45 MHz)', service_code: 'RNS',
    freq_low_hz: 1164e6, freq_high_hz: 1188e6, country: 'BOTH', priority: 'PRIMARY',
    category: 'RNS', color_hex: '#9932CC', military: true, notes: 'GPS L5, Galileo E5a, safety-of-life' },
  { id: 'uhf-glonass', band_id: 'UHF', service_name: 'GLONASS L1 (1598-1606 MHz)', service_code: 'RNS',
    freq_low_hz: 1593e6, freq_high_hz: 1610e6, country: 'BOTH', priority: 'PRIMARY',
    category: 'RNS', color_hex: '#9932CC', military: true, notes: 'Russian GLONASS constellation' },
  // UHF DME/TACAN
  { id: 'uhf-dme', band_id: 'UHF', service_name: 'Aeronautical Radionavigation (DME/TACAN)', service_code: 'ARN',
    freq_low_hz: 960e6, freq_high_hz: 1215e6, country: 'BOTH', priority: 'PRIMARY',
    category: 'ARN', color_hex: '#8B0000', military: true, notes: 'DME 962-1213 MHz, TACAN military' },
  // UHF SATELLITE COMMS
  { id: 'uhf-milsat', band_id: 'UHF', service_name: 'UHF Military SATCOM (240-315 MHz)', service_code: 'MIL',
    freq_low_hz: 240e6, freq_high_hz: 315e6, country: 'BOTH', priority: 'PRIMARY',
    category: 'MIL', color_hex: '#8B4513', military: true, notes: 'Legacy military SATCOM, FLTSATCOM, UHF Follow-On' },
  // UHF DRONE CONTROL
  { id: 'uhf-drone-900', band_id: 'UHF', service_name: 'ISM 915 MHz (Drone Control)', service_code: 'ISM',
    freq_low_hz: 902e6, freq_high_hz: 928e6, country: 'US', priority: 'SECONDARY',
    category: 'ISM', color_hex: '#808080', military: false, notes: 'Common drone RC control band (US only), LoRa telemetry' },
  { id: 'uhf-drone-2400', band_id: 'UHF', service_name: 'ISM 2.4 GHz (Drone Control/Video)', service_code: 'ISM',
    freq_low_hz: 2400e6, freq_high_hz: 2484e6, country: 'BOTH', priority: 'SECONDARY',
    category: 'ISM', color_hex: '#808080', military: false, notes: 'WiFi, drone RC control, FPV video. High jamming vulnerability' },

  // SHF RADAR
  { id: 'shf-xband', band_id: 'SHF', service_name: 'X-Band Radar (Targeting/SAR)', service_code: 'RL',
    freq_low_hz: 8500e6, freq_high_hz: 10500e6, country: 'BOTH', priority: 'PRIMARY',
    category: 'RL', color_hex: '#B8860B', military: true, notes: 'X-band fire control, targeting pods, SAR imaging, AESA fire control' },
  { id: 'shf-sband', band_id: 'SHF', service_name: 'S-Band Radar (Surveillance)', service_code: 'RL',
    freq_low_hz: 2700e6, freq_high_hz: 3100e6, country: 'BOTH', priority: 'PRIMARY',
    category: 'RL', color_hex: '#B8860B', military: true, notes: 'Airspace surveillance, PAR, MSSR, Patriot AN/MPQ-65' },
  { id: 'shf-cband', band_id: 'SHF', service_name: 'C-Band Radar / UAV Video', service_code: 'RL',
    freq_low_hz: 5400e6, freq_high_hz: 5900e6, country: 'BOTH', priority: 'PRIMARY',
    category: 'RL', color_hex: '#B8860B', military: false, notes: '5.8 GHz ISM = FPV drone video; C-band also surface search radar' },
  { id: 'shf-kuband', band_id: 'SHF', service_name: 'Ku-Band SATCOM (Drone Data Link)', service_code: 'SAT',
    freq_low_hz: 10700e6, freq_high_hz: 18100e6, country: 'BOTH', priority: 'PRIMARY',
    category: 'SAT', color_hex: '#191970', military: true, notes: 'MQ-9 Reaper primary data link, BLOS via Ku-band satellite' },
  // SHF MILLIMETER WAVE
  { id: 'shf-kaband', band_id: 'SHF', service_name: 'Ka-Band SATCOM (HTS)', service_code: 'SAT',
    freq_low_hz: 18100e6, freq_high_hz: 30000e6, country: 'BOTH', priority: 'PRIMARY',
    category: 'SAT', color_hex: '#191970', military: true, notes: 'High-throughput military sat, wideband GaN drone ISR' },

  // EHF AEHF
  { id: 'ehf-aehf', band_id: 'EHF', service_name: 'EHF Military SATCOM (AEHF)', service_code: 'MIL',
    freq_low_hz: 43500e6, freq_high_hz: 45500e6, country: 'US', priority: 'PRIMARY',
    category: 'MIL', color_hex: '#8B4513', military: true, notes: 'AEHF Uplink. LPI/LPD nuclear survivable comms. Milstar successor' },
  { id: 'ehf-aehf-dl', band_id: 'EHF', service_name: 'EHF AEHF Downlink (20.2-21.2 GHz)', service_code: 'MIL',
    freq_low_hz: 20200e6, freq_high_hz: 21200e6, country: 'US', priority: 'PRIMARY',
    category: 'MIL', color_hex: '#8B4513', military: true, notes: 'AEHF/WGS downlink. Protected nuclear tactical comms' },

  // INFRARED — DEW systems
  { id: 'ir-flir', band_id: 'INFRARED', service_name: 'LWIR Thermal Imaging (8-14μm)', service_code: 'DEW',
    freq_low_hz: 21e12, freq_high_hz: 37e12, country: 'BOTH', priority: 'PRIMARY',
    category: 'DEW', color_hex: '#FF4500', military: true, notes: 'FLIR targeting pods, Predator/Reaper MTSB ball, fire control' },
  { id: 'ir-laser-dew', band_id: 'INFRARED', service_name: 'High-Energy Laser DEW (1064nm / 1μm Nd:YAG)', service_code: 'DEW',
    freq_low_hz: 280e12, freq_high_hz: 300e12, country: 'BOTH', priority: 'PRIMARY',
    category: 'DEW', color_hex: '#FF4500', military: true,
    notes: 'Iron Beam 100kW HEL, HELIOS, DragonFire. Defeats drones via thermal/structural damage. $3/shot effective cost' },
  { id: 'ir-laser-co2', band_id: 'INFRARED', service_name: 'CO₂ Laser DEW (10.6μm)', service_code: 'DEW',
    freq_low_hz: 28e12, freq_high_hz: 29e12, country: 'BOTH', priority: 'PRIMARY',
    category: 'DEW', color_hex: '#FF4500', military: true, notes: 'CO2 high-power laser, atmospheric propagation issues at long range' },

  // VISIBLE — EO systems
  { id: 'vis-eo', band_id: 'VISIBLE', service_name: 'EO/CCD Imaging (380-700nm)', service_code: 'DEW',
    freq_low_hz: 430e12, freq_high_hz: 770e12, country: 'BOTH', priority: 'PRIMARY',
    category: 'DEW', color_hex: '#FF4500', military: true, notes: 'Drone EO cameras, satellite EO imagery, laser designators (532nm green)' },

  // UV — missile warning
  { id: 'uv-maws', band_id: 'UV', service_name: 'UV Missile Approach Warning (MAWS)', service_code: 'DEW',
    freq_low_hz: 750e12, freq_high_hz: 1500e12, country: 'BOTH', priority: 'PRIMARY',
    category: 'DEW', color_hex: '#FF4500', military: true,
    notes: 'Detects rocket motor UV plume against solar-blind background. AAR-54, MILDS AN/AAQ-24' },

  // GNSS tile — all GNSS sub-bands
  { id: 'gnss-gps-l1', band_id: 'GNSS', service_name: 'GPS L1 C/A (1575.42 MHz)', service_code: 'RNS',
    freq_low_hz: 1574e6, freq_high_hz: 1577e6, country: 'BOTH', priority: 'PRIMARY',
    category: 'RNS', color_hex: '#9932CC', military: false, notes: 'Primary civilian GPS. Spoofing and jamming vulnerability HIGH' },
  { id: 'gnss-gps-l1p', band_id: 'GNSS', service_name: 'GPS L1 P(Y) Military (1575.42 MHz)', service_code: 'MIL',
    freq_low_hz: 1574e6, freq_high_hz: 1577e6, country: 'US', priority: 'PRIMARY',
    category: 'MIL', color_hex: '#8B4513', military: true, notes: 'Encrypted military GPS signal. Anti-spoofing enabled' },
  { id: 'gnss-gps-l2', band_id: 'GNSS', service_name: 'GPS L2 P(Y) Military (1227.60 MHz)', service_code: 'MIL',
    freq_low_hz: 1226e6, freq_high_hz: 1229e6, country: 'US', priority: 'PRIMARY',
    category: 'MIL', color_hex: '#8B4513', military: true, notes: 'Second military GPS frequency. Dual-freq reduces ionospheric error' },
  { id: 'gnss-gps-l5', band_id: 'GNSS', service_name: 'GPS L5 (1176.45 MHz)', service_code: 'RNS',
    freq_low_hz: 1175e6, freq_high_hz: 1178e6, country: 'BOTH', priority: 'PRIMARY',
    category: 'RNS', color_hex: '#9932CC', military: false, notes: 'Safety-of-life aviation, also Galileo E5a' },
  { id: 'gnss-galileo-e1', band_id: 'GNSS', service_name: 'Galileo E1 (1575.42 MHz)', service_code: 'RNS',
    freq_low_hz: 1559e6, freq_high_hz: 1591e6, country: 'BOTH', priority: 'PRIMARY',
    category: 'RNS', color_hex: '#6A0DAD', military: false, notes: 'EU Galileo constellation, overlaps GPS L1 for interoperability' },
  { id: 'gnss-beidou-b1', band_id: 'GNSS', service_name: 'BeiDou B1C (1575.42 MHz)', service_code: 'RNS',
    freq_low_hz: 1574e6, freq_high_hz: 1577e6, country: 'BOTH', priority: 'PRIMARY',
    category: 'RNS', color_hex: '#CC0000', military: false, notes: 'Chinese BeiDou-3 B1C. Drone jammers must cover all 4 constellations' },
  { id: 'gnss-glonass-l1', band_id: 'GNSS', service_name: 'GLONASS L1 (1598-1606 MHz)', service_code: 'RNS',
    freq_low_hz: 1598e6, freq_high_hz: 1610e6, country: 'BOTH', priority: 'PRIMARY',
    category: 'RNS', color_hex: '#DC143C', military: false, notes: 'Russian GLONASS FDMA signals. Used by FPV drones for navigation' },
]
```

---

## SUPABASE CHECK — First thing Cursor must do

Before writing the tile UI, query Supabase to see what spectrum-related tables exist. Run:

```sql
-- Check existing tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name ILIKE '%spectrum%' OR table_name ILIKE '%frequency%' OR table_name ILIKE '%allocation%';

-- Check platforms table for frequency columns
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'platforms' ORDER BY column_name;
```

If a `platform_frequencies` table already exists, read its schema and seed data, then extend it.
If not, create it with this migration:

```sql
-- Add to existing migration or create new one
CREATE TABLE IF NOT EXISTS platform_frequencies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  platform_id uuid REFERENCES platforms(id) ON DELETE CASCADE,
  band_id text NOT NULL,          -- 'VHF', 'UHF', etc.
  freq_hz numeric NOT NULL,       -- Centre frequency in Hz
  freq_low_hz numeric,            -- Bandwidth low
  freq_high_hz numeric,           -- Bandwidth high
  link_type text NOT NULL,        -- 'CONTROL' | 'VIDEO' | 'TELEMETRY' | 'GNSS' | 'EW' | 'RADAR' | 'COMMS' | 'DEW'
  is_jamming_source boolean DEFAULT false,
  jamming_bandwidth_hz numeric,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Seed key platform frequencies
INSERT INTO platform_frequencies (platform_id, band_id, freq_hz, freq_low_hz, freq_high_hz, link_type, is_jamming_source, notes) 
SELECT p.id, 'UHF', 5800e6, 5725e6, 5875e6, 'VIDEO', false, 'FPV 5.8 GHz video downlink'
FROM platforms p WHERE p.name ILIKE '%FPV%' OR p.name ILIKE '%Shahed%'
ON CONFLICT DO NOTHING;
-- Add similar seeds for MQ-9 Ku-band, TB-2 Ku-band, etc.
```

---

## TILE UI SPEC — `components/spectrum/BandTile.tsx`

Each tile renders as a card with:

```
┌─────────────────────────────────────────────────────┐
│  [Higgsfield image as background, opacity controlled] │
│  ┌──────────────────────────────────────────────────┐ │
│  │ [BAND NAME]     [FREQ RANGE]     [WAVELENGTH]    │ │ ← header bar rgba(10,10,15,0.85)
│  │ VHF             30–300 MHz       1–10 m          │ │   JetBrains Mono for numbers
│  └──────────────────────────────────────────────────┘ │
│                                                         │
│  [Allocation SVG overlay — coloured sub-band bars]    │
│  [Platform frequency pins — cyan dots with labels]    │
│  [Jamming coverage — red/orange sweep arcs]          │
│                                                         │
│  ┌──────────────────────────────────────────────────┐ │
│  │ ☑ Show  [───●────] Opacity  [⊕ Zoom]  [★ Mil]   │ │ ← controls bar
│  └──────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

Tile dimensions: `min-h-[280px]` desktop, `min-h-[200px]` mobile. Grid: `grid-cols-1 md:grid-cols-2 xl:grid-cols-3` wrapping layout. GNSS tile spans 2 columns at xl.

**Allocation SVG overlay:**
- Horizontal frequency scale bar across tile width
- Each allocation block = coloured rectangle, width proportional to bandwidth (log scale)
- On hover: tooltip shows service name, freq range, priority, country flag emoji
- AUS/US toggle switches entire overlay dataset
- Category filter chips hide/show categories

**Platform frequency pins:**
- Cyan vertical line at the platform's centre freq
- Small drone/platform icon above the line (from platformType)
- Hover: "MQ-9 Reaper — Ku-band 14.5 GHz data link"
- If `is_jamming_source = true`: orange sweep arc showing jamming bandwidth (semi-transparent, 30% opacity)

**Jamming conflict visualization:**
- When a jamming-capable platform is selected in the UI, ALL tiles affected show a warning glow
- Affected allocations within the jamming band turn orange with a "JAMMED" label
- Shows what other services in the band are affected by the jammer

---

## LAYOUT INTEGRATION

Spectrum View sits within the global sidebar layout (NOT full-bleed unlike /map).

`app/spectrum/page.tsx`:
```tsx
import { SpectrumView } from '@/components/spectrum/SpectrumView'

export default function SpectrumPage() {
  return (
    <div className="flex flex-col h-full">
      {/* Classification banner — non-removable */}
      <div className="w-full bg-amber-900/50 border-b border-amber-700 text-amber-300 
                      text-xs text-center py-1 font-mono tracking-wider flex-shrink-0">
        UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
      </div>
      <SpectrumView />
    </div>
  )
}
```

---

## GLOBAL STATE — `hooks/useSpectrumState.ts`

```typescript
// Manages tile visibility, transparency, zoom modal state, AUS/US toggle, category filters
// Use React context or zustand — no server state needed here
// Persist AUS/US preference and visible tiles to localStorage

const DEFAULT_STATE: SpectrumTileState[] = SPECTRUM_BANDS.map(b => ({
  band_id: b.id,
  visible: true,
  transparency: 0.85,
  zoomed: false,
}))
```

---

## SERVER COMPONENT — `hooks/useSpectrumData.ts`

Fetch platform frequencies from Supabase. This hook is for client-side use; create a corresponding server action in `app/actions/spectrum.ts`:

```typescript
// app/actions/spectrum.ts
'use server'
import { createClient } from '@/utils/supabase/server'

export async function getPlatformFrequencies() {
  const supabase = createClient()
  const { data } = await supabase
    .from('platform_frequencies')
    .select(`
      *,
      platforms (
        id, name, platform_type, country_of_origin
      )
    `)
  return data ?? []
}
```

---

## TILE ZOOM MODAL — `components/spectrum/TileZoomModal.tsx`

Full-screen modal that expands a single tile. Shows:
- Full-resolution Higgsfield background image
- Detailed allocation chart with all sub-bands labelled
- All platforms using this band in a side panel
- Jamming analysis: which bands conflict, what gets affected
- ACMA/NTIA official allocation table (scrollable)
- Close button top-right

---

## GNSS TILE SPECIAL BEHAVIOUR

The GNSS tile gets extra treatment beyond the standard allocation overlay:

1. Shows all 4 constellations (GPS, GLONASS, Galileo, BeiDou) as distinct colour lanes
2. Shows current jamming threat status (link to GNSS Intelligence module data)
3. Has a "View in GNSS Intelligence →" button that navigates to `/gnss`
4. Shows jammer effectiveness per constellation (table):
   - GPS L1: vulnerability HIGH (civilian C/A unencrypted)
   - GPS P(Y): vulnerability LOW (encrypted, anti-spoof)
   - GLONASS L1: vulnerability HIGH
   - Galileo E1: vulnerability HIGH
   - BeiDou B1C: vulnerability HIGH
5. Spoofing attack diagram — signal injection at the correct frequency

---

## IMAGE PATHS

Save the Higgsfield-generated images to `/public/spectrum/` with these exact filenames:

```
band-vhf.webp        ← VHF military tactical comms
band-uhf.webp        ← UHF drone swarm + GPS constellation
band-shf.webp        ← SHF AESA radar + Ku satellite
band-gnss.webp       ← GNSS jamming/spoofing visualization
band-hf.webp         ← HF skywave OTH radar
band-infrared.webp   ← IR thermal FLIR + Iron Beam DEW
band-ehf.webp        ← EHF millimeter wave AEHF satellite
band-visible.webp    ← EO targeting + laser designator
band-vlf.webp        ← VLF submarine communications
band-lf-mf.webp      ← LF/MF maritime navigation (one image for both tiles)
band-uv.webp         ← UV missile warning MAWS
band-xray-gamma.webp ← X-Ray/Gamma CBRN (one image for both tiles)
```

If an image doesn't exist for a tile, use a CSS gradient fallback:
```css
background: linear-gradient(135deg, #0A0A0F 0%, #0F1A2B 50%, #0A0A0F 100%);
```

---

## DEW MARKERS ON OPTICAL TILES

For Infrared and Visible tiles:
- If any platform in `platform_frequencies` has `link_type = 'DEW'`, render a special DEW marker
- DEW marker: orange laser beam icon + power output label (e.g., "100 kW")
- Hover shows: system name, wavelength, effective range, Pk vs drone (from defeat_effectiveness table)
- Iron Beam: 1064nm, 100kW, >1km effective range vs small UAS
- DragonFire (UK): 10kW, 1km+
- HELIOS (US Navy): 60kW

---

## CRITICAL DON'T DO LIST

- DO NOT put SUPABASE_SERVICE_ROLE_KEY in any client component
- DO NOT import `@supabase/auth-helpers-nextjs` — use `@supabase/ssr` only  
- DO NOT use D3.js for the allocation bars — use plain SVG or CSS flexbox; D3 is only for the legacy chart being removed
- DO NOT use `useEffect` to fetch — use Server Actions and React Server Components where possible
- DO NOT hardcode freq display as raw Hz — always format with `formatFreq(hz: number): string` helper:
  ```typescript
  function formatFreq(hz: number): string {
    // 1575420000 → '1,575.42 MHz' (always JetBrains Mono)
    if (hz >= 1e12) return `${(hz/1e12).toFixed(3)} THz`
    if (hz >= 1e9) return `${(hz/1e9).toFixed(3)} GHz`
    if (hz >= 1e6) return `${(hz/1e6).toFixed(3)} MHz`
    if (hz >= 1e3) return `${(hz/1e3).toFixed(1)} kHz`
    return `${hz.toFixed(0)} Hz`
  }
  ```

---

## FILE CREATION ORDER

Build in this sequence to avoid import errors:

1. `types/spectrum.ts`
2. `lib/data/acma-categories.ts` + `lib/data/ntia-categories.ts`  
3. `lib/data/spectrum-bands.ts`
4. `lib/data/frequency-allocations.ts`
5. Supabase migration SQL (check what exists first)
6. `app/actions/spectrum.ts` (server action)
7. `hooks/useSpectrumState.ts`
8. `components/spectrum/BandControls.tsx`
9. `components/spectrum/AllocationLayer.tsx`
10. `components/spectrum/PlatformMarker.tsx`
11. `components/spectrum/JammingOverlay.tsx`
12. `components/spectrum/BandTile.tsx`
13. `components/spectrum/TileZoomModal.tsx`
14. `components/spectrum/CountryToggle.tsx`
15. `components/spectrum/CategoryFilter.tsx`
16. `components/spectrum/SpectrumView.tsx`
17. `app/spectrum/page.tsx` (replace existing)

Delete `components/spectrum/SpectrumChart.tsx` (or whatever the old D3 component is named) once the new page works.

---

*Generated for SPECTRAL platform — OSINT only, no classified sources*  
*Classification: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY*
