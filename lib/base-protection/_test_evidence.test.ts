import { describe, it, expect } from 'vitest'
import { buildPayload, canonicalJson, verifyChain, type EvidenceInput } from '@/lib/base-protection/evidence'
import { computeRecordHash, sha384Hex, verifyRecordChain } from '@/lib/base-protection/evidence-hash'
import { buildExerciseSeed } from '@/lib/base-protection/exercise-seed'
import { nowLocal, zonedLocalToUtc } from '@/lib/base-protection/time'

const VALID: EvidenceInput = {
  site_id: 'raaf-williamtown',
  occurred_local: '2026-07-11T21:40',
  detection_method: 'visual',
  sensor: 'Security patrol',
  heading_deg: '250',
  altitude_m_agl: '120',
  drone_type: '',
  track_description: 'Light near the northern fence.',
  threat_level: 'medium',
  threat_rationale: 'Near an active runway.',
  action_taken: 'observe',
  action_detail: '',
  authorising_officer_role: 'Duty Base Security Officer',
  police_agency: 'NSW Police Force',
  police_reference: '',
  police_notified_local: '',
  evidence_items: [{ description: 'Patrol log', algorithm: 'SHA-384', checksum: sha384Hex('x') }],
  notes: '',
}

describe('canonicalJson', () => {
  it('sorts keys at every depth and drops undefined', () => {
    expect(canonicalJson({ b: 1, a: { d: [3, { z: 1, y: 2 }], c: undefined } })).toBe('{"a":{"d":[3,{"y":2,"z":1}]},"b":1}')
  })
  it('is independent of key insertion order', () => {
    expect(canonicalJson({ x: 1, y: 'é' })).toBe(canonicalJson({ y: 'é', x: 1 }))
  })
  it('rejects non-finite numbers', () => {
    expect(() => canonicalJson({ a: Number.NaN })).toThrow()
  })
})

describe('time zones', () => {
  it('converts AEST, AEDT and ACST local times to UTC', () => {
    expect(zonedLocalToUtc('2026-07-11T21:40', 'Australia/Sydney')).toEqual({ utc: '2026-07-11T11:40:00.000Z', offset: '+10:00' })
    expect(zonedLocalToUtc('2026-01-15T09:00', 'Australia/Sydney')).toEqual({ utc: '2026-01-14T22:00:00.000Z', offset: '+11:00' })
    expect(zonedLocalToUtc('2026-09-10T02:30', 'Australia/Darwin')).toEqual({ utc: '2026-09-09T17:00:00.000Z', offset: '+09:30' })
    expect(zonedLocalToUtc('2026-03-18T06:00', 'Asia/Dubai')).toEqual({ utc: '2026-03-18T02:00:00.000Z', offset: '+04:00' })
  })
  it('rejects malformed input', () => {
    expect(zonedLocalToUtc('11/07/2026 21:40', 'Australia/Sydney')).toBeNull()
    expect(zonedLocalToUtc('2026-13-01T00:00', 'Australia/Sydney')).toBeNull()
  })
  it('formats now in a zone', () => {
    expect(nowLocal('Australia/Perth', Date.UTC(2026, 8, 24, 1, 5))).toBe('2026-09-24T09:05')
  })
})

describe('buildPayload', () => {
  it('builds a payload with both local and UTC time', () => {
    const r = buildPayload(VALID)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.payload.occurred).toEqual({ local: '2026-07-11T21:40', time_zone: 'Australia/Sydney', utc_offset: '+10:00', utc: '2026-07-11T11:40:00.000Z' })
    expect(r.payload.track).toMatchObject({ heading_deg: 250, altitude_m_agl: 120, drone_type: 'Not identified' })
    expect(r.payload.amendment_reason).toBeUndefined()
  })
  it('names each missing field', () => {
    const r = buildPayload({ ...VALID, site_id: 'nope', sensor: '', action_taken: 'destroy', action_detail: '', heading_deg: '400' })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(Object.keys(r.errors).sort()).toEqual(['action_detail', 'heading_deg', 'sensor', 'site_id'].sort())
  })
  it('checks checksum length against the algorithm', () => {
    const r = buildPayload({ ...VALID, evidence_items: [{ description: 'clip', algorithm: 'SHA-256', checksum: sha384Hex('x') }] })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.errors['evidence_items.0.checksum']).toMatch(/64 hex/)
  })
  it('requires a reason for an amendment', () => {
    const r = buildPayload(VALID, { requireAmendmentReason: true })
    expect(r.ok).toBe(false)
    const ok = buildPayload({ ...VALID, amendment_reason: 'Reference added' }, { requireAmendmentReason: true })
    expect(ok.ok && ok.payload.amendment_reason).toBe('Reference added')
  })
  it('rejects future times', () => {
    const r = buildPayload({ ...VALID, occurred_local: '2099-01-01T00:00' })
    expect(r.ok).toBe(false)
  })
})

describe('hash chain', () => {
  it('seeds verify, including the amended version', () => {
    const seed = buildExerciseSeed()
    expect(seed.every((r) => r.is_exercise && r.payload.exercise)).toBe(true)
    const chain = verifyRecordChain(seed.filter((r) => r.record_id === seed[0].record_id))
    expect(chain.map((c) => [c.version, c.integrity])).toEqual([
      [1, 'verified'],
      [2, 'verified'],
    ])
    expect(chain[1].prev_hash).toBe(chain[0].record_hash)
    expect(chain[0].record_hash).toMatch(/^[0-9a-f]{96}$/)
  })

  it('detects any change to a stored payload', () => {
    const [v1] = buildExerciseSeed()
    const tampered = { ...v1, payload: { ...v1.payload, action: { ...v1.payload.action, taken: 'destroy' as const } } }
    expect(verifyRecordChain([tampered])[0].integrity).toBe('hash_mismatch')
  })

  it('detects a broken link and marks later versions as untrusted', () => {
    const seed = buildExerciseSeed()
    const [v1, v2] = seed.filter((r) => r.record_id === seed[0].record_id)
    const forgedV1 = { ...v1, payload: { ...v1.payload, notes: 'edited' } }
    forgedV1.record_hash = computeRecordHash(forgedV1)
    const out = verifyRecordChain([forgedV1, v2])
    expect(out[0].integrity).toBe('verified')
    expect(out[1].integrity).toBe('chain_broken')
  })

  it('is stable across created_at formats from the database', () => {
    const [v1] = buildExerciseSeed()
    const fromDb = { ...v1, created_at: '2026-07-11 12:30:00+00' }
    expect(verifyChain([fromDb], sha384Hex)[0].integrity).toBe('verified')
  })
})
