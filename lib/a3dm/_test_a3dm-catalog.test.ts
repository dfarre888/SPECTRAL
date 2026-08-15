import { describe, expect, it } from 'vitest'
import { bandsForPayload } from '@/data/a3dm/payload-bands'
import { osintPerformanceFor } from '@/data/a3dm/performance-osint'
import { A3DM_COMPATIBILITY, A3DM_DRONES, A3DM_PAYLOADS, getA3dmDrone, payloadsForPlatform } from '@/lib/a3dm/catalog'
import { resolveA3dmCapabilities } from '@/lib/a3dm/capability-resolver'
import { isCotsPlatform, resolveCotsDefeatPct } from '@/lib/a3dm/cots-defeat'
import { a3dmDroneToPlatform, allA3dmPlatforms } from '@/lib/a3dm/to-platform'
import type { AntiDroneSystem } from '@/lib/types'

describe('A3DM COTS catalog', () => {
  it('imports all spreadsheet rows', () => {
    expect(A3DM_DRONES.length).toBe(314)
    expect(A3DM_PAYLOADS.length).toBe(258)
    expect(A3DM_COMPATIBILITY.length).toBe(250)
  })

  it('keeps existing Spectral slugs for overlap variants', () => {
    expect(getA3dmDrone('dji-mavic-3')?.a3dm_drone_id).toBe('DRN-0029')
    expect(getA3dmDrone('autel-evo-max-4t')?.a3dm_drone_id).toBe('DRN-0084')
    expect(getA3dmDrone('skydio-x10d')?.a3dm_drone_id).toBe('DRN-0099')
  })

  it('creates separate variant rows for Mavic 3 family', () => {
    const mavics = A3DM_DRONES.filter((d) => d.id.startsWith('dji-mavic-3'))
    expect(mavics.length).toBeGreaterThanOrEqual(6)
    expect(new Set(mavics.map((d) => d.id)).size).toBe(mavics.length)
  })

  it('maps every drone to category cots and a platform record', () => {
    const platforms = allA3dmPlatforms()
    expect(platforms).toHaveLength(314)
    expect(platforms.every((p) => p.category === 'cots')).toBe(true)
    expect(platforms.every((p) => p.catalog_tier === 'cots')).toBe(true)
    expect(platforms.every((p) => p.side === 'neutral')).toBe(true)
    expect(platforms.every((p) => p.a3dm_drone_id?.startsWith('DRN-'))).toBe(true)
  })

  it('overlays OSINT performance for Matrice 300 and Mavic 3', () => {
    const m300 = osintPerformanceFor('dji-matrice-300-rtk', 'Matrice 300 RTK')
    expect(m300?.range_km).toBe(15)
    expect(m300?.endurance_hrs).toBeCloseTo(0.92)
    const mavic = a3dmDroneToPlatform(getA3dmDrone('dji-mavic-3')!)
    expect(mavic.range_km).toBe(15)
    expect(mavic.control_link_freq).toMatch(/OcuSync|O3/)
  })

  it('resolves per-payload H20T bands (visual + LWIR + LRF)', () => {
    const bands = bandsForPayload('PLD-0011', 'Combo')
    expect(bands.map((b) => b.label).join('|')).toMatch(/Visual/)
    expect(bands.some((b) => b.wavelength_low_um === 8)).toBe(true)
    expect(bands.some((b) => b.fn === 'laser')).toBe(true)
  })

  it('skips speaker/FTS spectrum and still lists the payload', () => {
    const speakers = A3DM_PAYLOADS.filter((p) => p.type === 'Speaker')
    expect(speakers.length).toBeGreaterThan(0)
    expect(speakers.every((p) => p.spectrum_eligible === false)).toBe(true)
  })

  it('builds airframe + payload capabilities for Matrice 300', () => {
    const caps = resolveA3dmCapabilities('dji-matrice-300-rtk')
    expect(caps.some((c) => c.fn === 'control')).toBe(true)
    expect(caps.some((c) => c.layer === 'navigation')).toBe(true)
    const h20t = payloadsForPlatform('dji-matrice-300-rtk').find((p) => p.id === 'PLD-0011')
    expect(h20t).toBeTruthy()
    const selected = resolveA3dmCapabilities('dji-matrice-300-rtk', ['PLD-0011'])
    expect(selected.some((c) => c.label.includes('LWIR') || c.label.includes('thermal'))).toBe(true)
  })

  it('returns COTS defeat Pk for Leonidas and DroneGun', () => {
    const platform = a3dmDroneToPlatform(getA3dmDrone('dji-mavic-3')!)
    expect(isCotsPlatform(platform)).toBe(true)
    const leonidas = { id: 'leonidas-hpm', defeat_method: ['directed_energy'] } as AntiDroneSystem
    const gun = { id: 'dronegun-tactical', defeat_method: ['RF_jamming'] } as AntiDroneSystem
    expect(resolveCotsDefeatPct(platform, leonidas)).toBe(72)
    expect(resolveCotsDefeatPct(platform, gun)).toBe(72)
  })
})
