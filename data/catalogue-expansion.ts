/**
 * Catalogue expansion — Tiers 1–5 + Tier 3 promoted platforms
 * CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 *
 * Merged into seed-platforms.ts via CATALOGUE_EXPANSION_PLATFORMS export.
 */

import type { Platform } from '@/lib/spectrum/types';

type RedCat =
  | 'tactical ISR'
  | 'Loitering munition'
  | 'FPV'
  | 'MALE UCAV'
  | 'HALE ISR'
  | 'VTOL ISR'
  | 'Naval USV'
  | 'Interceptor UAS'
  | 'Combat hexacopter'
  | 'Tube-launched LM'
  | 'Carrier UAS'
  | 'Autonomous LM';

function red(
  id: string,
  name: string,
  category: RedCat,
  role: string,
  spec: {
    group: 1 | 2 | 3 | 4 | 5;
    origin: string;
    range_km: number;
    speed_kmh?: number;
    ceiling_m?: number;
    mass_kg?: number;
    warhead_kg?: number;
    year?: number;
    gnss?: 'high' | 'medium' | 'low' | 'none';
    defeat: string;
    intel: string;
    icon?: string;
    terminal_speed_kmh?: number;
    unit_cost_usd?: number;
    ioc_year?: number;
  },
): Platform {
  return {
    id,
    name,
    side: 'red',
    group: spec.group,
    origin: spec.origin,
    category,
    role,
    mass_kg: spec.mass_kg,
    range_km: spec.range_km,
    speed_kmh: spec.speed_kmh ?? 100,
    ceiling_m: spec.ceiling_m ?? 3000,
    warhead_kg: spec.warhead_kg,
    year_introduced: spec.year,
    propulsion: 'electric',
    guidance_type: 'OSINT assessed — see intel_note',
    defeat_note: spec.defeat,
    gnss_dependency: spec.gnss ?? 'medium',
    confidence: 'curated',
    icon: spec.icon ?? '▲',
    intel_note: spec.intel,
    terminal_speed_kmh: spec.terminal_speed_kmh,
    unit_cost_usd: spec.unit_cost_usd,
    ioc_year: spec.ioc_year,
  };
}

function blue(
  id: string,
  name: string,
  category: string,
  role: string,
  range_km: number,
  intel: string,
  icon = '⊞',
): Platform {
  return {
    id,
    name,
    side: 'blue',
    group: 1,
    origin: 'See intel_note',
    category,
    role,
    range_km,
    year_introduced: 2024,
    propulsion: 'N/A',
    guidance_type: 'N/A — effector system',
    defeat_note: 'Blue effector — see spectrum capabilities',
    gnss_dependency: 'none',
    confidence: 'curated',
    icon,
    intel_note: intel,
  };
}

/** Tier 3 — promoted from Supabase intel_update_2025 */
export const TIER3_PROMOTED: Platform[] = [
  red('uj-22-airborne', 'UJ-22 Airborne', 'Loitering munition', 'Long-range strike LM', {
    group: 3, origin: 'Ukraine (UkrJet)', range_km: 800, speed_kmh: 160, ceiling_m: 6000,
    mass_kg: 45, warhead_kg: 20, year: 2020, gnss: 'medium',
    defeat: 'RF jamming on C2 + GNSS spoof; kinetic intercept at range',
    intel: 'OSINT: SPECTRAL_INTEL_UPDATE_2025 — Assessed. UkrJet family long-range LM.',
  }),
  red('uj-26-bober', 'UJ-26 Bober / Beaver', 'Loitering munition', 'Kamikaze strike LM', {
    group: 3, origin: 'Ukraine (UkrJet)', range_km: 1000, speed_kmh: 180, ceiling_m: 5000,
    mass_kg: 50, warhead_kg: 20, year: 2023, gnss: 'medium',
    defeat: 'GNSS jam/spoof; RF link disruption; SHORAD kinetic',
    intel: 'OSINT: SPECTRAL_INTEL_UPDATE_2025 — Assessed. Documented Ukraine employment.',
  }),
  red('baba-yaga', 'Baba Yaga Hexacopter', 'Combat hexacopter', 'Night bombardment hex', {
    group: 1, origin: 'Ukraine (field-modified)', range_km: 60, speed_kmh: 60, ceiling_m: 500,
    mass_kg: 25, warhead_kg: 20, year: 2022, gnss: 'high',
    defeat: 'RF jamming 2.4 GHz; acoustic detection; shotgun/kinetic at close range',
    intel: 'OSINT: Confirmed Bakhmut/Avdiivka pattern — heavy lift night strikes.',
  }),
  red('vampire', 'Vampire Combat Drone', 'Combat hexacopter', 'Ground-attack hex', {
    group: 1, origin: 'Ukraine', range_km: 60, speed_kmh: 70, ceiling_m: 600,
    mass_kg: 30, warhead_kg: 15, year: 2023, gnss: 'high',
    defeat: 'RF jamming; kinetic at low altitude',
    intel: 'OSINT: Reported — Ukrainian indigenous attack hexacopter.',
  }),
  red('kazhan', 'Kazhan AI FPV Strike', 'FPV', 'AI-assisted FPV strike', {
    group: 1, origin: 'Ukraine', range_km: 15, speed_kmh: 90, ceiling_m: 400,
    mass_kg: 2, warhead_kg: 2, year: 2024, gnss: 'medium',
    defeat: 'RF jamming degraded vs AI terminal; kinetic preferred',
    intel: 'OSINT: Reported — AI targeting assist on FPV platform.',
  }),
  red('fpv-interceptor', 'FPV Interceptor UAS', 'Interceptor UAS', 'Kinetic ram intercept', {
    group: 1, origin: 'Ukraine / Multi-nation', range_km: 5, speed_kmh: 120, ceiling_m: 300,
    mass_kg: 1, year: 2024, gnss: 'low',
    defeat: 'EO seeker — RF jam ineffective; defeats other drones kinetically',
    intel: 'OSINT: Confirmed Jul 2024 Mi-8 intercept — interceptor role.',
  }),
  red('v2u', 'V2U Autonomous LM', 'Autonomous LM', 'GNSS-free autonomous strike', {
    group: 2, origin: 'Russia (assessed)', range_km: 30, speed_kmh: 60, ceiling_m: 1000,
    mass_kg: 8, warhead_kg: 3.5, year: 2025, gnss: 'none',
    defeat: 'RF jamming INEFFECTIVE — CV/LiDAR nav; kinetic or HPM required',
    intel: 'OSINT: Confirmed captured hardware Sumy Feb 2025 — GNSS-independent.',
  }),
  red('rotem-l', 'IAI Rotem L', 'Loitering munition', 'Man-portable LM', {
    group: 2, origin: 'Israel (IAI)', range_km: 10, speed_kmh: 80, ceiling_m: 500,
    mass_kg: 4, warhead_kg: 1, year: 2018, gnss: 'medium',
    defeat: 'RF jamming + GNSS; compact EO seeker',
    intel: 'OSINT: Confirmed IDF service — man-portable loitering munition.',
  }),
  red('alpagu', 'STM Alpagu', 'Tube-launched LM', 'Tube-launched tactical LM', {
    group: 1, origin: 'Turkey (STM)', range_km: 8, speed_kmh: 120, ceiling_m: 200,
    mass_kg: 2, warhead_kg: 0.5, year: 2020, gnss: 'medium',
    defeat: 'RF/GNSS jam; short-range kinetic',
    intel: 'OSINT: Confirmed — tube-launched from vehicle/shelter.',
  }),
  red('wing-loong-1', 'CAIG Wing Loong I', 'MALE UCAV', 'Export MALE strike', {
    group: 4, origin: 'China (AVIC)', range_km: 4000, speed_kmh: 280, ceiling_m: 5000,
    mass_kg: 1100, warhead_kg: 200, year: 2007, gnss: 'high',
    defeat: 'Ku-band SATCOM jam; long-range SAM; RF link disruption',
    intel: 'OSINT: Confirmed Libya/Yemen export employment.',
  }),
  red('ch-5-rainbow', 'CASC CH-5 Rainbow', 'MALE UCAV', 'Heavy strike MALE', {
    group: 4, origin: 'China (CASC)', range_km: 10000, speed_kmh: 300, ceiling_m: 9000,
    mass_kg: 3300, warhead_kg: 1000, year: 2016, gnss: 'high',
    defeat: 'SATCOM/SIGINT targeting of C2; long-range IADS',
    intel: 'OSINT: Confirmed PLA service — CH-4/5 family heavy strike.',
  }),
  red('tb-001', 'AVIC TB-001 Twin-Tailed Scorpion', 'MALE UCAV', 'Twin-boom MALE', {
    group: 4, origin: 'China (AVIC)', range_km: 6000, speed_kmh: 300, ceiling_m: 8000,
    mass_kg: 2800, warhead_kg: 400, year: 2020, gnss: 'high',
    defeat: 'Combat radius ~1500 km — not full ferry; SATCOM jam + IADS',
    intel: 'OSINT: Assessed Taiwan ADIZ probes — 6000 km ferry, combat envelope capped in Map Intel.',
  }),
  red('mq-1c-gray-eagle', 'MQ-1C Gray Eagle', 'MALE UCAV', 'US Army MALE strike', {
    group: 4, origin: 'USA (GA-ASI)', range_km: 400, speed_kmh: 280, ceiling_m: 8840,
    mass_kg: 1630, warhead_kg: 163, year: 2009, gnss: 'high',
    defeat: 'Ku SATCOM jam; SHORAD at low altitude; SIGINT on C2',
    intel: 'OSINT: Confirmed Iraq/Afghanistan — procurement ceased Apr 2025.',
  }),
  red('rq-7b-shadow', 'RQ-7B Shadow', 'tactical ISR', 'Brigade tactical ISR', {
    group: 3, origin: 'USA (Textron)', range_km: 109, speed_kmh: 200, ceiling_m: 4570,
    mass_kg: 186, year: 2002, gnss: 'high',
    defeat: 'UHF C2 jam; GPS spoof; kinetic at low altitude',
    intel: 'OSINT: Confirmed — retired US Army 2024, legacy reference platform.',
  }),
  red('mq-25-stingray', 'MQ-25 Stingray', 'Carrier UAS', 'Carrier-based tanker/ISR', {
    group: 4, origin: 'USA (Boeing)', range_km: 930, speed_kmh: 740, ceiling_m: 12500,
    mass_kg: 20000, year: 2026, gnss: 'high',
    defeat: 'Carrier EMCON; long-range intercept; not a land threat',
    intel: 'OSINT: Confirmed USN test 2026 — carrier UAS benchmark.',
  }),
];

/** Tier 1 — conflict-validated threats */
export const TIER1_CONFLICT: Platform[] = [
  red('zala-eleron-3sv', 'ZALA Eleron-3SV', 'tactical ISR', 'Tactical ISR', {
    group: 2, origin: 'Russia (ZALA)', range_km: 120, speed_kmh: 110, ceiling_m: 5000,
    mass_kg: 15, year: 2015, gnss: 'medium',
    defeat: 'UHF C2 jam; GNSS spoof; Bukovel-class EW confirmed captures',
    intel: 'OSINT: Oryx + Military Factory — documented Syria/Ukraine; complements Orlan-10.',
  }),
  red('supercam-s350', 'Supercam S350', 'tactical ISR', 'Tactical ISR', {
    group: 2, origin: 'Russia (UAV Production)', range_km: 100, speed_kmh: 90, ceiling_m: 4000,
    mass_kg: 12, year: 2018, gnss: 'medium',
    defeat: 'RF link jam; heavy Oryx loss record confirms fielding',
    intel: 'OSINT: Oryx — mass fielding; heavy documented losses.',
  }),
  red('supercam-s250', 'Supercam S250', 'tactical ISR', 'Light tactical ISR', {
    group: 2, origin: 'Russia (UAV Production)', range_km: 80, speed_kmh: 85, ceiling_m: 3500,
    mass_kg: 8, year: 2016, gnss: 'medium',
    defeat: 'RF/GNSS jam; smaller variant of S350 family',
    intel: 'OSINT: Oryx — S250/S350 family tactical ISR.',
  }),
  red('st-35-silent-thunder', 'Athlon-Avia ST-35 Silent Thunder', 'Loitering munition', 'Indigenous Ukraine LM', {
    group: 2, origin: 'Ukraine (Athlon-Avia)', range_km: 45, speed_kmh: 150, ceiling_m: 2000,
    mass_kg: 5, warhead_kg: 3, year: 2022, gnss: 'medium',
    defeat: 'RF jam + GNSS; acoustic signature at terminal',
    intel: 'OSINT: Military Factory — indigenous Ukraine loitering munition.',
  }),
  red('cdet-ram', 'CDET RAM', 'Loitering munition', 'Expendable strike', {
    group: 2, origin: 'Ukraine (CDET)', range_km: 30, speed_kmh: 120, ceiling_m: 1500,
    mass_kg: 4, warhead_kg: 2, year: 2020, gnss: 'medium',
    defeat: 'RF/GNSS jam; short-range SHORAD',
    intel: 'OSINT: Military Factory — Ukraine expendable strike UAV.',
  }),
  red('uj-32-lastivka', 'UKRJET UJ-32 Lastivka', 'Loitering munition', 'UkrJet LM', {
    group: 2, origin: 'Ukraine (UkrJet)', range_km: 400, speed_kmh: 140, ceiling_m: 3000,
    mass_kg: 30, warhead_kg: 10, year: 2021, gnss: 'medium',
    defeat: 'Pairs with UJ-22/26 — RF/GNSS defeat',
    intel: 'OSINT: Military Factory — UkrJet family LM.',
  }),
  red('gerbera-parody', 'Gerbera / Parody Decoy', 'Loitering munition', 'Decoy OWA saturation', {
    group: 3, origin: 'Russia (assessed)', range_km: 500, speed_kmh: 200, ceiling_m: 4000,
    mass_kg: 50, year: 2024, gnss: 'medium',
    defeat: 'DECOY — RF jammers engage cheaply; kinetic waste; instructor exchange-ratio lesson',
    intel: 'OSINT: Oryx — Russian decoy OWA swarm; different defeat problem than Shahed.',
  }),
  red('privet-82', 'Privet-82', 'Loitering munition', 'Russian field LM', {
    group: 2, origin: 'Russia (assessed)', range_km: 60, speed_kmh: 130, ceiling_m: 2000,
    mass_kg: 6, warhead_kg: 5, year: 2024, gnss: 'medium',
    defeat: 'RF/GNSS jam; reported field use',
    intel: 'OSINT: Reported — Russian field employment Ukraine.',
  }),
  red('molniya-2-fpv', 'Molniya-2 FPV', 'FPV', 'Fibre/RF FPV evolution', {
    group: 1, origin: 'Russia (assessed)', range_km: 10, speed_kmh: 150, ceiling_m: 300,
    mass_kg: 1, warhead_kg: 2, year: 2024, gnss: 'low',
    defeat: 'Fibre variant RF-immune; RF variant jammable on 2.4/5.8',
    intel: 'OSINT: Assessed — Russian FPV evolution; ODIN WEG when accessible.',
  }),
  red('shahed-129', 'HESA Shahed-129', 'MALE UCAV', 'Armed ISR MALE', {
    group: 4, origin: 'Iran (HESA)', range_km: 1700, speed_kmh: 150, ceiling_m: 7600,
    mass_kg: 450, warhead_kg: 40, year: 2012, gnss: 'high',
    defeat: 'Different kill chain to -136 — Sadid missile; SATCOM/C-band jam',
    intel: 'OSINT: Military Factory + GlobalSecurity — Sadid-1/345 missile armament.',
  }),
  red('shahed-149-gaza', 'HESA Shahed-149 Gaza', 'MALE UCAV', 'Reusable attack UCAV', {
    group: 4, origin: 'Iran (HESA)', range_km: 1000, speed_kmh: 200, ceiling_m: 6000,
    mass_kg: 350, warhead_kg: 30, year: 2019, gnss: 'high',
    defeat: 'Reusable UCAV — C2-dependent; SATCOM jam + kinetic',
    intel: 'OSINT: Military Factory — step between MALE and OWA.',
  }),
  red('mohajer-6', 'Qods Mohajer-6', 'MALE UCAV', 'ISTAR + strike', {
    group: 3, origin: 'Iran (Qods)', range_km: 200, speed_kmh: 200, ceiling_m: 5500,
    mass_kg: 600, warhead_kg: 40, year: 2017, gnss: 'high',
    defeat: 'Export workhorse — RF C2 jam; distinct from Ababil-3',
    intel: 'OSINT: Military Factory + ODIN WEG — documented export employment.',
  }),
  red('mohajer-mersad', 'Mohajer / Mersad Series', 'tactical ISR', 'Iranian ISR lineage', {
    group: 2, origin: 'Iran (Qods)', range_km: 150, speed_kmh: 180, ceiling_m: 4500,
    mass_kg: 80, year: 1981, gnss: 'medium',
    defeat: 'Legacy tactical ISR — RF jam + GNSS',
    intel: 'OSINT: Military Factory — Mohajer/Mersad family baseline.',
  }),
  red('qasef-1', 'HESA Qasef-1', 'Loitering munition', 'Pre-OWA LM', {
    group: 3, origin: 'Iran (HESA)', range_km: 150, speed_kmh: 200, ceiling_m: 3000,
    mass_kg: 30, warhead_kg: 30, year: 2015, gnss: 'medium',
    defeat: 'Predecessor to larger OWA doctrine — RF/GNSS defeat',
    intel: 'OSINT: Military Factory — Houthi/Qasef lineage predecessor.',
  }),
  red('arash-kian', 'DIO Arash / Kian', 'Loitering munition', 'Expendable strike', {
    group: 2, origin: 'Iran (DIO)', range_km: 100, speed_kmh: 250, ceiling_m: 4000,
    mass_kg: 20, warhead_kg: 15, year: 2019, gnss: 'medium',
    defeat: 'Iranian expendable LM — not covered by Harop/136',
    intel: 'OSINT: Military Factory — Arash/Kian expendable UCAV.',
  }),
  red('samad-2', 'Samad-2 OWA', 'Loitering munition', 'Long-range OWA', {
    group: 3, origin: 'Yemen/Houthi (assessed)', range_km: 1800, speed_kmh: 200, ceiling_m: 5000,
    mass_kg: 50, warhead_kg: 18, year: 2018, gnss: 'medium',
    defeat: 'Red Sea maritime profile — naval CIWS + RF jam on GNSS',
    intel: 'OSINT: Military Wiki — Samad family; Red Sea employment pattern.',
  }),
  red('shahed-238', 'Shahed-238 / Geran-3', 'Loitering munition', 'Jet-powered OWA', {
    group: 3, origin: 'Iran (HESA)', range_km: 2500, speed_kmh: 500, ceiling_m: 8000,
    mass_kg: 200, warhead_kg: 50, year: 2024, gnss: 'medium',
    defeat: 'Jet OWA — faster terminal; CRPA GNSS assessed; variant evolution tracked',
    intel: 'OSINT: OSMP variant tracking — jet-powered Geran-3 evolution.',
  }),
];

/** Tier 2 — encyclopedic */
export const TIER2_ENCYCLOPEDIC: Platform[] = [
  red('elbit-skystriker', 'Elbit Skystriker', 'Loitering munition', 'Harop-class LM', {
    group: 3, origin: 'Israel (Elbit)', range_km: 100, speed_kmh: 180, ceiling_m: 4000,
    mass_kg: 35, warhead_kg: 10, year: 2019, gnss: 'medium',
    defeat: 'Harop-class — RF/GNSS + EO terminal',
    intel: 'OSINT: Military Factory loitering index — Skystriker expendable LM.',
  }),
  red('iai-point-blank', 'IAI Point Blank', 'Loitering munition', 'Man-portable LM', {
    group: 1, origin: 'Israel (IAI)', range_km: 15, speed_kmh: 100, ceiling_m: 500,
    mass_kg: 3, warhead_kg: 0.5, year: 2023, gnss: 'medium',
    defeat: 'Man-portable — short range RF defeat',
    intel: 'OSINT: Military Factory — 2023 man-portable LM.',
  }),
  red('iai-green-dragon', 'IAI Green Dragon', 'Loitering munition', 'Low-cost LM family', {
    group: 2, origin: 'Israel (IAI)', range_km: 50, speed_kmh: 130, ceiling_m: 2000,
    mass_kg: 8, warhead_kg: 2, year: 2020, gnss: 'medium',
    defeat: 'Low-cost LM — RF/GNSS jam',
    intel: 'OSINT: Military Wiki — Green Dragon family.',
  }),
  red('rafael-spike-firefly', 'Rafael SPIKE Firefly', 'Loitering munition', 'Miniature tactical LM', {
    group: 1, origin: 'Israel (Rafael)', range_km: 1, speed_kmh: 60, ceiling_m: 200,
    mass_kg: 3, warhead_kg: 0.35, year: 2020, gnss: 'low',
    defeat: 'Very short range — soldier-portable; RF jam',
    intel: 'OSINT: Military Factory — miniature tactical LM.',
  }),
  red('uvision-hero-30', 'UVision Hero-30', 'Loitering munition', 'Hero family light', {
    group: 1, origin: 'Israel (UVision)', range_km: 10, speed_kmh: 100, ceiling_m: 500,
    mass_kg: 3, warhead_kg: 0.5, year: 2015, gnss: 'medium',
    defeat: 'Hero family gap-fill — RF/GNSS',
    intel: 'OSINT: Military Factory — Hero-30 vs existing Hero-120.',
  }),
  red('uvision-hero-70', 'UVision Hero-70', 'Loitering munition', 'Mid-size Hero', {
    group: 2, origin: 'Israel (UVision)', range_km: 40, speed_kmh: 120, ceiling_m: 1500,
    mass_kg: 7, warhead_kg: 1.2, year: 2018, gnss: 'medium',
    defeat: 'Mid-size Hero — RF/GNSS + EO',
    intel: 'OSINT: Military Factory — Hero-70 family member.',
  }),
  red('uvision-hero-900', 'UVision Hero-900', 'Loitering munition', 'Heavy attack Hero', {
    group: 3, origin: 'Israel (UVision)', range_km: 150, speed_kmh: 150, ceiling_m: 4000,
    mass_kg: 25, warhead_kg: 8, year: 2020, gnss: 'medium',
    defeat: 'Heavy Hero — RF/GNSS; longer range LM',
    intel: 'OSINT: Military Factory — Hero-900 heavy attack variant.',
  }),
  red('aeronautics-orbiter', 'Aeronautics Orbiter', 'tactical ISR', 'Export ISR / light strike', {
    group: 2, origin: 'Israel (Aeronautics)', range_km: 100, speed_kmh: 120, ceiling_m: 5000,
    mass_kg: 30, year: 2005, gnss: 'medium',
    defeat: 'Tactical ISR — RF C2 jam',
    intel: 'OSINT: Military Factory — Orbiter series export ISR.',
  }),
  red('casc-ch-901', 'CASC CH-901', 'Loitering munition', 'Expendable LM', {
    group: 2, origin: 'China (CASC)', range_km: 15, speed_kmh: 120, ceiling_m: 1000,
    mass_kg: 9, warhead_kg: 3, year: 2016, gnss: 'medium',
    defeat: 'Chinese expendable LM — RF/GNSS',
    intel: 'OSINT: Military Factory — CH-901 attack UAV.',
  }),
  red('northrop-jackal', 'Northrop Grumman Jackal', 'Loitering munition', '2024 expendable LM', {
    group: 2, origin: 'USA (Northrop)', range_km: 80, speed_kmh: 200, ceiling_m: 3000,
    mass_kg: 15, warhead_kg: 5, year: 2024, gnss: 'medium',
    defeat: 'New US expendable LM — RF/GNSS',
    intel: 'OSINT: Military Factory — 2024 Jackal LM.',
  }),
  red('ncsist-chien-hsiang', 'NCSIST Chien Hsiang', 'Loitering munition', 'Rising Sword LM', {
    group: 3, origin: 'Taiwan (NCSIST)', range_km: 1000, speed_kmh: 250, ceiling_m: 5000,
    mass_kg: 50, warhead_kg: 20, year: 2024, gnss: 'medium',
    defeat: 'Taiwan 2024 LM — RF/GNSS + long range',
    intel: 'OSINT: Military Wiki — Chien Hsiang / Rising Sword.',
  }),
  red('lentatek-kargi', 'Lentatek Kargi', 'Loitering munition', 'Turkish LM', {
    group: 2, origin: 'Turkey (Lentatek)', range_km: 15, speed_kmh: 130, ceiling_m: 1000,
    mass_kg: 5, warhead_kg: 1, year: 2020, gnss: 'medium',
    defeat: 'Distinct from STM Kargu-2 — RF/GNSS',
    intel: 'OSINT: Military Factory — Lentatek Kargi LM.',
  }),
  red('bayraktar-kizilelma', 'Bayraktar Kizilelma', 'MALE UCAV', 'Jet UCAV / MUM-T', {
    group: 4, origin: 'Turkey (Baykar)', range_km: 900, speed_kmh: 900, ceiling_m: 12000,
    mass_kg: 5500, warhead_kg: 1500, year: 2023, gnss: 'high',
    defeat: 'Jet UCAV — AESA radar assessed; SATCOM/C-band jam',
    intel: 'OSINT: Military Factory — MUM-T path; carrier-capable UCAV.',
  }),
  red('tai-anka', 'TAI Anka', 'MALE UCAV', 'Turkish MALE', {
    group: 4, origin: 'Turkey (TAI)', range_km: 200, speed_kmh: 220, ceiling_m: 9000,
    mass_kg: 1700, warhead_kg: 200, year: 2013, gnss: 'high',
    defeat: 'Idlib/Libya doctrine reference — RF/SIGINT',
    intel: 'OSINT: Military Factory — Anka MALE; not previously in catalogue.',
  }),
  red('avic-nine-sky', 'AVIC Nine Sky (SS-UAV)', 'MALE UCAV', 'Heavy recon-strike MALE', {
    group: 4, origin: 'China (AVIC)', range_km: 7000, speed_kmh: 350, ceiling_m: 10000,
    mass_kg: 4000, warhead_kg: 500, year: 2024, gnss: 'high',
    defeat: '2024 heavy MALE — SATCOM jam + IADS',
    intel: 'OSINT: Military Factory — 2024 Nine Sky SS-UAV.',
  }),
  red('ga-xq-67a-obss', 'GA XQ-67A OBSS', 'MALE UCAV', 'CCA loyal wingman', {
    group: 4, origin: 'USA (GA-ASI)', range_km: 3000, speed_kmh: 800, ceiling_m: 12000,
    mass_kg: 2500, year: 2024, gnss: 'high',
    defeat: 'CCA demonstrator — low-observable assessed; datalink jam',
    intel: 'OSINT: Military Factory — OBSS loyal wingman demonstrator.',
  }),
  red('ga-mq-20-avenger', 'GA MQ-20 Avenger', 'MALE UCAV', 'Jet MALE baseline', {
    group: 4, origin: 'USA (GA-ASI)', range_km: 2900, speed_kmh: 740, ceiling_m: 15000,
    mass_kg: 8000, warhead_kg: 1360, year: 2009, gnss: 'high',
    defeat: 'Jet MALE — SATCOM/SIGINT on C2',
    intel: 'OSINT: Military Factory — Predator C / Avenger jet MALE.',
  }),
  red('rq-4-global-hawk', 'RQ-4 Global Hawk', 'HALE ISR', 'HALE ISR benchmark', {
    group: 5, origin: 'USA (Northrop)', range_km: 22780, speed_kmh: 650, ceiling_m: 18000,
    mass_kg: 14600, year: 2001, gnss: 'high',
    defeat: 'HALE — SATCOM BLOS; strategic SIGINT target',
    intel: 'OSINT: Military Factory — HALE ISR benchmark platform.',
  }),
  red('mq-1-predator', 'MQ-1 Predator', 'MALE UCAV', 'Legacy MALE reference', {
    group: 4, origin: 'USA (GA-ASI)', range_km: 1100, speed_kmh: 217, ceiling_m: 7620,
    mass_kg: 1020, warhead_kg: 204, year: 1995, gnss: 'high',
    defeat: 'Legacy MALE — C-band LOS + SATCOM',
    intel: 'OSINT: Military Factory — legacy MALE reference; retired.',
  }),
  red('schiebel-camcopter-s100', 'Schiebel Camcopter S-100', 'VTOL ISR', 'Naval/land VTOL ISR', {
    group: 2, origin: 'Austria (Schiebel)', range_km: 200, speed_kmh: 220, ceiling_m: 5500,
    mass_kg: 110, year: 2006, gnss: 'high',
    defeat: 'VTOL ISR — RF C2 jam; naval deck employment',
    intel: 'OSINT: Military Factory — Camcopter S-100 naval/land.',
  }),
  red('ncsist-cardinal', 'NCSIST Cardinal', 'tactical ISR', 'SUAS ISR', {
    group: 1, origin: 'Taiwan (NCSIST)', range_km: 15, speed_kmh: 80, ceiling_m: 1000,
    mass_kg: 2, year: 2020, gnss: 'medium',
    defeat: 'Small SUAS — RF jam',
    intel: 'OSINT: Military Factory — Cardinal series ISR.',
  }),
];

/** Tier 5 — maritime */
export const TIER5_MARITIME: Platform[] = [
  red('magura-v5', 'Magura V5 USV', 'Naval USV', 'Ukrainian USV strike', {
    group: 2, origin: 'Ukraine', range_km: 800, speed_kmh: 75, ceiling_m: 0,
    mass_kg: 1000, warhead_kg: 300, year: 2023, gnss: 'high',
    defeat: 'USV — naval radar + CIWS; RF jam on C2; mine/cannon kinetic',
    intel: 'OSINT: Assessed — Black Sea Magura V5 USV strike doctrine.',
  }),
  red('houthi-owa-maritime', 'Houthi OWA-UAV (Maritime)', 'Loitering munition', 'Anti-ship OWA profile', {
    group: 3, origin: 'Yemen/Houthi', range_km: 1800, speed_kmh: 200, ceiling_m: 5000,
    mass_kg: 50, warhead_kg: 18, year: 2023, gnss: 'medium',
    defeat: 'Red Sea HVU lesson — naval CIWS + Goalkeeper/SeaRAM; GNSS jam',
    intel: 'OSINT: Assessed — Red Sea anti-ship OWA employment 2023–2026.',
  }),
  red('black-sea-usv-swarm', 'Black Sea Baby Drone Boats', 'Naval USV', 'USV swarm doctrine', {
    group: 1, origin: 'Ukraine/Russia (assessed)', range_km: 50, speed_kmh: 60, ceiling_m: 0,
    mass_kg: 200, warhead_kg: 50, year: 2024, gnss: 'medium',
    defeat: 'Swarm USV — CIWS saturation; RF jam on mesh C2',
    intel: 'OSINT: Assessed — Black Sea baby drone boat swarm doctrine.',
  }),
];

/** Tier 3 blue defeat systems + Tier 4 naval/SHORAD */
export const TIER_BLUE_EXPANSION: Platform[] = [
  blue('lite-beam', 'Rafael Lite Beam', 'High-Energy Laser', 'Vehicle HEL C-UAS', 2,
    'OSINT: SPECTRAL_INTEL_UPDATE_2025 — Rafael vehicle laser DEW.'),
  blue('pulsar-l', 'Anduril Pulsar-L', 'RF Jammer', 'Man-portable RF defeat', 5,
    'OSINT: JCO 5th demo — man-portable wideband RF jammer.'),
  blue('pulsar-v', 'Anduril Pulsar-V', 'RF Jammer', 'Vehicle RF defeat', 8,
    'OSINT: JCO 5th demo — vehicle-mounted RF jammer.'),
  blue('dronesentry-sentrycs', 'DroneSentry + Sentrycs', 'Integrated C-UAS', 'Detect + RF + cyber', 4,
    'OSINT: Avalon 2025 — DroneShield integrated detect/defeat.'),
  blue('jco-swarm-kit', 'JCO Swarm Kit', 'Integrated C-UAS', 'Multi-vendor swarm defeat', 10,
    'OSINT: Yuma PG Jun 2024 — JCO multi-vendor swarm kit.'),
  blue('goalkeeper-ciws', 'Goalkeeper CIWS', 'Naval CIWS', '30 mm naval AAA', 1.5,
    'OSINT: WeaponSystems.net — Goalkeeper 30 mm CIWS; 1.5 km assessed.'),
  blue('searam', 'SeaRAM', 'Naval CIWS', 'RIM-116 + CIWS mount', 9,
    'OSINT: WeaponSystems.net + NavWeaps — SeaRAM ~9 km envelope.'),
  blue('millennium-35mm', '35 mm Millennium', 'Naval CIWS', 'Naval AAA', 3.5,
    'OSINT: WeaponSystems.net — Oto Melara Millennium 35 mm.'),
  blue('dardo-fast-forty', 'Dardo / Fast Forty', 'Naval CIWS', 'Naval point defence', 4,
    'OSINT: WeaponSystems.net — Dardo/Fast Forty naval PD.'),
  blue('starstreak-hvm', 'Starstreak HVM', 'SHORAD', 'Mach 3 kinetic vehicle', 7,
    'OSINT: WeaponSystems.net — Starstreak HVM vehicle mount.'),
  blue('hq-17', 'HQ-17', 'SHORAD', 'Chinese Tor-derivative', 15,
    'OSINT: WeaponSystems.net — HQ-17 SHORAD assessed range.'),
  blue('eos-slinger', 'EOS Slinger', 'Gun C-UAS', 'Gun-based C-UAS', 2,
    'OSINT: Military-Today class — EOS Slinger gun C-UAS.'),
  blue('smash-hopper', 'Smart Shooter SMASH Hopper', 'Kinetic C-UAS', 'Kinetic interceptor', 0.8,
    'OSINT: Export C-UAS — SMASH Hopper kinetic defeat.'),
  blue('phalanx-ciws', 'Phalanx CIWS', 'Naval CIWS', '20 mm last-ditch CIWS', 3.6,
    'OSINT: WeaponSystems.net — Phalanx Mk 15; C-RAM land variant.'),
];

export const CATALOGUE_EXPANSION_PLATFORMS: Platform[] = [
  ...TIER3_PROMOTED,
  ...TIER1_CONFLICT,
  ...TIER2_ENCYCLOPEDIC,
  ...TIER5_MARITIME,
  ...TIER_BLUE_EXPANSION,
];
