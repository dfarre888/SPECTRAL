'use client';
/**
 * Shared UI primitives for the Spectrum Intelligence pages.
 * Small, presentational, Liquid Glass styled.
 */

import React from 'react';
import { PlatformThumbnail } from '@/components/platforms/PlatformThumbnail';
import type { Platform, SpectrumCapability, Side } from '@/lib/spectrum/types';
import { LAYER_COLOR, SIDE_COLOR, capabilityExtent, getAxisConfig, makeLogScale } from '@/lib/spectrum/scale';

/* ---------- GlassCard ---------- */
export function GlassCard({
  children,
  hi,
  style,
  glow,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { hi?: boolean; glow?: string }) {
  return (
    <div
      className={hi ? 'sx-glass-hi' : 'sx-glass'}
      style={{ position: 'relative', overflow: 'hidden', ...style }}
      {...rest}
    >
      {glow && (
        <div
          style={{
            position: 'absolute',
            right: -30,
            top: -30,
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${glow}, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />
      )}
      <div style={{ position: 'relative' }}>{children}</div>
    </div>
  );
}

/* ---------- StatPuck (KPI hero number) ---------- */
export function StatPuck({
  label,
  value,
  unit,
  delta,
  deltaColor,
  glow,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  delta?: string;
  deltaColor?: string;
  glow?: string;
}) {
  return (
    <GlassCard glow={glow} style={{ padding: 20, borderRadius: 18 }}>
      <div className="sx-mono sx-faint" style={{ fontSize: 10, letterSpacing: '0.12em' }}>
        {label}
      </div>
      <div
        className="sx-mono"
        style={{ fontSize: 42, fontWeight: 600, lineHeight: 1.1, marginTop: 8 }}
      >
        {value}
        {unit && <span style={{ fontSize: 18 }}>{unit}</span>}
      </div>
      {delta && (
        <div style={{ fontSize: 11, marginTop: 2, color: deltaColor ?? 'var(--sx-ink-dim)' }}>
          {delta}
        </div>
      )}
    </GlassCard>
  );
}

/* ---------- SideBadge ---------- */
export function SideBadge({ side, group, category }: { side: Side; group?: number | null; category?: string | null }) {
  const color = SIDE_COLOR[side];
  const txt =
    side === 'red'
      ? `RED${group ? ` · GROUP ${group}` : ''}${category ? ` · ${category.toUpperCase()}` : ''}`
      : side === 'blue'
      ? `BLUE${category ? ` · ${category.toUpperCase()}` : ''}`
      : 'NEUTRAL';
  return (
    <span
      className="sx-mono"
      style={{
        fontSize: 10,
        color,
        border: `1px solid ${color}66`,
        padding: '3px 8px',
        borderRadius: 7,
        display: 'inline-block',
      }}
    >
      {txt}
    </span>
  );
}

/* ---------- FootprintStrip (micro spectrum render for library cards) ---------- */
export function FootprintStrip({ platform, height = 20 }: { platform: Platform; height?: number }) {
  const caps = (platform.capabilities ?? []).filter((c) => c.axis === 'rf' || c.axis === 'gnss');
  const W = 240;
  const cfg = getAxisConfig('rf', [4, W - 4]);
  const scale = makeLogScale(cfg.domain, cfg.range);

  if (caps.length === 0) {
    // RF-silent — the teaching signal
    return (
      <div
        style={{
          height,
          borderRadius: 8,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--sx-glass-line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span className="sx-mono sx-faint" style={{ fontSize: 9, letterSpacing: '0.1em' }}>
          — RF SILENT —
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        height,
        borderRadius: 8,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--sx-glass-line)',
        overflow: 'hidden',
      }}
    >
      <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
        {caps.map((c) => {
          const ext = capabilityExtent(c, 'hz');
          if (!ext) return null;
          let x0 = scale(ext[0]);
          let x1 = scale(ext[1]);
          if (x1 < x0) [x0, x1] = [x1, x0];
          const color = platform.side === 'blue' ? SIDE_COLOR.blue : LAYER_COLOR[c.layer];
          return (
            <rect
              key={c.id}
              x={x0}
              y={3}
              width={Math.max(x1 - x0, 3)}
              height={height - 6}
              rx={4}
              fill={color}
              opacity={c.derived ? 0.4 : 0.85}
              strokeDasharray={c.derived ? '3 2' : undefined}
              stroke={c.derived ? color : 'none'}
              strokeWidth={c.derived ? 0.8 : 0}
            />
          );
        })}
      </svg>
    </div>
  );
}

/* ---------- PlatformIcon ---------- */
export function PlatformIcon({ platform, size = 54 }: { platform: Platform; size?: number }) {
  const red = platform.side === 'red';
  return (
    <div
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: size * 0.26,
        overflow: 'hidden',
        border: `1px solid ${red ? 'rgba(248,113,113,0.3)' : 'rgba(74,158,255,0.3)'}`,
      }}
    >
      <PlatformThumbnail
        id={platform.id}
        name={platform.name}
        size="fill"
        variant={red ? 'uas' : 'auto'}
        rounded="none"
        className="h-full w-full"
      />
    </div>
  );
}

/* ---------- PlatformSilhouette ---------- */
/**
 * SVG line-art silhouette for a platform, keyed to its category string.
 * Color: orange (#F97316) for Red, cyan (#06B6D4) for Blue.
 * viewBox is always 0 0 80 80 — rendered at `size` px square.
 */
export function PlatformSilhouette({ platform, size = 76 }: { platform: Platform; size?: number }) {
  const red = platform.side === 'red';
  const c = red ? '#F97316' : '#06B6D4';
  const cat = (platform.category ?? '').toLowerCase();

  const shared = {
    viewBox: '0 0 80 80',
    width: size,
    height: size,
    stroke: c,
    fill: 'none',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    style: { opacity: 0.88, flexShrink: 0 },
  };

  /* ── Quadcopter (COTS / Autonomous) — top view ── */
  if (cat.includes('quad') || cat.includes('cots') || cat.includes('autonomous')) {
    return (
      <svg {...shared}>
        {/* arms */}
        <line x1="32" y1="32" x2="14" y2="14" strokeWidth="1.8" />
        <line x1="48" y1="32" x2="66" y2="14" strokeWidth="1.8" />
        <line x1="32" y1="48" x2="14" y2="66" strokeWidth="1.8" />
        <line x1="48" y1="48" x2="66" y2="66" strokeWidth="1.8" />
        {/* body */}
        <rect x="27" y="27" width="26" height="26" rx="5" strokeWidth="1.8" />
        {/* motors */}
        <circle cx="12" cy="12" r="8" strokeWidth="1.5" />
        <circle cx="68" cy="12" r="8" strokeWidth="1.5" />
        <circle cx="12" cy="68" r="8" strokeWidth="1.5" />
        <circle cx="68" cy="68" r="8" strokeWidth="1.5" />
        {/* prop arcs */}
        <circle cx="12" cy="12" r="13" strokeWidth="0.8" strokeDasharray="3,3" opacity="0.45" />
        <circle cx="68" cy="12" r="13" strokeWidth="0.8" strokeDasharray="3,3" opacity="0.45" />
        <circle cx="12" cy="68" r="13" strokeWidth="0.8" strokeDasharray="3,3" opacity="0.45" />
        <circle cx="68" cy="68" r="13" strokeWidth="0.8" strokeDasharray="3,3" opacity="0.45" />
        {/* gimbal */}
        <circle cx="40" cy="40" r="4" strokeWidth="1.4" />
      </svg>
    );
  }

  /* ── FPV racer (H-frame) — top view ── */
  if (cat.includes('fpv')) {
    return (
      <svg {...shared}>
        {/* frame bars */}
        <line x1="22" y1="28" x2="58" y2="28" strokeWidth="2" />
        <line x1="22" y1="52" x2="58" y2="52" strokeWidth="2" />
        <line x1="22" y1="28" x2="22" y2="52" strokeWidth="2" />
        <line x1="58" y1="28" x2="58" y2="52" strokeWidth="2" />
        {/* FPV camera housing */}
        <rect x="30" y="14" width="20" height="15" rx="3" strokeWidth="1.5" />
        <circle cx="40" cy="21" r="4" strokeWidth="1.2" />
        {/* arms */}
        <line x1="22" y1="28" x2="10" y2="16" strokeWidth="1.8" />
        <line x1="58" y1="28" x2="70" y2="16" strokeWidth="1.8" />
        <line x1="22" y1="52" x2="10" y2="64" strokeWidth="1.8" />
        <line x1="58" y1="52" x2="70" y2="64" strokeWidth="1.8" />
        {/* motors */}
        <circle cx="8"  cy="14" r="7.5" strokeWidth="1.4" />
        <circle cx="72" cy="14" r="7.5" strokeWidth="1.4" />
        <circle cx="8"  cy="66" r="7.5" strokeWidth="1.4" />
        <circle cx="72" cy="66" r="7.5" strokeWidth="1.4" />
      </svg>
    );
  }

  /* ── OWA / delta-wing loitering munition (Shahed) — top view ── */
  if (cat.includes('owa')) {
    return (
      <svg {...shared}>
        <path d="M 40 5 L 75 74 L 40 64 L 5 74 Z" strokeWidth="1.8" />
        <line x1="40" y1="5" x2="40" y2="64" strokeWidth="0.8" strokeDasharray="4,3" />
        {/* pusher engine */}
        <circle cx="40" cy="62" r="5" strokeWidth="1.4" />
        {/* tail fin */}
        <line x1="40" y1="64" x2="40" y2="74" strokeWidth="2" />
        {/* warhead nose */}
        <circle cx="40" cy="8" r="3" strokeWidth="1.2" />
      </svg>
    );
  }

  /* ── Tube-launched loitering munition (Lancet / Switchblade) — side view ── */
  if (cat.includes('loitering')) {
    return (
      <svg {...shared}>
        {/* fuselage tube */}
        <rect x="12" y="33" width="56" height="14" rx="7" strokeWidth="1.8" />
        {/* deployed wings */}
        <line x1="26" y1="33" x2="15" y2="14" strokeWidth="1.8" />
        <line x1="54" y1="33" x2="65" y2="14" strokeWidth="1.8" />
        <line x1="15" y1="14" x2="65" y2="14" strokeWidth="1.4" />
        {/* tail fins */}
        <path d="M 62 40 L 76 47 L 76 33 Z" strokeWidth="1.4" />
        {/* seeker dome */}
        <circle cx="8" cy="40" r="5" strokeWidth="1.4" />
      </svg>
    );
  }

  /* ── MALE UCAV (TB2 / MQ-9 / CH-4) — top view, wide wingspan ── */
  if (cat.includes('male') || cat.includes('ucav')) {
    return (
      <svg {...shared}>
        {/* fuselage */}
        <rect x="37" y="4" width="6" height="72" rx="3" strokeWidth="1.8" />
        {/* main wings */}
        <path d="M 40 30 L 4 44 L 4 48 L 40 36 L 76 48 L 76 44 Z" strokeWidth="1.4" />
        {/* H-tail */}
        <line x1="22" y1="68" x2="58" y2="68" strokeWidth="1.5" />
        {/* sensor nose */}
        <circle cx="40" cy="6" r="3.5" strokeWidth="1.4" />
        {/* wingtip pods */}
        <rect x="2"  y="43" width="4" height="7" rx="2" strokeWidth="1" />
        <rect x="74" y="43" width="4" height="7" rx="2" strokeWidth="1" />
      </svg>
    );
  }

  /* ── Kinetic interceptor (Anduril Anvil) — compact dart ── */
  if (cat.includes('kinetic')) {
    return (
      <svg {...shared}>
        {/* compact delta */}
        <path d="M 40 8 L 72 72 L 40 58 L 8 72 Z" strokeWidth="1.8" />
        {/* spine */}
        <line x1="40" y1="8" x2="40" y2="58" strokeWidth="0.8" strokeDasharray="4,3" />
        {/* intercept tip */}
        <path d="M 38 5 L 40 0 L 42 5" strokeWidth="1.6" />
        {/* dual rear motors */}
        <circle cx="30" cy="64" r="4" strokeWidth="1.3" />
        <circle cx="50" cy="64" r="4" strokeWidth="1.3" />
        <circle cx="30" cy="64" r="7.5" strokeWidth="0.7" strokeDasharray="3,3" opacity="0.45" />
        <circle cx="50" cy="64" r="7.5" strokeWidth="0.7" strokeDasharray="3,3" opacity="0.45" />
      </svg>
    );
  }

  /* ── ISR / tactical fixed wing (Orlan-10, Ababil) — top view ── */
  if (cat.includes('isr') || cat.includes('tactical')) {
    return (
      <svg {...shared}>
        {/* fuselage */}
        <rect x="36" y="6" width="8" height="68" rx="4" strokeWidth="1.5" />
        {/* wings */}
        <path d="M 40 34 L 6 46 L 6 50 L 40 40 L 74 50 L 74 46 Z" strokeWidth="1.4" />
        {/* H-tail */}
        <line x1="24" y1="68" x2="56" y2="68" strokeWidth="1.4" />
        {/* pusher prop */}
        <circle cx="40" cy="74" r="5" strokeWidth="1.2" strokeDasharray="3,2" />
      </svg>
    );
  }

  /* ── Handheld jammer / passive RF detector ── */
  if (cat.includes('handheld') || cat.includes('passive rf') || cat.includes('jammer') && cat.includes('handheld')) {
    return (
      <svg {...shared}>
        {/* main body */}
        <rect x="14" y="30" width="50" height="24" rx="5" strokeWidth="1.8" />
        {/* pistol grip */}
        <rect x="30" y="54" width="20" height="22" rx="4" strokeWidth="1.8" />
        {/* trigger guard */}
        <path d="M 34 60 Q 40 70 46 60" strokeWidth="1.2" />
        {/* emitter barrel */}
        <rect x="6" y="36" width="12" height="12" rx="3" strokeWidth="1.4" />
        {/* antennas */}
        <line x1="52" y1="30" x2="52" y2="10" strokeWidth="2" />
        <line x1="60" y1="30" x2="62" y2="6"  strokeWidth="2" />
        <line x1="68" y1="30" x2="72" y2="12" strokeWidth="2" />
        <circle cx="52" cy="10" r="2" fill={c} stroke="none" />
        <circle cx="62" cy="6"  r="2" fill={c} stroke="none" />
        <circle cx="72" cy="12" r="2" fill={c} stroke="none" />
      </svg>
    );
  }

  /* ── Fixed multi-sensor / multi-sensor detection tower ── */
  if (cat.includes('fixed') || cat.includes('multi-sensor') || cat.includes('detection')) {
    return (
      <svg {...shared}>
        {/* base */}
        <rect x="14" y="56" width="52" height="16" rx="5" strokeWidth="1.8" />
        {/* mast */}
        <rect x="36" y="18" width="8" height="40" rx="3" strokeWidth="1.6" />
        {/* sensor dome */}
        <circle cx="40" cy="12" r="7" strokeWidth="1.8" />
        {/* radar dish */}
        <path d="M 15 24 Q 40 10 65 24" strokeWidth="1.6" />
        {/* stabiliser legs */}
        <line x1="14" y1="56" x2="8"  y2="72" strokeWidth="1.2" />
        <line x1="66" y1="56" x2="72" y2="72" strokeWidth="1.2" />
        <line x1="8"  y1="72" x2="72" y2="72" strokeWidth="1.2" />
      </svg>
    );
  }

  /* ── High-Power Microwave (Epirus Leonidas) ── */
  if (cat.includes('microwave') || cat.includes('high-power')) {
    return (
      <svg {...shared}>
        {/* vehicle body */}
        <rect x="10" y="54" width="60" height="18" rx="4" strokeWidth="1.8" />
        {/* emitter housing */}
        <rect x="14" y="26" width="52" height="30" rx="4" strokeWidth="1.6" />
        {/* aperture */}
        <rect x="20" y="18" width="40" height="12" rx="3" strokeWidth="1.4" />
        {/* HPM waveburst */}
        <path d="M 27 12 Q 30 5 33 12 Q 36 19 40 12 Q 44 5 47 12 Q 50 19 53 12" strokeWidth="1.4" />
        {/* wheels */}
        <circle cx="26" cy="70" r="5" strokeWidth="1.4" />
        <circle cx="54" cy="70" r="5" strokeWidth="1.4" />
      </svg>
    );
  }

  /* ── High-Energy Laser (LOCUST LWS) ── */
  if (cat.includes('laser') || cat.includes('high-energy')) {
    return (
      <svg {...shared}>
        {/* vehicle body */}
        <rect x="10" y="56" width="60" height="16" rx="4" strokeWidth="1.8" />
        {/* turret */}
        <rect x="24" y="34" width="32" height="24" rx="4" strokeWidth="1.6" />
        {/* beam director tube */}
        <rect x="16" y="38" width="16" height="8" rx="4" strokeWidth="1.4" />
        {/* laser beam */}
        <line x1="2"  y1="42" x2="16" y2="42" strokeWidth="2.5" />
        <line x1="2"  y1="40" x2="16" y2="40" strokeWidth="0.7" opacity="0.45" />
        <line x1="2"  y1="44" x2="16" y2="44" strokeWidth="0.7" opacity="0.45" />
        <circle cx="2" cy="42" r="2" fill={c} stroke="none" opacity="0.9" />
        {/* cooling fins */}
        <line x1="30" y1="34" x2="30" y2="28" strokeWidth="1.2" />
        <line x1="36" y1="34" x2="36" y2="26" strokeWidth="1.2" />
        <line x1="42" y1="34" x2="42" y2="26" strokeWidth="1.2" />
        <line x1="48" y1="34" x2="48" y2="28" strokeWidth="1.2" />
        {/* wheels */}
        <circle cx="26" cy="70" r="5" strokeWidth="1.4" />
        <circle cx="54" cy="70" r="5" strokeWidth="1.4" />
      </svg>
    );
  }

  /* ── EW vehicle: comms jammer / radar jammer / anti-drone EW ── */
  if (cat.includes('jammer') || cat.includes('anti-drone') || cat.includes('broadband') || cat.includes('comms')) {
    return (
      <svg {...shared}>
        {/* vehicle body */}
        <rect x="10" y="52" width="60" height="20" rx="4" strokeWidth="1.8" />
        {/* ECM housing */}
        <rect x="14" y="26" width="52" height="28" rx="4" strokeWidth="1.6" />
        {/* parabolic dish */}
        <path d="M 10 30 Q 40 10 70 30" strokeWidth="1.8" />
        <line x1="14" y1="30" x2="66" y2="30" strokeWidth="1.2" />
        {/* EM wave bursts */}
        <path d="M 24 18 Q 29 12 34 18" strokeWidth="1.1" opacity="0.75" />
        <path d="M 40 14 Q 45 8 50 14"  strokeWidth="1.1" opacity="0.75" />
        {/* wheels */}
        <circle cx="26" cy="70" r="6" strokeWidth="1.5" />
        <circle cx="54" cy="70" r="6" strokeWidth="1.5" />
      </svg>
    );
  }

  /* ── Default fallback — quadcopter silhouette ── */
  return (
    <svg {...shared}>
      <line x1="32" y1="32" x2="14" y2="14" strokeWidth="1.8" />
      <line x1="48" y1="32" x2="66" y2="14" strokeWidth="1.8" />
      <line x1="32" y1="48" x2="14" y2="66" strokeWidth="1.8" />
      <line x1="48" y1="48" x2="66" y2="66" strokeWidth="1.8" />
      <rect x="27" y="27" width="26" height="26" rx="5" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="7" strokeWidth="1.5" />
      <circle cx="68" cy="12" r="7" strokeWidth="1.5" />
      <circle cx="12" cy="68" r="7" strokeWidth="1.5" />
      <circle cx="68" cy="68" r="7" strokeWidth="1.5" />
    </svg>
  );
}
