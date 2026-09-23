'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { INCIDENT_TYPE_COLOR, INCIDENT_TYPE_LABEL, normalizeIncidentType } from '@/lib/conflicts/incident-style';
import type { ConflictIncident } from '@/lib/conflicts/types';

const DAY_FMT = new Intl.DateTimeFormat('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

function dayLabel(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? day : DAY_FMT.format(d);
}

/**
 * The incident timeline as one bounded scroller: grouped by day under sticky
 * glass day headers, one compact row per incident. The page never grows with
 * the feed; the list scrolls inside its own frame.
 */
export function ConflictTimeline({
  incidents,
  selectedId,
  onSelect,
  maxHeight = 'calc(100vh - 232px)',
}: {
  incidents: ConflictIncident[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Height of the scrolling list (the header sits above it). */
  maxHeight?: string;
}) {
  const [q, setQ] = useState('');
  const scroller = useRef<HTMLDivElement | null>(null);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return incidents;
    return incidents.filter((i) =>
      [i.incident_title, i.conflict_name, i.summary, INCIDENT_TYPE_LABEL[normalizeIncidentType(i.incident_type)], ...i.platforms_involved]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [incidents, q]);

  const days = useMemo(() => {
    const out: { day: string; rows: ConflictIncident[] }[] = [];
    for (const inc of shown) {
      const day = inc.occurred_at.slice(0, 10);
      const last = out[out.length - 1];
      if (last && last.day === day) last.rows.push(inc);
      else out.push({ day, rows: [inc] });
    }
    return out;
  }, [shown]);

  // Keep the selection in view when it changes from the map, without moving the page.
  useEffect(() => {
    const sc = scroller.current;
    if (!sc || !selectedId) return;
    const item = sc.querySelector<HTMLElement>(`[data-incident="${CSS.escape(selectedId)}"]`);
    if (!item) return;
    const head = 34; // sticky day header
    const top = item.offsetTop - head;
    const bottom = item.offsetTop + item.offsetHeight;
    if (top < sc.scrollTop) sc.scrollTop = top;
    else if (bottom > sc.scrollTop + sc.clientHeight) sc.scrollTop = bottom - sc.clientHeight;
  }, [selectedId]);

  return (
    <div className="dt-frame flex flex-col">
      <div className="px-4 pt-3.5 pb-3 border-b border-[var(--lacquer-line)] space-y-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="wb-pane-title text-[15px] m-0">Timeline</h2>
          <span className="text-[12px] font-mono tabular-nums store-text-muted">
            {shown.length === incidents.length ? `${incidents.length} incidents` : `${shown.length} of ${incidents.length}`}
          </span>
        </div>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by title, theatre or platform"
          aria-label="Filter timeline"
          className="glass-field w-full h-8 px-3 text-[13px]"
        />
      </div>
      <ScrollArea frame={false} maxHeight={maxHeight} scrollRef={(el) => { scroller.current = el; }}>
        {days.length === 0 ? (
          <p className="px-4 py-10 text-center text-[12px] store-text-muted">No incidents match.</p>
        ) : (
          <ol className="relative m-0 p-0 list-none">
            {days.map(({ day, rows }) => (
              <li key={day}>
                <div className="sticky top-0 z-[3] flex items-center justify-between h-[34px] px-4 text-[12px] font-semibold text-[var(--store-ink)] [background:var(--glass-fill)] backdrop-blur-xl border-b border-[var(--glass-line)]">
                  <span>{dayLabel(day)}</span>
                  <span className="font-mono font-normal tabular-nums store-text-muted">{rows.length}</span>
                </div>
                <ol className="m-0 p-0 list-none">
                  {rows.map((inc) => {
                    const t = normalizeIncidentType(inc.incident_type);
                    const active = inc.id === selectedId;
                    return (
                      <li key={inc.id} data-incident={inc.id}>
                        <button
                          type="button"
                          onClick={() => onSelect(inc.id)}
                          aria-pressed={active}
                          title={inc.incident_title}
                          className={`block w-full text-left px-4 py-2.5 border-b border-[var(--lacquer-line)] transition-colors duration-150 ${
                            active ? 'bg-[rgba(41,151,255,0.16)]' : 'hover:bg-[rgba(142,142,147,0.10)]'
                          }`}
                        >
                          <span className="flex items-center gap-3 text-[11.5px] leading-4">
                            <span className="min-w-0 truncate store-text-body">{inc.conflict_name}</span>
                            <span className="ml-auto shrink-0 inline-flex items-center gap-1.5" style={{ color: INCIDENT_TYPE_COLOR[t] }}>
                              <i className="h-1.5 w-1.5 rounded-full" style={{ background: INCIDENT_TYPE_COLOR[t] }} aria-hidden />
                              {INCIDENT_TYPE_LABEL[t]}
                            </span>
                          </span>
                          <span className={`block text-[13px] leading-[1.35] mt-1 line-clamp-2 ${active ? 'text-white' : 'text-[var(--store-ink)]'}`}>
                            {inc.incident_title}
                          </span>
                          <span className="block text-[12px] leading-4 store-text-muted mt-1 truncate">{inc.summary}</span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </li>
            ))}
          </ol>
        )}
      </ScrollArea>
    </div>
  );
}
