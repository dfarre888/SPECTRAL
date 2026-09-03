import { describe, expect, it } from 'vitest'
import { briefFilename, buildScenarioBrief } from '@/lib/wopr/scenario-brief'
import type { SensorTrack, TickResult, WoprPlatform, WoprScenario } from '@/lib/wopr/types'

function plat(over: Partial<WoprPlatform> & Pick<WoprPlatform, 'id' | 'name' | 'side'>): WoprPlatform {
  return {
    lat: -35.3, lon: 149.1, alt_m: 500, platform_type: 'uas',
    radiating: false, destroyed: false, ...over,
  }
}

function track(name: string, over: Partial<SensorTrack> = {}): SensorTrack {
  return { id: `t-${name}`, name, lat: 0, lon: 0, confidence: 'medium', source: 'radar', ...over }
}

const SCENARIO: WoprScenario = {
  id: 's1', tenant_id: 't1', name: 'Op Southern Reach',
  classification: 'UNCLASSIFIED', elapsed_min: 45, status: 'running',
  world_state: {
    battlespace: {
      terrain: 'coastal',
      weather: { wind_kts: 12, visibility_km: 9, cloud_base_ft: 3000 },
      time: { mission_elapsed_min: 45, day_night: 'night' },
    },
    red_orbat: { platforms: [plat({ id: 'r1', name: 'Shahed-136', side: 'red' })] },
    blue_orbat: {
      platforms: [
        plat({ id: 'b1', name: 'NASAMS', side: 'blue' }),
        plat({ id: 'b2', name: 'Wedgetail', side: 'blue' }),
        plat({ id: 'b3', name: 'Ghost Bat', side: 'blue', destroyed: true }),
      ],
    },
    comms_status: { link16: 'up', satcom: 'degraded' },
  },
}

describe('scenario brief', () => {
  it('carries scenario identity and battlespace through', () => {
    const b = buildScenarioBrief(SCENARIO, null, new Date('2026-09-03T04:05:00Z'))
    expect(b.title).toBe('Op Southern Reach')
    expect(b.classification).toBe('UNCLASSIFIED')
    expect(b.elapsedMin).toBe(45)
    expect(b.battlespace.dayNight).toBe('night')
    expect(b.battlespace.visibilityKm).toBe(9)
    expect(b.orbat.red).toHaveLength(1)
    expect(b.orbat.blue).toHaveLength(3)
  })

  it('reports zero coverage when no tick has run', () => {
    const b = buildScenarioBrief(SCENARIO, null)
    expect(b.detection.blueSeesRed.coveragePct).toBe(0)
    expect(b.detection.blueSeesRed.rows[0].detected).toBe(false)
  })

  it('quantifies the intelligence gap from each side picture', () => {
    const tick: TickResult = {
      elapsed_min: 45, turn: 3,
      blue_picture: [track('Shahed-136', { confidence: 'high', source: 'radar' })],
      red_picture: [], // Red holds nothing
      events: ['T+45 Blue radar acquires inbound'],
      propagation_refreshed: true,
    }
    const b = buildScenarioBrief(SCENARIO, tick)

    expect(b.detection.blueSeesRed.coveragePct).toBe(100)
    expect(b.detection.blueSeesRed.rows[0].confidence).toBe('high')
    expect(b.detection.blueSeesRed.rows[0].source).toBe('radar')

    expect(b.detection.redSeesBlue.coveragePct).toBe(0)
    expect(b.detection.redSeesBlue.detectedCount).toBe(0)
  })

  it('excludes destroyed platforms so coverage is not flattered by kills', () => {
    const b = buildScenarioBrief(SCENARIO, null)
    // Blue has 3 platforms but one is destroyed — Red is only graded on 2.
    expect(b.detection.redSeesBlue.totalCount).toBe(2)
    expect(b.detection.redSeesBlue.rows.map((r) => r.targetName)).not.toContain('Ghost Bat')
  })

  it('matches tracks to platforms regardless of case and padding', () => {
    const tick: TickResult = {
      elapsed_min: 45, turn: 1,
      blue_picture: [track('  shahed-136  ')],
      red_picture: [track('NASAMS')],
      events: [], propagation_refreshed: false,
    }
    const b = buildScenarioBrief(SCENARIO, tick)
    expect(b.detection.blueSeesRed.detectedCount).toBe(1)
    expect(b.detection.redSeesBlue.detectedCount).toBe(1)
  })

  it('carries comms state and the event log', () => {
    const tick: TickResult = {
      elapsed_min: 45, turn: 2, blue_picture: [], red_picture: [],
      events: ['e1', 'e2'], propagation_refreshed: false,
    }
    const b = buildScenarioBrief(SCENARIO, tick)
    expect(b.comms).toContainEqual({ id: 'satcom', state: 'degraded' })
    expect(b.events).toEqual(['e1', 'e2'])
  })

  it('builds a filesystem-safe filename', () => {
    const b = buildScenarioBrief(SCENARIO, null, new Date('2026-09-03T04:05:00Z'))
    expect(briefFilename(b)).toBe('spectral-brief-op-southern-reach-202609030405')
  })
})
