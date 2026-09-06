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
        <p className="text-[10px] font-mono store-text-muted uppercase tracking-wider">OSINT Layer</p>
        <h1 className="text-2xl font-semibold text-white mt-1">Conflict Incident Intel</h1>
        <p className="text-sm store-text-body mt-2 max-w-3xl">
          Database-backed incident timeline and map. For narrative case studies see{' '}
          <a href="/conflicts" className="text-[var(--store-accent)] underline-offset-2 hover:underline">
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
