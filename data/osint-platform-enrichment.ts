/**
 * Canonical OSINT enrichment records — Jun 2026 deep-dive
 * CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 *
 * Used to drive Supabase migrations and seed file updates.
 * Confidence per NATO/Five Eyes intelligence standards (09-intelligence-standards).
 */

export type OsintConfidence = 'confirmed' | 'assessed' | 'estimated' | 'reported';

export interface OsintPlatformRecord {
  id: string;
  /** Supabase id if different from seed id */
  supabase_id?: string;
  confidence: OsintConfidence;
  sources: string[];
  date_of_information: string;
  updates: Partial<{
    length_m: number;
    wingspan_m: number;
    height_m: number;
    mtow_kg: number;
    mass_kg: number;
    range_km: number;
    max_speed_kmh: number;
    terminal_speed_kmh: number;
    armor_piercing_mm: number;
    warhead_kg: number;
    endurance_hrs: number;
    unit_cost_usd: number;
    ioc_year: number;
    engine_type: string;
    sensor_suite: string[];
    stealth_features: string[];
  }>;
  capability_notes?: string[];
}

export const OSINT_ENRICHMENT: OsintPlatformRecord[] = [
  {
    id: 'bayraktar-tb2',
    supabase_id: 'tb2-bayraktar',
    confidence: 'assessed',
    sources: ['Deagel — Bayraktar TB2', 'Baykar public datasheet'],
    date_of_information: '2026-06-08',
    updates: {
      length_m: 6.5,
      wingspan_m: 12,
      height_m: 2.2,
      mtow_kg: 650,
      mass_kg: 650,
      endurance_hrs: 27,
      unit_cost_usd: 5_000_000,
      ioc_year: 2016,
      engine_type: 'Rotax 912 iS (piston, pusher)',
    },
    capability_notes: [
      'C-band LOS datalink — primary tactical C2',
      'Optional Ku-band SATCOM on export variants',
      'EO/IR + laser designator for MAM-L/C',
    ],
  },
  {
    id: 'lancet-3',
    confidence: 'assessed',
    sources: ['Deagel — Zala Lancet', 'OSINT: Oryx Ukraine losses'],
    date_of_information: '2026-06-08',
    updates: {
      mtow_kg: 12,
      warhead_kg: 3,
      range_km: 40,
      max_speed_kmh: 110,
      terminal_speed_kmh: 300,
      armor_piercing_mm: 300,
      endurance_hrs: 0.67,
      ioc_year: 2019,
      engine_type: 'electric (twin contra-rotating pusher)',
    },
    capability_notes: [
      '2.4 GHz C2 + 5.8 GHz video in cruise',
      'EO terminal seeker — 300 km/h impact speed',
      '300 mm armour penetration (Deagel performance table)',
    ],
  },
  {
    id: 'shahed-136',
    confidence: 'confirmed',
    sources: ['OSMP — Shahed-136 entry', 'ARES engine identification'],
    date_of_information: '2026-06-08',
    updates: {
      length_m: 3.5,
      wingspan_m: 2.5,
      warhead_kg: 50,
      engine_type: 'Mado MD550 Wankel rotary',
      range_km: 2500,
    },
    capability_notes: [
      'GNSS + INS pre-programmed — no C2 in cruise',
      'Gen 4: CRPA anti-jam, LTE RTK, Jetson Orin MWIR terminal',
      'Warhead variants reported up to 90 kg (Estimated — Ukraine field reporting)',
    ],
  },
  {
    id: 'mq-9-reaper',
    confidence: 'assessed',
    sources: ['Airforce Technology — MQ-9', 'GA-ASI / USAF fact sheet'],
    date_of_information: '2026-06-08',
    updates: {
      sensor_suite: ['Lynx SAR/GMTI', 'ASIP SIGINT', 'RDESS ESM', 'MTS-B EO/IR'],
    },
    capability_notes: [
      'Ku-band SATCOM primary BLOS C2',
      'C-band LOS ~150 nm',
      'ASIP passive SIGINT 500 MHz–18 GHz',
      'RDESS stand-off ESM geo',
    ],
  },
  {
    id: 'tb3',
    confidence: 'assessed',
    sources: ['Deagel — Bayraktar TB3 (under development)'],
    date_of_information: '2026-06-08',
    updates: {
      length_m: 8.4,
      wingspan_m: 14,
      height_m: 2.6,
      mass_kg: 1450,
      engine_type: 'turboprop (assessed — carrier MALE)',
    },
  },
];

/** Batch OSINT records for catalogue expansion — Jun 2026 */
export const CATALOGUE_OSINT_RECORDS: OsintPlatformRecord[] = [
  {
    id: 'shahed-129',
    confidence: 'assessed',
    sources: ['Military Factory — HESA Shahed-129', 'GlobalSecurity'],
    date_of_information: '2026-06-12',
    updates: { range_km: 1700, mass_kg: 450, warhead_kg: 40, ioc_year: 2012 },
    capability_notes: ['Sadid-1/345 missile armament — different kill chain to Shahed-136'],
  },
  {
    id: 'mohajer-6',
    confidence: 'assessed',
    sources: ['Military Factory — Qods Mohajer-6', 'ODIN WEG'],
    date_of_information: '2026-06-12',
    updates: { range_km: 200, mass_kg: 600, warhead_kg: 40 },
  },
  {
    id: 'gerbera-parody',
    confidence: 'reported',
    sources: ['Oryx — decoy OWA tracking', 'Conflict analytics'],
    date_of_information: '2026-06-12',
    updates: { range_km: 500 },
    capability_notes: ['Decoy saturation — RF signature defeat problem distinct from Shahed'],
  },
  {
    id: 'bayraktar-kizilelma',
    confidence: 'assessed',
    sources: ['Military Factory — Bayraktar Kizilelma'],
    date_of_information: '2026-06-12',
    updates: { range_km: 900, max_speed_kmh: 900, mass_kg: 5500 },
  },
  {
    id: 'tb-001',
    confidence: 'assessed',
    sources: ['SPECTRAL_INTEL_UPDATE_2025', 'Taiwan ADIZ OSINT'],
    date_of_information: '2026-06-12',
    updates: { range_km: 6000, mass_kg: 2800 },
    capability_notes: ['Map Intel combat envelope capped at 1500 km — not raw ferry'],
  },
];

/** Map seed platform id → Supabase platform id where they diverge. */
export const PLATFORM_ID_ALIASES: Record<string, string> = {
  'bayraktar-tb2': 'tb2-bayraktar',
  'wing-loong-ii': 'wing-loong-2',
};

export const OSINT_ENRICHMENT_ALL: OsintPlatformRecord[] = [
  ...OSINT_ENRICHMENT,
  ...CATALOGUE_OSINT_RECORDS,
];
