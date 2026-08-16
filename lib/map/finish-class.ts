/**
 * Finish class — Deny the link vs Destroy the airframe.
 *
 * Williamtown lesson: a DroneGun-class RF buy is not a crash. Soft-kill
 * denies the pilot. Hard-kill (HPM / HEL / kinetic / net) takes the
 * airframe out of the sky. Do not present both as "shoot down".
 */

import type { EffectType } from '@/lib/spectrum/effector-types'

export type FinishClass = 'deny' | 'destroy'

const DESTROY_CUAS = new Set([
  'laser',
  'directed_energy',
  'hpm',
  'kinetic',
  'net',
  'kinetic_gun',
  'kinetic_missile',
])

const DENY_CUAS = new Set(['rf_jamming', 'gnss_spoofing', 'gnss_jamming', 'spoofing'])

export function finishClassForCuasMethods(methods: string[] | null | undefined): FinishClass {
  const normalised = (methods ?? []).map((m) => m.toLowerCase())
  if (normalised.some((m) => DESTROY_CUAS.has(m))) return 'destroy'
  if (normalised.some((m) => DENY_CUAS.has(m) || m.includes('jam'))) return 'deny'
  return 'deny'
}

export function finishClassForEffect(effect: EffectType | string | null | undefined): FinishClass {
  if (effect === 'hpm' || effect === 'laser') return 'destroy'
  if (typeof effect === 'string' && effect.startsWith('kinetic')) return 'destroy'
  if (effect === 'net_capture') return 'destroy'
  return 'deny'
}

export function finishClassLabel(finish: FinishClass): string {
  return finish === 'destroy' ? 'Destroy' : 'Deny'
}

export function finishPctLabel(finish: FinishClass): string {
  return finish === 'destroy' ? 'P(kill)' : 'P(link)'
}

export function finishOutcomeLine(finish: FinishClass): string {
  return finish === 'destroy'
    ? 'Airframe down — electronics fried, burned, or hit'
    : 'Link denied — airframe recoverable, still airworthy'
}
