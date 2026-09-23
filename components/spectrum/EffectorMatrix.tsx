'use client';
/**
 * EffectorMatrix — the F3 / Find-Fix-Finish effector view.
 * Shows the layered air-defence picture: effectors ordered by tier
 * (strategic BMD → long → medium → SHORAD → point defence → CIWS → C-UAS),
 * Red or Blue, each row surfacing the engagement envelope (range/altitude),
 * effect type, Pk, magazine, and cost-per-shot.
 *
 * Clicking an effector stages it; "stage laydown" hands the set to the map.
 */

import React, { useState, useMemo } from 'react';
import { Check, MapPin } from 'lucide-react';
import type { EffectorSystem, EffectorTier, EffectType } from '@/lib/spectrum/effector-types';
import { useEffectors, effectorsByTier } from './effector-data';
import { PlatformThumbnail } from '@/components/platforms/PlatformThumbnail';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';

const TIER_LABEL: Record<EffectorTier, string> = {
  strategic_bmd: 'Strategic BMD',
  long: 'Long-range SAM',
  medium: 'Medium-range SAM',
  shorad: 'SHORAD',
  point_defence: 'Point defence',
  ciws_naval: 'CIWS / Naval',
  c_uas: 'Counter-UAS / DE',
};
const TIER_ORDER: EffectorTier[] = ['strategic_bmd', 'long', 'medium', 'shorad', 'point_defence', 'ciws_naval', 'c_uas'];

const EFFECT_LABEL: Record<EffectType, string> = {
  kinetic_missile: 'Kinetic missile',
  kinetic_gun: 'Gun',
  hpm: 'HPM',
  laser: 'Laser',
  kinetic_interceptor_drone: 'Interceptor',
  net_capture: 'Capture',
};

const ARM_CLASS: Record<string, string> = { high: 'tag red', medium: 'tag amber', low: 'tag green' };

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
  const rows = useMemo(() => groups.flatMap((g) => g.effectors), [groups]);
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const counts = useMemo(
    () => ({ blue: effectors.filter((e) => e.side === 'blue').length, red: effectors.filter((e) => e.side === 'red').length }),
    [effectors],
  );

  const columns = useMemo<DataColumn<EffectorSystem>[]>(
    () => [
      {
        key: 'name',
        header: 'Effector',
        sticky: true,
        width: 280,
        sortValue: (e) => e.name,
        cell: (e) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <PlatformThumbnail id={e.id} name={e.name} size="xs" variant="cuas" rounded="sm" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="primary" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.name}>
                {e.name}
              </div>
              {(() => {
                const meta = [e.nato_name, e.associated_system].filter((x, i, a) => x && x !== e.name && a.indexOf(x) === i).join(' · ');
                return meta ? (
                  <span className="meta" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={meta}>
                    {meta}
                  </span>
                ) : null;
              })()}
            </div>
            {selected.has(e.id) && <Check size={15} aria-label="Staged" style={{ color: 'var(--wb-blue)', flexShrink: 0 }} />}
          </div>
        ),
      },
      {
        key: 'tier',
        header: 'Tier',
        width: 160,
        sortValue: (e) => TIER_ORDER.indexOf(e.tier),
        cell: (e) => TIER_LABEL[e.tier],
      },
      { key: 'effect', header: 'Effect', width: 140, sortValue: (e) => EFFECT_LABEL[e.effect], cell: (e) => <span className="tag">{EFFECT_LABEL[e.effect]}</span> },
      {
        key: 'range',
        header: 'Range km',
        width: 118,
        align: 'right',
        sortValue: (e) => e.envelope.max_range_km,
        cell: (e) => `${e.envelope.min_range_km} to ${e.envelope.max_range_km}`,
      },
      {
        key: 'alt',
        header: 'Altitude km',
        width: 124,
        align: 'right',
        sortValue: (e) => e.envelope.max_alt_km,
        cell: (e) => `${e.envelope.min_alt_km} to ${e.envelope.max_alt_km}`,
      },
      {
        key: 'nez',
        header: 'NEZ km',
        width: 88,
        align: 'right',
        sortValue: (e) => e.envelope.no_escape_range_km ?? null,
        cell: (e) => e.envelope.no_escape_range_km ?? '',
      },
      {
        key: 'pk',
        header: 'Pk',
        width: 72,
        align: 'right',
        sortValue: (e) => e.pk_estimate ?? null,
        cell: (e) => (e.pk_estimate != null ? `${Math.round(e.pk_estimate * 100)}%` : ''),
      },
      {
        key: 'mag',
        header: 'Magazine',
        width: 100,
        align: 'right',
        sortValue: (e) => (e.magazine == null ? 1e9 : e.magazine),
        cell: (e) => <span title={e.magazine_note ?? undefined}>{e.magazine != null ? e.magazine : '∞'}</span>,
      },
      {
        key: 'cost',
        header: 'Cost per shot',
        width: 122,
        align: 'right',
        sortValue: (e) => e.cost_per_shot_usd ?? null,
        cell: (e) => (e.cost_per_shot_usd != null ? fmtCost(e.cost_per_shot_usd) : ''),
      },
      {
        key: 'defeats',
        header: 'Defeats',
        width: 300,
        className: 'clip',
        cell: (e) => {
          const t = e.defeats.map((d) => d.replace(/_/g, ' ')).join(', ');
          return <span title={t}>{t}</span>;
        },
      },
      { key: 'mobility', header: 'Mobility', width: 128, sortValue: (e) => e.mobility, cell: (e) => cap(e.mobility.replace(/_/g, '-')) },
      {
        key: 'arm',
        header: 'ARM risk',
        width: 100,
        sortValue: (e) => (e.arm_sead_vulnerability === 'high' ? 0 : e.arm_sead_vulnerability === 'medium' ? 1 : e.arm_sead_vulnerability === 'low' ? 2 : null),
        cell: (e) =>
          e.arm_sead_vulnerability ? <span className={ARM_CLASS[e.arm_sead_vulnerability]}>{cap(e.arm_sead_vulnerability)}</span> : '',
      },
      { key: 'origin', header: 'Origin', width: 150, className: 'clip', sortValue: (e) => e.origin, cell: (e) => <span title={e.origin}>{e.origin}</span> },
    ],
    [selected],
  );
  const tableMin = columns.reduce((n, c) => n + (typeof c.width === 'number' ? c.width : 0), 0);
  const stagedHere = rows.filter((e) => selected.has(e.id)).length;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
        <div className="seg" role="group" aria-label="Side">
          {(['blue', 'red'] as const).map((s) => (
            <button key={s} type="button" aria-pressed={side === s} onClick={() => setSide(s)}>
              <span className="sx-dot" style={{ width: 7, height: 7, background: s === 'blue' ? 'var(--wb-blue)' : 'var(--wb-red)' }} />
              {s === 'blue' ? 'Blue (defend)' : 'Red (threat)'}
              <span className="sx-mono" style={{ fontSize: 12, color: 'var(--store-ink-mute)' }}>{counts[s]}</span>
            </button>
          ))}
        </div>
        <p className="sx-cap">
          Ordered by tier, strategic to point defence. Pk and cost per shot are open-source estimates.
          {stagedHere > 0 && ` ${stagedHere} staged on this side.`}
        </p>
        {onStageLaydown && (
          <button
            type="button"
            className={selectedIds.length > 0 ? 'btn-glass primary' : 'btn-glass'}
            disabled={selectedIds.length === 0}
            onClick={() => onStageLaydown(selectedIds)}
            style={{ marginLeft: 'auto', opacity: selectedIds.length > 0 ? 1 : 0.5 }}
          >
            <MapPin size={15} aria-hidden />
            {selectedIds.length > 0 ? `Stage ${selectedIds.length} on map` : 'Stage on map'}
          </button>
        )}
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(e) => e.id}
        onRowClick={(e) => onSelect?.(e)}
        compact
        className="sx-dt-fixed"
        style={{ '--sx-dt-min': `${tableMin}px` } as React.CSSProperties}
        maxHeight="max(360px, calc(100vh - 410px))"
        caption={`${side === 'blue' ? 'Blue' : 'Red'} effectors by tier`}
        empty="No effectors on this side."
      />
    </div>
  );
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function fmtCost(usd: number): string {
  if (usd >= 1e6) return `$${(usd / 1e6).toFixed(1)}M`;
  if (usd >= 1e3) return `$${(usd / 1e3).toFixed(0)}k`;
  return `$${usd}`;
}
