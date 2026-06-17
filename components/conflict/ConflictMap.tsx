'use client';

import { useMemo } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import type { ConflictIncident } from '@/lib/conflict/conflict-types';

const W = 720;
const H = 360;

const TYPE_COLOR: Record<ConflictIncident['incident_type'], string> = {
  uas_strike: '#F97316',
  gnss_denial: '#06B6D4',
  ew: '#A78BFA',
  naval: '#38BDF8',
  isr: '#4ADE80',
  swarm: '#FB7185',
  other: '#94A3B8',
};

function worldPath(projection: ReturnType<typeof geoMercator>): string {
  const path = geoPath(projection);
  const ring: [number, number][] = [
    [-170, 70], [-50, 75], [40, 72], [140, 65], [170, 55], [170, -10],
    [140, -35], [50, -40], [-20, -35], [-80, -55], [-170, -40], [-170, 70],
  ];
  return path({ type: 'Polygon', coordinates: [ring] }) ?? '';
}

export function ConflictMap({
  incidents,
  selectedId,
  onSelect,
}: {
  incidents: ConflictIncident[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const projection = useMemo(
    () => geoMercator().scale(110).translate([W / 2, H / 1.55]),
    [],
  );

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto rounded-xl border border-[var(--store-line)] bg-[#0A0A0F]">
      <path d={worldPath(projection)} fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
      {incidents.map((inc) => {
        const pt = projection([inc.lon, inc.lat]);
        if (!pt) return null;
        const [x, y] = pt;
        const active = inc.id === selectedId;
        return (
          <g key={inc.id} style={{ cursor: 'pointer' }} onClick={() => onSelect(inc.id)}>
            <circle
              cx={x}
              cy={y}
              r={active ? 7 : 5}
              fill={TYPE_COLOR[inc.incident_type]}
              opacity={active ? 1 : 0.85}
              stroke={active ? '#fff' : 'none'}
              strokeWidth={1.5}
            />
          </g>
        );
      })}
    </svg>
  );
}
