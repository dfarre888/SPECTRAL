import { describe, expect, it } from 'vitest'
import { getPrimaryDefeatType, isDetectOnly } from '@/lib/defeat/defeat-types'
import { resolveCellValue } from '@/lib/defeat/cell-value'
import { resolveCotsDefeatPct } from '@/lib/a3dm/cots-defeat'
import type { AntiDroneSystem, Platform } from '@/lib/types'

const sys = (id: string, defeat_method: AntiDroneSystem['defeat_method']) =>
  ({ id, name: id, defeat_method } as unknown as AntiDroneSystem)
const cotsDrone = { id: 'dji', name: 'DJI Mavic 3', catalog_tier: 'cots', category: 'cots' } as unknown as Platform

describe('detection sensors in the defeat matrix', () => {
  it('recognises sensor-only systems', () => {
    expect(isDetectOnly(sys('jorn', ['detect']))).toBe(true)
    expect(isDetectOnly(sys('dronesentry', ['detect', 'RF_jamming']))).toBe(false)
    expect(isDetectOnly(sys('unknown', []))).toBe(false)
  })

  it('never gives a sensor a generic COTS kill probability', () => {
    expect(resolveCotsDefeatPct(cotsDrone, sys('echoguard', ['detect']))).toBeNull()
    expect(resolveCellValue(cotsDrone, sys('jorn', ['detect']), undefined)).toEqual({ kind: 'sensor' })
  })

  it('files newer method names under the right defeat type', () => {
    expect(getPrimaryDefeatType(sys('fractl', ['directed_energy_laser']))).toBe('DEW')
    expect(getPrimaryDefeatType(sys('corvo-strike', ['kinetic_interceptor_uas']))).toBe('Kinetic')
    expect(getPrimaryDefeatType(sys('dart', ['detect', 'cyber_takeover']))).toBe('RF')
  })
})
