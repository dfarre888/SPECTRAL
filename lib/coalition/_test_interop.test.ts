import { describe, expect, it } from 'vitest'
import {
  analyseInterop,
  analyseInteropUnderGnssDenial,
  interopUnderDenial,
  type InteropBearer,
  type InteropPlatform,
} from '@/lib/coalition/interop'

const dl = (standard: string, gw = false, pnt = true, label?: string): InteropBearer => ({
  standard, kind: 'datalink', gatewayCapable: gw, pntDependent: pnt, label: label ?? standard,
})
const voice = (band: string): InteropBearer => ({
  standard: null, kind: `voice_${band.toLowerCase()}`, gatewayCapable: false,
  pntDependent: false, label: `${band} voice`,
})
const satData: InteropBearer = {
  standard: null, kind: 'data_satcom', gatewayCapable: false, pntDependent: false, label: 'SATCOM data',
}

function p(id: string, nationCode: string, bearers: InteropBearer[]): InteropPlatform {
  return { id, label: id, nationCode, bearers }
}

describe('coalition connectivity — tiers', () => {
  it('scores a voice-only vehicle as voice-connected, not isolated', () => {
    const r = analyseInterop([p('f35', 'AUS', [dl('link16')]), p('bushmaster', 'AUS', [voice('UHF')])])
    expect(r.unconnectedIds).toEqual([])
    expect(r.tierByPlatform['bushmaster']).toBe('voice')
    expect(r.tierByPlatform['f35']).toBe('track')
    // Half the force cannot take machine tracks, but all of it is reachable.
    expect(r.track.coveragePct).toBe(50)
    expect(r.voice.coveragePct).toBe(50)
  })

  it('reports only genuinely bearer-less platforms as unconnected', () => {
    const r = analyseInterop([p('mine', 'AUS', [])])
    expect(r.unconnectedIds).toEqual(['mine'])
    expect(r.tierByPlatform['mine']).toBe('none')
  })

  it('joins nations on a shared coalition track standard', () => {
    const r = analyseInterop([
      p('a', 'AUS', [dl('link16')]), p('b', 'USA', [dl('link16')]), p('c', 'GBR', [dl('link16')]),
    ])
    expect(r.track.islands).toHaveLength(1)
    expect(r.track.islands[0].nations).toEqual(['AUS', 'GBR', 'USA'])
    expect(r.track.cohesionPct).toBe(100)
  })

  it('keeps indigenous links nation-scoped — the adversary bloc gap', () => {
    const r = analyseInterop([p('chn', 'CHN', [dl('national')]), p('rus', 'RUS', [dl('national')])])
    expect(r.track.islands).toHaveLength(2)
    expect(r.track.cohesionPct).toBe(50)
  })

  it('bridges Link 22 to Link 11 natively — no relay platform needed', () => {
    const r = analyseInterop([p('l22', 'GBR', [dl('link22')]), p('l11', 'USA', [dl('link11')])])
    expect(r.track.islands).toHaveLength(1)
    expect(r.track.cohesionPct).toBe(100)
  })

  it('does not bridge Link 22 to Link 16 without a fitted relay', () => {
    const r = analyseInterop([p('l22', 'GBR', [dl('link22')]), p('l16', 'USA', [dl('link16')])])
    expect(r.track.islands).toHaveLength(2)
  })

  it('bridges Link 22 to Link 16 through a gateway carrying both', () => {
    const r = analyseInterop([
      p('l22', 'GBR', [dl('link22')]),
      p('l16', 'USA', [dl('link16')]),
      p('e7a', 'AUS', [dl('link16', true), dl('link22', true)]),
    ])
    expect(r.track.islands).toHaveLength(1)
    expect(r.track.cohesionPct).toBe(100)
  })

  it('leaves a MADL flight off the coalition picture until relayed', () => {
    const isolated = analyseInterop([
      p('f35a', 'AUS', [dl('madl')]), p('f35b', 'AUS', [dl('madl')]), p('f18', 'AUS', [dl('link16')]),
    ])
    expect(isolated.track.islands).toHaveLength(2)

    const relayed = analyseInterop([
      p('f35a', 'AUS', [dl('madl')]), p('f18', 'AUS', [dl('link16')]),
      p('e7a', 'AUS', [dl('link16', true), dl('madl', true)]),
    ])
    expect(relayed.track.islands).toHaveLength(1)
  })

  it('groups voice by band so different bands do not merge', () => {
    const r = analyseInterop([
      p('a', 'AUS', [voice('UHF')]), p('b', 'USA', [voice('UHF')]), p('c', 'GBR', [voice('HF')]),
    ])
    expect(r.voice.islands).toHaveLength(2)
    expect(r.voice.coveragePct).toBe(100)
  })

  it('separates SATCOM data from the track tier', () => {
    const r = analyseInterop([p('a', 'AUS', [satData]), p('b', 'USA', [satData])])
    expect(r.data.cohesionPct).toBe(100)
    expect(r.track.participantIds).toEqual([])
    expect(r.tierByPlatform['a']).toBe('data')
  })

  it('takes the best tier when a platform holds several bearers', () => {
    const r = analyseInterop([p('e7a', 'AUS', [dl('link16'), satData, voice('HF')])])
    expect(r.tierByPlatform['e7a']).toBe('track')
  })

  it('drops PNT-dependent bearers under denial but keeps voice up', () => {
    const force = [
      p('a', 'AUS', [dl('link16'), voice('HF')]),
      p('b', 'USA', [dl('link16'), voice('HF')]),
    ]
    expect(analyseInterop(force).track.coveragePct).toBe(100)
    const denied = analyseInteropUnderGnssDenial(force)
    expect(denied.track.participantIds).toEqual([])
    // The force is still coordinated by voice — that is the point of tiering.
    expect(denied.voice.cohesionPct).toBe(100)
    expect(denied.unconnectedIds).toEqual([])
  })

  it('keeps a non-PNT link alive under denial', () => {
    // Link 11 is modelled as not PNT-dependent.
    const denied = analyseInteropUnderGnssDenial([
      p('a', 'USA', [dl('link11', false, false)]), p('b', 'GBR', [dl('link11', false, false)]),
    ])
    expect(denied.track.cohesionPct).toBe(100)
  })

  it('quantifies the denial delta at the track tier', () => {
    const d = interopUnderDenial([
      p('a', 'AUS', [dl('link16'), voice('UHF')]),
      p('b', 'USA', [dl('link16'), voice('UHF')]),
    ])
    expect(d.nominal.track.cohesionPct).toBe(100)
    expect(d.denied.track.cohesionPct).toBe(0)
    expect(d.trackCohesionDropPct).toBe(100)
    expect(d.lostTrackIds).toEqual(['a', 'b'])
  })

  it('handles an empty force without dividing by zero', () => {
    const r = analyseInterop([])
    expect(r.track.cohesionPct).toBe(0)
    expect(r.track.coveragePct).toBe(0)
    expect(r.unconnectedIds).toEqual([])
  })
})

describe('reach versus cohesion', () => {
  const dl2 = (standard: string, pnt = true): InteropBearer => ({
    standard, kind: 'datalink', gatewayCapable: false, pntDependent: pnt, label: standard,
  })

  it('does not let a collapsed force report full cohesion', () => {
    // Four on a PNT-dependent link, one on a link that survives denial.
    const force = [
      p('a', 'USA', [dl2('link16')]),
      p('b', 'USA', [dl2('link16')]),
      p('c', 'USA', [dl2('link16')]),
      p('d', 'USA', [dl2('link16')]),
      p('e', 'USA', [dl2('link11', false)]),
    ]
    const nominal = analyseInterop(force)
    // link16 and link11 do not bridge natively, so two islands of 4 and 1.
    expect(nominal.track.reachPct).toBe(80)

    const denied = analyseInteropUnderGnssDenial(force)
    // Only 'e' survives. Cohesion flatters it; reach tells the truth.
    expect(denied.track.cohesionPct).toBe(100)
    expect(denied.track.reachPct).toBe(20)

    const d = interopUnderDenial(force)
    expect(d.trackReachDropPct).toBe(60)
    expect(d.lostTrackIds).toEqual(['a', 'b', 'c', 'd'])
  })
})
