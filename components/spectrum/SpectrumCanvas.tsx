'use client';
/**
 * SpectrumCanvas — the shared spectrum renderer.
 * Used by RF, GNSS, EO/IR, CBRN and the Red-vs-Blue engagement view.
 *
 * It is axis-agnostic: pass an `axis` and it builds the right log scale and
 * tick labels. Bands are grouped into lanes (by function/side). In engagement
 * mode it draws violet hatched overlap columns between Red and Blue lanes.
 *
 * The viewBox width tracks the rendered width, so every SVG label renders at
 * its true pixel size (11px floor) instead of shrinking with the container.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type {
  SpectrumAxis,
  SpectrumCapability,
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
import { ACCREDITED_COLOR } from './tokens';

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
  if (id === 'glonass') return '#FDA4AF';
  if (id === 'beidou') return '#A78BFA';
  if (id === 'navic') return '#34D399';
  if (id === 'qzss') return '#F472B6';
  if (id === 'sbas') return '#FBBF24';
  if (id === 'starlink') return '#C084FC';
  return '#06B6D4';
}

const GNSS_OVERLAY_MAX_MHZ = 6000;
const GNSS_OVERLAY_MIN_MHZ = 400;

const MIN_W = 520;
const PAD_R = 28;
const PAD_T = 8;
const LANE_H = 26;
const LANE_GAP = 10;
const AXIS_GAP = 26;
const LABEL_FS = 12;
const LABEL_CH = 7.3; // JetBrains Mono advance at 12px
const LABEL_MAX = 24;

type Hover = {
  x: number;
  y: number;
  cap?: SpectrumCapability;
  accredited?: AccreditedWaveformProfile;
  gnss?: { constellation: string; band: string; freqMhz: number; platforms: string[] };
};

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
  const [hover, setHover] = useState<Hover | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [vbW, setVbW] = useState(960);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const w = Math.max(MIN_W, Math.round(el.clientWidth));
      setVbW((prev) => (Math.abs(prev - w) > 1 ? w : prev));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const hasAccredited = accreditedWaveforms.length > 0;
  const laneLabels = [...lanes.map((l) => l.label), ...(hasAccredited ? ['Accredited'] : [])];
  const longest = Math.min(LABEL_MAX, Math.max(8, ...laneLabels.map((l) => l.length)));
  const PAD_L = Math.round(Math.min(230, Math.max(92, longest * LABEL_CH + 26)));

  const cfg = useMemo(() => getAxisConfig(axis, [PAD_L, vbW - PAD_R]), [axis, PAD_L, vbW]);
  const scale = useMemo(() => makeLogScale(cfg.domain, cfg.range), [cfg]);
  const unit = cfg.unit;

  const accreditedLaneCount = hasAccredited && unit === 'hz' ? 1 : 0;
  const lanesTop = PAD_T + (referenceBands.length > 0 ? 44 : 14);
  const axisY = lanesTop + (lanes.length + accreditedLaneCount) * (LANE_H + LANE_GAP) + 4;
  const vbH = height ?? axisY + AXIS_GAP + 30;

  const px = (v: number) => scale(v);

  const overlapsAccredited = (lo: number, hi: number) =>
    accreditedWaveforms.some((wf) => wf.freq_low_hz <= hi && wf.freq_high_hz >= lo);

  // helper: project a capability to {x, w}; bands wholly off this axis are skipped, partial ones clamped
  const [dLo, dHi] = cfg.domain;
  const project = (cap: SpectrumCapability) => {
    const ext = capabilityExtent(cap, unit);
    if (!ext) return null;
    const lo = Math.min(ext[0], ext[1]);
    const hi = Math.max(ext[0], ext[1]);
    if (hi < dLo || lo > dHi) return null;
    let x0 = px(Math.max(lo, dLo));
    let x1 = px(Math.min(hi, dHi));
    if (x1 < x0) [x0, x1] = [x1, x0];
    const w = Math.max(x1 - x0, 4); // min width for point emissions (lasers)
    return { x: x0, w };
  };

  // Tick labels: drop any that would collide with a neighbour; the end label always stays.
  const ticks = useMemo(() => {
    const W = (l: string) => l.length * LABEL_CH + 10;
    const all = cfg.ticks.map((t, i) => {
      const x = scale(t.value);
      const w = W(t.label);
      const last = i === cfg.ticks.length - 1;
      return { ...t, x, x0: last ? x - w : x - w / 2, x1: last ? x : x + w / 2, last };
    });
    const kept: typeof all = [];
    for (const t of all) {
      while (t.last && kept.length && kept[kept.length - 1].x1 > t.x0) kept.pop();
      if (!kept.length || kept[kept.length - 1].x1 <= t.x0) kept.push(t);
    }
    return kept;
  }, [cfg, scale]);

  const clip = (s: string) => (s.length > LABEL_MAX ? `${s.slice(0, LABEL_MAX - 1)}…` : s);
  const focusId = hover?.cap?.id ?? hover?.accredited?.id ?? null;
  const showGnss = gnssOverlay && axis === 'rf' && unit === 'hz' && constellations.length > 0;

  return (
    <div style={{ position: 'relative' }}>
      {(title || subtitle || (hasAccredited && unit === 'hz')) && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px 16px', flexWrap: 'wrap', marginBottom: 10 }}>
          {title && <h3 className="sx-h">{title}</h3>}
          {subtitle && <span className="sx-cap sx-mono">{subtitle}</span>}
          {hasAccredited && unit === 'hz' && (
            <span style={{ marginLeft: 'auto', display: 'flex', gap: 14, fontSize: 12, color: 'var(--store-ink-soft)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 12, height: 8, borderRadius: 2, background: '#06B6D4', opacity: 0.85 }} />
                OSINT estimate
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 12, height: 8, borderRadius: 2, background: ACCREDITED_COLOR }} />
                Accredited data
              </span>
            </span>
          )}
        </div>
      )}

      <div ref={wrapRef} style={{ position: 'relative' }}>
        <svg
          viewBox={`0 0 ${vbW} ${vbH}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
          onMouseLeave={() => setHover(null)}
          aria-label={title ?? 'Spectrum chart'}
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
          </defs>

          {/* field */}
          <rect
            x={PAD_L - 8}
            y={PAD_T}
            width={vbW - PAD_L - PAD_R + 16}
            height={axisY - PAD_T}
            rx="10"
            fill="rgba(255,255,255,0.022)"
            stroke="rgba(255,255,255,0.06)"
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

          {/* reference bands (faint), labels staggered so neighbours never collide */}
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
                  y={PAD_T + (i % 2 === 0 ? 17 : 33)}
                  textAnchor="middle"
                  fontFamily="var(--sx-mono)"
                  fontSize="11"
                  fill="var(--store-ink-mute)"
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
                <text
                  x={PAD_L - 14}
                  y={y + LANE_H / 2 + 4}
                  textAnchor="end"
                  fontFamily="var(--sx-mono)"
                  fontSize={LABEL_FS}
                  fill={laneColor ?? 'var(--store-ink-soft)'}
                >
                  <title>{lane.label}</title>
                  {clip(lane.label)}
                </text>
                {lane.caps.map((cap) => {
                  const p = project(cap);
                  if (!p) return null;
                  const ext = capabilityExtent(cap, unit);
                  const bandLo = ext?.[0] ?? 0;
                  const bandHi = ext?.[1] ?? 0;
                  const accOverlap = unit === 'hz' && hasAccredited && overlapsAccredited(bandLo, bandHi);
                  const color =
                    mode === 'engagement'
                      ? laneColor!
                      : accOverlap
                        ? '#06B6D4'
                        : LAYER_COLOR[cap.layer] ?? '#8b939c';
                  const base = cap.derived || accOverlap ? 0.4 : 0.85;
                  return (
                    <rect
                      key={cap.id}
                      data-band-state={focusId == null ? 'neutral' : focusId === cap.id ? 'focused' : 'dimmed'}
                      x={p.x}
                      y={y}
                      width={p.w}
                      height={LANE_H}
                      rx="6"
                      fill={color}
                      opacity={base}
                      stroke={cap.derived || accOverlap ? color : 'none'}
                      strokeWidth={cap.derived || accOverlap ? 1 : 0}
                      strokeDasharray={cap.derived || accOverlap ? '4 2' : undefined}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHover({ x: p.x + p.w / 2, y, cap })}
                    />
                  );
                })}
              </g>
            );
          })}

          {/* accredited waveform overlay lane */}
          {accreditedLaneCount > 0 && (() => {
            const y = lanesTop + lanes.length * (LANE_H + LANE_GAP);
            return (
              <g key="accredited-lane">
                <text x={PAD_L - 14} y={y + LANE_H / 2 + 4} textAnchor="end" fontFamily="var(--sx-mono)" fontSize={LABEL_FS} fill={ACCREDITED_COLOR}>
                  Accredited
                </text>
                {accreditedWaveforms.map((wf) => {
                  const x0 = px(wf.freq_low_hz);
                  const x1 = px(wf.freq_high_hz);
                  const w = Math.max(x1 - x0, 4);
                  return (
                    <rect
                      key={wf.id}
                      data-band-state={focusId == null ? 'neutral' : focusId === wf.id ? 'focused' : 'dimmed'}
                      x={x0}
                      y={y}
                      width={w}
                      height={LANE_H}
                      rx="6"
                      fill={ACCREDITED_COLOR}
                      opacity={0.45}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHover({ x: x0 + w / 2, y, accredited: wf })}
                    />
                  );
                })}
              </g>
            );
          })()}

          {/* GNSS constellation band markers (RF axis only) */}
          {showGnss && (
            <g key="gnss-overlay">
              {constellations.flatMap((c) =>
                (c.signal_bands ?? [])
                  .filter((band) => band.freq_mhz >= GNSS_OVERLAY_MIN_MHZ && band.freq_mhz <= GNSS_OVERLAY_MAX_MHZ)
                  .map((band) => {
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
                            y: lanesTop - 8,
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

          {/* axis */}
          <line
            x1={PAD_L - 20}
            y1={axisY}
            x2={vbW - PAD_R + 10}
            y2={axisY}
            stroke="rgba(255,255,255,0.16)"
            strokeWidth="1"
          />
          {ticks.map((t, i) => (
            <text
              key={`tick-${i}`}
              x={t.x}
              y={axisY + 19}
              textAnchor={t.last ? 'end' : 'middle'}
              fontFamily="var(--sx-mono)"
              fontSize="12"
              fill="var(--store-ink-soft)"
            >
              {t.label}
            </text>
          ))}
          <text
            x={(PAD_L + vbW - PAD_R) / 2}
            y={axisY + 42}
            textAnchor="middle"
            fontFamily="var(--sx-ui)"
            fontSize="11"
            fill="var(--store-ink-mute)"
          >
            {unit === 'hz' ? 'Frequency, logarithmic' : 'Wavelength, microns'}
          </text>
        </svg>

        {/* hover tooltip (HTML so text wraps and stays legible) */}
        {hover && (
          <div
            className="glass-popover"
            role="tooltip"
            style={{
              position: 'absolute',
              left: Math.min(Math.max(hover.x - 130, 0), vbW - 260),
              top: hover.y < 96 ? hover.y + LANE_H + 8 : hover.y - 8,
              transform: hover.y < 96 ? undefined : 'translateY(-100%)',
              width: 260,
              padding: '10px 12px',
              pointerEvents: 'none',
              zIndex: 5,
            }}
          >
            {hover.gnss ? (
              <>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#22D3EE' }}>{hover.gnss.constellation}</div>
                <div className="sx-mono" style={{ fontSize: 12, color: 'var(--store-ink-soft)', marginTop: 4 }}>
                  {hover.gnss.band} · {hover.gnss.freqMhz.toFixed(2)} MHz
                </div>
                <div style={{ fontSize: 12, color: 'var(--store-ink-soft)', marginTop: 4, lineHeight: 1.45 }}>
                  Vulnerable: {hover.gnss.platforms.join(', ') || 'none listed'}
                </div>
              </>
            ) : hover.accredited ? (
              <>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--store-ink)' }}>{hover.accredited.label}</div>
                <div className="sx-mono" style={{ fontSize: 12, color: 'var(--store-ink-soft)', marginTop: 4 }}>
                  {hover.accredited.system_id} · {hover.accredited.capability_fn}
                </div>
                <div style={{ fontSize: 12, color: 'var(--store-ink-mute)', marginTop: 4 }}>
                  {hover.accredited.confidence} · accredited
                </div>
              </>
            ) : hover.cap ? (
              <>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--store-ink)', lineHeight: 1.35 }}>{hover.cap.label}</div>
                <div className="sx-mono" style={{ fontSize: 12, color: 'var(--store-ink-soft)', marginTop: 4 }}>
                  {fmtExtent(hover.cap, unit)}
                  {hover.cap.derived ? ' · derived' : ''}
                </div>
                {hover.cap.note && (
                  <div style={{ fontSize: 12, color: 'var(--store-ink-mute)', marginTop: 4, lineHeight: 1.45 }}>{hover.cap.note}</div>
                )}
              </>
            ) : null}
          </div>
        )}
      </div>

      {showGnss && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginTop: 8 }}>
          {constellations.map((c) => (
            <span key={`leg-${c.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--store-ink-soft)' }}>
              <span style={{ width: 14, height: 0, borderTop: `2px dashed ${gnssConstellationColor(c.id)}` }} />
              {c.display_name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function fmtExtent(cap: SpectrumCapability, unit: 'hz' | 'um'): string {
  const ext = capabilityExtent(cap, unit);
  if (!ext) return '';
  if (unit === 'hz') {
    const f = (v: number) =>
      v >= 1e9 ? `${(v / 1e9).toFixed(2)} GHz` : `${(v / 1e6).toFixed(0)} MHz`;
    return ext[0] === ext[1] ? f(ext[0]) : `${f(ext[0])} to ${f(ext[1])}`;
  }
  const f = (v: number) => (v < 1 ? `${(v * 1000).toFixed(0)} nm` : `${v.toFixed(2)} µm`);
  return ext[0] === ext[1] ? f(ext[0]) : `${f(ext[0])} to ${f(ext[1])}`;
}
