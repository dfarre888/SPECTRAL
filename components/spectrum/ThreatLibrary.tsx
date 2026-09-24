'use client';
/**
 * ThreatLibrary: the catalogue (Mockup Frame 02).
 * Red threats and Blue effectors as a sortable table (default) or a gallery
 * of cards, each showing its spectral footprint. Filter by side, group, and
 * text search.
 *
 * v2: surfaces year_introduced, gnss_dependency, defeat_note, control_link_freq
 *      adds Group 1–5 filter chips below the side filter row
 * v3: table view with sticky header and pinned name column; gallery optional
 */

import React, { useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import type { Platform, Side, UASGroup, GnssDependency } from '@/lib/spectrum/types';
import { usePlatforms } from './data';
import { PlatformThumbnail } from '@/components/platforms/PlatformThumbnail';
import { SideBadge } from '@/components/ui/primitives';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';
import { LAYER_COLOR, SIDE_COLOR, capabilityExtent, getAxisConfig, makeLogScale } from '@/lib/spectrum/scale';

// ─── GNSS dependency: tag colour carries the meaning ───────────────────────────
const GNSS_TAG: Record<GnssDependency, { label: string; cls: string }> = {
  high: { label: 'High', cls: 'tag red' },
  medium: { label: 'Medium', cls: 'tag amber' },
  low: { label: 'Low', cls: 'tag green' },
  none: { label: 'None', cls: 'tag' },
};
const GNSS_RANK: Record<GnssDependency, number> = { high: 0, medium: 1, low: 2, none: 3 };
const SIDE_RANK: Record<string, number> = { red: 0, blue: 1, neutral: 2 };

type SideFilter = Side | 'all';
type View = 'table' | 'gallery';

const fmtNum = (n: number | null | undefined) => (n == null ? '' : n.toLocaleString());

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
  const [sideFilter, setSideFilter] = useState<SideFilter>('all');
  const [groupFilter, setGroupFilter] = useState<UASGroup>(null);
  const [view, setView] = useState<View>('table');

  // Compute which group numbers are present in the current side-filtered set
  const activeGroups = useMemo<number[]>(() => {
    const visible = sideFilter === 'all' ? platforms : platforms.filter((p) => p.side === sideFilter);
    const gs = new Set<number>();
    visible.forEach((p) => {
      if (p.group != null) gs.add(p.group);
    });
    return Array.from(gs).sort((a, b) => a - b);
  }, [platforms, sideFilter]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return platforms.filter((p) => {
      if (sideFilter !== 'all' && p.side !== sideFilter) return false;
      if (groupFilter !== null && p.group !== groupFilter) return false;
      if (needle && !`${p.name} ${p.origin ?? ''} ${p.category ?? ''} ${p.role ?? ''}`.toLowerCase().includes(needle))
        return false;
      return true;
    });
  }, [platforms, q, sideFilter, groupFilter]);

  const counts = useMemo(
    () => ({
      all: platforms.length,
      red: platforms.filter((p) => p.side === 'red').length,
      blue: platforms.filter((p) => p.side === 'blue').length,
      neutral: platforms.filter((p) => p.side === 'neutral').length,
    }),
    [platforms],
  );

  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  const handleSideFilter = (side: SideFilter) => {
    setSideFilter(side);
    setGroupFilter(null); // reset group when side changes
  };

  const columns = useMemo<DataColumn<Platform>[]>(
    () => [
      {
        key: 'name',
        header: 'Platform',
        sticky: true,
        width: 250,
        sortValue: (p) => p.name,
        cell: (p) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <PlatformThumbnail id={p.id} name={p.name} size="xs" rounded="sm" />
            <button
              type="button"
              className="sx-link"
              onClick={(e) => {
                e.stopPropagation();
                onOpen?.(p);
              }}
              title={`Open ${p.name} dossier`}
              style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {p.name}
            </button>
            {selected.has(p.id) && (
              <Check size={15} aria-label="Selected" style={{ color: 'var(--wb-blue)', flexShrink: 0 }} />
            )}
          </div>
        ),
      },
      {
        key: 'origin',
        header: 'Origin',
        width: 190,
        className: 'clip',
        sortValue: (p) => p.origin ?? null,
        cell: (p) => <span title={p.origin ?? undefined}>{p.origin ?? ''}</span>,
      },
      {
        key: 'side',
        header: 'Side',
        width: 96,
        sortValue: (p) => SIDE_RANK[p.side] ?? 3,
        cell: (p) => (
          <span className={p.side === 'red' ? 'tag red' : p.side === 'blue' ? 'tag blue' : 'tag'}>
            {p.side === 'red' ? 'Red' : p.side === 'blue' ? 'Blue' : 'Neutral'}
          </span>
        ),
      },
      {
        key: 'group',
        header: 'Group',
        width: 80,
        align: 'right',
        sortValue: (p) => p.group ?? null,
        cell: (p) => (p.group != null ? p.group : ''),
      },
      {
        key: 'category',
        header: 'Category',
        width: 170,
        className: 'clip',
        sortValue: (p) => p.category ?? null,
        cell: (p) => <span title={p.category ?? undefined}>{p.category ?? ''}</span>,
      },
      {
        key: 'role',
        header: 'Role',
        width: 230,
        className: 'clip',
        sortValue: (p) => p.role ?? null,
        cell: (p) => <span title={p.role ?? undefined}>{p.role ?? ''}</span>,
      },
      {
        key: 'year',
        header: 'Year',
        width: 76,
        align: 'right',
        sortValue: (p) => p.year_introduced ?? null,
        cell: (p) => (p.year_introduced != null ? p.year_introduced : ''),
      },
      {
        key: 'range',
        header: 'Range km',
        width: 104,
        align: 'right',
        sortValue: (p) => p.range_km ?? null,
        cell: (p) => fmtNum(p.range_km),
      },
      {
        key: 'speed',
        header: 'Speed km/h',
        width: 116,
        align: 'right',
        sortValue: (p) => p.speed_kmh ?? null,
        cell: (p) => fmtNum(p.speed_kmh),
      },
      {
        key: 'mass',
        header: 'Mass kg',
        width: 100,
        align: 'right',
        sortValue: (p) => p.mass_kg ?? null,
        cell: (p) => fmtNum(p.mass_kg),
      },
      {
        key: 'warhead',
        header: 'Warhead kg',
        width: 116,
        align: 'right',
        sortValue: (p) => p.warhead_kg ?? null,
        cell: (p) => (p.warhead_kg != null ? <span style={{ color: 'var(--sx-red)' }}>{fmtNum(p.warhead_kg)}</span> : ''),
      },
      {
        key: 'gnss',
        header: 'GNSS dependency',
        width: 150,
        sortValue: (p) => (p.gnss_dependency ? GNSS_RANK[p.gnss_dependency] : null),
        cell: (p) =>
          p.gnss_dependency ? <span className={GNSS_TAG[p.gnss_dependency].cls}>{GNSS_TAG[p.gnss_dependency].label}</span> : '',
      },
      {
        key: 'link',
        header: 'Control link',
        width: 180,
        className: 'clip mono',
        sortValue: (p) => p.control_link_freq ?? null,
        cell: (p) => <span title={p.control_link_freq ?? undefined}>{p.control_link_freq ?? ''}</span>,
      },
      {
        key: 'footprint',
        header: 'RF footprint',
        width: 180,
        cell: (p) => <Footprint platform={p} />,
      },
      {
        key: 'flags',
        header: 'Flags',
        width: 250,
        cell: (p) => (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'nowrap', overflow: 'hidden' }}>
            {quickTags(p).slice(0, 2).map((t) => (
              <span key={t.text} className={t.cls} style={t.style}>
                {t.text}
              </span>
            ))}
          </div>
        ),
      },
      {
        key: 'intel',
        header: 'Intel note',
        width: 340,
        className: 'clip',
        cell: (p) => <span title={p.intel_note ?? undefined}>{p.intel_note ?? ''}</span>,
      },
      {
        key: 'defeat',
        header: 'Defeat note',
        width: 300,
        className: 'clip',
        cell: (p) => <span title={p.defeat_note ?? undefined}>{p.defeat_note ?? ''}</span>,
      },
    ],
    [onOpen, selected],
  );

  const tableMin = columns.reduce((n, c) => n + (typeof c.width === 'number' ? c.width : 0), 0);

  return (
    <div>
      {/* ── toolbar ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <label
          className="glass-field"
          style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 12px', flex: '1 1 220px', maxWidth: 340 }}
        >
          <Search size={15} aria-hidden style={{ color: 'var(--store-ink-mute)', flexShrink: 0 }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, origin, category, role"
            aria-label="Search platforms"
            style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--store-ink)', fontSize: 13, width: '100%', minWidth: 0 }}
          />
          <span className="sx-mono" aria-live="polite" title="Rows shown" style={{ fontSize: 12, color: 'var(--store-ink-mute)', flexShrink: 0 }}>
            {filtered.length}
          </span>
        </label>
        <div className="seg" role="group" aria-label="Side">
          {(
            [
              ['all', 'All', counts.all],
              ['red', 'Red', counts.red],
              ['blue', 'Blue', counts.blue],
              ['neutral', 'Neutral', counts.neutral],
            ] as [SideFilter, string, number][]
          )
            .filter(([k, , n]) => k === 'all' || n > 0)
            .map(([k, label, n]) => (
              <button key={k} type="button" aria-pressed={sideFilter === k} onClick={() => handleSideFilter(k)}>
                {k !== 'all' && (
                  <span className="sx-dot" style={{ width: 7, height: 7, background: k === 'red' ? 'var(--wb-red)' : k === 'blue' ? 'var(--wb-blue)' : 'var(--wb-neutral)' }} />
                )}
                {label}
                <span className="sx-mono" style={{ fontSize: 12, color: 'var(--store-ink-mute)' }}>{n}</span>
              </button>
            ))}
        </div>
        {activeGroups.length > 0 && sideFilter !== 'blue' && (
          <select
            className="glass-field"
            aria-label="UAS group"
            value={groupFilter ?? ''}
            onChange={(e) => setGroupFilter(e.target.value === '' ? null : (Number(e.target.value) as UASGroup))}
            style={{ height: 36, padding: '0 10px', fontSize: 13 }}
          >
            <option value="">Any group</option>
            {activeGroups.map((g) => (
              <option key={g} value={g}>
                Group {g}
              </option>
            ))}
          </select>
        )}
        <div className="seg sm" role="group" aria-label="Layout" style={{ marginLeft: 'auto' }}>
          <button type="button" aria-pressed={view === 'table'} onClick={() => setView('table')}>
            Table
          </button>
          <button type="button" aria-pressed={view === 'gallery'} onClick={() => setView('gallery')}>
            Gallery
          </button>
        </div>
      </div>

      {view === 'table' ? (
        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(p) => p.id}
          onRowClick={(p) => onSelect?.(p)}
          compact
          className="sx-dt-fixed"
          style={{ '--sx-dt-min': `${tableMin}px` } as React.CSSProperties}
          maxHeight="max(360px, calc(100vh - 410px))"
          caption="Spectrum platform library"
          empty="No platforms match these filters."
        />
      ) : (
        <Gallery platforms={filtered} selected={selected} onSelect={onSelect} onOpen={onOpen} />
      )}
    </div>
  );
}

// ─── Gallery (image-led cards) ────────────────────────────────────────────────
function Gallery({
  platforms,
  selected,
  onSelect,
  onOpen,
}: {
  platforms: Platform[];
  selected: Set<string>;
  onSelect?: (p: Platform) => void;
  onOpen?: (p: Platform) => void;
}) {
  if (platforms.length === 0) {
    return <p className="sx-cap" style={{ padding: '40px 0', textAlign: 'center' }}>No platforms match these filters.</p>;
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
      {platforms.map((p) => {
        const isSel = selected.has(p.id);
        return (
          <div
            key={p.id}
            role="button"
            tabIndex={0}
            aria-pressed={isSel}
            className="sx-glass sx-card"
            style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            onClick={() => onSelect?.(p)}
            onDoubleClick={() => onOpen?.(p)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onOpen?.(p);
              if (e.key === ' ') {
                e.preventDefault();
                onSelect?.(p);
              }
            }}
          >
            <div
              style={{
                height: 112,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderBottom: '1px solid var(--lacquer-line)',
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              <PlatformThumbnail id={p.id} name={p.name} size="xl" />
            </div>

            <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
              <div>
                <div style={{ marginBottom: 8, display: 'flex' }}>
                  <SideBadge side={p.side} group={p.group} category={p.category} />
                </div>
                <button
                  type="button"
                  className="sx-link sx-display"
                  style={{ fontSize: 15, fontWeight: 600 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen?.(p);
                  }}
                >
                  {p.name}
                </button>
                <div className="sx-cap" style={{ marginTop: 2 }}>
                  {[p.origin, p.variant_label, p.year_introduced].filter(Boolean).join(' · ')}
                </div>
                {p.role && (
                  <div style={{ fontSize: 12, color: 'var(--store-ink-soft)', marginTop: 4 }}>{p.role}</div>
                )}
              </div>

              {(p.range_km != null || p.speed_kmh != null || p.mass_kg != null || p.warhead_kg != null) && (
                <dl style={{ display: 'flex', gap: 16, margin: 0 }}>
                  {p.range_km != null && <Spec label="Range" value={`${fmtNum(p.range_km)} km`} />}
                  {p.speed_kmh != null && <Spec label="Speed" value={`${fmtNum(p.speed_kmh)} km/h`} />}
                  {p.mass_kg != null && <Spec label="Mass" value={`${fmtNum(p.mass_kg)} kg`} />}
                  {p.warhead_kg != null && <Spec label="Warhead" value={`${p.warhead_kg} kg`} accent="var(--sx-red)" />}
                </dl>
              )}

              <Footprint platform={p} />

              {(p.gnss_dependency || quickTags(p).length > 0) && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {p.gnss_dependency && (
                    <span className={GNSS_TAG[p.gnss_dependency].cls}>GNSS {GNSS_TAG[p.gnss_dependency].label.toLowerCase()}</span>
                  )}
                  {quickTags(p).map((t) => (
                    <span key={t.text} className={t.cls} style={t.style}>
                      {t.text}
                    </span>
                  ))}
                </div>
              )}

              {p.intel_note && (
                <p
                  title={p.intel_note}
                  style={
                    {
                      margin: 0,
                      paddingTop: 10,
                      borderTop: '1px solid var(--store-line)',
                      fontSize: 12,
                      lineHeight: 1.55,
                      color: 'var(--store-ink-soft)',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    } as React.CSSProperties
                  }
                >
                  {p.confidence === 'estimated' && <span className="tag amber" style={{ height: 18, marginRight: 6 }}>Estimated</span>}
                  {p.intel_note}
                </p>
              )}
              {p.defeat_note && (
                <p
                  title={p.defeat_note}
                  style={
                    {
                      margin: 0,
                      fontSize: 12,
                      lineHeight: 1.55,
                      color: 'var(--store-ink-mute)',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    } as React.CSSProperties
                  }
                >
                  <span style={{ color: 'var(--store-ink-soft)', fontWeight: 600 }}>Defeat: </span>
                  {p.defeat_note}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Spec({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <dt style={{ fontSize: 11, color: 'var(--store-ink-mute)' }}>{label}</dt>
      <dd className="sx-mono" style={{ margin: 0, fontSize: 12, fontWeight: 500, color: accent ?? 'var(--store-ink)' }}>
        {value}
      </dd>
    </div>
  );
}

// ─── Footprint: where the platform emits on the RF log scale ─────────────────
function Footprint({ platform }: { platform: Platform }) {
  const caps = (platform.capabilities ?? []).filter((c) => c.axis === 'rf' || c.axis === 'gnss');
  const W = 240;
  const H = 18;
  if (caps.length === 0) {
    return (
      <div
        style={{
          height: H,
          borderRadius: 6,
          border: '1px dashed rgba(255,255,255,0.14)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          color: 'var(--store-ink-mute)',
        }}
      >
        RF silent
      </div>
    );
  }
  const cfg = getAxisConfig('rf', [2, W - 2]);
  const scale = makeLogScale(cfg.domain, cfg.range);
  return (
    <div
      style={{ height: H, borderRadius: 6, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--lacquer-line)', overflow: 'hidden' }}
      title={caps.map((c) => c.label).join('\n')}
    >
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }} aria-hidden>
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
              height={H - 6}
              rx={3}
              fill={color}
              opacity={c.derived ? 0.4 : 0.85}
            />
          );
        })}
      </svg>
    </div>
  );
}

// ─── quickTags: derived from capabilities + control_link_freq ────────────────
function quickTags(p: Platform): { text: string; cls: string; style?: React.CSSProperties }[] {
  const tags: { text: string; cls: string; style?: React.CSSProperties }[] = [];
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

  if (isFOC || silent) tags.push({ text: 'Jam-immune', cls: 'tag red' });
  if (crpa) tags.push({ text: 'CRPA anti-jam', cls: 'tag green' });
  if (isSatcom && !isFOC) tags.push({ text: 'SATCOM', cls: 'tag violet' });
  if (ir) tags.push({ text: 'EO/IR', cls: 'tag violet' });
  if (hpm) tags.push({ text: 'HPM', cls: 'tag blue' });
  if (jam && !hpm) tags.push({ text: 'RF + GNSS jam', cls: 'tag blue' });
  if (detect && !jam)
    tags.push({ text: 'Detect', cls: 'tag', style: { color: '#67E8F9', borderColor: 'rgba(6,182,212,0.45)', background: 'rgba(6,182,212,0.08)' } });

  return tags.slice(0, 4);
}
