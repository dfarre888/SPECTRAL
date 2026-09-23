'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { ConflictIncident } from '@/lib/conflicts/types';
import type { EngagementBrief as Brief } from '@/lib/conflicts/engagement-brief';
import { EngagementBrief } from '@/components/conflict/EngagementBrief';
import { INCIDENT_TYPE_COLOR, INCIDENT_TYPE_LABEL, normalizeIncidentType } from '@/lib/conflicts/incident-style';
import { ConflictTimeline } from '@/components/conflict/ConflictTimeline';

const ConflictCesiumMap = dynamic(
  () => import('@/components/conflict/ConflictCesiumMap').then((m) => m.ConflictCesiumMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[440px] rounded-2xl border border-[var(--lacquer-line)] bg-[var(--store-bg)] flex items-center justify-center text-[12px] store-text-muted">
        Loading globe…
      </div>
    ),
  },
);

function sourceHost(src: string, i: number): string {
  let host = src;
  try { host = new URL(src).hostname.replace(/^www\./, ''); } catch { /* keep raw */ }
  return host === 'news.google.com' ? `Outlet ${i + 1}` : host;
}

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

  const selType = selected ? normalizeIncidentType(selected.incident_type) : null;
  const sources = selected ? selected.source_ref.split(' | ').filter(Boolean) : [];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="min-w-0 space-y-6">
        <div className="relative">
          <ConflictCesiumMap incidents={visible} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
          {/* Glass control layer over the globe: incident-type filters. */}
          <div className="absolute bottom-3 left-3 z-20 flex flex-wrap items-center gap-1.5 max-w-[calc(100%-1.5rem)]" role="group" aria-label="Incident types">
            {types.map(([t, n]) => {
              const on = !hidden.has(t);
              return (
                <button key={t} type="button" data-on={on} aria-label={`${on ? 'Hide' : 'Show'} ${INCIDENT_TYPE_LABEL[t as keyof typeof INCIDENT_TYPE_LABEL]}`} onClick={() => toggleType(t)} className="lg-glass lg-pill text-[12px]" style={{ opacity: on ? 1 : 0.5 }}>
                  <i className="h-1.5 w-1.5 rounded-full" style={{ background: INCIDENT_TYPE_COLOR[t as keyof typeof INCIDENT_TYPE_COLOR] }} aria-hidden />
                  {INCIDENT_TYPE_LABEL[t as keyof typeof INCIDENT_TYPE_LABEL]}
                  <span className="font-mono tabular-nums store-text-muted">{n}</span>
                </button>
              );
            })}
            {hidden.size ? <button type="button" onClick={() => setHidden(new Set())} className="lg-glass lg-pill text-[12px]">Show all</button> : null}
          </div>
        </div>

        {selected && selType ? (
          <article className="store-panel rounded-2xl p-6" aria-label="Selected incident">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] m-0">
              <span className="font-mono tabular-nums store-text-muted">{selected.occurred_at.slice(0, 10)}</span>
              <span className="store-text-muted" aria-hidden>·</span>
              <span className="store-text-body">{selected.conflict_name}</span>
              <span className="store-text-muted" aria-hidden>·</span>
              <span className="inline-flex items-center gap-1.5" style={{ color: INCIDENT_TYPE_COLOR[selType] }}>
                <i className="h-1.5 w-1.5 rounded-full" style={{ background: INCIDENT_TYPE_COLOR[selType] }} aria-hidden />
                {INCIDENT_TYPE_LABEL[selType]}
              </span>
            </p>
            <h2 className="text-[20px] store-display font-semibold tracking-[-0.015em] leading-snug text-[var(--store-ink)] mt-2 mb-0 text-balance">
              {selected.incident_title}
            </h2>
            <p className="text-[14px] store-text-body mt-3 mb-0 leading-relaxed max-w-[78ch] text-pretty">{selected.summary}</p>

            <dl className="mt-5 pt-4 border-t fc-hair grid grid-cols-[96px_minmax(0,1fr)] gap-x-4 gap-y-2.5 text-[12px] m-0">
              <dt className="store-text-muted">Confidence</dt>
              <dd className="m-0"><span className="tag">{selected.confidence}</span></dd>
              {sources.length ? (
                <>
                  <dt className="store-text-muted">Sources</dt>
                  <dd className="m-0 flex flex-wrap gap-x-3 gap-y-1">
                    {sources.map((src, i) =>
                      src.startsWith('http') ? (
                        <a key={i} href={src} target="_blank" rel="noopener noreferrer" className="text-[var(--wb-blue)] hover:underline">{sourceHost(src, i)}</a>
                      ) : (
                        <span key={i} className="store-text-body">{src}</span>
                      ),
                    )}
                  </dd>
                </>
              ) : null}
              {selected.platforms_involved.length > 0 ? (
                <>
                  <dt className="store-text-muted">Platforms</dt>
                  <dd className="m-0 flex flex-wrap gap-1.5">
                    {selected.platforms_involved.map((p) => <span key={p} className="tag blue font-mono">{p}</span>)}
                  </dd>
                </>
              ) : null}
            </dl>
            {selected.incident_type === 'gnss_denial' ? (
              <Link href="/gnss" className="inline-block mt-4 text-[12px] text-[var(--wb-blue)] hover:underline">
                Open GNSS Intelligence
              </Link>
            ) : null}
          </article>
        ) : null}

        {selected && briefs[selected.id] ? <EngagementBrief brief={briefs[selected.id]} /> : null}
      </div>

      <aside className="min-w-0 self-start lg:sticky lg:top-0" aria-label="Incident timeline">
        <ConflictTimeline incidents={visible} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
      </aside>
    </div>
  );
}
