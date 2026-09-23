'use client';
/**
 * RadarSpectrum — the radar EW band view.
 * A dedicated spectrum canvas for radar systems: every catalogued radar plotted
 * by its actual frequency span across HF→Ka, split Red (threat) vs Blue
 * (friendly). Hover for band, range, mobility, and what it can/can't detect.
 * Below the chart, the same radars as a sortable order-of-battle table;
 * selecting a row lights its bar.
 *
 * This is the "another EW spectrum for radar" the brief asked for — distinct
 * from the comms RF canvas because the lanes are sides and the intel surfaced
 * is radar-specific (mobility, detection envelope).
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import type { RadarSystem, RadarBand } from '@/lib/spectrum/radar-types';
import { RADAR_BAND_HZ } from '@/lib/spectrum/radar-types';
import { RADAR_BAND_INFO, RADAR_SPECTRUM_BANDS } from '@/lib/spectrum/radar-band-info';
import { useRadars } from './radar-data';
import { getAxisConfig, makeLogScale } from '@/lib/spectrum/scale';
import { formatCatalogDisplayName } from '@/lib/map/catalog-display-name';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';

const MIN_W = 560;
const PAD_L = 76;
const PAD_R = 28;
const BAND_HEADER_H = 26;

const ROLE_LABEL = (r: string) => r.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
const fmtHz = (v: number) =>
  v >= 1e9 ? `${+(v / 1e9).toFixed(2)} GHz` : v >= 1e6 ? `${+(v / 1e6).toFixed(0)} MHz` : `${+(v / 1e3).toFixed(0)} kHz`;

export function RadarSpectrum({ onSelect, selectedIds = [] }: { onSelect?: (r: RadarSystem) => void; selectedIds?: string[] }) {
  const radars = useRadars();
  const [hover, setHover] = useState<RadarSystem | null>(null);
  const [hoverBand, setHoverBand] = useState<RadarBand | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('all');
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

  const cfg = useMemo(() => getAxisConfig('rf', [PAD_L, vbW - PAD_R]), [vbW]);
  const scale = useMemo(() => makeLogScale(cfg.domain, cfg.range), [cfg]);

  const filtered = useMemo(
    () => (roleFilter === 'all' ? radars : radars.filter((r) => r.role === roleFilter)),
    [radars, roleFilter]
  );
  const red = filtered.filter((r) => r.side === 'red');
  const blue = filtered.filter((r) => r.side === 'blue');
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  // stack radars into rows within each side so overlapping bands don't collide
  const redRows = packRows(red, scale);
  const blueRows = packRows(blue, scale);

  const ROW_H = 16;
  const ROW_GAP = 4;
  const blueTop = BAND_HEADER_H + 30;
  const blueH = blueRows.length * (ROW_H + ROW_GAP);
  const axisY = blueTop + blueH + 12;
  const redTop = axisY + 40;
  const redH = redRows.length * (ROW_H + ROW_GAP);
  const vbH = redTop + redH + 12;

  const bandGuides = RADAR_SPECTRUM_BANDS.map((b) => ({
    band: b,
    x0: scale(RADAR_BAND_HZ[b][0]),
    x1: scale(RADAR_BAND_HZ[b][1]),
  }));

  const clearHover = () => {
    setHover(null);
    setHoverBand(null);
  };

  const roles = ['all', 'early_warning', 'acquisition', 'engagement', 'multifunction', 'counter_uas', 'counter_battery', 'naval_multifunction', 'airborne_fire_control'];

  const bar = (r: RadarSystem, y: number, fill: string) => {
    const x0 = scale(r.freq_low_hz);
    const x1 = scale(r.freq_high_hz);
    const sel = selected.has(r.id);
    const dim = selected.size > 0 && !sel;
    return (
      <rect
        key={r.id}
        data-band-state={hover ? (hover.id === r.id ? 'focused' : 'dimmed') : 'neutral'}
        x={x0}
        y={y}
        width={Math.max(x1 - x0, 6)}
        height={ROW_H}
        rx={5}
        fill={fill}
        opacity={dim ? 0.3 : sel ? 1 : 0.82}
        stroke={sel ? '#fff' : 'none'}
        strokeWidth={sel ? 1.5 : 0}
        style={{ cursor: 'pointer' }}
        onMouseEnter={() => {
          setHover(r);
          setHoverBand(null);
        }}
        onClick={() => onSelect?.(r)}
      >
        <title>{formatCatalogDisplayName({ name: r.name, natoName: r.nato_name, parentSystem: r.associated_system })}</title>
      </rect>
    );
  };

  const columns = useMemo<DataColumn<RadarSystem>[]>(
    () => [
      {
        key: 'name',
        header: 'Radar',
        sticky: true,
        width: 280,
        sortValue: (r) => formatCatalogDisplayName({ name: r.name, natoName: r.nato_name, parentSystem: r.associated_system }),
        cell: (r) => {
          const label = formatCatalogDisplayName({ name: r.name, natoName: r.nato_name, parentSystem: r.associated_system });
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <span className="primary" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={label}>
                {label}
              </span>
              {selected.has(r.id) && <Check size={15} aria-label="Selected" style={{ color: 'var(--wb-blue)', flexShrink: 0 }} />}
            </div>
          );
        },
      },
      {
        key: 'side',
        header: 'Side',
        width: 84,
        sortValue: (r) => (r.side === 'red' ? 0 : r.side === 'blue' ? 1 : 2),
        cell: (r) => <span className={r.side === 'red' ? 'tag red' : r.side === 'blue' ? 'tag blue' : 'tag'}>{r.side === 'red' ? 'Red' : r.side === 'blue' ? 'Blue' : 'Neutral'}</span>,
      },
      { key: 'origin', header: 'Origin', width: 150, className: 'clip', sortValue: (r) => r.origin, cell: (r) => <span title={r.origin}>{r.origin}</span> },
      { key: 'role', header: 'Role', width: 170, className: 'clip', sortValue: (r) => r.role, cell: (r) => ROLE_LABEL(r.role) },
      { key: 'bands', header: 'Bands', width: 96, className: 'mono', sortValue: (r) => r.freq_low_hz, cell: (r) => r.bands.join('/') },
      {
        key: 'freq',
        header: 'Frequency',
        width: 190,
        className: 'mono',
        sortValue: (r) => r.freq_low_hz,
        cell: (r) => (r.freq_low_hz === r.freq_high_hz ? fmtHz(r.freq_low_hz) : `${fmtHz(r.freq_low_hz)} to ${fmtHz(r.freq_high_hz)}`),
      },
      { key: 'range', header: 'Range km', width: 100, align: 'right', sortValue: (r) => r.instrumented_range_km ?? null, cell: (r) => r.instrumented_range_km ?? '' },
      { key: 'uas', header: 'vs small UAS km', width: 140, align: 'right', sortValue: (r) => r.range_vs_small_uas_km ?? null, cell: (r) => r.range_vs_small_uas_km ?? '' },
      { key: 'mobility', header: 'Mobility', width: 130, sortValue: (r) => r.mobility, cell: (r) => ROLE_LABEL(r.mobility) },
      { key: 'antenna', header: 'Antenna', width: 104, sortValue: (r) => r.antenna, cell: (r) => r.antenna },
      {
        key: 'eccm',
        header: 'ECCM',
        width: 90,
        sortValue: (r) => (r.eccm === 'high' ? 0 : r.eccm === 'medium' ? 1 : r.eccm === 'low' ? 2 : null),
        cell: (r) => (r.eccm ? <span className={r.eccm === 'high' ? 'tag green' : r.eccm === 'medium' ? 'tag amber' : 'tag red'}>{ROLE_LABEL(r.eccm)}</span> : ''),
      },
      {
        key: 'sees',
        header: 'Detects',
        width: 280,
        className: 'clip',
        cell: (r) => {
          const t = r.can_detect.map((d) => d.replace(/_/g, ' ')).join(', ');
          return <span title={t}>{t}</span>;
        },
      },
      {
        key: 'blind',
        header: 'Blind to',
        width: 220,
        className: 'clip',
        cell: (r) => {
          const t = r.cannot_detect.map((d) => d.replace(/_/g, ' ')).join(', ');
          return <span title={t} style={{ color: 'var(--store-ink-mute)' }}>{t}</span>;
        },
      },
    ],
    [selected],
  );
  const tableMin = columns.reduce((n, c) => n + (typeof c.width === 'number' ? c.width : 0), 0);

  const hoverCard = (() => {
    if (!hover) return null;
    const cx = (scale(hover.freq_low_hz) + scale(hover.freq_high_hz)) / 2;
    const W = 300;
    const left = Math.min(Math.max(cx - W / 2, 0), vbW - W);
    const below = hover.side === 'blue';
    const top = below ? axisY + 8 : redTop - 8;
    return (
      <div
        className="glass-popover"
        role="tooltip"
        style={{
          position: 'absolute',
          left,
          top,
          width: W,
          transform: below ? undefined : 'translateY(-100%)',
          padding: '10px 12px',
          pointerEvents: 'none',
          zIndex: 5,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--store-ink)', lineHeight: 1.35 }}>
          {formatCatalogDisplayName({ name: hover.name, natoName: hover.nato_name, parentSystem: hover.associated_system })}
        </div>
        <div className="sx-mono" style={{ fontSize: 12, marginTop: 4, color: hover.side === 'blue' ? '#6CB8FF' : '#FF8A98' }}>
          {hover.bands.join('/')}-band · {hover.mobility.replace('_', '-')} · about {hover.instrumented_range_km ?? '?'} km
        </div>
        <div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.45, color: 'var(--store-ink-soft)' }}>
          Sees: {hover.can_detect.slice(0, 4).map((d) => d.replace(/_/g, ' ')).join(', ')}
        </div>
        <div style={{ fontSize: 12, marginTop: 2, lineHeight: 1.45, color: 'var(--store-ink-mute)' }}>
          Blind to: {hover.cannot_detect.map((d) => d.replace(/_/g, ' ')).join(', ') || 'none listed'}
          {hover.can_detect.includes('stealth') ? '; counter-stealth' : ''}
        </div>
      </div>
    );
  })();

  const bandCard = (() => {
    if (!hoverBand || hover) return null;
    const info = RADAR_BAND_INFO[hoverBand];
    const guide = bandGuides.find((g) => g.band === hoverBand);
    const cx = guide ? (guide.x0 + guide.x1) / 2 : vbW / 2;
    const W = 340;
    const left = Math.min(Math.max(cx - W / 2, 0), vbW - W);
    return (
      <div
        className="glass-popover"
        role="tooltip"
        style={{ position: 'absolute', left, top: BAND_HEADER_H + 6, width: W, padding: '10px 12px', pointerEvents: 'none', zIndex: 5 }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: '#67E8F9' }}>{info.band}-band</div>
        <div className="sx-mono" style={{ fontSize: 12, marginTop: 3, color: 'var(--store-ink-soft)' }}>
          {info.frequency} · λ {info.wavelength}
        </div>
        <div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.45, color: 'var(--store-ink)' }}>{info.summary}</div>
        <div style={{ fontSize: 12, marginTop: 4, lineHeight: 1.45, color: 'var(--store-ink-soft)' }}>Typical: {info.typicalRoles}</div>
        <div style={{ fontSize: 12, marginTop: 4, lineHeight: 1.45, color: 'var(--store-ink-mute)' }}>{info.tradeoff}</div>
      </div>
    );
  })();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <section className="sx-glass" style={{ padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: '8px 16px' }}>
          <h2 className="sx-h">Radar spectrum: EW band layout</h2>
          <span style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <Legend color="var(--sx-blue)" label={`Blue friendly (${blue.length})`} />
            <Legend color="var(--sx-red)" label={`Red threat (${red.length})`} />
          </span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="glass-field"
            aria-label="Filter by role"
            style={{ marginLeft: 'auto', height: 34, padding: '0 10px', fontSize: 13 }}
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {r === 'all' ? 'All roles' : ROLE_LABEL(r)}
              </option>
            ))}
          </select>
        </div>

        <div ref={wrapRef} style={{ position: 'relative' }}>
          <svg
            viewBox={`0 0 ${vbW} ${vbH}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
            onMouseLeave={clearHover}
              aria-label="Radar systems by frequency span"
          >
            {/* band guide columns */}
            {bandGuides.map((g, i) => {
              const active = hoverBand === g.band;
              return (
                <g key={g.band}>
                  <rect x={g.x0} y={BAND_HEADER_H} width={Math.max(g.x1 - g.x0, 2)} height={vbH - BAND_HEADER_H} fill={i % 2 ? 'rgba(255,255,255,0.012)' : 'rgba(255,255,255,0.03)'} />
                  <rect
                    x={g.x0}
                    y={0}
                    width={Math.max(g.x1 - g.x0, 2)}
                    height={BAND_HEADER_H}
                    rx={6}
                    fill={active ? 'rgba(6,182,212,0.14)' : 'transparent'}
                    style={{ cursor: 'help' }}
                    onMouseEnter={() => {
                      setHoverBand(g.band);
                      setHover(null);
                    }}
                  />
                  <text
                    x={(g.x0 + g.x1) / 2}
                    y={17}
                    textAnchor="middle"
                    fontFamily="var(--sx-mono)"
                    fontSize="12"
                    fill={active ? '#67E8F9' : 'var(--store-ink-soft)'}
                    style={{ pointerEvents: 'none' }}
                  >
                    {g.band}
                  </text>
                </g>
              );
            })}

            {/* side labels */}
            <text x={PAD_L - 12} y={blueTop + 14} textAnchor="end" fontFamily="var(--sx-ui)" fontSize="12" fontWeight="600" fill="#6CB8FF">Blue</text>
            <text x={PAD_L - 12} y={redTop + 14} textAnchor="end" fontFamily="var(--sx-ui)" fontSize="12" fontWeight="600" fill="#FF8A98">Red</text>

            {/* blue radars */}
            {blueRows.map((row, ri) => row.map((r) => bar(r, blueTop + ri * (ROW_H + ROW_GAP), 'var(--sx-blue)')))}

            {/* axis */}
            <line x1={PAD_L - 20} y1={axisY} x2={vbW - PAD_R + 10} y2={axisY} stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
            {cfg.ticks.map((t, i) => (
              <text
                key={i}
                x={scale(t.value)}
                y={axisY + 20}
                textAnchor={i === cfg.ticks.length - 1 ? 'end' : 'middle'}
                fontFamily="var(--sx-mono)"
                fontSize="12"
                fill="var(--store-ink-soft)"
              >
                {t.label}
              </text>
            ))}

            {/* red radars */}
            {redRows.map((row, ri) => row.map((r) => bar(r, redTop + ri * (ROW_H + ROW_GAP), 'var(--sx-red)')))}
          </svg>
          {bandCard}
          {hoverCard}
        </div>

        <p className="sx-cap" style={{ marginTop: 12, lineHeight: 1.5, maxWidth: '90ch' }}>
          Hover a band letter for IEEE band doctrine, or a bar for range, mobility and detection envelope. Lower bands (left)
          trade resolution for range and counter-stealth; higher bands (right) resolve finer at shorter range.
        </p>
      </section>

      <section>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
          <h2 className="sx-h">Order of battle</h2>
          <span className="sx-cap">
            <span className="sx-mono">{filtered.length}</span> radars. Click a row to light its bar.
          </span>
        </div>
        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(r) => r.id}
          onRowClick={(r) => onSelect?.(r)}
          compact
          className="sx-dt-fixed"
          style={{ '--sx-dt-min': `${tableMin}px` } as React.CSSProperties}
          maxHeight="max(360px, calc(100vh - 330px))"
          defaultSort={{ key: 'freq', dir: 'asc' }}
          caption="Radar order of battle"
          empty="No radars for this role."
        />
      </section>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--store-ink-soft)' }}>
      <span style={{ width: 11, height: 11, borderRadius: 3, background: color }} />
      {label}
    </span>
  );
}

/** Greedy row-packing so overlapping frequency bars don't visually collide. */
function packRows(radars: RadarSystem[], scale: (v: number) => number): RadarSystem[][] {
  const sorted = [...radars].sort((a, b) => a.freq_low_hz - b.freq_low_hz);
  const rows: { end: number; items: RadarSystem[] }[] = [];
  for (const r of sorted) {
    const x0 = scale(r.freq_low_hz);
    const x1 = Math.max(scale(r.freq_high_hz), x0 + 6);
    let placed = false;
    for (const row of rows) {
      if (x0 > row.end + 8) {
        row.items.push(r);
        row.end = x1;
        placed = true;
        break;
      }
    }
    if (!placed) rows.push({ end: x1, items: [r] });
  }
  return rows.map((r) => r.items);
}
