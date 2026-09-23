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
import { PlatformIcon } from '@/components/ui/primitives';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* consoles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 44px minmax(0, 1fr)', gap: 12, alignItems: 'stretch' }}>
        <Console side="red" platforms={reds} selected={red} onSelect={(p) => setRedId(p.id)} />
        <div
          aria-hidden
          className="sx-display"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: 'var(--store-ink-mute)', fontSize: 13 }}
        >
          vs
        </div>
        <Console side="blue" platforms={blues} selected={blue} onSelect={(p) => setBlueId(p.id)} />
      </div>

      {/* engagement canvas */}
      <section className="sx-glass" style={{ padding: '18px 22px 20px' }}>
        <div className="seg sm" role="tablist" aria-label="Spectrum axis" style={{ marginBottom: 14 }}>
          {(['rf', 'gnss', 'eo_ir'] as SpectrumAxis[]).map((a) => (
            <button key={a} type="button" role="tab" aria-selected={axis === a} onClick={() => setAxis(a)}>
              {a === 'eo_ir' ? 'EO/IR' : a.toUpperCase()}
            </button>
          ))}
        </div>
        {lanes.length > 0 ? (
          <SpectrumCanvas
            axis={axis}
            lanes={lanes}
            mode="engagement"
            overlaps={axisOverlaps}
            title="Red vs Blue engagement overlay"
            subtitle="Violet hatch: Blue coverage meets a Red dependency"
          />
        ) : (
          <p className="sx-cap" style={{ padding: '30px 0', textAlign: 'center', fontSize: 13 }}>
            No bands on this axis for the current pairing.
          </p>
        )}
      </section>

      {/* outcome */}
      {result && <OutcomePanel result={result} red={red} blue={blue} />}
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
  const accent = isRed ? '#FF8A98' : '#6CB8FF';

  return (
    <section
      className="sx-glass"
      style={{ padding: '18px 20px', borderColor: isRed ? 'rgba(255,92,110,0.28)' : 'rgba(41,151,255,0.28)' }}
      aria-label={isRed ? 'Red threat' : 'Blue effector'}
    >
      <div style={{ fontSize: 12, fontWeight: 600, color: accent }}>{isRed ? 'Red threat' : 'Blue effector'}</div>

      {selected && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginTop: 12 }}>
          <PlatformIcon platform={selected} size={46} />
          <div style={{ minWidth: 0 }}>
            <div className="sx-display" style={{ fontWeight: 600, fontSize: 16, color: 'var(--store-ink)' }}>{selected.name}</div>
            <div className="sx-cap" style={{ marginTop: 2 }}>{selected.category ?? selected.origin}</div>
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
        className="glass-field"
        aria-label={isRed ? 'Choose Red threat' : 'Choose Blue effector'}
        style={{ marginTop: 14, width: '100%', height: 36, padding: '0 10px', fontSize: 13 }}
      >
        {platforms.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      {/* key facts */}
      {selected && (
        <dl style={{ margin: '14px 0 0', display: 'flex', flexDirection: 'column' }}>
          {consoleFacts(selected).map((f) => (
            <div
              key={f.k}
              style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderTop: '1px solid var(--store-line)' }}
            >
              <dt style={{ color: 'var(--store-ink-soft)' }}>{f.k}</dt>
              <dd className="sx-mono" style={{ margin: 0, fontSize: 12, textAlign: 'right', color: f.color ?? 'var(--store-ink)' }}>{f.v}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
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
    facts.push({ k: 'Control link', v: silent ? 'Fibre, no RF' : control ? control.label.split('—')[0].trim() : 'None', color: silent ? 'var(--sx-red)' : undefined });
    facts.push({ k: 'Navigation', v: nav ? 'GNSS' : 'Visual / inertial' });
    if (sensor) facts.push({ k: 'Sensor', v: sensor.label.split('—')[0].trim(), color: 'var(--sx-magenta)' });
  } else {
    const jam = caps.filter((c) => c.fn.startsWith('jam_'));
    const hpm = caps.some((c) => c.fn === 'hpm');
    const detect = caps.some((c) => c.fn.startsWith('detect_'));
    if (hpm) facts.push({ k: 'Effect', v: 'HPM (electronics)', color: '#6CB8FF' });
    else if (jam.length) facts.push({ k: 'Jam bands', v: `${jam.length} bands`, color: '#6CB8FF' });
    if (detect) facts.push({ k: 'Detection', v: 'Active', color: 'var(--sx-cyan)' });
    if (p.range_km != null) facts.push({ k: 'Range', v: `~${p.range_km} km` });
  }
  return facts;
}
