import { describe, expect, it } from 'vitest'
import {
  BMI_SEED_BUNDLE,
  PB26_BASES,
  PB26_NATIONS,
  PB26_PLATFORMS,
  PITCH_BLACK_2026,
} from '@/data/seed-bmi-pitchblack2026'

describe('BMI seed — Pitch Black 2026', () => {
  it('has exactly 20 nations', () => {
    expect(PITCH_BLACK_2026.nations).toHaveLength(20)
  })

  it('has 13 flying and 7 embedded_personnel nations', () => {
    const flying = PB26_NATIONS.filter((n) => n.participation === 'flying')
    const embedded = PB26_NATIONS.filter((n) => n.participation === 'embedded_personnel')
    expect(flying).toHaveLength(13)
    expect(embedded).toHaveLength(7)
  })

  it('marks JPN and IDN as first_time', () => {
    const jpn = PB26_NATIONS.find((n) => n.code === 'JPN')
    const idn = PB26_NATIONS.find((n) => n.code === 'IDN')
    expect(jpn?.first_time).toBe(true)
    expect(idn?.first_time).toBe(true)
  })

  it('includes Darwin, Tindal, Amberley bases with valid coordinates', () => {
    const names = PB26_BASES.map((b) => b.name)
    expect(names.some((n) => n.includes('Darwin'))).toBe(true)
    expect(names.some((n) => n.includes('Tindal'))).toBe(true)
    expect(names.some((n) => n.includes('Amberley'))).toBe(true)
    for (const b of PB26_BASES) {
      expect(Math.abs(b.lat)).toBeLessThanOrEqual(90)
      expect(Math.abs(b.lon)).toBeLessThanOrEqual(180)
    }
  })

  it('includes confirmed first-time platforms JASDF F-35A and IDN T-50I', () => {
    expect(PB26_PLATFORMS.some((p) => p.id === 'JPN-F35A')).toBe(true)
    expect(PB26_PLATFORMS.some((p) => p.id === 'IDN-T50I')).toBe(true)
  })

  it('includes India Rafale qty 4 and C-17 qty 2', () => {
    const rafale = PB26_PLATFORMS.find((p) => p.id === 'IND-RAFALE')
    const c17 = PB26_PLATFORMS.find((p) => p.id === 'IND-C17')
    expect(rafale?.qty).toBe(4)
    expect(c17?.qty).toBe(2)
  })

  it('every platform has data_confidence', () => {
    for (const p of PB26_PLATFORMS) {
      expect(p.data_confidence).toBeTruthy()
    }
  })

  it('expected platforms marked estimated confidence', () => {
    const ausF35 = PB26_PLATFORMS.find((p) => p.id === 'AUS-F35A')
    expect(ausF35?.data_confidence).toBe('estimated')
  })

  it('Boeing/Thales-touched platforms have OSINT sensors', () => {
    const bundle = BMI_SEED_BUNDLE
    const e7 = bundle.platforms.find((p) => p.id === 'AUS-E7A')
    const rafale = bundle.platforms.find((p) => p.id === 'IND-RAFALE')
    expect(e7?.sensors.length).toBeGreaterThan(0)
    expect(rafale?.sensors.some((s) => s.label.includes('RBE2'))).toBe(true)
  })

  it('no platform JSON contains weapon range or classified performance fields', () => {
    const json = JSON.stringify(PB26_PLATFORMS)
    expect(json).not.toMatch(/weapon_range|detection_range_km|pk_value/i)
  })
})
