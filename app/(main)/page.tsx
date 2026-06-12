import {
  Database, Satellite, Shield, Globe,
  TrendingUp, AlertTriangle, CheckCircle, BadgeCheck, ShieldCheck,
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
import { StoreHero } from '@/components/catalog/StoreHero'
import { StorePanel } from '@/components/ui/store-surface'

const MODULES = [
  { href: '/platforms', icon: 'database' as const, kicker: 'ORBAT', label: 'Platform Library', count: '25', unit: 'platforms', accent: 'text-[var(--store-accent)] bg-[var(--store-accent-glow)] border-[var(--store-accent-border)]', desc: 'World military UAS database with OSINT dossiers' },
  { href: '/spectrum', icon: 'radio' as const, kicker: 'EW', label: 'Spectrum View', count: '6', unit: 'GHz span', accent: 'text-purple bg-purple/10 border-purple/25', desc: 'RF spectrum visualiser and SPECTRA kill-chain' },
  { href: '/gnss', icon: 'satellite' as const, kicker: 'NAVWAR', label: 'GNSS Intelligence', count: '12', unit: 'jammers', accent: 'text-cyan bg-cyan/10 border-cyan/25', desc: 'Constellations, denial systems, defeat methods' },
  { href: '/defeat', icon: 'shield' as const, kicker: 'C-UAS', label: 'Defeat Matrix', count: '15', unit: 'systems', accent: 'text-[var(--store-success)] bg-[rgba(74,222,128,0.10)] border-[rgba(74,222,128,0.20)]', desc: 'Platform × countermeasure effectiveness grid' },
  { href: '/conflicts', icon: 'globe' as const, kicker: 'CASE STUDY', label: 'Conflict Intel', count: '7', unit: 'incidents', accent: 'text-[var(--store-accent)] bg-[var(--store-accent-glow)] border-[var(--store-accent-border)]', desc: 'Named engagements and operational lessons' },
  { href: '/arena', icon: 'swords' as const, kicker: 'WARGAME', label: 'Red/Blue Arena', count: '20+', unit: 'injects', accent: 'text-red bg-red/10 border-red/25', desc: 'Scenario engine and exercise briefs' },
  { href: '/compare', icon: 'git-compare' as const, kicker: 'ANALYSIS', label: '1v1 Overlay', count: '∞', unit: 'matchups', accent: 'text-amber bg-amber/10 border-amber/25', desc: 'Head-to-head engagement comparison' },
]

const RECENT_INCIDENTS = [
  { id: 'ukraine-shahed-swarm', label: 'Ukraine — Shahed-136 swarm campaign', status: 'ongoing', type: 'strike' },
  { id: 'vivid-sydney-2024', label: 'Vivid Sydney 2024 — GPS denial (80+ drones)', status: 'closed', type: 'gnss' },
  { id: 'ukraine-lancet', label: 'Ukraine — Lancet loitering munition vs armour', status: 'ongoing', type: 'strike' },
  { id: 'houthi-red-sea', label: 'Yemen — Houthi Red Sea drone campaign', status: 'ongoing', type: 'swarm' },
]

const STATS = [
  { label: 'UAS Platforms', value: '25', sub: 'tracked', icon: Database, trend: '+4 this month' },
  { label: 'Defeat Systems', value: '15', sub: 'catalogued', icon: Shield, trend: '3 conflict-validated' },
  { label: 'GNSS Jammers', value: '12', sub: 'tier 1–3', icon: Satellite, trend: '5 COTS tier added' },
  { label: 'Conflict Incidents', value: '7', sub: 'case studies', icon: Globe, trend: '2 active this week' },
]

export default function Dashboard() {
  return (
    <div className="pb-12">
      <StoreHero
        eyebrow="Spectral Intelligence"
        title={
          <>
            Drone Threat Intelligence,
            <br />
            Built for Operators
          </>
        }
        subtitle="Dynamic Platform Capability Analyser — UNCLASSIFIED OSINT modules for platform assessment, EW spectrum, defeat adjudication, and conflict case studies."
        trustChip={
          <>
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                background: 'var(--store-success)',
                boxShadow: '0 0 8px var(--store-success)',
              }}
            />
            22-year RAAF pedigree — instructor-grade threat analysis for allied training
          </>
        }
        trustItems={[
          { icon: ShieldCheck, label: 'UNCLASSIFIED // training use only' },
          { icon: BadgeCheck, label: 'OSINT-sourced specifications' },
          { icon: Database, label: 'Cross-linked defeat matrix' },
        ]}
      />

      <StoreCatalogLayout
        sidebar={
          <StoreFilterSidebar>
            <StoreFilterSection label="Status">
              {STATS.map(({ label, value, sub, icon: Icon, trend }) => (
                <StorePanel key={label} className="p-3 mb-2 last:mb-0">
                  <div className="flex items-start justify-between mb-2">
                    <Icon className="w-4 h-4 text-[var(--store-accent)]" />
                    <span className="text-[9px] font-mono text-[var(--store-success)] flex items-center gap-1">
                      <TrendingUp className="w-2.5 h-2.5" />
                      {trend}
                    </span>
                  </div>
                  <p className="text-xl font-bold text-white font-mono">{value}</p>
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
        <StoreCatalogHeader title="Intelligence Modules" meta="7 modules · select to open" />

        <div
          className="grid gap-4 mb-8"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
        >
          {MODULES.map((mod, index) => (
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
                href={`/conflicts/${id}`}
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
    </div>
  )
}
