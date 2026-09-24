'use client'

import { useMemo, useState } from 'react'
import { RadioTower } from 'lucide-react'
import {
  formatHPlus,
  type FratricideConflict,
  type FratricideOptions,
  type FratricideReport,
  type Mitigation,
  type MitigationPatch,
} from '@/lib/ew/fratricide'
import { CardSection, Field, MapCard, rangeClass } from '@/app/map/components/MapUi'
import { cn } from '@/lib/utils'

type View = 'fratricide' | 'enemy' | 'all'

const SEV_TAG: Record<FratricideConflict['severity'], { cls: string; word: string }> = {
  high: { cls: 'red', word: 'Lost' },
  medium: { cls: 'amber', word: 'Degraded' },
  low: { cls: 'amber', word: 'Marginal' },
}

const MITIGATION_WORD: Record<Mitigation['kind'], string> = {
  band_shift: 'Band',
  jammer_window: 'Time',
  jammer_arc: 'Arc',
  fibre: 'Fibre',
  move_relay: 'Relay',
}

function fmtBand(lo: number, hi: number): string {
  const f = (m: number) => (m >= 1000 ? `${+(m / 1000).toFixed(2)} GHz` : `${Math.round(m)} MHz`)
  return Math.abs(hi - lo) < 0.5 ? f(lo) : `${f(lo)} to ${f(hi)}`
}

function windowText(c: FratricideConflict): string {
  if (c.persistent) return `from ${formatHPlus(c.t_start_min)}, on station`
  const a = Math.round(c.t_start_min)
  const b = Math.round(c.t_end_min)
  return a === b ? formatHPlus(a) : `${formatHPlus(a)} to ${formatHPlus(b).replace('H+', '')}`
}

export interface FratricidePanelProps {
  report: FratricideReport
  options: FratricideOptions
  onOptionsChange: (patch: Partial<FratricideOptions>) => void
  selectedId: string | null
  onSelect: (conflict: FratricideConflict | null) => void
  onApply: (patch: MitigationPatch, label: string) => void
  hasEdits: boolean
  onClearEdits: () => void
  view: View
  onViewChange: (v: View) => void
  onClose: () => void
  className?: string
}

export function FratricidePanel({
  report,
  options,
  onOptionsChange,
  selectedId,
  onSelect,
  onApply,
  hasEdits,
  onClearEdits,
  view,
  onViewChange,
  onClose,
  className,
}: FratricidePanelProps) {
  const [showAssumptions, setShowAssumptions] = useState(false)
  const visible = useMemo(
    () =>
      report.conflicts.filter((c) =>
        view === 'all' ? true : view === 'fratricide' ? c.kind === 'fratricide' : c.kind === 'enemy_ew',
      ),
    [report.conflicts, view],
  )

  const noOwnDrones = report.dronesChecked === 0
  const noJammers = report.jammersChecked === 0

  return (
    <MapCard
      className={className}
      title="Spectrum fratricide"
      icon={<RadioTower className="w-4 h-4" />}
      onClose={onClose}
      closeLabel="Close fratricide check"
      meta={
        report.counts.fratricide > 0 ? (
          <span className="tag red font-mono">{report.counts.fratricide} own</span>
        ) : !noOwnDrones && !noJammers ? (
          <span className="tag green">Clear</span>
        ) : null
      }
      footer={
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11.5px] leading-snug store-text-muted">
            Free space, line of sight. A planning screen, not an accredited EW model.
          </p>
          {hasEdits ? (
            <button type="button" className="btn-e xs shrink-0" onClick={onClearEdits}>
              Clear edits
            </button>
          ) : null}
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-[12.5px] leading-relaxed store-text-body">
          Tests every own drone link (control, video, relay) against every jammer on the laydown, along each route
          and in time.
        </p>

        <dl className="grid grid-cols-3 gap-2">
          {[
            { k: 'Own drones', v: report.dronesChecked },
            { k: 'Jammers', v: report.jammersChecked },
            { k: 'Drones hit', v: report.counts.dronesAffected, tone: report.counts.dronesAffected > 0 ? 'text-[#FF8A98]' : '' },
          ].map((m) => (
            <div key={m.k} className="rounded-[10px] store-panel-inner px-2.5 py-2">
              <dt className="text-[11.5px] store-text-muted">{m.k}</dt>
              <dd className={cn('font-mono text-[17px] font-semibold tabular-nums text-[var(--store-ink)]', m.tone)}>{m.v}</dd>
            </div>
          ))}
        </dl>

        <div className="seg sm w-full [&>button]:flex-1" role="group" aria-label="Conflict type">
          <button type="button" aria-pressed={view === 'fratricide'} onClick={() => onViewChange('fratricide')}>
            Own jammers <span className="font-mono ml-1">{report.counts.fratricide}</span>
          </button>
          <button type="button" aria-pressed={view === 'enemy'} onClick={() => onViewChange('enemy')}>
            Enemy EW <span className="font-mono ml-1">{report.counts.enemy}</span>
          </button>
          <button type="button" aria-pressed={view === 'all'} onClick={() => onViewChange('all')}>
            All
          </button>
        </div>

        {noOwnDrones ? (
          <p className="text-[12.5px] leading-relaxed store-text-body">
            No own drones on the laydown. Place a Blue drone, or load the Combat team preset from the laydown bar.
          </p>
        ) : noJammers ? (
          <p className="text-[12.5px] leading-relaxed store-text-body">
            No jammer on the laydown radiates in drone link bands, so there is nothing to deconflict.
          </p>
        ) : visible.length === 0 ? (
          <p className="text-[12.5px] leading-relaxed store-text-body">
            {view === 'enemy'
              ? 'No enemy jammer reaches an own drone link on this plan.'
              : 'No own jammer cuts an own drone link on this plan.'}
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5" aria-label="Conflicts">
            {visible.map((c) => {
              const selected = c.id === selectedId
              const sev = SEV_TAG[c.severity]
              return (
                <li key={c.id}>
                  <div
                    className={cn(
                      'rounded-[12px] border transition-colors duration-150 ease-out motion-reduce:transition-none',
                      selected
                        ? 'border-[rgba(41,151,255,0.55)] bg-[rgba(41,151,255,0.08)]'
                        : 'border-[var(--glass-line)] hover:bg-[rgba(255,255,255,0.04)]',
                    )}
                  >
                    <button
                      type="button"
                      aria-expanded={selected}
                      onClick={() => onSelect(selected ? null : c)}
                      className="w-full text-left px-3 py-2.5"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className={cn('tag shrink-0', sev.cls)}>{sev.word}</span>
                        {c.kind === 'enemy_ew' ? <span className="tag shrink-0">Enemy EW</span> : null}
                        <span className="text-[13px] font-semibold text-[var(--store-ink)] truncate" title={c.droneName}>
                          {c.droneName}
                        </span>
                      </span>
                      <span className="block mt-1.5 text-[12.5px] leading-snug store-text-body">{c.summary}</span>
                      <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[11.5px] store-text-muted tabular-nums">
                        <span>{windowText(c)}</span>
                        <span>{c.links.map((l) => fmtBand(l.lo_mhz, l.hi_mhz)).join(', ')}</span>
                        <span>{c.jamBands[0]?.mode === 'hpm' ? 'HPM' : `J/S ${Math.round(c.max_js_db)} dB`}</span>
                      </span>
                    </button>
                    {selected ? (
                      <div className="px-3 pb-3 pt-0.5 space-y-2">
                        <p className="text-[11.5px] store-text-muted">
                          Jammer {c.jammerName}, footprint{' '}
                          <span className="font-mono">{(c.footprint_m / 1000).toFixed(1)} km</span>. Links:{' '}
                          {c.links.map((l) => l.label).join('; ')}.
                        </p>
                        {c.mitigations.length === 0 ? (
                          <p className="text-[12px] store-text-body">
                            No mitigation in the plan data. Re-task the drone, move the jammer, or accept the risk.
                          </p>
                        ) : (
                          <ul className="flex flex-col gap-1.5" aria-label="Mitigations">
                            {c.mitigations.map((m) => (
                              <li key={m.id} className="flex items-start gap-2.5 rounded-[10px] store-panel-inner px-2.5 py-2">
                                <span className="tag blue shrink-0 mt-px">{MITIGATION_WORD[m.kind]}</span>
                                <span className="min-w-0 flex-1">
                                  <span className="block text-[12.5px] font-medium text-[var(--store-ink)]">{m.label}</span>
                                  <span className="block mt-0.5 text-[11.5px] leading-snug store-text-muted">{m.detail}</span>
                                </span>
                                <button
                                  type="button"
                                  className="btn-e xs shrink-0"
                                  onClick={() => onApply(m.patch, m.label)}
                                >
                                  Apply
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {report.skipped.length > 0 ? (
          <CardSection title="Not checked">
            <ul className="text-[12px] store-text-body space-y-0.5">
              {report.skipped.map((s) => (
                <li key={s.id} className="flex justify-between gap-3">
                  <span className="truncate" title={s.name}>
                    {s.name}
                  </span>
                  <span className="store-text-muted shrink-0">{s.reason}</span>
                </li>
              ))}
            </ul>
          </CardSection>
        ) : null}

        <CardSection
          title="Assumptions"
          aside={
            <button type="button" className="fc-action text-[12px]" onClick={() => setShowAssumptions((v) => !v)}>
              {showAssumptions ? 'Hide' : 'Edit'}
            </button>
          }
        >
          {showAssumptions ? (
            <div className="space-y-2.5">
              <Field label="Link lost at J/S" hint={`${options.jsThreshold_db} dB`}>
                <input
                  type="range"
                  min={0}
                  max={20}
                  step={1}
                  value={options.jsThreshold_db}
                  onChange={(e) => onOptionsChange({ jsThreshold_db: Number(e.target.value) })}
                  className={rangeClass}
                  aria-label="J/S threshold in dB"
                />
              </Field>
              <Field label="Ground station ERP" hint={`${options.groundErp_dbm} dBm`}>
                <input
                  type="range"
                  min={20}
                  max={40}
                  step={1}
                  value={options.groundErp_dbm}
                  onChange={(e) => onOptionsChange({ groundErp_dbm: Number(e.target.value) })}
                  className={rangeClass}
                  aria-label="Ground station ERP in dBm"
                />
              </Field>
              <Field label="Drone transmitter ERP" hint={`${options.droneErp_dbm} dBm`}>
                <input
                  type="range"
                  min={14}
                  max={33}
                  step={1}
                  value={options.droneErp_dbm}
                  onChange={(e) => onOptionsChange({ droneErp_dbm: Number(e.target.value) })}
                  className={rangeClass}
                  aria-label="Drone transmitter ERP in dBm"
                />
              </Field>
            </div>
          ) : null}
          <ul className="mt-1.5 list-disc pl-4 text-[11.5px] leading-snug store-text-muted space-y-0.5">
            {report.assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </CardSection>
      </div>
    </MapCard>
  )
}
