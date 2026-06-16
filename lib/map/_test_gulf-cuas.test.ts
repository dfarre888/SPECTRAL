import { describe, expect, it } from 'vitest'
import { CAPABILITIES } from '@/data/seed-capabilities'
import { resolvePlatformImagePath } from '@/lib/platforms/image-resolve'

const GULF_CUAS_IDS = [
  'edge-horizon',
  'ah-64e-apache-cuas',
  'f-16-block60-intercept',
  'merops-interceptor',
  'iron-drone-raider',
  'dronehunter-f700',
  'skynex',
  'apkws-vampire-launcher',
  'gepard-cuas',
  'iris-t-slm-cuas',
]

export const GLOBAL_ORBAT_IDS = [
  'nasams-amraam-er',
  'iris-t-sls-cuas',
  'faad-c2-node',
  'iron-dome-tamir',
  'davids-sling-cuas',
  'martlet-airborne-cuas',
  'land-ceptor-cuas',
  'pilica-plus',
  'narew-camm-er',
  'skyguard-laser',
  'shahin-cuas',
  'm-shorad-stryker',
  'bullfrog-apkws',
  'akash-ng-cuas',
  'bharani-gun',
  'l-sam-cheongung',
  'sm-2-aegis-cuas',
  'sm-6-aegis-cuas',
  'pantsir-s1-cuas',
]

const ALL_CUAS_ORBAT_IDS = [...GULF_CUAS_IDS, ...GLOBAL_ORBAT_IDS]

describe('gulf and global counter-uas catalogue', () => {
  it('spectrum capabilities seeded for all Gulf C-UAS IDs', () => {
    for (const id of GULF_CUAS_IDS) {
      const caps = CAPABILITIES.filter((c) => c.platform_id === id)
      expect(caps.length, id).toBeGreaterThan(0)
    }
  })

  it('spectrum capabilities seeded for all global ORBAT C-UAS IDs', () => {
    for (const id of GLOBAL_ORBAT_IDS) {
      const caps = CAPABILITIES.filter((c) => c.platform_id === id)
      expect(caps.length, id).toBeGreaterThan(0)
    }
  })

  it('skynex and edge-horizon resolve map placement images', () => {
    expect(resolvePlatformImagePath('skynex')).toBe('/assets/platforms/starstreak-hvm.jpg')
    expect(resolvePlatformImagePath('edge-horizon')).toBe('/assets/platforms/anduril-anvil.jpg')
  })

  it('naval and SAM proxies resolve manifest images', () => {
    expect(resolvePlatformImagePath('sm-2-aegis-cuas')).toBe('/assets/platforms/searam.jpg')
    expect(resolvePlatformImagePath('martlet-airborne-cuas')).toBe('/assets/platforms/uj-22-airborne.jpg')
  })

  it('exports combined ORBAT id list for map tests', () => {
    expect(ALL_CUAS_ORBAT_IDS).toHaveLength(GULF_CUAS_IDS.length + GLOBAL_ORBAT_IDS.length)
  })
})
