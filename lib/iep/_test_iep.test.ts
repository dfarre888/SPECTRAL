import { describe, expect, it } from 'vitest'
import { buildCensusEvidenceNote, firstFridayInAugust } from '@/lib/iep/census-evidence'
import { resolveDocumentTitle, STATE_DOCUMENT_TITLES } from '@/lib/iep/state-labels'
import { countTeacherInputPlaceholders, parseGeneratedIepDraft } from '@/lib/iep/schemas'
import { deidentify, reidentify } from '@/lib/iep/deidentify'

describe('state-labels', () => {
  it('includes SA Negotiated Education Plan', () => {
    expect(STATE_DOCUMENT_TITLES.SA).toBe('Negotiated Education Plan')
    expect(resolveDocumentTitle('SA')).toBe('Negotiated Education Plan')
  })
})

describe('census-evidence', () => {
  it('computes first Friday in August 2026', () => {
    const d = firstFridayInAugust(2026)
    expect(d.getUTCDay()).toBe(5)
    expect(d.getUTCMonth()).toBe(7)
  })

  it('builds hard-coded census note with year', () => {
    const note = buildCensusEvidenceNote(2026)
    expect(note).toContain('10 school weeks')
    expect(note).toContain('August 2026')
    expect(note).toContain('NCCD census date')
  })
})

describe('deidentify', () => {
  it('round-trips PII tokens', () => {
    const { text, map } = deidentify('Alex attends Example Primary', ['Alex', 'Example Primary'])
    expect(text).not.toContain('Alex')
    expect(reidentify(text, map)).toBe('Alex attends Example Primary')
  })
})

describe('schemas', () => {
  it('counts teacher input placeholders', () => {
    expect(countTeacherInputPlaceholders({ academic: { reading: '[REQUIRES TEACHER INPUT]' } })).toBe(1)
  })

  it('parses minimal generated draft', () => {
    const draft = parseGeneratedIepDraft({
      student_profile: { functional_impact: 'test' },
      present_levels: { academic: { reading: '[REQUIRES TEACHER INPUT]' } },
      nccd_adjustment_level: 'supplementary',
      nccd_category: 'cognitive',
      nccd_level_rationale: 'Evidence-based',
      consultation_notes: 'Parent consulted',
      monitoring_plan: { review_schedule: 'Termly' },
      goals: [],
      adjustments: [],
    })
    expect(draft.nccd_adjustment_level).toBe('supplementary')
  })
})
