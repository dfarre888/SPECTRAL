/**
 * Post-quantum signatures for Watchfloor intel bundles.
 *
 * Why: a bundle crosses an air gap on removable media. The FNV-1a checksum in
 * lib/conflicts/intel-bundle.ts catches corruption, but anyone can recompute it.
 * A signature proves the bundle came from the holder of the signing key and was
 * not changed afterwards.
 *
 * Scheme `spectral-intel-bundle/1` (stable; change the id if any step changes):
 *
 *   1. Canonical bytes. Take the bundle object, drop its `signature` member,
 *      serialise as JSON with object keys sorted by UTF-16 code unit at every
 *      depth, no whitespace, members with undefined values omitted (RFC 8785
 *      style). Encode UTF-8. Everything else in the file is covered: manifest,
 *      incidents, attribution, snapshots and any stream added later.
 *   2. Digest. SHA-384 over the canonical bytes, lower-case hex.
 *   3. Statement. `{ alg, digest, digestAlg, keyId, scheme, signedAt }`,
 *      serialised the same canonical way.
 *   4. Signature. ML-DSA-87 (FIPS 204, pure mode, hedged) over the statement
 *      bytes, with the FIPS 204 context string `spectral-intel-bundle/1`.
 *   5. Key id. First 16 hex characters of SHA-384 over the raw public key.
 *      Identifies the key; verification always uses the full key.
 *
 * The signature lives inside the bundle as a top-level `signature` member, so
 * one file carries across the gap. Algorithms follow ISM-1917 (ML-DSA-87,
 * SHA-384).
 *
 * This module has no filesystem access so it runs in node, vitest and the
 * browser. Key files are handled in lib/trust/intel-keys.ts.
 */

import { ml_dsa87 } from '@noble/post-quantum/ml-dsa.js'
import { sha384 } from '@noble/hashes/sha2.js'
import { bytesToHex } from '@noble/hashes/utils.js'

export const SIGNATURE_SCHEME = 'spectral-intel-bundle/1' as const
export const SIGNATURE_ALG = 'ML-DSA-87' as const
export const DIGEST_ALG = 'SHA-384' as const

const CONTEXT = new TextEncoder().encode(SIGNATURE_SCHEME)

export interface BundleSignatureBlock {
  scheme: typeof SIGNATURE_SCHEME
  alg: typeof SIGNATURE_ALG
  digestAlg: typeof DIGEST_ALG
  /** SHA-384 of the canonical bundle bytes, hex. */
  digest: string
  /** First 16 hex of SHA-384(public key). */
  keyId: string
  signedAt: string
  /** ML-DSA-87 signature over the canonical statement, base64. */
  value: string
}

/**
 * - verified: signature checks out against this instance's public key.
 * - unsigned: the bundle carries no signature.
 * - invalid: a signature is present but fails (altered content, wrong key, malformed).
 * - unverifiable: signed, but this instance has no public key configured to check it.
 */
export type SignatureState = 'verified' | 'unsigned' | 'invalid' | 'unverifiable'

export interface SignatureCheck {
  state: SignatureState
  alg: typeof SIGNATURE_ALG | null
  keyId: string | null
  signedAt: string | null
  /** Digest recomputed over the bundle as received (null if not computed). */
  digest: string | null
  /** Operator-facing explanation, plain English. */
  reason: string
}

/* ------------------------------------------------------------------ */
/* Canonical JSON                                                      */
/* ------------------------------------------------------------------ */

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'number' && !Number.isFinite(value)) return 'null'
    const s = JSON.stringify(value)
    return s === undefined ? 'null' : s
  }
  if (Array.isArray(value)) {
    return `[${value
      .map((x) => canonicalJson(x === undefined || typeof x === 'function' ? null : x))
      .join(',')}]`
  }
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined && typeof obj[k] !== 'function')
    .sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(',')}}`
}

const utf8 = (s: string) => new TextEncoder().encode(s)

/** SHA-384 hex over the canonical bundle with any `signature` member removed. */
export function bundleDigest(bundle: unknown): string {
  const rest: Record<string, unknown> = { ...(bundle as Record<string, unknown>) }
  delete rest.signature
  return bytesToHex(sha384(utf8(canonicalJson(rest))))
}

export function sha384Hex(bytes: Uint8Array): string {
  return bytesToHex(sha384(bytes))
}

/** Full SHA-384 fingerprint of a public key, hex. */
export function publicKeyFingerprint(publicKey: Uint8Array): string {
  return sha384Hex(publicKey)
}

export function keyIdFor(publicKey: Uint8Array): string {
  return publicKeyFingerprint(publicKey).slice(0, 16)
}

/** `a1b2 c3d4 e5f6 7890` for display. */
export function formatKeyId(keyId: string): string {
  return keyId.replace(/(.{4})(?=.)/g, '$1 ')
}

function statementBytes(block: Omit<BundleSignatureBlock, 'value'>): Uint8Array {
  const { scheme, alg, digestAlg, digest, keyId, signedAt } = block
  return utf8(canonicalJson({ scheme, alg, digestAlg, digest, keyId, signedAt }))
}

/* ------------------------------------------------------------------ */
/* Base64 (isomorphic)                                                 */
/* ------------------------------------------------------------------ */

export function toBase64(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(bin)
}

export function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64.replace(/\s+/g, ''))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/* ------------------------------------------------------------------ */
/* Keys                                                                */
/* ------------------------------------------------------------------ */

export interface SigningKeyPair {
  publicKey: Uint8Array
  secretKey: Uint8Array
  keyId: string
}

/** Derive the ML-DSA-87 key pair from a 32-byte seed (FIPS 204 KeyGen). */
export function keyPairFromSeed(seed: Uint8Array): SigningKeyPair {
  if (seed.length !== 32) throw new Error(`ML-DSA-87 seed must be 32 bytes, got ${seed.length}`)
  const { publicKey, secretKey } = ml_dsa87.keygen(seed)
  return { publicKey, secretKey, keyId: keyIdFor(publicKey) }
}

export type KeyKind = 'PUBLIC KEY' | 'PRIVATE KEY SEED'

const armourLabel = (kind: KeyKind) => `SPECTRAL ML-DSA-87 ${kind}`

/** PEM-style armour so a key file is recognisable on sight. */
export function encodeKeyFile(kind: KeyKind, bytes: Uint8Array, comment?: string): string {
  const b64 = toBase64(bytes).replace(/(.{64})/g, '$1\n').trim()
  const head = comment ? `# ${comment.replace(/\n/g, ' ')}\n` : ''
  return `${head}-----BEGIN ${armourLabel(kind)}-----\n${b64}\n-----END ${armourLabel(kind)}-----\n`
}

export function decodeKeyFile(text: string, kind: KeyKind): Uint8Array {
  const label = armourLabel(kind)
  const m = text.match(new RegExp(`-----BEGIN ${label}-----([\\s\\S]*?)-----END ${label}-----`))
  if (!m) throw new Error(`Not a ${label} file`)
  const bytes = fromBase64(m[1])
  const expected = kind === 'PUBLIC KEY' ? ml_dsa87.lengths.publicKey : 32
  if (bytes.length !== expected) {
    throw new Error(`${label} should be ${expected} bytes, got ${bytes.length}`)
  }
  return bytes
}

/* ------------------------------------------------------------------ */
/* Sign and verify                                                     */
/* ------------------------------------------------------------------ */

/**
 * Return a copy of the bundle with a fresh `signature` member (last key).
 * Any previous signature is replaced.
 */
export function signBundle<T extends object>(
  bundle: T,
  key: SigningKeyPair,
  opts: { signedAt?: string } = {},
): T & { signature: BundleSignatureBlock } {
  const rest: Record<string, unknown> = { ...(bundle as Record<string, unknown>) }
  delete rest.signature
  const unsigned = {
    scheme: SIGNATURE_SCHEME,
    alg: SIGNATURE_ALG,
    digestAlg: DIGEST_ALG,
    digest: bundleDigest(rest),
    keyId: key.keyId,
    signedAt: opts.signedAt ?? new Date().toISOString(),
  }
  const sig = ml_dsa87.sign(statementBytes(unsigned), key.secretKey, { context: CONTEXT })
  return { ...(rest as T), signature: { ...unsigned, value: toBase64(sig) } }
}

function isBlock(x: unknown): x is BundleSignatureBlock {
  const b = x as Partial<BundleSignatureBlock> | null
  return (
    !!b &&
    typeof b === 'object' &&
    typeof b.scheme === 'string' &&
    typeof b.alg === 'string' &&
    typeof b.digestAlg === 'string' &&
    typeof b.digest === 'string' &&
    typeof b.keyId === 'string' &&
    typeof b.signedAt === 'string' &&
    typeof b.value === 'string'
  )
}

/**
 * Check a bundle's signature against a trusted public key.
 * Never throws; every failure becomes `invalid` with a reason.
 */
export function verifyBundleSignature(bundle: unknown, publicKey: Uint8Array | null): SignatureCheck {
  const raw = (bundle as { signature?: unknown } | null)?.signature
  if (raw === undefined || raw === null) {
    return { state: 'unsigned', alg: null, keyId: null, signedAt: null, digest: null, reason: 'Bundle carries no signature.' }
  }
  if (!isBlock(raw)) {
    return { state: 'invalid', alg: null, keyId: null, signedAt: null, digest: null, reason: 'Signature block is malformed.' }
  }
  const base = { alg: SIGNATURE_ALG, keyId: raw.keyId, signedAt: raw.signedAt }
  if (raw.scheme !== SIGNATURE_SCHEME || raw.alg !== SIGNATURE_ALG || raw.digestAlg !== DIGEST_ALG) {
    return {
      ...base,
      state: 'invalid',
      digest: null,
      reason: `Unsupported signature scheme ${raw.scheme} / ${raw.alg} / ${raw.digestAlg}.`,
    }
  }
  let digest: string
  try {
    digest = bundleDigest(bundle)
  } catch {
    return { ...base, state: 'invalid', digest: null, reason: 'Bundle could not be canonicalised for hashing.' }
  }
  if (!publicKey) {
    return {
      ...base,
      state: 'unverifiable',
      digest,
      reason: 'Signed, but this instance has no public key configured to check it.',
    }
  }
  const trustedId = keyIdFor(publicKey)
  if (raw.keyId !== trustedId) {
    return {
      ...base,
      state: 'invalid',
      digest,
      reason: `Signed by key ${formatKeyId(raw.keyId)}; this instance trusts ${formatKeyId(trustedId)}.`,
    }
  }
  if (raw.digest !== digest) {
    return { ...base, state: 'invalid', digest, reason: 'Content changed after signing (SHA-384 digest mismatch).' }
  }
  let ok = false
  try {
    ok = ml_dsa87.verify(fromBase64(raw.value), statementBytes(raw), publicKey, { context: CONTEXT })
  } catch {
    ok = false
  }
  if (!ok) {
    return { ...base, state: 'invalid', digest, reason: 'ML-DSA-87 signature does not verify.' }
  }
  return { ...base, state: 'verified', digest, reason: `ML-DSA-87 signature verified against key ${formatKeyId(trustedId)}.` }
}
