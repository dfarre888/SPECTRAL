'use client'

import { AlertTriangle, Bomb, Crosshair, Radar, Shield, Target } from 'lucide-react'
import { buildEncounterAssessment } from '@/lib/map/encounter-assessment'
import { getWarheadsForPlatform } from '@/lib/risk/warhead-db'
import type {
  BlastRadii,
  BuildingProtection,
  PopulationDensityTier,
  RiskCategory,
  TimeOfDay,
} from '@/lib/risk/types'
import type { OverlapVolume, PlacedCuas, PlacedEffector, PlacedRadar, PlacedUas } from '@/lib/map/types'
import { cn } from '@/lib/utils'

interface EncounterAssessmentPanelProps {
  uas: PlacedUas
  placedCuas: PlacedCuas[]
  placedRadars: PlacedRadar[]
  placedEffectors: PlacedEffector[]
  overlaps: OverlapVolume[]
  populationTier?: PopulationDensityTier
  timeOfDay?: TimeOfDay
  buildingProtection?: BuildingProtection
  warheadOverride?: BlastRadii | null
  onPopulationTierChange?: (v: PopulationDensityTier) => void
  onTimeOfDayChange?: (v: TimeOfDay) => void
  onBuildingProtectionChange?: (v: BuildingProtection) => void
  onOpenBlastTool?: () => void
}

const mono = { fontFamily: "'JetBrains Mono', monospace" } as const

const RISK_STYLE: Record<RiskCategory, { bg: string; text: string }> = {
  GREEN: { bg: '#22C55E', text: '#052e16' },
  AMBER: { bg: '#EAB308', text: '#422006' },
  RED: { bg: '#EF4444', text: '#450a0a' },
  BLACK: { bg: '#7F1D1D', text: '#fecaca' },
}

function Section({
  title,
  icon: Icon,
  children,
  warn,
}: {
  title: string
  icon: typeof Shield
  children: React.ReactNode
  warn?: boolean
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <Icon className={cn('w-3 h-3 shrink-0', warn ? 'text-[var(--store-accent)]' : 'text-cyan')} />
        <p className="text-[9px] uppercase tracking-wide store-text-muted">{title}</p>
      </div>
      <div className="text-[10px] leading-snug text-zinc-200/90">{children}</div>
    </div>
  )
}

export function EncounterAssessmentPanel({
  uas,
  placedCuas,
  placedRadars,
  placedEffectors,
  overlaps,
  populationTier = 'urban',
  timeOfDay = 'business_day',
  buildingProtection = 'light',
  warheadOverride = null,
  onPopulationTierChange,
  onTimeOfDayChange,
  onBuildingProtectionChange,
  onOpenBlastTool,
}: EncounterAssessmentPanelProps) {
  const mission = uas.mission
  if (!mission) return null

  const assessment = buildEncounterAssessment({
    uas,
    mission,
    placedCuas,
    placedRadars,
    placedEffectors,
    overlaps,
    population_tier: populationTier,
    time_of_day: timeOfDay,
    building_protection: buildingProtection,
    warheadOverride,
  })

  const flagged = mission.pkThresholdExceeded || mission.pdThresholdExceeded
  const collateral = assessment.collateral
  const cde = collateral?.cde
  const platformWarheads = getWarheadsForPlatform(uas.asset.id)

  return (
    <div className="shrink-0 rounded-xl store-panel border border-[var(--store-line)] shadow-xl w-full overflow-hidden">
      <div className="px-3 py-2 border-b border-[var(--store-line)] bg-black/30">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Crosshair className="w-3.5 h-3.5 text-cyan shrink-0" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan">
              Encounter assessment
            </span>
          </div>
          <span className="text-[9px] font-mono store-text-muted">AeroCopilot · template</span>
        </div>
      </div>

      <div className="p-3 space-y-3 text-[11px]">
        <p className="font-mono text-[10px] store-text-muted">{assessment.summary}</p>

        <Section title="Encounter summary" icon={Crosshair} warn={flagged}>
          {assessment.encounterSummary}
        </Section>

        <Section title="Threats on route" icon={Target} warn={assessment.threatsOnRoute.length > 0}>
          {assessment.threatsOnRoute.length === 0 ? (
            'No counter-system envelope intersects the flight polyline.'
          ) : (
            <ul className="space-y-1 mt-1">
              {assessment.threatsOnRoute.slice(0, 4).map((t) => (
                <li key={t.instanceId} className="font-mono text-[9px] store-text-muted">
                  {t.name} · Pk {t.peakPk_pct}% · Pd {t.peakPd_pct}% · {t.exposureKm.toFixed(1)} km
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Detection exposure" icon={Radar} warn={mission.pdThresholdExceeded}>
          {assessment.detectionExposure}
        </Section>

        <Section title="Kill exposure" icon={Shield} warn={mission.pkThresholdExceeded}>
          {assessment.killExposure}
        </Section>

        <Section title="Reroute assessment" icon={AlertTriangle} warn={!mission.manualOverride && flagged}>
          {assessment.rerouteAssessment}
        </Section>

        {mission.goalKind === 'target' && (
          <div className="rounded-lg border border-[var(--store-accent-border)]/50 bg-black/25 p-2.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Bomb className="w-3.5 h-3.5 text-[var(--store-accent)] shrink-0" />
                <p className="text-[9px] uppercase tracking-wide text-[var(--store-accent)]">
                  Collateral damage estimate
                </p>
              </div>
              {onOpenBlastTool && (
                <button
                  type="button"
                  onClick={onOpenBlastTool}
                  className="text-[9px] font-mono text-cyan hover:text-white underline"
                >
                  Blast map
                </button>
              )}
            </div>

            {!collateral?.applicable || !cde ? (
              <p className="text-[10px] store-text-muted leading-snug">{collateral?.summary}</p>
            ) : (
              <>
                <p className="font-mono text-[10px] text-white">{collateral.warhead?.weapon_name}</p>
                <p className="text-[9px] store-text-muted font-mono">
                  Impact {collateral.impactLat.toFixed(4)}°N {collateral.impactLon.toFixed(4)}°E
                </p>
                <div
                  className="rounded-full px-3 py-1 text-center text-[10px] font-bold uppercase"
                  style={{
                    background: RISK_STYLE[cde.risk_category].bg,
                    color: RISK_STYLE[cde.risk_category].text,
                    ...mono,
                  }}
                >
                  {cde.risk_category}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="store-text-muted text-[9px]">Expected casualties</p>
                    <p className="text-xl text-white" style={mono}>{cde.expected_casualties}</p>
                  </div>
                  <div>
                    <p className="store-text-muted text-[9px]">Expected injured</p>
                    <p className="text-xl text-orange-300" style={mono}>{cde.expected_injured}</p>
                  </div>
                </div>
                <div className="rounded border border-[var(--store-line)] bg-black/30 px-2 py-1.5 space-y-0.5">
                  <p className="store-text-muted text-[9px]">Pop. in hazard disk</p>
                  <p className="text-sm text-white" style={mono}>{cde.population_in_hazard_disk}</p>
                  <p className="text-[9px] store-text-muted">
                    Density{' '}
                    <span className="text-white" style={mono}>
                      {cde.pop_density_pkm2.toLocaleString()}
                    </span>{' '}
                    persons/km²
                  </p>
                  <p className="text-[9px] store-text-muted">
                    Lethal zone occupants (est.):{' '}
                    <span className="text-white" style={mono}>{cde.civilians_in_lethal_zone}</span>
                  </p>
                </div>
                <table className="w-full text-[9px]">
                  <tbody>
                    {(
                      [
                        ['Lethal', cde.rings.lethal_m],
                        ['Injury', cde.rings.injury_m],
                        ['Structural', cde.rings.structural_m],
                        ['Hazard', cde.rings.hazard_m],
                      ] as const
                    ).map(([label, m]) => (
                      <tr key={label} className="border-t border-[var(--store-line)]">
                        <td className="py-0.5 store-text-muted">{label}</td>
                        <td className="py-0.5 text-right text-white" style={mono}>
                          {m} m
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {collateral.warhead && (
                  <p className="text-[9px] store-text-muted leading-snug">
                    {collateral.warhead.warhead_kg} kg NEW · TNT-eq {collateral.warhead.tnt_equivalent_kg} kg
                    {collateral.warhead.fragmentation_m
                      ? ` · frag radius ~${collateral.warhead.fragmentation_m} m`
                      : ''}
                  </p>
                )}
                <p className="text-[9px] store-text-muted leading-snug">{cde.proportionality_summary}</p>
                <p className="text-[10px] text-amber-200/90">{cde.authority_required}</p>
                <p className="text-[9px] store-text-muted">
                  Optimal time window (min ECCas):{' '}
                  <span className="text-white font-mono">{cde.recommended_time_window.replace(/_/g, ' ')}</span>
                </p>
              </>
            )}

            {(onPopulationTierChange || onTimeOfDayChange || onBuildingProtectionChange) && (
              <div className="space-y-2 pt-2 border-t border-[var(--store-line)]">
                {onPopulationTierChange && (
                  <label className="block text-[9px] store-text-muted">
                    Population density
                    <select
                      className="mt-0.5 w-full rounded bg-black/40 border border-[var(--store-line)] px-2 py-1 text-white text-[10px] font-mono"
                      value={populationTier}
                      onChange={(e) => onPopulationTierChange(e.target.value as PopulationDensityTier)}
                    >
                      {(['remote', 'rural', 'suburban', 'urban', 'dense_urban'] as const).map((v) => (
                        <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </label>
                )}
                {onTimeOfDayChange && (
                  <label className="block text-[9px] store-text-muted">
                    Time of day
                    <select
                      className="mt-0.5 w-full rounded bg-black/40 border border-[var(--store-line)] px-2 py-1 text-white text-[10px] font-mono"
                      value={timeOfDay}
                      onChange={(e) => onTimeOfDayChange(e.target.value as TimeOfDay)}
                    >
                      {(['early_hours', 'morning_peak', 'business_day', 'evening_peak', 'night'] as const).map((v) => (
                        <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </label>
                )}
                {onBuildingProtectionChange && (
                  <label className="block text-[9px] store-text-muted">
                    Building protection
                    <select
                      className="mt-0.5 w-full rounded bg-black/40 border border-[var(--store-line)] px-2 py-1 text-white text-[10px] font-mono"
                      value={buildingProtection}
                      onChange={(e) => onBuildingProtectionChange(e.target.value as BuildingProtection)}
                    >
                      {(['open', 'light', 'reinforced'] as const).map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            )}

            {platformWarheads.length > 1 && (
              <p className="text-[9px] store-text-muted">
                {platformWarheads.length} warhead options for this platform — use Blast tool to compare munitions.
              </p>
            )}
          </div>
        )}

        {assessment.tacticalRecommendations.length > 0 && (
          <div className="rounded-lg border border-[var(--store-line)] bg-black/20 px-2.5 py-2 space-y-1">
            <p className="text-[9px] uppercase tracking-wide text-[var(--store-accent)]">Tactical recommendations</p>
            <ul className="list-disc list-inside text-[10px] store-text-muted space-y-0.5">
              {assessment.tacticalRecommendations.map((rec) => (
                <li key={rec}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
