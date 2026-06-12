'use client'

import Link from 'next/link'
import { ConfidenceBadge } from '@/components/platforms/ConfidenceBadge'
import { PlatformThumbnail } from '@/components/platforms/PlatformThumbnail'
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
        'flex justify-between items-center py-2 px-3 rounded-xl store-panel-inner',
        highlight && 'border-[var(--store-accent-border)] bg-[var(--store-accent-glow)]'
      )}
    >
      <span className="text-sm store-text-body">{label}</span>
      <span className="font-mono text-sm text-white">
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
          <SheetDescription asChild>
            <div className="flex items-center gap-3 pt-1">
              <PlatformThumbnail id={platform.id} name={platform.name} size="sm" />
              <span className="store-text-muted">×</span>
              <PlatformThumbnail id={system.id} name={system.name} size="sm" variant="cuas" />
              <span className="text-sm store-text-body">
                {platform.name} × {system.name}
              </span>
            </div>
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-4">
          {!effectiveness ? (
            <div className="store-panel-inner rounded-xl p-4">
              <p className="text-sm store-text-body">
                No adjudication data — effectiveness not assessed for this pairing.
              </p>
              <Link
                href={`/platforms/${platform.id}`}
                className="text-[var(--store-accent)] text-sm hover:underline mt-2 inline-block"
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
                <p className="text-xs store-text-muted uppercase tracking-wider font-semibold">
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
                  <p className="text-xs store-text-muted uppercase tracking-wider font-semibold mb-2">
                    Rationale
                  </p>
                  <p className="text-sm store-text-body leading-relaxed">
                    {effectiveness.adjudication_rationale ?? effectiveness.special_notes}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <p className="text-xs store-text-muted uppercase tracking-wider font-semibold">
                  Confidence
                </p>
                <ConfidenceBadge confidence={effectiveness.data_confidence} />
              </div>

              {effectiveness.modifiers && effectiveness.modifiers.length > 0 && (
                <div>
                  <p className="text-xs store-text-muted uppercase tracking-wider font-semibold mb-2">
                    Modifiers
                  </p>
                  <div className="space-y-2">
                    {effectiveness.modifiers.map((mod, i) => (
                      <div
                        key={i}
                        className="store-panel-inner rounded-xl px-3 py-2"
                      >
                        <p className="text-xs font-mono text-[var(--store-accent)] uppercase">
                          {mod.type} — {mod.label}
                        </p>
                        <p className="text-sm store-text-body mt-0.5">{mod.impact}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {effectiveness.recommended_response && (
                <div>
                  <p className="text-xs store-text-muted uppercase tracking-wider font-semibold mb-2">
                    Recommended Response
                  </p>
                  <p className="text-sm text-white leading-relaxed">
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
