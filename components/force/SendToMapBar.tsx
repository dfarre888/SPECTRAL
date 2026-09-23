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
    <div className="store-panel flex flex-col gap-3 rounded-2xl px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="wb-pane-title">Send package to map</p>
        <p className="mt-1 text-[12px] store-text-muted">
          <span className="font-mono tabular-nums text-[var(--store-ink)]">{selectedIds.length}</span> selected
          <span className="mx-1.5">·</span>
          <span className="font-mono text-[var(--wb-blue)]">{blue}</span>
          <span className="mx-1">vs</span>
          <span className="font-mono text-[var(--wb-red)]">{red}</span>
          <span className="mx-1.5">·</span>
          types without a map model list as ORBAT only
        </p>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Send to theatre">
        {FORCE_THEATRES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => send(t.id)}
            className={t.id === theatre.id ? 'btn-glass primary' : 'btn-glass'}
          >
            <Map className="h-3.5 w-3.5" aria-hidden />
            {t.name}
          </button>
        ))}
      </div>
    </div>
  )
}
