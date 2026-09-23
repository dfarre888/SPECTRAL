'use client'

import { useMemo } from 'react'
import { DataTable, type DataColumn } from '@/components/ui/DataTable'
import { confidenceRank, confidenceTag } from '@/components/platforms/platform-display'
import { effectivenessColour } from '@/lib/platforms/confidence'
import type { DefeatEffectiveness } from '@/lib/types'
import { cn } from '@/lib/utils'

/** Colour the value, not the cell. */
function pctClass(colour: ReturnType<typeof effectivenessColour>) {
  switch (colour) {
    case 'green':
      return 'text-[#6EE7A0]'
    case 'amber':
      return 'text-[#FCD34D]'
    case 'red':
      return 'text-[#FF8A98]'
    default:
      return 'store-text-muted'
  }
}

function Pct({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="store-text-muted">—</span>
  return <span className={cn('font-medium', pctClass(effectivenessColour(pct)))}>{pct}</span>
}

interface CountermeasuresPanelProps {
  countermeasures: DefeatEffectiveness[]
}

const NAME_W = 300

export function CountermeasuresPanel({ countermeasures }: CountermeasuresPanelProps) {
  const hasSwarm = countermeasures.some((c) => c.swarm_engagement_pct != null)

  const columns = useMemo<DataColumn<DefeatEffectiveness>[]>(() => {
    const cols: DataColumn<DefeatEffectiveness>[] = [
      {
        key: 'system',
        header: 'Defeat System',
        sticky: true,
        width: NAME_W,
        sortValue: (c) => c.defeat_system?.name ?? c.defeat_system_id,
        cell: (c) => {
          const name = c.defeat_system?.name ?? c.defeat_system_id
          const meta = [c.defeat_system?.manufacturer, c.defeat_system?.country].filter(Boolean).join(' · ')
          return (
            <div style={{ width: NAME_W - 24 }}>
              <span className="primary block truncate leading-snug" title={name}>
                {name}
              </span>
              {meta ? (
                <span className="meta truncate" title={meta}>
                  {meta}
                </span>
              ) : null}
            </div>
          )
        },
      },
      {
        key: 'rf',
        header: (
          <span>
            RF Jamming <span className="font-normal store-text-muted">%</span>
          </span>
        ),
        label: 'RF jamming',
        align: 'right',
        width: 124,
        sortValue: (c) => c.rf_jamming_pct,
        cell: (c) => <Pct pct={c.rf_jamming_pct} />,
      },
      {
        key: 'kinetic',
        header: (
          <span>
            Kinetic <span className="font-normal store-text-muted">%</span>
          </span>
        ),
        label: 'Kinetic',
        align: 'right',
        width: 100,
        sortValue: (c) => c.kinetic_pct,
        cell: (c) => <Pct pct={c.kinetic_pct} />,
      },
      {
        key: 'dew',
        header: (
          <span>
            DEW <span className="font-normal store-text-muted">%</span>
          </span>
        ),
        label: 'DEW',
        align: 'right',
        width: 88,
        sortValue: (c) => c.dew_pct,
        cell: (c) => <Pct pct={c.dew_pct} />,
      },
    ]
    if (hasSwarm) {
      cols.push({
        key: 'swarm',
        header: (
          <span>
            Swarm <span className="font-normal store-text-muted">%</span>
          </span>
        ),
        label: 'Swarm',
        align: 'right',
        width: 96,
        sortValue: (c) => c.swarm_engagement_pct,
        cell: (c) => <Pct pct={c.swarm_engagement_pct} />,
      })
    }
    cols.push(
      {
        key: 'confidence',
        header: 'Confidence',
        width: 118,
        sortValue: (c) => confidenceRank(c.data_confidence),
        cell: (c) => {
          const t = confidenceTag(c.data_confidence)
          return <span className={cn('tag', t.tone)}>{t.label}</span>
        },
      },
      {
        key: 'notes',
        header: 'Notes',
        width: 360,
        cell: (c) => {
          const note = c.special_notes ?? c.recommended_response ?? null
          const full = [c.is_immune ? `Immune: ${c.immune_reason ?? 'no reason recorded'}` : null, note]
            .filter(Boolean)
            .join('. ')
          return (
            <div className="flex items-center gap-2 min-w-0" style={{ width: 336 }} title={full || undefined}>
              {c.is_immune ? <span className="tag red shrink-0">Immune</span> : null}
              {c.weather_limited ? <span className="tag amber shrink-0">Weather-limited</span> : null}
              {note ? (
                <span className="truncate store-text-body">{note}</span>
              ) : !c.is_immune && !c.weather_limited ? (
                <span className="store-text-muted">—</span>
              ) : null}
            </div>
          )
        },
      },
    )
    return cols
  }, [hasSwarm])

  if (countermeasures.length === 0) {
    return (
      <div className="store-panel rounded-2xl px-6 py-8 text-center">
        <p className="text-[13px] store-text-body">No countermeasure pairings assessed for this platform yet.</p>
      </div>
    )
  }

  return (
    <DataTable
      rows={countermeasures}
      columns={columns}
      rowKey={(c) => c.id}
      defaultSort={{ key: 'kinetic', dir: 'desc' }}
      compact
      maxHeight="min(560px, calc(100vh - 200px))"
      caption="Countermeasures"
    />
  )
}
