#!/usr/bin/env npx tsx
/**
 * SPECTRAL — SAM / IADS catalogue validator
 * Run: npx tsx scripts/validate-sam-catalogue.ts
 */
import { IADS_THREAT_CATALOGUE } from '@/lib/moat/sovereignData'
import { SAM_PROFILES, getSamProfile } from '@/lib/risk/sam-intercept'
import { RED_EFFECTORS } from '@/data/seed-effectors-red'
import { kineticPctFromSam } from '@/lib/defeat/sam-matrix-bridge'

let failed = false

function fail(msg: string): void {
  console.error(`FAIL: ${msg}`)
  failed = true
}

function pass(msg: string): void {
  console.log(`OK: ${msg}`)
}

// 1. IADS catalogue count
if (IADS_THREAT_CATALOGUE.length !== 14) {
  fail(`Expected 14 IADS entries, got ${IADS_THREAT_CATALOGUE.length}`)
} else {
  pass('IADS catalogue has 14 entries')
}

// 2. SAM profile refs exist
for (const entry of IADS_THREAT_CATALOGUE) {
  const ids = entry.sam_profile_ids ?? (entry.sam_profile_id ? [entry.sam_profile_id] : [])
  for (const id of ids) {
    if (!getSamProfile(id)) {
      fail(`IADS entry ${entry.id} references missing SAM profile ${id}`)
    }
  }
}
pass('All IADS sam_profile refs exist in SAM_PROFILES')

// 3. effector_ids exist in RED_EFFECTORS (except SA-12)
const effectorIds = new Set(RED_EFFECTORS.map((e) => e.id))
for (const entry of IADS_THREAT_CATALOGUE) {
  if (entry.id === 'iads-sa-12-gladiator') continue
  if (entry.effector_id && !effectorIds.has(entry.effector_id)) {
    fail(`IADS entry ${entry.id} effector_id ${entry.effector_id} not in RED_EFFECTORS`)
  }
}
pass('All IADS effector_ids exist in RED_EFFECTORS (SA-12 exempt)')

// 4. kineticPctFromSam spot check: SA-15 vs shahed-136 within ±5 of 62
const spot = kineticPctFromSam('sa-15-gauntlet', 'shahed-136')
const expected = 62
if (spot == null || Math.abs(spot - expected) > 5) {
  fail(`kineticPctFromSam(sa-15, shahed-136) = ${spot}, expected ~${expected} ±5`)
} else {
  pass(`kineticPctFromSam spot check: ${spot}% (expected ~${expected})`)
}

// 5. SAM_PROFILES non-empty
if (SAM_PROFILES.length < 19) {
  fail(`Expected ≥19 SAM profiles, got ${SAM_PROFILES.length}`)
} else {
  pass(`${SAM_PROFILES.length} SAM profiles loaded`)
}

if (failed) {
  process.exit(1)
}
console.log('\nAll SAM catalogue validations passed.')
