'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, PanelLeft, Radio } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isOperationsEditionClient } from '@/lib/operations/edition-client'
import { useMobileNav } from '@/components/layout/MobileNavContext'
import { moduleIcon } from '@/components/navigation/module-presentation'
import {
  moduleByHref,
  pinnedModules,
  sidebarGroups,
  type ModuleGroupId,
  type SpectralModule,
} from '@/lib/navigation/modules'

const COLLAPSE_KEY = 'spectral-nav-collapsed'

function readCollapsed(): ModuleGroupId[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(COLLAPSE_KEY)
    return raw ? (JSON.parse(raw) as ModuleGroupId[]) : []
  } catch {
    return []
  }
}

interface SidebarProps {
  proposedCurrencyCount?: number
  platformCount?: number
}

/**
 * Floating Liquid Glass sidebar (HIG sidebars: glass layer above content,
 * two levels of hierarchy at most, can be hidden). Collapses to an icon rail
 * with Cmd+\ or the panel button; labels move into tooltips.
 */
export function Sidebar({ proposedCurrencyCount = 0, platformCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const { open, close, rail, toggleRail } = useMobileNav()
  const ops = isOperationsEditionClient()
  const groups = useMemo(() => sidebarGroups({ operationsEdition: ops }), [ops])
  const pinned = useMemo(() => pinnedModules({ operationsEdition: ops }), [ops])
  const activeModule = moduleByHref(pathname)

  const [collapsed, setCollapsed] = useState<ModuleGroupId[]>([])
  useEffect(() => setCollapsed(readCollapsed()), [])

  function toggleGroup(id: ModuleGroupId) {
    setCollapsed((prev) => {
      const next = prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
      try {
        window.localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next))
      } catch {
        /* private mode — collapse state is a convenience, not state we rely on */
      }
      return next
    })
  }

  function badgeFor(module: SpectralModule): number | undefined {
    return module.id === 'currency' ? proposedCurrencyCount : undefined
  }

  function subFor(module: SpectralModule): string {
    if (module.id === 'platforms' && platformCount > 0) return `${platformCount} platforms`
    return module.sub
  }

  // The rail only applies on desktop; the mobile drawer is always full width.
  const railed = rail && !open

  const renderNavItem = (module: SpectralModule) => {
    const Icon = moduleIcon(module.icon)
    const active = activeModule?.href === module.href
    const badge = badgeFor(module)
    return (
      <Link
        key={module.href}
        href={module.href}
        onClick={() => close()}
        aria-current={active ? 'page' : undefined}
        title={railed ? `${module.label} · ${subFor(module)}` : subFor(module)}
        className={cn('shell-nav-item', railed && 'justify-center !px-0')}
      >
        <Icon className="nav-icon w-[17px] h-[17px]" strokeWidth={1.75} />
        {!railed && <span className="flex-1 min-w-0 truncate">{module.label}</span>}
        {!railed && badge != null && badge > 0 && (
          <span className="tag blue !h-[18px] !px-1.5 font-mono tabular-nums">{badge}</span>
        )}
      </Link>
    )
  }

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={close}
        />
      ) : null}
      <aside
        className={cn(
          'shell-sidebar flex-shrink-0 flex flex-col z-50 overflow-hidden',
          'fixed md:relative top-2.5 bottom-2.5 left-2.5 md:top-auto md:bottom-auto md:left-auto',
          'transition-transform duration-200 md:translate-x-0',
          railed ? 'md:w-[64px] w-[248px]' : 'w-[248px]',
          open ? 'translate-x-0' : '-translate-x-[110%] md:translate-x-0',
        )}
      >
        <div className={cn('flex items-center gap-2.5 h-14 flex-shrink-0', railed ? 'justify-center px-2' : 'pl-4 pr-2')}>
          <Link
            href="/"
            onClick={() => close()}
            className="flex items-center gap-2.5 min-w-0 flex-1"
            title="Spectral"
          >
            <span className="relative w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0 bg-[linear-gradient(180deg,#3AA2FF,#1565C0)] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_4px_14px_-4px_rgba(41,151,255,0.8)]">
              <Radio className="w-4 h-4 text-white" strokeWidth={2} />
            </span>
            {!railed && (
              <span className="min-w-0">
                <span className="block store-display font-semibold text-[var(--store-ink)] tracking-[-0.01em] text-[15px] leading-tight">
                  Spectral
                </span>
                <span className="block text-[11px] store-text-muted leading-tight">Drone threat intelligence</span>
              </span>
            )}
          </Link>
          {!railed && (
            <button
              type="button"
              onClick={toggleRail}
              className="glass-icon-btn hidden md:inline-flex"
              aria-label="Collapse sidebar"
              title="Collapse sidebar (⌘\)"
            >
              <PanelLeft className="w-4 h-4" strokeWidth={1.75} />
            </button>
          )}
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pb-3" aria-label="Modules">
          {pinned.length > 0 && <section className="pt-1 pb-1">{pinned.map(renderNavItem)}</section>}
          {groups.map(({ group, modules }) => {
            // Never hide the group the user is currently inside.
            const holdsActive = modules.some((m) => m.href === activeModule?.href)
            const isCollapsed = !railed && collapsed.includes(group.id) && !holdsActive
            return (
              <section key={group.id}>
                {railed ? (
                  <div className="mx-4 my-2.5 h-px bg-[var(--glass-line)]" aria-hidden />
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    aria-expanded={!isCollapsed}
                    className="shell-group-label"
                  >
                    <span>{group.label}</span>
                    <ChevronDown
                      className={cn('ml-auto w-3.5 h-3.5 transition-transform duration-150', isCollapsed && '-rotate-90')}
                    />
                  </button>
                )}
                {!isCollapsed && modules.map(renderNavItem)}
              </section>
            )
          })}
        </nav>

        <div className={cn('flex-shrink-0 border-t border-[var(--glass-line)] h-11 flex items-center', railed ? 'justify-center' : 'px-4 justify-between')}>
          {railed ? (
            <button
              type="button"
              onClick={toggleRail}
              className="glass-icon-btn"
              aria-label="Expand sidebar"
              title="Expand sidebar (⌘\)"
            >
              <PanelLeft className="w-4 h-4" strokeWidth={1.75} />
            </button>
          ) : (
            <>
              <span className="text-[11px] font-mono store-text-muted">v0.1.0</span>
              <span className="shell-marking text-[11px] font-mono text-[#F5B94A]">UNCLASSIFIED</span>
            </>
          )}
        </div>
      </aside>
    </>
  )
}
