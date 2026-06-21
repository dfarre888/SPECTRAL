// SPECTRAL — EW Jamming Radius Calculator
// CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
//
// Jamming range modelled using simplified Friis transmission + J/S ratio.
// All ERP values sourced from OSINT (Jane's, GlobalSecurity, manufacturer specs).
//
// Friis free-space path loss: FSPL(dB) = 20·log10(d) + 20·log10(f) + 20·log10(4π/c)
// Effective jamming range: R_jam = 10^((ERP_dBm - Sensitivity_dBm - FSPL_const) / 20)
//
// Simplified for training UI: range = K_freq × sqrt(ERP_W)
// where K_freq accounts for wavelength and receiver sensitivity tier.

import type { JammingRadii, JammingFrequencyBand, JammerClass } from './types'

// ─── Frequency Band Definitions ───────────────────────────────────────────────

export const EW_BANDS: Record<string, JammingFrequencyBand> = {
  gps_l1:   { label:'GPS L1',    freq_mhz_low: 1565, freq_mhz_high: 1585, primary_target:'GNSS navigation (GPS)' },
  gps_l2:   { label:'GPS L2',    freq_mhz_low: 1215, freq_mhz_high: 1240, primary_target:'Dual-freq GPS receivers' },
  glonass:  { label:'GLONASS L1',freq_mhz_low: 1590, freq_mhz_high: 1610, primary_target:'GNSS navigation (GLONASS)' },
  beidou:   { label:'BeiDou B1', freq_mhz_low: 1556, freq_mhz_high: 1564, primary_target:'GNSS navigation (BeiDou)' },
  navic_l5: { label:'NavIC L5',  freq_mhz_low: 1164, freq_mhz_high: 1189, primary_target:'NavIC L5 band (India GNSS)' },
  navic_s:  { label:'NavIC S',   freq_mhz_low: 2483, freq_mhz_high: 2500, primary_target:'NavIC S-band (India GNSS)' },
  rc_900:   { label:'900 MHz RC',freq_mhz_low: 863,  freq_mhz_high: 928,  primary_target:'RC control link (sub-1GHz)' },
  rc_2400:  { label:'2.4 GHz RC',freq_mhz_low: 2400, freq_mhz_high: 2483, primary_target:'RC / video link (WiFi band)' },
  rc_5800:  { label:'5.8 GHz RC',freq_mhz_low: 5725, freq_mhz_high: 5875, primary_target:'FPV video / long-range RC' },
  lband_data:{ label:'L-band Data',freq_mhz_low:1030,freq_mhz_high:1090, primary_target:'ADS-B / SSR / SATCOM' },
}

// ─── Range Model ──────────────────────────────────────────────────────────────
// Simplified: R_jam(m) = K_band × sqrt(ERP_watts)
// K_band derived from:
//   FSPL at 1 km for each freq — back-solved against receiver sensitivity (-130 dBm GNSS, -100 dBm RC)

const BAND_K: Record<string, number> = {
  gps_l1:    18_500,  // GPS receiver very sensitive (~-130 dBm) → long jamming range
  gps_l2:    19_200,
  glonass:   18_000,
  beidou:    18_000,
  navic_l5:  19_500,  // L5 co-band with GPS L5 — similar sensitivity
  navic_s:   9_000,   // S-band 2.5 GHz — higher free-space loss
  rc_900:    5_200,   // RC receivers less sensitive, shorter range
  rc_2400:   3_800,
  rc_5800:   2_100,
  lband_data:12_000,
}

/** Compute jamming radius in metres for a given band and ERP */
function jammingRange(band_id: string, erp_watts: number): number {
  const k = BAND_K[band_id] ?? 5_000
  return Math.round(k * Math.sqrt(erp_watts))
}

// ─── Jammer Database ──────────────────────────────────────────────────────────

function makeJammer(
  jammer_id: string,
  jammer_name: string,
  jammer_class: JammerClass,
  erp_watts: number,
  band_ids: string[],
  terrain_factor: 'LOS_only' | 'extended',
  notes: string,
): JammingRadii {
  const bands = band_ids.map(id => EW_BANDS[id]).filter(Boolean)
  const radius_by_band: Record<string, number> = {}
  let max_radius_m = 0

  for (const bid of band_ids) {
    const r = jammingRange(bid, erp_watts)
    radius_by_band[bid] = r
    if (r > max_radius_m) max_radius_m = r
  }

  return {
    jammer_id,
    jammer_name,
    jammer_class,
    erp_watts,
    bands,
    radius_by_band,
    gps_l1_radius_m:  radius_by_band['gps_l1']  ?? 0,
    rc_link_radius_m: radius_by_band['rc_2400'] ?? radius_by_band['rc_900'] ?? 0,
    max_radius_m,
    terrain_factor,
    notes,
  }
}

export const JAMMER_DB: JammingRadii[] = [
  // ── Manpack / Handheld ───────────────────────────────────────────────────
  makeJammer('dronegun-tactical','DroneShield DroneGun Tactical','manpack',5,
    ['rc_2400','rc_5800','gps_l1'],'LOS_only',
    'DroneShield COTS C-UAS jammer. 5W ERP per band. Shoulder-fired. Effective vs off-the-shelf FPV/DJI.'),
  makeJammer('rf-patrol','DroneShield RfPatrol (jammer mode)','manpack',2,
    ['rc_2400','rc_5800','gps_l1'],'LOS_only',
    'RfPatrol in active countermeasure mode. Lower ERP than DroneGun — detect-and-jam at shorter range.'),
  makeJammer('djijammer-mini','Generic DJI Band Jammer','manpack',3,
    ['rc_2400','rc_5800','gps_l1'],'LOS_only',
    'Commercial DJI-frequency jammer — not military grade. Limited frequency agility.'),
  makeJammer('manpack-gnss-spoofer','GNSS Spoofer (Manpack)','manpack',1,
    ['gps_l1','gps_l2','glonass'],'LOS_only',
    'Low-power GPS/GLONASS spoofer — navigation deception rather than denial. Shorter effective range.'),

  // ── Vehicle-mounted ────────────────────────────────────────────────────
  makeJammer('military-ew-generic','Military EW Suite (Vehicle, Generic)','vehicle',200,
    ['rc_900','rc_2400','rc_5800','gps_l1','gps_l2','glonass','beidou'],'extended',
    'Generic vehicle-mounted military EW. 200W class. Covers all UAS RF bands. Based on Krasukha-type operational data.'),
  makeJammer('leer-3-jammer','Leer-3 / Orlan-10 EW Relay','vehicle',150,
    ['rc_2400','rc_5800','gps_l1','rc_900'],'LOS_only',
    'Orlan-10 as airborne EW relay for vehicle jammer. Extends jammer footprint via elevated platform. OSINT-confirmed Ukraine use.'),
  makeJammer('coyote-defeat-rf','Coyote Block 3 RF Defeat (Active)','vehicle',50,
    ['rc_2400','rc_5800','gps_l1'],'LOS_only',
    'Coyote Block 3 in active RF defeat mode. Intercept + jamming combined. US Army LIDS programme.'),
  makeJammer('shovel-ew-ru','Zhitel / R-330Zh EW Station','vehicle',500,
    ['gps_l1','gps_l2','glonass','rc_900','lband_data'],'extended',
    'Russian R-330Zh GNSS/UHF/L-band jammer. Confirmed use Ukraine 2022-2025. High ERP — aviation GPS affected.'),
  makeJammer('p18-counter-uav-ru','Repellent-1 GNSS Jammer (Russia)','vehicle',300,
    ['gps_l1','gps_l2','glonass','beidou'],'extended',
    'Russian Repellent-1 — dedicated GNSS jammer complex. 300W class. Covers GPS+GLONASS+BeiDou simultaneously.'),

  // ── Fixed Static ────────────────────────────────────────────────────────
  makeJammer('fixed-gnss-station','Fixed GNSS Jamming Station (Class)','fixed_static',2000,
    ['gps_l1','gps_l2','glonass','beidou','navic_l5'],'extended',
    'Fixed installation high-power GNSS jamming. 2kW class — effects extend 300+ km. Eastern Med jamming zone type.'),
  makeJammer('kaliningrad-ew','Kaliningrad EW Complex (Krasuha-4 type)','fixed_static',5000,
    ['gps_l1','gps_l2','glonass','lband_data'],'extended',
    'Large fixed EW complex — modelled on OSINT Krasuha-4. 5kW ERP. Black Sea / Baltic GPS denial zone.'),

  // ── Airborne ────────────────────────────────────────────────────────────
  makeJammer('airborne-pod-ew','Generic Airborne EW Pod (F/A-18 / Growler class)','airborne_pod',1000,
    ['gps_l1','gps_l2','glonass','rc_2400','lband_data'],'extended',
    'EA-18G Growler / Typhoon SPEAR class airborne EW pod. 1kW ERP. Covers wide frequency range.'),

  // ── UAS-carried ────────────────────────────────────────────────────────
  makeJammer('uas-mini-jammer','UAS-carried Mini-Jammer (Orlan-10 payload)','uas_carried',20,
    ['gps_l1','rc_2400','rc_5800'],'LOS_only',
    'Small jammer payload on ISR UAS. 20W class — Orlan-10 documented EW relay role. Elevates effective jamming horizon.'),
]

/** Lookup jammer by id */
export function getJammer(jammer_id: string): JammingRadii | null {
  return JAMMER_DB.find(j => j.jammer_id === jammer_id) ?? null
}

/** Build ring data for Cesium overlay from a JammingRadii record */
export function buildJammingRings(jammer: JammingRadii): {
  gps_ring_m: number
  rc_ring_m: number
  max_ring_m: number
} {
  return {
    gps_ring_m: jammer.gps_l1_radius_m,
    rc_ring_m:  jammer.rc_link_radius_m,
    max_ring_m: jammer.max_radius_m,
  }
}
