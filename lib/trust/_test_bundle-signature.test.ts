import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildBundle, validateBundle } from '@/lib/conflicts/intel-bundle'
import type { ConflictIncident } from '@/lib/conflicts/types'
import {
  bundleDigest,
  canonicalJson,
  decodeKeyFile,
  encodeKeyFile,
  keyIdFor,
  keyPairFromSeed,
  signBundle,
  verifyBundleSignature,
  type BundleSignatureBlock,
} from '@/lib/trust/bundle-signature'

const inc = (id: string): ConflictIncident => ({
  id,
  conflict_name: 'Test',
  incident_title: `Incident ${id}`,
  incident_type: 'uas_strike' as ConflictIncident['incident_type'],
  occurred_at: '2026-09-01T00:00:00.000Z',
  lat: 0,
  lon: 0,
  summary: 'summary',
  source_ref: 'OSINT',
  platforms_involved: [],
  confidence: 'possible',
  classification: 'UNCLASSIFIED',
  created_at: '2026-09-01T00:00:00.000Z',
})

const NOW = new Date('2026-09-24T00:00:00.000Z')
const seed = (n: number) => new Uint8Array(32).fill(n)
const trusted = keyPairFromSeed(seed(7))
const attacker = keyPairFromSeed(seed(9))

const base = {
  ...buildBundle([inc('1'), inc('2')], { producedBy: 'test', generatedAt: '2026-09-23T00:00:00.000Z' }),
  attribution: ['GDELT Project (gdeltproject.org)'],
  snapshots: { generatedAt: '2026-09-23T00:00:00.000Z', theatres: [] },
}
const signed = signBundle(base, trusted, { signedAt: '2026-09-23T01:00:00.000Z' })
const verifyWith = (pk: Uint8Array | null) => ({ verifySignature: (b: unknown) => verifyBundleSignature(b, pk) })
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T

describe('canonical JSON', () => {
  it('is stable under key order at every depth', () => {
    expect(canonicalJson({ b: 1, a: { d: [1, { y: 2, x: 1 }], c: 'z' } })).toBe(
      canonicalJson({ a: { c: 'z', d: [1, { x: 1, y: 2 }] }, b: 1 }),
    )
  })
  it('drops undefined members and keeps array positions', () => {
    expect(canonicalJson({ a: undefined, b: [undefined, 1] })).toBe('{"b":[null,1]}')
  })
  it('survives a JSON round trip (what an operator carries across)', () => {
    expect(bundleDigest(clone(signed))).toBe(signed.signature.digest)
  })
  it('excludes the signature member from the digest', () => {
    expect(bundleDigest(signed)).toBe(bundleDigest(base))
  })
})

describe('ML-DSA-87 bundle signatures', () => {
  it('produces a SHA-384 digest and a full-size ML-DSA-87 signature', () => {
    expect(signed.signature.alg).toBe('ML-DSA-87')
    expect(signed.signature.digestAlg).toBe('SHA-384')
    expect(signed.signature.digest).toMatch(/^[0-9a-f]{96}$/)
    expect(atob(signed.signature.value).length).toBe(4627)
    expect(signed.signature.keyId).toBe(keyIdFor(trusted.publicKey))
  })

  it('verifies against the trusted key', () => {
    const c = verifyBundleSignature(clone(signed), trusted.publicKey)
    expect(c.state).toBe('verified')
    expect(c.keyId).toBe(trusted.keyId)
  })

  it('reports unsigned bundles as unsigned, not invalid', () => {
    expect(verifyBundleSignature(base, trusted.publicKey).state).toBe('unsigned')
  })

  it('reports a signed bundle as unverifiable when no key is configured', () => {
    expect(verifyBundleSignature(signed, null).state).toBe('unverifiable')
  })

  it('detects altered incidents', () => {
    const t = clone(signed)
    t.incidents[0].summary = 'rewritten'
    expect(verifyBundleSignature(t, trusted.publicKey).state).toBe('invalid')
  })

  it('detects altered attribution, which the checksum does not cover', () => {
    const t = clone(signed)
    t.attribution.push('Injected source')
    expect(validateBundle(t, NOW).ok).toBe(true) // checksum alone misses it
    const c = verifyBundleSignature(t, trusted.publicKey)
    expect(c.state).toBe('invalid')
    expect(c.reason).toContain('digest mismatch')
  })

  it('detects an added member (a smuggled stream)', () => {
    const t = { ...clone(signed), extraStream: [{ id: 'x' }] }
    expect(verifyBundleSignature(t, trusted.publicKey).state).toBe('invalid')
  })

  it('detects a recomputed digest without a matching signature', () => {
    const t = clone(signed)
    t.attribution.push('Injected source')
    t.signature.digest = bundleDigest(t)
    const c = verifyBundleSignature(t, trusted.publicKey)
    expect(c.state).toBe('invalid')
    expect(c.reason).toContain('does not verify')
  })

  it('detects a corrupted signature value', () => {
    const t = clone(signed)
    const bytes = Uint8Array.from(atob(t.signature.value), (ch) => ch.charCodeAt(0))
    bytes[100] ^= 0xff
    t.signature.value = btoa(String.fromCharCode(...bytes))
    expect(verifyBundleSignature(t, trusted.publicKey).state).toBe('invalid')
  })

  it('rejects a bundle signed by another key', () => {
    const forged = signBundle(clone(base), attacker)
    const c = verifyBundleSignature(forged, trusted.publicKey)
    expect(c.state).toBe('invalid')
    expect(c.reason).toContain('trusts')
  })

  it('rejects another key claiming the trusted key id', () => {
    const forged = signBundle(clone(base), { ...attacker, keyId: trusted.keyId })
    expect(verifyBundleSignature(forged, trusted.publicKey).state).toBe('invalid')
  })

  it('rejects a malformed or foreign signature block', () => {
    expect(verifyBundleSignature({ ...base, signature: { nope: 1 } }, trusted.publicKey).state).toBe('invalid')
    const other: BundleSignatureBlock = { ...signed.signature, alg: 'ML-DSA-44' as never }
    expect(verifyBundleSignature({ ...base, signature: other }, trusted.publicKey).state).toBe('invalid')
  })
})

describe('import gate (validateBundle with a verifier)', () => {
  it('accepts a verified bundle and reports the signature', () => {
    const v = validateBundle(clone(signed), NOW, verifyWith(trusted.publicKey))
    expect(v.ok).toBe(true)
    expect(v.signature?.state).toBe('verified')
  })

  it('rejects an invalid signature when a key is configured', () => {
    const t = clone(signed)
    t.attribution.push('Injected source')
    const v = validateBundle(t, NOW, verifyWith(trusted.publicKey))
    expect(v.ok).toBe(false)
    expect(v.rejection).toBe('signature_invalid')
  })

  it('accepts unsigned bundles unless signatures are required', () => {
    expect(validateBundle(base, NOW, verifyWith(trusted.publicKey)).ok).toBe(true)
    const v = validateBundle(base, NOW, { ...verifyWith(trusted.publicKey), requireSignature: true })
    expect(v.ok).toBe(false)
    expect(v.rejection).toBe('signature_required')
  })

  it('still runs the checksum before the signature', () => {
    const t = clone(signed)
    t.incidents[0].summary = 'rewritten'
    expect(validateBundle(t, NOW, verifyWith(trusted.publicKey)).rejection).toBe('checksum_mismatch')
  })

  it('behaves as before when no verifier is passed', () => {
    const v = validateBundle(clone(signed), NOW)
    expect(v.ok).toBe(true)
    expect(v.signature).toBeUndefined()
  })
})

describe('key files', () => {
  it('round-trips the public key and the private seed', () => {
    const pubText = encodeKeyFile('PUBLIC KEY', trusted.publicKey, 'test key')
    expect(pubText).toContain('BEGIN SPECTRAL ML-DSA-87 PUBLIC KEY')
    expect(decodeKeyFile(pubText, 'PUBLIC KEY')).toEqual(trusted.publicKey)
    const privText = encodeKeyFile('PRIVATE KEY SEED', seed(7))
    expect(keyPairFromSeed(decodeKeyFile(privText, 'PRIVATE KEY SEED')).keyId).toBe(trusted.keyId)
  })

  it('refuses the wrong armour or a truncated key', () => {
    const pubText = encodeKeyFile('PUBLIC KEY', trusted.publicKey)
    expect(() => decodeKeyFile(pubText, 'PRIVATE KEY SEED')).toThrow()
    expect(() => decodeKeyFile(encodeKeyFile('PUBLIC KEY', trusted.publicKey.slice(0, 100)), 'PUBLIC KEY')).toThrow()
  })
})

describe('scanBundles', () => {
  let dir: string
  let bundles: string
  const prevPub = process.env.SPECTRAL_INTEL_PUBLIC_KEY

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'spectral-trust-'))
    bundles = join(dir, 'bundles')
    const pubPath = join(dir, 'intel-signing.pub')
    writeFileSync(pubPath, encodeKeyFile('PUBLIC KEY', trusted.publicKey))
    process.env.SPECTRAL_INTEL_PUBLIC_KEY = pubPath
    mkdirSync(bundles)
    writeFileSync(join(bundles, '2026-09-20.json'), JSON.stringify(signed))
    const tampered = clone(signed)
    tampered.attribution.push('Injected source')
    writeFileSync(join(bundles, '2026-09-22.json'), JSON.stringify(tampered))
  })

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true })
    if (prevPub === undefined) delete process.env.SPECTRAL_INTEL_PUBLIC_KEY
    else process.env.SPECTRAL_INTEL_PUBLIC_KEY = prevPub
  })

  it('skips a newer tampered bundle, loads the older verified one and reports the rejection', async () => {
    const { scanBundles } = await import('@/lib/conflicts/latest-bundle')
    const scan = scanBundles(bundles)
    expect(scan.publicKey?.keyId).toBe(trusted.keyId)
    expect(scan.latest?.file).toBe('2026-09-20.json')
    expect(scan.latest?.signature.state).toBe('verified')
    expect(scan.rejected).toHaveLength(1)
    expect(scan.rejected[0].file).toBe('2026-09-22.json')
    expect(scan.rejected[0].rejection).toBe('signature_invalid')
    expect(scan.rejected[0].signature?.state).toBe('invalid')
  })
})
