// SPECTRAL — Warhead Database (OSINT)
// CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
//
// Net Explosive Weight (NEW) and TNT equivalence factors sourced from:
//   • Jane's Ammunition Handbook (open editions)
//   • GlobalSecurity.org warhead specifications
//   • IHS Jane's explosive equivalence tables (unclassified)
//   • Published post-strike forensic analysis (OSINT)
//
// TNT equivalence (Q_e):
//   RDX = 1.60 × TNT   |  HMX = 1.70 × TNT
//   Comp B (60/40)     = 1.35 × TNT
//   HE (generic)       = 1.20 × TNT
//   PBXN (US standard) = 1.50 × TNT
//   Thermite           = 0.0  (incendiary — no blast modelling)
//
// These are reference values for training simulation ONLY.

import type { BlastRadii } from './types'

// Hopkinson-Cranz scaling constants (open field, soft targets)
// Source: US Army FM 3-34.214, Table B-1; Glasstone & Dolan "Effects of Nuclear Weapons"
// adapted for conventional HE by LLNL public papers
const K = {
  lethal:     3.6,   // > 50% PK personnel open field
  injury:     11.5,  // blast-lung incapacitation
  structural: 35.0,  // light structures destroyed
  hazard:     85.0,  // glass breakage / secondary fragmentation scatter
}

/** Hopkinson-Cranz cube-root scaling:  R = K × W_tnt^(1/3) */
function blastRadius(k: number, w_tnt_kg: number): number {
  return parseFloat((k * Math.cbrt(w_tnt_kg)).toFixed(1))
}

function makeEntry(
  weapon_id: string,
  weapon_name: string,
  warhead_kg: number,
  tnt_equivalence: number,
  fragmentation_m: number | null,
  notes: string,
): BlastRadii {
  const tnt = warhead_kg * tnt_equivalence
  return {
    weapon_id,
    weapon_name,
    warhead_kg,
    tnt_equivalent_kg: parseFloat(tnt.toFixed(1)),
    lethal_m:      blastRadius(K.lethal,     tnt),
    injury_m:      blastRadius(K.injury,     tnt),
    structural_m:  blastRadius(K.structural, tnt),
    hazard_m:      blastRadius(K.hazard,     tnt),
    fragmentation_m,
    notes,
  }
}

// ─── Warhead Catalogue ───────────────────────────────────────────────────────

export const WARHEAD_DB: BlastRadii[] = [
  // ── Ukrainian FPV / Tactical ──────────────────────────────────────────────
  makeEntry('fpv-standard-he','FPV Standard HE (RKG-3 / VOG-17)',0.3,1.20,10,
    'Standard FPV drop munition — RKG-3EM clone or 40mm grenade. Primary fragmentation hazard.'),
  makeEntry('fpv-anti-armour-heat','FPV Anti-Armour HEAT',0.5,1.35,12,
    'Tandem HEAT shaped charge. Blast radius secondary to shaped-charge penetration.'),
  makeEntry('r18-grenade-drop','R-18 Grenade Drop (PTM-3 / anti-armour)',1.0,1.20,15,
    'Aerorozvidka R-18 precision drop — anti-armour grenade, 1kg NEW assumed.'),
  makeEntry('fpv-heavy-warhead','FPV Heavy (Vyriy MAX15 class)',6.0,1.20,20,
    'Large-frame FPV 6-8kg warhead — anti-vehicle/fortification. Frag radius dominant.'),
  makeEntry('uj-26-warhead','UJ-26 Bober OWA Warhead',20.0,1.20,null,
    'Ukrainian OWA 20kg HE — comparable to early Geranium-2 impact. Open-field blast dominant.'),

  // ── Russian OWA / Loitering ───────────────────────────────────────────────
  makeEntry('shahed-136-warhead','Shahed-136 / Geran-1 Warhead',36.0,1.35,null,
    'Comp-B fill confirmed by forensic analysis. Primary blast + structural damage.'),
  makeEntry('geran-2-warhead','Geran-2 Warhead',50.0,1.35,null,
    'Confirmed heavier fill vs Shahed-136. OSINT forensic 2023. Building damage dominant.'),
  makeEntry('lancet-3-warhead','Lancet-3 Shaped Charge',3.0,1.50,8,
    'PBXN-class fill estimated. Tandem shaped charge + fragmentation. Anti-vehicle primary.'),
  makeEntry('lancet-1-warhead','Lancet-1 Warhead',1.0,1.50,6,
    'Smaller Lancet variant. Shaped charge + fragmentation skirt.'),

  // ── Iranian ───────────────────────────────────────────────────────────────
  makeEntry('qasef-2k-warhead','Qasef-2K / Ababil-T Warhead',30.0,1.20,40,
    'Proximity fuze — fragments detonate 10–20m above target. Casualty radius fragment-dominated.'),
  makeEntry('samad-3-warhead','Samad-3 OWA Warhead',25.0,1.20,null,
    'HE fill assumed generic — 25kg class Houthi OWA.'),
  makeEntry('shahed-238-warhead','Shahed-238 Jet Warhead',50.0,1.35,null,
    'Jet OWA — heavier fill than -136; higher velocity at impact adds penetration.'),
  makeEntry('mohajer-6-qaem5','Qaem-5 Guided Bomb (Mohajer-6)',40.0,1.20,null,
    'GPS/EO guided glide bomb — 40kg HE class.'),

  // ── Israeli ───────────────────────────────────────────────────────────────
  makeEntry('spike-firefly-warhead','Spike FireFly Warhead',0.5,1.50,8,
    'PBXN mini-warhead. Man-in-loop precise placement — shaped charge + frag.'),
  makeEntry('harpy-ng-warhead','Harpy NG Anti-Radiation Warhead',15.0,1.35,30,
    'Pre-fragmented HE — detonation on radar contact. Primary effect is radar system kill + frag.'),
  makeEntry('green-dragon-warhead','IAI Green Dragon Warhead',3.0,1.20,15,
    '3kg HE class precision strike munition.'),

  // ── Turkish ───────────────────────────────────────────────────────────────
  makeEntry('mam-c','MAM-C Mini Smart Munition (TB2 / Akinci)',6.5,1.50,20,
    'PBXN-C Roketsan. IIR/laser guided. Used extensively in Ukraine, Azerbaijan, Libya. Frag dominant.'),
  makeEntry('mam-l','MAM-L Smart Micro Munition',22.0,1.50,35,
    'Heavier TB2/Akinci munition. Dual mode HEAT + thermobaric variant available.'),
  makeEntry('stm-alpagu-warhead','STM Alpagu Pre-Frag Warhead',0.3,1.35,15,
    'Pre-fragmented anti-personnel. 270g fill — shaped to disperse 10–20m lethal radius.'),
  makeEntry('nagastra-1-warhead','Nagastra-1 Pre-Frag Warhead',1.0,1.20,20,
    'India-made pre-fragmented anti-personnel loitering munition. 1kg class.'),

  // ── US / NATO ─────────────────────────────────────────────────────────────
  makeEntry('switchblade-300-warhead','Switchblade 300 Warhead',0.5,1.60,10,
    'RDX-class shaped charge. Tube-launched precision — anti-personnel primary.'),
  makeEntry('switchblade-600-warhead','Switchblade 600 Anti-Armour Warhead',5.0,1.60,15,
    'RDX class HEAT anti-armour. Equivalent to AT4 warhead.'),
  makeEntry('phoenix-ghost-warhead','Phoenix Ghost Kinetic Warhead',3.0,1.35,null,
    'Kinetic strike warhead — exact fill unconfirmed. Comp-B equivalent assumed.'),
  makeEntry('jdam-250','JDAM GBU-38 (250 lb)/ MK-82 Notional',90.0,1.35,null,
    'Reference only — MK-82 class 90kg HE. Not UAS-standard warhead.'),
]

/** Look up a warhead by weapon_id — returns null if not found */
export function getWarhead(weapon_id: string): BlastRadii | null {
  return WARHEAD_DB.find(w => w.weapon_id === weapon_id) ?? null
}

/** Warheads available for a given platform id */
export const PLATFORM_WARHEAD_MAP: Record<string, string[]> = {
  'fpv-rc':            ['fpv-standard-he', 'fpv-anti-armour-heat'],
  'fpv-fibre-optic':   ['fpv-standard-he', 'fpv-anti-armour-heat'],
  'aerorozvidka-r18':  ['r18-grenade-drop', 'fpv-anti-armour-heat'],
  'vyriy-molfar':      ['fpv-standard-he', 'fpv-anti-armour-heat'],
  'vyriy-max15':       ['fpv-heavy-warhead'],
  'uj-26-bober':       ['uj-26-warhead'],
  'shahed-136':        ['shahed-136-warhead'],
  'shahed-131':        ['shahed-136-warhead'],
  'geran-2':           ['geran-2-warhead'],
  'shahed-238':        ['shahed-238-warhead'],
  'lancet-3':          ['lancet-3-warhead'],
  'lancet-1':          ['lancet-1-warhead'],
  'qasef-2k':          ['qasef-2k-warhead'],
  'samad-3':           ['samad-3-warhead'],
  'mohajer-6':         ['mohajer-6-qaem5'],
  'spike-firefly':     ['spike-firefly-warhead'],
  'harpy-ng':          ['harpy-ng-warhead'],
  'green-dragon':      ['green-dragon-warhead'],
  'tb2-bayraktar':     ['mam-c', 'mam-l'],
  'akinci':            ['mam-c', 'mam-l'],
  'stm-alpagu':        ['stm-alpagu-warhead'],
  'stm-alpagu-b':      ['stm-alpagu-warhead'],
  'nagastra-1':        ['nagastra-1-warhead'],
  'switchblade-300':   ['switchblade-300-warhead'],
  'switchblade-600':   ['switchblade-600-warhead'],
  'phoenix-ghost':     ['phoenix-ghost-warhead'],
}

/** Returns warhead options for a given platform id */
export function getWarheadsForPlatform(platform_id: string): BlastRadii[] {
  const ids = PLATFORM_WARHEAD_MAP[platform_id] ?? []
  return ids.map(id => WARHEAD_DB.find(w => w.weapon_id === id)).filter(Boolean) as BlastRadii[]
}
