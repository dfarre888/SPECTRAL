import { Suspense } from 'react'
import { BadgeCheck, Database, ShieldCheck } from 'lucide-react'
import { StoreHero } from '@/components/catalog/StoreHero'
import { DashboardHomeTabs } from '@/components/dashboard/DashboardHomeTabs'
import { DashboardCommandCenter } from '@/components/dashboard/DashboardCommandCenter'
import { DashboardModuleCatalog } from '@/components/dashboard/DashboardModuleCatalog'
import { getDashboardCopy, getDashboardSkin, getDefaultHomeTab } from '@/lib/dashboard/adapters'
import { buildDashboardFromLive } from '@/lib/dashboard/build-live-data'
import { fetchDashboardLiveData } from '@/lib/dashboard/queries'

export default async function Dashboard() {
  const snapshot = await fetchDashboardLiveData()
  const skin = getDashboardSkin()
  const copy = getDashboardCopy(skin)
  const built = buildDashboardFromLive(snapshot, copy)
  const defaultTab = getDefaultHomeTab(skin)

  const heroEyebrow =
    skin === 'a3dm' ? 'Advance Aviation & Drone Management' : 'Spectral Intelligence'
  const heroTitle =
    skin === 'a3dm' ? (
      <>
        Fleet Operations,
        <br />
        Built for RPAS Command
      </>
    ) : (
      <>
        Drone Threat Intelligence,
        <br />
        Built for Operators
      </>
    )

  return (
    <div className="pb-12">
      <StoreHero
        eyebrow={heroEyebrow}
        title={heroTitle}
        subtitle={copy.commandSubtitle}
        trustChip={
          <>
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                background: 'var(--store-success)',
                boxShadow: '0 0 8px var(--store-success)',
              }}
            />
            {skin === 'a3dm'
              ? 'Enterprise RPAS management — CASA-aligned training workflows'
              : '22-year RAAF pedigree — instructor-grade threat analysis for allied training'}
          </>
        }
        trustItems={[
          { icon: ShieldCheck, label: 'UNCLASSIFIED // training use only' },
          { icon: BadgeCheck, label: 'OSINT-sourced specifications' },
          { icon: Database, label: skin === 'a3dm' ? 'Fleet telemetry ready' : 'Cross-linked defeat matrix' },
        ]}
      />

      <DashboardHomeTabs
        defaultTab={defaultTab}
        commandCenter={
          <Suspense fallback={null}>
            <DashboardCommandCenter copy={copy} {...built} />
          </Suspense>
        }
        moduleCatalog={<DashboardModuleCatalog />}
      />
    </div>
  )
}
