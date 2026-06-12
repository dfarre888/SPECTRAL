/**
 * Spectrum Intelligence — seed capabilities (full catalogue)
 * -----------------------------------------------------------
 * Curated spectrum signatures. Frequencies in Hz, wavelengths in µm.
 * Band centres/ranges from published specs & open reporting.
 */

import { CATALOGUE_EXPANSION_CAPABILITIES } from '@/data/catalogue-expansion-caps';
import type { SpectrumCapability } from '@/lib/spectrum/types';

// helpers ---------------------------------------------------------------
let _n = 0;
const id = (pid: string) => `${pid}-cap-${++_n}`;

const MHz = (m: number) => m * 1e6;
const GHz = (g: number) => g * 1e9;

// common band builders
const ISM_24 = { lo: MHz(2400), hi: MHz(2483.5) };
const ISM_58 = { lo: MHz(5725), hi: MHz(5875) };
const B_433 = { lo: MHz(433.05), hi: MHz(434.79) };
const B_915 = { lo: MHz(902), hi: MHz(928) };
const B_900EU = { lo: MHz(863), hi: MHz(870) };
const CELL = { lo: MHz(700), hi: MHz(2700) };
const GNSS_L1 = { lo: MHz(1574.42), hi: MHz(1576.42) };
const GNSS_L2 = { lo: MHz(1226.6), hi: MHz(1228.6) };
const GNSS_L5 = { lo: MHz(1175.45), hi: MHz(1177.45) };
const GLON_G1 = { lo: MHz(1598), hi: MHz(1606) };
const BEIDOU_B1 = { lo: MHz(1560.098), hi: MHz(1562.098) };
const IRIDIUM = { lo: MHz(1616), hi: MHz(1626) };
const SAT_KU = { lo: GHz(12), hi: GHz(18) };
const SAT_KA = { lo: GHz(27), hi: GHz(40) };
const BAND_C = { lo: GHz(4), hi: GHz(8) };
const BAND_X = { lo: GHz(8), hi: GHz(12) };

function rf(
  pid: string,
  fn: SpectrumCapability['fn'],
  layer: SpectrumCapability['layer'],
  label: string,
  band: { lo: number; hi: number },
  extra: Partial<SpectrumCapability> = {}
): SpectrumCapability {
  return {
    id: id(pid),
    platform_id: pid,
    axis: layer === 'navigation' ? 'gnss' : 'rf',
    layer,
    fn,
    label,
    freq_low_hz: band.lo,
    freq_high_hz: band.hi,
    ...extra,
  };
}

function ir(
  pid: string,
  fn: SpectrumCapability['fn'],
  label: string,
  lo: number,
  hi: number,
  extra: Partial<SpectrumCapability> = {}
): SpectrumCapability {
  return {
    id: id(pid),
    platform_id: pid,
    axis: 'eo_ir',
    layer: 'eo_ir',
    fn,
    label,
    wavelength_low_um: lo,
    wavelength_high_um: hi,
    ...extra,
  };
}

export const CAPABILITIES: SpectrumCapability[] = [
  /* ===================== RED ===================== */

  // DJI Mavic 3
  rf('dji-mavic-3', 'control', 'comms', 'OcuSync C2 — 2.4 GHz', ISM_24, { range_km: 15 }),
  rf('dji-mavic-3', 'video', 'comms', 'OcuSync video — 5.8 GHz', ISM_58),
  rf('dji-mavic-3', 'navigation', 'navigation', 'GPS L1', GNSS_L1),
  rf('dji-mavic-3', 'navigation', 'navigation', 'GLONASS G1', GLON_G1),
  rf('dji-mavic-3', 'navigation', 'navigation', 'BeiDou B1', BEIDOU_B1),

  // Skydio X10D
  rf('skydio-x10d', 'control', 'comms', 'C2 link — 2.4 GHz', ISM_24, { range_km: 12 }),
  rf('skydio-x10d', 'video', 'comms', 'Video — 5.8 GHz', ISM_58),
  rf('skydio-x10d', 'navigation', 'navigation', 'GPS L1', GNSS_L1, { defeat_resistance: ['gnss_denied_capable'] }),
  ir('skydio-x10d', 'sensor', 'EO navigation camera', 0.4, 0.7, { note: 'Visual autonomy — can fly GPS-denied' }),

  // Analog FPV
  rf('fpv-analog-5800', 'control', 'comms', 'ELRS control — 2.4 GHz', ISM_24, { range_km: 5 }),
  rf('fpv-analog-5800', 'video', 'comms', 'Analog video — 5.8 GHz', ISM_58),

  // Fibre-Optic FPV — RF SILENT (intentionally no RF bands)
  ir('fpv-fibre-optic', 'sensor', 'EO camera (over fibre)', 0.4, 0.7, {
    defeat_resistance: ['rf_silent', 'gnss_denied_capable'],
    note: 'Control & video carried on fibre — zero RF emission, no GNSS dependency',
  }),

  // Autel EVO Max 4T (multi-band)
  rf('autel-evo-max-4t', 'control', 'comms', 'SkyLink — 900 MHz', B_915),
  rf('autel-evo-max-4t', 'control', 'comms', 'SkyLink — 2.4 GHz', ISM_24, { defeat_resistance: ['rf_jamming_med'] }),
  rf('autel-evo-max-4t', 'video', 'comms', 'SkyLink — 5.8 GHz', ISM_58),
  rf('autel-evo-max-4t', 'navigation', 'navigation', 'GPS L1', GNSS_L1),
  rf('autel-evo-max-4t', 'navigation', 'navigation', 'BeiDou B1', BEIDOU_B1),

  // Orlan-10
  rf('orlan-10', 'control', 'comms', 'Command link — UHF', { lo: MHz(860), hi: MHz(920) }, { range_km: 120 }),
  rf('orlan-10', 'video', 'comms', 'Video downlink — 2.4 GHz', ISM_24),
  rf('orlan-10', 'navigation', 'navigation', 'GLONASS G1', GLON_G1),
  rf('orlan-10', 'navigation', 'navigation', 'GPS L1', GNSS_L1),

  // Bayraktar TB2
  rf('bayraktar-tb2', 'datalink', 'comms', 'LOS datalink — C-band', BAND_C, { range_km: 150 }),
  rf('bayraktar-tb2', 'navigation', 'navigation', 'GPS L1', GNSS_L1),
  rf('bayraktar-tb2', 'navigation', 'navigation', 'GLONASS G1', GLON_G1),
  ir('bayraktar-tb2', 'sensor', 'EO/IR gimbal (MWIR)', 3.0, 5.0),
  ir('bayraktar-tb2', 'laser', 'Laser designator 1.06 µm', 1.06, 1.06, { layer: 'eo_ir' }),

  // Shahed-136 Gen 4 (current variant on the main record)
  rf('shahed-136', 'navigation', 'navigation', 'GNSS L1 (multi, CRPA)', GNSS_L1, { defeat_resistance: ['gnss_jamming_high', 'gnss_spoofing_high'], note: '8-element CRPA anti-jam' }),
  rf('shahed-136', 'navigation', 'navigation', 'GNSS L5', GNSS_L5, { defeat_resistance: ['gnss_jamming_high'] }),
  rf('shahed-136', 'datalink', 'comms', 'Cellular LTE (RTK corrections)', CELL, { defeat_resistance: ['rf_jamming_med'], note: 'RTK only within network coverage' }),
  ir('shahed-136', 'sensor', 'MWIR terminal-guidance camera', 3.0, 5.0, { defeat_resistance: ['gnss_denied_capable'], note: 'Jetson Orin edge-AI; strikes GNSS-denied' }),

  // Shahed-131
  rf('shahed-131', 'navigation', 'navigation', 'GNSS L1 + INS', GNSS_L1, { defeat_resistance: ['gnss_jamming_med'] }),
  rf('shahed-131', 'datalink', 'comms', 'Iridium SATCOM (L-band)', IRIDIUM, { note: 'Allows mid-flight path change on some variants' }),

  // Lancet-3
  rf('lancet-3', 'control', 'comms', 'Control link — 2.4 GHz', ISM_24, { range_km: 40 }),
  rf('lancet-3', 'video', 'comms', 'Video — 5.8 GHz', ISM_58),
  rf('lancet-3', 'navigation', 'navigation', 'GLONASS G1', GLON_G1),
  ir('lancet-3', 'sensor', 'EO terminal seeker', 0.4, 0.7),

  // Switchblade 300
  rf('switchblade-300', 'datalink', 'comms', 'Encrypted digital datalink — 2.4 GHz', ISM_24, { range_km: 10 }),
  rf('switchblade-300', 'navigation', 'navigation', 'GPS L1', GNSS_L1),
  ir('switchblade-300', 'sensor', 'EO/IR seeker', 0.7, 5.0),

  // Ababil-3
  rf('ababil-3', 'datalink', 'comms', 'LOS datalink — UHF/L', { lo: MHz(900), hi: MHz(1500) }, { range_km: 100 }),
  rf('ababil-3', 'navigation', 'navigation', 'GPS L1', GNSS_L1),
  ir('ababil-3', 'sensor', 'EO/IR payload', 3.0, 5.0),

  // CH-4 Rainbow (now fully seeded)
  rf('ch-4-rainbow', 'datalink', 'comms', 'Ku-band SATCOM (BLOS C2)', SAT_KU, { range_km: 3500, note: 'Beyond-line-of-sight control' }),
  rf('ch-4-rainbow', 'datalink', 'comms', 'C-band LOS datalink', BAND_C),
  rf('ch-4-rainbow', 'navigation', 'navigation', 'BeiDou B1', BEIDOU_B1),
  rf('ch-4-rainbow', 'navigation', 'navigation', 'GPS L1', GNSS_L1),
  rf('ch-4-rainbow', 'radar_emit', 'radar', 'SAR — X-band', BAND_X),
  ir('ch-4-rainbow', 'sensor', 'EO/IR turret (MWIR)', 3.0, 5.0),

  // MQ-9 Reaper — OSINT: Airforce Technology / GA-ASI (Assessed)
  rf('mq-9-reaper', 'datalink', 'comms', 'Ku-band SATCOM (primary C2)', SAT_KU, { range_km: 1850 }),
  rf('mq-9-reaper', 'datalink', 'comms', 'C-band LOS datalink (150 nm)', BAND_C, { range_km: 278, note: 'OSINT: ~150 nm LOS C2' }),
  rf('mq-9-reaper', 'control', 'comms', 'UHF/VHF radio relay', { lo: MHz(225), hi: MHz(400) }),
  rf('mq-9-reaper', 'navigation', 'navigation', 'GPS L1/L2 (military)', GNSS_L1),
  rf('mq-9-reaper', 'navigation', 'navigation', 'GPS L5', GNSS_L5),
  rf('mq-9-reaper', 'radar_emit', 'radar', 'Lynx SAR/GMTI — Ku-band', SAT_KU),
  rf('mq-9-reaper', 'sensor', 'comms', 'ASIP SIGINT payload (wideband)', { lo: MHz(500), hi: GHz(18) }, { note: 'OSINT: Northrop ASIP — passive SIGINT' }),
  rf('mq-9-reaper', 'sensor', 'comms', 'RDESS passive ESM', { lo: MHz(100), hi: GHz(6) }, { note: 'OSINT: Reaper Defense ESM — stand-off geo' }),
  ir('mq-9-reaper', 'sensor', 'MTS-B EO/IR (MWIR)', 3.0, 5.0),
  ir('mq-9-reaper', 'laser', 'Laser designator 1.06 µm', 1.06, 1.06, { layer: 'eo_ir' }),

  // Forpost-R
  rf('forpost-r', 'datalink', 'comms', 'LOS datalink — UHF/L (~1.4 GHz)', { lo: MHz(1350), hi: MHz(1450) }, { range_km: 250 }),
  rf('forpost-r', 'navigation', 'navigation', 'GPS L1', GNSS_L1),
  rf('forpost-r', 'navigation', 'navigation', 'GLONASS G1', GLON_G1),
  ir('forpost-r', 'sensor', 'GOES-540 EO/IR', 3.0, 5.0),

  // Hero-120
  rf('hero-120', 'control', 'comms', 'Encrypted LOS C2 — ~900 MHz', { lo: MHz(860), hi: MHz(920) }, { range_km: 40 }),
  rf('hero-120', 'navigation', 'navigation', 'GPS L1', GNSS_L1),
  ir('hero-120', 'sensor', 'EO/IR dual-mode terminal seeker', 0.7, 5.0),

  // Warmate
  rf('warmate', 'control', 'comms', 'Encrypted C2 — 900 MHz / 2.4 GHz', ISM_24, { range_km: 30 }),
  rf('warmate', 'navigation', 'navigation', 'GPS L1', GNSS_L1),
  ir('warmate', 'sensor', 'EO/IR terminal seeker', 0.7, 5.0),

  // Kargu-2
  rf('kargu-2', 'control', 'comms', 'C2 — 2.4 GHz', ISM_24, { range_km: 10 }),
  rf('kargu-2', 'video', 'comms', 'Video — 5.8 GHz', ISM_58),
  rf('kargu-2', 'navigation', 'navigation', 'GPS L1', GNSS_L1),
  ir('kargu-2', 'sensor', 'EO/IR AI terminal (10× zoom)', 0.4, 5.0, { defeat_resistance: ['gnss_denied_capable'] }),

  // IAI Harop
  rf('iai-harop', 'navigation', 'navigation', 'GPS L1 + INS', GNSS_L1, { range_km: 200 }),
  rf('iai-harop', 'datalink', 'comms', 'Encrypted relay datalink (man-in-loop)', BAND_C),
  rf('iai-harop', 'sensor', 'comms', 'Passive RF anti-radiation seeker', { lo: MHz(2000), hi: GHz(18) }, { note: 'Terminal AR homing — RF silent until lock' }),
  ir('iai-harop', 'sensor', 'EO/IR man-in-the-loop terminal', 3.0, 5.0),

  // Bayraktar TB3 — OSINT: Deagel (Assessed)
  rf('tb3', 'datalink', 'comms', 'Ku-band SATCOM + LOS', SAT_KU, { range_km: 6000 }),
  rf('tb3', 'datalink', 'comms', 'C-band LOS datalink', BAND_C),
  rf('tb3', 'navigation', 'navigation', 'GPS L1', GNSS_L1),
  rf('tb3', 'navigation', 'navigation', 'GLONASS G1', GLON_G1),
  ir('tb3', 'sensor', 'EO/IR gimbal (MWIR)', 3.0, 5.0),
  ir('tb3', 'laser', 'Laser designator 1.06 µm', 1.06, 1.06, { layer: 'eo_ir' }),

  // Wing Loong II
  rf('wing-loong-ii', 'datalink', 'comms', 'Ku/Ka-band SATCOM (BLOS)', SAT_KU, { range_km: 1000 }),
  rf('wing-loong-ii', 'datalink', 'comms', 'C-band LOS datalink', BAND_C),
  rf('wing-loong-ii', 'navigation', 'navigation', 'BeiDou B1', BEIDOU_B1),
  rf('wing-loong-ii', 'navigation', 'navigation', 'GPS L1', GNSS_L1),
  rf('wing-loong-ii', 'radar_emit', 'radar', 'SAR — X-band', BAND_X),
  ir('wing-loong-ii', 'sensor', 'EO/IR + laser designator', 3.0, 5.0),

  // Baykar Akinci
  rf('akinci', 'datalink', 'comms', 'Ku-band SATCOM', SAT_KU, { range_km: 6000 }),
  rf('akinci', 'navigation', 'navigation', 'GPS L1', GNSS_L1),
  rf('akinci', 'navigation', 'navigation', 'BeiDou B1', BEIDOU_B1),
  rf('akinci', 'radar_emit', 'radar', 'SAR/GMTI — X-band', BAND_X),
  ir('akinci', 'sensor', 'EO/IR (MWIR)', 3.0, 5.0),

  // GJ-11 Sharp Sword (low observability — minimal RF)
  rf('gj-11', 'navigation', 'navigation', 'GPS/BeiDou (transit)', GNSS_L1, { defeat_resistance: ['rf_silent'], note: 'Stealth UCAV — emissions minimised' }),
  ir('gj-11', 'sensor', 'Internal EO/IR (assessed)', 3.0, 5.0, { defeat_resistance: ['rf_silent'] }),

  // Phoenix Ghost — visual nav, RF silent in flight
  ir('phoenix-ghost', 'sensor', 'EO visual landmark navigation', 0.4, 0.7, {
    defeat_resistance: ['rf_silent', 'gnss_denied_capable'],
    note: 'OSINT: GPS-jamming resilient visual nav — no C2 in flight',
  }),

  /* ===================== BLUE ===================== */

  // DroneGun Tactical — RF + GNSS jammer
  rf('dronegun-tactical', 'jam_control', 'comms', 'Jam 433 MHz', B_433),
  rf('dronegun-tactical', 'jam_control', 'comms', 'Jam 915 MHz', B_915),
  rf('dronegun-tactical', 'jam_control', 'comms', 'Jam 2.4 GHz', ISM_24, { range_km: 2 }),
  rf('dronegun-tactical', 'jam_video', 'comms', 'Jam 5.8 GHz', ISM_58),
  rf('dronegun-tactical', 'jam_gnss', 'navigation', 'Jam GNSS L-band', { lo: MHz(1160), hi: MHz(1610) }),

  // DroneGun Mk4
  rf('dronegun-mk4', 'jam_control', 'comms', 'Jam 433 MHz', B_433),
  rf('dronegun-mk4', 'jam_control', 'comms', 'Jam 915 MHz', B_915),
  rf('dronegun-mk4', 'jam_control', 'comms', 'Jam 2.4 GHz', ISM_24, { range_km: 1 }),
  rf('dronegun-mk4', 'jam_video', 'comms', 'Jam 5.8 GHz', ISM_58),
  rf('dronegun-mk4', 'jam_gnss', 'navigation', 'Jam GNSS L-band', { lo: MHz(1160), hi: MHz(1610) }),

  // RfPatrol Mk2 — passive detect
  rf('rfpatrol-mk2', 'detect_rf', 'comms', 'Detect 433/915 MHz', { lo: MHz(400), hi: MHz(950) }),
  rf('rfpatrol-mk2', 'detect_rf', 'comms', 'Detect 2.4 GHz', ISM_24),
  rf('rfpatrol-mk2', 'detect_rf', 'comms', 'Detect 5.8 GHz', ISM_58),

  // DroneSentry — detect + defeat
  rf('dronesentry', 'detect_rf', 'comms', 'RfOne DF — 2.4 GHz', ISM_24),
  rf('dronesentry', 'detect_rf', 'comms', 'RfOne DF — 5.8 GHz', ISM_58),
  rf('dronesentry', 'detect_radar', 'radar', 'Detection radar — X-band', BAND_X),
  rf('dronesentry', 'jam_control', 'comms', 'DroneCannon — 2.4 GHz', ISM_24, { range_km: 5 }),
  rf('dronesentry', 'jam_video', 'comms', 'DroneCannon — 5.8 GHz', ISM_58),
  rf('dronesentry', 'jam_gnss', 'navigation', 'DroneCannon — GNSS', { lo: MHz(1160), hi: MHz(1610) }),
  ir('dronesentry', 'detect_eo_ir', 'DroneOpt EO/IR detect', 0.4, 5.0),

  // Epirus Leonidas — HPM (wideband)
  rf('epirus-leonidas', 'hpm', 'comms', 'HPM wideband electronics effect', { lo: GHz(0.3), hi: GHz(18) }, { range_km: 2, note: 'Attacks electronics directly — works vs RF-silent & swarms' }),

  // LOCUST — HEL
  ir('locust-lws', 'laser_defeat', 'High-energy laser effect', 1.0, 1.07, { range_km: 1, layer: 'eo_ir', note: 'Thermal kill of components' }),

  // Anduril Anvil — kinetic (no spectrum band; represented by sensor cue)
  rf('anduril-anvil', 'detect_radar', 'radar', 'Cue radar — X-band', BAND_X, { range_km: 5, note: 'Kinetic interceptor; engages on sensor track, not RF link' }),

  // Anduril Sentry — detect only
  rf('anduril-sentry', 'detect_radar', 'radar', 'Sentry radar — X-band', BAND_X, { range_km: 5 }),
  ir('anduril-sentry', 'detect_eo_ir', 'Sentry EO/IR', 0.4, 5.0),

  // Zhitel — comms/SATCOM/GNSS jammer
  rf('zhitel-r330zh', 'detect_rf', 'comms', 'Recon receiver 0.1–2 GHz', { lo: MHz(100), hi: GHz(2) }),
  rf('zhitel-r330zh', 'jam_gnss', 'navigation', 'Jam GPS L1', GNSS_L1, { range_km: 25 }),
  rf('zhitel-r330zh', 'jam_datalink', 'comms', 'Jam GSM/cellular', CELL),
  rf('zhitel-r330zh', 'jam_datalink', 'comms', 'Jam SATCOM (L)', IRIDIUM),

  // Krasukha-4 — broadband radar jammer
  rf('krasukha-4', 'jam_datalink', 'comms', 'Jam X-band radar', BAND_X, { range_km: 200 }),
  rf('krasukha-4', 'jam_datalink', 'comms', 'Jam Ku-band SATCOM', SAT_KU),

  // Bukovel-AD — anti-drone EW
  rf('bukovel-ad', 'jam_control', 'comms', 'Jam 2.4 GHz', ISM_24, { range_km: 50 }),
  rf('bukovel-ad', 'jam_video', 'comms', 'Jam 5.8 GHz', ISM_58),
  rf('bukovel-ad', 'jam_gnss', 'navigation', 'Jam GNSS', { lo: MHz(1160), hi: MHz(1610) }),

  // Rafael Drone Dome — integrated C-UAS
  rf('drone-dome', 'detect_rf', 'comms', 'RPS-42 MHR — S-band detect', { lo: GHz(2), hi: GHz(4) }, { range_km: 3.5 }),
  rf('drone-dome', 'detect_radar', 'radar', 'RPS-42 MHR radar track', { lo: GHz(2), hi: GHz(4) }),
  rf('drone-dome', 'jam_control', 'comms', 'C-band soft-kill jammer', BAND_C, { range_km: 3.5 }),
  rf('drone-dome', 'jam_gnss', 'navigation', 'GNSS denial', { lo: MHz(1160), hi: MHz(1610) }),
  ir('drone-dome', 'detect_eo_ir', 'EO/IR cueing', 0.4, 5.0),

  // Rheinmetall Skynex — 35 mm AHEAD + radar
  rf('skynex', 'detect_radar', 'radar', 'X/TN radar acquisition', BAND_X, { range_km: 4 }),
  ir('skynex', 'detect_eo_ir', 'EO/IR tracker', 0.4, 5.0, { note: 'Kinetic defeat — no RF jam' }),

  // Coyote Block 3 — RF seeker interceptor
  rf('coyote-block3', 'sensor', 'comms', 'Passive RF seeker (Group 1–3 UAS)', { lo: MHz(400), hi: GHz(6) }, { range_km: 15, note: 'Hunts RF emissions — limited vs RF-silent' }),
  rf('coyote-block3', 'datalink', 'comms', 'LOS C2 — UHF', { lo: MHz(225), hi: MHz(400) }),

  // Switchblade 600 — extended-range loitering munition
  rf('switchblade-600', 'datalink', 'comms', 'Encrypted digital datalink — 2.4 GHz', ISM_24, { range_km: 40 }),
  rf('switchblade-600', 'navigation', 'navigation', 'GPS L1', GNSS_L1),
  ir('switchblade-600', 'sensor', 'EO/IR anti-armour seeker', 0.7, 5.0),

  // FIM-92 Stinger — MANPADS (passive IR, not RF)
  ir('fim-92-stinger', 'detect_eo_ir', 'Passive IR seeker (UV + MWIR)', 3.0, 5.0, { range_km: 4.8, note: 'Kinetic — engages thermal signature, not datalink' }),

  // Rafael Iron Beam — HEL C-UAS
  ir('iron-beam', 'laser_defeat', '100 kW-class HEL effect', 1.0, 1.07, { range_km: 4, layer: 'eo_ir', note: 'OSINT: ~4 km vs Group 1–2 UAS' }),

  // UK DragonFire — HEL demonstrator
  ir('dragonfire', 'laser_defeat', '50 kW+ HEL effect', 1.0, 1.07, { range_km: 3, layer: 'eo_ir', note: 'OSINT: DSTL/RN demonstrator — assessed range' }),

  /* ===================== CATALOGUE EXPANSION (Tiers 1–5) ===================== */
  ...CATALOGUE_EXPANSION_CAPABILITIES,
];

/** Attach capabilities to platforms (used when seeding the in-memory store). */
export function capabilitiesFor(platformId: string): SpectrumCapability[] {
  return CAPABILITIES.filter((c) => c.platform_id === platformId);
}
