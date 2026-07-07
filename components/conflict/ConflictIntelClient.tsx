'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { ConflictIncident } from '@/lib/conflicts/types';
import { ConflictMap } from '@/components/conflict/ConflictMap';
import { ConflictTimeline } from '@/components/conflict/ConflictTimeline';

export function ConflictIntelClient({ incidents }: { incidents: ConflictIncident[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(incidents[0]?.id ?? null);

  const selected = useMemo(
    () => incidents.find((i) => i.id === selectedId) ?? null,
    [incidents, selectedId],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <ConflictMap incidents={incidents} selectedId={selectedId} onSelect={setSelectedId} />
        {selected && (
          <article className="store-panel rounded-xl p-5 border border-[var(--store-line)]">
            <p className="text-[10px] font-mono store-text-muted uppercase">{selected.conflict_name} · {selected.incident_type.replace(/_/g, ' ')}</p>
            <h2 className="text-lg font-semibold text-white mt-1">{selected.incident_title}</h2>
            <p className="text-sm store-text-body mt-3 leading-relaxed">{selected.summary}</p>
            <p className="text-xs font-mono store-text-muted mt-3">Confidence: {selected.confidence}</p>
            <p className="text-xs font-mono store-text-muted mt-1">Source: {selected.source_ref}</p>
            {selected.platforms_involved.length > 0 && (
              <p className="text-xs font-mono store-text-muted mt-1">
                Platforms: {selected.platforms_involved.join(', ')}
              </p>
            )}
            {selected.incident_type === 'gnss_denial' && (
              <Link href="/gnss" className="inline-block mt-4 text-xs font-mono text-cyan">
                View GNSS Intelligence →
              </Link>
            )}
          </article>
        )}
      </div>
      <div>
        <p className="text-[10px] font-mono store-text-muted uppercase tracking-wider mb-3">Timeline</p>
        <ConflictTimeline incidents={incidents} selectedId={selectedId} onSelect={setSelectedId} />
      </div>
    </div>
  );
}
