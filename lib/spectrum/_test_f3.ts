import { askCopilot } from '@/lib/spectrum/aerocopilot';
import { BLUE_EFFECTORS } from '@/data/seed-effectors-blue';
import { RED_EFFECTORS } from '@/data/seed-effectors-red';
import { RED_RADARS } from '@/data/seed-radars-red';
import { BLUE_RADARS } from '@/data/seed-radars-blue';
import { EXTRA_RADARS } from '@/data/seed-radars-extra';
import { PLATFORMS } from '@/data/seed-platforms';
import { capabilitiesFor } from '@/data/seed-capabilities';
import type { Platform } from '@/lib/spectrum/types';

let pass=0, fail=0;
const ck=(n:string,c:boolean,x='')=>{c?(pass++,console.log(`  ✓ ${n}`)):(fail++,console.log(`  ✗ ${n} ${x}`));};
const eff=[...BLUE_EFFECTORS,...RED_EFFECTORS];
const radars=[...RED_RADARS,...BLUE_RADARS,...EXTRA_RADARS];
const plats:Platform[]=PLATFORMS.map(p=>({...p,capabilities:capabilitiesFor(p.id)}));
const ctx={platforms:plats,radars,effectors:eff};

console.log('\n=== AeroCopilot F3 integration ===');
const c1=askCopilot('how do I defeat a Shahed-136?',ctx);
console.log(`  counter Shahed → nav=${c1.action?.navigate}, places=${c1.action?.placeIds?.length}`);
console.log(`    "${c1.answer.slice(0,90)}"`);
ck('counter uses effectors → map + staged', c1.action?.navigate==='map' && (c1.action?.placeIds?.length??0)>0);

const c2=askCopilot('what is the kill chain on a fibre-optic FPV?',ctx);
console.log(`  killchain → "${c2.answer.slice(0,90)}"`);
ck('killchain returns FIND/FIX/FINISH', (c2.reasoning?.some(r=>r.includes('FIND'))??false));

const c3=askCopilot('how do I defeat a fibre-optic FPV drone?',ctx);
console.log(`  counter FOC → "${c3.answer.slice(0,90)}"`);
ck('counter FOC recommends HPM/laser', /Leonidas|HPM|Iron Beam/i.test(c3.answer));

const c4=askCopilot('where should I place my defensive systems?',ctx);
ck('placement still works', c4.action?.navigate==='map');

const c5=askCopilot('what if I use DroneGun against a Shahed-136?',ctx);
ck('whatif still works', c5.action?.navigate==='engagement');

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===\n`);
process.exit(fail>0?1:0);
