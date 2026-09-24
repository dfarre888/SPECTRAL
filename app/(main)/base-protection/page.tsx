import { BaseProtectionClient } from '@/components/base-protection/BaseProtectionClient'
import { listEvidence, listPlans, loadCatalogue } from '@/lib/base-protection/queries'
import { requireTenantContext } from '@/lib/operations/tenant'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Base Protection | Spectral',
  description: 'Counter-drone coverage, sightings and cost to close for Defence sites, and a Counter-UXS evidence log',
}

const errText = (e: unknown) => (e instanceof Error ? e.message : 'Request failed')

export default async function BaseProtectionPage({
  searchParams,
}: {
  searchParams?: { view?: string; site?: string }
}) {
  const ctx = await requireTenantContext()

  const [catalogue, plans, evidence] = await Promise.all([
    loadCatalogue(),
    listPlans(ctx.tenantId)
      .then((r) => ({ ...r, error: null as string | null }))
      .catch((e) => ({ plans: [], storage: 'database' as const, error: errText(e) })),
    listEvidence(ctx.tenantId)
      .then((r) => ({ ...r, error: null as string | null }))
      .catch((e) => ({ records: [], storage: 'database' as const, error: errText(e) })),
  ])

  return (
    <div className="max-w-[112rem] mx-auto">
      <header>
        <h1 className="page-title m-0">Base Protection</h1>
        <p className="page-lede">
          Counter-drone coverage, incidents and cost to close for each Defence site, and an evidence log for handing drone
          incidents to police. Packages are planning inputs, not a record of what is fielded.
        </p>
      </header>
      <BaseProtectionClient
        systems={catalogue.systems}
        catalogueSource={catalogue.source}
        initialPlans={plans.plans}
        plansStorage={plans.storage}
        plansError={plans.error}
        initialEvidence={evidence.records}
        evidenceStorage={evidence.storage}
        evidenceError={evidence.error}
        initialView={searchParams?.view === 'evidence' ? 'evidence' : 'sites'}
        initialSiteId={searchParams?.site ?? null}
      />
    </div>
  )
}
