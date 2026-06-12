/**
 * Spectrum Intelligence — scale & projection engine
 * -------------------------------------------------
 * Pure functions, no React, no D3 dependency required (we implement the log
 * scale ourselves so the engine is portable and testable). If you prefer D3,
 * `d3.scaleLog().domain(domain).range(range)` is a drop-in for `makeLogScale`.
 */

import type {
  SpectrumAxis,
  SpectrumLayer,
  Side,
  AxisConfig,
  SpectrumCapability,
} from './types';

export const C_MS = 2.99792458e8; // speed of light, m/s

/* ----------------------------- UNIT CONVERSION ----------------------------- */

/** wavelength (µm) → frequency (Hz):  f = c / λ */
export function umToHz(um: number): number {
  return C_MS / (um * 1e-6);
}
/** frequency (Hz) → wavelength (µm) */
export function hzToUm(hz: number): number {
  return (C_MS / hz) / 1e-6;
}

/* ----------------------------- LOG SCALE ----------------------------- */

export interface LogScale {
  (value: number): number;          // value (native unit) → pixel
  invert(px: number): number;        // pixel → value
  domain: [number, number];
  range: [number, number];
}

export function makeLogScale(
  domain: [number, number],
  range: [number, number]
): LogScale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const ld0 = Math.log10(d0);
  const ld1 = Math.log10(d1);
  const span = ld1 - ld0 || 1;

  const scale = ((value: number): number => {
    const v = Math.max(value, 1e-12);
    const t = (Math.log10(v) - ld0) / span;
    return r0 + t * (r1 - r0);
  }) as LogScale;

  scale.invert = (px: number): number => {
    const t = (px - r0) / (r1 - r0);
    return Math.pow(10, ld0 + t * span);
  };
  scale.domain = domain;
  scale.range = range;
  return scale;
}

/* ----------------------------- AXIS DEFINITIONS ----------------------------- */

const fmtHz = (hz: number): string => {
  if (hz >= 1e9) return `${trim(hz / 1e9)} GHz`;
  if (hz >= 1e6) return `${trim(hz / 1e6)} MHz`;
  if (hz >= 1e3) return `${trim(hz / 1e3)} kHz`;
  return `${trim(hz)} Hz`;
};
const fmtUm = (um: number): string => {
  if (um < 1) return `${trim(um * 1000)} nm`;
  return `${trim(um)} µm`;
};
const trim = (n: number): string => {
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? String(r) : String(r);
};

/**
 * Axis presets. Each canvas mounts one of these.
 * `range` here is a normalised [0,100] coordinate space; the SVG component
 * maps it to its own viewBox width so layouts stay responsive.
 */
export function getAxisConfig(
  axis: SpectrumAxis,
  range: [number, number] = [0, 100]
): AxisConfig {
  switch (axis) {
    case 'rf': {
      // 3 MHz → 40 GHz (HF through Ka), the operationally busy RF span.
      const domain: [number, number] = [3e6, 40e9];
      const decades = [1e7, 1e8, 1e9, 3e9, 1e10, 4e10];
      return {
        axis,
        unit: 'hz',
        domain,
        range,
        ticks: decades.map((v) => ({ value: v, label: fmtHz(v) })),
      };
    }
    case 'gnss': {
      // L-band detail: 1.1 → 1.7 GHz
      const domain: [number, number] = [1.1e9, 1.7e9];
      const pts = [1.176e9, 1.25e9, 1.38e9, 1.5e9, 1.602e9];
      return {
        axis,
        unit: 'hz',
        domain,
        range,
        ticks: pts.map((v) => ({ value: v, label: fmtHz(v) })),
      };
    }
    case 'eo_ir': {
      // 0.2 → 14 µm (UV through LWIR)
      const domain: [number, number] = [0.2, 14];
      const pts = [0.3, 0.55, 0.9, 2, 5, 10, 14];
      return {
        axis,
        unit: 'um',
        domain,
        range,
        ticks: pts.map((v) => ({ value: v, label: fmtUm(v) })),
      };
    }
    case 'cbrn': {
      // X-ray → gamma: 0.01 nm → 10 nm  (= 1e-5 → 1e-2 µm)
      const domain: [number, number] = [1e-5, 1e-2];
      const pts = [1e-5, 1e-4, 1e-3, 1e-2];
      return {
        axis,
        unit: 'um',
        domain,
        range,
        ticks: pts.map((v) => ({ value: v, label: fmtUm(v) })),
      };
    }
  }
}

/* ----------------------------- COLOUR TOKENS ----------------------------- */

/** Functional layer colours (Liquid Glass palette). */
export const LAYER_COLOR: Record<SpectrumLayer, string> = {
  comms: '#22d3ee',       // cyan
  navigation: '#4ade80',  // green
  radar: '#fbbf24',       // amber
  eo_ir: '#e879f9',       // magenta
  cbrn: '#94a3b8',        // slate-grey
};

/** Side tints used in engagement mode (override layer colour). */
export const SIDE_COLOR: Record<Side, string> = {
  red: '#f87171',
  blue: '#4a9eff',
  neutral: '#8b939c',
};

export const OVERLAP_COLOR = '#a78bfa'; // purple hatch

/** Pick the colour for a band given the current view mode. */
export function bandColor(
  cap: SpectrumCapability,
  side: Side,
  mode: 'reference' | 'platform' | 'engagement'
): string {
  if (mode === 'engagement') return SIDE_COLOR[side] ?? SIDE_COLOR.neutral;
  return LAYER_COLOR[cap.layer] ?? '#8b939c';
}

/* ----------------------------- BAND PROJECTION ----------------------------- */

/** Resolve a capability's [lo, hi] in the axis's native unit. */
export function capabilityExtent(
  cap: SpectrumCapability,
  axisUnit: 'hz' | 'um'
): [number, number] | null {
  const hasFreq = cap.freq_low_hz != null && cap.freq_high_hz != null;
  const hasWave =
    cap.wavelength_low_um != null && cap.wavelength_high_um != null;

  if (axisUnit === 'hz') {
    if (hasFreq) return [cap.freq_low_hz!, cap.freq_high_hz!];
    if (hasWave) {
      // convert wavelength → freq (note: order flips)
      const a = umToHz(cap.wavelength_high_um!);
      const b = umToHz(cap.wavelength_low_um!);
      return [Math.min(a, b), Math.max(a, b)];
    }
  } else {
    if (hasWave) return [cap.wavelength_low_um!, cap.wavelength_high_um!];
    if (hasFreq) {
      const a = hzToUm(cap.freq_high_hz!);
      const b = hzToUm(cap.freq_low_hz!);
      return [Math.min(a, b), Math.max(a, b)];
    }
  }
  return null;
}

/** A point emission (laser line) is lo===hi; give it a min render width. */
export function isPoint(extent: [number, number]): boolean {
  return extent[0] === extent[1];
}
