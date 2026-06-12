/**
 * SPECTRAL Intelligence Update 2025-06-07
 * Full source document: docs/SPECTRAL_INTEL_UPDATE_2025.md
 *
 * Database seed: supabase/migrations/004_intel_update_2025.sql
 */

export const INTEL_UPDATE_2025_META = {
  date: '2026-06-07',
  docPath: 'docs/SPECTRAL_INTEL_UPDATE_2025.md',
  classification: 'UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY',
  confidenceStandard: 'NATO (Confirmed / Assessed / Estimated / Reported / Suspected)',
} as const

/** Platform IDs added or updated in this intel tranche */
export const INTEL_2025_PLATFORM_IDS = [
  'uj-22-airborne',
  'uj-26-bober',
  'baba-yaga',
  'vampire',
  'kazhan',
  'fpv-interceptor',
  'v2u',
  'rotem-l',
  'kargu-2',
  'alpagu',
  'wing-loong-1',
  'wing-loong-2',
  'ch-4-rainbow',
  'ch-5-rainbow',
  'tb-001',
  'mq-1c-gray-eagle',
  'rq-7b-shadow',
  'mq-25-stingray',
  'anduril-anvil',
  'skydio-x10d',
] as const

/** Defeat system IDs added or updated in this intel tranche */
export const INTEL_2025_DEFEAT_SYSTEM_IDS = [
  'iron-beam',
  'lite-beam',
  'dragonfire',
  'pulsar-l',
  'pulsar-v',
  'anvil-interceptor',
  'anduril-anvil',
  'dronesentry-sentrycs',
  'jco-swarm-kit',
] as const

/** Documented defeat matrix special cases — see §4 defeat_effectiveness */
export const INTEL_2025_SPECIAL_CASES = [
  { platform: 'v2u', note: 'RF jamming ineffective — CV/GNSS-free nav' },
  { platform: 'fpv-fibre-optic', note: 'RF jamming IMMUNE — fibre-optic tether' },
  { platform: 'kargu-2', note: 'Swarm saturation degrades single RF jammer to ~20%' },
  { platform: 'gerbera-parody', note: 'Decoy OWA — RF jam effective but kinetic exchange ratio poor' },
  { platform: 'molniya-2-fpv', note: 'Fibre variant RF-immune; RF variant jammable on 2.4/5.8' },
  { platform: 'samad-2', note: 'Maritime OWA — naval CIWS kinetic adjudication primary' },
  { platform: 'houthi-owa-maritime', note: 'Red Sea anti-ship profile — SeaRAM/Goalkeeper lesson set' },
  { platform: '*', system: 'iron-beam', note: '~90% DEW — weather-limited' },
  { platform: '*', system: 'goalkeeper-ciws', note: 'Last-ditch naval PD — magazine depth vs saturation' },
  { platform: '*', system: 'searam', note: '~9 km envelope — Red Sea HVU benchmark' },
] as const
