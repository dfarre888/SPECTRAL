'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { ConflictIncident } from '@/lib/conflicts/types';
import type { EngagementBrief as Brief } from '@/lib/conflicts/engagement-brief';
import { EngagementBrief } from '@/components/conflict/EngagementBrief';
import { INCIDENT_TYPE_COLOR, INCIDENT_TYPE_LABEL, normalizeIncidentType } from '@/lib/conflicts/incident-style';
const ConflictCesiumMap = dynamic(
  () => import('@/components/conflict/ConflictCesiumMap').then((m) => m.ConflictCesiumMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[440px] rounded-xl border border-[var(--store-line)] bg-[var(--store-bg)] flex items-center justify-center text-xs font-mono store-text-muted">
        Loading globe…
      </div>
    ),
  },
);
import { ConflictTimeline } from '@/components/conflict/ConflictTimeline';

export function ConflictIntelClient({ incidents, briefs = {} }: { incidents: ConflictIncident[]; briefs?: Record<string, Brief> }) {
  const [selectedId, setSelectedId] = useState<string | null>(incidents[0]?.id ?? null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const types = useMemo(() => {
    const counts = new Map<string, number>();
    for (const i of incidents) {
      const t = normalizeIncidentType(i.incident_type);
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [incidents]);

  const visible = useMemo(
    () => incidents.filter((i) => !hidden.has(normalizeIncidentType(i.incident_type))),
    [incidents, hidden],
  );

  const selected = useMemo(
    () => visible.find((i) => i.id === selectedId) ?? visible[0] ?? null,
    [visible, selectedId],
  );

  const toggleType = (t: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <div className="relative">
          <ConflictCesiumMap incidents={visible} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
          {/* Glass control layer over the globe: incident-type filters. */}
          <div className="absolute bottom-3 left-3 z-20 lg-glass flex flex-wrap items-center gap-0.5 px-1.5 py-1 max-w-[calc(100%-1.5rem)]" role="group" aria-label="Incident types">
            {types.map(([t, n]) => {
              const on = !hidden.has(t);
              return (
                <button key={t} type="button" data-on={on} aria-label={`${on ? "Hide" : "Show"} ${INCIDENT_TYPE_LABEL[t as keyof typeof INCIDENT_TYPE_LABEL]}`} onClick={() => toggleType(t)} className="lg-btn font-mono text-[11px]" style={{ opacity: on ? 1 : 0.45, textDecoration: on ? "none" : "line-through" }}>
                  <i className="h-1.5 w-1.5 rounded-full" style={{ background: INCIDENT_TYPE_COLOR[t as keyof typeof INCIDENT_TYPE_COLOR] }} aria-hidden />
                  {INCIDENT_TYPE_LABEL[t as keyof typeof INCIDENT_TYPE_LABEL]}
                  <span className="store-text-muted">{n}</span>
                </button>
              );
            })}
            {hidden.size ? <button type="button" onClick={() => setHidden(new Set())} className="lg-btn text-[11px]">All</button> : null}
          </div>
        </div>
        {selected && (
          <article className="pt-4 border-t fc-hair">
            <p className="text-[11px] font-mono store-text-muted">{selected.conflict_name} · {selected.incident_type.replace(/_/g, ' ')}</p>
            <h2 className="text-[18px] store-display font-semibold tracking-[-0.01em] text-[var(--store-ink)] mt-1">{selected.incident_title}</h2>
            <p className="text-sm store-text-body mt-3 leading-relaxed">{selected.summary}</p>
            <p className="text-xs font-mono store-text-muted mt-3">Confidence: {selected.confidence}</p>
            <p className="text-xs font-mono store-text-muted mt-1">Source: {selected.source_ref}</p>
            {selected.platforms_involved.length > 0 && (
              <p className="text-xs font-mono store-text-muted mt-1">
                Platforms: {selected.platforms_involved.join(', ')}
              </p>
            )}
            {selected.incident_type === 'gnss_denial' && (
              <Link href="/gnss" className="inline-block mt-4 text-xs font-mono text-[var(--wb-blue)] hover:underline">
                View GNSS Intelligence
              </Link>
            )}
          </article>
        )}
        {selected && briefs[selected.id] ? <EngagementBrief brief={briefs[selected.id]} /> : null}
      </div>
      <div>
        <p className="text-[11px] font-mono store-text-muted tracking-[0.02em] mb-3">Timeline</p>
        <ConflictTimeline incidents={visible} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
      </div>
    </div>
  );
}
