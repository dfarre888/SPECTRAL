import {
  Database, Satellite, Shield, Globe,
  AlertTriangle, CheckCircle,
} from 'lucide-react'
import Link from 'next/link'
import { ModuleCard } from '@/components/catalog/ModuleCard'
import {
  StoreCatalogHeader,
  StoreCatalogLayout,
} from '@/components/catalog/StoreCatalogLayout'
import {
  StoreFilterSection,
  StoreFilterSidebar,
} from '@/components/catalog/StoreFilterSidebar'
import { StartHereWizard } from '@/components/dashboard/StartHereWizard'
import type { ModuleCatalogStats } from '@/lib/dashboard/module-stats'
import {
  MODULE_ACCENT_CLASSES,
  catalogModules,
  type SpectralModule,
} from '@/lib/navigation/modules'
import { StorePanel } from '@/components/ui/store-surface'

/** Caller: DashboardHomeTabs moduleCatalog tab via app/(main)/page.tsx */

/** Live count where the registry names a stat key, else its static label. */
function resolveCount(module: SpectralModule, stats: ModuleCatalogStats): string {
  if (module.countKey) {
    const value = stats[module.countKey]
    return value > 0 ? String(value) : '—'
  }
  return module.staticCount ?? '—'
}

const RECENT_INCIDENTS = [
  { id: 'ukraine-shahed-swarm', label: 'Ukraine: Shahed-136 swarm campaign', status: 'ongoing', type: 'strike' },
  { id: 'vivid-sydney-2024', label: 'Vivid Sydney 2024: GPS denial (80+ drones)', status: 'closed', type: 'gnss' },
  { id: 'ukraine-lancet', label: 'Ukraine: Lancet loitering munition vs armour', status: 'ongoing', type: 'strike' },
  { id: 'houthi-red-sea', label: 'Yemen: Houthi Red Sea drone campaign', status: 'ongoing', type: 'swarm' },
]

const STATS = (stats: ModuleCatalogStats) => [
  { label: 'UAS Platforms', value: stats.platformCount > 0 ? String(stats.platformCount) : '—', sub: 'tracked', icon: Database, trend: 'live catalog' },
  { label: 'Defeat Systems', value: String(stats.defeatSystemCount), sub: 'catalogued', icon: Shield, trend: 'Blue + Red IADS' },
  { label: 'GNSS Jammers', value: String(stats.gnssJammerCount), sub: 'tier 1–3', icon: Satellite, trend: 'OSINT baseline' },
  { label: 'Conflict Studies', value: String(stats.conflictCaseCount), sub: 'case studies', icon: Globe, trend: 'named engagements' },
]

interface DashboardModuleCatalogProps {
  stats: ModuleCatalogStats
}

export function DashboardModuleCatalog({ stats }: DashboardModuleCatalogProps) {
  const modules = catalogModules()
  const sidebarStats = STATS(stats)

  return (
    <StoreCatalogLayout
      sidebar={
        <StoreFilterSidebar>
          <StoreFilterSection label="Status">
            {sidebarStats.map(({ label, value, sub, icon: Icon, trend }) => (
              <div key={label} className="flex items-center gap-3 px-1 py-2.5 border-b fc-hair last:border-0">
                <Icon className="w-4 h-4 store-text-muted shrink-0" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-[var(--store-ink)]">{label}</p>
                  <p className="text-[11.5px] store-text-muted">{sub} · {trend}</p>
                </div>
                <p className="text-[18px] font-semibold store-display text-[var(--store-ink)] tabular-nums">{value}</p>
              </div>
            ))}
          </StoreFilterSection>

          <StoreFilterSection label="Threat alert">
            <div className="store-panel-inner rounded-xl p-3.5">
              <div className="flex items-center gap-2 mb-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-[#FBBF24]" aria-hidden />
                <span className="text-[13px] font-semibold text-[var(--store-ink)]">COTS jammer risk</span>
              </div>
              <p className="text-[12.5px] store-text-body leading-relaxed">
                Tier 3 COTS jammers defeat commercial UAS at &lt;$100 exchange ratio.
              </p>
              <Link href="/gnss" className="mt-2 inline-block text-[12.5px] text-[var(--wb-blue)] hover:underline underline-offset-2">
                GNSS jammer database
              </Link>
            </div>
          </StoreFilterSection>
        </StoreFilterSidebar>
      }
    >
      <StartHereWizard />

      <StoreCatalogHeader title="Intelligence Modules" meta={`${modules.length} modules · threat-priority order`} />

      <div
        className="grid gap-4 mb-8"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
      >
        {modules.map((mod, index) => (
          <ModuleCard
            key={mod.href}
            href={mod.href}
            icon={mod.icon}
            kicker={mod.kicker}
            title={mod.label}
            blurb={mod.blurb}
            count={resolveCount(mod, stats)}
            unit={mod.countUnit}
            accentClass={MODULE_ACCENT_CLASSES[mod.accent]}
            index={index}
          />
        ))}
      </div>

      <StoreCatalogHeader title="Recent Conflict Incidents" />
      <StorePanel className="p-4">
        <div className="space-y-2">
          {RECENT_INCIDENTS.map(({ id, label, status, type }) => (
            <Link
              key={id}
              href="/conflicts"
              className="flex items-center gap-3 px-2.5 py-2.5 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors group"
            >
              {status === 'ongoing' ? (
                <AlertTriangle className="w-3.5 h-3.5 text-[#FBBF24] shrink-0" aria-label="Ongoing" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5 text-[#4ADE80] shrink-0" aria-label="Closed" />
              )}
              <p className="text-[13px] store-text-body group-hover:text-[var(--store-ink)] flex-1">{label.replace(': ', ': ')}</p>
              <span className="tag capitalize">{status}</span>
              <span className="tag">{type}</span>
            </Link>
          ))}
        </div>
      </StorePanel>
    </StoreCatalogLayout>
  )
}
