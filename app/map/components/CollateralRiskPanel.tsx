'use client'

import { useMemo, useState } from 'react'
import { Bomb, RadioTower } from 'lucide-react'

import type {
  BlastRadii,
  BuildingProtection,
  CdeResult,
  JammingRadii,
  PopulationDensityTier,
  RiskCategory,
  TimeOfDay,
} from '@/lib/risk'
import { assessEwCivilianImpact } from '@/lib/risk/cde-engine'
import { cn } from '@/lib/utils'
import { CardSection, Field, KV, MapCard, enumLabel, rangeClass, selectClass } from '@/app/map/components/MapUi'

interface CollateralRiskPanelProps {
  mode: 'blast' | 'jamming'
  blastResult?: CdeResult | null
  jammingRadii?: JammingRadii | null
  weaponName?: string
  jammerName?: string
  /** Munition picker (lives in the panel so long names are never clipped). */
  warheads?: readonly BlastRadii[]
  selectedWarheadId?: string | null
  onWarheadChange?: (weaponId: string) => void
  /** Jammer picker. */
  jammers?: readonly JammingRadii[]
  selectedJammerId?: string | null
  onJammerChange?: (jammerId: string) => void
  popTier: PopulationDensityTier
  timeOfDay: TimeOfDay
  buildingProtection: BuildingProtection
  onPopTierChange: (v: PopulationDensityTier) => void
  onTimeChange: (v: TimeOfDay) => void
  onProtectionChange: (v: BuildingProtection) => void
  ringShade?: number
  onRingShadeChange?: (v: number) => void
  onClose: () => void
  className?: string
}

/** Risk category as a tag: coloured text on a hairline, never a filled slab. */
const RISK_TAG: Record<RiskCategory, string> = {
  GREEN: 'green',
  AMBER: 'amber',
  RED: 'red',
  BLACK: 'red',
}

const POP_TIERS: PopulationDensityTier[] = ['remote', 'rural', 'suburban', 'urban', 'dense_urban']
const TIMES: TimeOfDay[] = ['early_hours', 'morning_peak', 'business_day', 'evening_peak', 'night']
const PROTECTION: BuildingProtection[] = ['open', 'light', 'reinforced']

export function RiskTag({ category }: { category: RiskCategory }) {
  return (
    <span className={cn('tag font-mono font-semibold', RISK_TAG[category], category === 'BLACK' && '!text-white')}>
      {category}
    </span>
  )
}

export function CollateralRiskPanel({
  mode,
  blastResult,
  jammingRadii,
  weaponName,
  jammerName,
  warheads,
  selectedWarheadId,
  onWarheadChange,
  jammers,
  selectedJammerId,
  onJammerChange,
  popTier,
  timeOfDay,
  buildingProtection,
  onPopTierChange,
  onTimeChange,
  onProtectionChange,
  ringShade = 55,
  onRingShadeChange,
  onClose,
  className,
}: CollateralRiskPanelProps) {
  const [propOpen, setPropOpen] = useState(false)
  const civilianEw = useMemo(() => {
    if (!jammingRadii) return [] as string[]
    return assessEwCivilianImpact(popTier, jammingRadii.max_radius_m / 1000)
  }, [jammingRadii, popTier])

  const isBlast = mode === 'blast'

  return (
    <MapCard
      className={className}
      title={isBlast ? 'Collateral damage estimate' : 'EW jamming footprint'}
      icon={isBlast ? <Bomb className="w-4 h-4" /> : <RadioTower className="w-4 h-4" />}
      onClose={onClose}
    >
      <div className="space-y-3">
        {isBlast && warheads && onWarheadChange ? (
          <Field label="Munition">
            <select
              className={selectClass}
              value={selectedWarheadId ?? ''}
              onChange={(e) => onWarheadChange(e.target.value)}
              title={weaponName}
            >
              {warheads.map((w) => (
                <option key={w.weapon_id} value={w.weapon_id}>
                  {w.weapon_name}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
        {!isBlast && jammers && onJammerChange ? (
          <Field label="Jammer">
            <select
              className={selectClass}
              value={selectedJammerId ?? ''}
              onChange={(e) => onJammerChange(e.target.value)}
              title={jammerName}
            >
              {jammers.map((j) => (
                <option key={j.jammer_id} value={j.jammer_id}>
                  {j.jammer_name}
                </option>
              ))}
            </select>
          </Field>
        ) : null}

        {isBlast && !warheads ? (
          <p className="font-mono text-[12px] text-[var(--store-ink)]">{weaponName ?? 'No munition'}</p>
        ) : null}

        {isBlast && !blastResult ? (
          <p className="text-[12px] store-text-muted leading-relaxed">Click the globe to set the impact point.</p>
        ) : null}

        {isBlast && blastResult ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[12px] store-text-body">Risk category</span>
              <RiskTag category={blastResult.risk_category} />
            </div>

            <div className="grid grid-cols-2 gap-3 py-1">
              <div>
                <p className="text-[12px] store-text-muted">Expected casualties</p>
                <p className="font-mono text-[24px] leading-none mt-1.5 text-[var(--store-ink)] tabular-nums">
                  {blastResult.expected_casualties}
                </p>
              </div>
              <div>
                <p className="text-[12px] store-text-muted">Expected injured</p>
                <p className="font-mono text-[24px] leading-none mt-1.5 text-[#FBBF24] tabular-nums">
                  {blastResult.expected_injured}
                </p>
              </div>
            </div>

            <dl>
              <KV
                label="Impact"
                value={`${blastResult.input.impact_lat.toFixed(4)}°, ${blastResult.input.impact_lon.toFixed(4)}°`}
              />
              <KV label="Population in hazard disk" value={blastResult.population_in_hazard_disk} />
              <KV label="Density" value={`${blastResult.pop_density_pkm2.toLocaleString()} /km²`} />
            </dl>
            <p className="text-[12px] store-text-muted leading-relaxed">
              {blastResult.input.population_tier === 'urban' || blastResult.input.population_tier === 'dense_urban'
                ? 'Built-up model: indoor occupancy (not outdoor-only 0.35).'
                : 'Open-area model: outdoor exposure fraction applied.'}
            </p>

            <CardSection title="Effect rings">
              <dl>
                <KV label="Lethal" value={`${blastResult.rings.lethal_m} m`} />
                <KV label="Injury" value={`${blastResult.rings.injury_m} m`} />
                <KV label="Structural" value={`${blastResult.rings.structural_m} m`} />
                <KV label="Hazard" value={`${blastResult.rings.hazard_m} m`} />
              </dl>
            </CardSection>

            {blastResult.infrastructure_flags.length > 0 && (
              <ul className="text-[12px] text-[var(--wb-red)] space-y-1 list-disc pl-4 leading-snug">
                {blastResult.infrastructure_flags.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            )}
            <p
              className="text-[12px] leading-snug"
              style={{ color: blastResult.risk_category === 'GREEN' ? '#FBBF24' : 'var(--wb-red)' }}
            >
              {blastResult.authority_required}
            </p>
            <button
              type="button"
              className="fc-action"
              aria-expanded={propOpen}
              onClick={() => setPropOpen((v) => !v)}
            >
              {propOpen ? 'Hide' : 'Show'} proportionality summary
            </button>
            {propOpen && (
              <p className="text-[12px] store-text-muted leading-relaxed">{blastResult.proportionality_summary}</p>
            )}
          </>
        ) : null}

        {!isBlast && jammingRadii ? (
          <>
            {!jammers ? (
              <p className="font-mono text-[12px] text-[var(--store-ink)]">{jammerName ?? jammingRadii.jammer_name}</p>
            ) : null}
            <CardSection title="Effect radius">
              <dl>
                <KV label="GPS L1" value={`${jammingRadii.gps_l1_radius_m} m`} />
                <KV label="RC link" value={`${jammingRadii.rc_link_radius_m} m`} />
                <KV label="Max" value={`${jammingRadii.max_radius_m} m`} />
                <KV label="ERP" value={`${jammingRadii.erp_watts} W`} />
              </dl>
            </CardSection>
            {jammingRadii.bands.length > 0 && (
              <CardSection title="Bands">
                <div className="flex flex-wrap gap-1.5">
                  {jammingRadii.bands.map((b) => (
                    <span key={b.label} className="tag font-mono !text-[#67E8F9] !border-[rgba(6,182,212,0.4)]">
                      {b.label}
                    </span>
                  ))}
                </div>
              </CardSection>
            )}
            {civilianEw.length > 0 && (
              <CardSection title="Civilian impact">
                <ul className="text-[12px] text-[#FCD34D] list-disc pl-4 space-y-1 leading-snug">
                  {civilianEw.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </CardSection>
            )}
          </>
        ) : null}

        {isBlast && (
          <CardSection title="Assumptions" className="border-t border-[var(--store-line)] pt-3 [&>*+*]:mt-2.5">
            <Field label="Population density">
              <select
                className={selectClass}
                value={popTier}
                onChange={(e) => onPopTierChange(e.target.value as PopulationDensityTier)}
              >
                {POP_TIERS.map((v) => (
                  <option key={v} value={v}>
                    {enumLabel(v)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Time of day">
              <select
                className={selectClass}
                value={timeOfDay}
                onChange={(e) => onTimeChange(e.target.value as TimeOfDay)}
              >
                {TIMES.map((v) => (
                  <option key={v} value={v}>
                    {enumLabel(v)}
                  </option>
                ))}
              </select>
            </Field>
            <div>
              <span className="block text-[12px] store-text-body mb-1">Building protection</span>
              <div className="seg sm w-full" role="group" aria-label="Building protection">
                {PROTECTION.map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={buildingProtection === v}
                    onClick={() => onProtectionChange(v)}
                    className="flex-1 justify-center"
                  >
                    {enumLabel(v)}
                  </button>
                ))}
              </div>
            </div>
          </CardSection>
        )}

        <div className="border-t border-[var(--store-line)] pt-3">
          <Field label="Ring shading" hint={`${ringShade}%`}>
            <input
              type="range"
              min={5}
              max={100}
              step={5}
              value={ringShade}
              onChange={(e) => onRingShadeChange?.(Number(e.target.value))}
              className={rangeClass}
              aria-label="Ring shading opacity"
            />
          </Field>
        </div>
      </div>
    </MapCard>
  )
}
