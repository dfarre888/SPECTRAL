/**
 * Spectrum Intelligence — evolution-arc variants
 * ----------------------------------------------
 * The Shahed-136 across five generations — the narrative spine showing a
 * threat migrating off the jammable spectrum. Each variant carries its own
 * capability set and a "what defeats it" verdict.
 */

import type { PlatformVariant, SpectrumCapability } from '@/lib/spectrum/types';

let _n = 0;
const id = (v: string) => `shahed-136-${v}-cap-${++_n}`;
const MHz = (m: number) => m * 1e6;

const L1 = { lo: MHz(1574.42), hi: MHz(1576.42) };
const L2 = { lo: MHz(1226.6), hi: MHz(1228.6) };
const L5 = { lo: MHz(1175.45), hi: MHz(1177.45) };
const G1 = { lo: MHz(1598), hi: MHz(1606) };
const CELL = { lo: MHz(700), hi: MHz(2700) };

const navCap = (
  v: string,
  label: string,
  band: { lo: number; hi: number },
  resist: SpectrumCapability['defeat_resistance'] = []
): SpectrumCapability => ({
  id: id(v),
  platform_id: 'shahed-136',
  variant: v,
  axis: 'gnss',
  layer: 'navigation',
  fn: 'navigation',
  label,
  freq_low_hz: band.lo,
  freq_high_hz: band.hi,
  defeat_resistance: resist,
});

export const SHAHED_VARIANTS: PlatformVariant[] = [
  {
    id: 'shahed-136-gen0',
    platform_id: 'shahed-136',
    variant: 'gen0',
    label: 'Gen 0 — GNSS + INS',
    effective_year: 2022,
    summary: 'Commercial-grade GPS plus inertial backup, flying to pre-programmed coordinates.',
    defeat_verdict: 'rf_works',
    capabilities: [navCap('gen0', 'GPS L1 (commercial)', L1, ['gnss_jamming_low', 'gnss_spoofing_low'])],
  },
  {
    id: 'shahed-136-gen1',
    platform_id: 'shahed-136',
    variant: 'gen1',
    label: 'Gen 1 — multi-constellation',
    effective_year: 2023,
    summary: 'Upgraded module (e.g. BT-982K1) adds L5 and multiple constellations; single-frequency jamming less effective.',
    defeat_verdict: 'rf_works',
    capabilities: [
      navCap('gen1', 'GPS L1', L1, ['gnss_jamming_med']),
      navCap('gen1', 'GPS L2', L2, ['gnss_jamming_med']),
      navCap('gen1', 'GPS L5', L5, ['gnss_jamming_med']),
      navCap('gen1', 'GLONASS G1', G1, ['gnss_jamming_med']),
    ],
  },
  {
    id: 'shahed-136-gen2',
    platform_id: 'shahed-136',
    variant: 'gen2',
    label: 'Gen 2 — RTK over cellular',
    effective_year: 2024,
    summary: '3G/LTE modem pulls RTK corrections from network base stations, hardening navigation against spoofing within coverage.',
    defeat_verdict: 'rf_struggles',
    capabilities: [
      navCap('gen2', 'GNSS L1/L2/L5', L1, ['gnss_jamming_med', 'gnss_spoofing_med']),
      {
        id: id('gen2'),
        platform_id: 'shahed-136',
        variant: 'gen2',
        axis: 'rf',
        layer: 'comms',
        fn: 'datalink',
        label: 'Cellular LTE (RTK)',
        freq_low_hz: CELL.lo,
        freq_high_hz: CELL.hi,
        defeat_resistance: ['rf_jamming_med'],
      },
    ],
  },
  {
    id: 'shahed-136-gen3',
    platform_id: 'shahed-136',
    variant: 'gen3',
    label: 'Gen 3 — CRPA anti-jam',
    effective_year: 2024,
    summary: 'Controlled-Reception-Pattern Antenna (4/8/16 elements) nulls jamming by direction. GNSS jamming now struggles.',
    defeat_verdict: 'rf_struggles',
    capabilities: [
      navCap('gen3', 'GNSS L1 (8-element CRPA)', L1, ['gnss_jamming_high', 'gnss_spoofing_high']),
      navCap('gen3', 'GNSS L5 (CRPA)', L5, ['gnss_jamming_high']),
    ],
  },
  {
    id: 'shahed-136-gen4',
    platform_id: 'shahed-136',
    variant: 'gen4',
    label: 'Gen 4 — edge-AI / MWIR terminal',
    effective_year: 2025,
    summary: 'NVIDIA Jetson Orin runs machine-vision + MWIR camera for terminal guidance, matching scene to preloaded models. Strikes even fully GNSS-denied — NAVWAR defeated. Only direct-electronics (HPM) or kinetic remains.',
    defeat_verdict: 'hpm_only',
    capabilities: [
      navCap('gen4', 'GNSS L1/L5 (CRPA)', L1, ['gnss_jamming_high', 'gnss_spoofing_high', 'gnss_denied_capable']),
      {
        id: id('gen4'),
        platform_id: 'shahed-136',
        variant: 'gen4',
        axis: 'eo_ir',
        layer: 'eo_ir',
        fn: 'sensor',
        label: 'MWIR terminal-guidance camera',
        wavelength_low_um: 3.0,
        wavelength_high_um: 5.0,
        defeat_resistance: ['gnss_denied_capable'],
        note: 'Edge-AI; strikes without GNSS',
      },
    ],
  },
];

/* ── Samad OWA family (Red Sea) ─────────────────────────────────────────── */
const samadNav = (v: string, label: string, year: number): PlatformVariant['capabilities'] => [
  {
    id: `samad-2-${v}-nav`,
    platform_id: 'samad-2',
    variant: v,
    axis: 'gnss',
    layer: 'navigation',
    fn: 'navigation',
    label,
    freq_low_hz: L1.lo,
    freq_high_hz: L1.hi,
    defeat_resistance: ['gnss_jamming_med'],
  },
];

export const SAMAD_VARIANTS: PlatformVariant[] = [
  {
    id: 'samad-2-samad1',
    platform_id: 'samad-2',
    variant: 'samad1',
    label: 'Samad-1 — short-range',
    effective_year: 2016,
    summary: 'Shorter-range Samad variant — assessed Red Sea precursor.',
    defeat_verdict: 'rf_works',
    capabilities: samadNav('samad1', 'GPS L1', 2016),
  },
  {
    id: 'samad-2-samad3',
    platform_id: 'samad-2',
    variant: 'samad3',
    label: 'Samad-3 — extended range',
    effective_year: 2020,
    summary: 'Extended-range Samad — assessed maritime anti-ship profile.',
    defeat_verdict: 'rf_struggles',
    capabilities: samadNav('samad3', 'GPS L1 + INS backup', 2020),
  },
];

/* ── Shahed-238 / Geran-3 jet OWA ─────────────────────────────────────── */
export const SHAHED238_VARIANTS: PlatformVariant[] = [
  {
    id: 'shahed-238-geran3',
    platform_id: 'shahed-238',
    variant: 'geran3',
    label: 'Geran-3 — jet terminal',
    effective_year: 2024,
    summary: 'Jet-powered terminal phase — higher speed than piston Geran-2.',
    defeat_verdict: 'rf_struggles',
    capabilities: [
      navCap('geran3', 'GNSS L1', L1, ['gnss_jamming_med']),
      {
        id: 'shahed-238-geran3-mwir',
        platform_id: 'shahed-238',
        variant: 'geran3',
        axis: 'eo_ir',
        layer: 'eo_ir',
        fn: 'sensor',
        label: 'MWIR terminal seeker',
        wavelength_low_um: 3.0,
        wavelength_high_um: 5.0,
      },
    ],
  },
];

export const CATALOGUE_VARIANTS: PlatformVariant[] = [
  ...SAMAD_VARIANTS,
  ...SHAHED238_VARIANTS,
];
