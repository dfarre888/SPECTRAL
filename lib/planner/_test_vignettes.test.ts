import { describe, expect, it } from 'vitest'
import { getVignette, PLANNER_VIGNETTES, vignetteToLaydown } from '@/lib/planner/vignettes'
import { LAYDOWN_PRESETS } from '@/lib/map/laydown-presets'

const NEW_IDS = ['ts27-combat-team', 'williamtown-incursion', 'al-minhad-owa']

describe('demo vignettes', () => {
  it('adds the three ADF demo vignettes with "Title: qualifier" names and no em dashes', () => {
    for (const id of NEW_IDS) {
      const v = getVignette(id)
      expect(v, id).toBeDefined()
      expect(v!.name).toMatch(/^[^:]+: .+/)
      expect(v!.name + v!.description).not.toMatch(/—/)
    }
    expect(getVignette('ts27-combat-team')!.name).toBe('Talisman Sabre 27: Combat team drone strike vs counter-RAS')
    expect(getVignette('williamtown-incursion')!.name).toBe('RAAF Williamtown: Drone incursion response')
    expect(getVignette('al-minhad-owa')!.name).toBe('Al Minhad Air Base: One-way attack drone saturation')
  })

  it('each new vignette names a real preset and a viewport', () => {
    const presetIds = new Set(LAYDOWN_PRESETS.map((p) => p.id))
    for (const id of NEW_IDS) {
      const v = getVignette(id)!
      expect(presetIds.has(v.preset!)).toBe(true)
      const doc = vignetteToLaydown(v)
      expect(doc.viewport).toBeDefined()
    }
    expect(getVignette('ts27-combat-team')!.openTool).toBe('fratricide')
  })

  it('cites dated public events in the descriptions', () => {
    expect(getVignette('williamtown-incursion')!.description).toMatch(/11 to 13 Jul .*2026/)
    expect(getVignette('al-minhad-owa')!.description).toMatch(/3 Mar 2026.*18 Mar 2026/)
    expect(getVignette('ts27-combat-team')!.description).toMatch(/Defence Connect/)
  })

  it('keeps vignette ids unique', () => {
    const ids = PLANNER_VIGNETTES.map((v) => v.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

import { hydrateLaydown, serializeLaydown } from '@/lib/planner/battlespace-plan'

describe('saved plans keep combat-team fields', () => {
  it('round-trips side, role, callsign, launch time, link plan and jammer EMCON', () => {
    const uasAsset = { id: 'fpv' } as never
    const cuasAsset = { id: 'dronebuster' } as never
    const state = {
      placedUas: [{
        instanceId: 'u1', asset: uasAsset, lon: 150, lat: -22, terrainAMSL: 10, discAltitude_m: 100,
        lateralRadius_m: 500, ceilingAMSL_m: 200, annotationTime_min: 0, effectiveRange_km: 20,
        infoPanelClosed: false, side: 'blue', role: 'strike', callsign: 'FPV A1', launchTime_min: 12,
        linkPlan: { c2_mhz: 900 } as never,
      }],
      placedCuas: [{
        instanceId: 'c1', asset: cuasAsset, lon: 150.01, lat: -22.01, terrainAMSL: 10, hasTerrainMasking: false,
        side: 'blue', callsign: 'Coy HQ DroneBuster', emcon: { silentWindows: [{ from_min: 10, to_min: 16 }] } as never,
      }],
      placedRadars: [],
      placedEffectors: [],
    }
    const doc = serializeLaydown(state as never)
    const back = hydrateLaydown(doc, { uas: [uasAsset], cuas: [cuasAsset], radars: [], effectors: [] } as never)
    expect(back.placedUas[0]).toMatchObject({ side: 'blue', role: 'strike', callsign: 'FPV A1', launchTime_min: 12 })
    expect(back.placedUas[0].linkPlan).toEqual({ c2_mhz: 900 })
    expect(back.placedCuas[0]).toMatchObject({ side: 'blue', callsign: 'Coy HQ DroneBuster' })
    expect(back.placedCuas[0].emcon).toEqual({ silentWindows: [{ from_min: 10, to_min: 16 }] })
  })
})
