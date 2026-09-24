'use client';
/**
 * PlatformDetail: the spectral dossier (Mockup Frame 03).
 * Identity hero + key specs, full capability ledger (incl. explicit
 * "no control link" rows), and a defeat-assessment readout.
 */

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { writeMapStaging } from '@/lib/spectrum/map-staging';
import type { Platform, SpectrumCapability, DefeatResistance } from '@/lib/spectrum/types';
import { PlatformThumbnail } from '@/components/platforms/PlatformThumbnail';
import { SideBadge } from '@/components/ui/primitives';
import { MapPin } from 'lucide-react';
import { LAYER_COLOR, capabilityExtent } from '@/lib/spectrum/scale';

export function PlatformDetail({ platform }: { platform: Platform }) {
  const router = useRouter();
  const caps = platform.capabilities ?? [];
  const red = platform.side === 'red';

  const specs = useMemo(() => {
    const s: { label: string; value: string }[] = [];
    if (platform.range_km != null) s.push({ label: 'Range', value: `${fmt(platform.range_km)} km` });
    if (platform.warhead_kg != null) s.push({ label: 'Warhead', value: `${platform.warhead_kg} kg` });
    if (platform.speed_kmh != null) s.push({ label: 'Speed', value: `${platform.speed_kmh} km/h` });
    if (platform.mass_kg != null) s.push({ label: 'Mass', value: `${fmt(platform.mass_kg)} kg` });
    if (platform.ceiling_m != null) s.push({ label: 'Ceiling', value: `${fmt(platform.ceiling_m)} m` });
    return s.slice(0, 4);
  }, [platform]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: 18, alignItems: 'start' }}>
      {/* identity */}
      <section className="sx-glass" style={{ padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
          <PlatformThumbnail id={platform.id} name={platform.name} size="xl" rounded="lg" />
          <div style={{ minWidth: 0, flex: 1 }}>
            <SideBadge side={platform.side} group={platform.group} category={platform.role ?? platform.category} />
            <div className="sx-display" style={{ fontWeight: 600, fontSize: 22, letterSpacing: '-0.01em', marginTop: 10, color: 'var(--store-ink)' }}>
              {platform.name}
            </div>
            <div style={{ fontSize: 13, marginTop: 2, color: 'var(--store-ink-soft)' }}>
              {platform.variant_label ?? platform.category ?? platform.origin}
            </div>
          </div>
        </div>

        {specs.length > 0 && (
          <dl
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              margin: '20px 0 0',
              borderTop: '1px solid var(--store-line)',
            }}
          >
            {specs.map((sp, i) => (
              <div
                key={sp.label}
                style={{
                  padding: '12px 0',
                  paddingLeft: i % 2 ? 16 : 0,
                  borderLeft: i % 2 ? '1px solid var(--store-line)' : 0,
                  borderBottom: '1px solid var(--store-line)',
                }}
              >
                <dt style={{ fontSize: 12, color: 'var(--store-ink-mute)' }}>{sp.label}</dt>
                <dd className="sx-mono" style={{ margin: '4px 0 0', fontSize: 18, color: 'var(--store-ink)' }}>{sp.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <button
          type="button"
          className="btn-glass primary"
          onClick={() => {
            writeMapStaging({ placeIds: [platform.id], highlightIds: [platform.id] });
            router.push('/map?from=spectra');
          }}
          style={{ marginTop: 18, width: '100%' }}
        >
          <MapPin size={15} aria-hidden />
          View on map
        </button>

        {platform.intel_note && (
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--store-line)' }}>
            <div className="sx-label" style={{ marginBottom: 6 }}>Intelligence note</div>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--store-ink-soft)', margin: 0 }}>{platform.intel_note}</p>
          </div>
        )}
      </section>

      {/* right column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
        <section className="sx-glass" style={{ padding: 0, overflow: 'hidden' }}>
          <h2 className="sx-h" style={{ padding: '18px 20px 12px' }}>Spectral footprint</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="dt compact">
              <thead>
                <tr>
                  <th scope="col">Capability</th>
                  <th scope="col">Band</th>
                  <th scope="col">Resistance</th>
                </tr>
              </thead>
              <tbody>
                {caps.map((c) => (
                  <CapabilityRow key={c.id} cap={c} />
                ))}
                {red && !caps.some((c) => c.fn === 'control' || c.fn === 'datalink') && <NoLinkRow />}
              </tbody>
            </table>
          </div>
        </section>

        <section className="sx-glass" style={{ padding: '18px 20px' }}>
          <h2 className="sx-h">Defeat assessment</h2>
          <p className="sx-cap" style={{ marginTop: 4 }}>Heuristic from the capability ledger above, not an accredited Pk.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
            {defeatBars(platform).map((b) => (
              <DefeatBar key={b.label} {...b} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function CapabilityRow({ cap }: { cap: SpectrumCapability }) {
  const color = LAYER_COLOR[cap.layer];
  const resist = cap.defeat_resistance ?? [];
  const badge = resistBadge(resist);
  return (
    <tr>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="sx-dot" style={{ width: 8, height: 8, background: color }} />
          <div style={{ minWidth: 0 }}>
            <div className="primary">{cap.label}</div>
            {(cap.note || cap.derived) && (
              <span className="meta">
                {cap.note ?? ''}
                {cap.derived ? `${cap.note ? ' · ' : ''}derived` : ''}
              </span>
            )}
          </div>
        </div>
      </td>
      <td className="mono" style={{ whiteSpace: 'nowrap' }}>{fmtExtent(cap)}</td>
      <td>{badge ? <span className={badge.cls}>{badge.text}</span> : null}</td>
    </tr>
  );
}

function NoLinkRow() {
  return (
    <tr>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="sx-dot" style={{ width: 8, height: 8, background: 'var(--store-ink-mute)' }} />
          <div>
            <div className="primary">Control datalink: none</div>
            <span className="meta">Pre-programmed or autonomous; no operator link in flight</span>
          </div>
        </div>
      </td>
      <td className="mono">n/a</td>
      <td />
    </tr>
  );
}

function DefeatBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
      <span style={{ width: 84, color: 'var(--store-ink-soft)' }}>{label}</span>
      <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.06)' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: color }} />
      </div>
      <span className="sx-mono" style={{ fontSize: 12, color, width: 40, textAlign: 'right' }}>{pct}%</span>
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
    return ext[0] === ext[1] ? f(ext[0]) : `${f(ext[0])} to ${f(ext[1])}`;
  }
  const f = (v: number) => (v < 1 ? `${(v * 1000).toFixed(0)} nm` : `${v.toFixed(2)} µm`);
  return ext[0] === ext[1] ? f(ext[0]) : `${f(ext[0])} to ${f(ext[1])}`;
}

function resistBadge(resist: DefeatResistance[]): { text: string; cls: string } | null {
  if (resist.includes('rf_silent')) return { text: 'Jam-immune', cls: 'tag red' };
  if (resist.includes('gnss_denied_capable')) return { text: 'GNSS-denied OK', cls: 'tag red' };
  if (resist.some((r) => r.endsWith('_high'))) return { text: 'Jam-resist high', cls: 'tag red' };
  if (resist.some((r) => r.endsWith('_med'))) return { text: 'Conditional', cls: 'tag amber' };
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
    { label: 'RF jam', pct: rfJam, color: col(rfJam) },
    { label: 'GNSS jam', pct: gnssJam, color: col(gnssJam) },
    { label: 'HPM', pct: hpm, color: col(hpm) },
    { label: 'Kinetic', pct: kinetic, color: col(kinetic) },
  ];
}
