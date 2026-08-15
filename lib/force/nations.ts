import type { ForceNation } from '@/lib/force/types'

export const FORCE_NATIONS: ForceNation[] = [
  {
    code: 'AUS',
    name: 'Australia',
    shortName: 'Australia',
    side: 'blue',
    region: 'Indo-Pacific',
    note: 'High-end air and maritime types; limited mass. Default Blue for northern Australia and SCS work-ups.',
  },
  {
    code: 'USA',
    name: 'United States',
    shortName: 'United States',
    side: 'blue',
    region: 'Global / Indo-Pacific',
    note: 'AEW&C, tanker, and fifth-generation density. Pair with AUS/JPN for coalition packages.',
  },
  {
    code: 'GBR',
    name: 'United Kingdom',
    shortName: 'United Kingdom',
    side: 'blue',
    region: 'Euro-Atlantic / Indo-Pacific deployable',
    note: 'Carrier and QRA quality; small inventory. Useful as a coalition increment, not a theatre owner.',
  },
  {
    code: 'JPN',
    name: 'Japan',
    shortName: 'Japan',
    side: 'blue',
    region: 'North-East Asia',
    note: 'Dense home-island AD and maritime patrol. Default Blue increment for Korean Peninsula and SCS.',
  },
  {
    code: 'CHN',
    name: 'China',
    shortName: 'China',
    side: 'red',
    region: 'Indo-Pacific',
    note: 'Largest catalog in this set — air, land AD, and maritime strike mass. Default Red for SCS and northern Australia.',
  },
  {
    code: 'RUS',
    name: 'Russia',
    shortName: 'Russia',
    side: 'red',
    region: 'Eurasia',
    note: 'Ground-based AD and land fires density. Use for European or generic peer work-ups, not SCS.',
  },
  {
    code: 'PRK',
    name: 'North Korea',
    shortName: 'DPRK',
    side: 'red',
    region: 'Korean Peninsula',
    note: 'Artillery, ballistic missiles, and coastal defence. Default Red for Korea. Inventory quality is Estimated.',
  },
]

const byCode = new Map(FORCE_NATIONS.map((n) => [n.code, n]))

export function getForceNation(code: string): ForceNation | null {
  return byCode.get(code.trim().toUpperCase()) ?? null
}

export function parseNationCode(raw: string | undefined | null): string | null {
  if (!raw) return null
  const code = raw.trim().toUpperCase()
  return byCode.has(code) ? code : null
}

export const UAS_COUNTRY_ALIASES: Record<string, string[]> = {
  AUS: ['australia', 'australian', 'adf'],
  USA: ['united states', 'usa', 'us ', 'u.s.', 'america'],
  GBR: ['united kingdom', 'uk', 'britain', 'british'],
  JPN: ['japan', 'japanese'],
  CHN: ['china', 'prc', "people's republic", 'chinese'],
  RUS: ['russia', 'russian', 'ussr'],
  PRK: ['north korea', 'dprk', 'd.p.r.k', 'korean people'],
}

export function countryMatchesNation(country: string | null | undefined, code: string): boolean {
  if (!country) return false
  const hay = country.toLowerCase()
  const aliases = UAS_COUNTRY_ALIASES[code] ?? [code.toLowerCase()]
  return aliases.some((a) => hay.includes(a.trim()))
}
