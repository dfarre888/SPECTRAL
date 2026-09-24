/**
 * Server-side hashing for the Counter-UXS evidence log (node:crypto).
 * SHA-384 matches ISM-1917's approved hash sizes. Import from server code only.
 */
import { createHash } from 'node:crypto'
import {
  canonicalJson,
  hashEnvelope,
  verifyChain,
  type EvidenceRecord,
  type VerifiedRecord,
} from '@/lib/base-protection/evidence'

export function sha384Hex(input: string): string {
  return createHash('sha384').update(input, 'utf8').digest('hex')
}

export function computeRecordHash(
  r: Pick<EvidenceRecord, 'record_id' | 'version' | 'prev_hash' | 'created_at' | 'payload'>,
): string {
  return sha384Hex(canonicalJson(hashEnvelope(r)))
}

export function verifyRecordChain(versions: readonly EvidenceRecord[]): VerifiedRecord[] {
  return verifyChain(versions, sha384Hex)
}
