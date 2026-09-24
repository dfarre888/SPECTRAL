/**
 * Sign existing Watchfloor files in place with the ML-DSA-87 key.
 *
 *   npm run intel:sign -- data/intel/bundles/2026-09-24.json [more files]
 *   npm run intel:sign -- data/intel/reporting/2026-09-24.json
 *   npm run intel:sign -- --all        # every incident bundle and reporting file
 *
 * Works for both Watchfloor streams: incident bundles (data/intel/bundles) and
 * reporting windows (data/intel/reporting). Each file is validated first. A
 * `signature` member is added (or replaced) at the end of the file; nothing
 * else changes. Run on the connected machine that holds
 * ~/.spectral/keys/intel-signing.key.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { validateBundle } from '../lib/conflicts/intel-bundle'
import { formatKeyId, keyIdFor, signBundle, verifyBundleSignature } from '../lib/trust/bundle-signature'
import { loadPublicKey, loadSigningKey, privateKeyPath } from '../lib/trust/intel-keys'

const DIRS = [join('data', 'intel', 'bundles'), join('data', 'intel', 'reporting')]
const args = process.argv.slice(2)
const files = args.includes('--all')
  ? DIRS.filter((d) => existsSync(d)).flatMap((d) =>
      readdirSync(d).filter((f) => f.endsWith('.json')).sort().map((f) => join(d, f)),
    )
  : args.filter((a) => !a.startsWith('--'))

if (files.length === 0) {
  console.error('Usage: npm run intel:sign -- <file.json ...> | --all')
  process.exit(1)
}

/** Structural check before signing: never sign something the instance would reject. */
function checkBeforeSigning(raw: Record<string, unknown>): { ok: boolean; message: string } {
  if ('manifest' in raw && 'incidents' in raw) {
    const v = validateBundle(raw)
    return { ok: v.ok, message: v.message }
  }
  if (Array.isArray(raw.items) && typeof raw.generatedAt === 'string' && Number.isFinite(Date.parse(raw.generatedAt))) {
    return { ok: true, message: `${raw.items.length} reporting items` }
  }
  return { ok: false, message: 'Not a Watchfloor incident bundle or reporting file.' }
}

const key = loadSigningKey()
if (!key) {
  console.error(`No signing key at ${privateKeyPath()}. Run npm run intel:keygen first.`)
  process.exit(1)
}
const pub = loadPublicKey()
if (!pub || pub.keyId !== keyIdFor(key.publicKey)) {
  console.error(
    `The private key (${formatKeyId(key.keyId)}) does not match the committed public key (${pub ? formatKeyId(pub.keyId) : 'none'}). ` +
      'Signing would produce files this instance rejects.',
  )
  process.exit(1)
}

let failed = 0
for (const file of files) {
  let raw: Record<string, unknown>
  try {
    raw = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>
  } catch {
    console.error(`SKIP ${file}: not valid JSON`)
    failed++
    continue
  }
  const v = checkBeforeSigning(raw)
  if (!v.ok) {
    console.error(`SKIP ${file}: ${v.message}`)
    failed++
    continue
  }
  const signed = signBundle(raw, key)
  const check = verifyBundleSignature(signed, pub.publicKey)
  if (check.state !== 'verified') {
    console.error(`FAIL ${file}: self-check ${check.state}: ${check.reason}`)
    failed++
    continue
  }
  writeFileSync(file, JSON.stringify(signed, null, 2))
  console.log(`signed ${file}  SHA-384 ${check.digest!.slice(0, 16)}…  key ${formatKeyId(key.keyId)}`)
}
key.secretKey.fill(0)
process.exit(failed ? 1 : 0)
