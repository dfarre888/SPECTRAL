'use client'

import { useMemo, useState } from 'react'

import type {
  BuildingProtection,
  CdeResult,
  JammingRadii,
  PopulationDensityTier,
  RiskCategory,
  TimeOfDay,
} from '@/lib/risk'
import { assessEwCivilianImpact } from '@/lib/risk/cde-engine'

interface CollateralRiskPanelProps {
  mode: 'blast' | 'jamming'
  blastResult?: CdeResult | null
  jammingRadii?: JammingRadii | null
  weaponName?: string
  jammerName?: string
  popTier: PopulationDensityTier
  timeOfDay: TimeOfDay
  buildingProtection: BuildingProtection
  onPopTierChange: (v: PopulationDensityTier) => void
  onTimeChange: (v: TimeOfDay) => void
  onProtectionChange: (v: BuildingProtection) => void
  ringShade?: number
  onRingShadeChange?: (v: number) => void
  onClose: () => void
}

const mono = { fontFamily: "'JetBrains Mono', monospace" } as const

const RISK_STYLE: Record<RiskCategory, { bg: string; text: string }> = {
  GREEN: { bg: '#22C55E', text: '#052e16' },
  AMBER: { bg: '#EAB308', text: '#422006' },
  RED: { bg: '#EF4444', text: '#450a0a' },
  BLACK: { bg: '#7F1D1D', text: '#fecaca' },
}


export function CollateralRiskPanel({
  mode,
  blastResult,
  jammingRadii,
  weaponName,
  jammerName,
  popTier,
  timeOfDay,
  buildingProtection,
  onPopTierChange,
  onTimeChange,
  onProtectionChange,
  ringShade = 55,
  onRingShadeChange,
  onClose,
}: CollateralRiskPanelProps) {
  const [propOpen, setPropOpen] = useState(false)
  const civilianEw = useMemo(() => {
    if (!jammingRadii) return [] as string[]
    return assessEwCivilianImpact(popTier, jammingRadii.max_radius_m / 1000)
  }, [jammingRadii, popTier])

  return (
    <div
      className="absolute top-14 right-3 z-30 w-80 max-h-[calc(100%-4rem)] overflow-y-auto rounded-xl border shadow-xl pointer-events-auto"
      style={{ background: '#0A0A0F', borderColor: 'var(--store-line)' }}
    >
      <div className="p-3 space-y-3 text-[11px] store-text-body">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: mode === 'blast' ? '#F97316' : '#06B6D4' }}>
            {mode === 'blast' ? 'Collateral damage estimate' : 'EW jamming footprint'}
          </p>
          <button type="button" onClick={onClose} className="store-text-muted hover:text-white text-xs" aria-label="Close">✕</button>
        </div>

        {mode === 'blast' && (
          <>
            <p className="text-xs" style={mono}>{weaponName ?? '—'}</p>
            {blastResult && (
              <>
                <p className="text-[9px] store-text-muted font-mono">
                  Impact {blastResult.input.impact_lat.toFixed(4)}°N {blastResult.input.impact_lon.toFixed(4)}°E
                </p>
                <div className="rounded-full px-3 py-1.5 text-center text-xs font-bold uppercase" style={{ background: RISK_STYLE[blastResult.risk_category].bg, color: RISK_STYLE[blastResult.risk_category].text, ...mono }}>
                  {blastResult.risk_category}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="store-text-muted text-[10px]">Expected casualties</p>
                    <p className="text-2xl text-white" style={mono}>{blastResult.expected_casualties}</p>
                  </div>
                  <div>
                    <p className="store-text-muted text-[10px]">Expected injured</p>
                    <p className="text-2xl text-orange-300" style={mono}>{blastResult.expected_injured}</p>
                  </div>
                </div>
                <div className="rounded border border-[var(--store-line)] store-panel-inner px-2 py-1.5 space-y-0.5">
                  <p className="store-text-muted text-[10px]">Pop. in hazard disk</p>
                  <p className="text-sm text-white" style={mono}>{blastResult.population_in_hazard_disk}</p>
                  <p className="text-[9px] store-text-muted">
                    Density <span className="text-white" style={mono}>{blastResult.pop_density_pkm2.toLocaleString()}</span> persons/km²
                  </p>
                  <p className="text-[9px] store-text-muted leading-relaxed">
                    {blastResult.input.population_tier === 'urban' || blastResult.input.population_tier === 'dense_urban'
                      ? 'Built-up model: indoor occupancy (not outdoor-only 0.35).'
                      : 'Open-area model: outdoor exposure fraction applied.'}
                  </p>
                </div>
                <table className="w-full text-[10px]">
                  <tbody>
                    {([['Lethal', blastResult.rings.lethal_m], ['Injury', blastResult.rings.injury_m], ['Structural', blastResult.rings.structural_m], ['Hazard', blastResult.rings.hazard_m]] as const).map(([label, m]) => (
                      <tr key={label} className="border-t border-[var(--store-line)]">
                        <td className="py-1 store-text-muted">{label}</td>
                        <td className="py-1 text-right text-white" style={mono}>{m} m</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {blastResult.infrastructure_flags.length > 0 && (
                  <ul className="text-[10px] text-red-400 space-y-1 list-disc pl-4">
                    {blastResult.infrastructure_flags.map((f) => (<li key={f}>{f}</li>))}
                  </ul>
                )}
                <p className="text-[10px]" style={{ color: blastResult.risk_category === 'GREEN' ? '#EAB308' : '#EF4444' }}>{blastResult.authority_required}</p>
                <button type="button" className="text-[10px] store-text-muted underline" onClick={() => setPropOpen((v) => !v)}>
                  {propOpen ? 'Hide' : 'Show'} proportionality summary
                </button>
                {propOpen && <p className="text-[9px] store-text-muted leading-relaxed">{blastResult.proportionality_summary}</p>}
              </>
            )}
          </>
        )}

        {mode === 'jamming' && jammingRadii && (
          <>
            <p className="text-xs" style={mono}>{jammerName ?? jammingRadii.jammer_name}</p>
            <table className="w-full text-[10px]">
              <tbody>
                {([['GPS L1', jammingRadii.gps_l1_radius_m], ['RC link', jammingRadii.rc_link_radius_m], ['Max', jammingRadii.max_radius_m]] as const).map(([label, m]) => (
                  <tr key={label} className="border-t border-[var(--store-line)]">
                    <td className="py-1 store-text-muted">{label}</td>
                    <td className="py-1 text-right text-white" style={mono}>{m} m</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="text-[10px] space-y-0.5" style={mono}>
              {jammingRadii.bands.map((b) => (<li key={b.label} className="text-cyan-300/90">{b.label}</li>))}
            </ul>
            <ul className="text-[10px] text-orange-300/90 list-disc pl-4 space-y-0.5">
              {civilianEw.map((s) => (<li key={s}>{s}</li>))}
            </ul>
            <p className="text-[10px] store-text-muted">ERP <span className="text-white" style={mono}>{jammingRadii.erp_watts} W</span></p>
          </>
        )}

        {mode === 'blast' && (
          <div className="space-y-2 pt-2 border-t border-[var(--store-line)]">
            <label className="block text-[10px] store-text-muted">Population density
              <select className="mt-0.5 w-full rounded bg-black/40 border border-[var(--store-line)] px-2 py-1 text-white" style={mono} value={popTier} onChange={(e) => onPopTierChange(e.target.value as PopulationDensityTier)}>
                {['remote','rural','suburban','urban','dense_urban'].map((v) => (<option key={v} value={v}>{v}</option>))}
              </select>
            </label>
            <label className="block text-[10px] store-text-muted">Time of day
              <select className="mt-0.5 w-full rounded bg-black/40 border border-[var(--store-line)] px-2 py-1 text-white" style={mono} value={timeOfDay} onChange={(e) => onTimeChange(e.target.value as TimeOfDay)}>
                {['early_hours','morning_peak','business_day','evening_peak','night'].map((v) => (<option key={v} value={v}>{v}</option>))}
              </select>
            </label>
            <label className="block text-[10px] store-text-muted">Building protection
              <select className="mt-0.5 w-full rounded bg-black/40 border border-[var(--store-line)] px-2 py-1 text-white" style={mono} value={buildingProtection} onChange={(e) => onProtectionChange(e.target.value as BuildingProtection)}>
                {['open','light','reinforced'].map((v) => (<option key={v} value={v}>{v}</option>))}
              </select>
            </label>
          </div>
        )}
        <div className="space-y-1.5 pt-2 border-t border-[var(--store-line)]">
          <div className="flex items-center justify-between text-[10px] store-text-muted">
            <span>Ring shading</span>
            <span className="text-white" style={mono}>{ringShade}%</span>
          </div>
          <input
            type="range"
            min={5}
            max={100}
            step={5}
            value={ringShade}
            onChange={(e) => onRingShadeChange?.(Number(e.target.value))}
            className="w-full accent-orange-500"
            aria-label="Ring shading opacity"
          />
        </div>
      </div>
    </div>
  )
}

