'use client';
/**
 * ThreatLibrary — the catalogue (Mockup Frame 02).
 * Red threats and Blue effectors as rich cards, each showing its spectral
 * footprint as a thumbnail. Filter by side, group, and text search.
 *
 * v2 — surfaces year_introduced, gnss_dependency, defeat_note, control_link_freq
 *      adds Group 1–5 filter chips below the side filter row
 */

import React, { useMemo, useState } from 'react';
import type { Platform, Side, UASGroup, GnssDependency } from '@/lib/spectrum/types';
import { usePlatforms } from './data';
import { GlassCard, SideBadge, FootprintStrip, PlatformSilhouette } from '@/components/ui/primitives';

// ─── GNSS badge config ─────────────────────────────────────────────────────────
const GNSS_BADGE: Record<GnssDependency, { label: string; color: string }> = {
  high:   { label: 'GNSS·HIGH',   color: '#f87171' },
  medium: { label: 'GNSS·MED',    color: '#fb923c' },
  low:    { label: 'GNSS·LOW',    color: '#4ade80' },
  none:   { label: 'GNSS·NONE',   color: '#6b7280' },
};

const GROUP_LABELS: Record<number, string> = {
  1: 'Grp 1',
  2: 'Grp 2',
  3: 'Grp 3',
  4: 'Grp 4',
  5: 'Grp 5',
};

// ─── Component ─────────────────────────────────────────────────────────────────
export function ThreatLibrary({
  onOpen,
  onSelect,
  selectedIds = [],
}: {
  onOpen?: (p: Platform) => void;
  onSelect?: (p: Platform) => void;
  selectedIds?: string[];
}) {
  const { platforms } = usePlatforms();
  const [q, setQ] = useState('');
  const [sideFilter, setSideFilter] = useState<Side | 'all'>('all');
  const [groupFilter, setGroupFilter] = useState<UASGroup>(null);

  // Compute which group numbers are present in the current side-filtered set
  const activeGroups = useMemo<number[]>(() => {
    const visible =
      sideFilter === 'red'
        ? platforms.filter((p) => p.side === 'red')
        : sideFilter === 'blue'
        ? platforms.filter((p) => p.side === 'blue')
        : platforms;
    const gs = new Set<number>();
    visible.forEach((p) => { if (p.group != null) gs.add(p.group); });
    return Array.from(gs).sort((a, b) => a - b);
  }, [platforms, sideFilter]);

  const filtered = useMemo(() => {
    return platforms.filter((p) => {
      if (sideFilter !== 'all' && p.side !== sideFilter) return false;
      if (groupFilter !== null && p.group !== groupFilter) return false;
      if (q && !`${p.name} ${p.origin ?? ''} ${p.category ?? ''}`.toLowerCase().includes(q.toLowerCase()))
        return false;
      return true;
    });
  }, [platforms, q, sideFilter, groupFilter]);

  const redCount = platforms.filter((p) => p.side === 'red').length;
  const blueCount = platforms.filter((p) => p.side === 'blue').length;

  const handleSideFilter = (side: Side) => {
    setSideFilter((prev) => (prev === side ? 'all' : side));
    setGroupFilter(null); // reset group when side changes
  };

  return (
    <div>
      {/* ── toolbar ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {/* row 1: search + side chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div
            className="sx-glass"
            style={{
              padding: '9px 16px',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flex: '1 1 240px',
              minWidth: 200,
            }}
          >
            <span style={{ color: 'var(--sx-ink-faint)' }}>⌕</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search platforms…"
              style={{
                background: 'none',
                border: 'none',
                outline: 'none',
                color: 'var(--sx-ink)',
                fontSize: 12.5,
                fontFamily: 'var(--sx-ui)',
                width: '100%',
              }}
            />
          </div>
          <FilterChip
            active={sideFilter === 'red'}
            color="var(--sx-red)"
            onClick={() => handleSideFilter('red')}
          >
            ● Red · {redCount}
          </FilterChip>
          <FilterChip
            active={sideFilter === 'blue'}
            color="var(--sx-blue)"
            onClick={() => handleSideFilter('blue')}
          >
            ● Blue · {blueCount}
          </FilterChip>
        </div>

        {/* row 2: group chips — only when Red or All, and groups exist */}
        {activeGroups.length > 0 && sideFilter !== 'blue' && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingLeft: 2 }}>
            {activeGroups.map((g) => (
              <FilterChip
                key={g}
                active={groupFilter === g}
                color="rgba(255,255,255,0.40)"
                onClick={() => setGroupFilter(groupFilter === g ? null : (g as UASGroup))}
              >
                {GROUP_LABELS[g]}
              </FilterChip>
            ))}
          </div>
        )}
      </div>

      {/* ── grid ────────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        {filtered.map((p) => {
          const isSel = selectedIds.includes(p.id);
          const red = p.side === 'red';
          const tintGlow = red ? 'rgba(248,113,113,0.18)' : 'rgba(74,158,255,0.18)';
          return (
            <GlassCard
              key={p.id}
              hi={isSel}
              style={{
                padding: 0,
                cursor: 'pointer',
                transition: 'transform .15s, box-shadow .15s',
                outline: isSel
                  ? `1px solid ${red ? 'rgba(248,113,113,0.5)' : 'rgba(74,158,255,0.5)'}`
                  : 'none',
              }}
              onClick={() => onSelect?.(p)}
              onDoubleClick={() => onOpen?.(p)}
            >
              {/* ── card header ─────────────────────────────────────────────── */}
              <div
                style={{
                  height: 118,
                  background: `radial-gradient(110% 130% at 30% 0%, ${tintGlow}, transparent 60%), linear-gradient(160deg, #14181c, #0a0c0e)`,
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                <PlatformSilhouette platform={p} size={76} />
                <div style={{ position: 'absolute', top: 12, right: 12 }}>
                  <SideBadge side={p.side} group={p.group} category={p.category} />
                </div>
              </div>

              {/* ── card body ───────────────────────────────────────────────── */}
              <div style={{ padding: 16 }}>
                {/* name */}
                <div className="sx-display" style={{ fontWeight: 600, fontSize: 15 }}>
                  {p.name}
                </div>

                {/* origin · variant · year */}
                <div className="sx-faint" style={{ fontSize: 11, marginTop: 2 }}>
                  {p.origin ?? '—'}
                  {p.variant_label ? ` · ${p.variant_label}` : ''}
                  {p.year_introduced ? ` · ${p.year_introduced}` : ''}
                </div>

                {/* role */}
                {p.role && (
                  <div
                    style={{
                      fontSize: 11,
                      color: 'rgba(255,255,255,0.38)',
                      marginTop: 3,
                      fontStyle: 'italic',
                    }}
                  >
                    {p.role}
                  </div>
                )}

                {/* GNSS dependency badge */}
                {p.gnss_dependency && (
                  <div style={{ marginTop: 7 }}>
                    <GnssBadge dep={p.gnss_dependency} />
                  </div>
                )}

                {/* specs strip: RNG / SPD / MASS / WH */}
                {(p.range_km != null || p.speed_kmh != null || p.mass_kg != null) && (
                  <div style={{ display: 'flex', gap: 14, marginTop: 11 }}>
                    {p.range_km   != null && <SpecPill label="RNG"  value={`${p.range_km} km`}    />}
                    {p.speed_kmh  != null && <SpecPill label="SPD"  value={`${p.speed_kmh} km/h`} />}
                    {p.mass_kg    != null && <SpecPill label="MASS" value={`${p.mass_kg} kg`}      />}
                    {p.warhead_kg != null && <SpecPill label="WH"   value={`${p.warhead_kg} kg`}   accent="#f87171" />}
                  </div>
                )}

                {/* spectrum footprint strip */}
                <div style={{ marginTop: 11 }}>
                  <FootprintStrip platform={p} />
                </div>

                {/* quick tags */}
                <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                  {quickTags(p).map((t) => (
                    <span
                      key={t.text}
                      className="sx-mono"
                      style={{
                        fontSize: 9,
                        padding: '3px 7px',
                        borderRadius: 6,
                        background: `${t.color}1f`,
                        color: t.color,
                      }}
                    >
                      {t.text}
                    </span>
                  ))}
                </div>

                {/* intel note */}
                {p.intel_note && (
                  <div
                    style={{
                      marginTop: 12,
                      paddingTop: 10,
                      borderTop: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        marginBottom: 5,
                      }}
                    >
                      <span
                        className="sx-mono"
                        style={{
                          fontSize: 8,
                          letterSpacing: '0.12em',
                          color: 'rgba(255,255,255,0.25)',
                        }}
                      >
                        INTEL
                      </span>
                      {p.confidence === 'estimated' && (
                        <span
                          className="sx-mono"
                          style={{ fontSize: 8, color: '#F97316', opacity: 0.6 }}
                        >
                          · ESTIMATED
                        </span>
                      )}
                    </div>
                    <p
                      className="sx-mono"
                      style={
                        {
                          fontSize: 10,
                          color: 'rgba(255,255,255,0.38)',
                          lineHeight: 1.6,
                          margin: 0,
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        } as React.CSSProperties
                      }
                    >
                      {p.intel_note}
                    </p>
                  </div>
                )}

                {/* defeat note — amber section */}
                {p.defeat_note && (
                  <div
                    style={{
                      marginTop: 10,
                      paddingTop: 8,
                      borderTop: '1px solid rgba(251,146,60,0.12)',
                    }}
                  >
                    <span
                      className="sx-mono"
                      style={{
                        fontSize: 8,
                        letterSpacing: '0.12em',
                        color: 'rgba(251,146,60,0.55)',
                      }}
                    >
                      DEFEAT
                    </span>
                    <p
                      className="sx-mono"
                      style={
                        {
                          fontSize: 9.5,
                          color: 'rgba(251,146,60,0.50)',
                          lineHeight: 1.55,
                          margin: '4px 0 0',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        } as React.CSSProperties
                      }
                    >
                      {p.defeat_note}
                    </p>
                  </div>
                )}
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}

// ─── GnssBadge ────────────────────────────────────────────────────────────────
function GnssBadge({ dep }: { dep: GnssDependency }) {
  const { label, color } = GNSS_BADGE[dep];
  return (
    <span
      className="sx-mono"
      style={{
        fontSize: 8.5,
        padding: '2px 7px',
        borderRadius: 5,
        background: `${color}1a`,
        color,
        border: `1px solid ${color}30`,
        letterSpacing: '0.08em',
      }}
    >
      {label}
    </span>
  );
}

// ─── SpecPill ─────────────────────────────────────────────────────────────────
function SpecPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span
        className="sx-mono"
        style={{ fontSize: 8, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.22)' }}
      >
        {label}
      </span>
      <span
        className="sx-mono"
        style={{ fontSize: 11, fontWeight: 600, color: accent ?? 'rgba(255,255,255,0.65)' }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── FilterChip ───────────────────────────────────────────────────────────────
function FilterChip({
  children,
  active,
  color,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="sx-glass"
      style={{
        padding: '9px 14px',
        borderRadius: 12,
        fontSize: 12,
        color,
        border: active ? `1px solid ${color}` : '1px solid var(--sx-glass-line)',
        background: active ? `${color}14` : undefined,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

// ─── quickTags — derived from capabilities + control_link_freq ────────────────
function quickTags(p: Platform): { text: string; color: string }[] {
  const tags: { text: string; color: string }[] = [];
  const caps = p.capabilities ?? [];

  const hasRf = caps.some(
    (c) =>
      (c.axis === 'rf' || c.axis === 'gnss') &&
      ['control', 'video', 'datalink', 'telemetry'].includes(c.fn),
  );
  const silent =
    caps.some((c) => (c.defeat_resistance ?? []).includes('rf_silent')) ||
    (!hasRf && p.side === 'red');
  const crpa = caps.some((c) =>
    (c.defeat_resistance ?? []).some((r) => r.endsWith('_high')),
  );
  const ir = caps.some((c) => c.axis === 'eo_ir' && c.fn === 'sensor');
  const hpm = caps.some((c) => c.fn === 'hpm');
  const jam = caps.some((c) => c.fn.startsWith('jam_'));
  const detect = caps.some((c) => c.fn.startsWith('detect_'));

  // control_link_freq-derived tag
  const freq = p.control_link_freq?.toLowerCase() ?? '';
  const isFOC = freq.includes('fiber') || freq.includes('fibre') || freq.includes('optical');
  const isSatcom =
    freq.includes('ku-band') || freq.includes('ka-band') || freq.includes('satcom');

  if (isFOC || silent) tags.push({ text: 'JAM-IMMUNE', color: '#f87171' });
  if (crpa) tags.push({ text: 'CRPA ANTI-JAM', color: '#4ade80' });
  if (isSatcom && !isFOC) tags.push({ text: 'SATCOM', color: '#c084fc' });
  if (ir) tags.push({ text: 'EO/IR', color: '#e879f9' });
  if (hpm) tags.push({ text: 'HPM', color: '#4a9eff' });
  if (jam && !hpm) tags.push({ text: 'RF + GNSS JAM', color: '#4a9eff' });
  if (detect && !jam) tags.push({ text: 'DETECT', color: '#22d3ee' });

  return tags.slice(0, 4);
}
