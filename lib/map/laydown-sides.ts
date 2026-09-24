/**
 * Per-instance force side and role for Map Intel laydowns.
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 *
 * The catalogue gives a platform a side (red / blue / neutral), but the same
 * airframe can fly for either force (a Blue FPV team and a Red FPV team both
 * fly quadcopters). A placed instance therefore resolves its side in order:
 *   1. explicit `side` on the placed instance
 *   2. a side token in the instance id (`-blue-` / `-red-`); ids persist in saved
 *      plans, so presets and vignettes keep their sides after a save and reload
 *   3. catalogue side for UAS (neutral or unknown UAS are treated as Red, the
 *      historical Map Intel behaviour where placed drones are threats)
 * C-UAS default to Blue; radars and effectors use their catalogue side.
 */
import type {
  ForceSide,
  PlacedCuas,
  PlacedEffector,
  PlacedRadar,
  PlacedUas,
  UasRole,
} from '@/lib/map/types'

const ROLE_TOKENS: Array<[RegExp, UasRole]> = [
  [/(^|-)relay(-|$)|(^|-)repeater(-|$)/, 'relay'],
  [/(^|-)(fpv|strike|attack|owa)(-|$)/, 'strike'],
  [/(^|-)(isr|surv|recce|recon)(-|$)/, 'isr'],
  [/(^|-)(mr|multirole)(-|$)/, 'multirole'],
]

export function sideFromInstanceId(instanceId: string): ForceSide | null {
  const id = instanceId.toLowerCase()
  if (/(^|-)blue(-|$)/.test(id)) return 'blue'
  if (/(^|-)red(-|$)/.test(id)) return 'red'
  return null
}

export function roleFromInstanceId(instanceId: string): UasRole | null {
  const id = instanceId.toLowerCase()
  for (const [re, role] of ROLE_TOKENS) if (re.test(id)) return role
  return null
}

export function resolveUasSide(u: Pick<PlacedUas, 'instanceId' | 'side' | 'asset'>): ForceSide {
  if (u.side === 'red' || u.side === 'blue') return u.side
  const token = sideFromInstanceId(u.instanceId)
  if (token) return token
  return u.asset.side === 'blue' ? 'blue' : 'red'
}

export function resolveUasRole(u: Pick<PlacedUas, 'instanceId' | 'role' | 'asset'>): UasRole {
  if (u.role) return u.role
  const token = roleFromInstanceId(u.instanceId)
  if (token) return token
  const cat = String(u.asset.category ?? '').toLowerCase()
  if (/fpv|loiter|owa|lm|strike|munition/.test(cat)) return 'strike'
  return 'multirole'
}

export function resolveCuasSide(c: Pick<PlacedCuas, 'instanceId' | 'side'>): ForceSide {
  if (c.side === 'red' || c.side === 'blue') return c.side
  return sideFromInstanceId(c.instanceId) ?? 'blue'
}

/** Radars and effectors: catalogue side; neutral counts as hostile to both forces. */
export function catalogueSide(side: string | null | undefined): ForceSide | 'neutral' {
  return side === 'red' || side === 'blue' ? side : 'neutral'
}

/** Opposing laydown elements a UAS must plan against. Own C-UAS, radars and SAMs are not threats. */
export function hostileLaydownFor(
  uas: Pick<PlacedUas, 'instanceId' | 'side' | 'asset'>,
  placedCuas: PlacedCuas[],
  placedRadars: PlacedRadar[],
  placedEffectors: PlacedEffector[],
): { cuas: PlacedCuas[]; radars: PlacedRadar[]; effectors: PlacedEffector[] } {
  const side = resolveUasSide(uas)
  return {
    cuas: placedCuas.filter((c) => resolveCuasSide(c) !== side),
    radars: placedRadars.filter((r) => catalogueSide(r.asset.side) !== side),
    effectors: placedEffectors.filter((e) => catalogueSide(e.asset.side) !== side),
  }
}

/** Human callsign for a placed UAS (explicit callsign, else catalogue name). */
export function uasCallsign(u: Pick<PlacedUas, 'callsign' | 'asset'>): string {
  return u.callsign?.trim() || u.asset.name
}

export function cuasCallsign(c: Pick<PlacedCuas, 'callsign' | 'asset'>): string {
  return c.callsign?.trim() || c.asset.name
}
