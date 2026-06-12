'use client';
/**
 * EngagementPlanner — the teaching core (Mockup Frame 04).
 * Pick a Red threat and a Blue effector; read the outcome. Renders the
 * Red-vs-Blue engagement canvas (Frame 09) and the OutcomePanel.
 */

import React, { useMemo, useState } from 'react';
import type { Platform, Side, SpectrumAxis } from '@/lib/spectrum/types';
import { usePlatforms, buildLanes } from './data';
import { assessEngagement } from '@/lib/spectrum/engagement';
import { SpectrumCanvas } from '@/components/spectrum/SpectrumCanvas';
import { OutcomePanel } from './OutcomePanel';
import { GlassCard, PlatformIcon } from '@/components/ui/primitives';
import { LAYER_COLOR } from '@/lib/spectrum/scale';

export function EngagementPlanner({
  initialRed,
  initialBlue,
}: {
  initialRed?: string;
  initialBlue?: string;
}) {
  const { platforms } = usePlatforms();
  const reds = platforms.filter((p) => p.side === 'red');
  const blues = platforms.filter((p) => p.side === 'blue');

  const [redId, setRedId] = useState<string | null>(initialRed ?? reds[0]?.id ?? null);
  const [blueId, setBlueId] = useState<string | null>(initialBlue ?? blues[0]?.id ?? null);
  const [axis, setAxis] = useState<SpectrumAxis>('rf');

  const red = useMemo(() => platforms.find((p) => p.id === redId) ?? null, [platforms, redId]);
  const blue = useMemo(() => platforms.find((p) => p.id === blueId) ?? null, [platforms, blueId]);

  const result = useMemo(() => (red && blue ? assessEngagement(red, blue) : null), [red, blue]);

  const lanes = useMemo(() => {
    const sel = [red, blue].filter(Boolean) as Platform[];
    return buildLanes(sel, axis, 'engagement');
  }, [red, blue, axis]);

  const axisOverlaps = useMemo(
    () => (result ? result.overlaps.filter((o) => o.axis === axis) : []),
    [result, axis]
  );

  return (
    <div>
      {/* consoles */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 64px 1fr', gap: 16, alignItems: 'stretch' }}>
        <Console
          side="red"
          platforms={reds}
          selected={red}
          onSelect={(p) => setRedId(p.id)}
        />
        <div
          className="sx-display"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            color: 'var(--sx-ink-faint)',
            fontSize: 13,
          }}
        >
          VS
        </div>
        <Console
          side="blue"
          platforms={blues}
          selected={blue}
          onSelect={(p) => setBlueId(p.id)}
        />
      </div>

      {/* engagement canvas */}
      <GlassCard style={{ padding: 22, borderRadius: 18, marginTop: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {(['rf', 'gnss', 'eo_ir'] as SpectrumAxis[]).map((a) => (
            <button
              key={a}
              onClick={() => setAxis(a)}
              className="sx-glass"
              style={{
                padding: '7px 13px',
                borderRadius: 10,
                fontSize: 11,
                color: axis === a ? 'var(--sx-ink)' : 'var(--sx-ink-dim)',
                border: axis === a ? '1px solid var(--sx-glass-line-hi)' : '1px solid var(--sx-glass-line)',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              {a === 'eo_ir' ? 'EO/IR' : a}
            </button>
          ))}
        </div>
        {lanes.length > 0 ? (
          <SpectrumCanvas
            axis={axis}
            lanes={lanes}
            mode="engagement"
            overlaps={axisOverlaps}
            title="Red vs Blue — engagement overlay"
            subtitle="purple hatch = coverage meets dependency"
          />
        ) : (
          <div className="sx-faint" style={{ fontSize: 12, padding: '30px 0', textAlign: 'center' }}>
            No bands on this axis for the current pairing.
          </div>
        )}
      </GlassCard>

      {/* outcome */}
      {result && (
        <div style={{ marginTop: 16 }}>
          <OutcomePanel result={result} red={red} blue={blue} />
        </div>
      )}
    </div>
  );
}

function Console({
  side,
  platforms,
  selected,
  onSelect,
}: {
  side: Side;
  platforms: Platform[];
  selected: Platform | null;
  onSelect: (p: Platform) => void;
}) {
  const isRed = side === 'red';
  const accent = isRed ? 'var(--sx-red)' : 'var(--sx-blue)';
  const border = isRed ? 'rgba(248,113,113,0.22)' : 'rgba(74,158,255,0.22)';
  const bg = isRed
    ? 'linear-gradient(180deg, rgba(248,113,113,0.06), rgba(255,255,255,0.015))'
    : 'linear-gradient(180deg, rgba(74,158,255,0.06), rgba(255,255,255,0.015))';

  return (
    <div className="sx-glass" style={{ padding: 20, borderColor: border, background: bg }}>
      <div className="sx-mono" style={{ fontSize: 10, letterSpacing: '0.16em', color: accent }}>
        {isRed ? 'RED — THREAT' : 'BLUE — EFFECTOR'}
      </div>

      {selected && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginTop: 14 }}>
          <PlatformIcon platform={selected} size={46} />
          <div>
            <div className="sx-display" style={{ fontWeight: 600, fontSize: 15 }}>{selected.name}</div>
            <div className="sx-faint" style={{ fontSize: 11 }}>{selected.category ?? selected.origin}</div>
          </div>
        </div>
      )}

      {/* selector */}
      <select
        value={selected?.id ?? ''}
        onChange={(e) => {
          const p = platforms.find((x) => x.id === e.target.value);
          if (p) onSelect(p);
        }}
        className="sx-glass"
        style={{
          marginTop: 16,
          width: '100%',
          padding: '10px 12px',
          borderRadius: 11,
          background: 'rgba(0,0,0,0.3)',
          color: 'var(--sx-ink)',
          fontSize: 12,
          fontFamily: 'var(--sx-ui)',
          border: '1px solid var(--sx-glass-line)',
          outline: 'none',
        }}
      >
        {platforms.map((p) => (
          <option key={p.id} value={p.id} style={{ background: '#0a0c0e' }}>
            {p.name}
          </option>
        ))}
      </select>

      {/* key facts */}
      {selected && (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {consoleFacts(selected).map((f) => (
            <div key={f.k} style={{ fontSize: 11, display: 'flex', justifyContent: 'space-between' }}>
              <span className="sx-dim">{f.k}</span>
              <span className="sx-mono" style={{ color: f.color ?? 'var(--sx-ink-faint)' }}>{f.v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function consoleFacts(p: Platform): { k: string; v: string; color?: string }[] {
  const caps = p.capabilities ?? [];
  const facts: { k: string; v: string; color?: string }[] = [];
  if (p.side === 'red') {
    const control = caps.find((c) => c.fn === 'control' || c.fn === 'datalink');
    const nav = caps.find((c) => c.fn === 'navigation');
    const sensor = caps.find((c) => c.fn === 'sensor');
    const silent = caps.some((c) => (c.defeat_resistance ?? []).includes('rf_silent'));
    facts.push({ k: 'Control link', v: silent ? 'fibre — no RF' : control ? control.label.split('—')[0].trim() : 'none', color: silent ? 'var(--sx-red)' : undefined });
    facts.push({ k: 'Navigation', v: nav ? 'GNSS' : 'visual / inertial' });
    if (sensor) facts.push({ k: 'Sensor', v: sensor.label.split('—')[0].trim(), color: 'var(--sx-magenta)' });
  } else {
    const jam = caps.filter((c) => c.fn.startsWith('jam_'));
    const hpm = caps.some((c) => c.fn === 'hpm');
    const detect = caps.some((c) => c.fn.startsWith('detect_'));
    if (hpm) facts.push({ k: 'Effect', v: 'HPM — electronics', color: 'var(--sx-blue)' });
    else if (jam.length) facts.push({ k: 'Jam bands', v: `${jam.length} bands`, color: 'var(--sx-blue)' });
    if (detect) facts.push({ k: 'Detection', v: 'active', color: 'var(--sx-cyan)' });
    if (p.range_km != null) facts.push({ k: 'Range', v: `~${p.range_km} km` });
  }
  return facts;
}
