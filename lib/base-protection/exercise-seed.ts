/**
 * Exercise records for the demo tenant. Training examples only: they follow
 * the publicly reported pattern at Williamtown (Jul and Aug 2026) and a
 * synthetic Darwin inject, and are marked `exercise: true` throughout.
 * Not real incidents, not real police references.
 *
 * Used to generate the seed rows in the migration (hashes computed with the
 * same code the API uses, so they verify) and as the in-memory fallback.
 */
import { buildPayload, type EvidenceInput, type EvidenceRecord } from '@/lib/base-protection/evidence'
import { computeRecordHash, sha384Hex } from '@/lib/base-protection/evidence-hash'

const placeholder = (label: string) => sha384Hex(`EXERCISE PLACEHOLDER FILE: ${label}`)

interface SeedSpec {
  id: string
  record_id: string
  version: number
  created_at: string
  input: EvidenceInput
}

const W1: EvidenceInput = {
  exercise: true,
  site_id: 'raaf-williamtown',
  occurred_local: '2026-07-11T21:40',
  detection_method: 'visual',
  sensor: 'Security patrol with night-vision binoculars',
  heading_deg: 250,
  altitude_m_agl: 120,
  drone_type: 'Small multirotor, type not identified',
  track_description:
    'Exercise. Single light hovering near the northern boundary, moved towards the runway threshold, then left to the west after about 6 minutes.',
  threat_level: 'medium',
  threat_rationale: 'Unidentified drone in restricted airspace near an active runway during a flying window.',
  action_taken: 'observe',
  action_detail: 'Observed and logged. No measure used.',
  authorising_officer_role: 'Duty Base Security Officer',
  police_agency: 'NSW Police Force',
  police_reference: '',
  police_notified_local: '2026-07-11T22:05',
  evidence_items: [
    { description: 'Patrol log extract (exercise placeholder file)', algorithm: 'SHA-384', checksum: placeholder('williamtown-ex01-patrol-log') },
    { description: 'Handheld video, 42 s (exercise placeholder file)', algorithm: 'SHA-384', checksum: placeholder('williamtown-ex01-video') },
  ],
  notes:
    'Exercise record. Training example modelled on the publicly reported July 2026 pattern at Williamtown. Not a real incident and not real police data.',
}

const W1v2: EvidenceInput = {
  ...W1,
  police_reference: 'EX-NSWPF-0711-01',
  amendment_reason: 'Police reference added after the call-back.',
}

const W2: EvidenceInput = {
  exercise: true,
  site_id: 'raaf-williamtown',
  occurred_local: '2026-08-04T19:15',
  detection_method: 'rf',
  sensor: 'Portable RF detector (exercise kit)',
  heading_deg: 90,
  altitude_m_agl: 80,
  drone_type: 'Consumer quadcopter, DJI-class RF signature',
  track_description:
    'Exercise. Control link detected north-east of the base; operator not located. The drone held station for about 4 minutes, then left to the east.',
  threat_level: 'medium',
  threat_rationale: 'Repeat activity in the same area within a month.',
  action_taken: 'detect',
  action_detail: 'RF detection and bearing logged. No measure used.',
  authorising_officer_role: 'Duty Base Security Officer',
  police_agency: 'NSW Police Force',
  police_reference: 'EX-NSWPF-0804-02',
  police_notified_local: '2026-08-04T19:40',
  evidence_items: [
    { description: 'RF detector log export, CSV (exercise placeholder file)', algorithm: 'SHA-384', checksum: placeholder('williamtown-ex02-rf-log') },
  ],
  notes: 'Exercise record. Training example modelled on the publicly reported August 2026 pattern. Not real data.',
}

const D1: EvidenceInput = {
  exercise: true,
  site_id: 'raaf-darwin',
  occurred_local: '2026-09-10T02:30',
  detection_method: 'radar',
  sensor: 'Exercise radar feed',
  heading_deg: 180,
  altitude_m_agl: 60,
  drone_type: 'Small fixed-wing, type not identified',
  track_description: 'Exercise inject. Low, fast track from the harbour towards the flight line.',
  threat_level: 'high',
  threat_rationale: 'Heading for parked aircraft at night with no flight notification.',
  action_taken: 'disable',
  action_detail: 'Simulated RF defeat under exercise control. No emission was made.',
  authorising_officer_role: 'Base Commander (exercise role)',
  police_agency: 'NT Police',
  police_reference: 'EX-NTPOL-0910-01',
  police_notified_local: '2026-09-10T02:50',
  evidence_items: [
    { description: 'Radar track export (exercise placeholder file)', algorithm: 'SHA-384', checksum: placeholder('darwin-ex03-track') },
  ],
  notes: 'Exercise record. Synthetic inject for training. Not a real incident.',
}

const SPECS: SeedSpec[] = [
  { id: 'b9a1c0de-0000-4000-8000-000000000101', record_id: 'b9a1c0de-0001-4000-8000-000000000001', version: 1, created_at: '2026-07-11T12:30:00.000Z', input: W1 },
  { id: 'b9a1c0de-0000-4000-8000-000000000102', record_id: 'b9a1c0de-0001-4000-8000-000000000001', version: 2, created_at: '2026-07-12T00:10:00.000Z', input: W1v2 },
  { id: 'b9a1c0de-0000-4000-8000-000000000201', record_id: 'b9a1c0de-0002-4000-8000-000000000002', version: 1, created_at: '2026-08-04T10:05:00.000Z', input: W2 },
  { id: 'b9a1c0de-0000-4000-8000-000000000301', record_id: 'b9a1c0de-0003-4000-8000-000000000003', version: 1, created_at: '2026-09-09T17:40:00.000Z', input: D1 },
]

export function buildExerciseSeed(): EvidenceRecord[] {
  const out: EvidenceRecord[] = []
  const lastHash = new Map<string, string>()
  for (const s of SPECS) {
    const built = buildPayload(s.input, { requireAmendmentReason: s.version > 1 })
    if (!built.ok) throw new Error(`Seed ${s.id} invalid: ${JSON.stringify(built.errors)}`)
    const prev_hash = s.version === 1 ? null : lastHash.get(s.record_id) ?? null
    const base = { record_id: s.record_id, version: s.version, prev_hash, created_at: s.created_at, payload: built.payload }
    const record_hash = computeRecordHash(base)
    lastHash.set(s.record_id, record_hash)
    out.push({ id: s.id, ...base, record_hash, is_exercise: true, site_id: built.payload.site_id })
  }
  return out
}
