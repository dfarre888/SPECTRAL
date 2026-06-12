/**
 * SPECTRA engagement engine — acceptance tests (README scenarios).
 * Run: npx tsx lib/spectrum/_test.ts
 */

import { PLATFORMS } from '@/data/seed-platforms'
import { CAPABILITIES } from '@/data/seed-capabilities'
import { resolveCapabilities } from '@/lib/spectrum/fallback'
import { assessEngagement } from '@/lib/spectrum/engagement'
import type { Platform } from '@/lib/spectrum/types'

function hydrate(id: string): Platform {
  const p = PLATFORMS.find((x) => x.id === id)
  if (!p) throw new Error(`Platform not found: ${id}`)
  const curated = CAPABILITIES.filter((c) => c.platform_id === id)
  return {
    ...p,
    capabilities: curated.length > 0 ? curated : resolveCapabilities(p),
  }
}

const cases: { name: string; red: string; blue: string; expect: string }[] = [
  {
    name: 'DJI Mavic 3 vs DroneGun Tactical',
    red: 'dji-mavic-3',
    blue: 'dronegun-tactical',
    expect: 'defeat_likely',
  },
  {
    name: 'Fibre-Optic FPV vs DroneGun Tactical',
    red: 'fpv-fibre-optic',
    blue: 'dronegun-tactical',
    expect: 'no_engagement',
  },
  {
    name: 'Fibre-Optic FPV vs Epirus Leonidas (HPM)',
    red: 'fpv-fibre-optic',
    blue: 'epirus-leonidas',
    expect: 'defeat_likely',
  },
  {
    name: 'Shahed-136 vs DroneGun',
    red: 'shahed-136',
    blue: 'dronegun-tactical',
    expect: 'partial',
  },
  {
    name: 'Anduril Sentry (detect-only) vs Mavic',
    red: 'dji-mavic-3',
    blue: 'anduril-sentry',
    expect: 'detect_only',
  },
]

let passed = 0
let failed = 0

for (const c of cases) {
  const result = assessEngagement(hydrate(c.red), hydrate(c.blue))
  const ok = result.verdict === c.expect
  if (ok) {
    passed++
    console.log(`✓ ${c.name} → ${result.verdict}`)
  } else {
    failed++
    console.error(`✗ ${c.name}: expected ${c.expect}, got ${result.verdict}`)
    console.error(`  headline: ${result.headline}`)
  }
}

console.log(`\n${passed}/${cases.length} passed`)
if (failed > 0) process.exit(1)
