import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ARENA_FOG_OF_WAR_TOUR,
  TOURS,
  getTour,
  tourSeenKey,
} from '@/lib/tour/tours'

const ARENA_WORKSPACE = resolve(__dirname, '../../components/arena/ArenaWorkspace.tsx')

describe('guided tours', () => {
  it('has unique tour ids and unique step ids within each tour', () => {
    const ids = TOURS.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const tour of TOURS) {
      const stepIds = tour.steps.map((s) => s.id)
      expect(new Set(stepIds).size, `${tour.id} step ids`).toBe(stepIds.length)
    }
  })

  it('gives every step usable copy', () => {
    for (const tour of TOURS) {
      expect(tour.steps.length).toBeGreaterThan(1)
      for (const s of tour.steps) {
        expect(s.title, `${tour.id}/${s.id} title`).toBeTruthy()
        expect(s.body.length, `${tour.id}/${s.id} body`).toBeGreaterThan(20)
      }
    }
  })

  it('centres any step that has no anchor', () => {
    for (const tour of TOURS) {
      for (const s of tour.steps) {
        if (s.target === null) expect(s.placement, `${tour.id}/${s.id}`).toBe('center')
      }
    }
  })

  it('lets Cesium settle after every view change', () => {
    for (const tour of TOURS) {
      for (const s of tour.steps) {
        if (s.action?.type === 'cop-mode') {
          expect(s.settleMs, `${tour.id}/${s.id} settleMs`).toBeGreaterThanOrEqual(1000)
        }
      }
    }
  })

  it('anchors every step to a data-tour target that exists in the Arena', () => {
    const source = readFileSync(ARENA_WORKSPACE, 'utf8')
    const targets = ARENA_FOG_OF_WAR_TOUR.steps
      .map((s) => s.target)
      .filter((t): t is string => t !== null)
    for (const t of new Set(targets)) {
      expect(source, `data-tour="${t}" missing from ArenaWorkspace`).toContain(
        `data-tour="${t}"`,
      )
    }
  })

  it('covers all three COP views so the demo shows the disagreement', () => {
    const modes = ARENA_FOG_OF_WAR_TOUR.steps
      .map((s) => s.action?.value)
      .filter(Boolean)
    expect(modes).toContain('orbat')
    expect(modes).toContain('blue_picture')
    expect(modes).toContain('red_fow')
  })

  it('resolves tours by id and namespaces its storage key', () => {
    expect(getTour('arena-fog-of-war')?.id).toBe('arena-fog-of-war')
    expect(getTour('nope')).toBeUndefined()
    expect(tourSeenKey('arena-fog-of-war')).toBe('spectral-tour-seen:arena-fog-of-war')
  })
})
