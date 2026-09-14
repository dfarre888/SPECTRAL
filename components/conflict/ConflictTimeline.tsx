'use client';

import { INCIDENT_TYPE_COLOR, INCIDENT_TYPE_LABEL, normalizeIncidentType } from '@/lib/conflicts/incident-style';
import type { ConflictIncident } from '@/lib/conflicts/types';

export function ConflictTimeline({
  incidents,
  selectedId,
  onSelect,
}: {
  incidents: ConflictIncident[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <ol className="relative">
      {incidents.map((inc) => {
        const active = inc.id === selectedId;
        return (
          <li key={inc.id}>
            <button
              type="button"
              onClick={() => onSelect(inc.id)}
              aria-pressed={active}
              className={`text-left w-full px-3 py-3 border-b fc-hair grid grid-cols-[6px_minmax(0,1fr)] gap-x-3 transition-colors duration-150 ${
                active ? 'bg-[rgba(41,151,255,0.08)]' : 'hover:bg-[var(--store-surface)]'
              }`}
            >
              <i className="mt-[6px] h-1.5 w-1.5 rounded-full" style={{ background: INCIDENT_TYPE_COLOR[normalizeIncidentType(inc.incident_type)] }} aria-hidden />
              <span className="min-w-0">
                <span className="block text-[11px] font-mono store-text-muted">
                  {inc.occurred_at.slice(0, 10)} · {inc.conflict_name} · <span style={{ color: INCIDENT_TYPE_COLOR[normalizeIncidentType(inc.incident_type)] }}>{INCIDENT_TYPE_LABEL[normalizeIncidentType(inc.incident_type)]}</span>
                </span>
                <span className="block text-[13px] text-[var(--store-ink)] mt-0.5">{inc.incident_title}</span>
                <span className="block text-[12px] store-text-muted mt-0.5 line-clamp-2">{inc.summary}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
