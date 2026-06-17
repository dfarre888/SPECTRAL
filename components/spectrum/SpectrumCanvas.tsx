'use client';
/**
 * SpectrumCanvas — the shared spectrum renderer.
 * Used by RF, GNSS, EO/IR, CBRN and the Red-vs-Blue engagement view.
 *
 * It is axis-agnostic: pass an `axis` and it builds the right log scale and
 * tick labels. Bands are grouped into lanes (by function/side). In engagement
 * mode it draws purple hatched overlap columns between Red and Blue lanes.
 */

import React, { useMemo, useState } from 'react';
import type {
  SpectrumAxis,
  SpectrumCapability,
  SpectrumLayer,
  Side,
} from '@/lib/spectrum/types';
import {
  getAxisConfig,
  makeLogScale,
  capabilityExtent,
  LAYER_COLOR,
  SIDE_COLOR,
  OVERLAP_COLOR,
} from '@/lib/spectrum/scale';
import type { BandOverlap } from '@/lib/spectrum/types';
import type { AccreditedWaveformProfile } from '@/lib/operations/accredited-supplements-data';
import type { GnssConstellation, GnssPlatformDependency } from '@/lib/gnss/gnss-types';

export interface CanvasLane {
  key: string;
  label: string;
  side: Side;
  caps: SpectrumCapability[];
}

export interface SpectrumCanvasProps {
  axis: SpectrumAxis;
  lanes: CanvasLane[];
  mode: 'reference' | 'platform' | 'engagement';
  overlaps?: BandOverlap[];
  /** faint reference bands drawn behind everything (e.g. ISM blocks) */
  referenceBands?: { lo: number; hi: number; label: string; tint: string }[];
  height?: number;
  title?: string;
  subtitle?: string;
  accreditedWaveforms?: AccreditedWaveformProfile[];
  constellations?: GnssConstellation[];
  gnssVulnerabilities?: GnssPlatformDependency[];
  gnssOverlay?: boolean;
}


function gnssConstellationColor(id: string): string {
  if (id === 'glonass') return '#F97316';
  if (id === 'beidou') return '#A78BFA';
  return '#06B6D4';
}

const VB_W = 960;
const PAD_L = 96;
const PAD_R = 40;
const PAD_T = 30;
const LANE_H = 30;
const LANE_GAP = 12;
const AXIS_GAP = 26;

export function SpectrumCanvas({
  axis,
  lanes,
  mode,
  overlaps = [],
  referenceBands = [],
  height,
  title,
  subtitle,
  accreditedWaveforms = [],
  constellations = [],
  gnssVulnerabilities = [],
  gnssOverlay = false,
}: SpectrumCanvasProps) {
  const [hover, setHover] = useState<{
    x: number;
    y: number;
    cap?: SpectrumCapability;
    accredited?: import('@/lib/operations/accredited-supplements-data').AccreditedWaveformProfile;
    gnss?: { constellation: string; band: string; freqMhz: number; platforms: string[] };
  } | null>(null);

  const cfg = useMemo(() => getAxisConfig(axis, [PAD_L, VB_W - PAD_R]), [axis]);
  const scale = useMemo(() => makeLogScale(cfg.domain, cfg.range), [cfg]);
  const unit = cfg.unit;

  const accreditedLaneCount = accreditedWaveforms.length > 0 && unit === "hz" ? 1 : 0;
  const lanesTop = PAD_T + 26; // room for region labels
  const axisY = lanesTop + (lanes.length + accreditedLaneCount) * (LANE_H + LANE_GAP) + 6;
  const vbH = height ?? axisY + AXIS_GAP + 40;

  const px = (v: number) => scale(v);

  const overlapsAccredited = (lo: number, hi: number) =>
    accreditedWaveforms.some((wf) => wf.freq_low_hz <= hi && wf.freq_high_hz >= lo);

  // helper: project a capability to {x, w}
  const project = (cap: SpectrumCapability) => {
    const ext = capabilityExtent(cap, unit);
    if (!ext) return null;
    let x0 = px(ext[0]);
    let x1 = px(ext[1]);
    if (x1 < x0) [x0, x1] = [x1, x0];
    const w = Math.max(x1 - x0, 4); // min width for point emissions (lasers)
    return { x: x0, w };
  };

  return (
    <div style={{ position: 'relative' }}>
      {(title || subtitle) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            marginBottom: 8,
          }}
        >
          {title && (
            <div
              className="sx-display"
              style={{ fontWeight: 600, fontSize: 14 }}
            >
              {title}
            </div>
          )}
          {subtitle && (
            <div
              className="sx-mono sx-faint"
              style={{ fontSize: 10, marginLeft: 'auto', letterSpacing: '0.08em' }}
            >
              {subtitle}
            </div>
          )}
        </div>
      )}

      {accreditedWaveforms.length > 0 && unit === "hz" && (
        <div className="sx-mono" style={{ position: "absolute", top: 0, right: 0, fontSize: 11, display: "flex", gap: 14, color: "var(--sx-ink-dim)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 12, height: 8, borderRadius: 2, background: "#06B6D4", opacity: 0.85 }} />OSINT estimate</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 12, height: 8, borderRadius: 2, background: "#F97316" }} />Accredited data</span>
        </div>
      )}

      <svg
        viewBox={`0 0 ${VB_W} ${vbH}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: 'auto', overflow: 'visible' }}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <pattern
            id={`hatch-${axis}`}
            width="7"
            height="7"
            patternTransform="rotate(45)"
            patternUnits="userSpaceOnUse"
          >
            <line x1="0" y1="0" x2="0" y2="7" stroke={OVERLAP_COLOR} strokeWidth="2" />
          </pattern>
          <linearGradient id={`field-${axis}`} x1="0" x2="1">
            <stop offset="0" stopColor="#0b0f13" />
            <stop offset="1" stopColor="#090b0f" />
          </linearGradient>
        </defs>

        {/* field */}
        <rect
          x={PAD_L - 8}
          y={PAD_T}
          width={VB_W - PAD_L - PAD_R + 16}
          height={axisY - PAD_T}
          rx="12"
          fill={`url(#field-${axis})`}
        />

        {/* decade gridlines */}
        {cfg.ticks.map((t, i) => (
          <line
            key={`grid-${i}`}
            x1={px(t.value)}
            y1={PAD_T + 4}
            x2={px(t.value)}
            y2={axisY}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        ))}

        {/* reference bands (faint) */}
        {referenceBands.map((b, i) => {
          const x0 = px(b.lo);
          const x1 = px(b.hi);
          return (
            <g key={`ref-${i}`}>
              <rect
                x={x0}
                y={PAD_T + 4}
                width={Math.max(x1 - x0, 3)}
                height={axisY - PAD_T - 4}
                fill={b.tint}
              />
              <text
                x={(x0 + x1) / 2}
                y={PAD_T + 18}
                textAnchor="middle"
                fontFamily="var(--sx-mono)"
                fontSize="9"
                fill="var(--sx-ink-faint)"
              >
                {b.label}
              </text>
            </g>
          );
        })}

        {/* overlap columns (engagement mode) */}
        {mode === 'engagement' &&
          overlaps.map((o, i) => {
            const x0 = px(o.lo);
            const x1 = px(o.hi);
            const w = Math.max(x1 - x0, 4);
            return (
              <g key={`ov-${i}`}>
                <rect
                  x={x0}
                  y={lanesTop - 4}
                  width={w}
                  height={lanes.length * (LANE_H + LANE_GAP)}
                  rx="6"
                  fill={`url(#hatch-${axis})`}
                  opacity="0.45"
                />
                <rect
                  x={x0}
                  y={lanesTop - 4}
                  width={w}
                  height={lanes.length * (LANE_H + LANE_GAP)}
                  rx="6"
                  fill="none"
                  stroke={OVERLAP_COLOR}
                  strokeWidth="1.3"
                />
              </g>
            );
          })}

        {/* lanes + bands */}
        {lanes.map((lane, li) => {
          const y = lanesTop + li * (LANE_H + LANE_GAP);
          const laneColor =
            mode === 'engagement'
              ? SIDE_COLOR[lane.side] ?? SIDE_COLOR.neutral
              : null;
          return (
            <g key={lane.key}>
              {/* lane label */}
              <text
                x={PAD_L - 12}
                y={y + LANE_H / 2 + 3}
                textAnchor="end"
                fontFamily="var(--sx-mono)"
                fontSize="10"
                fill={
                  laneColor ??
                  'var(--sx-ink-dim)'
                }
              >
                {lane.label}
              </text>
              {/* bands */}
              {lane.caps.map((cap) => {
                const p = project(cap);
                if (!p) return null;
                const ext = capabilityExtent(cap, unit);
                const bandLo = ext?.[0] ?? 0;
                const bandHi = ext?.[1] ?? 0;
                const accOverlap = unit === 'hz' && accreditedWaveforms.length > 0 && overlapsAccredited(bandLo, bandHi);
                const color =
                  mode === 'engagement'
                    ? laneColor!
                    : accOverlap
                      ? '#06B6D4'
                      : LAYER_COLOR[cap.layer] ?? '#8b939c';
                return (
                  <rect
                    key={cap.id}
                    x={p.x}
                    y={y}
                    width={p.w}
                    height={LANE_H}
                    rx="6"
                    fill={color}
                    opacity={cap.derived || accOverlap ? 0.4 : 0.85}
                    stroke={cap.derived || accOverlap ? color : 'none'}
                    strokeWidth={cap.derived || accOverlap ? 1 : 0}
                    strokeDasharray={cap.derived || accOverlap ? '4 2' : undefined}
                    style={{ cursor: 'pointer', transition: 'opacity .15s' }}
                    onMouseEnter={() =>
                      setHover({ x: p.x + p.w / 2, y: y - 6, cap })
                    }
                  />
                );
              })}
            </g>
          );
        })}

        {/* accredited waveform overlay lane */}
        {accreditedWaveforms.length > 0 && unit === "hz" && (() => {
          const y = lanesTop + lanes.length * (LANE_H + LANE_GAP);
          return (
            <g key="accredited-lane">
              <text x={PAD_L - 12} y={y + LANE_H / 2 + 3} textAnchor="end" fontFamily="var(--sx-mono)" fontSize="10" fill="#F97316">Accredited</text>
              {accreditedWaveforms.map((wf) => {
                const x0 = px(wf.freq_low_hz);
                const x1 = px(wf.freq_high_hz);
                const w = Math.max(x1 - x0, 4);
                return (
                  <rect key={wf.id} x={x0} y={y} width={w} height={LANE_H} rx="6" fill="#F97316" opacity={0.5} style={{ cursor: "pointer" }} onMouseEnter={() => setHover({ x: x0 + w / 2, y: y - 6, accredited: wf })} />
                );
              })}
            </g>
          );
        })()}


        {/* GNSS constellation band markers (RF axis only) */}
        {gnssOverlay && axis === 'rf' && unit === 'hz' && constellations.length > 0 && (
          <g key="gnss-overlay">
            {constellations.flatMap((c) =>
              (c.signal_bands ?? []).map((band) => {
                const freqHz = band.freq_mhz * 1e6;
                const x = px(freqHz);
                const color = gnssConstellationColor(c.id);
                const vulnPlatforms = gnssVulnerabilities
                  .filter((d) => d.dependency_level === 'primary' && d.jamming_effect === 'mission_kill')
                  .map((d) => d.platform_id)
                  .slice(0, 3);
                return (
                  <line
                    key={`${c.id}-${band.band}`}
                    x1={x}
                    x2={x}
                    y1={lanesTop - 8}
                    y2={axisY}
                    stroke={color}
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    opacity={0.85}
                    style={{ pointerEvents: 'stroke' }}
                    onMouseEnter={() =>
                      setHover({
                        x,
                        y: lanesTop - 10,
                        gnss: {
                          constellation: c.display_name,
                          band: band.band,
                          freqMhz: band.freq_mhz,
                          platforms: vulnPlatforms,
                        },
                      })
                    }
                  />
                );
              }),
            )}
          </g>
        )}

        {gnssOverlay && axis === 'rf' && constellations.length > 0 && (
          <g key="gnss-legend">
            {constellations.map((c, i) => (
              <text
                key={`leg-${c.id}`}
                x={PAD_L}
                y={vbH - 8 - (constellations.length - 1 - i) * 12}
                fontFamily="var(--sx-mono)"
                fontSize="10"
                fill={gnssConstellationColor(c.id)}
              >
                {c.display_name}
              </text>
            ))}
          </g>
        )}

        {/* axis */}
        <line
          x1={PAD_L - 20}
          y1={axisY}
          x2={VB_W - PAD_R + 10}
          y2={axisY}
          stroke="var(--sx-glass-line)"
          strokeWidth="1"
        />
        {cfg.ticks.map((t, i) => (
          <text
            key={`tick-${i}`}
            x={px(t.value)}
            y={axisY + 18}
            textAnchor="middle"
            fontFamily="var(--sx-mono)"
            fontSize="10"
            fill="var(--sx-ink-dim)"
          >
            {t.label}
          </text>
        ))}
        <text
          x={(PAD_L + VB_W - PAD_R) / 2}
          y={axisY + 40}
          textAnchor="middle"
          fontFamily="var(--sx-mono)"
          fontSize="10"
          fill="var(--sx-ink-faint)"
          letterSpacing="0.2em"
        >
          {unit === 'hz' ? 'FREQUENCY · LOGARITHMIC' : 'WAVELENGTH · MICRONS'}
        </text>

        {/* hover tooltip */}
        {hover && (
          <g pointerEvents="none">
            <rect
              x={Math.min(Math.max(hover.x - 90, 4), VB_W - 184)}
              y={hover.y - (hover.gnss ? 70 : hover.accredited ? 58 : 46)}
              width="180"
              height={hover.gnss ? 66 : hover.accredited ? 54 : 42}
              rx="8"
              fill="rgba(8,10,12,0.95)"
              stroke="var(--sx-glass-line-hi)"
            />
            {hover.gnss ? (
              <>
                <text x={Math.min(Math.max(hover.x - 90, 4), VB_W - 184) + 10} y={hover.y - 56} fontFamily="var(--sx-ui)" fontSize="10" fontWeight="600" fill="#06B6D4">{hover.gnss.constellation}</text>
                <text x={Math.min(Math.max(hover.x - 90, 4), VB_W - 184) + 10} y={hover.y - 42} fontFamily="var(--sx-mono)" fontSize="9" fill="var(--sx-ink-dim)">{hover.gnss.band} · {hover.gnss.freqMhz.toFixed(2)} MHz</text>
                <text x={Math.min(Math.max(hover.x - 90, 4), VB_W - 184) + 10} y={hover.y - 28} fontFamily="var(--sx-mono)" fontSize="9" fill="var(--sx-ink-dim)">Vuln: {hover.gnss.platforms.join(', ') || '—'}</text>
              </>
            ) : hover.accredited ? (
              <>
                <text x={Math.min(Math.max(hover.x - 90, 4), VB_W - 184) + 10} y={hover.y - 44} fontFamily="var(--sx-ui)" fontSize="10" fontWeight="600" fill="#F97316">{hover.accredited.label.slice(0, 28)}</text>
                <text x={Math.min(Math.max(hover.x - 90, 4), VB_W - 184) + 10} y={hover.y - 30} fontFamily="var(--sx-mono)" fontSize="9" fill="var(--sx-ink-dim)">{hover.accredited.system_id} · {hover.accredited.capability_fn}</text>
                <text x={Math.min(Math.max(hover.x - 90, 4), VB_W - 184) + 10} y={hover.y - 16} fontFamily="var(--sx-mono)" fontSize="9" fill="var(--sx-ink-dim)">{hover.accredited.confidence} · accredited</text>
              </>
            ) : hover.cap ? (
              <>
                <text x={Math.min(Math.max(hover.x - 90, 4), VB_W - 184) + 10} y={hover.y - 30} fontFamily="var(--sx-ui)" fontSize="10" fontWeight="600" fill="var(--sx-ink)">{hover.cap.label.slice(0, 30)}</text>
                <text x={Math.min(Math.max(hover.x - 90, 4), VB_W - 184) + 10} y={hover.y - 16} fontFamily="var(--sx-mono)" fontSize="9" fill="var(--sx-ink-dim)">{fmtExtent(hover.cap, unit)}{hover.cap.derived ? ' · derived' : ''}</text>
              </>
            ) : null}
          </g>
        )}
      </svg>
    </div>
  );
}

function fmtExtent(cap: SpectrumCapability, unit: 'hz' | 'um'): string {
  const ext = capabilityExtent(cap, unit);
  if (!ext) return '';
  if (unit === 'hz') {
    const f = (v: number) =>
      v >= 1e9 ? `${(v / 1e9).toFixed(2)} GHz` : `${(v / 1e6).toFixed(0)} MHz`;
    return ext[0] === ext[1] ? f(ext[0]) : `${f(ext[0])} – ${f(ext[1])}`;
  }
  const f = (v: number) => (v < 1 ? `${(v * 1000).toFixed(0)} nm` : `${v.toFixed(2)} µm`);
  return ext[0] === ext[1] ? f(ext[0]) : `${f(ext[0])} – ${f(ext[1])}`;
}
