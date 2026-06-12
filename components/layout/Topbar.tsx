'use client'
import { useState } from 'react'
import { Search, Bell, Settings, Zap } from 'lucide-react'

export function Topbar() {
  const [query, setQuery] = useState('')

  return (
    <header className="h-12 flex-shrink-0 bg-[var(--store-surface)] border-b border-[var(--store-line)] flex items-center px-4 gap-4">
      <div className="flex-1 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 store-text-muted" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search platforms, jammers, incidents..."
          className="w-full store-panel-inner rounded-xl pl-8 pr-4 py-1.5 text-xs text-white placeholder:store-text-muted focus:outline-none focus:border-[var(--store-accent-border)] font-mono"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] store-text-muted font-mono store-panel-inner px-1.5 py-0.5 rounded border border-[var(--store-line)]">
          ⌘K
        </kbd>
      </div>

      <div className="flex-1" />

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

      <button className="w-7 h-7 rounded-lg flex items-center justify-center store-text-muted hover:text-white hover:bg-[var(--store-surface-2)] transition-colors">
        <Bell className="w-4 h-4" />
      </button>
      <button className="w-7 h-7 rounded-lg flex items-center justify-center store-text-muted hover:text-white hover:bg-[var(--store-surface-2)] transition-colors">
        <Settings className="w-4 h-4" />
      </button>

      <div className="w-7 h-7 rounded-full bg-purple/15 border border-purple/35 flex items-center justify-center">
        <span className="text-[10px] font-bold text-purple">DF</span>
      </div>
    </header>
  )
}
