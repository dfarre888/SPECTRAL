'use client';
/**
 * SpectrumWorkspace — the multi-canvas shell (Mockup Frame 05).
 * Segregates the spectrum by physics: RF / GNSS / EO-IR / CBRN tabs.
 * Hosts layer toggles, the selected-platform tray, and view-mode switching.
 * This is the container for the five analysis canvases.
 */

import React, { useMemo, useState } from 'react';
import type { SpectrumAxis, SpectrumLayer, Platform } from '@/lib/spectrum/types';
import { SpectrumCanvas } from '@/components/spectrum/SpectrumCanvas';
import {
  usePlatforms,
  buildLanes,
  referenceBandsFor,
} from './data';
import { assessEngagement } from '@/lib/spectrum/engagement';
import { LAYER_COLOR } from '@/lib/spectrum/scale';
import { OutcomePanel } from './OutcomePanel';
import { BandTileGrid } from './BandTileGrid';
import { PlatformThumbnail } from '@/components/platforms/PlatformThumbnail';

type Mode = 'reference' | 'platform' | 'engagement' | 'tiles';

const AXIS_TABS: { axis: SpectrumAxis; label: string; color: string }[] = [
  { axis: 'rf', label: 'RF / Comms', color: LAYER_COLOR.comms },
  { axis: 'gnss', label: 'GNSS / Nav', color: LAYER_COLOR.navigation },
  { axis: 'eo_ir', label: 'EO / IR', color: LAYER_COLOR.eo_ir },
  { axis: 'cbrn', label: 'CBRN', color: LAYER_COLOR.cbrn },
];

const ALL_LAYERS: SpectrumLayer[] = ['comms', 'navigation', 'radar', 'eo_ir', 'cbrn'];

export function SpectrumWorkspace() {
  const { platforms, source } = usePlatforms();
  const [axis, setAxis] = useState<SpectrumAxis>('rf');
  const [mode, setMode] = useState<Mode>('reference');
  const [activeLayers, setActiveLayers] = useState<Set<SpectrumLayer>>(
    new Set(['comms', 'navigation', 'radar'])
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selected = useMemo(
    () => selectedIds.map((id) => platforms.find((p) => p.id === id)!).filter(Boolean),
    [selectedIds, platforms]
  );
  const red = selected.find((p) => p.side === 'red') ?? null;
  const blue = selected.find((p) => p.side === 'blue') ?? null;

  // auto-switch Reference → Platform when a platform is selected (fix #3)
  // Does not fire when in tiles mode.
  const onToggleSelect = (p: Platform) => {
    setSelectedIds((prev) => {
      const next = prev.includes(p.id)
        ? prev.filter((x) => x !== p.id)
        : [...prev, p.id];
      if (next.length > 0 && (mode === 'reference' || mode === 'tiles')) {
        const haveRed = next.some((id) => platforms.find((x) => x.id === id)?.side === 'red');
        const haveBlue = next.some((id) => platforms.find((x) => x.id === id)?.side === 'blue');
        setMode(haveRed && haveBlue ? 'engagement' : 'platform');
      }
      if (next.length === 0 && mode !== 'tiles') setMode('reference');
      return next;
    });
  };

  // filter selected platforms' caps to active layers for display
  const displayPlatforms = useMemo(() => {
    const src = mode === 'reference' ? platforms : selected;
    return src.map((p) => ({
      ...p,
      capabilities: (p.capabilities ?? []).filter((c) => activeLayers.has(c.layer)),
    }));
  }, [mode, platforms, selected, activeLayers]);

  // 'tiles' is not a canvas mode — fall back to 'reference' for lane building
  const canvasMode = mode === 'tiles' ? 'reference' : mode;

  const lanes = useMemo(
    () => buildLanes(displayPlatforms, axis, canvasMode),
    [displayPlatforms, axis, canvasMode]
  );

  const engagement = useMemo(
    () => (red && blue ? assessEngagement(red, blue) : null),
    [red, blue]
  );

  const axisOverlaps = useMemo(
    () => (engagement ? engagement.overlaps.filter((o) => o.axis === axis) : []),
    [engagement, axis]
  );

  return (
    <div className="sx-glass" style={{ padding: 0, overflow: 'hidden' }}>
      {/* canvas tabs */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: '16px 18px',
          borderBottom: '1px solid var(--sx-glass-line)',
          background: 'rgba(0,0,0,0.2)',
          flexWrap: 'wrap',
        }}
      >
        {AXIS_TABS.map((t) => (
          <button
            key={t.axis}
            onClick={() => setAxis(t.axis)}
            className={axis === t.axis ? 'sx-glass-hi' : 'sx-glass'}
            style={{
              padding: '9px 16px',
              borderRadius: 12,
              fontSize: 12.5,
              fontWeight: 600,
              color: axis === t.axis ? 'var(--sx-ink)' : 'var(--sx-ink-dim)',
              border:
                axis === t.axis
                  ? `1px solid ${t.color}55`
                  : '1px solid var(--sx-glass-line)',
              background: axis === t.axis ? `${t.color}14` : undefined,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span
              className="sx-dot"
              style={{ width: 8, height: 8, color: t.color, background: t.color }}
            />
            {t.label}
          </button>
        ))}
        {/* mode switch */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {(['reference', 'platform', 'engagement', 'tiles'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="sx-glass"
              style={{
                padding: '9px 14px',
                borderRadius: 12,
                fontSize: 11,
                textTransform: 'capitalize',
                color: mode === m ? 'var(--sx-orange-soft)' : 'var(--sx-ink-dim)',
                border:
                  mode === m
                    ? '1px solid rgba(249,115,22,0.35)'
                    : '1px solid var(--sx-glass-line)',
                cursor: 'pointer',
              }}
            >
              {m === 'tiles' ? '⊞ tiles' : m}
            </button>
          ))}
        </div>
      </div>

      {/* tiles mode — full-width, no sidebar */}
      {mode === 'tiles' && (
        <div style={{ padding: 22 }}>
          <BandTileGrid />
        </div>
      )}

      {/* analysis modes — sidebar + canvas */}
      <div
        style={{
          display: mode === 'tiles' ? 'none' : 'grid',
          gridTemplateColumns: '210px 1fr',
          gap: 18,
          padding: 22,
        }}
      >
        {/* sidebar: layers + selection */}
        <div className="sx-glass" style={{ padding: '18px 16px' }}>
          <div
            className="sx-mono sx-faint"
            style={{ fontSize: 10, letterSpacing: '0.12em', marginBottom: 14 }}
          >
            LAYERS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {ALL_LAYERS.map((layer) => {
              const on = activeLayers.has(layer);
              return (
                <button
                  key={layer}
                  onClick={() =>
                    setActiveLayers((prev) => {
                      const next = new Set(prev);
                      next.has(layer) ? next.delete(layer) : next.add(layer);
                      return next;
                    })
                  }
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: 12.5,
                    background: 'none',
                    border: 'none',
                    color: on ? 'var(--sx-ink)' : 'var(--sx-ink-faint)',
                    cursor: 'pointer',
                    opacity: on ? 1 : 0.45,
                    padding: 0,
                    textTransform: 'capitalize',
                  }}
                >
                  <span
                    style={{
                      width: 30,
                      height: 17,
                      borderRadius: 99,
                      background: on ? LAYER_COLOR[layer] : 'rgba(255,255,255,0.1)',
                      position: 'relative',
                      boxShadow: on ? `0 0 12px ${LAYER_COLOR[layer]}80` : 'none',
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: 2,
                        [on ? 'right' : 'left']: 2,
                        width: 13,
                        height: 13,
                        borderRadius: '50%',
                        background: on ? '#fff' : 'var(--sx-ink-faint)',
                      }}
                    />
                  </span>
                  {layer === 'eo_ir' ? 'EO / IR' : layer}
                </button>
              );
            })}
          </div>

          <div
            className="sx-mono sx-faint"
            style={{ fontSize: 10, letterSpacing: '0.12em', margin: '20px 0 12px' }}
          >
            SELECTED ({selected.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {selected.length === 0 && (
              <div className="sx-faint" style={{ fontSize: 11 }}>
                Pick platforms from the library.
              </div>
            )}
            {selected.map((p) => (
              <div
                key={p.id}
                className="sx-glass"
                style={{
                  padding: '8px 11px',
                  borderRadius: 10,
                  fontSize: 11,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  borderColor:
                    p.side === 'red'
                      ? 'rgba(248,113,113,0.25)'
                      : 'rgba(74,158,255,0.25)',
                }}
              >
                <PlatformThumbnail id={p.id} name={p.name} size="xs" rounded="sm" />
                {p.name}
              </div>
            ))}
          </div>
          {source === 'seed' && (
            <div className="sx-faint" style={{ fontSize: 9, marginTop: 14, opacity: 0.6 }}>
              data: bundled seed
            </div>
          )}
        </div>

        {/* canvas */}
        <div className="sx-glass" style={{ padding: 22 }}>
          <SpectrumCanvas
            axis={axis}
            lanes={lanes}
            mode={canvasMode}
            overlaps={axisOverlaps}
            referenceBands={canvasMode === 'reference' || canvasMode === 'platform' ? referenceBandsFor(axis) : []}
            title={axisTitle(axis)}
            subtitle={axisSubtitle(axis)}
          />
          {canvasMode === 'engagement' && engagement && (
            <div style={{ marginTop: 16 }}>
              <OutcomePanel result={engagement} red={red} blue={blue} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function axisTitle(a: SpectrumAxis): string {
  return {
    rf: 'RF Spectrum — Comms, Datalink & Radar',
    gnss: 'GNSS / NAVWAR — L-band detail',
    eo_ir: 'EO / IR — optical spectrum',
    cbrn: 'CBRN — ionising (payload detection)',
  }[a];
}
function axisSubtitle(a: SpectrumAxis): string {
  return {
    rf: 'LOG SCALE · 3 MHz → 40 GHz',
    gnss: 'L-BAND · 1.1 – 1.7 GHz',
    eo_ir: 'WAVELENGTH · 0.2 – 14 µm',
    cbrn: 'X-RAY → GAMMA',
  }[a];
}
