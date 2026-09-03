'use client'

import type { GoNoGoAssessment, GoNoGoStatus } from '@/lib/command/go-no-go-types'
import { BlockingReasonsList } from '@/components/command/BlockingReasonsList'
import { ReadinessTile } from '@/components/command/ReadinessTile'
import { StorePanel } from '@/components/ui/store-surface'
import { cn } from '@/lib/utils'

const HERO_STYLES: Record<GoNoGoStatus, { text: string; glow: string }> = {
  go: { text: 'text-[var(--store-success)]', glow: 'var(--store-success)' },
  caution: { text: 'text-amber', glow: '#fbbf24' },
  no_go: { text: 'text-red', glow: '#f87171' },
}

const HERO_LABEL: Record<GoNoGoStatus, string> = {
  go: 'GO',
  caution: 'CAUTION',
  no_go: 'NO-GO',
}

interface GoNoGoBoardProps {
  assessment: GoNoGoAssessment
  planId: string | null
}

export function GoNoGoBoard({ assessment, planId }: GoNoGoBoardProps) {
  const hero = HERO_STYLES[assessment.status]
  const mapHref = planId ? `/map?plan=${planId}` : '/map'

  return (
    <div className="space-y-6">
      <StorePanel className="p-6 md:p-8 text-center">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] store-text-muted mb-2">
          Aggregate launch status
        </p>
        <p className="text-sm store-text-body mb-4">{assessment.package_label}</p>
        <p
          className={cn(
            'font-mono text-5xl md:text-6xl font-bold tracking-tight animate-pulse',
            hero.text,
          )}
          style={{ textShadow: `0 0 24px ${hero.glow}` }}
        >
          {HERO_LABEL[assessment.status]}
        </p>
        <p className="text-[10px] font-mono store-text-muted mt-4">
          Assessed {new Date(assessment.assessed_at).toLocaleString()}
        </p>
      </StorePanel>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ReadinessTile title="PACE / Comms" status={assessment.tiles.pace.status} summary={assessment.tiles.pace.summary} href="/bmi" />
        <ReadinessTile
          title="PNT / GNSS"
          status={assessment.tiles.pnt.status}
          summary={assessment.tiles.pnt.summary}
          href="/gnss"
          meta={assessment.tiles.pnt.jam_active ? 'Jam scenario active' : undefined}
        />
        <ReadinessTile
          title="Economics"
          status={assessment.tiles.economics.status}
          summary={assessment.tiles.economics.summary}
          href="/economics"
          meta={assessment.tiles.economics.mag_depth != null ? `MAG ${assessment.tiles.economics.mag_depth}` : undefined}
        />
        <ReadinessTile title="Weather" status={assessment.tiles.weather.status} summary={assessment.tiles.weather.summary} href={mapHref} />
        <ReadinessTile
          title="Airspace"
          status={assessment.tiles.airspace.status}
          summary={assessment.tiles.airspace.summary}
          href={mapHref}
          meta={`${assessment.tiles.airspace.roz_count} ROZ`}
        />
        <ReadinessTile
          title="Competency"
          status={assessment.tiles.competency.status}
          summary={assessment.tiles.competency.summary}
          meta="DS-only tile"
        />
      </div>

      <BlockingReasonsList assessment={assessment} />
    </div>
  )
}
