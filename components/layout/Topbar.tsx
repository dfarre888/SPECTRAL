'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Search, Bell, Settings, Menu } from 'lucide-react'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { OperationsChrome } from '@/components/operations/OperationsChrome'
import { useMobileNav } from '@/components/layout/MobileNavContext'
import { federatedSearch } from '@/lib/search/federated-index'
import { isOperationsEditionClient } from '@/lib/operations/edition-client'

/**
 * Top bar, floating over the page. Transparent until content scrolls under
 * it, then glass (see .shell-topbar in globals.css). Carries the page title
 * once the page's own large title has scrolled out of view.
 */
export function Topbar({ title }: { title?: string }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const hits = useMemo(() => federatedSearch(query), [query])
  const isOps = isOperationsEditionClient()
  const searchRef = useRef<HTMLInputElement>(null)
  const { toggle } = useMobileNav()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <header className="shell-topbar">
      <button
        type="button"
        aria-label="Open navigation menu"
        className="md:hidden glass-icon-btn"
        onClick={toggle}
      >
        <Menu className="w-4 h-4" />
      </button>

      {title ? (
        <span className="shell-title hidden lg:block min-w-0 max-w-[260px] truncate" aria-hidden>
          {title}
        </span>
      ) : null}

      <div className="flex-1" />

      <div className="w-full max-w-[380px] relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 store-text-muted pointer-events-none" />
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search platforms, jammers, incidents"
          aria-label="Search Spectral"
          className="glass-field w-full h-9 pl-8 pr-12 text-[13px]"
        />
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] store-text-muted font-mono px-1.5 py-0.5 rounded-md border border-[var(--glass-line)]">
          ⌘K
        </kbd>
        {open && query.length > 1 && hits.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 z-50 glass-popover max-h-72 overflow-y-auto p-1.5">
            {hits.map((h) => (
              <Link
                key={`${h.module}-${h.id}`}
                href={h.href}
                className="block px-3 py-2 rounded-[9px] text-[13px] hover:bg-[rgba(41,151,255,0.18)]"
              >
                <span className="text-[var(--store-ink)] font-medium">{h.label}</span>
                <span className="block text-[11px] store-text-muted font-mono">{h.module}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 pl-2">
        <OperationsChrome />
        <ThemeToggle />

        <div className="relative">
          <button
            type="button"
            aria-label="Training alerts"
            aria-expanded={notifOpen}
            onClick={() => {
              setNotifOpen((v) => !v)
              setSettingsOpen(false)
            }}
            onBlur={() => setTimeout(() => setNotifOpen(false), 150)}
            className="glass-icon-btn"
          >
            <Bell className="w-4 h-4" strokeWidth={1.75} />
          </button>
          {notifOpen && (
            <div className="absolute top-full right-0 mt-2 z-50 w-64 glass-popover p-3.5">
              <p className="text-[12px] font-semibold text-[var(--store-ink)]">Operational alerts</p>
              <p className="mt-1.5 text-[12px] store-text-body leading-relaxed">
                No active alerts. Exercise injects and scenario notices will appear here.
              </p>
            </div>
          )}
        </div>
        <div className="relative">
          <button
            type="button"
            aria-label="Settings"
            aria-expanded={settingsOpen}
            onClick={() => {
              setSettingsOpen((v) => !v)
              setNotifOpen(false)
            }}
            onBlur={() => setTimeout(() => setSettingsOpen(false), 150)}
            className="glass-icon-btn"
          >
            <Settings className="w-4 h-4" strokeWidth={1.75} />
          </button>
          {settingsOpen && (
            <div className="absolute top-full right-0 mt-2 z-50 w-64 glass-popover p-1.5">
              {isOps && (
                <Link
                  href="/operations/import"
                  className="block px-3 py-2 rounded-[9px] text-[13px] hover:bg-[rgba(255,255,255,0.07)]"
                  onClick={() => setSettingsOpen(false)}
                >
                  <span className="text-[var(--store-ink)] font-medium">Data import</span>
                  <span className="block text-[11px] store-text-muted mt-0.5">Tenant ingest queue</span>
                </Link>
              )}
              <Link
                href="/currency"
                className="block px-3 py-2 rounded-[9px] text-[13px] hover:bg-[rgba(255,255,255,0.07)]"
                onClick={() => setSettingsOpen(false)}
              >
                <span className="text-[var(--store-ink)] font-medium">Currency queue</span>
                <span className="block text-[11px] store-text-muted mt-0.5">DS TTP review pipeline</span>
              </Link>
              <div className="flex items-center justify-between px-3 py-2">
                <div>
                  <span className="text-[var(--store-ink)] font-medium text-[13px]">Appearance</span>
                  <span className="block text-[11px] store-text-muted mt-0.5">Briefing paper or ops floor</span>
                </div>
                <ThemeToggle labeled />
              </div>
              <Link
                href="/login"
                className="block px-3 py-2 rounded-[9px] text-[13px] hover:bg-[rgba(255,255,255,0.07)]"
                onClick={() => setSettingsOpen(false)}
              >
                <span className="text-[var(--store-ink)] font-medium">Account</span>
                <span className="block text-[11px] store-text-muted mt-0.5">Sign in or switch session</span>
              </Link>
            </div>
          )}
        </div>

        <span
          className="ml-1 w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white bg-[linear-gradient(180deg,#4B4B55,#26262C)] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
          aria-label="Signed in as DF"
        >
          DF
        </span>
      </div>
    </header>
  )
}
