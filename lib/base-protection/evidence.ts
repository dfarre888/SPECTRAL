/**
 * Counter-UXS evidence log: record shape, validation, canonical form.
 *
 * Structured to support reporting under the Defence Amendment (Counter-UXS
 * Measures) Regulations 2025. It is not legal advice and makes no compliance
 * claim; users confirm with their legal officer.
 *
 * Integrity model
 * - Records are append-only. An amendment is a new version of the same
 *   record_id whose prev_hash is the previous version's record_hash.
 * - record_hash = SHA-384 (hex) of the canonical JSON of
 *   { record_id, version, prev_hash, created_at, payload }, computed on the
 *   server with node:crypto (see evidence-hash.ts).
 * - Canonical JSON: object keys sorted by code point at every depth, no
 *   whitespace, `undefined` dropped, non-finite numbers rejected. Anyone can
 *   re-derive the hash from an exported record.
 *
 * Pure module: safe in client and server code.
 *
 * CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */

import { getSite } from '@/lib/base-protection/sites'
import { isLocalDateTime, zonedLocalToUtc } from '@/lib/base-protection/time'

export const EVIDENCE_SCHEMA = 'spectral.counter-uxs-evidence/1'
export const LEGAL_NOTE =
  'Structured to support reporting under the Counter-UXS Measures Regulations 2025; confirm with your legal officer.'

export const DETECTION_METHODS = [
  { id: 'visual', label: 'Visual' },
  { id: 'radar', label: 'Radar' },
  { id: 'rf', label: 'RF detection' },
  { id: 'eo_ir', label: 'EO/IR camera' },
  { id: 'acoustic', label: 'Acoustic' },
  { id: 'third_party', label: 'Third-party report' },
  { id: 'other', label: 'Other' },
] as const
export type DetectionMethod = (typeof DETECTION_METHODS)[number]['id']

export const ACTIONS = [
  { id: 'observe', label: 'Observe' },
  { id: 'detect', label: 'Detect' },
  { id: 'disable', label: 'Disable' },
  { id: 'destroy', label: 'Destroy' },
] as const
export type ActionTaken = (typeof ACTIONS)[number]['id']

export const THREAT_LEVELS = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
  { id: 'not_assessed', label: 'Not assessed' },
] as const
export type ThreatLevel = (typeof THREAT_LEVELS)[number]['id']

export const CHECKSUM_ALGORITHMS = ['SHA-384', 'SHA-256', 'SHA-512'] as const
export type ChecksumAlgorithm = (typeof CHECKSUM_ALGORITHMS)[number]
const HEX_LEN: Record<ChecksumAlgorithm, number> = { 'SHA-256': 64, 'SHA-384': 96, 'SHA-512': 128 }

export interface EvidenceItem {
  description: string
  algorithm: ChecksumAlgorithm
  checksum: string
}

export interface EvidencePayload {
  schema: typeof EVIDENCE_SCHEMA
  exercise: boolean
  site_id: string
  site_name: string
  occurred: { local: string; time_zone: string; utc_offset: string; utc: string }
  detection: { method: DetectionMethod; sensor: string }
  track: {
    heading_deg: number | null
    altitude_m_agl: number | null
    drone_type: string
    description: string
  }
  threat: { level: ThreatLevel; rationale: string }
  action: { taken: ActionTaken; detail: string }
  authorising_officer_role: string
  police: { agency: string; reference: string; notified_local: string | null }
  evidence_items: EvidenceItem[]
  notes: string
  /** Present from version 2 on. */
  amendment_reason?: string
}

export interface EvidenceRecord {
  id: string
  record_id: string
  version: number
  prev_hash: string | null
  record_hash: string
  created_at: string
  is_exercise: boolean
  site_id: string
  payload: EvidencePayload
}

export type IntegrityStatus = 'verified' | 'hash_mismatch' | 'chain_broken'

export interface VerifiedRecord extends EvidenceRecord {
  integrity: IntegrityStatus
  /** Number of versions of this record_id (on the latest version only). */
  versions?: number
}

/** The form's raw input (strings from inputs). */
export interface EvidenceInput {
  exercise?: boolean
  site_id?: string
  occurred_local?: string
  detection_method?: string
  sensor?: string
  heading_deg?: string | number | null
  altitude_m_agl?: string | number | null
  drone_type?: string
  track_description?: string
  threat_level?: string
  threat_rationale?: string
  action_taken?: string
  action_detail?: string
  authorising_officer_role?: string
  police_agency?: string
  police_reference?: string
  police_notified_local?: string | null
  evidence_items?: Array<{ description?: string; algorithm?: string; checksum?: string }>
  notes?: string
  amendment_reason?: string
}

export type FieldErrors = Partial<Record<string, string>>

// ── Canonical JSON ───────────────────────────────────────────────────────

export function canonicalJson(value: unknown): string {
  if (value === null) return 'null'
  switch (typeof value) {
    case 'string':
      return JSON.stringify(value)
    case 'boolean':
      return value ? 'true' : 'false'
    case 'number':
      if (!Number.isFinite(value)) throw new Error('Non-finite number in evidence record')
      return JSON.stringify(value)
    case 'object': {
      if (Array.isArray(value)) return `[${value.map((v) => canonicalJson(v === undefined ? null : v)).join(',')}]`
      const obj = value as Record<string, unknown>
      const keys = Object.keys(obj)
        .filter((k) => obj[k] !== undefined)
        .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
      return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(',')}}`
    }
    default:
      throw new Error(`Unsupported value in evidence record: ${typeof value}`)
  }
}

/** The exact object that is hashed. */
export function hashEnvelope(r: Pick<EvidenceRecord, 'record_id' | 'version' | 'prev_hash' | 'created_at' | 'payload'>) {
  return {
    record_id: r.record_id,
    version: r.version,
    prev_hash: r.prev_hash,
    created_at: new Date(r.created_at).toISOString(),
    payload: r.payload,
  }
}

/**
 * Verify every version of one record: each hash must re-derive, and each
 * version's prev_hash must equal the previous version's hash.
 */
export function verifyChain(
  versions: readonly EvidenceRecord[],
  hash: (canonical: string) => string,
): VerifiedRecord[] {
  const sorted = [...versions].sort((a, b) => a.version - b.version)
  const out: VerifiedRecord[] = []
  let prev: EvidenceRecord | null = null
  for (const r of sorted) {
    let integrity: IntegrityStatus = 'verified'
    let recomputed: string | null = null
    try {
      recomputed = hash(canonicalJson(hashEnvelope(r)))
    } catch {
      recomputed = null
    }
    if (recomputed !== r.record_hash) integrity = 'hash_mismatch'
    else if (r.version === 1 ? r.prev_hash !== null : !prev || prev.version !== r.version - 1 || r.prev_hash !== prev.record_hash)
      integrity = 'chain_broken'
    out.push({ ...r, integrity })
    prev = r
  }
  // A later version cannot be better than the chain beneath it.
  for (let i = 1; i < out.length; i++) {
    if (out[i - 1].integrity !== 'verified' && out[i].integrity === 'verified') out[i] = { ...out[i], integrity: 'chain_broken' }
  }
  return out
}

// ── Validation ───────────────────────────────────────────────────────────

const str = (v: unknown, max = 2000) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

function optNumber(v: unknown): { ok: boolean; value: number | null } {
  if (v == null || v === '') return { ok: true, value: null }
  const n = typeof v === 'number' ? v : Number(String(v).trim())
  return Number.isFinite(n) ? { ok: true, value: n } : { ok: false, value: null }
}

const inList = <T extends string>(list: readonly { id: T }[], v: unknown): v is T =>
  typeof v === 'string' && list.some((x) => x.id === v)

/**
 * Validate form input and build the payload. The server runs this again and
 * is authoritative; the client runs it for inline errors.
 */
export function buildPayload(
  input: EvidenceInput,
  opts: { requireAmendmentReason?: boolean } = {},
): { ok: true; payload: EvidencePayload } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {}
  const site = getSite(str(input.site_id))
  if (!site) errors.site_id = 'Choose the site.'

  const local = str(input.occurred_local, 16)
  let occurred: EvidencePayload['occurred'] | null = null
  if (!isLocalDateTime(local)) errors.occurred_local = 'Enter the local date and time.'
  else if (site) {
    const conv = zonedLocalToUtc(local, site.timeZone)
    if (!conv) errors.occurred_local = 'That local time could not be converted to UTC.'
    else if (Date.parse(conv.utc) > Date.now() + 5 * 60_000) errors.occurred_local = 'The time is in the future.'
    else occurred = { local, time_zone: site.timeZone, utc_offset: conv.offset, utc: conv.utc }
  }

  if (!inList(DETECTION_METHODS, input.detection_method)) errors.detection_method = 'Choose how it was detected.'
  const sensor = str(input.sensor, 200)
  if (!sensor) errors.sensor = 'Name the sensor or observer (role or equipment).'

  const heading = optNumber(input.heading_deg)
  if (!heading.ok || (heading.value != null && (heading.value < 0 || heading.value >= 360)))
    errors.heading_deg = 'Heading is 0 to 359 degrees, or leave blank.'
  const altitude = optNumber(input.altitude_m_agl)
  if (!altitude.ok || (altitude.value != null && (altitude.value < 0 || altitude.value > 10_000)))
    errors.altitude_m_agl = 'Altitude is 0 to 10,000 m, or leave blank.'

  const trackDescription = str(input.track_description, 2000)
  if (!trackDescription) errors.track_description = 'Describe what was seen and where it went.'

  if (!inList(THREAT_LEVELS, input.threat_level)) errors.threat_level = 'Choose a threat assessment.'
  const rationale = str(input.threat_rationale, 2000)
  if (!rationale && input.threat_level !== 'not_assessed') errors.threat_rationale = 'Say why.'

  if (!inList(ACTIONS, input.action_taken)) errors.action_taken = 'Choose the action taken.'
  const actionDetail = str(input.action_detail, 2000)
  if ((input.action_taken === 'disable' || input.action_taken === 'destroy') && !actionDetail)
    errors.action_detail = 'Describe the measure used and its effect.'

  const officer = str(input.authorising_officer_role, 200)
  if (!officer) errors.authorising_officer_role = 'Enter the authorising officer’s appointment.'

  const agency = str(input.police_agency, 200)
  const reference = str(input.police_reference, 120)
  const notifiedRaw = str(input.police_notified_local ?? '', 16)
  if (notifiedRaw && !isLocalDateTime(notifiedRaw)) errors.police_notified_local = 'Enter a date and time, or leave blank.'
  if (reference && !agency) errors.police_agency = 'Name the police agency for this reference.'

  const items: EvidenceItem[] = []
  ;(input.evidence_items ?? []).forEach((raw, i) => {
    const description = str(raw.description, 300)
    const checksum = str(raw.checksum, 200).toLowerCase()
    if (!description && !checksum) return
    const algorithm = (CHECKSUM_ALGORITHMS as readonly string[]).includes(String(raw.algorithm))
      ? (raw.algorithm as ChecksumAlgorithm)
      : 'SHA-384'
    if (!description) errors[`evidence_items.${i}.description`] = 'Describe the item.'
    if (!new RegExp(`^[0-9a-f]{${HEX_LEN[algorithm]}}$`).test(checksum))
      errors[`evidence_items.${i}.checksum`] = `${algorithm} is ${HEX_LEN[algorithm]} hex characters.`
    items.push({ description, algorithm, checksum })
  })

  const amendment = str(input.amendment_reason, 1000)
  if (opts.requireAmendmentReason && !amendment) errors.amendment_reason = 'Say what changed and why.'

  if (Object.keys(errors).length > 0 || !site || !occurred) return { ok: false, errors }

  const payload: EvidencePayload = {
    schema: EVIDENCE_SCHEMA,
    exercise: Boolean(input.exercise),
    site_id: site.id,
    site_name: site.name,
    occurred,
    detection: { method: input.detection_method as DetectionMethod, sensor },
    track: {
      heading_deg: heading.value,
      altitude_m_agl: altitude.value,
      drone_type: str(input.drone_type, 200) || 'Not identified',
      description: trackDescription,
    },
    threat: { level: input.threat_level as ThreatLevel, rationale },
    action: { taken: input.action_taken as ActionTaken, detail: actionDetail },
    authorising_officer_role: officer,
    police: { agency, reference, notified_local: notifiedRaw || null },
    evidence_items: items,
    notes: str(input.notes, 4000),
  }
  if (opts.requireAmendmentReason) payload.amendment_reason = amendment
  return { ok: true, payload }
}

/** Form input from an existing payload (for amendments). */
export function payloadToInput(p: EvidencePayload): EvidenceInput {
  return {
    exercise: p.exercise,
    site_id: p.site_id,
    occurred_local: p.occurred.local,
    detection_method: p.detection.method,
    sensor: p.detection.sensor,
    heading_deg: p.track.heading_deg ?? '',
    altitude_m_agl: p.track.altitude_m_agl ?? '',
    drone_type: p.track.drone_type,
    track_description: p.track.description,
    threat_level: p.threat.level,
    threat_rationale: p.threat.rationale,
    action_taken: p.action.taken,
    action_detail: p.action.detail,
    authorising_officer_role: p.authorising_officer_role,
    police_agency: p.police.agency,
    police_reference: p.police.reference,
    police_notified_local: p.police.notified_local ?? '',
    evidence_items: p.evidence_items.map((e) => ({ ...e })),
    notes: p.notes,
    amendment_reason: '',
  }
}

export const labelFor = {
  detection: (id: string) => DETECTION_METHODS.find((x) => x.id === id)?.label ?? id,
  action: (id: string) => ACTIONS.find((x) => x.id === id)?.label ?? id,
  threat: (id: string) => THREAT_LEVELS.find((x) => x.id === id)?.label ?? id,
}

export function shortHash(h: string | null | undefined, n = 12): string {
  return h ? h.slice(0, n) : ''
}
