import { Suspense } from 'react'
import { ShieldCheck } from 'lucide-react'
import { CLASSIFICATION_BANNER } from '@/lib/operations/classification'
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
      : 'Sovereign counter-UAS intelligence — platform library, spectrum, defeat matrix and live laydown in one picture.'

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
                    ? 'CASA-aligned RPAS training'
                    : 'OSINT · UNCLASSIFIED · sovereign threat intelligence'}
                </>
              }
              trustItems={[
                { icon: ShieldCheck, label: CLASSIFICATION_BANNER.UNCLASSIFIED },
              ]}
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
