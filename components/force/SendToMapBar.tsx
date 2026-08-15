'use client'

import { useRouter } from 'next/navigation'
import { Map } from 'lucide-react'
import { forceMapHref, writeForcePackage } from '@/lib/force/package-session'
import { FORCE_THEATRES } from '@/lib/force/theatres'
import type { TheatreTemplate } from '@/lib/force/types'

interface SendToMapBarProps {
  blue: string
  red: string
  selectedIds: string[]
  theatreId?: string
}

export function SendToMapBar({ blue, red, selectedIds, theatreId = 'north-aus' }: SendToMapBarProps) {
  const router = useRouter()
  const theatre: TheatreTemplate =
    FORCE_THEATRES.find((t) => t.id === theatreId) ?? FORCE_THEATRES[2]

  const send = (id: string) => {
    writeForcePackage({
      theatreId: id,
      blue,
      red,
      selectedIds,
      createdAt: new Date().toISOString(),
    })
    router.push(forceMapHref({ theatreId: id, blue, red }))
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[var(--store-accent-border)] bg-[var(--store-accent-glow)] p-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-medium text-white">Send package to map</p>
        <p className="text-[10px] font-mono store-text-muted">
          {selectedIds.length} selected · {blue} vs {red} · unmapped types list as ORBAT-only
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {FORCE_THEATRES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => send(t.id)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] ${
              t.id === theatre.id
                ? 'bg-[var(--store-accent)] font-medium text-black'
                : 'border border-[var(--store-accent-border)] bg-[var(--store-surface)] text-white hover:bg-[var(--store-surface-2)]'
            }`}
          >
            <Map className="h-3 w-3" />
            {t.name}
          </button>
        ))}
      </div>
    </div>
  )
}
