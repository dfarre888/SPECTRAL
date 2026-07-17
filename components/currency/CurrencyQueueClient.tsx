'use client';

import { useMemo, useState, useTransition } from 'react';
import { ClipboardList } from 'lucide-react';
import { reviewCurrencyUpdate } from '@/app/(main)/currency/actions';
import { EmptyState } from '@/components/ui/empty-state';
import type { CurrencyUpdate, UpdateStatus } from '@/lib/currency/currency-types';

const STATUS_FILTERS: Array<UpdateStatus | 'all'> = [
  'all',
  'proposed',
  'under_review',
  'approved',
  'rejected',
  'superseded',
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
  const [message, setMessage] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === 'all') return updates;
    return updates.filter((u) => u.status === filter);
  }, [updates, filter]);

  const act = (id: string, status: UpdateStatus) => {
    startTransition(async () => {
      const res = await reviewCurrencyUpdate(id, status);
      setMessage(res.ok ? `Marked ${status}` : res.error ?? 'Review failed');
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono border ${
              filter === s
                ? 'border-[var(--store-accent)] text-[var(--store-accent)]'
                : 'border-[var(--store-line)] store-text-muted'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {message && <p className="text-xs font-mono store-text-muted">{message}</p>}

      <div className="space-y-4">
        {filtered.map((u) => (
          <article key={u.id} className="store-panel rounded-xl p-5 border border-[var(--store-line)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-mono store-text-muted uppercase">{u.type.replace(/_/g, ' ')}</p>
                <h2 className="text-base font-semibold text-white mt-1">{u.title}</h2>
                <p className="text-xs store-text-muted mt-1 font-mono">{u.detected_at.slice(0, 10)} · {u.source_type}</p>
              </div>
              <span className="text-[10px] font-mono px-2 py-1 rounded border border-[var(--store-line)]">{u.status}</span>
            </div>
            <p className="text-sm store-text-body mt-3 leading-relaxed">{u.summary}</p>
            <p className="text-xs store-text-muted mt-2 font-mono">Proposed effect: {u.proposed_effect}</p>
            <p className="text-[11px] store-text-muted mt-1">Source: {u.source_reference}</p>
            {isDs && (u.status === 'proposed' || u.status === 'under_review') && (
              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => act(u.id, 'approved')}
                  className="px-3 py-1.5 rounded-lg text-xs bg-[var(--store-accent)] text-black font-semibold"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => act(u.id, 'rejected')}
                  className="px-3 py-1.5 rounded-lg text-xs border border-[var(--store-line)] store-text-body"
                >
                  Reject
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => act(u.id, 'under_review')}
                  className="px-3 py-1.5 rounded-lg text-xs border border-[var(--store-line)] store-text-muted"
                >
                  Under review
                </button>
              </div>
            )}
          </article>
        ))}
        {filtered.length === 0 && (
          <EmptyState
            icon={ClipboardList}
            title={isDs ? 'No proposals in queue' : 'No approved currency updates'}
            description={
              isDs
                ? 'Tactical currency proposals from learners appear here for DS review before they inform training emphasis.'
                : 'Approved tactical currency updates from your directing staff will appear here.'
            }
            primaryAction={{ href: '/pcm', label: 'Open PCM training' }}
          />
        )}
      </div>
    </div>
  );
}
