import { Suspense } from 'react'
import { StoreHero } from '@/components/catalog/StoreHero'
import { DashboardHomeTabs } from '@/components/dashboard/DashboardHomeTabs'
import { DashboardCommandCenter } from '@/components/dashboard/DashboardCommandCenter'
import { DashboardModuleCatalog } from '@/components/dashboard/DashboardModuleCatalog'
import { getDashboardCopy, getDashboardSkin, getDefaultHomeTab } from '@/lib/dashboard/adapters'
import { buildDashboardFromLive } from '@/lib/dashboard/build-live-data'
import { fetchModuleCatalogStats } from '@/lib/dashboard/module-stats'
import { fetchDashboardLiveData } from '@/lib/dashboard/queries'

export default async function Dashboard() {
  const [snapshot, catalogStats] = await Promise.all([
    fetchDashboardLiveData(),
    fetchModuleCatalogStats(),
  ])
  const skin = getDashboardSkin()
  const copy = getDashboardCopy(skin)
  const built = buildDashboardFromLive(snapshot, copy)
  const defaultTab = getDefaultHomeTab(skin)

  const heroEyebrow =
    skin === 'a3dm' ? 'Advance Aviation & Drone Management' : 'Spectral Intelligence'
  const heroTitle =
    skin === 'a3dm' ? (
      <>Fleet Operations Command</>
    ) : (
      <>Operations Command Center</>
    )
  /**
   * Distinct from copy.commandSubtitle, which OverviewDashboard renders on the
   * section header just below — using the same string in both places printed it twice.
   */
  const heroSubtitle =
    skin === 'a3dm'
      ? 'Fleet, crew and approval status across every RPAS operation you run.'
      : 'Platform library, spectrum, defeat matrix and live laydown in one picture. OSINT, unclassified, sovereign.'

  return (
    <div className="pb-12">
      <DashboardHomeTabs
        defaultTab={defaultTab}
        commandCenter={
          <>
            <StoreHero
              variant="compact"
              eyebrow={heroEyebrow}
              title={heroTitle}
              subtitle={heroSubtitle}
            />
            <Suspense fallback={null}>
              <DashboardCommandCenter copy={copy} {...built} />
            </Suspense>
          </>
        }
        moduleCatalog={<DashboardModuleCatalog stats={catalogStats} />}
      />
    </div>
  )
}
