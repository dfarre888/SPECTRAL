'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Database, Radio, Satellite, Shield, Globe,
  Swords, GitCompare, LayoutDashboard, ChevronRight, Map, FileUp
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { isOperationsEditionClient } from '@/lib/operations/edition-client'

const BASE_NAV = [
  { href: '/',          icon: LayoutDashboard, label: 'Dashboard',         sub: 'Overview' },
  { href: '/platforms', icon: Database,         label: 'Platform Library', sub: '39 platforms' },
  { href: '/map',       icon: Map,              label: 'Map Intel',        sub: 'Terrain & envelopes' },
  { href: '/spectrum',  icon: Radio,            label: 'Spectrum View',    sub: 'SPECTRA / EW intel' },
  { href: '/gnss',      icon: Satellite,        label: 'GNSS Intelligence',sub: 'Constellations & jammers' },
  { href: '/defeat',    icon: Shield,           label: 'Defeat Matrix',    sub: 'Countermeasures' },
  { href: '/conflicts', icon: Globe,            label: 'Conflict Intel',   sub: 'Case studies' },
  { href: '/arena',     icon: Swords,           label: 'Red/Blue Arena',   sub: 'Scenario engine' },
  { href: '/compare',   icon: GitCompare,       label: '1v1 Overlay',      sub: 'Head-to-head' },
] as const

const OPERATIONS_NAV = {
  href: '/operations/import',
  icon: FileUp,
  label: 'Data Import',
  sub: 'Tenant ingest',
} as const

export function Sidebar() {
  const pathname = usePathname()
  const nav = isOperationsEditionClient()
    ? [...BASE_NAV.slice(0, 3), OPERATIONS_NAV, ...BASE_NAV.slice(3)]
    : BASE_NAV

  return (
    <aside className="w-72 xl:w-80 flex-shrink-0 store-panel border-r border-[var(--store-line)] border-t-0 border-b-0 border-l-0 rounded-none flex flex-col bg-[var(--store-surface)]">
      {/* Logo — Spectral purple brand identity */}
      <div className="px-5 py-4 border-b border-[var(--store-line)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple/15 border border-purple/35 flex items-center justify-center">
            <Radio className="w-4 h-4 text-purple" />
          </div>
          <div>
            <p className="store-display font-bold text-white tracking-widest text-sm uppercase">Spectral</p>
            <p className="store-text-muted text-[10px] font-mono tracking-wider">Drone Threat Intel</p>
          </div>
        </div>
      </div>

      {/* Nav — orange active state (A3DM pattern) */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV.map(({ href, icon: Icon, label, sub }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-xl mb-0.5 group transition-all border',
                active
                  ? 'nav-item-active'
                  : 'border-transparent store-text-body hover:bg-[var(--store-surface-2)] hover:text-white',
              )}
            >
              <Icon
                className={cn(
                  'nav-icon w-4 h-4 flex-shrink-0',
                  active ? 'text-[var(--store-accent)]' : 'store-text-muted group-hover:store-text-body',
                )}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{label}</p>
                <p className="text-[10px] store-text-muted truncate font-mono">{sub}</p>
              </div>
              {active && <ChevronRight className="w-3 h-3 text-[var(--store-accent)] flex-shrink-0" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[var(--store-line)] space-y-1">
        <p className="text-[10px] font-mono store-text-muted text-center">
          SPECTRAL v0.1.0 — UNCLASSIFIED
        </p>
        <p className="text-[9px] font-mono store-text-muted text-center opacity-70">
          Powered by A3DM
        </p>
      </div>
    </aside>
  )
}
