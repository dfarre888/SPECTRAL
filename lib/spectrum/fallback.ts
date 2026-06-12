/**
 * Spectrum Intelligence — capability fallback generator
 * -----------------------------------------------------
 * THE KEY FIX: when a platform has no curated `spectrum_capabilities` rows,
 * synthesise provisional bands from the legacy quick-reference fields so the
 * platform still renders something useful instead of an empty canvas.
 *
 * Derived bands are tagged `derived: true` so the UI can render them in a
 * distinct style (dashed / lower opacity) — honestly signalling
 * "inferred from library data, not a curated spectrum signature".
 */

import type {
  Platform,
  SpectrumCapability,
  SpectrumAxis,
  SpectrumLayer,
  CapabilityFunction,
} from './types';
import { GNSS_BANDS } from './engagement';

let _seq = 0;
const nid = (pid: string) => `derived-${pid}-${++_seq}`;

/** Build one derived band around a centre frequency (MHz) with a sensible span. */
function bandFromCenterMhz(
  platform_id: string,
  centerMhz: number,
  fn: CapabilityFunction,
  layer: SpectrumLayer,
  axis: SpectrumAxis,
  label: string
): SpectrumCapability {
  // span heuristic: ISM/control bands are a few % wide; clamp to something visible
  const center = centerMhz * 1e6;
  const half = Math.max(center * 0.01, 5e6); // ≥10 MHz wide
  return {
    id: nid(platform_id),
    platform_id,
    axis,
    layer,
    fn,
    label,
    freq_low_hz: center - half,
    freq_high_hz: center + half,
    derived: true,
    note: 'Derived from library field',
  };
}

/**
 * Generate provisional capabilities from a platform's legacy fields.
 * Returns [] if there is nothing to derive.
 */
export function deriveCapabilities(p: Platform): SpectrumCapability[] {
  const out: SpectrumCapability[] = [];

  if (p.c2_uplink_mhz != null) {
    out.push(
      bandFromCenterMhz(p.id, p.c2_uplink_mhz, 'control', 'comms', 'rf', `Control link ~${p.c2_uplink_mhz} MHz`)
    );
  }
  if (p.c2_downlink_mhz != null) {
    out.push(
      bandFromCenterMhz(p.id, p.c2_downlink_mhz, 'telemetry', 'comms', 'rf', `Downlink ~${p.c2_downlink_mhz} MHz`)
    );
  }
  if (p.video_mhz != null) {
    out.push(
      bandFromCenterMhz(p.id, p.video_mhz, 'video', 'comms', 'rf', `Video ~${p.video_mhz} MHz`)
    );
  }
  if (p.datalink_mhz != null) {
    out.push(
      bandFromCenterMhz(p.id, p.datalink_mhz, 'datalink', 'comms', 'rf', `Datalink ~${p.datalink_mhz} MHz`)
    );
  }
  if (p.gnss_used && p.gnss_used.length) {
    for (const sys of p.gnss_used) {
      const bands = GNSS_BANDS[sys as keyof typeof GNSS_BANDS];
      if (!bands) continue;
      // derive only the primary (L1-equivalent) band to avoid clutter
      const primary = bands[0];
      out.push({
        id: nid(p.id),
        platform_id: p.id,
        axis: 'gnss',
        layer: 'navigation',
        fn: 'navigation',
        label: `${sys} (${primary.label})`,
        freq_low_hz: primary.lo,
        freq_high_hz: primary.hi,
        derived: true,
        note: 'Derived from gnss_used',
      });
    }
  }
  if (p.satcom_band) {
    const satMap: Record<string, [number, number]> = {
      L: [1e9, 2e9],
      Ku: [12e9, 18e9],
      Ka: [27e9, 40e9],
    };
    const rng = satMap[p.satcom_band];
    if (rng) {
      out.push({
        id: nid(p.id),
        platform_id: p.id,
        axis: 'rf',
        layer: 'comms',
        fn: 'datalink',
        label: `SATCOM ${p.satcom_band}-band`,
        freq_low_hz: rng[0],
        freq_high_hz: rng[1],
        derived: true,
        note: 'Derived from satcom_band',
      });
    }
  }

  return out;
}

/**
 * Resolve the capabilities to actually render for a platform:
 * curated rows if present, otherwise derived fallback.
 */
export function resolveCapabilities(p: Platform): SpectrumCapability[] {
  if (p.capabilities && p.capabilities.length > 0) return p.capabilities;
  return deriveCapabilities(p);
}
