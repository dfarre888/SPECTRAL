/**
 * What actually talks to what.
 *
 * OSINT-descriptive model of tactical datalink interoperability. Bands, roles
 * and bridging relationships are drawn from published NATO STANAG and TADIL
 * descriptions; no performance, keying or waveform detail is represented here —
 * that stays behind the accredited boundary.
 *
 * Two ideas do the work:
 *
 *  1. Connectivity is tiered. A vehicle on a combat-net radio is not
 *     "disconnected" — it simply cannot exchange machine tracks. Reporting one
 *     cohesion number hides that, so every tier is scored separately.
 *
 *  2. Links bridge, but not for free. Link 22 was specified to interoperate with
 *     Link 16 and to succeed Link 11, so those relationships are native to the
 *     standards. Stealth links (MADL, IFDL) reach the wider picture only through
 *     a platform that carries both and is fitted to relay.
 */

export type ConnTier = 'track' | 'data' | 'voice' | 'none'

/** Ordered best-to-worst so a platform's best tier can be picked. */
export const TIER_ORDER: ConnTier[] = ['track', 'data', 'voice', 'none']

export interface DatalinkSpec {
  standard: string
  label: string
  /** Descriptive band(s) — OSINT. */
  band: string
  tier: ConnTier
  /** Scoped to one nation (indigenous crypto/waveform) rather than coalition-wide. */
  nationScoped: boolean
  /** Needs GNSS for net time; drives the denial case. */
  pntDependent: boolean
  note: string
}

export const DATALINK_SPECS: Record<string, DatalinkSpec> = {
  link16: {
    standard: 'link16',
    label: 'Link 16 (TADIL-J)',
    band: 'UHF 960–1215 MHz (Lx)',
    tier: 'track',
    nationScoped: false,
    pntDependent: true,
    note: 'TDMA coalition track network. Net entry and slot timing depend on precise time.',
  },
  link22: {
    standard: 'link22',
    label: 'Link 22 (NILE)',
    band: 'HF and UHF',
    tier: 'track',
    nationScoped: false,
    pntDependent: true,
    note: 'NATO Improvement to Link 11. Specified to interoperate with Link 16 and to succeed Link 11; HF legs give beyond-line-of-sight reach.',
  },
  link11: {
    standard: 'link11',
    label: 'Link 11 (TADIL-A)',
    band: 'HF and UHF',
    tier: 'track',
    nationScoped: false,
    pntDependent: false,
    note: 'Legacy netted maritime link, roll-call polled. Being displaced by Link 22.',
  },
  madl: {
    standard: 'madl',
    label: 'MADL',
    band: 'Ku',
    tier: 'track',
    nationScoped: false,
    pntDependent: true,
    note: 'Low probability of intercept/detection directional link. F-35 flight members only; reaches the wider picture through a gateway.',
  },
  ifdl: {
    standard: 'ifdl',
    label: 'IFDL',
    band: 'Ku',
    tier: 'track',
    nationScoped: false,
    pntDependent: true,
    note: 'F-22 intra-flight link. Same gateway constraint as MADL.',
  },
  national: {
    standard: 'national',
    label: 'National tactical datalink',
    band: 'UHF (varies)',
    tier: 'track',
    nationScoped: true,
    pntDependent: true,
    note: 'Indigenous waveform and crypto. Joins own-nation platforms only — the reason a multi-nation adversary bloc does not automatically share a picture.',
  },
}

export interface DatalinkBridge {
  a: string
  b: string
  /**
   * 'native'  — the standards were specified to interwork; no dedicated relay needed.
   * 'gateway' — requires a platform carrying both and fitted to forward.
   */
  mechanism: 'native' | 'gateway'
  note: string
}

export const DATALINK_BRIDGES: DatalinkBridge[] = [
  {
    a: 'link22', b: 'link11', mechanism: 'native',
    note: 'Link 22 was specified as the Link 11 successor and carries the transition case.',
  },
  {
    a: 'link22', b: 'link16', mechanism: 'gateway',
    note: 'Interoperable by design, but track forwarding between the two networks is done by a fitted unit.',
  },
  {
    a: 'link16', b: 'link11', mechanism: 'gateway',
    note: 'Forwarding between J-series and A-series requires a unit fitted for both.',
  },
  {
    a: 'madl', b: 'link16', mechanism: 'gateway',
    note: 'Stealth link reaches the coalition picture only via a platform that relays it.',
  },
  {
    a: 'ifdl', b: 'link16', mechanism: 'gateway',
    note: 'As MADL — intra-flight only until relayed.',
  },
]

/** Bridges that apply with no relay platform present. */
export function nativeBridges(): DatalinkBridge[] {
  return DATALINK_BRIDGES.filter((b) => b.mechanism === 'native')
}

/** Bridges that need a gateway-capable platform carrying both standards. */
export function gatewayBridges(): DatalinkBridge[] {
  return DATALINK_BRIDGES.filter((b) => b.mechanism === 'gateway')
}

export function specFor(standard: string | null | undefined): DatalinkSpec | null {
  if (!standard) return null
  return DATALINK_SPECS[standard] ?? null
}

/** Map a raw bearer kind onto its connectivity tier. */
export function tierForKind(kind: string, standard: string | null): ConnTier {
  if (kind === 'datalink') return specFor(standard)?.tier ?? 'track'
  if (kind === 'data_satcom') return 'data'
  if (kind.startsWith('voice_')) return 'voice'
  return 'none'
}

export function betterTier(a: ConnTier, b: ConnTier): ConnTier {
  return TIER_ORDER.indexOf(a) <= TIER_ORDER.indexOf(b) ? a : b
}
