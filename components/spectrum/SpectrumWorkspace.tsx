'use client';
/**
 * SpectrumWorkspace: the multi-canvas shell (Mockup Frame 05).
 * Segregates the spectrum by physics: RF / GNSS / EO-IR / CBRN tabs.
 * Hosts layer toggles, the selected-platform tray, and view-mode switching.
 * This is the container for the five analysis canvases.
 */

import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
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
import type { AccreditedWaveformProfile } from '@/lib/operations/accredited-supplements-data';
import type { GnssConstellation, GnssPlatformDependency } from '@/lib/gnss/gnss-types';

type Mode = 'reference' | 'platform' | 'engagement' | 'tiles';

const AXIS_TABS: { axis: SpectrumAxis; label: string; color: string }[] = [
  { axis: 'rf', label: 'RF / Comms', color: LAYER_COLOR.comms },
  { axis: 'gnss', label: 'GNSS / Nav', color: LAYER_COLOR.navigation },
  { axis: 'eo_ir', label: 'EO / IR', color: LAYER_COLOR.eo_ir },
  { axis: 'cbrn', label: 'CBRN', color: LAYER_COLOR.cbrn },
];

const MODES: { key: Mode; label: string }[] = [
  { key: 'reference', label: 'Reference' },
  { key: 'platform', label: 'Platform' },
  { key: 'engagement', label: 'Engagement' },
  { key: 'tiles', label: 'Band tiles' },
];

const ALL_LAYERS: SpectrumLayer[] = ['comms', 'navigation', 'radar', 'eo_ir', 'cbrn'];
const LAYER_LABEL: Record<SpectrumLayer, string> = {
  comms: 'Comms',
  navigation: 'Navigation',
  radar: 'Radar',
  eo_ir: 'EO / IR',
  cbrn: 'CBRN',
};

export interface SpectrumWorkspaceProps {
  accreditedWaveforms?: AccreditedWaveformProfile[];
  constellations?: GnssConstellation[];
  gnssVulnerabilities?: GnssPlatformDependency[];
  /** Platforms already selected elsewhere in the module (library, copilot). */
  initialSelectedIds?: string[];
}

export function SpectrumWorkspace({
  accreditedWaveforms,
  constellations,
  gnssVulnerabilities,
  initialSelectedIds,
}: SpectrumWorkspaceProps = {}) {
  const { platforms, source } = usePlatforms();
  const [axis, setAxis] = useState<SpectrumAxis>('rf');
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    (initialSelectedIds ?? []).filter((id, i, a) => a.indexOf(id) === i && platforms.some((p) => p.id === id)),
  );
  const [mode, setMode] = useState<Mode>(() => {
    const sides = new Set(selectedIds.map((id) => platforms.find((p) => p.id === id)?.side));
    if (sides.has('red') && sides.has('blue')) return 'engagement';
    return selectedIds.length > 0 ? 'platform' : 'reference';
  });
  const [activeLayers, setActiveLayers] = useState<Set<SpectrumLayer>>(
    new Set(['comms', 'navigation', 'radar'])
  );
  const [gnssOverlay, setGnssOverlay] = useState(false);

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
      if (next.length > 0 && (mode === 'reference' || mode === 'tiles' || mode === 'platform')) {
        const haveRed = next.some((id) => platforms.find((x) => x.id === id)?.side === 'red');
        const haveBlue = next.some((id) => platforms.find((x) => x.id === id)?.side === 'blue');
        setMode(haveRed && haveBlue ? 'engagement' : 'platform');
      }
      if (next.length === 0 && mode !== 'tiles') setMode('reference');
      return next;
    });
  };

  const pickable = useMemo(() => {
    const byName = (a: Platform, b: Platform) => a.name.localeCompare(b.name);
    return {
      red: platforms.filter((p) => p.side === 'red').sort(byName),
      blue: platforms.filter((p) => p.side === 'blue').sort(byName),
    };
  }, [platforms]);

  // filter selected platforms' caps to active layers for display
  const displayPlatforms = useMemo(() => {
    const src = mode === 'reference' ? platforms : selected;
    return src.map((p) => ({
      ...p,
      capabilities: (p.capabilities ?? []).filter((c) => activeLayers.has(c.layer)),
    }));
  }, [mode, platforms, selected, activeLayers]);

  // 'tiles' is not a canvas mode: fall back to 'reference' for lane building
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* toolbar: axis, overlay toggle, view mode */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div className="seg" role="tablist" aria-label="Spectrum axis">
          {AXIS_TABS.map((t) => (
            <button
              key={t.axis}
              type="button"
              role="tab"
              aria-selected={axis === t.axis}
              onClick={() => setAxis(t.axis)}
            >
              <span className="sx-dot" style={{ width: 8, height: 8, background: t.color }} />
              {t.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn-e sm"
          aria-pressed={gnssOverlay}
          onClick={() => setGnssOverlay((v) => !v)}
          title={axis === 'rf' ? 'Mark GNSS constellation signals on the RF axis' : 'GNSS markers show on the RF axis'}
        >
          <span className="sx-dot" style={{ width: 7, height: 7, background: '#06B6D4' }} />
          GNSS bands
        </button>
        <div className="seg sm" role="group" aria-label="View mode" style={{ marginLeft: 'auto' }}>
          {MODES.map((m) => (
            <button key={m.key} type="button" aria-pressed={mode === m.key} onClick={() => setMode(m.key)}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* tiles mode: full-width, no sidebar */}
      {mode === 'tiles' && (
        <section className="sx-glass" style={{ padding: 20 }}>
          <BandTileGrid />
        </section>
      )}

      {/* analysis modes: layer + compare strip, then a full-width canvas */}
      {mode !== 'tiles' && (
        <section className="sx-glass" style={{ padding: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px 18px',
              flexWrap: 'wrap',
              padding: '12px 18px',
              borderBottom: '1px solid var(--store-line)',
            }}
          >
            <div role="group" aria-label="Layers" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span className="sx-label" style={{ marginRight: 4 }}>Layers</span>
              {ALL_LAYERS.map((layer) => {
                const on = activeLayers.has(layer);
                return (
                  <button
                    key={layer}
                    type="button"
                    role="switch"
                    aria-checked={on}
                    onClick={() =>
                      setActiveLayers((prev) => {
                        const next = new Set(prev);
                        next.has(layer) ? next.delete(layer) : next.add(layer);
                        return next;
                      })
                    }
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      minHeight: 30,
                      padding: '0 10px 0 6px',
                      borderRadius: 9,
                      fontSize: 13,
                      color: on ? 'var(--store-ink)' : 'var(--store-ink-mute)',
                    }}
                  >
                    <span className="sx-switch" data-on={on} style={on ? { background: LAYER_COLOR[layer] } : undefined} />
                    {LAYER_LABEL[layer]}
                  </button>
                );
              })}
            </div>

            <div role="group" aria-label="Compare" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: '1 1 320px', minWidth: 0 }}>
              <span className="sx-label">Compare</span>
              <select
                className="glass-field"
                value=""
                aria-label="Add a platform to compare"
                onChange={(e) => {
                  const p = platforms.find((x) => x.id === e.target.value);
                  if (p && !selectedIds.includes(p.id)) onToggleSelect(p);
                }}
                style={{ height: 30, padding: '0 8px', fontSize: 13, maxWidth: 220 }}
              >
                <option value="">Add a platform…</option>
                <optgroup label="Red threats">
                  {pickable.red.map((p) => (
                    <option key={p.id} value={p.id} disabled={selectedIds.includes(p.id)}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Blue systems">
                  {pickable.blue.map((p) => (
                    <option key={p.id} value={p.id} disabled={selectedIds.includes(p.id)}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              </select>
              {selected.length === 0 && (
                <span className="sx-cap">Add a Red and a Blue platform for the engagement overlay.</span>
              )}
              {selected.map((p) => (
                <span
                  key={p.id}
                  className={p.side === 'red' ? 'tag red' : p.side === 'blue' ? 'tag blue' : 'tag'}
                  style={{ height: 34, paddingLeft: 3, paddingRight: 4, gap: 6, fontSize: 12 }}
                >
                  <PlatformThumbnail id={p.id} name={p.name} size="xs" rounded="sm" />
                  <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }} title={p.name}>
                    {p.name}
                  </span>
                  <button
                    type="button"
                    className="glass-icon-btn"
                    style={{ width: 20, height: 20, borderRadius: 6 }}
                    aria-label={`Remove ${p.name}`}
                    onClick={() => onToggleSelect(p)}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            {source === 'seed' && (
              <span className="sx-cap" style={{ marginLeft: 'auto' }}>
                Data: bundled seed
              </span>
            )}
          </div>

          {/* canvas */}
          <div style={{ padding: '18px 22px 20px', minWidth: 0 }}>
            <SpectrumCanvas
              axis={axis}
              lanes={lanes}
              mode={canvasMode}
              overlaps={axisOverlaps}
              referenceBands={canvasMode === 'reference' || canvasMode === 'platform' ? referenceBandsFor(axis) : []}
              title={axisTitle(axis)}
              subtitle={axisSubtitle(axis)}
              accreditedWaveforms={axis === 'rf' ? accreditedWaveforms : undefined}
              constellations={constellations}
              gnssVulnerabilities={gnssVulnerabilities}
              gnssOverlay={gnssOverlay}
            />
            {lanes.length === 0 && (
              <p className="sx-cap" style={{ marginTop: 8 }}>
                {canvasMode === 'reference'
                  ? 'No bands on this axis for the active layers.'
                  : 'No bands on this axis for the selected platforms and active layers.'}
              </p>
            )}
          </div>
        </section>
      )}
      {mode !== 'tiles' && canvasMode === 'engagement' && engagement && (
        <OutcomePanel result={engagement} red={red} blue={blue} />
      )}
    </div>
  );
}

function axisTitle(a: SpectrumAxis): string {
  return {
    rf: 'RF spectrum: comms, datalink and radar',
    gnss: 'GNSS / NAVWAR: L-band detail',
    eo_ir: 'EO / IR: optical spectrum',
    cbrn: 'CBRN: ionising (payload detection)',
  }[a];
}
function axisSubtitle(a: SpectrumAxis): string {
  return {
    rf: 'Log scale, 3 MHz to 40 GHz',
    gnss: 'L-band, 1.1 to 1.7 GHz',
    eo_ir: 'Wavelength, 0.2 to 14 µm',
    cbrn: 'X-ray to gamma',
  }[a];
}
