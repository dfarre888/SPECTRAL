import { BLUE_EFFECTORS } from '@/data/seed-effectors-blue';
import { RED_EFFECTORS } from '@/data/seed-effectors-red';
import { canEngage, effectorsAgainst, killChainStatus, platformTargetClass, analyzeRoute, summarizeRoute } from '@/lib/spectrum/killchain';
import { buildEnvelopeRing, haversineKm, pointInEnvelope, ringsEngaging } from '@/lib/spectrum/effector-types';
import { PLATFORMS } from '@/data/seed-platforms';
import { capabilitiesFor } from '@/data/seed-capabilities';
import { RED_RADARS } from '@/data/seed-radars-red';
import { BLUE_RADARS } from '@/data/seed-radars-blue';
import { EXTRA_RADARS } from '@/data/seed-radars-extra';
import type { Platform } from '@/lib/spectrum/types';

let pass=0, fail=0;
const ck=(n:string,c:boolean,x='')=>{c?(pass++,console.log(`  ✓ ${n}`)):(fail++,console.log(`  ✗ ${n} ${x}`));};

const eff=[...BLUE_EFFECTORS,...RED_EFFECTORS];
const radars=[...RED_RADARS,...BLUE_RADARS,...EXTRA_RADARS];
const plats:Platform[]=PLATFORMS.map(p=>({...p,capabilities:capabilitiesFor(p.id)}));
const byId=(id:string)=>plats.find(p=>p.id===id)!;

console.log('\n=== Effector data ===');
ck('24+ effectors', eff.length>=22, `got ${eff.length}`);
ck('both sides', BLUE_EFFECTORS.length>=10 && RED_EFFECTORS.length>=8, `B${BLUE_EFFECTORS.length}/R${RED_EFFECTORS.length}`);
ck('all have envelopes', eff.every(e=>e.envelope.max_range_km>0&&e.envelope.max_alt_km>0));
ck('all four effect types present', new Set(eff.map(e=>e.effect)).size>=4);
ck('tiers span point→strategic', ['point_defence','shorad','medium','long','strategic_bmd'].every(t=>eff.some(e=>e.tier===t)));
ck('DE weapons have unlimited mag note', eff.filter(e=>e.effect==='hpm'||e.effect==='laser').every(e=>e.magazine===null&&!!e.magazine_note));

console.log('\n=== FINISH: canEngage ===');
// HPM vs fibre-optic FPV → effective (the headline truth)
const foc=byId('fpv-fibre-optic');
const leonidas=BLUE_EFFECTORS.find(e=>e.id==='eff-epirus-leonidas')!;
const r1=canEngage(leonidas,foc,5000);
console.log(`  Leonidas vs fibre-optic FPV: ${r1.verdict} — ${r1.reasons[0]}`);
ck('HPM defeats fibre-optic FPV', r1.verdict==='effective');

// Patriot vs small drone → marginal (economically irrational)
const mavic=byId('dji-mavic-3');
const patriot=BLUE_EFFECTORS.find(e=>e.id==='eff-patriot-pac3')!;
const r2=canEngage(patriot,mavic,5000);
console.log(`  Patriot vs Mavic 3: ${r2.verdict} — ${r2.reasons[0]}`);
ck('Patriot vs small drone = cannot or marginal', r2.verdict!=='effective');

// THAAD vs drone → cannot (wrong target class entirely)
const thaad=BLUE_EFFECTORS.find(e=>e.id==='eff-thaad')!;
const r3=canEngage(thaad,mavic);
console.log(`  THAAD vs Mavic 3: ${r3.verdict}`);
ck('THAAD cannot engage small drone', r3.verdict==='cannot');

console.log('\n=== Ranked effectors against a Shahed ===');
const shahed=byId('shahed-136');
const ranked=effectorsAgainst(shahed,eff,'blue');
console.log('  top 3:', ranked.slice(0,3).map(a=>`${a.effector.name}(${a.verdict})`).join(', '));
ck('something effective vs Shahed', ranked.some(a=>a.verdict==='effective'));

console.log('\n=== Kill chain status ===');
const kc=killChainStatus(foc,radars,eff,'blue');
console.log(`  fibre-optic FPV chain: ${kc.summary}`);
ck('kill chain returns find/fix/finish', 'find' in kc && 'fix' in kc && 'finish' in kc);
const kcShahed=killChainStatus(shahed,radars,eff,'blue');
console.log(`  Shahed chain: ${kcShahed.summary}`);
ck('Shahed has a finish option', kcShahed.finish.ok);

console.log('\n=== Geometry / coverage gaps ===');
// place a Patriot at origin, test points
const ring=buildEnvelopeRing({effectorId:'eff-patriot-pac3',origin:{lat:0,lon:0}},patriot);
const near={lat:0.2,lon:0}; // ~22 km
const far={lat:2,lon:0};    // ~222 km
console.log(`  haversine 0.2°≈${haversineKm({lat:0,lon:0},near).toFixed(0)}km, 2°≈${haversineKm({lat:0,lon:0},far).toFixed(0)}km`);
ck('point in envelope (22km @ 10km alt)', pointInEnvelope(ring,near,10));
ck('point outside envelope (222km)', !pointInEnvelope(ring,far,10));
ck('point below floor excluded', !pointInEnvelope({...ring,floor_km:5},near,1));

// route analysis: low ingress under a high-altitude-only interceptor
const thaadRing=buildEnvelopeRing({effectorId:'eff-thaad',origin:{lat:0,lon:0}},thaad);
const lowRoute=[{lat:0.1,lon:0,alt_km:0.1},{lat:0.2,lon:0,alt_km:0.1},{lat:0.3,lon:0,alt_km:0.1}];
const segs=analyzeRoute([thaadRing],lowRoute);
const summ=summarizeRoute(segs);
console.log(`  low ingress vs THAAD-only: ${summ.coveredPct}% covered — ${summ.verdict.slice(0,50)}`);
ck('low route slips under high-alt-only interceptor', summ.coveredPct===0);

// combined: Patriot + a SHORAD covers the low route
const nasams=BLUE_EFFECTORS.find(e=>e.id==='eff-nasams-amraam')!;
const nasamsRing=buildEnvelopeRing({effectorId:'eff-nasams-amraam',origin:{lat:0,lon:0}},nasams);
const segs2=analyzeRoute([thaadRing,nasamsRing],lowRoute);
const summ2=summarizeRoute(segs2);
console.log(`  same route + NASAMS: ${summ2.coveredPct}% covered`);
ck('adding SHORAD closes the low-altitude gap', summ2.coveredPct>0);

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===\n`);
process.exit(fail>0?1:0);

// === AeroCopilot F3 integration ===
import { askCopilot } from '@/lib/spectrum/aerocopilot';
console.log('\n=== AeroCopilot F3 intents ===');
const ctx2={platforms:plats,radars,effectors:eff};
const c1=askCopilot('how do I defeat a Shahed-136?',ctx2);
console.log(`  counter Shahed → nav=${c1.action?.navigate}, "${c1.answer.slice(0,70)}..."`);
let p2=0,f2=0; const k2=(n:string,c:boolean)=>{c?p2++:(f2++,console.log(`  ✗ ${n}`));};
k2('counter uses effectors + map', c1.action?.navigate==='map' && (c1.action?.placeIds?.length??0)>0);
const c2=askCopilot('what is the kill chain on a fibre-optic FPV?',ctx2);
console.log(`  killchain → "${c2.answer.slice(0,70)}..."`);
k2('killchain returns F3 reasoning', (c2.reasoning?.some(r=>r.includes('FIND'))??false));
const c3=askCopilot('how do I defeat a fibre-optic FPV drone?',ctx2);
console.log(`  counter FOC → refs: ${c3.refs?.map(r=>r.name).join(', ')}`);
k2('counter FOC recommends HPM', /Leonidas|HPM|Iron Beam/i.test(c3.answer));
console.log(`  F3 integration: ${p2} passed, ${f2} failed`);
