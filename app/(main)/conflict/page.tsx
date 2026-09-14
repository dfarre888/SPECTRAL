import { fetchConflictIncidents } from '@/lib/conflicts/queries';
import { ConflictIntelClient } from '@/components/conflict/ConflictIntelClient';
import { IntelFreshnessBanner } from '@/components/conflict/IntelFreshnessBanner';
import { OsintLeadsPanel } from '@/components/conflict/OsintLeadsPanel';
import { loadLatestBundle } from '@/lib/conflicts/latest-bundle';
import { buildEngagementBrief, type EngagementBrief } from '@/lib/conflicts/engagement-brief';
import { getDefeatMatrixData } from '@/lib/defeat/queries';

export default async function ConflictIntelPage() {
  const [dbIncidents, defeat] = await Promise.all([
    fetchConflictIncidents(),
    getDefeatMatrixData().catch(() => null),
  ]);
  const latest = loadLatestBundle();

  // Curated rows plus the newest OSINT bundle on one timeline. Bundle leads keep
  // their 'possible/unconfirmed' grades and theatre-level positions.
  const seen = new Set(dbIncidents.map((i) => i.id));
  const incidents = [...dbIncidents, ...(latest?.bundle.incidents ?? []).filter((i) => !seen.has(i.id))]
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));

  const briefs: Record<string, EngagementBrief> = {};
  if (defeat) {
    for (const inc of incidents) {
      const b = buildEngagementBrief({ incident: inc, platforms: defeat.platforms, systems: defeat.systems, effectiveness: defeat.effectiveness });
      if (b) briefs[inc.id] = b;
    }
  }

  // No egress on a deployed instance, so incidents arrive by operator import.
  // The newest row insertion is the last import — no separate table needed.
  const lastDb = dbIncidents.reduce<string | null>(
    (acc, i) => (!acc || i.created_at > acc ? i.created_at : acc),
    null,
  );
  const lastImportAt = [lastDb, latest?.bundle.manifest.generatedAt ?? null]
    .filter((x): x is string => Boolean(x))
    .sort()
    .pop() ?? null;

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
      <ConflictIntelClient incidents={incidents} briefs={briefs} />

      <section className="pt-8 border-t fc-hair">
        <h2 className="text-[18px] store-display font-semibold tracking-[-0.01em] text-[var(--store-ink)] m-0">Automated OSINT leads</h2>
        <p className="text-[13px] store-text-muted mt-1 mb-5 max-w-[80ch] text-pretty">
          Open news and GNSS-interference feeds harvested on a connected machine, graded by how many independent outlets carried each event, and matched against the platform catalogue. Leads, not findings; every row links to the outlets behind it.
        </p>
        {latest ? (
          <OsintLeadsPanel incidents={latest.bundle.incidents} manifest={latest.bundle.manifest} attribution={latest.attribution} snapshots={latest.snapshots?.theatres ?? null} />
        ) : (
          <p className="text-[11px] font-mono store-text-muted">No OSINT bundle on this instance. Build one on a connected machine with `npx tsx scripts/build-intel-bundle.ts` and drop it in data/intel/bundles.</p>
        )}
      </section>
    </div>
  );
}
