/**
 * Verify Watchfloor files the way the instance does on load.
 *
 *   npm run intel:verify                       # every incident bundle and reporting file
 *   npm run intel:verify -- path/to/file.json
 *
 * Needs only the public key (data/intel/keys/intel-signing.pub), so it runs on
 * the air-gapped instance before an operator drops a file in. Exit code 1 if
 * any file would be rejected.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { formatKeyId } from '../lib/trust/bundle-signature'
import {
  loadPublicKey,
  publicKeyPath,
  signatureRequired,
  validateBundleForImport,
  validateReportingForImport,
} from '../lib/trust/intel-keys'

const DIRS = [join('data', 'intel', 'bundles'), join('data', 'intel', 'reporting')]
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const files = args.length
  ? args
  : DIRS.filter((d) => existsSync(d)).flatMap((d) =>
      readdirSync(d).filter((f) => f.endsWith('.json')).sort().map((f) => join(d, f)),
    )

const pub = loadPublicKey()
console.log(
  pub
    ? `Trusted key ${formatKeyId(pub.keyId)} (SHA-384 ${pub.fingerprint.slice(0, 32)}…)`
    : `No public key at ${publicKeyPath()}: signatures cannot be checked.`,
)
if (signatureRequired()) console.log('SPECTRAL_INTEL_REQUIRE_SIGNED=true: unsigned files are rejected.')

let bad = 0
for (const file of files) {
  let raw: Record<string, unknown>
  try {
    raw = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>
  } catch {
    console.log(`REJECT   ${file}: not valid JSON`)
    bad++
    continue
  }
  const v = 'manifest' in raw ? validateBundleForImport(raw) : validateReportingForImport(raw)
  const sig = v.signature ?? null
  if (!v.ok) {
    console.log(`REJECT   ${file}: ${v.message}`)
    bad++
  } else {
    const state = (sig?.state ?? 'unchecked').toUpperCase()
    console.log(`${state.padEnd(8)} ${file}: ${sig?.reason ?? v.message}${sig?.signedAt ? ` Signed ${sig.signedAt}.` : ''}`)
  }
}
process.exit(bad ? 1 : 0)
