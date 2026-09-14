import Link from 'next/link'
import {
  Crosshair,
  Flag,
  GitCompare,
  Globe,
  Map,
  Radio,
  Satellite,
  Shield,
  Swords,
  Target,
  type LucideIcon,
} from 'lucide-react'
import { StorePanel } from '@/components/ui/store-surface'

const TASKS: {
  href: string
  label: string
  subtitle: string
  icon: LucideIcon
  accent: string
}[] = [
  { href: '/force', label: 'Country force / ORBAT', subtitle: 'Air land sea · AUS vs CHN', icon: Flag, accent: 'text-[var(--wb-blue)]' },
  { href: '/map', label: 'Laydown on map', subtitle: 'Cesium COP · mission paths', icon: Map, accent: 'text-cyan' },
  { href: '/platforms', label: 'Compare two platforms', subtitle: 'Pick 2, use Compare tray', icon: GitCompare, accent: 'text-amber' },
  { href: '/overlay', label: 'SAM vs UAS Pk', subtitle: 'Intercept rings + salvo Pk', icon: Target, accent: 'text-red' },
  { href: '/arena', label: 'Live wargame (Arena)', subtitle: 'WOPR · FoW · advance tick', icon: Swords, accent: 'text-[var(--wb-blue)]' },
  { href: '/spectrum', label: 'EW spectrum', subtitle: '400 MHz–6 GHz visualiser', icon: Radio, accent: 'text-cyan' },
  { href: '/pcm/scenario', label: 'PCM scenario builder', subtitle: 'Generate exercise from blind spots', icon: Crosshair, accent: 'text-[var(--wb-blue)]' },
  { href: '/defeat', label: 'Defeat matrix', subtitle: 'Platform × countermeasure', icon: Shield, accent: 'text-[var(--store-success)]' },
  { href: '/gnss', label: 'GNSS threats', subtitle: 'Jamming · spoofing · defeat', icon: Satellite, accent: 'text-cyan' },
]

export function StartHereWizard() {
  return (
    <StorePanel className="p-4 mb-6 border-[rgba(41,151,255,0.5)]">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.02em] text-[var(--wb-blue)] mb-1">
            Start here
          </p>
          <p className="text-xs store-text-body max-w-xl">
            Choose a task — each route opens the right module. Compare and SAM engagement are different tools.
          </p>
        </div>
        <Globe className="w-4 h-4 text-[var(--wb-blue)] shrink-0 mt-0.5" />
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        {TASKS.map(({ href, label, subtitle, icon: Icon, accent }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-start gap-3 rounded-lg border border-[var(--store-line)] bg-[var(--store-surface-2)] p-3 hover:border-[rgba(41,151,255,0.5)] transition-colors"
          >
            <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${accent}`} />
            <div className="min-w-0">
              <p className="text-xs font-medium text-white group-hover:text-[var(--wb-blue)] transition-colors">{label}</p>
              <p className="text-[11px] store-text-muted mt-0.5">{subtitle}</p>
              <p className="text-[11px] font-mono text-cyan mt-1 opacity-70 group-hover:opacity-100">{href}</p>
            </div>
          </Link>
        ))}
      </div>
    </StorePanel>
  )
}
