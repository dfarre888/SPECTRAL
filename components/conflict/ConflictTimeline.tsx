'use client';

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
              <p className="text-[10px] font-mono store-text-muted">{inc.occurred_at.slice(0, 10)} · {inc.conflict_name}</p>
              <p className="text-sm font-medium text-white mt-1">{inc.incident_title}</p>
              <p className="text-xs store-text-muted mt-1 line-clamp-2">{inc.summary}</p>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
