/**
 * Reusable spectrum capability templates for catalogue expansion.
 * CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */

import type { SpectrumCapability } from '@/lib/spectrum/types';

let _seq = 9000;
const capId = (pid: string) => `${pid}-cap-${++_seq}`;

const MHz = (m: number) => m * 1e6;
const GHz = (g: number) => g * 1e9;

export const BANDS = {
  ISM_24: { lo: MHz(2400), hi: MHz(2483.5) },
  ISM_58: { lo: MHz(5725), hi: MHz(5875) },
  UHF: { lo: MHz(860), hi: MHz(920) },
  GNSS_L1: { lo: MHz(1574.42), hi: MHz(1576.42) },
  GNSS_L2: { lo: MHz(1226.6), hi: MHz(1228.6) },
  GNSS_L5: { lo: MHz(1175.45), hi: MHz(1177.45) },
  GLON_G1: { lo: MHz(1598), hi: MHz(1606) },
  BEIDOU_B1: { lo: MHz(1560.098), hi: MHz(1562.098) },
  BAND_C: { lo: GHz(4), hi: GHz(8) },
  BAND_X: { lo: GHz(8), hi: GHz(12) },
  SAT_KU: { lo: GHz(12), hi: GHz(18) },
  GNSS_WIDE: { lo: MHz(1160), hi: MHz(1610) },
};

function rf(
  pid: string,
  fn: SpectrumCapability['fn'],
  layer: SpectrumCapability['layer'],
  label: string,
  band: { lo: number; hi: number },
  extra: Partial<SpectrumCapability> = {},
): SpectrumCapability {
  return {
    id: capId(pid),
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
  extra: Partial<SpectrumCapability> = {},
): SpectrumCapability {
  return {
    id: capId(pid),
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

/** Tactical ISR — UHF C2 + 2.4 video + GNSS */
export function capsTacticalIsr(pid: string, rangeKm: number): SpectrumCapability[] {
  return [
    rf(pid, 'control', 'comms', 'Command link — UHF', BANDS.UHF, { range_km: rangeKm }),
    rf(pid, 'video', 'comms', 'Video downlink — 2.4 GHz', BANDS.ISM_24),
    rf(pid, 'navigation', 'navigation', 'GPS L1', BANDS.GNSS_L1),
    ir(pid, 'sensor', 'EO ISR payload', 0.4, 0.9),
  ];
}

/** Loitering munition — datalink + GNSS + EO seeker */
export function capsLoiteringMunition(
  pid: string,
  rangeKm: number,
  opts?: { gnssIndependent?: boolean; rfSilent?: boolean },
): SpectrumCapability[] {
  if (opts?.rfSilent) {
    return [
      ir(pid, 'sensor', 'EO terminal seeker', 0.4, 0.9, {
        defeat_resistance: ['rf_silent', 'gnss_denied_capable'],
        note: 'Pre-programmed / autonomous terminal — minimal RF in cruise',
      }),
    ];
  }
  const caps: SpectrumCapability[] = [
    rf(pid, 'datalink', 'comms', 'C2 datalink — 2.4 GHz', BANDS.ISM_24, { range_km: rangeKm }),
    ir(pid, 'sensor', 'EO/IIR seeker', 0.7, 5.0),
  ];
  if (!opts?.gnssIndependent) {
    caps.push(rf(pid, 'navigation', 'navigation', 'GPS L1', BANDS.GNSS_L1));
  }
  return caps;
}

/** MALE UCAV — C-band LOS + GNSS + EO/IR */
export function capsMaleUcav(pid: string, rangeKm: number): SpectrumCapability[] {
  return [
    rf(pid, 'datalink', 'comms', 'LOS datalink — C-band', BANDS.BAND_C, { range_km: rangeKm }),
    rf(pid, 'navigation', 'navigation', 'GPS L1', BANDS.GNSS_L1),
    rf(pid, 'navigation', 'navigation', 'BeiDou B1', BANDS.BEIDOU_B1),
    ir(pid, 'sensor', 'EO/IR gimbal (MWIR)', 3.0, 5.0),
  ];
}

/** OWA one-way attack — GNSS + INS cruise, MWIR terminal */
export function capsOwaAttack(pid: string, rangeKm: number): SpectrumCapability[] {
  return [
    rf(pid, 'navigation', 'navigation', 'GPS L1', BANDS.GNSS_L1, { defeat_resistance: ['gnss_jamming_med'] }),
    rf(pid, 'navigation', 'navigation', 'GLONASS G1', BANDS.GLON_G1),
    ir(pid, 'sensor', 'MWIR terminal seeker', 3.0, 5.0, { note: 'Terminal phase only — cruise is RF-quiet' }),
  ];
}

/** FPV strike — 2.4 control + 5.8 video */
export function capsFpv(pid: string, rangeKm: number, fibre = false): SpectrumCapability[] {
  if (fibre) {
    return [
      ir(pid, 'sensor', 'EO camera (fibre)', 0.4, 0.7, {
        defeat_resistance: ['rf_silent'],
        note: 'Fibre-optic control — RF jamming ineffective',
      }),
    ];
  }
  return [
    rf(pid, 'control', 'comms', 'ELRS/Analog control — 2.4 GHz', BANDS.ISM_24, { range_km: rangeKm }),
    rf(pid, 'video', 'comms', 'Analog video — 5.8 GHz', BANDS.ISM_58),
  ];
}

/** Decoy OWA — strong RF signature by design */
export function capsDecoyOwa(pid: string): SpectrumCapability[] {
  return [
    rf(pid, 'navigation', 'navigation', 'GPS L1 (decoy signature)', BANDS.GNSS_L1),
    rf(pid, 'datalink', 'comms', 'Inflated RF emitter — 2.4 GHz', BANDS.ISM_24, {
      note: 'Decoy — defeats RF jammers economically wasteful; kinetic preferred',
    }),
  ];
}

/** VTOL rotary ISR */
export function capsVtolIsr(pid: string, rangeKm: number): SpectrumCapability[] {
  return [
    rf(pid, 'control', 'comms', 'C2 — 2.4 GHz', BANDS.ISM_24, { range_km: rangeKm }),
    rf(pid, 'navigation', 'navigation', 'GPS L1', BANDS.GNSS_L1),
    ir(pid, 'sensor', 'EO/IR payload', 0.4, 5.0),
  ];
}

/** Naval USV — RF C2 + GNSS */
export function capsNavalUsv(pid: string, rangeKm: number): SpectrumCapability[] {
  return [
    rf(pid, 'datalink', 'comms', 'SATCOM/LOS C2 — Ku-band', BANDS.SAT_KU, { range_km: rangeKm }),
    rf(pid, 'navigation', 'navigation', 'GPS L1', BANDS.GNSS_L1),
    ir(pid, 'sensor', 'EO targeting', 0.4, 0.9),
  ];
}

/** Blue RF jammer effector */
export function capsRfJammer(pid: string, rangeKm: number): SpectrumCapability[] {
  return [
    rf(pid, 'jam_control', 'comms', 'Jam 2.4 GHz', BANDS.ISM_24, { range_km: rangeKm }),
    rf(pid, 'jam_video', 'comms', 'Jam 5.8 GHz', BANDS.ISM_58),
    rf(pid, 'jam_gnss', 'navigation', 'GNSS denial', BANDS.GNSS_WIDE),
  ];
}

/** Blue kinetic CIWS — radar cue only */
export function capsNavalCiws(pid: string, rangeKm: number): SpectrumCapability[] {
  return [
    rf(pid, 'detect_radar', 'radar', 'Fire-control radar — Ku-band', { lo: GHz(12), hi: GHz(18) }, { range_km: rangeKm }),
    ir(pid, 'detect_eo_ir', 'EO tracker', 0.4, 5.0, { note: 'Kinetic gun/missile — no RF jam' }),
  ];
}

/** Blue HEL */
export function capsHel(pid: string, rangeKm: number): SpectrumCapability[] {
  return [
    ir(pid, 'laser_defeat', 'HEL effect', 1.0, 1.07, { range_km: rangeKm, note: 'Weather-limited DEW' }),
  ];
}

/** Hero family LM — scale from hero-120 template */
export function capsHeroFamily(pid: string, rangeKm: number, warheadKg: number): SpectrumCapability[] {
  return [
    rf(pid, 'datalink', 'comms', 'Encrypted datalink — 2.4 GHz', BANDS.ISM_24, { range_km: rangeKm }),
    rf(pid, 'navigation', 'navigation', 'GPS L1', BANDS.GNSS_L1),
    ir(pid, 'sensor', `EO seeker (${warheadKg} kg warhead)`, 0.4, 0.9),
  ];
}

export { rf, ir, capId };
