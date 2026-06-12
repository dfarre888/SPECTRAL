/**
 * OSINT image search terms for Platform Library cards.
 * Images fetched from Wikimedia Commons → public/assets/platforms/{id}.jpg
 */
export const PLATFORM_IMAGE_SEARCH: Record<string, string> = {
  'mq-9-reaper':      'MQ-9 Reaper UAV',
  'shahed-136':       'Shahed-136 drone',
  'tb2-bayraktar':    'Bayraktar TB2',
  'fpv-fibre-optic':  'FPV drone Ukraine',
  'lancet-3':         'Lancet loitering munition',
  v2u:                'V2U loitering munition Ukraine',
  'uj-22-airborne':   'UJ-22 Airborne UAV Ukraine',
  'uj-26-bober':      'UJ-26 Bober drone Ukraine',
  'baba-yaga':        'Baba Yaga hexacopter drone Ukraine',
  vampire:            'Vampire combat drone Ukraine',
  kazhan:             'FPV strike drone Ukraine',
  'fpv-interceptor':  'FPV interceptor drone',
  'rotem-l':          'IAI Rotem loitering munition',
  'kargu-2':          'STM Kargu-2 drone',
  alpagu:             'STM Alpagu loitering munition',
  'wing-loong-1':     'Wing Loong I UAV',
  'wing-loong-2':     'Wing Loong II UAV',
  'ch-4-rainbow':     'CH-4 Rainbow UAV China',
  'ch-5-rainbow':     'CH-5 Rainbow UAV China',
  'tb-001':           'TB-001 Twin-tailed Scorpion UAV',
  'mq-1c-gray-eagle': 'MQ-1C Gray Eagle',
  'rq-7b-shadow':     'RQ-7 Shadow 200 UAV',
  'mq-25-stingray':   'MQ-25 Stingray UAV',
  'anduril-anvil':    'Anduril Anvil interceptor drone',
  'skydio-x10d':      'Skydio X10 drone',
  'switchblade-600':  'AeroVironment Switchblade 600',
  'switchblade-300':  'AeroVironment Switchblade 300',
  'phoenix-ghost':    'Aevex Phoenix Ghost UAV',
  'aeronautics-orbiter': 'Aeronautics Orbiter UAV',
  'rq-4-global-hawk': 'RQ-4 Global Hawk',
  'millennium-35mm':  'OTO Melara 35mm Millennium naval gun',
  'phalanx-ciws':     'Phalanx CIWS',
  'goalkeeper-ciws':  'Goalkeeper CIWS',
  searam:             'SeaRAM CIWS',
  'mohajer-6':        'Mohajer-6 UAV Iran',
  'shahed-129':       'Shahed 129 UAV',
  'ghost-bat':        'MQ-28 Ghost Bat',
  'bayraktar-akinci': 'Bayraktar Akinci UCAV',
  'hermes-900':       'Elbit Hermes 900',
  'scan-eagle':       'Insitu ScanEagle',
}

/** Curated Wikimedia Commons file titles (preferred over search when available). */
export const PLATFORM_IMAGE_COMMONS_FILE: Partial<Record<string, string>> = {
  'tb2-bayraktar':    'Bayraktar_TB2.jpg',
  'mq-9-reaper':      'MQ-9_Reaper_in_flight_(2007).jpg',
  'shahed-136':       'HESA_Shahed_136.jpg',
  'wing-loong-1':     'Wing_Loong_I.jpg',
  'wing-loong-2':     'Wing_Loong_II.jpg',
  'ch-4-rainbow':     'CASC_Rainbow_CH-4.jpg',
  'lancet-3':         'ZALA_Lancet-3.jpg',
  'kargu-2':          'STM_Kargu.jpg',
  'mq-1c-gray-eagle': 'MQ-1C_Gray_Eagle.jpg',
  'rq-7b-shadow':     'Shadow 200 UAV.jpg',
  'mq-25-stingray':   'MQ-25_Stingray.jpg',
  'skydio-x10d':      'Skydio_X10D.jpg',
}

import {
  hasResolvedPlatformImage,
  resolvePlatformImagePath,
} from '@/lib/platforms/image-resolve'

export function platformImagePath(id: string): string | null {
  return resolvePlatformImagePath(id)
}

export function hasPlatformImage(id: string): boolean {
  return hasResolvedPlatformImage(id)
}

export function platformImageSearchTerm(id: string, name: string): string {
  return PLATFORM_IMAGE_SEARCH[id] ?? name
}
