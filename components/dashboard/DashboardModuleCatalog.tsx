import {
  Database, Satellite, Shield, Globe,
  TrendingUp, AlertTriangle, CheckCircle,
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
  { id: 'ukraine-shahed-swarm', label: 'Ukraine — Shahed-136 swarm campaign', status: 'ongoing', type: 'strike' },
  { id: 'vivid-sydney-2024', label: 'Vivid Sydney 2024 — GPS denial (80+ drones)', status: 'closed', type: 'gnss' },
  { id: 'ukraine-lancet', label: 'Ukraine — Lancet loitering munition vs armour', status: 'ongoing', type: 'strike' },
  { id: 'houthi-red-sea', label: 'Yemen — Houthi Red Sea drone campaign', status: 'ongoing', type: 'swarm' },
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
              <StorePanel key={label} className="p-3 mb-2 last:mb-0">
                <div className="flex items-start justify-between mb-2">
                  <Icon className="w-4 h-4 text-[var(--store-accent)]" />
                  <span className="text-[9px] font-mono text-[var(--store-success)] flex items-center gap-1">
                    <TrendingUp className="w-2.5 h-2.5" />
                    {trend}
                  </span>
                </div>
                <p className="text-xl font-bold text-white font-mono tabular-nums">{value}</p>
                <p className="text-[11px] store-text-body">{label}</p>
                <p className="text-[10px] store-text-muted font-mono">{sub}</p>
              </StorePanel>
            ))}
          </StoreFilterSection>

          <StoreFilterSection label="Threat alert">
            <StorePanel className="p-3 border-[var(--store-accent-border)]">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-[var(--store-accent)]" />
                <span className="text-[10px] font-semibold text-[var(--store-accent)] uppercase tracking-wider">
                  COTS jammer risk
                </span>
              </div>
              <p className="text-[11px] store-text-body leading-relaxed">
                Tier 3 COTS jammers defeat commercial UAS at &lt;$100 exchange ratio.
              </p>
              <Link
                href="/gnss"
                className="mt-2 block text-[10px] font-mono text-cyan hover:opacity-80"
              >
                → GNSS jammer database
              </Link>
            </StorePanel>
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
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--store-surface-2)] transition-colors group"
            >
              {status === 'ongoing' ? (
                <AlertTriangle className="w-3.5 h-3.5 text-[var(--store-accent)] shrink-0" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5 text-[var(--store-success)] shrink-0" />
              )}
              <p className="text-xs store-text-body group-hover:text-white flex-1">{label}</p>
              <span className="text-[10px] font-mono store-text-muted store-panel-inner px-2 py-0.5 rounded">
                {type}
              </span>
            </Link>
          ))}
        </div>
      </StorePanel>
    </StoreCatalogLayout>
  )
}
