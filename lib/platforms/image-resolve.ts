import { PLATFORM_ID_ALIASES } from '@/data/osint-platform-enrichment'
import { PLATFORM_IMAGE_SRC } from '@/lib/platforms/image-manifest'

/** SPECTRA effector IDs → catalogue / anti_drone_systems image IDs */
const EFFECTOR_IMAGE_ALIASES: Record<string, string> = {
  'eff-ciws-goalkeeper': 'goalkeeper-ciws',
  'eff-ciws-searam': 'searam',
  'eff-ciws-millennium': 'millennium-35mm',
  'eff-ciws-phalanx': 'phalanx-ciws',
  'eff-starstreak-hvm': 'starstreak-hvm',
  'eff-hq-17': 'hq-17',
  'eff-eos-slinger': 'eos-slinger',
  'eff-smash-hopper': 'smash-hopper',
  'eff-iron-beam': 'iron-beam',
  'eff-coyote-block2': 'coyote-block2',
  'eff-epirus-leonidas': 'epirus-leonidas',
  'eff-dragonfire': 'dragonfire',
  'eff-anduril-anvil': 'anduril-anvil',
  'edge-horizon': 'anduril-anvil',
  'ah-64e-apache-cuas': 'mq-9-reaper',
  'f-16-block60-intercept': 'uj-22-airborne',
  'merops-interceptor': 'anduril-anvil',
  'iron-drone-raider': 'fpv-interceptor',
  'dronehunter-f700': 'anduril-anvil',
  'skynex': 'starstreak-hvm',
  'apkws-vampire-launcher': 'vampire',
  'gepard-cuas': 'starstreak-hvm',
  'iris-t-slm-cuas': 'starstreak-hvm',
  'nasams-amraam-er': 'starstreak-hvm',
  'iris-t-sls-cuas': 'starstreak-hvm',
  'faad-c2-node': 'anduril-anvil',
  'iron-dome-tamir': 'starstreak-hvm',
  'davids-sling-cuas': 'starstreak-hvm',
  'martlet-airborne-cuas': 'uj-22-airborne',
  'land-ceptor-cuas': 'starstreak-hvm',
  'pilica-plus': 'starstreak-hvm',
  'narew-camm-er': 'starstreak-hvm',
  'skyguard-laser': 'vampire',
  'shahin-cuas': 'starstreak-hvm',
  'm-shorad-stryker': 'vampire',
  'bullfrog-apkws': 'vampire',
  'akash-ng-cuas': 'starstreak-hvm',
  'bharani-gun': 'starstreak-hvm',
  'l-sam-cheongung': 'starstreak-hvm',
  'sm-2-aegis-cuas': 'searam',
  'sm-6-aegis-cuas': 'searam',
  'pantsir-s1-cuas': 'starstreak-hvm',

}

const REVERSE_PLATFORM_ALIASES: Record<string, string> = Object.fromEntries(
  Object.entries(PLATFORM_ID_ALIASES).map(([seed, supabase]) => [supabase, seed]),
)

function imageIdCandidates(id: string): string[] {
  const seen = new Set<string>()
  const add = (value: string | undefined | null) => {
    if (value) seen.add(value)
  }

  add(id)
  add(PLATFORM_ID_ALIASES[id])
  add(REVERSE_PLATFORM_ALIASES[id])
  add(EFFECTOR_IMAGE_ALIASES[id])

  if (id.startsWith('eff-')) {
    const stripped = id.slice(4)
    add(stripped)
    add(EFFECTOR_IMAGE_ALIASES[id])
  }

  return [...seen]
}

/** Canonical manifest key when an OSINT image exists for this platform/effector ID */
export function resolvePlatformImageId(id: string): string | null {
  for (const candidate of imageIdCandidates(id)) {
    if (candidate in PLATFORM_IMAGE_SRC) return candidate
  }
  return null
}

export function resolvePlatformImagePath(id: string): string | null {
  const resolved = resolvePlatformImageId(id)
  return resolved ? PLATFORM_IMAGE_SRC[resolved] : null
}

export function hasResolvedPlatformImage(id: string): boolean {
  return resolvePlatformImageId(id) !== null
}
