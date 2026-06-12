/* Acceptance tests for the spectrum engine. Run with: npx tsx _test.ts */
import { PLATFORMS } from '@/data/seed-platforms';
import { CAPABILITIES, capabilitiesFor } from '@/data/seed-capabilities';
import { assessEngagement, computeOverlaps } from '@/lib/spectrum/engagement';
import { resolveCapabilities, deriveCapabilities } from '@/lib/spectrum/fallback';
import { getAxisConfig, makeLogScale, capabilityExtent, umToHz, hzToUm } from '@/lib/spectrum/scale';
import type { Platform } from '@/lib/spectrum/types';

// hydrate platforms with their capabilities
const byId = new Map<string, Platform>();
for (const p of PLATFORMS) byId.set(p.id, { ...p, capabilities: capabilitiesFor(p.id) });

let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name} ${extra}`); }
}

console.log('\n=== Data integrity ===');
check('25 platforms seeded', PLATFORMS.length === 25, `got ${PLATFORMS.length}`);
check('14 red', PLATFORMS.filter(p => p.side === 'red').length === 14, `got ${PLATFORMS.filter(p=>p.side==='red').length}`);
check('11 blue', PLATFORMS.filter(p => p.side === 'blue').length === 11, `got ${PLATFORMS.filter(p=>p.side==='blue').length}`);
check('every platform has >=1 capability OR derivable fields', PLATFORMS.every(p => {
  const caps = capabilitiesFor(p.id);
  return caps.length > 0 || deriveCapabilities(p).length > 0;
}));
check('CH-4 Rainbow now has capabilities', capabilitiesFor('ch-4-rainbow').length > 0, `got ${capabilitiesFor('ch-4-rainbow').length}`);
check('all capability extents resolve', CAPABILITIES.every(c => {
  const ext = capabilityExtent(c, c.axis === 'eo_ir' || c.axis === 'cbrn' ? 'um' : 'hz');
  return ext !== null && ext[0] <= ext[1];
}));

console.log('\n=== Unit conversion ===');
check('1.06 µm ≈ 283 THz', Math.abs(umToHz(1.06)/1e12 - 282.8) < 2, `got ${(umToHz(1.06)/1e12).toFixed(1)} THz`);
check('2.4 GHz ≈ 0.125 m wavelength', Math.abs(hzToUm(2.4e9)/1e6 - 0.1249) < 0.01, `got ${(hzToUm(2.4e9)/1e6).toFixed(4)} m`);

console.log('\n=== Log scale ===');
const ax = getAxisConfig('rf', [0, 1000]);
const s = makeLogScale(ax.domain, ax.range);
check('RF scale: 3 MHz → x≈0', Math.abs(s(3e6) - 0) < 1, `got ${s(3e6).toFixed(1)}`);
check('RF scale: 40 GHz → x≈1000', Math.abs(s(40e9) - 1000) < 1, `got ${s(40e9).toFixed(1)}`);
check('RF scale: 2.4 GHz lands mid-right', s(2.4e9) > 600 && s(2.4e9) < 800, `got ${s(2.4e9).toFixed(1)}`);
check('invert round-trips', Math.abs(s.invert(s(1.5e9)) - 1.5e9) < 1e6);

console.log('\n=== ACCEPTANCE TEST 1: Mavic vs DroneGun → defeat_likely ===');
const mavic = byId.get('dji-mavic-3')!;
const dronegun = byId.get('dronegun-tactical')!;
const r1 = assessEngagement(mavic, dronegun);
const ov1 = computeOverlaps(mavic, dronegun);
console.log(`  verdict: ${r1.verdict} — "${r1.headline}"`);
console.log(`  overlaps: ${ov1.length} (${ov1.map(o=>o.redCapability.label).join(', ')})`);
check('verdict is defeat_likely', r1.verdict === 'defeat_likely', `got ${r1.verdict}`);
check('overlaps cover control (2.4)', ov1.some(o => o.redCapability.fn === 'control'));
check('overlaps cover video (5.8)', ov1.some(o => o.redCapability.fn === 'video'));
check('overlaps cover navigation', ov1.some(o => o.redCapability.fn === 'navigation'));

console.log('\n=== ACCEPTANCE TEST 2: Fibre-Optic FPV vs DroneGun → no_engagement ===');
const foc = byId.get('fpv-fibre-optic')!;
const r2 = assessEngagement(foc, dronegun);
const ov2 = computeOverlaps(foc, dronegun);
console.log(`  verdict: ${r2.verdict} — "${r2.headline}"`);
console.log(`  overlaps: ${ov2.length}`);
console.log(`  recommendations: ${r2.recommendations.join(' | ')}`);
check('verdict is no_engagement', r2.verdict === 'no_engagement', `got ${r2.verdict}`);
check('zero RF overlap', ov2.length === 0, `got ${ov2.length}`);
check('recommends HPM', r2.recommendations.some(r => /HPM|microwave/i.test(r)));

console.log('\n=== BONUS: FOC vs Leonidas (HPM) → defeat_likely ===');
const leonidas = byId.get('epirus-leonidas')!;
const r3 = assessEngagement(foc, leonidas);
console.log(`  verdict: ${r3.verdict} — "${r3.headline}"`);
check('HPM defeats RF-silent threat', r3.verdict === 'defeat_likely', `got ${r3.verdict}`);

console.log('\n=== BONUS: Shahed-136 vs DroneGun → partial (GNSS-denied capable) ===');
const shahed = byId.get('shahed-136')!;
const r4 = assessEngagement(shahed, dronegun);
console.log(`  verdict: ${r4.verdict} — "${r4.headline}"`);
console.log(`  uncovered: ${r4.uncovered.map(u=>u.label).join(', ') || 'none'}`);
check('Shahed not a clean defeat (CRPA + AI terminal)', r4.verdict === 'partial' || r4.verdict === 'no_engagement', `got ${r4.verdict}`);

console.log('\n=== BONUS: Sentry (detect-only) vs Mavic → detect_only ===');
const sentry = byId.get('anduril-sentry')!;
const r5 = assessEngagement(mavic, sentry);
console.log(`  verdict: ${r5.verdict} — "${r5.headline}"`);
check('detect-only effector flagged', r5.verdict === 'detect_only', `got ${r5.verdict}`);

console.log('\n=== FALLBACK generator ===');
const fake: Platform = { id: 'test-fallback', name: 'Test', side: 'red', c2_uplink_mhz: 2440, video_mhz: 5800, gnss_used: ['GPS','GLONASS'] };
const derived = deriveCapabilities(fake);
console.log(`  derived ${derived.length} bands: ${derived.map(d=>d.label).join(', ')}`);
check('derives control + video + 2 GNSS', derived.length === 4, `got ${derived.length}`);
check('all derived flagged derived=true', derived.every(d => d.derived === true));
check('resolveCapabilities uses curated when present', resolveCapabilities(mavic).every(c => !c.derived));
check('resolveCapabilities falls back when empty', resolveCapabilities(fake).length === 4);

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===\n`);
process.exit(fail > 0 ? 1 : 0);
