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
    <StorePanel className="p-5 mb-8">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="wb-pane-title !text-[15px]">Start here</p>
          <p className="text-[13px] store-text-body max-w-xl mt-0.5">
            Pick a task and it opens the right module. Compare and SAM engagement are different tools.
          </p>
        </div>
        <Globe className="w-4 h-4 store-text-muted shrink-0 mt-0.5" aria-hidden />
      </div>
      <div className="grid gap-x-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
        {TASKS.map(({ href, label, subtitle, icon: Icon, accent }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center gap-3 rounded-lg px-2.5 py-2.5 border-b fc-hair hover:bg-[rgba(255,255,255,0.05)] transition-colors"
          >
            <Icon className={`w-4 h-4 shrink-0 ${accent}`} aria-hidden />
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-[var(--store-ink)] group-hover:text-white">{label}</p>
              <p className="text-[12px] store-text-muted mt-0.5 truncate">{subtitle}</p>
            </div>
          </Link>
        ))}
      </div>
    </StorePanel>
  )
}
