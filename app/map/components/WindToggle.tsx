'use client'

import { Wind } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WindToggleProps {
  nilWind: boolean
  loading?: boolean
  onChange: (nilWind: boolean) => void
}

export function WindToggle({ nilWind, loading, onChange }: WindToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!nilWind)}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors border',
        nilWind
          ? 'store-panel-inner store-text-body hover:text-white border-[var(--store-line)]'
          : 'nav-item-active',
      )}
      title={nilWind ? 'Nil-wind assumption (click for live wind)' : 'Live wind from Windy API'}
    >
      <Wind className="w-3.5 h-3.5" />
      {loading ? 'Fetching wind…' : nilWind ? 'Nil wind' : 'Live wind'}
    </button>
  )
}
