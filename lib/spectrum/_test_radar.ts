import { RED_RADARS } from '@/data/seed-radars-red';
import { BLUE_RADARS } from '@/data/seed-radars-blue';
import { EXTRA_RADARS } from '@/data/seed-radars-extra';
import { radarToCapability, RADAR_BAND_HZ } from '@/lib/spectrum/radar-types';
import { askCopilot } from '@/lib/spectrum/aerocopilot';
import { PLATFORMS } from '@/data/seed-platforms';
import { capabilitiesFor } from '@/data/seed-capabilities';
import type { Platform } from '@/lib/spectrum/types';

let pass=0, fail=0;
const ck=(n:string,c:boolean,x='')=>{c?(pass++,console.log(`  ✓ ${n}`)):(fail++,console.log(`  ✗ ${n} ${x}`));};

const radars=[...RED_RADARS,...BLUE_RADARS,...EXTRA_RADARS];
console.log('\n=== Radar data ===');
ck('radars seeded 50+', radars.length>=50, `got ${radars.length}`);
ck('red radars', RED_RADARS.length>=18, `got ${RED_RADARS.length}`);
ck('blue radars', [...BLUE_RADARS,...EXTRA_RADARS].filter(r=>r.side==='blue').length>=25, `got ${[...BLUE_RADARS,...EXTRA_RADARS].filter(r=>r.side==='blue').length}`);
ck('all have freq span', radars.every(r=>r.freq_low_hz<r.freq_high_hz));
ck('all have detect classes', radars.every(r=>r.can_detect.length>0));
ck('all map to capability', radars.every(r=>{const c=radarToCapability(r);return c.freq_low_hz!&&c.freq_high_hz!;}));
ck('bands within IEEE ranges', radars.every(r=>r.freq_low_hz>=3e6&&r.freq_high_hz<=300e9));
ck('S-400 Big Bird is S-band', RED_RADARS.find(r=>r.id==='radar-91n6e-big-bird')?.bands[0]==='S');
ck('TPY-2 is X-band long range', (()=>{const r=BLUE_RADARS.find(x=>x.id==='radar-an-tpy-2');return r?.bands[0]==='X'&&(r.instrumented_range_km??0)>=1000;})());
ck('counter-UAS radars exist', radars.filter(r=>r.role==='counter_uas').length>=3);
ck('VHF counter-stealth exists', radars.filter(r=>r.bands.includes('VHF')&&r.can_detect.includes('stealth')).length>=3);

// hydrate platforms for copilot
const plats:Platform[]=PLATFORMS.map(p=>({...p,capabilities:capabilitiesFor(p.id)}));
const ctx={platforms:plats,radars};

console.log('\n=== AeroCopilot intents ===');
const r1=askCopilot('where should I place my defensive systems?',ctx);
console.log(`  placement → navigate=${r1.action?.navigate}, places=${r1.action?.placeIds?.length}`);
ck('placement → map + suggestions', r1.action?.navigate==='map' && (r1.action?.placeIds?.length??0)>0);

const r2=askCopilot('what drones can I use against an S-400?',ctx);
console.log(`  what-can-i-use → navigate=${r2.action?.navigate}, highlights=${r2.action?.highlightIds?.length}`);
ck('what-can-i-use → library + highlights', r2.action?.navigate==='library');

const r3=askCopilot('what if I use DroneGun Tactical against a DJI Mavic 3?',ctx);
console.log(`  whatif → ${r3.action?.selectRedId} vs ${r3.action?.selectBlueId}, nav=${r3.action?.navigate}`);
ck('whatif → engagement preselected', r3.action?.navigate==='engagement' && !!r3.action?.selectRedId && !!r3.action?.selectBlueId);

const r4=askCopilot('how do I defeat a fibre-optic FPV drone?',ctx);
console.log(`  counter → highlights=${r4.action?.highlightIds?.length}, answer="${r4.answer.slice(0,60)}..."`);
ck('counter fibre-optic → recommends options', /HPM|kinetic|Leonidas|partial|no effector/i.test(r4.answer));

const r5=askCopilot('what band is the Big Bird radar on?',ctx);
console.log(`  explain-radar → "${r5.answer.slice(0,70)}..."`);
ck('explain radar → S-band answer', /S-band|S\/|2.*GHz|4.*GHz/i.test(r5.answer) && r5.action?.navigate==='spectrum');

const r6=askCopilot('hello',ctx);
ck('unknown → helpful fallback', (r6.followups?.length??0)>0);

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===\n`);
process.exit(fail>0?1:0);
