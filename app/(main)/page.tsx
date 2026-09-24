import { Suspense } from 'react'
import { DashboardHomeTabs, HomeTabSwitch } from '@/components/dashboard/DashboardHomeTabs'
import { DashboardCommandCenter } from '@/components/dashboard/DashboardCommandCenter'
import { DashboardModuleCatalog } from '@/components/dashboard/DashboardModuleCatalog'
import { CommandHero, type HeroIncidentPoint } from '@/components/dashboard/CommandHero'
import { MetricSummaryBar } from '@/components/dashboard/MetricSummaryBar'
import { getDashboardCopy, getDashboardSkin, getDefaultHomeTab } from '@/lib/dashboard/adapters'
import { buildDashboardFromLive } from '@/lib/dashboard/build-live-data'
import { fetchModuleCatalogStats } from '@/lib/dashboard/module-stats'
import { fetchDashboardLiveData } from '@/lib/dashboard/queries'
import { fetchConflictIncidents } from '@/lib/conflicts/queries'
import { loadLatestBundle } from '@/lib/conflicts/latest-bundle'
import { loadLatestReporting } from '@/lib/intel/latest-reporting'
import { DefenceWeekPanel } from '@/components/dashboard/DefenceWeekPanel'

export default async function Dashboard() {
  const [snapshot, catalogStats, dbIncidents] = await Promise.all([
    fetchDashboardLiveData(),
    fetchModuleCatalogStats(),
    fetchConflictIncidents().catch(() => []),
  ])
  const skin = getDashboardSkin()
  const copy = getDashboardCopy(skin)
  const built = buildDashboardFromLive(snapshot, copy)
  const defaultTab = getDefaultHomeTab(skin)

  // The hero globe plots the same picture the Watchfloor shows:
  // curated rows plus the newest OSINT bundle, deduplicated.
  const latest = loadLatestBundle()
  const reporting = loadLatestReporting()
  const seen = new Set(dbIncidents.map((i) => i.id))
  const points: HeroIncidentPoint[] = [...dbIncidents, ...(latest?.bundle.incidents ?? []).filter((i) => !seen.has(i.id))]
    .filter((i) => Number.isFinite(i.lat) && Number.isFinite(i.lon))
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
    .map((i) => ({
      id: i.id,
      lat: i.lat,
      lon: i.lon,
      type: i.incident_type,
      title: i.incident_title,
      occurredAt: i.occurred_at,
    }))

  const heroTitle = skin === 'a3dm' ? 'Fleet Operations Command' : 'Operations Command Center'
  const heroSubtitle =
    skin === 'a3dm'
      ? 'Fleet, crew and approval status across every RPAS operation you run.'
      : 'Platform library, spectrum, defeat matrix and live laydown in one picture. OSINT, unclassified, sovereign.'

  return (
    <div className="pb-12">
      <DashboardHomeTabs
        defaultTab={defaultTab}
        hero={
          <CommandHero
            title={heroTitle}
            subtitle={heroSubtitle}
            switcher={<HomeTabSwitch />}
            instruments={<MetricSummaryBar metrics={built.metrics} copy={copy} />}
            points={points}
            bundleAt={latest?.bundle.manifest.generatedAt ?? null}
          />
        }
        commandCenter={
          <>
            <Suspense fallback={null}>
              <DashboardCommandCenter copy={copy} {...built} instrumentsElsewhere />
            </Suspense>
            <DefenceWeekPanel items={reporting?.items ?? []} generatedAt={reporting?.generatedAt ?? null} />
          </>
        }
        moduleCatalog={<DashboardModuleCatalog stats={catalogStats} />}
      />
    </div>
  )
}
