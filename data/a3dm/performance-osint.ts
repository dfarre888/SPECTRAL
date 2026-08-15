/**
 * OSINT performance overlays for A3DM COTS airframes.
 * Only published manufacturer / datasheet figures — never invent MTOW.
 * Date of information: Aug 2026.
 */
import type { OsintPerformance } from '@/lib/a3dm/types'

const MHz_NOTE = (s: string): Pick<OsintPerformance, 'control_link_freq' | 'source'> => ({
  control_link_freq: s,
  source: 'OSINT: manufacturer datasheet / product page',
})

/** Family matchers — first match wins. Tested against slug + display name. */
const FAMILIES: { test: RegExp; perf: OsintPerformance }[] = [
  {
    test: /mavic.?3|dji-mavic-3/,
    perf: {
      range_km: 15,
      endurance_hrs: 0.77,
      speed_kmh: 75,
      ceiling_m: 6000,
      gnss_used: ['GPS', 'Galileo', 'BeiDou', 'GLONASS'],
      gnss_dependency: 'high',
      ...MHz_NOTE('OcuSync 3 / O3 — 2.4 / 5.8 GHz'),
      source: 'OSINT: DJI Mavic 3 series specs — 15 km FCC O3, 46 min class endurance, 6 km ceiling',
    },
  },
  {
    test: /matrice.?300|dji-matrice-300/,
    perf: {
      range_km: 15,
      endurance_hrs: 0.92,
      speed_kmh: 83,
      ceiling_m: 5000,
      gnss_used: ['GPS', 'GLONASS', 'BeiDou', 'Galileo'],
      rtk_capable: true,
      gnss_dependency: 'high',
      ...MHz_NOTE('OcuSync Enterprise — 2.400–2.4835 / 5.725–5.850 GHz'),
      source: 'OSINT: DJI M300 RTK datasheet — 15 km FCC, 55 min, 23 m/s, 5000 m (7000 m high-alt props)',
    },
  },
  {
    test: /matrice.?350|dji-matrice-350/,
    perf: {
      range_km: 20,
      endurance_hrs: 0.92,
      speed_kmh: 83,
      ceiling_m: 7000,
      gnss_used: ['GPS', 'GLONASS', 'BeiDou', 'Galileo'],
      rtk_capable: true,
      gnss_dependency: 'high',
      ...MHz_NOTE('OcuSync Enterprise — 2.4 / 5.8 GHz'),
      source: 'OSINT: DJI Matrice 350 RTK product brief — 20 km FCC, 55 min class',
    },
  },
  {
    test: /matrice.?30(?!0)|dji-matrice-30/,
    perf: {
      range_km: 15,
      endurance_hrs: 0.68,
      speed_kmh: 83,
      ceiling_m: 7000,
      gnss_used: ['GPS', 'Galileo', 'BeiDou', 'GLONASS'],
      rtk_capable: true,
      gnss_dependency: 'high',
      ...MHz_NOTE('OcuSync Enterprise — 2.4 / 5.8 GHz'),
      source: 'OSINT: DJI Matrice 30 series specs — 23 m/s, 5000–7000 m ceiling',
    },
  },
  {
    test: /evo.?max|autel-evo-max/,
    perf: {
      range_km: 20,
      endurance_hrs: 0.7,
      speed_kmh: 65,
      ceiling_m: 7010,
      gnss_used: ['GPS', 'GLONASS', 'Galileo', 'BeiDou'],
      gnss_dependency: 'medium',
      ...MHz_NOTE('SkyLink 3.0 — 900 MHz / 2.4 / 5.2 / 5.8 GHz'),
      source: 'OSINT: Autel EVO Max 4T — 20 km SkyLink, 42 min, 7010 m ceiling',
    },
  },
  {
    test: /skydio.?x10/,
    perf: {
      range_km: 12,
      endurance_hrs: 0.67,
      speed_kmh: 72,
      ceiling_m: 4500,
      gnss_used: ['GPS', 'Galileo', 'GLONASS', 'BeiDou'],
      gnss_dependency: 'medium',
      ...MHz_NOTE('Skydio Link — multi-band encrypted'),
      source: 'OSINT: Skydio X10/X10D — ~40 min, visual autonomy GPS-denied capable',
    },
  },
  {
    test: /wingtra/,
    perf: {
      range_km: 10,
      endurance_hrs: 0.98,
      speed_kmh: 58,
      ceiling_m: 5000,
      gnss_used: ['GPS', 'GLONASS', 'Galileo', 'BeiDou'],
      rtk_capable: true,
      gnss_dependency: 'high',
      ...MHz_NOTE('2.4 GHz C2 (mapping VTOL)'),
      source: 'OSINT: WingtraOne GEN II — 59 min, RTK/PPK mapping VTOL',
    },
  },
  {
    test: /ebee|sensefly/,
    perf: {
      range_km: 8,
      endurance_hrs: 1.5,
      speed_kmh: 110,
      ceiling_m: 3000,
      gnss_used: ['GPS', 'GLONASS', 'Galileo'],
      rtk_capable: true,
      gnss_dependency: 'high',
      ...MHz_NOTE('2.4 GHz C2'),
      source: 'OSINT: senseFly eBee X family — up to 90 min endurance class',
    },
  },
  {
    test: /anafi/,
    perf: {
      range_km: 4,
      endurance_hrs: 0.53,
      speed_kmh: 55,
      ceiling_m: 4500,
      gnss_used: ['GPS', 'GLONASS', 'Galileo'],
      gnss_dependency: 'high',
      ...MHz_NOTE('Wi-Fi / Parrot Skycontroller — 2.4 / 5.8 GHz'),
      source: 'OSINT: Parrot ANAFI family — ~32 min class, Blue UAS variants USA/Gov',
    },
  },
  {
    test: /mavic.?2|phantom.?4|inspire/,
    perf: {
      range_km: 8,
      endurance_hrs: 0.52,
      speed_kmh: 72,
      ceiling_m: 6000,
      gnss_used: ['GPS', 'GLONASS'],
      gnss_dependency: 'high',
      ...MHz_NOTE('OcuSync / Lightbridge — 2.4 / 5.8 GHz'),
      source: 'OSINT: DJI OcuSync/Lightbridge generation — typical 8 km FCC class',
    },
  },
  {
    test: /mini.?[234]|air.?[23]/,
    perf: {
      range_km: 10,
      endurance_hrs: 0.52,
      speed_kmh: 57,
      ceiling_m: 4000,
      gnss_used: ['GPS', 'Galileo', 'BeiDou'],
      gnss_dependency: 'high',
      ...MHz_NOTE('OcuSync — 2.4 / 5.8 GHz'),
      source: 'OSINT: DJI Mini/Air O3 class — ~10 km FCC, sub-250 g / light quad',
    },
  },
]

export function osintPerformanceFor(slug: string, displayName: string): OsintPerformance | null {
  const hay = `${slug} ${displayName}`.toLowerCase()
  for (const row of FAMILIES) {
    if (row.test.test(hay)) return row.perf
  }
  return null
}
