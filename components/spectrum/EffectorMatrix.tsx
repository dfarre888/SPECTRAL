'use client';
/**
 * EffectorMatrix — the F3 / Find-Fix-Finish effector view.
 * Shows the layered air-defence picture: effectors grouped by tier
 * (strategic BMD → long → medium → SHORAD → point defence → CIWS → C-UAS),
 * Red and Blue side by side, each card surfacing the engagement envelope
 * (range/altitude), effect type, Pk, magazine, and cost-per-shot.
 *
 * Clicking an effector stages it; "stage laydown" hands the set to the map.
 */

import React, { useState, useMemo } from 'react';
import type { EffectorSystem, EffectorTier, EffectType } from '@/lib/spectrum/effector-types';
import { useEffectors, effectorsByTier } from './effector-data';
import { GlassCard } from '@/components/ui/primitives';

const TIER_LABEL: Record<EffectorTier, string> = {
  strategic_bmd: 'Strategic BMD',
  long: 'Long-range SAM',
  medium: 'Medium-range SAM',
  shorad: 'SHORAD',
  point_defence: 'Point defence',
  ciws_naval: 'CIWS / Naval',
  c_uas: 'Counter-UAS / DE',
};

const EFFECT_LABEL: Record<EffectType, { label: string; color: string }> = {
  kinetic_missile: { label: 'Kinetic missile', color: 'var(--sx-red)' },
  kinetic_gun: { label: 'Gun', color: 'var(--sx-amber)' },
  hpm: { label: 'HPM', color: 'var(--sx-purple)' },
  laser: { label: 'Laser', color: 'var(--sx-cyan)' },
  kinetic_interceptor_drone: { label: 'Interceptor', color: 'var(--sx-orange)' },
  net_capture: { label: 'Capture', color: 'var(--sx-green)' },
};

export function EffectorMatrix({
  onSelect,
  selectedIds = [],
  onStageLaydown,
}: {
  onSelect?: (e: EffectorSystem) => void;
  selectedIds?: string[];
  onStageLaydown?: (ids: string[]) => void;
}) {
  const effectors = useEffectors();
  const [side, setSide] = useState<'blue' | 'red'>('blue');
  const groups = useMemo(() => effectorsByTier(effectors, side), [effectors, side]);

  return (
    <GlassCard style={{ padding: 22, borderRadius: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <div className="sx-display" style={{ fontWeight: 600, fontSize: 14 }}>Effectors — layered Find · Fix · Finish</div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {(['blue', 'red'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSide(s)}
              style={{
                padding: '7px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: side === s ? (s === 'blue' ? 'rgba(74,158,255,0.16)' : 'rgba(248,113,113,0.16)') : 'transparent',
                color: side === s ? (s === 'blue' ? 'var(--sx-blue)' : 'var(--sx-red)') : 'var(--sx-ink-dim)',
                border: `1px solid ${side === s ? (s === 'blue' ? 'rgba(74,158,255,0.3)' : 'rgba(248,113,113,0.3)') : 'var(--sx-glass-line)'}`,
              }}
            >
              {s === 'blue' ? 'Blue (defend)' : 'Red (threat)'}
            </button>
          ))}
          {selectedIds.length > 0 && onStageLaydown && (
            <button
              onClick={() => onStageLaydown(selectedIds)}
              style={{ padding: '7px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'var(--sx-orange)', color: '#0a0c0e', border: 'none' }}
            >
              Stage {selectedIds.length} → Map ⊕
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {groups.map((g) => (
          <div key={g.tier}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div className="sx-mono" style={{ fontSize: 10, letterSpacing: '0.14em', color: 'var(--sx-orange-soft)', textTransform: 'uppercase' }}>{TIER_LABEL[g.tier]}</div>
              <div style={{ flex: 1, height: 1, background: 'var(--sx-glass-line)' }} />
              <div className="sx-faint sx-mono" style={{ fontSize: 10 }}>{g.effectors.length}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(258px, 1fr))', gap: 10 }}>
              {g.effectors.map((e) => (
                <EffectorCard key={e.id} effector={e} selected={selectedIds.includes(e.id)} onClick={() => onSelect?.(e)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

function EffectorCard({ effector: e, selected, onClick }: { effector: EffectorSystem; selected: boolean; onClick: () => void }) {
  const fx = EFFECT_LABEL[e.effect];
  const env = e.envelope;
  return (
    <button
      onClick={onClick}
      className="sx-glass"
      style={{
        padding: 14, borderRadius: 13, textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 9,
        border: selected ? '1px solid var(--sx-orange)' : '1px solid var(--sx-glass-line)',
        boxShadow: selected ? '0 0 0 1px var(--sx-orange), 0 8px 24px -12px var(--sx-orange)' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{e.name}</div>
          {e.nato_name && <div className="sx-faint sx-mono" style={{ fontSize: 9.5, marginTop: 2 }}>{e.nato_name}</div>}
        </div>
        <span className="sx-mono" style={{ fontSize: 9, padding: '3px 7px', borderRadius: 6, background: `${fx.color}22`, color: fx.color, whiteSpace: 'nowrap' }}>{fx.label}</span>
      </div>

      {/* envelope readout */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
        <Stat label="RANGE" value={`${env.min_range_km}–${env.max_range_km} km`} />
        <Stat label="ALT" value={`${env.min_alt_km}–${env.max_alt_km} km`} />
        {env.no_escape_range_km != null && <Stat label="NEZ" value={`${env.no_escape_range_km} km`} />}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
        {e.pk_estimate != null && <Stat label="Pk" value={`${Math.round(e.pk_estimate * 100)}%`} />}
        <Stat label="MAG" value={e.magazine != null ? `${e.magazine}` : '∞'} />
        {e.cost_per_shot_usd != null && <Stat label="$/SHOT" value={fmtCost(e.cost_per_shot_usd)} />}
      </div>

      {/* what it kills */}
      <div className="sx-dim" style={{ fontSize: 10, lineHeight: 1.5 }}>
        Defeats: {e.defeats.slice(0, 4).map((d) => d.replace(/_/g, ' ')).join(', ')}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className="sx-dot" style={{ width: 7, height: 7, color: e.arm_sead_vulnerability === 'high' ? 'var(--sx-red)' : e.arm_sead_vulnerability === 'medium' ? 'var(--sx-amber)' : 'var(--sx-green)', background: 'currentColor' }} />
        <span className="sx-faint" style={{ fontSize: 9.5 }}>{e.mobility.replace(/_/g, '-')} · ARM risk {e.arm_sead_vulnerability ?? 'n/a'}</span>
      </div>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span className="sx-faint sx-mono" style={{ fontSize: 8, letterSpacing: '0.1em' }}>{label}</span>
      <span className="sx-mono" style={{ fontSize: 11, color: 'var(--sx-ink)' }}>{value}</span>
    </div>
  );
}

function fmtCost(usd: number): string {
  if (usd >= 1e6) return `$${(usd / 1e6).toFixed(1)}M`;
  if (usd >= 1e3) return `$${(usd / 1e3).toFixed(0)}k`;
  return `$${usd}`;
}
