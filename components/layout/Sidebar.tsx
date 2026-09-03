'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, ChevronRight, Radio } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isOperationsEditionClient } from '@/lib/operations/edition-client'
import { useMobileNav } from '@/components/layout/MobileNavContext'
import { moduleIcon } from '@/components/navigation/module-presentation'
import {
  moduleByHref,
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

export function Sidebar({ proposedCurrencyCount = 0, platformCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const { open, close } = useMobileNav()
  const groups = useMemo(
    () => sidebarGroups({ operationsEdition: isOperationsEditionClient() }),
    [],
  )
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
          <p className="text-xs font-medium truncate">{module.label}</p>
          <p className="text-[10px] store-text-muted truncate font-mono">{subFor(module)}</p>
        </div>
        {badge != null && badge > 0 && (
          <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-[var(--store-accent)] text-[10px] font-mono font-bold text-black flex items-center justify-center">
            {badge}
          </span>
        )}
        {active && <ChevronRight className="w-3 h-3 text-[var(--store-accent)] flex-shrink-0" />}
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
          'w-72 xl:w-80 flex-shrink-0 store-panel border-r border-[var(--store-line)] border-t-0 border-b-0 border-l-0 rounded-none flex flex-col bg-[var(--store-surface)] z-50',
          'fixed md:static inset-y-0 left-0 transition-transform duration-200 md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        <div className="px-5 py-4 border-b border-[var(--store-line)]">
          <Link href="/" onClick={() => close()} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--store-accent-glow)] border border-[var(--store-accent-border)] flex items-center justify-center">
              <Radio className="w-4 h-4 text-[var(--store-accent)]" />
            </div>
            <div>
              <p className="store-display font-bold text-white tracking-widest text-sm uppercase">
                Spectral
              </p>
              <p className="store-text-muted text-[10px] font-mono tracking-wider">
                Drone Threat Intel
              </p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 py-3 overflow-y-auto" aria-label="Modules">
          {groups.map(({ group, modules }) => {
            // Never hide the group the user is currently inside.
            const holdsActive = modules.some((m) => m.href === activeModule?.href)
            const isCollapsed = collapsed.includes(group.id) && !holdsActive
            return (
              <section key={group.id} className="mb-3">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={!isCollapsed}
                  className="w-full flex items-center gap-1.5 px-5 py-1 mb-1 store-text-muted hover:text-white transition-colors"
                >
                  <ChevronDown
                    className={cn(
                      'w-3 h-3 flex-shrink-0 transition-transform',
                      isCollapsed && '-rotate-90',
                    )}
                  />
                  <span className="text-[10px] font-mono uppercase tracking-wider">
                    {group.label}
                  </span>
                  <span className="ml-auto text-[10px] font-mono tabular-nums opacity-60">
                    {modules.length}
                  </span>
                </button>
                {!isCollapsed && modules.map(renderNavItem)}
              </section>
            )
          })}
        </nav>

        <div className="px-4 py-3 border-t border-[var(--store-line)] space-y-1">
          <p className="text-[10px] font-mono store-text-muted text-center">
            SPECTRAL v0.1.0 — UNCLASSIFIED
          </p>
        </div>
      </aside>
    </>
  )
}
