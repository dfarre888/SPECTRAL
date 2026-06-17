import { fetchConflictIncidents } from '@/lib/conflict/conflict-queries';
import { ConflictIntelClient } from '@/components/conflict/ConflictIntelClient';

export default async function ConflictIntelPage() {
  const incidents = await fetchConflictIncidents();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
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
      <ConflictIntelClient incidents={incidents} />
    </div>
  );
}
