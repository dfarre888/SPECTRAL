/**
 * Swarm Saturation — defeat system profiles (OSINT training estimates).
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 *
 * Magazine = normalised engagement capacity (single-target kill attempts).
 * Radar-cued stacks are modelled as integrated fire units (sensor + effector).
 * Red profiles sourced from data/seed-effectors-red.ts + seed-platforms EW.
 */

export type DefeatSystemType = 'missile' | 'dew' | 'hpm' | 'cannon' | 'rf'

export type SwarmDefeatGroup =
  | 'Blue — Directed energy'
  | 'Blue — C-UAS / SHORAD'
  | 'Blue — Naval CIWS'
  | 'Blue — Theatre SAM / BMD'
  | 'Red — Long-range SAM / BMD'
  | 'Red — Medium SAM'
  | 'Red — SHORAD / point defence'
  | 'Red — EW / soft-kill'

export interface DefeatSystem {
  id: string
  name: string
  side: 'blue' | 'red'
  magazine: number
  pk: number
  type: DefeatSystemType
  group: SwarmDefeatGroup
  note: string
}

/** Use 999 for power-/battery-limited “deep magazine” effectors */
export const DEEP_MAGAZINE = 999

export const SWARM_DEFEAT_SYSTEMS: DefeatSystem[] = [
  // ═══════════════════════ BLUE ═════════════════════════════════════════════

  // ── Directed energy / HPM ─────────────────────────────────────────────────
  {
    id: 'iron-beam',
    name: 'Iron Beam DEW',
    side: 'blue',
    magazine: 30,
    pk: 0.88,
    type: 'dew',
    group: 'Blue — Directed energy',
    note: '100 kW laser · EL/M-2084 cue · ~30 engagements/sortie (dwell-limited)',
  },
  {
    id: 'dragonfire',
    name: 'DragonFire DEW',
    side: 'blue',
    magazine: 25,
    pk: 0.85,
    type: 'dew',
    group: 'Blue — Directed energy',
    note: 'UK 50 kW laser · RN deploy ~2027 · power-limited sortie',
  },
  {
    id: 'epirus-leonidas',
    name: 'Epirus Leonidas HPM',
    side: 'blue',
    magazine: DEEP_MAGAZINE,
    pk: 0.75,
    type: 'hpm',
    group: 'Blue — Directed energy',
    note: 'Area HPM · power-budget limited · effective vs RF-silent swarms',
  },

  // ── RF soft-kill C-UAS ────────────────────────────────────────────────────
  {
    id: 'drone-dome',
    name: 'Drone Dome (Rafael)',
    side: 'blue',
    magazine: 45,
    pk: 0.70,
    type: 'rf',
    group: 'Blue — C-UAS / SHORAD',
    note: 'RF + laser stack · 1 km hard-kill · INEFFECTIVE vs FOC',
  },
  {
    id: 'dronesentry',
    name: 'DroneSentry + DroneCannon',
    side: 'blue',
    magazine: 45,
    pk: 0.62,
    type: 'rf',
    group: 'Blue — C-UAS / SHORAD',
    note: 'RADA + RfOne + EO/IR cue · RF defeat to ~5 km',
  },
  {
    id: 'dronegun-mk4',
    name: 'DroneGun Mk4 (RF)',
    side: 'blue',
    magazine: 60,
    pk: 0.60,
    type: 'rf',
    group: 'Blue — C-UAS / SHORAD',
    note: 'Man-portable RF jam · ~60 battery engagements',
  },
  {
    id: 'pulsar-v',
    name: 'Anduril Pulsar-V',
    side: 'blue',
    magazine: 120,
    pk: 0.58,
    type: 'rf',
    group: 'Blue — C-UAS / SHORAD',
    note: 'Vehicle RF jammer · FOC-blind · cue with kinetic layer',
  },

  // ── Gun / kinetic C-UAS ───────────────────────────────────────────────────
  {
    id: 'skynex',
    name: 'Rheinmetall Skynex',
    side: 'blue',
    magazine: 80,
    pk: 0.70,
    type: 'cannon',
    group: 'Blue — C-UAS / SHORAD',
    note: '35 mm AHEAD · X-TAR3D cue · Ukraine Shahed swarm lessons',
  },
  {
    id: 'gepard',
    name: 'Gepard 35mm',
    side: 'blue',
    magazine: 40,
    pk: 0.55,
    type: 'cannon',
    group: 'Blue — C-UAS / SHORAD',
    note: '~40 burst engagements · twin 35 mm cannon',
  },
  {
    id: 'eos-slinger',
    name: 'EOS Slinger',
    side: 'blue',
    magazine: 40,
    pk: 0.65,
    type: 'cannon',
    group: 'Blue — C-UAS / SHORAD',
    note: 'Australian 30 mm gun C-UAS · cost-exchange optimised',
  },
  {
    id: 'phalanx',
    name: 'Phalanx CIWS',
    side: 'blue',
    magazine: 49,
    pk: 0.65,
    type: 'cannon',
    group: 'Blue — Naval CIWS',
    note: '~49 burst engagements (20 mm · 4500 rpm)',
  },
  {
    id: 'goalkeeper',
    name: 'Goalkeeper CIWS',
    side: 'blue',
    magazine: 60,
    pk: 0.75,
    type: 'cannon',
    group: 'Blue — Naval CIWS',
    note: '30 mm GAU-8 derivative · ~60 burst engagements',
  },

  // ── Kinetic interceptors / MANPADS / loitering C-UAS ──────────────────────
  {
    id: 'coyote-b3',
    name: 'Coyote Block 3 (HPM)',
    side: 'blue',
    magazine: 6,
    pk: 0.72,
    type: 'missile',
    group: 'Blue — C-UAS / SHORAD',
    note: 'Reusable HPM loitering interceptor · swarm cost-exchange',
  },
  {
    id: 'coyote-b2',
    name: 'Coyote Block 2 (KuRFS)',
    side: 'blue',
    magazine: 4,
    pk: 0.85,
    type: 'missile',
    group: 'Blue — C-UAS / SHORAD',
    note: 'KuRFS Ku-band cue · kinetic hard-kill · 4 tubes',
  },
  {
    id: 'anduril-anvil',
    name: 'Anduril Anvil (Lattice)',
    side: 'blue',
    magazine: 12,
    pk: 0.78,
    type: 'missile',
    group: 'Blue — C-UAS / SHORAD',
    note: 'Lattice sensor fusion cue · FOC-resilient ram-kill',
  },
  {
    id: 'starstreak',
    name: 'Starstreak VSHORAD',
    side: 'blue',
    magazine: 9,
    pk: 0.75,
    type: 'missile',
    group: 'Blue — C-UAS / SHORAD',
    note: '3×3 launcher · laser-beam rider',
  },
  {
    id: 'm-shorad',
    name: 'M-SHORAD Stryker',
    side: 'blue',
    magazine: 4,
    pk: 0.70,
    type: 'missile',
    group: 'Blue — C-UAS / SHORAD',
    note: 'Stinger + Hellfire · 4 ready rounds',
  },
  {
    id: 'stinger-manpads',
    name: 'FIM-92J Stinger MANPADS',
    side: 'blue',
    magazine: 2,
    pk: 0.68,
    type: 'missile',
    group: 'Blue — C-UAS / SHORAD',
    note: '2-tube team · proximity fuze for UAS',
  },
  {
    id: 'searam',
    name: 'SeaRAM',
    side: 'blue',
    magazine: 11,
    pk: 0.85,
    type: 'missile',
    group: 'Blue — Naval CIWS',
    note: 'RIM-116 on Phalanx mount · Red Sea lesson',
  },

  // ── Radar-cued SAM / layered air defence ──────────────────────────────────
  {
    id: 'iron-dome',
    name: 'Iron Dome (Tamir / EL/M-2084)',
    side: 'blue',
    magazine: 20,
    pk: 0.90,
    type: 'missile',
    group: 'Blue — Theatre SAM / BMD',
    note: 'EL/M-2084 multi-mission cue · 20 Tamir ready',
  },
  {
    id: 'land-ceptor',
    name: 'Land Ceptor (CAMM / Giraffe)',
    side: 'blue',
    magazine: 8,
    pk: 0.82,
    type: 'missile',
    group: 'Blue — C-UAS / SHORAD',
    note: 'Saab Giraffe AMB cue · 8 CAMM cells',
  },
  {
    id: 'iris-t-slm',
    name: 'IRIS-T SLM (TRML-4D cue)',
    side: 'blue',
    magazine: 8,
    pk: 0.85,
    type: 'missile',
    group: 'Blue — C-UAS / SHORAD',
    note: 'TRML-4D / Ground Master radar cue · 8 rounds',
  },
  {
    id: 'nasams',
    name: 'NASAMS AMRAAM-ER',
    side: 'blue',
    magazine: 12,
    pk: 0.80,
    type: 'missile',
    group: 'Blue — C-UAS / SHORAD',
    note: 'AN/MPQ-64 cue · 12-cell VLS · medium-range SAM',
  },
  {
    id: 'gbad-cea-sm2',
    name: 'GBAD CEA/SM-2 (ADF)',
    side: 'blue',
    magazine: 8,
    pk: 0.78,
    type: 'missile',
    group: 'Blue — Theatre SAM / BMD',
    note: 'CEA CEAFAR cue · Taipan Strike prototype · 166 km',
  },
  {
    id: 'davids-sling',
    name: "David's Sling (Stunner)",
    side: 'blue',
    magazine: 12,
    pk: 0.90,
    type: 'missile',
    group: 'Blue — Theatre SAM / BMD',
    note: 'EL/M-2084-class cue · 12 Stunner interceptors',
  },
  {
    id: 'patriot-pac3',
    name: 'Patriot PAC-3 MSE (LTAMDS)',
    side: 'blue',
    magazine: 16,
    pk: 0.88,
    type: 'missile',
    group: 'Blue — Theatre SAM / BMD',
    note: 'LTAMDS / MPQ-65 cue · poor cost-exchange vs Shahed',
  },
  {
    id: 'sm-2-aegis',
    name: 'SM-2 (Aegis / SPY cue)',
    side: 'blue',
    magazine: 32,
    pk: 0.75,
    type: 'missile',
    group: 'Blue — Naval CIWS',
    note: 'Naval VLS slice · SPY-1/6 cue · costly vs OWA swarms',
  },

  // ═══════════════════════ RED ══════════════════════════════════════════════

  // ── Long-range SAM / BMD ──────────────────────────────────────────────────
  {
    id: 'red-s400-40n6',
    name: 'S-400 (40N6) SA-21',
    side: 'red',
    magazine: 4,
    pk: 0.80,
    type: 'missile',
    group: 'Red — Long-range SAM / BMD',
    note: 'Big Bird / Grave Stone cue · 380 km aero · irrational vs cheap swarms',
  },
  {
    id: 'red-s400-48n6',
    name: 'S-400 / S-300 (48N6E3)',
    side: 'red',
    magazine: 4,
    pk: 0.80,
    type: 'missile',
    group: 'Red — Long-range SAM / BMD',
    note: 'Tombstone / Flap Lid cue · 250 km · ABM-capable',
  },
  {
    id: 'red-s500-77n6',
    name: 'S-500 (77N6) SA-X-69',
    side: 'red',
    magazine: 4,
    pk: 0.80,
    type: 'missile',
    group: 'Red — Long-range SAM / BMD',
    note: '91N6A / Nebo-M cue · claimed hypersonic intercept · unverified',
  },
  {
    id: 'red-s300-5v55',
    name: 'S-300PMU (5V55R / 48N6)',
    side: 'red',
    magazine: 4,
    pk: 0.80,
    type: 'missile',
    group: 'Red — Long-range SAM / BMD',
    note: '30N6 Flap Lid + 64N6 Tombstone · IADS backbone · high SEAD signature',
  },
  {
    id: 'red-s300vm',
    name: 'S-300VM Antey-2500 (9M83)',
    side: 'red',
    magazine: 4,
    pk: 0.80,
    type: 'missile',
    group: 'Red — Long-range SAM / BMD',
    note: '9S15MT Bill Board + 9S19M2 cue · dual ballistic/aero',
  },
  {
    id: 'red-hq9b',
    name: 'HQ-9B',
    side: 'red',
    magazine: 4,
    pk: 0.80,
    type: 'missile',
    group: 'Red — Long-range SAM / BMD',
    note: 'HT-233 engagement radar cue · 260 km · Chinese IADS backbone',
  },

  // ── Medium SAM ────────────────────────────────────────────────────────────
  {
    id: 'red-s400-9m96',
    name: 'S-400 / S-350 (9M96E2)',
    side: 'red',
    magazine: 16,
    pk: 0.85,
    type: 'missile',
    group: 'Red — Medium SAM',
    note: 'Grave Stone / 50N6A cue · quad-packed · 5 m floor · best swarm depth',
  },
  {
    id: 'red-buk-m3',
    name: 'Buk-M3 (9R31M) SA-17',
    side: 'red',
    magazine: 6,
    pk: 0.80,
    type: 'missile',
    group: 'Red — Medium SAM',
    note: 'Snow Drift + 9S36 fire control · 70 km · mast-mounted low-altitude',
  },
  {
    id: 'red-buk-m1',
    name: 'Buk-M1 (9M38M1) SA-11',
    side: 'red',
    magazine: 4,
    pk: 0.75,
    type: 'missile',
    group: 'Red — Medium SAM',
    note: 'Snow Drift acquisition · Ukraine-confirmed MALE/OWA kills',
  },
  {
    id: 'red-kub',
    name: '2K12 Kub (3M9M3) SA-6',
    side: 'red',
    magazine: 3,
    pk: 0.65,
    type: 'missile',
    group: 'Red — Medium SAM',
    note: '1S91 Straight Flush TVM · 22 km · 4 km dead zone',
  },

  // ── SHORAD / point defence ────────────────────────────────────────────────
  {
    id: 'red-pantsir',
    name: 'Pantsir-S1 (57E6) SA-22',
    side: 'red',
    magazine: 28,
    pk: 0.70,
    type: 'cannon',
    group: 'Red — SHORAD / point defence',
    note: '2RL80 + Shlem cue · 12 missiles + 2×30 mm guns · S-400 inner layer',
  },
  {
    id: 'red-tor-m2',
    name: 'Tor-M2 (9M338K) SA-15',
    side: 'red',
    magazine: 16,
    pk: 0.75,
    type: 'missile',
    group: 'Red — SHORAD / point defence',
    note: 'Integrated 9S20 cue · strong vs PGM/drones · 16-round magazine',
  },
  {
    id: 'red-tunguska',
    name: 'Tunguska-M1 (9M311) SA-19',
    side: 'red',
    magazine: 35,
    pk: 0.65,
    type: 'cannon',
    group: 'Red — SHORAD / point defence',
    note: '1RL144 Hot Shot cue · 8 missiles + 2×30 mm · FPV gun envelope',
  },
  {
    id: 'red-osa',
    name: '9K33 Osa (9M33) SA-8',
    side: 'red',
    magazine: 6,
    pk: 0.70,
    type: 'missile',
    group: 'Red — SHORAD / point defence',
    note: '9S80 Land Roll cue · self-contained TELAR · IR backup in ECM',
  },
  {
    id: 'red-strela10',
    name: 'Strela-10 (9M37M) SA-13',
    side: 'red',
    magazine: 4,
    pk: 0.60,
    type: 'missile',
    group: 'Red — SHORAD / point defence',
    note: '9S86 Flat Box-A cue · passive IR · emissions-silent engagement',
  },
  {
    id: 'red-hq-17',
    name: 'HQ-17 (FM-2000) Tor-derivative',
    side: 'red',
    magazine: 8,
    pk: 0.75,
    type: 'missile',
    group: 'Red — SHORAD / point defence',
    note: 'Chinese Tor-class SHORAD · 15 km · export/proxy ORBAT',
  },
  {
    id: 'red-manpads',
    name: 'MANPADS family (SA-7/14/16/18/24)',
    side: 'red',
    magazine: 1,
    pk: 0.55,
    type: 'missile',
    group: 'Red — SHORAD / point defence',
    note: 'Single-shot IR · no radar emissions · poor vs swarm saturation alone',
  },

  // ── EW / soft-kill ────────────────────────────────────────────────────────
  {
    id: 'red-krasukha-4',
    name: '1RL257 Krasukha-4',
    side: 'red',
    magazine: DEEP_MAGAZINE,
    pk: 0.45,
    type: 'rf',
    group: 'Red — EW / soft-kill',
    note: 'X/Ku-band broadband jam · 200+ km vs SATCOM/radar · FOC-blind',
  },
  {
    id: 'red-bukovel-ad',
    name: 'Bukovel-AD (Red profile)',
    side: 'red',
    magazine: 80,
    pk: 0.58,
    type: 'rf',
    group: 'Red — EW / soft-kill',
    note: 'GNSS jam + spoof to ~50 km · INEFFECTIVE vs fibre-optic FPV',
  },
]

export const SWARM_DEFEAT_GROUPS = [
  'Blue — Directed energy',
  'Blue — C-UAS / SHORAD',
  'Blue — Naval CIWS',
  'Blue — Theatre SAM / BMD',
  'Red — Long-range SAM / BMD',
  'Red — Medium SAM',
  'Red — SHORAD / point defence',
  'Red — EW / soft-kill',
] as const satisfies readonly SwarmDefeatGroup[]

export function getSwarmDefeatSystem(id: string): DefeatSystem {
  return SWARM_DEFEAT_SYSTEMS.find((s) => s.id === id) ?? SWARM_DEFEAT_SYSTEMS.find((s) => s.id === 'skynex')!
}
