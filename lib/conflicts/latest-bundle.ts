/**
 * Server-side read of the newest Watchfloor intel bundle shipped with the
 * instance. Bundles live in data/intel/bundles/<date>.json and travel with the
 * deploy (or are dropped in by an operator). Nothing here fetches the network.
 *
 * Every bundle passes the import gate (validateBundleForImport): structure,
 * checksum and, when a public key is configured, its ML-DSA-87 signature. A
 * bundle that fails is never shown; the next older valid bundle is used and
 * the rejection is reported so the UI can say so.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { BundleRejection, IntelBundle } from '@/lib/conflicts/intel-bundle'
import type { TheatreSnapshot } from '@/lib/conflicts/osint-harvest'
import type { SignatureCheck } from '@/lib/trust/bundle-signature'
import { loadPublicKey, signatureRequired, validateBundleForImport } from '@/lib/trust/intel-keys'

export interface LoadedBundle {
  file: string
  bundle: IntelBundle
  attribution: string[]
  snapshots: { generatedAt: string; theatres: TheatreSnapshot[] } | null
  /** Signature state of this bundle: verified, unsigned or unverifiable (invalid bundles are never loaded). */
  signature: SignatureCheck
  /** Newer bundles that were skipped because they failed the import gate. */
  rejected: RejectedBundle[]
  /** Any other top-level members (future Watchfloor streams), passed through untouched. */
  extras: Record<string, unknown>
}

export interface RejectedBundle {
  file: string
  rejection: BundleRejection | 'unreadable'
  message: string
  signature: SignatureCheck | null
}

export interface BundleScan {
  latest: LoadedBundle | null
  /** Bundles newer than `latest` that failed the gate, newest first. */
  rejected: RejectedBundle[]
  /** Every bundle file found, newest first. */
  files: string[]
  publicKey: { keyId: string; fingerprint: string } | null
  requireSigned: boolean
}

const KNOWN = new Set(['manifest', 'incidents', 'attribution', 'snapshots', 'signature'])

type Checked =
  | { ok: true; loaded: Omit<LoadedBundle, 'rejected'> }
  | { ok: false; rejected: RejectedBundle }

/** Parse + verify results keyed by path, size, mtime and trusted key, so repeat renders are cheap. */
const cache = new Map<string, Checked>()

function checkFile(dir: string, file: string, keyStamp: string): Checked {
  const path = join(dir, file)
  let stamp: string
  try {
    const st = statSync(path)
    stamp = `${path}:${st.size}:${st.mtimeMs}:${keyStamp}:${signatureRequired()}`
  } catch {
    return { ok: false, rejected: { file, rejection: 'unreadable', message: 'File could not be read.', signature: null } }
  }
  const hit = cache.get(stamp)
  if (hit) return hit

  let result: Checked
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as IntelBundle & {
      attribution?: string[]
      snapshots?: { generatedAt: string; theatres: TheatreSnapshot[] }
    } & Record<string, unknown>
    const v = validateBundleForImport(raw)
    if (!v.ok) {
      result = {
        ok: false,
        rejected: { file, rejection: v.rejection ?? 'malformed', message: v.message, signature: v.signature ?? null },
      }
    } else {
      const extras: Record<string, unknown> = {}
      for (const [k, val] of Object.entries(raw)) if (!KNOWN.has(k)) extras[k] = val
      result = {
        ok: true,
        loaded: {
          file,
          bundle: { manifest: raw.manifest, incidents: raw.incidents },
          attribution: Array.isArray(raw.attribution) ? raw.attribution : [],
          snapshots: raw.snapshots ?? null,
          signature: v.signature!,
          extras,
        },
      }
    }
  } catch {
    result = { ok: false, rejected: { file, rejection: 'unreadable', message: 'File is not valid JSON.', signature: null } }
  }
  cache.set(stamp, result)
  if (cache.size > 64) cache.delete(cache.keys().next().value as string)
  return result
}

export function scanBundles(dir = join(process.cwd(), 'data', 'intel', 'bundles')): BundleScan {
  const pub = loadPublicKey()
  const keyStamp = pub ? `${pub.keyId}:${pub.mtimeMs}` : 'nokey'
  let files: string[] = []
  try {
    files = readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .sort()
      .reverse()
  } catch {
    files = []
  }
  const rejected: RejectedBundle[] = []
  let latest: LoadedBundle | null = null
  for (const file of files) {
    const c = checkFile(dir, file, keyStamp)
    if (c.ok) {
      latest = { ...c.loaded, rejected: [...rejected] }
      break
    }
    rejected.push(c.rejected)
  }
  return {
    latest,
    rejected,
    files,
    publicKey: pub ? { keyId: pub.keyId, fingerprint: pub.fingerprint } : null,
    requireSigned: signatureRequired(),
  }
}

export function loadLatestBundle(dir?: string): LoadedBundle | null {
  return scanBundles(dir).latest
}
