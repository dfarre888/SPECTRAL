'use client';
/**
 * RadarSpectrum — the radar EW band view.
 * A dedicated spectrum canvas for radar systems: every catalogued radar plotted
 * by its actual frequency span across HF→Ka, split Red (threat) vs Blue
 * (friendly). Hover for band, range, mobility, and what it can/can't detect.
 *
 * This is the "another EW spectrum for radar" the brief asked for — distinct
 * from the comms RF canvas because the lanes are sides and the intel surfaced
 * is radar-specific (mobility, detection envelope).
 */

import React, { useMemo, useState } from 'react';
import type { RadarSystem, RadarBand } from '@/lib/spectrum/radar-types';
import { RADAR_BAND_HZ } from '@/lib/spectrum/radar-types';
import { useRadars } from './radar-data';
import { getAxisConfig, makeLogScale } from '@/lib/spectrum/scale';
import { GlassCard } from '@/components/ui/primitives';

const VB_W = 960;
const PAD_L = 70;
const PAD_R = 30;

export function RadarSpectrum({ onSelect, selectedIds = [] }: { onSelect?: (r: RadarSystem) => void; selectedIds?: string[] }) {
  const radars = useRadars();
  const [hover, setHover] = useState<RadarSystem | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const cfg = useMemo(() => getAxisConfig('rf', [PAD_L, VB_W - PAD_R]), []);
  const scale = useMemo(() => makeLogScale(cfg.domain, cfg.range), [cfg]);

  const filtered = useMemo(
    () => (roleFilter === 'all' ? radars : radars.filter((r) => r.role === roleFilter)),
    [radars, roleFilter]
  );
  const red = filtered.filter((r) => r.side === 'red');
  const blue = filtered.filter((r) => r.side === 'blue');

  // stack radars into rows within each side so overlapping bands don't collide
  const redRows = packRows(red, scale);
  const blueRows = packRows(blue, scale);

  const ROW_H = 22;
  const ROW_GAP = 5;
  const blueTop = 56;
  const blueH = blueRows.length * (ROW_H + ROW_GAP);
  const axisY = blueTop + blueH + 30;
  const redTop = axisY + 30;
  const redH = redRows.length * (ROW_H + ROW_GAP);
  const vbH = redTop + redH + 30;

  const bandGuides = (['HF', 'VHF', 'UHF', 'L', 'S', 'C', 'X', 'Ku', 'K', 'Ka'] as RadarBand[]).map((b) => ({
    band: b,
    x0: scale(RADAR_BAND_HZ[b][0]),
    x1: scale(RADAR_BAND_HZ[b][1]),
  }));

  const roles = ['all', 'early_warning', 'acquisition', 'engagement', 'multifunction', 'counter_uas', 'counter_battery', 'naval_multifunction', 'airborne_fire_control'];

  return (
    <GlassCard style={{ padding: 22, borderRadius: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div className="sx-display" style={{ fontWeight: 600, fontSize: 14 }}>Radar Spectrum — EW band layout</div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="sx-glass"
          style={{ marginLeft: 'auto', padding: '7px 11px', borderRadius: 10, background: 'rgba(0,0,0,0.3)', color: 'var(--sx-ink)', fontSize: 11, border: '1px solid var(--sx-glass-line)', fontFamily: 'var(--sx-ui)' }}
        >
          {roles.map((r) => (
            <option key={r} value={r} style={{ background: '#0a0c0e' }}>
              {r === 'all' ? 'All roles' : r.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      <svg viewBox={`0 0 ${VB_W} ${vbH}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: 'auto', overflow: 'visible' }} onMouseLeave={() => setHover(null)}>
        {/* band guide columns */}
        {bandGuides.map((g, i) => (
          <g key={g.band}>
            <rect x={g.x0} y={20} width={Math.max(g.x1 - g.x0, 2)} height={vbH - 50} fill={i % 2 ? 'rgba(255,255,255,0.015)' : 'rgba(255,255,255,0.03)'} />
            <text x={(g.x0 + g.x1) / 2} y={16} textAnchor="middle" fontFamily="var(--sx-mono)" fontSize="9" fill="var(--sx-ink-faint)">{g.band}</text>
          </g>
        ))}

        {/* side labels */}
        <text x={PAD_L - 12} y={blueTop - 8} textAnchor="end" fontFamily="var(--sx-mono)" fontSize="10" fill="var(--sx-blue)">BLUE ▲</text>
        <text x={PAD_L - 12} y={redTop - 8} textAnchor="end" fontFamily="var(--sx-mono)" fontSize="10" fill="var(--sx-red)">RED ▼</text>

        {/* blue radars */}
        {blueRows.map((row, ri) =>
          row.map((r) => {
            const x0 = scale(r.freq_low_hz);
            const x1 = scale(r.freq_high_hz);
            const sel = selectedIds.includes(r.id);
            return (
              <rect
                key={r.id}
                x={x0}
                y={blueTop + ri * (ROW_H + ROW_GAP)}
                width={Math.max(x1 - x0, 6)}
                height={ROW_H}
                rx={5}
                fill="var(--sx-blue)"
                opacity={hover && hover.id !== r.id ? 0.35 : sel ? 1 : 0.8}
                stroke={sel ? '#fff' : 'none'}
                strokeWidth={sel ? 1.2 : 0}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHover(r)}
                onClick={() => onSelect?.(r)}
              />
            );
          })
        )}

        {/* axis */}
        <line x1={PAD_L - 20} y1={axisY} x2={VB_W - PAD_R + 10} y2={axisY} stroke="var(--sx-glass-line)" strokeWidth="1" />
        {cfg.ticks.map((t, i) => (
          <text key={i} x={scale(t.value)} y={axisY + 15} textAnchor="middle" fontFamily="var(--sx-mono)" fontSize="9" fill="var(--sx-ink-dim)">{t.label}</text>
        ))}

        {/* red radars */}
        {redRows.map((row, ri) =>
          row.map((r) => {
            const x0 = scale(r.freq_low_hz);
            const x1 = scale(r.freq_high_hz);
            const sel = selectedIds.includes(r.id);
            return (
              <rect
                key={r.id}
                x={x0}
                y={redTop + ri * (ROW_H + ROW_GAP)}
                width={Math.max(x1 - x0, 6)}
                height={ROW_H}
                rx={5}
                fill="var(--sx-red)"
                opacity={hover && hover.id !== r.id ? 0.35 : sel ? 1 : 0.8}
                stroke={sel ? '#fff' : 'none'}
                strokeWidth={sel ? 1.2 : 0}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHover(r)}
                onClick={() => onSelect?.(r)}
              />
            );
          })
        )}

        {/* hover card */}
        {hover && (
          <g pointerEvents="none">
            {(() => {
              const cx = (scale(hover.freq_low_hz) + scale(hover.freq_high_hz)) / 2;
              const bx = Math.min(Math.max(cx - 120, 4), VB_W - 244);
              const by = hover.side === 'blue' ? blueTop + blueH + 4 : redTop - 78;
              return (
                <>
                  <rect x={bx} y={by} width={240} height={70} rx={9} fill="rgba(8,10,12,0.97)" stroke="var(--sx-glass-line-hi)" />
                  <text x={bx + 12} y={by + 18} fontFamily="var(--sx-ui)" fontSize="11" fontWeight="700" fill="var(--sx-ink)">{hover.name}{hover.nato_name ? ` · ${hover.nato_name}` : ''}</text>
                  <text x={bx + 12} y={by + 33} fontFamily="var(--sx-mono)" fontSize="9" fill={hover.side === 'blue' ? 'var(--sx-blue)' : 'var(--sx-red)'}>{hover.bands.join('/')}-band · {hover.mobility.replace('_', '-')} · ~{hover.instrumented_range_km ?? '?'} km</text>
                  <text x={bx + 12} y={by + 47} fontFamily="var(--sx-ui)" fontSize="9" fill="var(--sx-ink-dim)">Sees: {hover.can_detect.slice(0, 4).join(', ')}</text>
                  <text x={bx + 12} y={by + 60} fontFamily="var(--sx-ui)" fontSize="9" fill="var(--sx-ink-faint)">Blind to: {hover.cannot_detect.join(', ') || '—'}{hover.can_detect.includes('stealth') ? ' · counter-stealth' : ''}</text>
                </>
              );
            })()}
          </g>
        )}
      </svg>

      <div style={{ display: 'flex', gap: 18, marginTop: 8, flexWrap: 'wrap' }}>
        <Legend color="var(--sx-red)" label={`Red threat radars (${red.length})`} />
        <Legend color="var(--sx-blue)" label={`Blue friendly radars (${blue.length})`} />
        <span className="sx-faint" style={{ fontSize: 10 }}>Hover a bar for band · range · mobility · detection envelope. Lower bands (left) = longer range & counter-stealth; higher bands (right) = higher resolution, shorter range.</span>
      </div>
    </GlassCard>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: 'var(--sx-ink-dim)' }}>
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
      if (x0 > row.end + 70) {
        // 70px label gap
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
