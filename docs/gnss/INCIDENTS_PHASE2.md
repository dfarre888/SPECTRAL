# GNSS Incidents — Phase 2 (Supabase)

Training tier (v1) serves incidents from [`data/seed-gnss-incidents.ts`](../../data/seed-gnss-incidents.ts) via [`lib/gnss/incidents.ts`](../../lib/gnss/incidents.ts). Operations edition can persist and query the same schema from Postgres.

## Migration sketch

```sql
-- supabase/migrations/YYYYMMDD_gnss_incidents.sql

CREATE TABLE gnss_incidents (
  id                      TEXT PRIMARY KEY,
  title                   TEXT NOT NULL,
  date                    DATE NOT NULL,
  failure_family_primary  TEXT NOT NULL,
  overall_confidence      TEXT NOT NULL
    CHECK (overall_confidence IN ('confirmed', 'reported', 'inferred', 'unknown')),
  payload                 JSONB NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gnss_incidents_date ON gnss_incidents(date DESC);
CREATE INDEX idx_gnss_incidents_family ON gnss_incidents(failure_family_primary);
CREATE INDEX idx_gnss_incidents_confidence ON gnss_incidents(overall_confidence);

ALTER TABLE gnss_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_gnss_incidents" ON gnss_incidents
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "public_read_gnss_incidents" ON gnss_incidents
  FOR SELECT USING (true);

-- Writes: service role / Operations admin only (no public INSERT)
```

`payload` stores the full [`GnssIncident`](../../lib/gnss/types.ts) JSON shape (platform, environment, graded claims, spectrum dependencies, sources).

## Seed from TypeScript

After migration, a one-off script or SQL `INSERT` can copy `SEED_GNSS_INCIDENTS` rows:

```sql
INSERT INTO gnss_incidents (id, title, date, failure_family_primary, overall_confidence, payload)
VALUES (
  'INC-2023-DOCKLANDS',
  'Docklands swarm — 427 of 500 drones ditched; wind exceedance (GNSS ruled out)',
  '2023-07-14',
  'environmental',
  'confirmed',
  '{ ... }'::jsonb
)
ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now();
```

## Read path (Operations)

Extend [`lib/gnss/queries.ts`](../lib/gnss/queries.ts) or [`lib/gnss/incidents.ts`](../lib/gnss/incidents.ts):

```ts
import { isOperationsEdition } from '@/lib/operations/edition'

export async function getGnssIncidents(): Promise<GnssIncident[]> {
  if (isOperationsEdition()) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('gnss_incidents')
      .select('payload')
      .order('date', { ascending: false })
    if (data?.length) {
      return data.map((row) => row.payload as GnssIncident)
    }
  }
  return SEED_GNSS_INCIDENTS
}
```

Analytics remain computed in-process via `gnssAnalyticsEngine.analyse()` — no materialised views required for v1.

## Scope boundary

- **In:** incident ledger, evidence-graded analytics, defensive spectrum dependency teaching.
- **Out:** adversary targeting catalogue, emission profiles in PCM, tenant incident import UI (future Operations contract gate).

## Tenant isolation (optional)

Operations customers may add `tenant_id UUID REFERENCES tenants(id)` for org-specific incident imports. Training tier remains global OSINT seed only.
