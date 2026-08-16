import type { BmiConfidence, ForceDomain, ForceEffect, NatoConfidence } from '@/lib/force/types'

const ROLE_EFFECT: Record<string, ForceEffect> = {
  isr: 'find',
  aew_c: 'find',
  ew: 'fix',
  fighter: 'finish',
  multirole: 'finish',
  maritime_surface: 'sea_control',
  radar_ground: 'shield',
  tanker: 'sustain',
  transport: 'sustain',
  trainer_lead_in: 'sustain',
}

const KEYWORD_EFFECT: Array<{ re: RegExp; effect: ForceEffect }> = [
  { re: /\b(s-?300|s-?400|s-?500|hq-?9|hq-?22|patriot|nasams|thaad|iris-t|aster|sam|iads|giraffe|cebrowski|shorad|pantsir|tor-m|buk)\b/i, effect: 'shield' },
  { re: /\b(destroyer|frigate|corvette|carrier|cruiser|submarine|ssbn|ssn|sssk|lhd|lha|amphib|hobart|type 0?55|type 0?52|type 0?54|arleigh|burke|collin)\b/i, effect: 'sea_control' },
  { re: /\b(e-7|e-3|e-2|kj-500|kj-2000|wedgetail|awacs|aew|p-8|poseidon|mpa|global hawk|rq-4)\b/i, effect: 'find' },
  { re: /\b(growler|ea-18|ew |jamming|soar|y-9g)\b/i, effect: 'fix' },
  { re: /\b(kc-30|kc-46|kc-135|a330 mrtt|tanker|il-78)\b/i, effect: 'sustain' },
  { re: /\b(c-17|c-130|c-27|chinook|ch-47|a400|il-76|transport)\b/i, effect: 'sustain' },
  { re: /\b(f-35|f-22|f-15|f-16|fa-18|f-18|super hornet|j-20|j-16|j-10|su-35|su-30|su-57|typhoon|rafale|gripen|apache|ah-64|himars|mlrs|m777|t-90|t-14|t-80|m1a2|abrams|bomber|h-6|b-1|b-2|b-21|strike)\b/i, effect: 'finish' },
]

export function classifyEffect(
  role: string,
  designation: string,
  shortName: string,
  domain: ForceDomain,
): ForceEffect {
  const fromRole = ROLE_EFFECT[role]
  if (fromRole) return fromRole
  const text = `${designation} ${shortName}`
  for (const { re, effect } of KEYWORD_EFFECT) {
    if (re.test(text)) return effect
  }
  if (domain === 'maritime') return 'sea_control'
  if (domain === 'ground') return 'finish'
  return 'finish'
}

/** Catalog / OSINT rows are never Confirmed from a single sheet. */
export function toNatoConfidence(raw: BmiConfidence | string): NatoConfidence {
  if (raw === 'high') return 'Assessed'
  if (raw === 'medium' || raw === 'estimated' || raw === 'classified') return 'Estimated'
  return 'Estimated'
}

export function confidenceVariant(
  c: NatoConfidence,
): 'confirmed' | 'assessed' | 'estimated' | 'reported' {
  if (c === 'Confirmed') return 'confirmed'
  if (c === 'Assessed') return 'assessed'
  if (c === 'Reported') return 'reported'
  return 'estimated'
}
