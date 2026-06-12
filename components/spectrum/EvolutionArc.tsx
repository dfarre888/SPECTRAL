'use client';
/**
 * EvolutionArc — escaping the spectrum (Mockup Frame 10).
 * A timeline scrubber over a platform's generational variants. As you scrub,
 * the band-set on the canvas changes and the "what defeats it" verdict shifts
 * from jam/spoof → struggles → HPM-only.
 */

import React, { useMemo, useState } from 'react';
import type { Platform, PlatformVariant, SpectrumAxis } from '@/lib/spectrum/types';
import { useVariants } from './data';
import { SpectrumCanvas, CanvasLane } from '@/components/spectrum/SpectrumCanvas';
import { GlassCard } from '@/components/ui/primitives';

const VERDICT_META = {
  rf_works: { color: '#f87171', label: 'Jam / spoof DEFEATS it', glow: 'rgba(248,113,113,0.14)' },
  rf_struggles: { color: '#fbbf24', label: 'Jamming STRUGGLES', glow: 'rgba(251,191,36,0.14)' },
  hpm_only: { color: '#4ade80', label: 'NAVWAR defeated → HPM only', glow: 'rgba(74,222,128,0.14)' },
} as const;

export function EvolutionArc({ platform }: { platform: Platform }) {
  const variants = useVariants(platform.id);
  const [idx, setIdx] = useState(variants.length - 1); // start at latest

  if (variants.length === 0) {
    return (
      <GlassCard style={{ padding: 28, borderRadius: 18 }}>
        <div className="sx-display" style={{ fontWeight: 600, fontSize: 15 }}>
          {platform.name}
        </div>
        <div className="sx-dim" style={{ fontSize: 13, marginTop: 8 }}>
          No generational variants are catalogued for this platform yet. The evolution arc is
          available for platforms with a versioned capability history (e.g. Shahed-136 Gen 0–4).
        </div>
      </GlassCard>
    );
  }

  const current = variants[idx];
  const meta = current.defeat_verdict ? VERDICT_META[current.defeat_verdict] : null;

  // pick axis with data for the current variant
  const axis: SpectrumAxis = current.capabilities.some((c) => c.axis === 'eo_ir')
    ? current.capabilities.every((c) => c.axis === 'eo_ir')
      ? 'eo_ir'
      : 'rf'
    : current.capabilities.some((c) => c.axis === 'gnss')
    ? 'gnss'
    : 'rf';

  const lanes: CanvasLane[] = useMemo(() => {
    // group current variant caps into simple function lanes
    const byFn: Record<string, typeof current.capabilities> = {};
    for (const c of current.capabilities) {
      const key = c.fn === 'navigation' ? 'NAV (GNSS)' : c.fn === 'sensor' ? 'EO/IR SENSOR' : c.fn === 'datalink' ? 'DATALINK' : c.fn.toUpperCase();
      (byFn[key] ??= []).push(c);
    }
    return Object.entries(byFn).map(([label, caps]) => ({
      key: label,
      label,
      side: 'red' as const,
      caps,
    }));
  }, [current]);

  return (
    <div>
      <GlassCard style={{ padding: 22, borderRadius: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
          <div className="sx-display" style={{ fontWeight: 600, fontSize: 14 }}>
            {platform.name} — Generational Spectral Migration
          </div>
          <div className="sx-mono sx-faint" style={{ fontSize: 10, marginLeft: 'auto' }}>
            scrub timeline ▸
          </div>
        </div>

        {/* canvas for the selected generation */}
        <SpectrumCanvas
          axis={axis}
          lanes={lanes}
          mode="platform"
          title={current.label}
          subtitle={current.effective_year ? `c. ${current.effective_year}` : ''}
        />

        {/* timeline scrubber */}
        <div style={{ marginTop: 20, position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              left: '6%',
              right: '6%',
              top: 13,
              height: 2,
              background: 'var(--sx-glass-line-hi)',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
            {variants.map((v, i) => {
              const active = i === idx;
              const vm = v.defeat_verdict ? VERDICT_META[v.defeat_verdict] : null;
              return (
                <button
                  key={v.id}
                  onClick={() => setIdx(i)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    flex: 1,
                    padding: 0,
                  }}
                >
                  <span
                    style={{
                      width: active ? 14 : 11,
                      height: active ? 14 : 11,
                      borderRadius: '50%',
                      background: active ? (vm?.color ?? 'var(--sx-orange)') : 'var(--sx-orange)',
                      boxShadow: active ? `0 0 14px ${vm?.color ?? 'var(--sx-orange)'}` : 'none',
                      transition: 'all .2s',
                    }}
                  />
                  <span
                    className="sx-mono"
                    style={{
                      fontSize: 10,
                      color: active ? 'var(--sx-ink)' : 'var(--sx-ink-faint)',
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    {v.variant.toUpperCase()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </GlassCard>

      {/* generation detail + verdict */}
      <GlassCard
        hi
        glow={meta?.glow}
        style={{ padding: '20px 24px', borderRadius: 18, marginTop: 16 }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
          <div style={{ flex: 1 }}>
            <div className="sx-display" style={{ fontWeight: 600, fontSize: 16 }}>
              {current.label}
            </div>
            <div className="sx-dim" style={{ fontSize: 12.5, marginTop: 7, lineHeight: 1.6, maxWidth: '80ch' }}>
              {current.summary}
            </div>
          </div>
          {meta && (
            <div
              style={{
                textAlign: 'center',
                padding: '14px 18px',
                borderRadius: 14,
                border: `1px solid ${meta.color}55`,
                minWidth: 150,
              }}
            >
              <div className="sx-mono" style={{ fontSize: 9, letterSpacing: '0.12em', color: 'var(--sx-ink-faint)' }}>
                COUNTERMEASURE
              </div>
              <div className="sx-mono" style={{ fontSize: 12, color: meta.color, marginTop: 6, fontWeight: 600, lineHeight: 1.4 }}>
                {meta.label}
              </div>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
