'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Search, Bell, Settings, Zap } from 'lucide-react'
import { OperationsChrome } from '@/components/operations/OperationsChrome'
import { federatedSearch } from '@/lib/search/federated-index'
import { isOperationsEditionClient } from '@/lib/operations/edition-client'

export function Topbar() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const hits = useMemo(() => federatedSearch(query), [query])
  const isOps = isOperationsEditionClient()
  const searchRef = useRef<HTMLInputElement>(null)

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
    <header className="h-12 flex-shrink-0 bg-[var(--store-surface)] border-b border-[var(--store-line)] flex items-center px-4 gap-4">
      <div className="flex-1 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 store-text-muted" />
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search platforms, jammers, incidents..."
          className="w-full store-panel-inner rounded-xl pl-8 pr-4 py-1.5 text-xs text-white placeholder:store-text-muted focus:outline-none focus:border-[var(--store-accent-border)] font-mono"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] store-text-muted font-mono store-panel-inner px-1.5 py-0.5 rounded border border-[var(--store-line)]">
          ⌘K
        </kbd>
        {open && query.length > 1 && hits.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 z-50 store-panel rounded-xl border border-[var(--store-line)] shadow-xl max-h-64 overflow-y-auto">
            {hits.map((h) => (
              <Link
                key={`${h.module}-${h.id}`}
                href={h.href}
                className="block px-3 py-2 text-xs hover:bg-[var(--store-surface-2)] border-b border-[var(--store-line)] last:border-0"
              >
                <span className="text-white font-medium">{h.label}</span>
                <span className="block text-[10px] store-text-muted font-mono">{h.module}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1" />

      <OperationsChrome />

      {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--store-accent-border)] bg-[var(--store-accent-glow)]">
          <span className="text-[10px] font-mono font-semibold text-[var(--store-accent)]">DEMO MODE</span>
        </div>
      )}

      {/* AI indicator — purple for EW/AI brand, not primary CTA */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple/10 border border-purple/25">
        <Zap className="w-3 h-3 text-purple" />
        <span className="text-[10px] font-mono text-purple">AI Ready</span>
      </div>

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
          className="w-7 h-7 rounded-lg flex items-center justify-center store-text-muted hover:text-white hover:bg-[var(--store-surface-2)] transition-colors"
        >
          <Bell className="w-4 h-4" />
        </button>
        {notifOpen && (
          <div className="absolute top-full right-0 mt-1 z-50 w-56 store-panel rounded-xl border border-[var(--store-line)] shadow-xl p-3">
            <p className="text-[10px] font-mono uppercase tracking-wider store-text-muted">Training alerts</p>
            <p className="mt-2 text-[11px] store-text-body">No active alerts. Exercise injects and scenario notices will appear here.</p>
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
          className="w-7 h-7 rounded-lg flex items-center justify-center store-text-muted hover:text-white hover:bg-[var(--store-surface-2)] transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>
        {settingsOpen && (
          <div className="absolute top-full right-0 mt-1 z-50 w-56 store-panel rounded-xl border border-[var(--store-line)] shadow-xl py-1">
            {isOps && (
              <Link
                href="/operations/import"
                className="block px-3 py-2 text-xs hover:bg-[var(--store-surface-2)] border-b border-[var(--store-line)]"
                onClick={() => setSettingsOpen(false)}
              >
                <span className="text-white font-medium">Data import</span>
                <span className="block text-[10px] store-text-muted font-mono mt-0.5">Tenant ingest queue</span>
              </Link>
            )}
            <Link
              href="/currency"
              className="block px-3 py-2 text-xs hover:bg-[var(--store-surface-2)] border-b border-[var(--store-line)]"
              onClick={() => setSettingsOpen(false)}
            >
              <span className="text-white font-medium">Currency queue</span>
              <span className="block text-[10px] store-text-muted font-mono mt-0.5">DS TTP review pipeline</span>
            </Link>
            <Link
              href="/login"
              className="block px-3 py-2 text-xs hover:bg-[var(--store-surface-2)]"
              onClick={() => setSettingsOpen(false)}
            >
              <span className="text-white font-medium">Account</span>
              <span className="block text-[10px] store-text-muted font-mono mt-0.5">Sign in or switch session</span>
            </Link>
          </div>
        )}
      </div>

      <div className="w-7 h-7 rounded-full bg-purple/15 border border-purple/35 flex items-center justify-center">
        <span className="text-[10px] font-bold text-purple">DF</span>
      </div>
    </header>
  )
}
