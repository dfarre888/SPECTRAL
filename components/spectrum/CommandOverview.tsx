'use client';
/**
 * CommandOverview — the landing canvas (Mockup Frame 01).
 * Posture at a glance: one instrument row (threats, Blue systems, bands,
 * radars, effectors, defeat coverage), a congestion ribbon on the true log
 * scale, and the Spectrum Advisor feed.
 *
 * KPI values here are derived from the loaded platform set so the page is
 * live, not static. Wire the advisor feed to your RAG assistant.
 */

import React, { useMemo } from 'react';
import { ArrowRight, Layers, Radio, TriangleAlert } from 'lucide-react';
import { usePlatforms } from './data';
import { useRadars } from './radar-data';
import { useEffectors } from './effector-data';
import { getAxisConfig, makeLogScale, capabilityExtent, LAYER_COLOR } from '@/lib/spectrum/scale';

export function CommandOverview({
  onNavigate,
}: {
  onNavigate?: (page: string) => void;
}) {
  const { platforms } = usePlatforms();
  const radars = useRadars();
  const effectors = useEffectors();

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
    return { red: reds.length, blue: blues.length, bands, coverage, dep };
  }, [platforms]);

  const radarSplit = useMemo(
    () => ({ red: radars.filter((r) => r.side === 'red').length, blue: radars.filter((r) => r.side === 'blue').length }),
    [radars],
  );
  const effectorSplit = useMemo(
    () => ({ red: effectors.filter((e) => e.side === 'red').length, blue: effectors.filter((e) => e.side === 'blue').length }),
    [effectors],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* instrument row */}
      <div className="fc-inst sx-six" style={{ borderTop: '1px solid var(--store-line)', borderBottom: '1px solid var(--store-line)' }}>
        <div>
          <div className="k">Threat platforms</div>
          <div className="v red">{stats.red}</div>
          <div className="d">Red library</div>
        </div>
        <div>
          <div className="k">Blue systems</div>
          <div className="v blue">{stats.blue}</div>
          <div className="d">Blue library</div>
        </div>
        <div>
          <div className="k">Bands catalogued</div>
          <div className="v">{stats.bands.toLocaleString()}</div>
          <div className="d">RF, GNSS, EO/IR</div>
        </div>
        <div>
          <div className="k">Radars</div>
          <div className="v">{radars.length}</div>
          <div className="d">
            {radarSplit.red} Red, {radarSplit.blue} Blue
          </div>
        </div>
        <div>
          <div className="k">Effectors</div>
          <div className="v">{effectors.length}</div>
          <div className="d">
            {effectorSplit.blue} Blue, {effectorSplit.red} Red
          </div>
        </div>
        <div>
          <div className="k">Defeat coverage</div>
          <div className="v">
            {stats.coverage}
            <small>%</small>
          </div>
          <div className="d" title="Share of Red control, video, datalink, telemetry and navigation bands on a layer that at least one Blue jammer or HPM system covers.">
            of {stats.dep} Red link dependencies
          </div>
        </div>
      </div>

      {/* ribbon + advisor */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: 18 }}>
        <section className="sx-glass" style={{ padding: '20px 22px', gridColumn: 'span 1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h2 className="sx-h">Spectrum congestion</h2>
            <span className="tag amber">
              <span className="sx-dot" style={{ width: 6, height: 6, background: 'currentColor' }} />
              EME contested
            </span>
            <span className="sx-cap sx-mono" style={{ marginLeft: 'auto' }}>
              3 MHz to 40 GHz, log
            </span>
          </div>
          <p className="sx-cap" style={{ marginTop: 6, lineHeight: 1.5 }}>
            Where the loaded platforms emit. Brighter means more emitters stacked in the same span.
          </p>
          <CongestionRibbon platforms={platforms} />
          <div style={{ display: 'flex', gap: 28, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--store-line)' }}>
            <RibbonStat n={9} label="Clear bands" color="var(--sx-green)" />
            <RibbonStat n={3} label="Congested" color="var(--sx-amber)" />
            <RibbonStat n={2} label="Saturated" color="var(--sx-red)" />
          </div>
        </section>

        <section className="sx-glass" style={{ padding: '20px 22px' }}>
          <h2 className="sx-h">Spectrum advisor</h2>
          <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0 }}>
            <AdvisorItem icon={<TriangleAlert size={15} />} color="var(--sx-red)">
              FOC threat in library: RF jamming will not engage. Recommend HPM.
            </AdvisorItem>
            <AdvisorItem icon={<Radio size={15} />} color="var(--sx-amber)">
              2.4 GHz saturated: collateral risk to local Wi-Fi if jammed.
            </AdvisorItem>
            <AdvisorItem icon={<Layers size={15} />} color="var(--sx-green)">
              Multi-constellation CRPA threats need layered defeat (jam plus kinetic).
            </AdvisorItem>
          </ul>
          <button type="button" onClick={() => onNavigate?.('engagement')} className="fc-action" style={{ marginTop: 10 }}>
            Open engagement planner
            <ArrowRight size={13} aria-hidden />
          </button>
        </section>
      </div>
    </div>
  );
}

function RibbonStat({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <div>
      <div className="sx-mono" style={{ fontSize: 22, fontWeight: 500, lineHeight: 1, color }}>{n}</div>
      <div className="sx-cap" style={{ marginTop: 6 }}>{label}</div>
    </div>
  );
}

function AdvisorItem({ icon, color, children }: { icon: React.ReactNode; color: string; children: React.ReactNode }) {
  return (
    <li
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        padding: '12px 0',
        borderBottom: '1px solid var(--store-line)',
        fontSize: 13,
        lineHeight: 1.5,
        color: 'var(--store-ink-soft)',
      }}
    >
      <span aria-hidden style={{ color, marginTop: 2, flexShrink: 0 }}>{icon}</span>
      <span>{children}</span>
    </li>
  );
}

/** Named markers placed at their true position on the log axis. */
const RIBBON_MARKS: { v: number; label: string }[] = [
  { v: 10e6, label: '10M' },
  { v: 100e6, label: '100M' },
  { v: 433e6, label: '433M' },
  { v: 1.4e9, label: 'L' },
  { v: 2.4e9, label: '2.4G' },
  { v: 5.8e9, label: '5.8G' },
  { v: 12e9, label: 'X/Ku' },
];

/** Compressed read-only RF spectrum showing where the loaded platforms emit. */
function CongestionRibbon({ platforms }: { platforms: ReturnType<typeof usePlatforms>['platforms'] }) {
  const W = 1000;
  const H = 56;
  const cfg = getAxisConfig('rf', [0, W]);
  const scale = makeLogScale(cfg.domain, cfg.range);

  const allCaps = platforms.flatMap((p) => (p.capabilities ?? []).filter((c) => c.axis === 'rf' || c.axis === 'gnss'));

  return (
    <div style={{ marginTop: 16 }}>
      <div
        style={{
          position: 'relative',
          height: H,
          borderRadius: 10,
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid var(--lacquer-line)',
          overflow: 'hidden',
        }}
      >
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }} aria-hidden>
          {RIBBON_MARKS.map((m) => (
            <line key={m.label} x1={scale(m.v)} x2={scale(m.v)} y1={0} y2={H} stroke="rgba(255,255,255,0.07)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}
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
                y={6}
                width={Math.max(x1 - x0, 2)}
                height={H - 12}
                rx={3}
                fill={LAYER_COLOR[c.layer]}
                opacity={0.18}
              />
            );
          })}
        </svg>
      </div>
      <div aria-hidden style={{ position: 'relative', height: 18, marginTop: 6 }}>
        {RIBBON_MARKS.map((m) => (
          <span
            key={m.label}
            className="sx-mono"
            style={{
              position: 'absolute',
              left: `${(scale(m.v) / W) * 100}%`,
              transform: 'translateX(-50%)',
              fontSize: 11,
              color: 'var(--store-ink-mute)',
              whiteSpace: 'nowrap',
            }}
          >
            {m.label}
          </span>
        ))}
      </div>
    </div>
  );
}
