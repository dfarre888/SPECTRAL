/**
 * Watchfloor signing keys on disk (node only; no `server-only` import so the
 * CLI scripts can use it too).
 *
 *   Private key seed  ~/.spectral/keys/intel-signing.key   mode 600, OUTSIDE the repo
 *                     override: SPECTRAL_INTEL_SIGNING_KEY=/path/to/key
 *   Public key        data/intel/keys/intel-signing.pub    committed, ships with the instance
 *                     override: SPECTRAL_INTEL_PUBLIC_KEY=/path/to/pub
 *
 * The private file holds the 32-byte FIPS 204 seed; the full ML-DSA-87 key pair
 * is derived from it on use. It lives only on the connected machine that
 * builds bundles. The deployed instance needs only the public key.
 */

import { existsSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import {
  decodeKeyFile,
  keyIdFor,
  keyPairFromSeed,
  publicKeyFingerprint,
  verifyBundleSignature,
  type SignatureCheck,
  type SigningKeyPair,
} from './bundle-signature'
import { validateBundle, type BundleValidation } from '../conflicts/intel-bundle'

export function privateKeyPath(): string {
  return process.env.SPECTRAL_INTEL_SIGNING_KEY || join(homedir(), '.spectral', 'keys', 'intel-signing.key')
}

export function publicKeyPath(): string {
  return process.env.SPECTRAL_INTEL_PUBLIC_KEY || join(process.cwd(), 'data', 'intel', 'keys', 'intel-signing.pub')
}

export interface PublicKeyInfo {
  publicKey: Uint8Array
  keyId: string
  /** Full SHA-384 fingerprint, hex. */
  fingerprint: string
  path: string
  mtimeMs: number
}

let pubCache: { path: string; mtimeMs: number; info: PublicKeyInfo } | null = null

/** The trusted public key, or null when none is configured on this instance. */
export function loadPublicKey(path = publicKeyPath()): PublicKeyInfo | null {
  let mtimeMs: number
  try {
    mtimeMs = statSync(path).mtimeMs
  } catch {
    return null
  }
  if (pubCache && pubCache.path === path && pubCache.mtimeMs === mtimeMs) return pubCache.info
  try {
    const publicKey = decodeKeyFile(readFileSync(path, 'utf8'), 'PUBLIC KEY')
    const info: PublicKeyInfo = {
      publicKey,
      keyId: keyIdFor(publicKey),
      fingerprint: publicKeyFingerprint(publicKey),
      path,
      mtimeMs,
    }
    pubCache = { path, mtimeMs, info }
    return info
  } catch {
    return null
  }
}

/**
 * Load the signing key, refusing a file that other users can read (same rule
 * as ssh). Returns null when no key exists on this machine.
 */
export function loadSigningKey(path = privateKeyPath()): SigningKeyPair | null {
  if (!existsSync(path)) return null
  const mode = statSync(path).mode & 0o777
  if (process.platform !== 'win32' && (mode & 0o077) !== 0) {
    throw new Error(`${path} is readable by other users (mode ${mode.toString(8)}). Run: chmod 600 ${path}`)
  }
  const seed = decodeKeyFile(readFileSync(path, 'utf8'), 'PRIVATE KEY SEED')
  return keyPairFromSeed(seed)
}

/** Require signed bundles (reject unsigned ones) when set to true. */
export function signatureRequired(): boolean {
  return process.env.SPECTRAL_INTEL_REQUIRE_SIGNED === 'true'
}

/**
 * The air-gapped import gate: structural checks, checksum, then the signature
 * against this instance's public key. With a key configured, an invalid
 * signature is rejected; with SPECTRAL_INTEL_REQUIRE_SIGNED=true an unsigned
 * or unverifiable bundle is rejected too.
 */
export function validateBundleForImport(input: unknown, now: Date = new Date()): BundleValidation {
  const pub = loadPublicKey()
  return validateBundle(input, now, {
    verifySignature: (b) => verifyBundleSignature(b, pub?.publicKey ?? null),
    requireSignature: signatureRequired(),
  })
}

/** Signature check of any Watchfloor file against this instance's key. */
export function verifyWithConfiguredKey(doc: unknown): SignatureCheck {
  return verifyBundleSignature(doc, loadPublicKey()?.publicKey ?? null)
}

export interface ReportingValidation {
  ok: boolean
  message: string
  signature: SignatureCheck | null
}

/**
 * Import gate for Watchfloor reporting files (data/intel/reporting/<date>.json).
 * Same signature policy as bundles: invalid is rejected; unsigned is accepted
 * and labelled unless SPECTRAL_INTEL_REQUIRE_SIGNED=true.
 */
export function validateReportingForImport(input: unknown, now: Date = new Date()): ReportingValidation {
  const r = input as { generatedAt?: unknown; items?: unknown } | null
  if (!r || typeof r !== 'object' || !Array.isArray(r.items) || typeof r.generatedAt !== 'string') {
    return { ok: false, message: 'Not a recognisable reporting file.', signature: null }
  }
  const gen = Date.parse(r.generatedAt)
  if (!Number.isFinite(gen)) return { ok: false, message: 'Reporting file has no readable generation time.', signature: null }
  if (gen > now.getTime() + 60_000) {
    return { ok: false, message: 'Reporting file is dated in the future. Check the clock on the producing machine.', signature: null }
  }
  const signature = verifyWithConfiguredKey(input)
  if (signature.state === 'invalid') {
    return { ok: false, message: `Signature check failed: ${signature.reason}`, signature }
  }
  if (signatureRequired() && signature.state !== 'verified') {
    return { ok: false, message: `This instance only accepts signed files. ${signature.reason}`, signature }
  }
  return { ok: true, message: `Valid reporting file, ${r.items.length} items.`, signature }
}
