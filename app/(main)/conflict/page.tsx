import { fetchConflictIncidents } from '@/lib/conflicts/queries';
import { ConflictIntelClient } from '@/components/conflict/ConflictIntelClient';
import { IntelFreshnessBanner } from '@/components/conflict/IntelFreshnessBanner';

export default async function ConflictIntelPage() {
  const incidents = await fetchConflictIncidents();

  // No egress on a deployed instance, so incidents arrive by operator import.
  // The newest row insertion is the last import — no separate table needed.
  const lastImportAt = incidents.reduce<string | null>(
    (latest, i) => (!latest || i.created_at > latest ? i.created_at : latest),
    null,
  );

  return (
    <div className="max-w-[90rem] mx-auto space-y-6">
      <div>
                <h1 className="store-display text-[30px] font-semibold tracking-[-0.02em] text-[var(--store-ink)] leading-none m-0">Incident Timeline</h1>
        <p className="text-sm store-text-body mt-2 max-w-3xl">
          Database-backed incident timeline and map. For narrative case studies see{' '}
          <a href="/conflicts" className="text-[var(--wb-blue)] underline-offset-2 hover:underline">
            Conflict Case Studies
          </a>
          .
        </p>
      </div>
      <IntelFreshnessBanner lastImportAt={lastImportAt} incidentCount={incidents.length} />
      <ConflictIntelClient incidents={incidents} />
    </div>
  );
}
