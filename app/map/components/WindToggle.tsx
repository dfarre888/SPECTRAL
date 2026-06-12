'use client'

import { Wind } from 'lucide-react'
import { clsx } from 'clsx'

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
      className={clsx(
        'flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-mono transition-colors',
        nilWind
          ? 'border-border bg-surf2 text-t-secondary hover:text-t-primary'
          : 'border-cyan/40 bg-cyan/10 text-cyan'
      )}
      title={nilWind ? 'Nil-wind assumption (click for live wind)' : 'Live wind from Windy API'}
    >
      <Wind className="w-3.5 h-3.5" />
      {loading ? 'Fetching wind…' : nilWind ? 'Nil-Wind' : 'Live Wind'}
    </button>
  )
}
