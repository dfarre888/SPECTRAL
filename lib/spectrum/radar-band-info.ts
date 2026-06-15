/**
 * IEEE 521-2002 radar band reference — tooltips for the Radar Spectrum canvas.
 * Wavelength / role text aligned with military-radar-operator skill.
 */

import type { RadarBand } from './radar-types';
import { RADAR_BAND_HZ } from './radar-types';

export interface RadarBandInfo {
  band: RadarBand;
  frequency: string;
  wavelength: string;
  summary: string;
  typicalRoles: string;
  tradeoff: string;
}

function fmtBandRange(band: RadarBand): string {
  const [lo, hi] = RADAR_BAND_HZ[band];
  const fmt = (hz: number) => (hz >= 1e9 ? `${hz / 1e9} GHz` : `${hz / 1e6} MHz`);
  return `${fmt(lo)} – ${fmt(hi)}`;
}

/** Bands rendered on the Radar Spectrum top axis (left → right). */
export const RADAR_SPECTRUM_BANDS: RadarBand[] = [
  'HF',
  'VHF',
  'UHF',
  'L',
  'S',
  'C',
  'X',
  'Ku',
  'K',
  'Ka',
];

export const RADAR_BAND_INFO: Record<RadarBand, RadarBandInfo> = {
  HF: {
    band: 'HF',
    frequency: fmtBandRange('HF'),
    wavelength: '100–10 m',
    summary: 'Over-the-horizon skywave surveillance. Very long range, very poor angular resolution.',
    typicalRoles: 'OTH radar, strategic early warning',
    tradeoff: 'Left end of the ladder — range at the cost of weapons-grade tracking.',
  },
  VHF: {
    band: 'VHF',
    frequency: fmtBandRange('VHF'),
    wavelength: '10–1 m',
    summary: 'Counter-stealth band — wavelength resonates with airframe features. Detects LO targets; cannot deliver a fire-control lock.',
    typicalRoles: 'Nebo, Rezonans, JY-27 — cue radars in fused IADS',
    tradeoff: 'Sees stealth as a detection cue; engagement still needs higher bands.',
  },
  UHF: {
    band: 'UHF',
    frequency: fmtBandRange('UHF'),
    wavelength: '1–0.3 m',
    summary: 'Long-range early warning and ballistic-missile detection. Counter-stealth-leaning with better range than VHF.',
    typicalRoles: 'BMEWS, strategic EW, multi-band fusion (Nebo-M UHF leg)',
    tradeoff: 'Penetrates some stealth shaping; resolution still too coarse for terminal engagement alone.',
  },
  L: {
    band: 'L',
    frequency: fmtBandRange('L'),
    wavelength: '30–15 cm',
    summary: 'Long-range surveillance and ground-controlled intercept. Strong range vs resolution balance.',
    typicalRoles: 'GCI, naval air search, LTAMDS lower band, Giraffe-class acquisition',
    tradeoff: 'Workhorse surveillance — cues medium-range trackers and SAM batteries.',
  },
  S: {
    band: 'S',
    frequency: fmtBandRange('S'),
    wavelength: '15–7.5 cm',
    summary: 'Acquisition and naval multifunction. The all-rounder band for battle management.',
    typicalRoles: 'S-400 Big Bird, SPY-1/6, SMART-L, Patriot acquisition',
    tradeoff: 'Good detection envelope without the rain sensitivity of Ku/X at short range.',
  },
  C: {
    band: 'C',
    frequency: fmtBandRange('C'),
    wavelength: '7.5–3.75 cm',
    summary: 'Medium-range air defence and weather radar. Common GBAD multifunction band.',
    typicalRoles: 'HQ-9 HT-233, NASAMS MPQ-64, Patriot MPQ-65',
    tradeoff: 'Bridges surveillance and fire control — shorter range than S, finer than L.',
  },
  X: {
    band: 'X',
    frequency: fmtBandRange('X'),
    wavelength: '3.75–2.5 cm',
    summary: 'Fire-control and BMD discrimination. Fighter AESA and terminal engagement band.',
    typicalRoles: 'AN/TPY-2, Flap Lid, fighter radars, shipborne FC',
    tradeoff: 'Weapons-grade lock and resolution — shorter range vs stealth than lower bands.',
  },
  Ku: {
    band: 'Ku',
    frequency: fmtBandRange('Ku'),
    wavelength: '2.5–1.67 cm',
    summary: 'Short-range precision tracking. Primary counter-UAS and C-RAM sensor band.',
    typicalRoles: 'KuRFS, Echodyne, naval CIWS cue, drone-detection AESA',
    tradeoff: 'High Doppler sensitivity for small targets — rain and clutter degrade performance.',
  },
  K: {
    band: 'K',
    frequency: fmtBandRange('K'),
    wavelength: '1.67–1.1 cm',
    summary: 'Very high resolution, short range. Atmospheric absorption peak limits long-range use.',
    typicalRoles: 'Missile seekers, short-range tracking, imaging adjuncts',
    tradeoff: 'Fine detail at close range — rarely used for standalone surveillance.',
  },
  Ka: {
    band: 'Ka',
    frequency: fmtBandRange('Ka'),
    wavelength: '1.1–0.75 cm',
    summary: 'Highest practical radar resolution band on the chart. Short range, weather-sensitive.',
    typicalRoles: 'Terminal seekers, high-resolution fire control, SATCOM-adjacent EW',
    tradeoff: 'Right end of the ladder — resolution over range; not a strategic EW band.',
  },
  V: {
    band: 'V',
    frequency: fmtBandRange('V'),
    wavelength: '7.5–4 mm',
    summary: 'Millimetre-wave adjunct — very short range, very high resolution.',
    typicalRoles: 'Imaging, close-in sensors',
    tradeoff: 'Not shown on the main Radar Spectrum axis.',
  },
  W: {
    band: 'W',
    frequency: fmtBandRange('W'),
    wavelength: '4–2.7 mm',
    summary: 'Upper mm-wave — seeker and imaging applications.',
    typicalRoles: 'Active seekers, experimental sensors',
    tradeoff: 'Not shown on the main Radar Spectrum axis.',
  },
  mm: {
    band: 'mm',
    frequency: fmtBandRange('mm'),
    wavelength: '< 2.7 mm',
    summary: 'Millimetre-wave and above — imaging and seeker end of the spectrum.',
    typicalRoles: 'Seekers, imaging radars',
    tradeoff: 'Not shown on the main Radar Spectrum axis.',
  },
};
