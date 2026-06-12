'use client'

import Link from 'next/link'
import { ConfidenceBadge } from '@/components/platforms/ConfidenceBadge'
import { ImmuneBadge } from '@/components/defeat/ImmuneBadge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { resolveCellValue } from '@/lib/defeat/cell-value'
import { getPrimaryDefeatType } from '@/lib/defeat/defeat-types'
import type {
  AntiDroneSystem,
  DefeatEffectiveness,
  Platform,
} from '@/lib/types'
import { cn } from '@/lib/utils'

interface AdjudicationPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  platform: Platform | null
  system: AntiDroneSystem | null
  effectiveness: DefeatEffectiveness | null
}

function PctRow({
  label,
  pct,
  highlight,
}: {
  label: string
  pct: number | null
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        'flex justify-between items-center py-2 px-3 rounded border border-border',
        highlight && 'border-orange/40 bg-orange/5'
      )}
    >
      <span className="text-sm text-t-secondary">{label}</span>
      <span className="font-mono text-sm text-t-primary">
        {pct != null ? `${pct}%` : '—'}
      </span>
    </div>
  )
}

export function AdjudicationPanel({
  open,
  onOpenChange,
  platform,
  system,
  effectiveness,
}: AdjudicationPanelProps) {
  if (!platform || !system) return null

  const cellValue = resolveCellValue(platform, system, effectiveness ?? undefined)
  const primaryType = getPrimaryDefeatType(system)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Adjudication Detail</SheetTitle>
          <SheetDescription>
            {platform.name} × {system.name}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-4">
          {!effectiveness ? (
            <div className="bg-surf2 border border-border rounded-lg p-4">
              <p className="text-sm text-t-secondary">
                No adjudication data — effectiveness not assessed for this pairing.
              </p>
              <Link
                href={`/platforms/${platform.id}`}
                className="text-orange text-sm hover:underline mt-2 inline-block"
              >
                View platform spec →
              </Link>
            </div>
          ) : (
            <>
              {cellValue.kind === 'immune' && (
                <div className="space-y-2">
                  <ImmuneBadge />
                  {cellValue.reason && (
                    <p className="text-sm text-red font-mono">{cellValue.reason}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-mono text-t-muted uppercase tracking-wider">
                  Effectiveness
                </p>
                <PctRow
                  label="RF Jamming"
                  pct={effectiveness.rf_jamming_pct}
                  highlight={primaryType === 'RF'}
                />
                <PctRow
                  label="Kinetic"
                  pct={effectiveness.kinetic_pct}
                  highlight={primaryType === 'Kinetic' || primaryType === 'Net'}
                />
                <PctRow
                  label="DEW"
                  pct={effectiveness.dew_pct}
                  highlight={primaryType === 'DEW'}
                />
                {effectiveness.swarm_engagement_pct != null && (
                  <PctRow
                    label="Swarm Engagement"
                    pct={effectiveness.swarm_engagement_pct}
                  />
                )}
              </div>

              {(effectiveness.adjudication_rationale || effectiveness.special_notes) && (
                <div>
                  <p className="text-xs font-mono text-t-muted uppercase tracking-wider mb-2">
                    Rationale
                  </p>
                  <p className="text-sm text-t-secondary leading-relaxed">
                    {effectiveness.adjudication_rationale ?? effectiveness.special_notes}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <p className="text-xs font-mono text-t-muted uppercase tracking-wider">
                  Confidence
                </p>
                <ConfidenceBadge confidence={effectiveness.data_confidence} />
              </div>

              {effectiveness.modifiers && effectiveness.modifiers.length > 0 && (
                <div>
                  <p className="text-xs font-mono text-t-muted uppercase tracking-wider mb-2">
                    Modifiers
                  </p>
                  <div className="space-y-2">
                    {effectiveness.modifiers.map((mod, i) => (
                      <div
                        key={i}
                        className="bg-surf2 border border-border rounded px-3 py-2"
                      >
                        <p className="text-xs font-mono text-cyan uppercase">
                          {mod.type} — {mod.label}
                        </p>
                        <p className="text-sm text-t-secondary mt-0.5">{mod.impact}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {effectiveness.recommended_response && (
                <div>
                  <p className="text-xs font-mono text-t-muted uppercase tracking-wider mb-2">
                    Recommended Response
                  </p>
                  <p className="text-sm text-t-primary leading-relaxed">
                    {effectiveness.recommended_response}
                  </p>
                </div>
              )}

              {effectiveness.weather_limited && (
                <p className="text-xs font-mono text-amber border border-amber/30 bg-amber/10 rounded px-3 py-2">
                  Weather-limited — fog, dust, or smoke degrades effectiveness
                </p>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
