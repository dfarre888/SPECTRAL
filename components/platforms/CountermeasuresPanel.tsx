import { ConfidenceBadge } from '@/components/platforms/ConfidenceBadge'
import { effectivenessColour } from '@/lib/platforms/confidence'
import type { DefeatEffectiveness } from '@/lib/types'
import { cn } from '@/lib/utils'

function pctClass(colour: ReturnType<typeof effectivenessColour>) {
  switch (colour) {
    case 'green': return 'text-green'
    case 'amber': return 'text-amber'
    case 'red': return 'text-red'
    default: return 'text-t-muted'
  }
}

interface CountermeasuresPanelProps {
  countermeasures: DefeatEffectiveness[]
}

function EffectivenessValue({ label, pct }: { label: string; pct: number | null }) {
  const colour = effectivenessColour(pct)
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-t-secondary">{label}</span>
      <span className={cn('font-mono font-medium', pctClass(colour))}>
        {pct != null ? `${pct}%` : '—'}
      </span>
    </div>
  )
}

export function CountermeasuresPanel({ countermeasures }: CountermeasuresPanelProps) {
  if (countermeasures.length === 0) {
    return (
      <div className="bg-surf1 border border-border rounded-lg p-8 text-center">
        <p className="text-t-secondary text-sm font-mono">No countermeasure data assessed</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-t-primary">Countermeasures</h2>
      {countermeasures.map((cm) => (
        <div
          key={cm.id}
          className="bg-surf1 border border-border rounded-lg p-4 space-y-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium text-t-primary">
                {cm.defeat_system?.name ?? cm.defeat_system_id}
              </p>
              {cm.defeat_system?.manufacturer && (
                <p className="text-xs text-t-secondary font-mono mt-0.5">
                  {cm.defeat_system.manufacturer} — {cm.defeat_system.country}
                </p>
              )}
            </div>
            <ConfidenceBadge confidence={cm.data_confidence} />
          </div>

          <div className="space-y-1.5">
            <EffectivenessValue label="RF Jamming" pct={cm.rf_jamming_pct} />
            <EffectivenessValue label="Kinetic" pct={cm.kinetic_pct} />
            <EffectivenessValue label="DEW" pct={cm.dew_pct} />
          </div>

          {cm.weather_limited && (
            <p className="text-xs font-mono text-amber">⚠ Weather-limited effectiveness</p>
          )}
          {cm.is_immune && (
            <p className="text-xs font-mono text-red uppercase">IMMUNE — {cm.immune_reason}</p>
          )}
          {cm.special_notes && (
            <p className="text-xs text-t-secondary leading-relaxed">{cm.special_notes}</p>
          )}
        </div>
      ))}
    </div>
  )
}
