'use client';
/**
 * PlatformDetail — the spectral dossier (Mockup Frame 03).
 * Identity hero + key specs, full capability ledger (incl. explicit
 * "no control link" rows), and a defeat-assessment readout.
 */

import React, { useMemo } from 'react';
import type { Platform, SpectrumCapability, DefeatResistance } from '@/lib/spectrum/types';
import { GlassCard, SideBadge, PlatformIcon } from '@/components/ui/primitives';
import { LAYER_COLOR, capabilityExtent } from '@/lib/spectrum/scale';

export function PlatformDetail({ platform }: { platform: Platform }) {
  const caps = platform.capabilities ?? [];
  const red = platform.side === 'red';

  const specs = useMemo(() => {
    const s: { label: string; value: string }[] = [];
    if (platform.range_km != null) s.push({ label: 'RANGE', value: `${fmt(platform.range_km)} km` });
    if (platform.warhead_kg != null) s.push({ label: 'WARHEAD', value: `${platform.warhead_kg} kg` });
    if (platform.speed_kmh != null) s.push({ label: 'SPEED', value: `${platform.speed_kmh} km/h` });
    if (platform.mass_kg != null) s.push({ label: 'MASS', value: `${fmt(platform.mass_kg)} kg` });
    if (platform.ceiling_m != null) s.push({ label: 'CEILING', value: `${fmt(platform.ceiling_m)} m` });
    return s.slice(0, 4);
  }, [platform]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 22 }}>
      {/* hero */}
      <GlassCard hi style={{ padding: 24, borderRadius: 20 }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(120% 90% at 50% -10%, ${red ? 'rgba(248,113,113,0.16)' : 'rgba(74,158,255,0.16)'}, transparent 60%)`,
            pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'relative' }}>
          <SideBadge side={platform.side} group={platform.group} category={platform.role ?? platform.category} />
          <div style={{ margin: '20px 0' }}>
            <PlatformIcon platform={platform} size={96} />
          </div>
          <div className="sx-display" style={{ fontWeight: 700, fontSize: 24, letterSpacing: '-0.01em' }}>
            {platform.name}
          </div>
          <div className="sx-dim" style={{ fontSize: 13 }}>
            {platform.variant_label ?? platform.category ?? platform.origin}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 22 }}>
            {specs.map((s) => (
              <GlassCard key={s.label} style={{ padding: 13, borderRadius: 13 }}>
                <div className="sx-faint sx-mono" style={{ fontSize: 9 }}>{s.label}</div>
                <div className="sx-mono" style={{ fontSize: 18, marginTop: 3 }}>{s.value}</div>
              </GlassCard>
            ))}
          </div>

          {platform.intel_note && (
            <div
              style={{
                marginTop: 18,
                paddingTop: 16,
                borderTop: '1px solid var(--sx-glass-line)',
              }}
            >
              <div className="sx-mono sx-faint" style={{ fontSize: 9, letterSpacing: '0.14em', marginBottom: 7 }}>
                INTELLIGENCE NOTE
              </div>
              <div className="sx-dim" style={{ fontSize: 12, lineHeight: 1.6 }}>
                {platform.intel_note}
              </div>
            </div>
          )}
        </div>
      </GlassCard>

      {/* right column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <GlassCard style={{ padding: '18px 20px', borderRadius: 18 }}>
          <div className="sx-display" style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>
            Spectral Footprint
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {caps.map((c) => (
              <CapabilityRow key={c.id} cap={c} />
            ))}
            {red && !caps.some((c) => c.fn === 'control' || c.fn === 'datalink') && (
              <NoLinkRow />
            )}
          </div>
        </GlassCard>

        <GlassCard style={{ padding: '18px 20px', borderRadius: 18 }}>
          <div className="sx-display" style={{ fontWeight: 600, fontSize: 14, marginBottom: 11 }}>
            Defeat Assessment
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {defeatBars(platform).map((b) => (
              <DefeatBar key={b.label} {...b} />
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function CapabilityRow({ cap }: { cap: SpectrumCapability }) {
  const color = LAYER_COLOR[cap.layer];
  const resist = cap.defeat_resistance ?? [];
  const badge = resistBadge(resist);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
      <span className="sx-dot" style={{ width: 8, height: 8, color, background: color }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12.5, fontWeight: 500 }}>{cap.label}</div>
        <div className="sx-faint sx-mono" style={{ fontSize: 10 }}>
          {fmtExtent(cap)}
          {cap.note ? ` · ${cap.note}` : ''}
          {cap.derived ? ' · derived' : ''}
        </div>
      </div>
      {badge && (
        <span
          className="sx-mono"
          style={{
            fontSize: 9,
            padding: '3px 8px',
            borderRadius: 6,
            background: `${badge.color}1f`,
            color: badge.color,
          }}
        >
          {badge.text}
        </span>
      )}
    </div>
  );
}

function NoLinkRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 13, opacity: 0.5 }}>
      <span className="sx-dot" style={{ width: 8, height: 8, color: 'var(--sx-ink-faint)', background: 'var(--sx-ink-faint)' }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12.5, fontWeight: 500 }}>Control datalink — none</div>
        <div className="sx-faint sx-mono" style={{ fontSize: 10 }}>
          Pre-programmed / autonomous · no operator link in flight
        </div>
      </div>
      <span className="sx-mono" style={{ fontSize: 9, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--sx-glass-line)' }}>
        N/A
      </span>
    </div>
  );
}

function DefeatBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, fontSize: 12 }}>
      <span className="sx-faint sx-mono" style={{ width: 78 }}>{label}</span>
      <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.05)' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: color }} />
      </div>
      <span className="sx-mono" style={{ fontSize: 11, color, width: 34, textAlign: 'right' }}>{pct}%</span>
    </div>
  );
}

/* ---- helpers ---- */
const fmt = (n: number) => n.toLocaleString();

function fmtExtent(cap: SpectrumCapability): string {
  const unit = cap.axis === 'eo_ir' || cap.axis === 'cbrn' ? 'um' : 'hz';
  const ext = capabilityExtent(cap, unit);
  if (!ext) return '';
  if (unit === 'hz') {
    const f = (v: number) => (v >= 1e9 ? `${(v / 1e9).toFixed(2)} GHz` : `${(v / 1e6).toFixed(0)} MHz`);
    return ext[0] === ext[1] ? f(ext[0]) : `${f(ext[0])} – ${f(ext[1])}`;
  }
  const f = (v: number) => (v < 1 ? `${(v * 1000).toFixed(0)} nm` : `${v.toFixed(2)} µm`);
  return ext[0] === ext[1] ? f(ext[0]) : `${f(ext[0])} – ${f(ext[1])}`;
}

function resistBadge(resist: DefeatResistance[]): { text: string; color: string } | null {
  if (resist.includes('rf_silent')) return { text: 'JAM-IMMUNE', color: '#f87171' };
  if (resist.includes('gnss_denied_capable')) return { text: 'GNSS-DENIED OK', color: '#f87171' };
  if (resist.some((r) => r.endsWith('_high'))) return { text: 'JAM-RESIST HIGH', color: '#f87171' };
  if (resist.some((r) => r.endsWith('_med'))) return { text: 'CONDITIONAL', color: '#fbbf24' };
  return null;
}

function defeatBars(p: Platform): { label: string; pct: number; color: string }[] {
  const caps = p.capabilities ?? [];
  const rfSilent = caps.some((c) => (c.defeat_resistance ?? []).includes('rf_silent')) ||
    (p.side === 'red' && !caps.some((c) => (c.axis === 'rf' || c.axis === 'gnss') && ['control', 'video', 'datalink', 'telemetry'].includes(c.fn)));
  const gnssDenied = caps.some((c) => (c.defeat_resistance ?? []).includes('gnss_denied_capable'));
  const crpa = caps.some((c) => (c.defeat_resistance ?? []).some((r) => r.startsWith('gnss') && r.endsWith('_high')));

  const col = (pct: number) => (pct >= 60 ? '#4ade80' : pct >= 30 ? '#fbbf24' : '#f87171');

  const rfJam = rfSilent ? 5 : 75;
  const gnssJam = rfSilent ? 0 : crpa ? 22 : gnssDenied ? 35 : 70;
  const hpm = 88;
  const kinetic = 80;
  return [
    { label: 'RF JAM', pct: rfJam, color: col(rfJam) },
    { label: 'GNSS JAM', pct: gnssJam, color: col(gnssJam) },
    { label: 'HPM', pct: hpm, color: col(hpm) },
    { label: 'KINETIC', pct: kinetic, color: col(kinetic) },
  ];
}
