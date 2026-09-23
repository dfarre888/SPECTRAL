'use client'

/**
 * Callers: ForceCatalogClient (battle tab)
 * Purpose: Commander effects board — overmatch by capability class as a
 * diverging chart, domain balance, commander's assessment with the three
 * facts that matter. Rows drill into the workbench.
 */

import { useMemo } from 'react'
import type { ForceCatalogPlatformFull } from '@/lib/bmi/bmi-types'
import type { ForceInstruments } from '@/lib/force-catalog/force-instruments'
import {
  SCENARIO_PRESETS,
  buildBattlePictureView,
  type AssessmentBand,
  type EffectId,
  type ScenarioPresetId,
} from '@/lib/force-catalog/battle-picture-model'

function tagClass(band: AssessmentBand): string {
  if (band === 'OVERMATCH') return 'tag blue'
  if (band === 'UNDERDOG') return 'tag red'
  if (band === 'CONTESTED') return 'tag amber'
  return 'tag'
}

function bandLabel(band: AssessmentBand): string {
  const t = band.toLowerCase()
  return t.charAt(0).toUpperCase() + t.slice(1)
}

function splitLabel(label: string): [string, string | null] {
  const i = label.indexOf(' / ')
  return i < 0 ? [label, null] : [label.slice(0, i), label.slice(i + 3)]
}

export function ForceCatalogBattlePicture({
  platforms,
  instruments,
  activePreset,
  customFiltersActive,
  onApplyPreset,
  onClearPreset,
  onDrillEffect,
}: {
  platforms: ForceCatalogPlatformFull[]
  instruments: ForceInstruments
  activePreset: ScenarioPresetId | null
  customFiltersActive: boolean
  onApplyPreset: (id: ScenarioPresetId) => void
  onClearPreset: () => void
  onDrillEffect: (effectId: EffectId, platformIds: string[]) => void
  onPopout?: () => void
}) {
  const view = useMemo(() => buildBattlePictureView(platforms, activePreset), [platforms, activePreset])
  const max = Math.max(1, ...view.effects.flatMap((r) => [r.blueCount, r.redCount]))
  const gaps = platforms.filter((p) => p.sensors.length === 0).length
  const thin = view.effects.filter((r) => r.thinOsint).length

  return (
    <div data-testid="force-catalog-battle">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pb-4 border-b fc-hair">
        <span className="text-[13px] store-text-muted">Scenario</span>
        <div className="seg sm" role="group" aria-label="Scenario">
          {SCENARIO_PRESETS.map((p) => (
            <button key={p.id} type="button" aria-pressed={activePreset === p.id} onClick={() => onApplyPreset(p.id)}>{p.label}</button>
          ))}
        </div>
        {activePreset ? <button type="button" onClick={onClearPreset} className="fc-action">Clear scenario</button> : null}
        {customFiltersActive ? <span className="tag ml-auto">Custom filters active</span> : null}
      </div>

      <section className="pt-7 pb-2">
        <div className="flex items-baseline gap-4 mb-4">
          <h2 className="text-[18px] store-display text-[var(--store-ink)] font-semibold tracking-[-0.01em] m-0">Overmatch by capability class</h2>
          <span className="text-[12px] store-text-muted">Red left, Blue right · click a row to open it in the workbench</span>
        </div>
        <div className="grid grid-cols-[minmax(180px,260px)_1fr_1fr_118px] items-center gap-x-4">
          {view.effects.map((row) => {
            const [main, sub] = splitLabel(row.effect.label)
            const ids = [...row.blueIds, ...row.redIds]
            const rw = `${(row.redCount / max) * 100}%`
            const bw = `${(row.blueCount / max) * 100}%`
            return (
              <button key={row.effect.id} type="button" disabled={!ids.length} onClick={() => onDrillEffect(row.effect.id, ids)} className="fc-row fc-rowbtn text-left" aria-label={`Open ${row.effect.label} in the workbench`}>
                <span className="min-w-0">
                  <span className="block text-[13px] text-[var(--store-ink)] truncate">{main}</span>
                  {sub || row.thinOsint ? <span className="block text-[11px] store-text-muted truncate">{[sub, row.thinOsint ? 'assessed · thin OSINT' : null].filter(Boolean).join(' · ')}</span> : null}
                </span>
                <span className="fc-bar red relative"><i style={{ width: rw }} /><b className="absolute -top-[7px] text-[12px] font-mono text-[var(--wb-red)]" style={{ right: `min(calc(${rw} + 8px), calc(100% - 22px))` }}>{row.redCount}</b></span>
                <span className="fc-bar blue relative"><i style={{ width: bw }} /><b className="absolute -top-[7px] text-[12px] font-mono text-[var(--wb-blue)]" style={{ left: `min(calc(${bw} + 8px), calc(100% - 22px))` }}>{row.blueCount}</b></span>
                <span className="justify-self-end"><span className={tagClass(row.band)}>{bandLabel(row.band)}</span></span>
              </button>
            )
          })}
          <span />
          <span className="col-span-2 flex justify-between text-[12px] font-mono store-text-muted pt-1.5"><span>Red {max}</span><span className="store-text-body">0</span><span>Blue {max}</span></span>
          <span />
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-7 py-6 border-t border-b fc-hair mt-6">
        {view.domains.map((d) => {
          const tot = Math.max(1, d.blue + d.red)
          return (
            <div key={d.domain}>
              <div className="text-[12px] store-text-muted capitalize">{d.domain === 'em' ? 'EM' : d.domain}</div>
              <div className="text-[22px] store-display font-semibold tracking-[-0.01em] my-1.5 tabular-nums"><span className="text-[var(--wb-blue)]">{d.blue}</span><span className="store-text-muted"> · </span><span className="text-[var(--wb-red)]">{d.red}</span></div>
              <div className="fc-stack"><i style={{ width: `${(d.blue / tot) * 100}%`, background: 'var(--wb-blue)' }} /><i style={{ width: `${(d.red / tot) * 100}%`, background: 'var(--wb-red)' }} /></div>
            </div>
          )
        })}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-10 py-7">
        <div>
          <h2 className="text-[18px] store-display text-[var(--store-ink)] font-semibold tracking-[-0.01em] m-0 mb-3">Commander&rsquo;s assessment</h2>
          <p className="text-[15px] leading-[1.55] text-[var(--store-ink)] max-w-[62ch] whitespace-pre-wrap text-pretty m-0">{view.assessText}</p>
          <p className="text-[13px] store-text-body max-w-[62ch] text-pretty mt-3">
            Track reach is {instruments.track.reachPct}% of Blue on one picture and {instruments.denied.reachPct}% once GNSS time is lost.
            {instruments.spof ? ` Benching ${instruments.spof.short_name} alone costs ${instruments.spof.reachDropPct} points.` : ''} Open the workbench to test removals against these numbers.
          </p>
        </div>
        <div className="lg:border-l fc-hair lg:pl-7">
          <div className="text-[12px] store-text-muted">Biggest single point of failure</div>
          <div className="text-[13px] text-[var(--store-ink)] mt-0.5 mb-3.5">{instruments.spof ? `${instruments.spof.short_name} · ${instruments.spof.strandedCount} units stranded without it` : 'No single gateway carries the picture'}</div>
          <div className="text-[12px] store-text-muted">Nets that split on variant</div>
          <div className="text-[13px] text-[var(--store-ink)] mt-0.5 mb-3.5">{instruments.variantSplits.length ? instruments.variantSplits.map((v) => `${v.standard} · ${v.islands} islands`).join(', ') : 'None recorded (variants unknown are assumed compatible)'}</div>
          <div className="text-[12px] store-text-muted">Data gaps that distort this</div>
          <div className="text-[13px] text-[var(--store-ink)] mt-0.5 mb-3.5">{gaps} platforms without sensor fit · {thin} classes on thin OSINT</div>
          <div className="text-[12px] store-text-muted">Basis</div>
          <div className="text-[12px] store-text-muted mt-0.5">Open-source OrBat · manufacturer pages · interop engine, not a forecast</div>
        </div>
      </section>
    </div>
  )
}
