/**
 * Base Protection: publicly known Defence sites.
 *
 * Coordinates are the published reference points for each site (aerodrome
 * reference point for air bases, Wikipedia / Geoscience Australia gazetteer
 * points for barracks, naval bases and training areas), rounded to about
 * 100 m. Nothing here comes from non-public sources.
 *
 * `nominalRadiusM` is a PLANNING ASSUMPTION, not a Defence figure: the circle a
 * planner wants covered, sized by site type. Users can override it per site.
 *
 * `publicReporting` lists only what has been published, with the source. A
 * site with no entries shows "No public reporting". That is a statement about
 * the public record, not about what is or is not fielded.
 *
 * Sensitive intelligence and communications facilities are deliberately left
 * out.
 *
 * CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */

export type SiteService = 'RAAF' | 'Navy' | 'Army' | 'Joint'
export type SiteKind = 'air_base' | 'bare_base' | 'naval_base' | 'barracks' | 'training_area' | 'deployed'

export interface PublicSource {
  label: string
  url?: string
}

export interface PublicReport {
  kind: 'cuas' | 'incident'
  /** ISO date or month (YYYY-MM-DD or YYYY-MM). */
  date: string
  summary: string
  /** 'official' = Defence / police statement; 'reported' = media or think tank. */
  basis: 'official' | 'reported'
  sources: PublicSource[]
}

export interface DefenceSite {
  id: string
  name: string
  short: string
  service: SiteService
  kind: SiteKind
  /** State or territory code, or country for deployed sites. */
  region: string
  country: 'Australia' | 'United Arab Emirates'
  role: string
  lat: number
  lon: number
  /** IANA time zone used to convert incident local time to UTC. */
  timeZone: string
  /** Planning assumption. See header. */
  nominalRadiusM: number
  /** Civil police agency for the state or territory (evidence log default). */
  policeAgency: string | null
  publicReporting: PublicReport[]
}

export const RADIUS_BY_KIND: Record<SiteKind, number> = {
  air_base: 5_000,
  bare_base: 5_000,
  naval_base: 3_000,
  barracks: 3_000,
  training_area: 10_000,
  deployed: 5_000,
}

export const KIND_LABEL: Record<SiteKind, string> = {
  air_base: 'Air base',
  bare_base: 'Bare base',
  naval_base: 'Naval base',
  barracks: 'Barracks',
  training_area: 'Training area',
  deployed: 'Deployed',
}

const POLICE: Record<string, string> = {
  NSW: 'NSW Police Force',
  NT: 'NT Police',
  QLD: 'Queensland Police Service',
  SA: 'SA Police',
  WA: 'WA Police Force',
  VIC: 'Victoria Police',
}

const TZ: Record<string, string> = {
  NSW: 'Australia/Sydney',
  NT: 'Australia/Darwin',
  QLD: 'Australia/Brisbane',
  SA: 'Australia/Adelaide',
  WA: 'Australia/Perth',
  VIC: 'Australia/Melbourne',
  UAE: 'Asia/Dubai',
}

// ── Sources (only URLs that have been checked) ─────────────────────────────
const ABC_WILLIAMTOWN: PublicSource = {
  label: 'ABC News, 20 Aug 2026: Drones breach restricted airspace at Williamtown RAAF base',
  url: 'https://www.abc.net.au/news/2026-08-20/drones-breach-restricted-airspace-at-williamtown-raaf-base/107056708',
}
const HERALD_WILLIAMTOWN: PublicSource = {
  label: 'Newcastle Herald: Repeated drone activity prompts police action',
  url: 'https://www.newcastleherald.com.au/story/9333813/williamtown-raaf-repeated-drone-activity-prompts-police-action/',
}
const ASPI_DARWIN: PublicSource = {
  label: 'ASPI The Strategist, 4 Jun 2025: Get on with it, Defence. Counter-drone capability is urgent',
  url: 'https://www.aspistrategist.org.au/now-do-you-understand-defence-counter-drone-capability-is-urgent/',
}
const ADM_DARWIN: PublicSource = {
  label: 'Australian Defence Magazine: Anduril to provide base protection services for RAAF Base Darwin',
  url: 'https://www.australiandefence.com.au/news/news/anduril-to-provide-base-protection-services-for-raaf-base-darwin',
}
const ABC_MINHAD_3MAR: PublicSource = {
  label: 'ABC News, 3 Mar 2026: ADF personnel safe after air base strike near Dubai',
  url: 'https://www.abc.net.au/news/2026-03-03/adf-personnel-safe-after-dubai-air-base-strike/106408590',
}
const DEFENCE_MINHAD_18MAR: PublicSource = {
  label: 'Defence statement, 18 Mar 2026: Statement on strikes on Al Minhad Air Base',
  url: 'https://www.defence.gov.au/news-events/releases/2026-03-18/statement-strikes-al-minhad-air-base',
}
const ABC_MINHAD_18MAR: PublicSource = {
  label: 'ABC News, 18 Mar 2026: Australian facilities damaged in Iranian attack on Middle East air base',
  url: 'https://www.abc.net.au/news/2026-03-18/al-minhad-air-base-attacked-by-iran-no-australians-hurt/106468378',
}

/**
 * National context shown beside the site list. The figure is media-reported
 * and not broken down by site, so it is never attributed to a row.
 */
export const NATIONAL_SIGHTINGS_CONTEXT = {
  approxCount: 150,
  period: '2024-25',
  summary: 'About 150 drone sightings at Defence sites in 2024-25, not broken down by site.',
  basis: 'reported' as const,
  sources: [{ label: 'The Daily Telegraph (reported, Aug 2026)' }] as PublicSource[],
}

function site(
  s: Omit<DefenceSite, 'timeZone' | 'nominalRadiusM' | 'policeAgency' | 'publicReporting' | 'country'> &
    Partial<Pick<DefenceSite, 'publicReporting' | 'country'>>,
): DefenceSite {
  const tzKey = s.region
  return {
    ...s,
    country: s.country ?? 'Australia',
    timeZone: TZ[tzKey] ?? 'UTC',
    nominalRadiusM: RADIUS_BY_KIND[s.kind],
    policeAgency: POLICE[tzKey] ?? null,
    publicReporting: s.publicReporting ?? [],
  }
}

export const DEFENCE_SITES: DefenceSite[] = [
  // ── RAAF ────────────────────────────────────────────────────────────────
  site({
    id: 'raaf-williamtown',
    name: 'RAAF Base Williamtown',
    short: 'Williamtown',
    service: 'RAAF',
    kind: 'air_base',
    region: 'NSW',
    role: 'Main F-35A base. Shares its runway with Newcastle Airport.',
    lat: -32.795,
    lon: 151.8344,
    publicReporting: [
      {
        kind: 'incident',
        date: '2026-07',
        summary:
          'Defence confirmed it was investigating reports of multiple unidentified drones over the base and Newcastle Airport on 11 to 13 July 2026. Referred to NSW Police.',
        basis: 'official',
        sources: [ABC_WILLIAMTOWN, HERALD_WILLIAMTOWN],
      },
      {
        kind: 'incident',
        date: '2026-08',
        summary:
          'Second incursion in early August 2026, confirmed by NSW Police. Ministers did not say how Defence responded.',
        basis: 'official',
        sources: [ABC_WILLIAMTOWN, HERALD_WILLIAMTOWN],
      },
    ],
  }),
  site({
    id: 'raaf-darwin',
    name: 'RAAF Base Darwin',
    short: 'Darwin',
    service: 'RAAF',
    kind: 'air_base',
    region: 'NT',
    role: 'Northern forward base. Shares its runway with Darwin International Airport.',
    lat: -12.4147,
    lon: 130.8767,
    publicReporting: [
      {
        kind: 'cuas',
        date: '2024-10',
        summary:
          'Anduril base protection trial (Lattice software fusing sensors and effectors), 2024 to 2027. ASPI describes Darwin as the only publicly known defended base.',
        basis: 'reported',
        sources: [ASPI_DARWIN, ADM_DARWIN],
      },
    ],
  }),
  site({
    id: 'raaf-tindal',
    name: 'RAAF Base Tindal',
    short: 'Tindal',
    service: 'RAAF',
    kind: 'air_base',
    region: 'NT',
    role: 'Northern air combat base.',
    lat: -14.5211,
    lon: 132.3778,
  }),
  site({
    id: 'raaf-amberley',
    name: 'RAAF Base Amberley',
    short: 'Amberley',
    service: 'RAAF',
    kind: 'air_base',
    region: 'QLD',
    role: 'Strike, electronic attack, airlift and tanker fleets.',
    lat: -27.6406,
    lon: 152.7119,
  }),
  site({
    id: 'raaf-edinburgh',
    name: 'RAAF Base Edinburgh',
    short: 'Edinburgh',
    service: 'RAAF',
    kind: 'air_base',
    region: 'SA',
    role: 'Maritime patrol and surveillance aircraft.',
    lat: -34.7025,
    lon: 138.6208,
  }),
  site({
    id: 'raaf-pearce',
    name: 'RAAF Base Pearce',
    short: 'Pearce',
    service: 'RAAF',
    kind: 'air_base',
    region: 'WA',
    role: 'Pilot training.',
    lat: -31.6678,
    lon: 116.015,
  }),
  site({
    id: 'raaf-townsville',
    name: 'RAAF Base Townsville',
    short: 'Townsville',
    service: 'RAAF',
    kind: 'air_base',
    region: 'QLD',
    role: 'Army aviation and airlift support. Shares its runway with Townsville Airport.',
    lat: -19.2533,
    lon: 146.765,
  }),
  site({
    id: 'raaf-richmond',
    name: 'RAAF Base Richmond',
    short: 'Richmond',
    service: 'RAAF',
    kind: 'air_base',
    region: 'NSW',
    role: 'Tactical airlift.',
    lat: -33.6006,
    lon: 150.7808,
  }),
  site({
    id: 'raaf-east-sale',
    name: 'RAAF Base East Sale',
    short: 'East Sale',
    service: 'RAAF',
    kind: 'air_base',
    region: 'VIC',
    role: 'Aircrew and officer training.',
    lat: -38.0989,
    lon: 147.1494,
  }),
  site({
    id: 'raaf-curtin',
    name: 'RAAF Base Curtin',
    short: 'Curtin',
    service: 'RAAF',
    kind: 'bare_base',
    region: 'WA',
    role: 'Bare base in the Kimberley.',
    lat: -17.5814,
    lon: 123.8283,
  }),
  site({
    id: 'raaf-learmonth',
    name: 'RAAF Base Learmonth',
    short: 'Learmonth',
    service: 'RAAF',
    kind: 'bare_base',
    region: 'WA',
    role: 'Bare base near Exmouth.',
    lat: -22.2358,
    lon: 114.0886,
  }),
  site({
    id: 'raaf-scherger',
    name: 'RAAF Base Scherger',
    short: 'Scherger',
    service: 'RAAF',
    kind: 'bare_base',
    region: 'QLD',
    role: 'Bare base on Cape York, near Weipa.',
    lat: -12.6233,
    lon: 142.0867,
  }),

  // ── Navy ────────────────────────────────────────────────────────────────
  site({
    id: 'hmas-stirling',
    name: 'HMAS Stirling',
    short: 'Stirling',
    service: 'Navy',
    kind: 'naval_base',
    region: 'WA',
    role: 'Fleet Base West on Garden Island. Submarines and surface ships.',
    lat: -32.2417,
    lon: 115.6833,
  }),
  site({
    id: 'fleet-base-east',
    name: 'Fleet Base East (Garden Island)',
    short: 'Fleet Base East',
    service: 'Navy',
    kind: 'naval_base',
    region: 'NSW',
    role: 'Main east coast fleet base, Sydney Harbour.',
    lat: -33.8639,
    lon: 151.2253,
  }),
  site({
    id: 'hmas-coonawarra',
    name: 'HMAS Coonawarra',
    short: 'Coonawarra',
    service: 'Navy',
    kind: 'naval_base',
    region: 'NT',
    role: 'Darwin naval base. Patrol boats.',
    lat: -12.4586,
    lon: 130.8217,
  }),
  site({
    id: 'hmas-cairns',
    name: 'HMAS Cairns',
    short: 'Cairns',
    service: 'Navy',
    kind: 'naval_base',
    region: 'QLD',
    role: 'Patrol boat and survey vessel base.',
    lat: -16.9356,
    lon: 145.7778,
  }),

  // ── Army ────────────────────────────────────────────────────────────────
  site({
    id: 'robertson-barracks',
    name: 'Robertson Barracks',
    short: 'Robertson',
    service: 'Army',
    kind: 'barracks',
    region: 'NT',
    role: '1st Brigade, Darwin.',
    lat: -12.445,
    lon: 130.9744,
  }),
  site({
    id: 'lavarack-barracks',
    name: 'Lavarack Barracks',
    short: 'Lavarack',
    service: 'Army',
    kind: 'barracks',
    region: 'QLD',
    role: '3rd Brigade, Townsville.',
    lat: -19.3217,
    lon: 146.8017,
  }),
  site({
    id: 'gallipoli-barracks',
    name: 'Gallipoli Barracks (Enoggera)',
    short: 'Gallipoli',
    service: 'Army',
    kind: 'barracks',
    region: 'QLD',
    role: '7th Brigade, Brisbane.',
    lat: -27.425,
    lon: 152.9833,
  }),
  site({
    id: 'holsworthy-barracks',
    name: 'Holsworthy Barracks',
    short: 'Holsworthy',
    service: 'Army',
    kind: 'barracks',
    region: 'NSW',
    role: 'Barracks and training area, south-west Sydney.',
    lat: -33.995,
    lon: 150.9517,
  }),
  site({
    id: 'puckapunyal',
    name: 'Puckapunyal',
    short: 'Puckapunyal',
    service: 'Army',
    kind: 'barracks',
    region: 'VIC',
    role: 'Combined arms training and armour schools.',
    lat: -37.0,
    lon: 145.0333,
  }),

  // ── Training areas ──────────────────────────────────────────────────────
  site({
    id: 'shoalwater-bay',
    name: 'Shoalwater Bay Training Area',
    short: 'Shoalwater Bay',
    service: 'Joint',
    kind: 'training_area',
    region: 'QLD',
    role: 'Joint training area and a main Talisman Sabre venue. Radius covers a range control area, not the whole training area.',
    lat: -22.5479,
    lon: 150.4873,
  }),
  site({
    id: 'cultana',
    name: 'Cultana Training Area',
    short: 'Cultana',
    service: 'Army',
    kind: 'training_area',
    region: 'SA',
    role: 'Army training area near Whyalla. Radius covers a range control area, not the whole training area.',
    lat: -32.8167,
    lon: 137.75,
  }),

  // ── Deployed ────────────────────────────────────────────────────────────
  site({
    id: 'al-minhad',
    name: 'Al Minhad Air Base',
    short: 'Al Minhad',
    service: 'Joint',
    kind: 'deployed',
    region: 'UAE',
    country: 'United Arab Emirates',
    role: 'ADF operational headquarters in the Middle East, in a section of a UAE air base.',
    lat: 25.0268,
    lon: 55.3663,
    publicReporting: [
      {
        kind: 'incident',
        date: '2026-03-03',
        summary: 'Iranian drone strike on the base. The Defence Minister said ADF personnel were safe.',
        basis: 'official',
        sources: [ABC_MINHAD_3MAR],
      },
      {
        kind: 'incident',
        date: '2026-03-18',
        summary:
          'Iranian strike caused minor damage to an accommodation block and a medical facility in the Australian section. No ADF personnel injured.',
        basis: 'official',
        sources: [DEFENCE_MINHAD_18MAR, ABC_MINHAD_18MAR],
      },
    ],
  }),
]

export const SITE_BY_ID: ReadonlyMap<string, DefenceSite> = new Map(DEFENCE_SITES.map((s) => [s.id, s]))

export function getSite(id: string): DefenceSite | undefined {
  return SITE_BY_ID.get(id)
}

export function publicIncidentCount(s: DefenceSite): number {
  return s.publicReporting.filter((r) => r.kind === 'incident').length
}

export function hasPublicCuas(s: DefenceSite): boolean {
  return s.publicReporting.some((r) => r.kind === 'cuas')
}
