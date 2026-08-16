import type { TheatreTemplate } from '@/lib/force/types'

export const FORCE_THEATRES: TheatreTemplate[] = [
  {
    id: 'scs',
    name: 'South China Sea',
    theatre: 'Spratly / Paracel approaches',
    lat: 12.2,
    lon: 114.3,
    height_m: 1_800_000,
    defaultBlue: 'AUS',
    defaultRed: 'CHN',
    date_of_information: 'August 2026',
    briefing:
      'Peer maritime-air contest. PRC holds mass in fighters, land-based AD, and surface combatants. Australia brings quality (F-35A, E-7A, Hobart-class) without the tanker and AEW depth the US would add. Do not play this as Australia alone vs the PLA — mark the coalition gap.',
    so_what:
      'Blue loses if it fights a hull-count war. Blue holds if it keeps AEW&C up, tankers alive, and refuses to enter the densest AD ring without SEAD/DEAD that this catalog does not give Australia organically.',
  },
  {
    id: 'korea',
    name: 'Korean Peninsula',
    theatre: 'DMZ to Yellow Sea',
    lat: 38.0,
    lon: 127.0,
    height_m: 1_200_000,
    defaultBlue: 'USA',
    defaultRed: 'PRK',
    date_of_information: 'August 2026',
    briefing:
      'ROK is not in this seven-nation catalog — treat USA/JPN as the Blue increment, not the full Combined Forces Command. DPRK rows are artillery, ballistic missiles, and coastal defence; quality is Estimated. Japan adds home-island AD and MPA, not a ground campaign.',
    so_what:
      'The fight is massed land fires and missiles vs layered AD and ISR. A US-only air package without ROK ground AD is an incomplete work-up — flag that gap on the AAR.',
  },
  {
    id: 'north-aus',
    name: 'Northern Australia',
    theatre: 'Darwin / Timor Sea approaches',
    lat: -12.4,
    lon: 130.8,
    height_m: 1_400_000,
    defaultBlue: 'AUS',
    defaultRed: 'CHN',
    date_of_information: 'August 2026',
    briefing:
      'Sovereign defence of the north. Australia has the home-ground C-UAS and air picture problem; PRC appears as a long-range air/maritime strike threat, not an occupying land force. Pair with the existing North Queensland C-UAS belt vignette for the UAS layer.',
    so_what:
      'Blue fails if Darwin-class air bases are saturated while E-7A and KC-30A are the only Find/Sustain nodes. The so-what for the soldier is C-UAS and EMCON on the airfield, not a tank battle.',
  },
]

const byId = new Map(FORCE_THEATRES.map((t) => [t.id, t]))

export function getTheatre(id: string | undefined | null): TheatreTemplate | null {
  if (!id) return null
  return byId.get(id.trim().toLowerCase()) ?? null
}
