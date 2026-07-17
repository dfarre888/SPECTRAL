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
import { StorePanel } from '@/components/ui/store-surface'

/** Caller: DashboardHomeTabs moduleCatalog tab via app/(main)/page.tsx */

function buildModules(stats: ModuleCatalogStats) {
  const platformLabel = stats.platformCount > 0 ? String(stats.platformCount) : '—'
  return [
    { href: '/defeat', icon: 'shield' as const, kicker: 'C-UAS', label: 'Defeat Matrix', count: String(stats.defeatSystemCount), unit: 'systems', accent: 'text-[var(--store-success)] bg-[rgba(74,222,128,0.10)] border-[rgba(74,222,128,0.20)]', desc: 'Platform × countermeasure effectiveness grid', priority: 1 },
    { href: '/gnss', icon: 'satellite' as const, kicker: 'NAVWAR', label: 'GNSS Intelligence', count: String(stats.gnssJammerCount), unit: 'jammers', accent: 'text-cyan bg-cyan/10 border-cyan/25', desc: 'Constellations, denial systems, defeat methods', priority: 2 },
    { href: '/conflicts', icon: 'globe' as const, kicker: 'CASE STUDY', label: 'Conflict Intel', count: String(stats.conflictCaseCount), unit: 'studies', accent: 'text-[var(--store-accent)] bg-[var(--store-accent-glow)] border-[var(--store-accent-border)]', desc: 'Named engagements and operational lessons', priority: 3 },
    { href: '/map', icon: 'map' as const, kicker: 'COP', label: 'Map Intel', count: 'Live', unit: 'laydown', accent: 'text-cyan bg-cyan/10 border-cyan/25', desc: 'Cesium laydown, mission paths, and force evaluation', priority: 4 },
    { href: '/arena', icon: 'swords' as const, kicker: 'WARGAME', label: 'Red/Blue Arena', count: '20+', unit: 'injects', accent: 'text-red bg-red/10 border-red/25', desc: 'Scenario engine and exercise briefs', priority: 5 },
    { href: '/platforms', icon: 'database' as const, kicker: 'ORBAT', label: 'Platform Library', count: platformLabel, unit: 'platforms', accent: 'text-[var(--store-accent)] bg-[var(--store-accent-glow)] border-[var(--store-accent-border)]', desc: 'World military UAS database with OSINT dossiers', priority: 6 },
    { href: '/spectrum', icon: 'radio' as const, kicker: 'EW', label: 'Spectrum View', count: '6', unit: 'GHz span', accent: 'text-cyan bg-cyan/10 border-cyan/25', desc: 'RF spectrum visualiser and SPECTRA kill-chain', priority: 7 },
    { href: '/overlay', icon: 'target' as const, kicker: 'SAM', label: 'SAM Engagement', count: 'Pk', unit: 'envelope', accent: 'text-red bg-red/10 border-red/25', desc: 'SAM intercept geometry, range rings, and salvo Pk', priority: 8 },
    { href: '/planner', icon: 'map' as const, kicker: 'PLANNER', label: 'SPECTRAL Planner', count: String(stats.plannerVignetteCount), unit: 'vignettes', accent: 'text-[var(--store-accent)] bg-[var(--store-accent-glow)] border-[var(--store-accent-border)]', desc: 'Battlespace plans, IADS stacks, engagement economics', priority: 9 },
    { href: '/pcm', icon: 'crosshair' as const, kicker: 'PCM', label: 'Persistent Combat Model', count: 'Live', unit: 'exercises', accent: 'text-[var(--store-accent)] bg-[var(--store-accent-glow)] border-[var(--store-accent-border)]', desc: 'Learner-driven exercises, globe runs, and force design', priority: 10 },
    { href: '/compare', icon: 'git-compare' as const, kicker: 'ANALYSIS', label: 'Platform Compare', count: '2', unit: 'min pick', accent: 'text-amber bg-amber/10 border-amber/25', desc: 'Library platform dossier side-by-side comparison', priority: 11 },
  ] as const
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
  const modules = buildModules(stats)
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

      <StoreCatalogHeader title="Intelligence Modules" meta={`${modules.length} modules · threat-priority order · Jul 2026`} />

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
            blurb={mod.desc}
            count={mod.count}
            unit={mod.unit}
            accentClass={mod.accent}
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
