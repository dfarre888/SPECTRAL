/**
 * Generate the Watchfloor bundle signing key pair (ML-DSA-87, FIPS 204).
 *
 *   npm run intel:keygen             # refuses to replace an existing key
 *   npm run intel:keygen -- --force  # rotate: new key pair, old bundles stop verifying until re-signed
 *
 * Writes:
 *   private seed  ~/.spectral/keys/intel-signing.key  (mode 600, directory 700, OUTSIDE the repo)
 *   public key    data/intel/keys/intel-signing.pub   (commit this; the instance trusts it)
 *
 * Paths can be overridden with SPECTRAL_INTEL_SIGNING_KEY and SPECTRAL_INTEL_PUBLIC_KEY.
 * Never prints key material, only the key id and fingerprint.
 */
import { randomBytes } from 'node:crypto'
import { chmodSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { encodeKeyFile, formatKeyId, keyPairFromSeed, publicKeyFingerprint } from '../lib/trust/bundle-signature'
import { privateKeyPath, publicKeyPath } from '../lib/trust/intel-keys'

const force = process.argv.includes('--force')
const priv = privateKeyPath()
const pub = publicKeyPath()

const repoRoot = process.cwd()
if (!relative(repoRoot, resolve(priv)).startsWith('..')) {
  console.error(`Refusing to write the private key inside the repository (${priv}). Point SPECTRAL_INTEL_SIGNING_KEY outside it.`)
  process.exit(1)
}
if (existsSync(priv) && !force) {
  console.error(`A signing key already exists at ${priv}. Use --force to rotate it (existing bundles must then be re-signed).`)
  process.exit(1)
}

const seed = new Uint8Array(randomBytes(32))
const kp = keyPairFromSeed(seed)
const createdAt = new Date().toISOString()

mkdirSync(dirname(priv), { recursive: true, mode: 0o700 })
chmodSync(dirname(priv), 0o700)
writeFileSync(priv, encodeKeyFile('PRIVATE KEY SEED', seed, `Watchfloor signing key ${kp.keyId}, created ${createdAt}. Keep secret.`), { mode: 0o600 })
chmodSync(priv, 0o600)

mkdirSync(dirname(pub), { recursive: true })
writeFileSync(pub, encodeKeyFile('PUBLIC KEY', kp.publicKey, `Watchfloor bundle verification key ${kp.keyId}, created ${createdAt}`))

seed.fill(0)
kp.secretKey.fill(0)

console.log(`ML-DSA-87 key pair generated.`)
console.log(`  key id       ${formatKeyId(kp.keyId)}`)
console.log(`  fingerprint  SHA-384 ${publicKeyFingerprint(kp.publicKey)}`)
console.log(`  private seed ${priv} (mode 600)`)
console.log(`  public key   ${relative(repoRoot, pub) || pub}`)
console.log(`Next: npm run intel:sign -- --all`)
