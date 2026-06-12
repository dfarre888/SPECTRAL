/**
 * Verify every platform in seed-platforms has ≥1 spectrum capability.
 * Run: npx tsx scripts/verify-catalogue.ts
 */
import { PLATFORMS } from '../data/seed-platforms';
import { CAPABILITIES } from '../data/seed-capabilities';
import { ALL_PLATFORM_IDS } from '../data/platform-catalogue';

let pass = 0;
let fail = 0;

const capIds = new Set(CAPABILITIES.map((c) => c.platform_id));

for (const p of PLATFORMS) {
  if (capIds.has(p.id)) {
    pass++;
  } else {
    fail++;
    console.error(`✗ ${p.id} — no capabilities`);
  }
}

const dupes = ALL_PLATFORM_IDS.filter((id, i, arr) => arr.indexOf(id) !== i);
if (dupes.length) {
  fail++;
  console.error(`✗ Duplicate platform IDs: ${dupes.join(', ')}`);
} else {
  pass++;
  console.log(`✓ No duplicate IDs across ${ALL_PLATFORM_IDS.length} catalogue entries`);
}

console.log(`\n${pass} checks passed, ${fail} failed (${PLATFORMS.length} platforms, ${CAPABILITIES.length} capabilities)`);
if (fail > 0) process.exit(1);
