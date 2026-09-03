/**
 * Operations tier — live rehearsal + MOAT → Acquire loop
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  __resetPlanLiveBusForTests,
  getLastFanoutMs,
  publishPlanEvent,
  subscribePlan,
} from '@/lib/planner/plan-live-bus'
import {
  clearMemoryAuditLog,
  enableAuditTestMode,
  getMemoryAuditLog,
  writeAuditLog,
  auditDecision,
} from '@/lib/operations/audit'
import { buildAAR } from '@/lib/pcm/debrief-engine'
import { suggestGapsFromCompetency } from '@/lib/moat/acquisition-bridge'
import { applyCommandStreamDecision } from '@/lib/command/apply-command-stream-event'
import type { PCM } from '@/lib/pcm/spectral.types'

describe('Operations MOAT loop + Command SSE', () => {
  beforeEach(() => {
    vi.stubEnv('SPECTRAL_EDITION', 'operations')
    __resetPlanLiveBusForTests()
    enableAuditTestMode(true)
    clearMemoryAuditLog()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    enableAuditTestMode(false)
    clearMemoryAuditLog()
    __resetPlanLiveBusForTests()
  })

  it('SSE fanout delivers plan.updated to two subscribers <2s', () => {
    const received: string[] = []
    const unsubA = subscribePlan('tenant-a', 'plan-1', (e) => received.push('A:' + e.type))
    const unsubB = subscribePlan('tenant-a', 'plan-1', (e) => received.push('B:' + e.type))
    const t0 = performance.now()
    publishPlanEvent('tenant-a', 'plan-1', 'plan.updated', { id: 'plan-1' })
    const elapsed = performance.now() - t0
    expect(received).toEqual(['A:plan.updated', 'B:plan.updated'])
    expect(elapsed).toBeLessThan(2000)
    expect(getLastFanoutMs('tenant-a', 'plan-1')).toBeLessThan(2000)
    unsubA()
    unsubB()
  })

  it('GO/NO-GO decision event updates mock board status <2s', () => {
    // Mirrors CommandBoardClient: bus event → applyCommandStreamDecision → board.status
    let board = {
      status: 'go' as const,
      blocking: [] as string[],
      caution: [] as string[],
      reasons: [] as [],
      assessed_at: '2026-07-19T00:00:00.000Z',
      plan_id: 'plan-99',
      package_id: null as string | null,
      package_label: 'Mock',
      tiles: {
        pace: { status: 'go' as const, summary: '' },
        pnt: { status: 'go' as const, summary: '', jam_active: false },
        economics: { status: 'go' as const, summary: '', mag_depth: null as number | null },
        weather: { status: 'go' as const, summary: '' },
        airspace: { status: 'go' as const, summary: '', roz_count: 0 },
        competency: { status: 'go' as const, summary: '', ds_only: true as const },
      },
    }
    const unsub = subscribePlan('tenant-a', 'plan-99', (e) => {
      if (e.type === 'command.go_no_go.decision') {
        const next = applyCommandStreamDecision(board, e.payload)
        if (next) board = next
      }
    })
    const t0 = performance.now()
    publishPlanEvent('tenant-a', 'plan-99', 'command.go_no_go.decision', {
      decision: 'caution',
      assessed_at: new Date().toISOString(),
    })
    expect(performance.now() - t0).toBeLessThan(2000)
    expect(board.status).toBe('caution')
    unsub()
  })

  it('tenant isolation — peer tenant does not receive events', () => {
    let leaked = false
    const unsub = subscribePlan('tenant-b', 'plan-1', () => {
      leaked = true
    })
    publishPlanEvent('tenant-a', 'plan-1', 'plan.updated', {})
    expect(leaked).toBe(false)
    unsub()
  })

  it('audit log on go-no-go assessment run', async () => {
    const row = await writeAuditLog({
      tenantId: 'tenant-a',
      userId: 'user-1',
      action: 'command.go_no_go.assessment',
      resourceType: 'go_no_go',
      resourceId: 'plan-1',
      metadata: { status: 'caution' },
      requirePersisted: false,
    })
    expect(row.persisted).toBe(true)
    expect(getMemoryAuditLog().some((r) => r.action === 'command.go_no_go.assessment')).toBe(true)
  })

  it('audit log on go-no-go decision', async () => {
    const row = await auditDecision({
      tenantId: 'tenant-a',
      userId: 'user-1',
      action: 'command.go_no_go.decision',
      resourceType: 'go_no_go',
      resourceId: 'plan-1',
      metadata: { decision: 'go' },
    })
    expect(row.id).toBeTruthy()
    expect(getMemoryAuditLog().some((r) => r.action === 'command.go_no_go.decision')).toBe(true)
  })

  it('accredited resolver / supplements not imported from client dirs', () => {
    // Ban server modules — type-only imports from *-data are allowed for props typing
    const bannedPatterns = [
      /from ['"]@\/lib\/operations\/accredited-pk-resolver['"]/,
      /from ['"]@\/lib\/operations\/accredited-supplements['"]/,
      // Value imports of accredited tables (type-only imports of *-data are allowed)
      /import\s+(?!type\s)\{[^}]*OFFLINE_ACCREDITED/,
      /OFFLINE_ACCREDITED_DEFEAT_PK/,
      /OFFLINE_ACCREDITED_ERP/,
      /OFFLINE_ACCREDITED_WAVEFORMS/,
    ]
    const roots = [
      path.resolve(__dirname, '../../components'),
      path.resolve(__dirname, '../../app/(main)'),
      path.resolve(__dirname, '../../app/map'),
    ]
    const offenders: string[] = []
    const walk = (dir: string) => {
      if (!fs.existsSync(dir)) return
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, ent.name)
        if (ent.isDirectory()) {
          if (ent.name === 'node_modules' || ent.name === 'api') continue
          walk(full)
          continue
        }
        if (!/\.(tsx|ts|jsx|js)$/.test(ent.name)) continue
        const src = fs.readFileSync(full, 'utf8')
        for (const re of bannedPatterns) {
          if (re.test(src)) offenders.push(`${full} :: ${re}`)
        }
      }
    }
    for (const r of roots) walk(r)
    expect(offenders).toEqual([])
  })

  it('accredited-pk-resolver and accredited-supplements declare server-only', () => {
    for (const rel of [
      'lib/operations/accredited-pk-resolver.ts',
      'lib/operations/accredited-supplements.ts',
    ]) {
      const src = fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf8')
      expect(src).toContain("import 'server-only'")
    }
  })

  it('AAR includes plan_revision_suggestions stub', () => {
    const ws = {
      turn: 1,
      phase: 'contested',
      outcome: 'continues',
      blue_force: { magazine_expended: 4 },
      red_force: { platforms: [] },
    } as unknown as PCM.WorldState
    const turns = [
      {
        turn: 1,
        adjudication: {
          events: [
            { type: 'impact', description: 'leaker impact', event_id: 'E1' },
            { type: 'weapon_release', description: 'magazine empty', event_id: 'E2' },
          ],
          key_decision_this_turn: true,
          blue_win_probability: 0.4,
        },
      },
    ] as unknown as PCM.TurnRecord[]
    const aar = buildAAR('ex-loop', turns, ws)
    expect(Array.isArray(aar.plan_revision_suggestions)).toBe(true)
    expect(aar.plan_revision_suggestions.length).toBeGreaterThan(0)
    expect(aar.plan_revision_suggestions[0]).toMatchObject({
      id: expect.any(String),
      priority: expect.stringMatching(/high|medium|low/),
      summary: expect.any(String),
      suggested_action: expect.any(String),
    })
  })

  it('complete loop: AAR revision + MOAT suggestion visible shape', () => {
    const gaps = suggestGapsFromCompetency({
      player_id: 'p',
      callsign: 'VIPER-1',
      blind_spots: [
        {
          id: 'bs-loop',
          competency: 'magazine_management',
          description: 'Needs SPAAG layer after AAR leakers',
          first_observed_exercise_id: 'ex-loop',
          first_observed_at: '2026-07-01T00:00:00.000Z',
          recurrence_count: 2,
          sessions_observed: ['ex-loop'],
          severity: 'high',
          curriculum_module_assigned: null,
          status: 'active',
          resolution_evidence: null,
          trigger_conditions: ['saturation'],
        },
      ],
    })
    expect(gaps[0]!.href).toContain('from=moat')
    expect(gaps[0]!.narrative).toContain('VIPER-1')
  })
})
