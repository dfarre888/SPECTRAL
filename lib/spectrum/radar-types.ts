/**
 * Spectrum Intelligence — radar layer types
 * -----------------------------------------
 * Extends the platform model with radar systems. A radar is a Platform with
 * side='red'|'blue' and one or more radar capabilities, but it carries extra
 * structured intelligence the wargame and AeroCopilot reason over: mobility,
 * detection envelope, what it can/can't see, and ECCM hardening.
 *
 * Frequencies follow IEEE 521-2002 letter bands (HF→mm); we store the actual
 * Hz range so the radar EW canvas renders precisely.
 */

import type { Side, SpectrumCapability } from './types';

/** IEEE 521-2002 radar letter bands. */
export type RadarBand =
  | 'HF' | 'VHF' | 'UHF'
  | 'L' | 'S' | 'C' | 'X'
  | 'Ku' | 'K' | 'Ka'
  | 'V' | 'W' | 'mm';

/** IEEE band → frequency bounds (Hz). Canonical, from IEEE Std 521-2002. */
export const RADAR_BAND_HZ: Record<RadarBand, [number, number]> = {
  HF: [3e6, 30e6],
  VHF: [30e6, 300e6],
  UHF: [300e6, 1e9],
  L: [1e9, 2e9],
  S: [2e9, 4e9],
  C: [4e9, 8e9],
  X: [8e9, 12e9],
  Ku: [12e9, 18e9],
  K: [18e9, 27e9],
  Ka: [27e9, 40e9],
  V: [40e9, 75e9],
  W: [75e9, 110e9],
  mm: [110e9, 300e9],
};

/** What the radar is for. */
export type RadarRole =
  | 'early_warning'        // long-range surveillance / EW
  | 'acquisition'          // target acquisition / battle management
  | 'engagement'           // fire-control / missile guidance
  | 'multifunction'        // does acquisition + engagement (AESA)
  | 'counter_battery'      // locates artillery/rockets/mortars
  | 'counter_uas'          // small-drone detection
  | 'gci'                  // ground-controlled intercept
  | 'naval_air_search'     // shipborne air search
  | 'naval_multifunction'  // shipborne AESA/PESA
  | 'airborne_fire_control'// fighter/AEW radar
  | 'height_finder'
  | 'gap_filler'
  | 'pesa' | 'aesa';       // antenna type as a coarse role hint

/** Mobility class — affects survivability and placement on the map. */
export type RadarMobility =
  | 'fixed'                // permanent site
  | 'relocatable'          // can move but slow to set up (hours)
  | 'mobile'               // truck/trailer, sets up in minutes
  | 'self_propelled'       // on a tracked/wheeled combat chassis
  | 'naval'                // ship-mounted
  | 'airborne';            // aircraft-mounted

/** Antenna technology. */
export type AntennaType = 'mechanical' | 'PESA' | 'AESA' | 'FMCW' | 'reflector';

/** Target classes a radar may detect (for the can/can't-detect matrix). */
export type TargetClass =
  | 'aircraft'             // conventional fixed-wing
  | 'stealth'              // low-observable aircraft
  | 'helicopter'
  | 'cruise_missile'
  | 'ballistic_missile'
  | 'hypersonic'
  | 'large_uas'            // Group 3-5
  | 'small_uas'            // Group 1-2 / FPV
  | 'rocket_artillery_mortar' // RAM
  | 'sea_surface';

export interface RadarSystem {
  id: string;
  name: string;
  nato_name?: string | null;        // NATO reporting name (e.g. "Big Bird")
  side: Side;
  origin: string;                   // nation / manufacturer
  manufacturer?: string | null;
  role: RadarRole;
  associated_system?: string | null; // parent SAM/platform (e.g. "S-400")
  bands: RadarBand[];               // can be multi-band
  freq_low_hz: number;              // actual span for rendering
  freq_high_hz: number;
  antenna: AntennaType;
  mobility: RadarMobility;
  instrumented_range_km?: number | null;   // detection range (large target)
  range_vs_fighter_km?: number | null;     // range vs ~1-3 m² RCS
  range_vs_small_uas_km?: number | null;    // range vs small drone
  altitude_ceiling_km?: number | null;
  azimuth_deg?: number | null;             // coverage (360 = rotating)
  power_kw?: number | null;
  tracks?: number | null;                  // simultaneous tracks
  eccm?: 'low' | 'medium' | 'high' | null; // anti-jam hardening
  can_detect: TargetClass[];
  cannot_detect: TargetClass[];
  limitations?: string[];
  strengths?: string[];
  confidence: 'curated' | 'derived' | 'estimated';
  intel_note?: string | null;
  /** generated spectrum capability for the radar canvas */
  capability?: SpectrumCapability;
}

/** Build the radar's spectrum capability (for the EW radar canvas). */
export function radarToCapability(r: RadarSystem): SpectrumCapability {
  return {
    id: `${r.id}-radar`,
    platform_id: r.id,
    axis: 'rf',
    layer: 'radar',
    fn: r.side === 'blue' ? 'detect_radar' : 'radar_emit',
    label: `${r.name}${r.nato_name ? ` (${r.nato_name})` : ''}`,
    freq_low_hz: r.freq_low_hz,
    freq_high_hz: r.freq_high_hz,
    range_km: r.instrumented_range_km ?? undefined,
    note: `${r.bands.join('/')}-band · ${r.mobility}`,
  };
}
