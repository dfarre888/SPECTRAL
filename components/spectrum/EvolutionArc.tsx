'use client';
/**
 * EvolutionArc: escaping the spectrum (Mockup Frame 10).
 * A timeline scrubber over a platform's generational variants. As you scrub,
 * the band-set on the canvas changes and the "what defeats it" verdict shifts
 * from jam/spoof → struggles → HPM-only.
 */

import React, { useMemo, useState } from 'react';
import type { Platform, PlatformVariant, SpectrumAxis } from '@/lib/spectrum/types';
import { useVariants, usePlatforms, VARIANT_PLATFORM_IDS } from './data';
import { SpectrumCanvas, CanvasLane } from '@/components/spectrum/SpectrumCanvas';
import { capabilityExtent } from '@/lib/spectrum/scale';

const VERDICT_META = {
  rf_works: { color: '#f87171', tag: 'tag red', label: 'Jam or spoof defeats it' },
  rf_struggles: { color: '#fbbf24', tag: 'tag amber', label: 'Jamming struggles' },
  hpm_only: { color: '#4ade80', tag: 'tag green', label: 'NAVWAR defeated: HPM only' },
} as const;

export function EvolutionArc({ platform }: { platform: Platform }) {
  const { platforms } = usePlatforms();
  const [pickedId, setPickedId] = useState(platform.id);

  const options = useMemo(() => {
    const ids = VARIANT_PLATFORM_IDS.includes(platform.id) ? VARIANT_PLATFORM_IDS : [platform.id, ...VARIANT_PLATFORM_IDS];
    return ids.map((id) => ({ id, name: platforms.find((p) => p.id === id)?.name ?? (id === platform.id ? platform.name : id) }));
  }, [platforms, platform.id, platform.name]);

  const picked = platforms.find((p) => p.id === pickedId) ?? (pickedId === platform.id ? platform : ({ id: pickedId, name: pickedId, side: 'red' } as Platform));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {options.length > 1 && (
        <div className="seg" role="tablist" aria-label="Platform" style={{ alignSelf: 'flex-start', maxWidth: '100%', overflowX: 'auto' }}>
          {options.map((o) => (
            <button key={o.id} type="button" role="tab" aria-selected={pickedId === o.id} onClick={() => setPickedId(o.id)}>
              {o.name}
            </button>
          ))}
        </div>
      )}
      <ArcBody key={picked.id} platform={picked} />
    </div>
  );
}

function ArcBody({ platform }: { platform: Platform }) {
  const variants = useVariants(platform.id);
  const [idx, setIdx] = useState(() => Math.max(variants.length - 1, 0));
  const current: PlatformVariant | undefined = variants[idx];

  // pick axis with data for the current variant
  const caps = current?.capabilities ?? [];
  const axis: SpectrumAxis = caps.some((c) => c.axis === 'eo_ir')
    ? caps.every((c) => c.axis === 'eo_ir')
      ? 'eo_ir'
      : 'rf'
    : caps.some((c) => c.axis === 'gnss')
    ? 'gnss'
    : 'rf';
  const unit = axis === 'eo_ir' ? 'um' : 'hz';

  // Capabilities that belong to another axis (e.g. an EO/IR seeker on the RF axis) are listed below the chart.
  const onAxis = (c: PlatformVariant['capabilities'][number]) =>
    (unit === 'hz' ? c.axis === 'rf' || c.axis === 'gnss' : c.axis === axis) && capabilityExtent(c, unit) != null;
  const offAxis = caps.filter((c) => !onAxis(c));

  const lanes: CanvasLane[] = useMemo(() => {
    // group current variant caps into simple function lanes
    const byFn: Record<string, PlatformVariant['capabilities']> = {};
    for (const c of caps) {
      if (!onAxis(c)) continue;
      const key =
        c.fn === 'navigation' ? 'Nav (GNSS)' : c.fn === 'sensor' ? 'EO/IR sensor' : c.fn === 'datalink' ? 'Datalink' : c.fn.charAt(0).toUpperCase() + c.fn.slice(1).replace(/_/g, ' ');
      (byFn[key] ??= []).push(c);
    }
    return Object.entries(byFn).map(([label, laneCaps]) => ({
      key: label,
      label,
      side: 'red' as const,
      caps: laneCaps,
    }));
  }, [caps, unit, axis]);

  if (variants.length === 0 || !current) {
    return (
      <section className="sx-glass" style={{ padding: '22px 24px' }}>
        <h2 className="sx-h">{platform.name}</h2>
        <p style={{ fontSize: 13, marginTop: 8, lineHeight: 1.6, color: 'var(--store-ink-soft)', maxWidth: '72ch' }}>
          No generational variants are catalogued for this platform yet. The evolution arc is available for platforms with a
          versioned capability history, such as Shahed-136 Gen 0 to 4.
        </p>
      </section>
    );
  }

  const meta = current.defeat_verdict ? VERDICT_META[current.defeat_verdict] : null;

  return (
    <>
      <section className="sx-glass" style={{ padding: '20px 22px' }}>
        <h2 className="sx-h" style={{ marginBottom: 14 }}>
          {platform.name}: generational spectral migration
        </h2>

        {/* canvas for the selected generation */}
        <SpectrumCanvas
          axis={axis}
          lanes={lanes}
          mode="platform"
          title={current.label}
          subtitle={current.effective_year ? `c. ${current.effective_year}` : ''}
        />
        {offAxis.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            <span className="sx-cap">Off this axis:</span>
            {offAxis.map((c) => (
              <span key={c.id} className={c.axis === 'eo_ir' ? 'tag violet' : 'tag'} title={c.note ?? undefined}>
                {c.label}
              </span>
            ))}
          </div>
        )}

        {/* timeline scrubber */}
        <div role="tablist" aria-label="Generation" style={{ marginTop: 22, position: 'relative' }}>
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: `${50 / variants.length}%`,
              right: `${50 / variants.length}%`,
              top: 8,
              height: 2,
              borderRadius: 2,
              background: 'rgba(255,255,255,0.14)',
            }}
          />
          <div style={{ display: 'flex', position: 'relative' }}>
            {variants.map((v, i) => {
              const active = i === idx;
              const vm = v.defeat_verdict ? VERDICT_META[v.defeat_verdict] : null;
              return (
                <button
                  key={v.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setIdx(i)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowRight') setIdx(Math.min(variants.length - 1, idx + 1));
                    if (e.key === 'ArrowLeft') setIdx(Math.max(0, idx - 1));
                  }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1, padding: '0 4px', borderRadius: 10 }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      display: 'block',
                      background: active ? vm?.color ?? 'var(--wb-blue)' : '#1C1C1F',
                      border: `2px solid ${active ? '#fff' : vm?.color ?? 'rgba(255,255,255,0.3)'}`,
                      boxShadow: active ? `0 0 0 4px rgba(255,255,255,0.08)` : 'none',
                      transition: 'background-color 200ms ease-out, border-color 200ms ease-out',
                    }}
                  />
                  <span className="sx-mono" style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? 'var(--store-ink)' : 'var(--store-ink-soft)' }}>
                    {v.variant.replace(/^gen/i, 'Gen ')}
                  </span>
                  {v.effective_year && (
                    <span className="sx-mono" style={{ fontSize: 11, color: 'var(--store-ink-mute)', marginTop: -4 }}>
                      {v.effective_year}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* generation detail + verdict */}
      <section className="sx-glass" style={{ padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 420px', minWidth: 0 }}>
            <h3 className="sx-h" style={{ fontSize: 16 }}>{current.label}</h3>
            {current.summary && (
              <p style={{ fontSize: 13, marginTop: 6, lineHeight: 1.6, maxWidth: '80ch', color: 'var(--store-ink-soft)' }}>{current.summary}</p>
            )}
          </div>
          {meta && (
            <div style={{ padding: '12px 16px', borderRadius: 12, border: '1px solid var(--lacquer-line)', background: 'rgba(255,255,255,0.025)', minWidth: 200 }}>
              <div className="sx-label">Countermeasure</div>
              <div style={{ marginTop: 8 }}>
                <span className={meta.tag}>{meta.label}</span>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
