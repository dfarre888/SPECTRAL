/**
 * Ops Command SSE — client apply helpers
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */
import { describe, expect, it } from 'vitest'
import {
  applyCommandStreamDecision,
  parseCommandPlanStreamData,
} from '@/lib/command/apply-command-stream-event'
import type { GoNoGoAssessment } from '@/lib/command/go-no-go-types'

function mockBoard(status: GoNoGoAssessment['status'] = 'go'): GoNoGoAssessment {
  return {
    status,
    blocking: [],
    caution: [],
    reasons: [],
    assessed_at: '2026-07-19T00:00:00.000Z',
    plan_id: 'plan-99',
    package_id: 'pkg-1',
    package_label: 'Test package',
    tiles: {
      pace: { status: 'go', summary: 'ok' },
      pnt: { status: 'go', summary: 'ok', jam_active: false },
      economics: { status: 'go', summary: 'ok', mag_depth: 4 },
      weather: { status: 'go', summary: 'ok' },
      airspace: { status: 'go', summary: 'ok', roz_count: 0 },
      competency: { status: 'go', summary: 'ok', ds_only: true },
    },
  }
}

describe('applyCommandStreamDecision', () => {
  it('updates mock board status from decision payload', () => {
    const board = mockBoard('go')
    const next = applyCommandStreamDecision(board, {
      decision: 'caution',
      assessed_at: '2026-07-19T12:00:00.000Z',
      audit_id: 'aud-1',
    })
    expect(next).not.toBeNull()
    expect(next!.status).toBe('caution')
    expect(next!.assessed_at).toBe('2026-07-19T12:00:00.000Z')
    expect(next!.package_label).toBe('Test package')
  })

  it('rejects invalid decision payloads', () => {
    const board = mockBoard('go')
    expect(applyCommandStreamDecision(board, null)).toBeNull()
    expect(applyCommandStreamDecision(board, { decision: 'maybe' })).toBeNull()
    expect(applyCommandStreamDecision(board, {})).toBeNull()
  })
})

describe('parseCommandPlanStreamData', () => {
  it('parses plan.updated and decision events; ignores connected/close', () => {
    expect(
      parseCommandPlanStreamData(
        JSON.stringify({ type: 'plan.updated', payload: { id: 'p1' }, publishedAt: 1 }),
      ),
    ).toMatchObject({ type: 'plan.updated' })
    expect(
      parseCommandPlanStreamData(
        JSON.stringify({
          type: 'command.go_no_go.decision',
          payload: { decision: 'no_go' },
          publishedAt: 2,
        }),
      ),
    ).toMatchObject({ type: 'command.go_no_go.decision', payload: { decision: 'no_go' } })
    expect(parseCommandPlanStreamData(JSON.stringify({ type: 'connected', planId: 'p' }))).toBeNull()
    expect(parseCommandPlanStreamData(JSON.stringify({ type: 'close', payload: {} }))).toBeNull()
    expect(parseCommandPlanStreamData('not-json')).toBeNull()
  })
})
