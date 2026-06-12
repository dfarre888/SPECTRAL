'use client';
/**
 * CommandOverview — the landing canvas (Mockup Frame 01).
 * Posture at a glance: active threats, bands monitored, defeat coverage,
 * a live congestion ribbon, and the Spectrum Advisor feed.
 *
 * KPI values here are derived from the loaded platform set so the page is
 * live, not static. Wire the advisor feed to your RAG assistant.
 */

import React, { useMemo } from 'react';
import { usePlatforms } from './data';
import { GlassCard, StatPuck } from '@/components/ui/primitives';
import { getAxisConfig, makeLogScale, capabilityExtent, LAYER_COLOR } from '@/lib/spectrum/scale';

export function CommandOverview({
  onNavigate,
}: {
  onNavigate?: (page: string) => void;
}) {
  const { platforms } = usePlatforms();

  const stats = useMemo(() => {
    const reds = platforms.filter((p) => p.side === 'red');
    const blues = platforms.filter((p) => p.side === 'blue');
    const bands = platforms.reduce((n, p) => n + (p.capabilities?.length ?? 0), 0);
    // crude "defeat coverage": share of red RF/GNSS deps with a matching blue jam band
    const blueJamLayers = new Set<string>();
    for (const b of blues)
      for (const c of b.capabilities ?? [])
        if (c.fn.startsWith('jam_') || c.fn === 'hpm') blueJamLayers.add(c.layer);
    let dep = 0, covered = 0;
    for (const r of reds)
      for (const c of r.capabilities ?? [])
        if (['control', 'video', 'datalink', 'navigation', 'telemetry'].includes(c.fn)) {
          dep++;
          if (blueJamLayers.has(c.layer)) covered++;
        }
    const coverage = dep ? Math.round((covered / dep) * 100) : 0;
    return { red: reds.length, blue: blues.length, bands, coverage };
  }, [platforms]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* top bar */}
      <GlassCard style={{ padding: '15px 20px', borderRadius: 18, display: 'flex', alignItems: 'center', gap: 18 }}>
        <div>
          <div className="sx-mono sx-faint" style={{ fontSize: 10, letterSpacing: '0.14em' }}>
            OPERATIONAL PICTURE
          </div>
          <div className="sx-display" style={{ fontWeight: 600, fontSize: 17, marginTop: 2 }}>
            Electromagnetic Posture
          </div>
        </div>
        <div
          className="sx-glass"
          style={{ marginLeft: 'auto', padding: '8px 14px', borderRadius: 11, display: 'flex', alignItems: 'center', gap: 9 }}
        >
          <span className="sx-dot" style={{ width: 8, height: 8, color: 'var(--sx-amber)', background: 'var(--sx-amber)' }} />
          <span className="sx-mono" style={{ fontSize: 12 }}>EME CONTESTED</span>
        </div>
      </GlassCard>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <StatPuck
          label="THREAT PLATFORMS"
          value={String(stats.red).padStart(2, '0')}
          delta="Red library"
          deltaColor="var(--sx-red)"
          glow="rgba(248,113,113,0.22)"
        />
        <StatPuck
          label="BANDS CATALOGUED"
          value={stats.bands}
          delta="RF · GNSS · EO/IR"
          glow="rgba(34,211,238,0.18)"
        />
        <StatPuck
          label="DEFEAT COVERAGE"
          value={stats.coverage}
          unit="%"
          delta={`${stats.blue} effectors`}
          deltaColor="var(--sx-green)"
          glow="rgba(74,222,128,0.18)"
        />
      </div>

      {/* ribbon + advisor */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 18 }}>
        <GlassCard style={{ padding: '18px 20px', borderRadius: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
            <div className="sx-display" style={{ fontWeight: 600, fontSize: 13.5 }}>
              Live Spectrum Congestion
            </div>
            <div className="sx-mono sx-faint" style={{ fontSize: 10, marginLeft: 'auto' }}>
              3 MHz → 40 GHz
            </div>
          </div>
          <CongestionRibbon platforms={platforms} />
          <div style={{ display: 'flex', gap: 20, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--sx-glass-line)' }}>
            <RibbonStat n={9} label="clear bands" color="var(--sx-green)" />
            <RibbonStat n={3} label="congested" color="var(--sx-amber)" />
            <RibbonStat n={2} label="saturated" color="var(--sx-red)" />
          </div>
        </GlassCard>

        <GlassCard style={{ padding: '18px 20px', borderRadius: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ width: 20, height: 20, borderRadius: 6, background: 'linear-gradient(135deg, var(--sx-orange), #c2410c)' }} />
            <div className="sx-display" style={{ fontWeight: 600, fontSize: 13.5 }}>
              Spectrum Advisor
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <AdvisorCard icon="⚠" iconColor="var(--sx-red)">
              FOC threat in library — RF jamming will not engage. Recommend HPM.
            </AdvisorCard>
            <AdvisorCard icon="◷" iconColor="var(--sx-amber)">
              2.4 GHz saturated — collateral risk to local Wi-Fi if jammed.
            </AdvisorCard>
            <AdvisorCard icon="◉" iconColor="var(--sx-green)">
              Multi-constellation CRPA threats need layered defeat (jam + kinetic).
            </AdvisorCard>
            <button
              onClick={() => onNavigate?.('engagement')}
              className="sx-faint"
              style={{ fontSize: 11, marginTop: 2, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, color: 'var(--sx-ink-faint)' }}
            >
              + Open engagement planner
            </button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function RibbonStat({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <div>
      <div className="sx-mono" style={{ fontSize: 18, color }}>{n}</div>
      <div className="sx-faint" style={{ fontSize: 10 }}>{label}</div>
    </div>
  );
}

function AdvisorCard({ icon, iconColor, children }: { icon: string; iconColor: string; children: React.ReactNode }) {
  return (
    <div className="sx-glass" style={{ padding: '11px 13px', borderRadius: 12, fontSize: 11.5, color: 'var(--sx-ink-dim)', display: 'flex', gap: 9, alignItems: 'baseline' }}>
      <span style={{ color: iconColor }}>{icon}</span>
      <span>{children}</span>
    </div>
  );
}

/** Compressed read-only RF spectrum showing where the loaded platforms emit. */
function CongestionRibbon({ platforms }: { platforms: ReturnType<typeof usePlatforms>['platforms'] }) {
  const W = 600;
  const H = 38;
  const cfg = getAxisConfig('rf', [0, W]);
  const scale = makeLogScale(cfg.domain, cfg.range);

  // density: count emitters per pixel bucket → opacity
  const allCaps = platforms.flatMap((p) => (p.capabilities ?? []).filter((c) => c.axis === 'rf' || c.axis === 'gnss'));

  return (
    <div style={{ position: 'relative', height: H, borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--sx-glass-line)', overflow: 'hidden' }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
        {allCaps.map((c, i) => {
          const ext = capabilityExtent(c, 'hz');
          if (!ext) return null;
          let x0 = scale(ext[0]);
          let x1 = scale(ext[1]);
          if (x1 < x0) [x0, x1] = [x1, x0];
          return (
            <rect
              key={c.id + i}
              x={x0}
              y={4}
              width={Math.max(x1 - x0, 2)}
              height={H - 8}
              rx={4}
              fill={LAYER_COLOR[c.layer]}
              opacity={0.22}
            />
          );
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '0 4px 2px' }}>
        {['433M', '900M', 'L', '2.4G', '5.8G', 'X/Ku'].map((l) => (
          <span key={l} className="sx-mono sx-faint" style={{ fontSize: 8 }}>{l}</span>
        ))}
      </div>
    </div>
  );
}
