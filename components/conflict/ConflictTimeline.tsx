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
    <ol className="relative border-l border-[var(--store-line)] ml-2 space-y-4">
      {incidents.map((inc) => {
        const active = inc.id === selectedId;
        return (
          <li key={inc.id} className="ml-4">
            <button
              type="button"
              onClick={() => onSelect(inc.id)}
              className={`text-left w-full rounded-lg p-3 border transition-colors ${
                active
                  ? 'border-[var(--store-accent)] bg-[var(--store-surface-2)]'
                  : 'border-transparent hover:border-[var(--store-line)]'
              }`}
            >
              <p className="text-[10px] font-mono store-text-muted flex items-center gap-1.5 flex-wrap">
                <span>{inc.occurred_at.slice(0, 10)}</span>
                <span>·</span>
                <span>{inc.conflict_name}</span>
                <span
                  className="px-1 py-0.5 rounded text-[9px] uppercase tracking-wide"
                  style={{
                    color: INCIDENT_TYPE_COLOR[normalizeIncidentType(inc.incident_type)],
                    background: 'rgba(255,255,255,0.06)',
                  }}
                >
                  {INCIDENT_TYPE_LABEL[normalizeIncidentType(inc.incident_type)]}
                </span>
              </p>
              <p className="text-sm font-medium text-white mt-1">{inc.incident_title}</p>
              <p className="text-xs store-text-muted mt-1 line-clamp-2">{inc.summary}</p>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
