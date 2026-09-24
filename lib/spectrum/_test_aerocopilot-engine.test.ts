import { afterEach, describe, expect, it } from 'vitest'
import { askCopilot } from '@/lib/spectrum/aerocopilot'
import { bedrockRouting, resolveAiMode } from '@/lib/spectrum/aerocopilot-mode'
import { OFFLINE_ENGINE } from '@/lib/spectrum/aerocopilot-engine'
import { classifySource } from '@/lib/trust/source-types'
import { tallyGrades } from '@/lib/trust/provenance'
import { RED_EFFECTORS } from '@/data/seed-effectors-red'
import { BLUE_EFFECTORS } from '@/data/seed-effectors-blue'
import { RED_RADARS } from '@/data/seed-radars-red'
import { BLUE_RADARS } from '@/data/seed-radars-blue'

const ENV = { ...process.env }
afterEach(() => {
  process.env = { ...ENV }
})

describe('AI mode', () => {
  it('is offline by default', () => {
    delete process.env.SPECTRAL_AI_MODE
    process.env.AWS_ACCESS_KEY_ID = 'AKIA-test'
    const m = resolveAiMode()
    expect(m.engine).toEqual(OFFLINE_ENGINE)
    expect(m.requested).toBeNull()
  })

  it('stays offline when bedrock is requested without credentials', () => {
    process.env.SPECTRAL_AI_MODE = 'bedrock'
    delete process.env.AWS_ACCESS_KEY_ID
    delete process.env.AWS_EXECUTION_ENV
    const m = resolveAiMode()
    expect(m.engine.engine).toBe('offline')
    expect(m.reason).toContain('no AWS credentials')
  })

  it('uses Bedrock only when requested and credentials exist, and names the routing', () => {
    process.env.SPECTRAL_AI_MODE = 'bedrock'
    process.env.AWS_ACCESS_KEY_ID = 'AKIA-test'
    process.env.BEDROCK_MODEL_ID = 'ap.anthropic.claude-sonnet-4-6-v1:0'
    const m = resolveAiMode()
    expect(m.engine.engine).toBe('bedrock')
    expect(m.engine.region).toBe('ap-southeast-2')
    expect(m.engine.modelId).toBe('ap.anthropic.claude-sonnet-4-6-v1:0')
    expect(m.engine.label).toContain('Sydney endpoint, Asia Pacific routing')
  })

  it('labels routing from the model id prefix', () => {
    expect(bedrockRouting('au.anthropic.x').short).toBe('Australian routing')
    expect(bedrockRouting('global.anthropic.x').short).toBe('global routing')
    expect(bedrockRouting('anthropic.x').short).toBe('in-region')
  })
})

describe('offline engine', () => {
  const ctx = {
    platforms: [],
    radars: [...RED_RADARS, ...BLUE_RADARS],
    effectors: [...RED_EFFECTORS, ...BLUE_EFFECTORS],
  }

  it('is deterministic: the same question gives the same answer', () => {
    const q = 'What band is the Big Bird radar on?'
    expect(askCopilot(q, ctx)).toEqual(askCopilot(q, ctx))
  })

  it('cites only records that exist in the library it was given', () => {
    const ids = new Set([...ctx.radars.map((r) => r.id), ...ctx.effectors.map((e) => e.id)])
    for (const q of ['What band is the Big Bird radar on?', 'Where should I place my defensive systems?']) {
      for (const r of askCopilot(q, ctx).refs ?? []) expect(ids.has(r.id)).toBe(true)
    }
  })
})

describe('provenance helpers', () => {
  it('classifies citations by type', () => {
    expect(classifySource("OSINT: Jane's Radar 2024 - ELM-2084")).toBe('reference')
    expect(classifySource('OSINT: RUSI Ukraine Analysis May 2023')).toBe('research')
    expect(classifySource('OSINT: US Pentagon press briefing 9 May 2023')).toBe('official')
    expect(classifySource('Baykar press')).toBe('industry')
    expect(classifySource('OSINT: Breaking Defense Feb 2024')).toBe('media')
    expect(classifySource('OSINT: SPECTRAL_INTEL_UPDATE_2025')).toBe('compilation')
    expect(classifySource('A3DM RPAS Database (shared catalog)')).toBe('catalogue')
    expect(classifySource('Map envelope: OSINT family match or estimated 5 km / 12 m/s')).toBe('estimate')
    expect(classifySource('OSINT: ABC News Australia, 9 July 2026 - ADF missile interceptor test')).toBe('media')
    expect(classifySource('Defence news, 24 Jul 2026: https://www.defence.gov.au/news-events/news/x')).toBe('official')
    expect(classifySource('something unknown')).toBe('other')
  })

  it('tallies grades case-insensitively, strongest first', () => {
    expect(tallyGrades(['high', 'Estimated', 'HIGH', null, 'medium'])).toEqual([
      { grade: 'High', count: 2 },
      { grade: 'Medium', count: 1 },
      { grade: 'Estimated', count: 1 },
      { grade: 'Ungraded', count: 1 },
    ])
  })
})
