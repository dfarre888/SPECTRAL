'use client'

/**
 * Callers: ForceCatalogClient (battle tab)
 * Purpose: Commander effects board — presets, assessment, drill to Compare
 * Spec: PROMPT-BATTLE-PICTURE.md
 */

import { useMemo } from 'react'
import type { ForceCatalogPlatformFull } from '@/lib/bmi/bmi-types'
import { StorePanel } from '@/components/ui/store-surface'
import { StatChip } from '@/components/force-catalog/force-catalog-ui'
import {
  SCENARIO_PRESETS,
  buildBattlePictureView,
  type AssessmentBand,
  type EffectId,
  type ScenarioPresetId,
} from '@/lib/force-catalog/battle-picture-model'

function bandClass(band: AssessmentBand): string {
  switch (band) {
    case 'OVERMATCH':
      return 'store-accent'
    case 'UNDERDOG':
      return 'text-red-400'
    case 'CONTESTED':
      return 'text-amber-400'
    default:
      return 'store-text-muted'
  }
}

export function ForceCatalogBattlePicture({
  platforms,
  activePreset,
  customFiltersActive,
  onApplyPreset,
  onClearPreset,
  onDrillEffect,
  onPopout,
}: {
  platforms: ForceCatalogPlatformFull[]
  activePreset: ScenarioPresetId | null
  customFiltersActive: boolean
  onApplyPreset: (id: ScenarioPresetId) => void
  onClearPreset: () => void
  onDrillEffect: (effectId: EffectId, platformIds: string[]) => void
  onPopout?: () => void
}) {
  const view = useMemo(
    () => buildBattlePictureView(platforms, activePreset),
    [platforms, activePreset],
  )

  return (
    <div className="space-y-4" data-testid="force-catalog-battle">
      <div
        className="flex flex-wrap gap-2 items-center"
        role="group"
        aria-labelledby="pcm-scenario-label"
      >
        <span
          id="pcm-scenario-label"
          className="text-[10px] font-mono store-text-muted uppercase tracking-wider"
        >
          Scenario
        </span>
        {SCENARIO_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={activePreset === p.id}
            onClick={() => onApplyPreset(p.id)}
            className={`text-[10px] font-mono px-3 py-2 min-h-10 rounded border transition-[color,background-color,border-color] duration-150 ease-out ${
              activePreset === p.id
                ? 'store-accent-border store-accent bg-[var(--store-accent-glow)]'
                : 'store-line store-text-muted hover:store-text-body'
            }`}
          >
            {p.label}
          </button>
        ))}
        {activePreset ? (
          <button
            type="button"
            onClick={onClearPreset}
            className="text-[10px] font-mono px-3 py-2 min-h-10 rounded border store-line store-text-muted"
          >
            Clear preset
          </button>
        ) : null}
        {customFiltersActive ? (
          <span className="text-[9px] font-mono store-text-muted">Custom filters active</span>
        ) : null}
        {onPopout ? (
          <button
            type="button"
            onClick={onPopout}
            className="ml-auto text-[10px] font-mono px-3 py-2 min-h-10 rounded border store-accent-border store-accent"
          >
            Pop out
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <StatChip label="blue" value={view.blueCount} accent />
        <StatChip label="red" value={view.redCount} />
        <StatChip label="neutral" value={view.neutralCount} />
        <StatChip label="in scope" value={platforms.length} accent />
      </div>

      <StorePanel className="p-4 space-y-3 overflow-x-auto">
        <h2 className="text-xs store-display store-text-body tracking-wide text-balance">
          Effects balance — Blue vs Red
        </h2>
        <table className="w-full text-[11px] font-mono tabular-nums">
          <thead>
            <tr className="store-text-muted text-left">
              <th className="py-2 pr-3 font-normal">Effect</th>
              <th className="py-2 pr-3 font-normal">Blue</th>
              <th className="py-2 pr-3 font-normal">Red</th>
              <th className="py-2 pr-3 font-normal">Assessment</th>
              <th className="py-2 font-normal">Drill</th>
            </tr>
          </thead>
          <tbody>
            {view.effects.map((row) => {
              const ids = [...row.blueIds, ...row.redIds]
              return (
                <tr key={row.effect.id} className="border-t store-line">
                  <td className="py-2 pr-3 store-text-body text-pretty">{row.effect.label}</td>
                  <td className="py-2 pr-3 text-[var(--store-accent)]">{row.blueCount}</td>
                  <td className="py-2 pr-3 store-text-body">{row.redCount}</td>
                  <td className="py-2 pr-3">
                    <span className={bandClass(row.band)}>{row.band}</span>
                    {row.thinOsint ? (
                      <span className="block text-[9px] store-text-muted">assessed / thin OSINT</span>
                    ) : null}
                  </td>
                  <td className="py-2">
                    <button
                      type="button"
                      disabled={!ids.length}
                      onClick={() => onDrillEffect(row.effect.id, ids)}
                      className="text-[9px] font-mono px-2 py-1 min-h-10 rounded border store-accent-border store-accent disabled:opacity-40"
                      aria-label={`Drill Compare for ${row.effect.label}`}
                    >
                      Compare
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </StorePanel>

      <StorePanel className="p-4 space-y-3">
        <h2 className="text-xs store-display store-text-body tracking-wide">Domain strip</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {view.domains.map((d) => (
            <div key={d.domain} className="rounded border store-line p-3 space-y-1">
              <p className="text-[9px] font-mono store-text-muted uppercase">{d.domain}</p>
              <p className="text-[11px] font-mono tabular-nums">
                <span className="store-accent">B {d.blue}</span>
                <span className="store-text-muted"> · </span>
                <span className="store-text-body">R {d.red}</span>
              </p>
            </div>
          ))}
        </div>
      </StorePanel>

      <StorePanel className="p-4 space-y-2">
        <h2 className="text-xs store-display store-text-body tracking-wide">Commander assess</h2>
        <p className="text-[11px] font-mono store-text-body text-pretty leading-relaxed whitespace-pre-wrap">
          {view.assessText}
        </p>
      </StorePanel>
    </div>
  )
}

