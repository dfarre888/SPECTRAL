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
