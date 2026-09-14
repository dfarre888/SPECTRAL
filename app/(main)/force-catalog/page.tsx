import { Suspense } from 'react'
import { ForceCatalogClient } from '@/components/force-catalog/ForceCatalogClient'
import { HubPageShell } from '@/components/hub/HubPageShell'
import { catalogBundle } from '@/data/force-catalog'

export default function ForceCatalogPage() {
  const bundle = catalogBundle()

  return (
    <HubPageShell
      title="Force Catalogue"
      subtitle={`OSINT OrBat · ${bundle.nations.length} nations · ${bundle.platforms.length} platforms · sovereign boundary respected`}
    >
      <Suspense
        fallback={
          <p className="text-sm font-mono store-text-muted">Loading Force Catalogue…</p>
        }
      >
        <ForceCatalogClient bundle={bundle} />
      </Suspense>
    </HubPageShell>
  )
}
