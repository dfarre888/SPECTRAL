/**
 * Verified read of Watchfloor reporting windows (data/intel/reporting/<date>.json).
 *
 * Same gate as incident bundles: a file with an invalid ML-DSA-87 signature is
 * never shown; the next older valid file is used and the rejection reported.
 * Unsigned files load and are labelled unsigned (rejected when
 * SPECTRAL_INTEL_REQUIRE_SIGNED=true).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { ReportingFile } from '@/lib/intel/reporting'
import type { SignatureCheck } from '@/lib/trust/bundle-signature'
import { loadPublicKey, signatureRequired, validateReportingForImport } from '@/lib/trust/intel-keys'

export type LoadedReporting = ReportingFile & { file: string; signature: SignatureCheck }

export interface RejectedReporting {
  file: string
  message: string
  signature: SignatureCheck | null
}

export interface ReportingScan {
  latest: LoadedReporting | null
  rejected: RejectedReporting[]
  files: string[]
}

type Checked = { ok: true; loaded: LoadedReporting } | { ok: false; rejected: RejectedReporting }
const cache = new Map<string, Checked>()

function checkFile(dir: string, file: string, keyStamp: string): Checked {
  const path = join(dir, file)
  let stamp: string
  try {
    const st = statSync(path)
    stamp = `${path}:${st.size}:${st.mtimeMs}:${keyStamp}:${signatureRequired()}`
  } catch {
    return { ok: false, rejected: { file, message: 'File could not be read.', signature: null } }
  }
  const hit = cache.get(stamp)
  if (hit) return hit
  let result: Checked
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as ReportingFile & { signature?: unknown }
    const v = validateReportingForImport(raw)
    if (!v.ok) {
      result = { ok: false, rejected: { file, message: v.message, signature: v.signature } }
    } else {
      const { signature: _block, ...rest } = raw
      void _block
      result = { ok: true, loaded: { ...(rest as ReportingFile), file, signature: v.signature! } }
    }
  } catch {
    result = { ok: false, rejected: { file, message: 'File is not valid JSON.', signature: null } }
  }
  cache.set(stamp, result)
  if (cache.size > 64) cache.delete(cache.keys().next().value as string)
  return result
}

export function scanReporting(dir = join(process.cwd(), 'data', 'intel', 'reporting')): ReportingScan {
  const pub = loadPublicKey()
  const keyStamp = pub ? `${pub.keyId}:${pub.mtimeMs}` : 'nokey'
  let files: string[] = []
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort().reverse()
  } catch {
    files = []
  }
  const rejected: RejectedReporting[] = []
  for (const file of files) {
    const c = checkFile(dir, file, keyStamp)
    if (c.ok) return { latest: c.loaded, rejected, files }
    rejected.push(c.rejected)
  }
  return { latest: null, rejected, files }
}
