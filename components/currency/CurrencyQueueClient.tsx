'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { Check, ClipboardList, Eye, X } from 'lucide-react';
import { reviewCurrencyUpdate } from '@/app/(main)/currency/actions';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';
import { StorePanel } from '@/components/ui/store-surface';
import type { CurrencyUpdate, UpdateStatus } from '@/lib/currency/currency-types';

const STATUS_FILTERS: Array<UpdateStatus | 'all'> = [
  'all',
  'proposed',
  'under_review',
  'approved',
  'rejected',
  'superseded',
];

const STATUS_LABEL: Record<UpdateStatus | 'all', string> = {
  all: 'All',
  proposed: 'Proposed',
  under_review: 'Under review',
  approved: 'Approved',
  rejected: 'Rejected',
  superseded: 'Superseded',
};

const STATUS_TONE: Record<UpdateStatus, string> = {
  proposed: 'blue',
  under_review: 'amber',
  approved: 'green',
  rejected: 'red',
  superseded: '',
};

const SOURCE_LABEL: Record<CurrencyUpdate['source_type'], string> = {
  osint: 'OSINT',
  sme_input: 'SME input',
  after_action: 'After action',
  partner_share: 'Partner share',
};

function typeLabel(type: string): string {
  const s = type.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const COLUMNS: DataColumn<CurrencyUpdate>[] = [
  {
    key: 'title',
    header: 'Update',
    sticky: true,
    cell: (u) => (
      <div className="min-w-0 max-w-[420px]">
        <span className="primary block truncate" title={u.title}>
          {u.title}
        </span>
        <span className="meta">{typeLabel(u.type)}</span>
      </div>
    ),
    sortValue: (u) => u.title,
  },
  {
    key: 'source',
    header: 'Source',
    width: 130,
    cell: (u) => SOURCE_LABEL[u.source_type] ?? u.source_type,
    sortValue: (u) => u.source_type,
  },
  {
    key: 'detected',
    header: 'Detected',
    width: 120,
    className: 'mono',
    cell: (u) => u.detected_at.slice(0, 10),
    sortValue: (u) => u.detected_at,
  },
  {
    key: 'status',
    header: 'Status',
    width: 140,
    cell: (u) => <span className={`tag ${STATUS_TONE[u.status] ?? ''}`}>{STATUS_LABEL[u.status] ?? u.status}</span>,
    sortValue: (u) => STATUS_FILTERS.indexOf(u.status),
  },
];

export function CurrencyQueueClient({
  updates,
  isDs,
}: {
  updates: CurrencyUpdate[];
  isDs: boolean;
}) {
  const [filter, setFilter] = useState<UpdateStatus | 'all'>('all');
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: updates.length };
    for (const u of updates) c[u.status] = (c[u.status] ?? 0) + 1;
    return c;
  }, [updates]);

  const filtered = useMemo(() => {
    if (filter === 'all') return updates;
    return updates.filter((u) => u.status === filter);
  }, [updates, filter]);

  // Keep a row selected so the inspector is never blank while rows exist.
  useEffect(() => {
    if (filtered.length === 0) return;
    if (!selectedId || !filtered.some((u) => u.id === selectedId)) setSelectedId(filtered[0].id);
  }, [filtered, selectedId]);

  const selected = filtered.find((u) => u.id === selectedId) ?? null;

  const act = (id: string, status: UpdateStatus) => {
    startTransition(async () => {
      const res = await reviewCurrencyUpdate(id, status);
      setMessage(
        res.ok
          ? { ok: true, text: `Marked ${STATUS_LABEL[status].toLowerCase()}` }
          : { ok: false, text: res.error ?? 'Review failed' },
      );
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="max-w-full overflow-x-auto">
          <div className="seg" role="tablist" aria-label="Filter by status">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={filter === s}
                onClick={() => setFilter(s)}
              >
                {STATUS_LABEL[s]}
                <span className="font-mono text-[11.5px] tabular-nums opacity-60">{counts[s] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>
        {message && (
          <p role="status" className={`text-[13px] ${message.ok ? 'text-[#6EE7A0]' : 'text-[#FF8A98]'}`}>
            {message.text}
          </p>
        )}
      </div>

      {updates.length === 0 ? (
        <StorePanel className="flex flex-col items-center px-6 py-14 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--lacquer-line)] bg-white/[0.04]">
            <ClipboardList className="h-5 w-5 text-[var(--wb-blue)]" aria-hidden />
          </span>
          <h2 className="store-display mt-4 text-[18px] font-semibold text-[var(--store-ink)]">
            {isDs ? 'No proposals in queue' : 'No approved currency updates'}
          </h2>
          <p className="mt-2 max-w-md text-[13px] leading-relaxed store-text-body">
            {isDs
              ? 'Tactical currency proposals from operators appear here for DS review before publication to the force.'
              : 'Approved tactical currency updates from your directing staff will appear here.'}
          </p>
          <Link href="/pcm" className="btn-glass mt-6">
            Open PCM
          </Link>
        </StorePanel>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          <DataTable
            rows={filtered}
            columns={COLUMNS}
            rowKey={(u) => u.id}
            onRowClick={(u) => setSelectedId(u.id)}
            selectedKey={selectedId}
            defaultSort={{ key: 'detected', dir: 'desc' }}
            maxHeight="calc(100vh - 320px)"
            caption="Currency updates"
            empty={
              <span>
                No updates marked {STATUS_LABEL[filter].toLowerCase()}.{' '}
                <button type="button" className="fc-action !text-[var(--wb-blue)]" onClick={() => setFilter('all')}>
                  Show all
                </button>
              </span>
            }
          />

          {selected ? (
            <StorePanel className="lg:sticky lg:top-2">
              <article aria-labelledby="currency-inspector-title" className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[12px] store-text-muted">{typeLabel(selected.type)}</p>
                  <span className={`tag ${STATUS_TONE[selected.status] ?? ''}`}>
                    {STATUS_LABEL[selected.status] ?? selected.status}
                  </span>
                </div>
                <h2 id="currency-inspector-title" className="mt-1.5 text-[16px] font-semibold leading-snug text-[var(--store-ink)]">
                  {selected.title}
                </h2>
                <p className="mt-3 text-[13px] leading-relaxed store-text-body">{selected.summary}</p>

                <dl className="mt-4 space-y-3 border-t border-[var(--store-line)] pt-4 text-[13px]">
                  <div>
                    <dt className="text-[11.5px] store-text-muted">Proposed effect</dt>
                    <dd className="mt-0.5 leading-relaxed text-[var(--store-ink)]">{selected.proposed_effect}</dd>
                  </div>
                  {selected.affects?.competencies?.length ||
                  selected.affects?.scenarios?.length ||
                  selected.affects?.injects?.length ? (
                    <div>
                      <dt className="text-[11.5px] store-text-muted">Affects</dt>
                      <dd className="mt-1.5 flex flex-wrap gap-1.5">
                        {[
                          ...(selected.affects.competencies ?? []),
                          ...(selected.affects.scenarios ?? []),
                          ...(selected.affects.injects ?? []),
                        ].map((a) => (
                          <span key={a} className="tag font-mono">
                            {a}
                          </span>
                        ))}
                      </dd>
                    </div>
                  ) : null}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <dt className="text-[11.5px] store-text-muted">Source</dt>
                      <dd className="mt-0.5 store-text-body">{SOURCE_LABEL[selected.source_type] ?? selected.source_type}</dd>
                    </div>
                    <div>
                      <dt className="text-[11.5px] store-text-muted">Detected</dt>
                      <dd className="mt-0.5 font-mono text-[12.5px] store-text-body">{selected.detected_at.slice(0, 10)}</dd>
                    </div>
                  </div>
                  <div>
                    <dt className="text-[11.5px] store-text-muted">Reference</dt>
                    <dd className="mt-0.5 break-words text-[12.5px] leading-relaxed store-text-body">{selected.source_reference}</dd>
                  </div>
                  {selected.reviewed_at ? (
                    <div>
                      <dt className="text-[11.5px] store-text-muted">Reviewed</dt>
                      <dd className="mt-0.5 store-text-body">
                        <span className="font-mono text-[12.5px]">{selected.reviewed_at.slice(0, 10)}</span>
                        {selected.review_notes ? <span className="mt-1 block text-[12.5px]">{selected.review_notes}</span> : null}
                      </dd>
                    </div>
                  ) : null}
                </dl>

                {isDs && (selected.status === 'proposed' || selected.status === 'under_review') && (
                  <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--store-line)] pt-4">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => act(selected.id, 'approved')}
                      className="btn-glass primary disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden />
                      Approve
                    </button>
                    {selected.status !== 'under_review' ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => act(selected.id, 'under_review')}
                        className="btn-glass disabled:opacity-50"
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden />
                        Under review
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => act(selected.id, 'rejected')}
                      className="btn-glass !text-[#FF8A98] disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden />
                      Reject
                    </button>
                  </div>
                )}
              </article>
            </StorePanel>
          ) : null}
        </div>
      )}
    </div>
  );
}
