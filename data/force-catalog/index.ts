/**
 * Force Catalogue — aggregation index.
 * Add a nation: create `data/force-catalog/<nation>.ts` exporting
 * `ForceCatalogPlatformFull[]`, then register it here + add its CatalogNation row.
 * OSINT only. See README.md for the ingestion quality bar.
 */

import type {
  CatalogNation,
  ForceCatalogBundle,
  ForceCatalogPlatformFull,
} from '@/lib/bmi/bmi-types'
import { catalogToCommsFit } from '@/lib/bmi/bmi-types'
import { AUSTRALIA_CATALOG } from '@/data/force-catalog/australia'
import { USA_CATALOG } from '@/data/force-catalog/usa'
import { CHINA_CATALOG } from '@/data/force-catalog/china'
import { RUSSIA_CATALOG } from '@/data/force-catalog/russia'
import { NORTH_KOREA_CATALOG } from '@/data/force-catalog/north-korea'
import { UK_CATALOG } from '@/data/force-catalog/united-kingdom'
import { JAPAN_CATALOG } from '@/data/force-catalog/japan'
import { UKRAINE_CATALOG } from '@/data/force-catalog/ukraine'
import { XCC_CATALOG } from '@/data/force-catalog/conflict-capability-classes'
import { CONFLICT_THEATRES_CATALOG } from '@/data/force-catalog/conflict-theatres'
import { HOUTHI_CATALOG } from '@/data/force-catalog/houthi'
import { IRAN_CATALOG } from '@/data/force-catalog/iran'
import { HEZBOLLAH_CATALOG } from '@/data/force-catalog/hezbollah'
import { HAMAS_CATALOG } from '@/data/force-catalog/hamas'
import { WAGNER_CATALOG } from '@/data/force-catalog/wagner'
import { ISIS_CATALOG } from '@/data/force-catalog/isis'
import { INDIA_CATALOG } from '@/data/force-catalog/india'
import { PAKISTAN_CATALOG } from '@/data/force-catalog/pakistan'
import { ISRAEL_CATALOG } from '@/data/force-catalog/israel'
import { EGYPT_CATALOG } from '@/data/force-catalog/egypt'
import { KOREA_CATALOG } from '@/data/force-catalog/south-korea'
import { SINGAPORE_CATALOG } from '@/data/force-catalog/singapore'
import { FRANCE_CATALOG } from '@/data/force-catalog/france'
import { GERMANY_CATALOG } from '@/data/force-catalog/germany'
import { SPAIN_CATALOG } from '@/data/force-catalog/spain'
import { INDONESIA_CATALOG } from '@/data/force-catalog/indonesia'
import { THAILAND_CATALOG } from '@/data/force-catalog/thailand'
import { PHILIPPINES_CATALOG } from '@/data/force-catalog/philippines'
import { PNG_CATALOG } from '@/data/force-catalog/papua-new-guinea'
import { NEW_ZEALAND_CATALOG } from '@/data/force-catalog/new-zealand'
import { CANADA_CATALOG } from '@/data/force-catalog/canada'
import { MALAYSIA_CATALOG } from '@/data/force-catalog/malaysia'
import { FINLAND_CATALOG } from '@/data/force-catalog/finland'
import { SWEDEN_CATALOG } from '@/data/force-catalog/sweden'

/** Nation registry with alliance/bloc tags for Blue/Red + NATO/Indo-Pacific filtering. */
export const CATALOG_NATIONS: CatalogNation[] = [
  // Core 7
  { code: 'AUS', name: 'Australia', force_side: 'blue', blocs: ['FiveEyes', 'Indo-Pacific'], region: 'Oceania' },
  { code: 'USA', name: 'United States', force_side: 'blue', blocs: ['NATO', 'FiveEyes', 'Indo-Pacific'], region: 'North America' },
  { code: 'CHN', name: 'China', force_side: 'red', blocs: ['CRINK'], region: 'East Asia' },
  { code: 'RUS', name: 'Russia', force_side: 'red', blocs: ['CRINK'], region: 'Eurasia' },
  { code: 'PRK', name: 'North Korea', force_side: 'red', blocs: ['CRINK'], region: 'East Asia' },
  { code: 'GBR', name: 'United Kingdom', force_side: 'blue', blocs: ['NATO', 'FiveEyes'], region: 'Europe' },
  { code: 'JPN', name: 'Japan', force_side: 'blue', blocs: ['Indo-Pacific'], region: 'East Asia' },
  // Conflict track
  { code: 'UKR', name: 'Ukraine', force_side: 'blue', blocs: ['Non-aligned'], region: 'Europe' },
  { code: 'XCC', name: 'Conflict Capability Classes', force_side: 'neutral', blocs: ['Non-state'], region: 'Global' },
  { code: 'XTH', name: 'Conflict Theatre Lessons', force_side: 'neutral', blocs: ['Non-state'], region: 'Global' },
  { code: 'HOU', name: 'Ansar Allah (Houthi)', force_side: 'red', blocs: ['Non-state'], region: 'Middle East' },
  { code: 'IRN', name: 'Iran', force_side: 'red', blocs: ['CRINK'], region: 'Middle East' },
  { code: 'HEZ', name: 'Hezbollah', force_side: 'red', blocs: ['Non-state'], region: 'Middle East' },
  { code: 'HMS', name: 'Hamas / PIJ', force_side: 'red', blocs: ['Non-state'], region: 'Middle East' },
  { code: 'WAG', name: 'Wagner / Africa Corps', force_side: 'red', blocs: ['Non-state'], region: 'Global' },
  { code: 'ISI', name: 'ISIS (historical)', force_side: 'red', blocs: ['Non-state'], region: 'Middle East' },
  // N1
  { code: 'IND', name: 'India', force_side: 'neutral', blocs: ['Non-aligned', 'Indo-Pacific'], region: 'South Asia' },
  { code: 'PAK', name: 'Pakistan', force_side: 'red', blocs: ['Non-aligned'], region: 'South Asia' },
  { code: 'ISR', name: 'Israel', force_side: 'blue', blocs: ['Non-aligned'], region: 'Middle East' },
  { code: 'EGY', name: 'Egypt', force_side: 'neutral', blocs: ['Non-aligned'], region: 'Middle East / Africa' },
  // N2 Pitch Black / Indo-Pacific
  { code: 'KOR', name: 'South Korea', force_side: 'blue', blocs: ['Indo-Pacific'], region: 'East Asia' },
  { code: 'SGP', name: 'Singapore', force_side: 'blue', blocs: ['Indo-Pacific'], region: 'Southeast Asia' },
  { code: 'FRA', name: 'France', force_side: 'blue', blocs: ['NATO', 'EU', 'Indo-Pacific'], region: 'Europe' },
  { code: 'DEU', name: 'Germany', force_side: 'blue', blocs: ['NATO', 'EU'], region: 'Europe' },
  { code: 'ESP', name: 'Spain', force_side: 'blue', blocs: ['NATO', 'EU'], region: 'Europe' },
  { code: 'IDN', name: 'Indonesia', force_side: 'neutral', blocs: ['Non-aligned', 'Indo-Pacific'], region: 'Southeast Asia' },
  { code: 'THA', name: 'Thailand', force_side: 'neutral', blocs: ['Non-aligned', 'Indo-Pacific'], region: 'Southeast Asia' },
  { code: 'PHL', name: 'Philippines', force_side: 'blue', blocs: ['Indo-Pacific'], region: 'Southeast Asia' },
  { code: 'PNG', name: 'Papua New Guinea', force_side: 'blue', blocs: ['Indo-Pacific'], region: 'Oceania' },
  // N3
  { code: 'NZL', name: 'New Zealand', force_side: 'blue', blocs: ['FiveEyes', 'Indo-Pacific'], region: 'Oceania' },
  { code: 'CAN', name: 'Canada', force_side: 'blue', blocs: ['NATO', 'FiveEyes'], region: 'North America' },
  { code: 'MYS', name: 'Malaysia', force_side: 'neutral', blocs: ['Non-aligned', 'Indo-Pacific'], region: 'Southeast Asia' },
  { code: 'FIN', name: 'Finland', force_side: 'blue', blocs: ['NATO', 'EU'], region: 'Europe' },
  { code: 'SWE', name: 'Sweden', force_side: 'blue', blocs: ['NATO', 'EU'], region: 'Europe' },
]

/** Every catalogue platform, all nations. */
export const FORCE_CATALOG: ForceCatalogPlatformFull[] = [
  ...AUSTRALIA_CATALOG,
  ...USA_CATALOG,
  ...CHINA_CATALOG,
  ...RUSSIA_CATALOG,
  ...NORTH_KOREA_CATALOG,
  ...UK_CATALOG,
  ...JAPAN_CATALOG,
  ...UKRAINE_CATALOG,
  ...XCC_CATALOG,
  ...CONFLICT_THEATRES_CATALOG,
  ...HOUTHI_CATALOG,
  ...IRAN_CATALOG,
  ...HEZBOLLAH_CATALOG,
  ...HAMAS_CATALOG,
  ...WAGNER_CATALOG,
  ...ISIS_CATALOG,
  ...INDIA_CATALOG,
  ...PAKISTAN_CATALOG,
  ...ISRAEL_CATALOG,
  ...EGYPT_CATALOG,
  ...KOREA_CATALOG,
  ...SINGAPORE_CATALOG,
  ...FRANCE_CATALOG,
  ...GERMANY_CATALOG,
  ...SPAIN_CATALOG,
  ...INDONESIA_CATALOG,
  ...THAILAND_CATALOG,
  ...PHILIPPINES_CATALOG,
  ...PNG_CATALOG,
  ...NEW_ZEALAND_CATALOG,
  ...CANADA_CATALOG,
  ...MALAYSIA_CATALOG,
  ...FINLAND_CATALOG,
  ...SWEDEN_CATALOG,
]

export function catalogBundle(side?: 'blue' | 'red' | 'neutral'): ForceCatalogBundle {
  const platforms = side
    ? FORCE_CATALOG.filter((p) => p.force_side === side)
    : FORCE_CATALOG
  const nationCodes = new Set(platforms.map((p) => p.nation_code))
  return {
    nations: CATALOG_NATIONS.filter((n) => nationCodes.has(n.code)),
    platforms,
  }
}

/** Catalogue platforms as comms-fits for the interop / PACE / spectrum engines. */
export function catalogCommsFits(codes?: string[]) {
  const scope = codes
    ? FORCE_CATALOG.filter((p) => codes.includes(p.nation_code))
    : FORCE_CATALOG
  return scope.map(catalogToCommsFit)
}

/** Future-programs view (R&D landscape). */
export const FUTURE_PROGRAMS = FORCE_CATALOG.filter(
  (p) => p.future != null ||
    ['in_development', 'prototype', 'concept', 'ordered'].includes(p.service_status),
)
