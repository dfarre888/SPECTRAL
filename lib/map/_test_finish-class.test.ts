import { describe, expect, it } from 'vitest'
import { commanderScoreboard, type LaydownEvaluation } from '@/lib/map/laydown-evaluation'
import {
  finishClassForCuasMethods,
  finishClassForEffect,
  finishOutcomeLine,
  finishPctLabel,
} from '@/lib/map/finish-class'

describe('finish-class', () => {
  it('classifies DroneGun as deny and Leonidas / guns as destroy', () => {
    expect(finishClassForCuasMethods(['RF_jamming'])).toBe('deny')
    expect(finishClassForCuasMethods(['directed_energy'])).toBe('destroy')
    expect(finishClassForCuasMethods(['laser'])).toBe('destroy')
    expect(finishClassForCuasMethods(['kinetic'])).toBe('destroy')
    expect(finishClassForCuasMethods(['RF_jamming', 'kinetic'])).toBe('destroy')
    expect(finishClassForEffect('hpm')).toBe('destroy')
    expect(finishClassForEffect('laser')).toBe('destroy')
    expect(finishClassForEffect('kinetic_gun')).toBe('destroy')
  })

  it('labels Pk as P(link) vs P(kill)', () => {
    expect(finishPctLabel('deny')).toBe('P(link)')
    expect(finishPctLabel('destroy')).toBe('P(kill)')
    expect(finishOutcomeLine('deny')).toMatch(/recoverable/i)
    expect(finishOutcomeLine('destroy')).toMatch(/down/i)
  })

  it('commander scoreboard calls deny-only when RF is the only path', () => {
    const evaluation: LaydownEvaluation = {
      subject: { kind: 'uas', instanceId: 'u1', name: 'DJI Mavic 3', lon: 0, lat: 0 },
      sections: [
        { title: 'Radars — can detect', tone: 'can', items: [{ kind: 'radar', assetId: 'r1', name: 'Giraffe', reason: '' }] },
        { title: 'Radars — cannot detect', tone: 'cannot', items: [] },
        {
          title: 'Can shoot down',
          tone: 'can',
          items: [
            {
              kind: 'cuas',
              assetId: 'dronegun-tactical',
              name: 'DroneGun Tactical',
              reason: 'RF deny',
              pct: 71,
              finishClass: 'deny',
            },
          ],
        },
        { title: 'Cannot detect or shoot', tone: 'cannot', items: [] },
      ],
    }
    const board = commanderScoreboard(evaluation)
    expect(board.verdict).toBe('deny_only')
    expect(board.deny).toBe(1)
    expect(board.destroy).toBe(0)
    expect(board.bestDeny?.name).toBe('DroneGun Tactical')
    expect(board.williamtownLine).toMatch(/Williamtown/i)
    expect(board.verdictLine).toMatch(/Airframe stays up/)
  })

  it('commander scoreboard keeps Find and destroy when HPM is present', () => {
    const evaluation: LaydownEvaluation = {
      subject: { kind: 'uas', instanceId: 'u1', name: 'DJI Mavic 3', lon: 0, lat: 0 },
      sections: [
        { title: 'Radars — can detect', tone: 'can', items: [{ kind: 'radar', assetId: 'r1', name: 'Giraffe', reason: '' }] },
        {
          title: 'Can shoot down',
          tone: 'can',
          items: [
            { kind: 'cuas', assetId: 'dronegun-tactical', name: 'DroneGun Tactical', reason: '', pct: 71, finishClass: 'deny' },
            { kind: 'cuas', assetId: 'leonidas-hpm', name: 'Epirus Leonidas', reason: '', pct: 72, finishClass: 'destroy' },
          ],
        },
      ],
    }
    const board = commanderScoreboard(evaluation)
    expect(board.verdict).toBe('can_finish')
    expect(board.deny).toBe(1)
    expect(board.destroy).toBe(1)
    expect(board.bestDestroy?.name).toBe('Epirus Leonidas')
    expect(board.williamtownLine).toMatch(/RF guns/i)
  })
})
