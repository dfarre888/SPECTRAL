import { Suspense } from 'react'
import { ForceCatalogClient } from '@/components/force-catalog/ForceCatalogClient'
import { HubPageShell } from '@/components/hub/HubPageShell'
import { catalogBundle } from '@/data/force-catalog'

export default function ForceCatalogPage() {
  const bundle = catalogBundle()

  return (
    <HubPageShell
      eyebrow="OSINT · OrBat · sovereign boundary"
      title="Platform Capability Matrix"
      subtitle="Battle Picture for commanders. Compare for staff. Blue and Red in one catalogue — OSINT OrBat only."
      headerAction={
        <div className="ring-gradient glass flex flex-wrap gap-2 rounded-xl px-3 py-2">
          <div className="text-center px-2">
            <div className="hero-number text-lg text-[#F7F9FC]">{bundle.nations.length}</div>
            <div className="text-[9px] uppercase tracking-wider store-text-muted">Nations</div>
          </div>
          <div className="w-px bg-[var(--store-line)]" />
          <div className="text-center px-2">
            <div className="hero-number text-lg text-[#F7F9FC]">{bundle.platforms.length}</div>
            <div className="text-[9px] uppercase tracking-wider store-text-muted">Platforms</div>
          </div>
        </div>
      }
    >
      <Suspense
        fallback={
          <p className="text-sm font-mono store-text-muted">Loading Platform Capability Matrix…</p>
        }
      >
        <ForceCatalogClient bundle={bundle} />
      </Suspense>
    </HubPageShell>
  )
}
