import { fetchConflictIncidents } from '@/lib/conflicts/queries';
import { ConflictIntelClient } from '@/components/conflict/ConflictIntelClient';
import { IntelFreshnessBanner } from '@/components/conflict/IntelFreshnessBanner';
import { OsintLeadsPanel } from '@/components/conflict/OsintLeadsPanel';
import { loadLatestBundle } from '@/lib/conflicts/latest-bundle';
import { buildEngagementBrief, type EngagementBrief } from '@/lib/conflicts/engagement-brief';
import { getDefeatMatrixData } from '@/lib/defeat/queries';
import { loadLatestReporting } from '@/lib/intel/latest-reporting';
import { WATCHFLOOR_NAME } from '@/lib/intel/watchfloor';
import { WatchfloorReporting } from '@/components/conflict/WatchfloorReporting';
import { WatchfloorViews } from '@/components/conflict/WatchfloorViews';

export default async function ConflictIntelPage() {
  const [dbIncidents, defeat] = await Promise.all([
    fetchConflictIncidents(),
    getDefeatMatrixData().catch(() => null),
  ]);
  const latest = loadLatestBundle();
  const reporting = loadLatestReporting();

  // Curated rows plus the newest OSINT bundle on one timeline. Bundle leads keep
  // their 'possible/unconfirmed' grades and theatre-level positions.
  // Bundles built before 24 Sep 2026 could repeat a GNSS lead id; keep the first.
  const leadIds = new Set<string>();
  const leads = (latest?.bundle.incidents ?? []).filter((i) => !leadIds.has(i.id) && !!leadIds.add(i.id));
  const seen = new Set(dbIncidents.map((i) => i.id));
  const incidents = [...dbIncidents, ...leads.filter((i) => !seen.has(i.id))]
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));

  const briefs: Record<string, EngagementBrief> = {};
  if (defeat) {
    for (const inc of incidents) {
      const b = buildEngagementBrief({ incident: inc, platforms: defeat.platforms, systems: defeat.systems, effectiveness: defeat.effectiveness });
      if (b) briefs[inc.id] = b;
    }
  }

  // No egress on a deployed instance, so incidents arrive by operator import.
  // The newest row insertion is the last import: no separate table needed.
  const lastDb = dbIncidents.reduce<string | null>(
    (acc, i) => (!acc || i.created_at > acc ? i.created_at : acc),
    null,
  );
  const lastImportAt = [lastDb, latest?.bundle.manifest.generatedAt ?? null]
    .filter((x): x is string => Boolean(x))
    .sort()
    .pop() ?? null;

  return (
    <div className="max-w-[100rem] mx-auto">
      <header>
        <h1 className="page-title m-0">{WATCHFLOOR_NAME}</h1>
        <p className="page-lede">
          Everything coming in, in one place: graded incidents on the map, the week&apos;s reporting from newsrooms,
          governments and analysts, and the raw OSINT leads behind them. Refreshed daily on a connected machine. For
          narrative case studies see{' '}
          <a href="/conflicts" className="text-[var(--wb-blue)] underline-offset-2 hover:underline">
            Case Studies
          </a>
          .
        </p>
      </header>

      <WatchfloorViews
        counts={{
          incidents: incidents.length,
          reporting: reporting?.items.length ?? 0,
          leads: leads.length,
        }}
        incidents={
          <>
            <IntelFreshnessBanner lastImportAt={lastImportAt} incidentCount={incidents.length} />
            <ConflictIntelClient incidents={incidents} briefs={briefs} />
          </>
        }
        reporting={
          <WatchfloorReporting
            items={reporting?.items ?? []}
            generatedAt={reporting?.generatedAt ?? null}
            sources={reporting?.sources ?? []}
            windowDays={reporting?.windowDays ?? 14}
          />
        }
        leads={
          <section aria-labelledby="osint-leads-title">
            <h2 id="osint-leads-title" className="text-[20px] store-display font-semibold tracking-[-0.015em] text-[var(--store-ink)] m-0">
              Automated OSINT leads
            </h2>
            <p className="text-[13px] store-text-body mt-1.5 mb-6 max-w-[80ch] text-pretty">
              Open news and GNSS-interference feeds harvested on a connected machine, graded by how many independent outlets carried each event, and matched against the platform catalogue. Leads, not findings; every row links to the outlets behind it.
            </p>
            {latest ? (
              <OsintLeadsPanel incidents={leads} manifest={latest.bundle.manifest} attribution={latest.attribution} snapshots={latest.snapshots?.theatres ?? null} />
            ) : (
              <p className="text-[12px] store-text-muted">
                No OSINT bundle on this instance. Build one on a connected machine with{' '}
                <code className="font-mono text-[var(--store-ink-soft)]">npm run intel:bundle</code> and drop it in{' '}
                <code className="font-mono text-[var(--store-ink-soft)]">data/intel/bundles</code>.
              </p>
            )}
          </section>
        }
      />
    </div>
  );
}
