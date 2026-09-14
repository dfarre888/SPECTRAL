'use client'

/** Inspector: the right pane. Mode follows the last click. */
import { useState } from 'react'
import { X } from 'lucide-react'
import type { ForceCatalogPlatformFull } from '@/lib/bmi/bmi-types'
import { ConfidenceBadge } from '@/components/platforms/ConfidenceBadge'
import { variantLabel } from '@/lib/coalition/link-variants'
import type { InteropResult } from '@/lib/coalition/interop'
import type { CoverageRow } from '@/lib/force-catalog/coverage-model'
import { findNet } from '@/lib/force-catalog/coverage-model'
import { BAND_KIND, sensorBands } from '@/lib/force-catalog/spectrum-bands'
import { TalkGraph } from './TalkGraph'

export type InspectorMode =
  | { type: 'platform'; platform: ForceCatalogPlatformFull }
  | { type: 'capability'; row: CoverageRow; holders: ForceCatalogPlatformFull[] }
  | { type: 'net'; row: CoverageRow }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h3 className="text-[11px] uppercase tracking-wider store-text-muted">{title}</h3>
      {children}
    </div>
  )
}

function BenchButton({ id, benched, onBench, onRestore }: { id: string; benched: boolean; onBench: (ids: string[]) => void; onRestore: (ids: string[]) => void }) {
  return benched ? (
    <button type="button" onClick={() => onRestore([id])} className="text-[11px] font-mono px-2 py-1 min-h-8 rounded border store-line store-text-muted hover:store-text-body">Restore</button>
  ) : (
    <button type="button" onClick={() => onBench([id])} className="text-[11px] font-mono px-2 py-1 min-h-8 rounded border store-line store-text-muted hover:store-text-body">Bench</button>
  )
}

export function Inspector({
  mode,
  platforms,
  benched,
  interop,
  denied,
  onBench,
  onRestore,
  onSelect,
  onClose,
}: {
  mode: InspectorMode | null
  platforms: ForceCatalogPlatformFull[]
  benched: Set<string>
  interop: InteropResult
  denied: InteropResult
  onBench: (ids: string[]) => void
  onRestore: (ids: string[]) => void
  onSelect: (p: ForceCatalogPlatformFull) => void
  onClose: () => void
}) {
  const [gnssDenied, setGnssDenied] = useState(false)

  return (
    <aside className="store-panel rounded-2xl flex flex-col min-h-0" aria-label="Inspector">
      <header className="flex items-center gap-2 px-3 py-2 border-b store-line">
        <span className="wb-pane-title">
          {mode?.type === 'platform' ? 'Platform' : mode?.type === 'net' ? 'Comms net' : mode?.type === 'capability' ? 'Capability' : 'Inspector'}
        </span>
        {mode ? (
          <button type="button" onClick={onClose} aria-label="Close inspector" className="ml-auto h-7 w-7 inline-flex items-center justify-center rounded store-text-muted hover:store-text-body hover:bg-[var(--store-surface-2)]">
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : null}
      </header>

      <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-4">
        {!mode ? (
          <p className="text-[11px] font-mono store-text-muted text-pretty pt-6 text-center">
            Click a platform, a coverage row or a comms net.
          </p>
        ) : null}

        {mode?.type === 'platform' ? (() => {
          const p = mode.platform
          const tier = interop.tierByPlatform[p.id] ?? 'none'
          return (
            <>
              <div className="space-y-1">
                <div className="flex items-start gap-2">
                  <div className="min-w-0">
                    <h2 className="text-[15px] store-display text-[var(--store-ink)] leading-tight text-balance">{p.short_name}</h2>
                    <p className="text-[11px] font-mono store-text-muted truncate">{p.designation} · {p.nation_code} · {p.force_side}</p>
                  </div>
                  <div className="ml-auto shrink-0 flex items-center gap-1.5">
                    <ConfidenceBadge confidence={p.data_confidence} />
                    <BenchButton id={p.id} benched={benched.has(p.id)} onBench={onBench} onRestore={onRestore} />
                  </div>
                </div>
                <p className="text-[11px] font-mono store-text-muted">Best tier: <span className="store-text-body">{tier}</span></p>
              </div>

              <Section title={`Sensors · ${p.sensors.length || 'none listed'}`}>
                {p.sensors.length === 0 ? <p className="text-[11px] font-mono store-text-muted">No sensors in the open-source dossier (OSINT gap), not proof of none.</p> : null}
                {p.sensors.map((s) => (
                  <div key={s.id} className="rounded-lg border store-line px-2.5 py-2 space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[12px] store-text-body">{s.label}</span>
                      <span className="ml-auto text-[11px] font-mono store-text-muted">{s.kind}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {sensorBands(s).map((b) => {
                        const k = BAND_KIND[b] ?? 'rf'
                        const c = k === 'ir' ? 'var(--wb-ir)' : k === 'optical' ? 'var(--wb-optical)' : 'var(--wb-rf)'
                        return <span key={b} className="text-[11px] font-mono px-1.5 py-0.5 rounded border" style={{ borderColor: c, color: c }}>{b}</span>
                      })}
                      {sensorBands(s).length === 0 ? <span className="text-[11px] font-mono store-text-muted">band not stated</span> : null}
                    </div>
                    {s.can_detect.length ? <p className="text-[11px] font-mono store-text-muted">detects {s.can_detect.join(', ')}</p> : null}
                    {s.cannot_detect.length ? <p className="text-[11px] font-mono store-text-muted">not {s.cannot_detect.join(', ')}</p> : null}
                  </div>
                ))}
              </Section>

              <Section title={`Comms · ${p.comms.length || 'none listed'}`}>
                {p.comms.map((c) => (
                  <div key={c.id} className="rounded-lg border store-line px-2.5 py-2 space-y-0.5">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[12px] store-text-body">{c.label}</span>
                      <span className="ml-auto text-[11px] font-mono store-text-muted">{c.band}</span>
                    </div>
                    <p className="text-[11px] font-mono store-text-muted">
                      {c.standard ? <>{c.standard} · {variantLabel(c.standard, c.variant)}</> : c.kind}
                      {c.gateway_capable ? ' · gateway' : ''}
                      {c.pnt_dependent ? ' · needs GNSS time' : ''}
                    </p>
                    {c.comsec_note ? <p className="text-[11px] store-text-muted">{c.comsec_note}</p> : null}
                  </div>
                ))}
              </Section>

              {p.sources.length ? (
                <Section title="Sources">
                  <ul className="space-y-0.5">
                    {p.sources.slice(0, 4).map((s) => <li key={s} className="text-[11px] font-mono store-text-muted truncate" title={s}>{s}</li>)}
                  </ul>
                </Section>
              ) : null}
            </>
          )
        })() : null}

        {mode?.type === 'capability' ? (
          <>
            <div>
              <h2 className="text-[15px] store-display text-[var(--store-ink)] leading-tight text-balance">{mode.row.label}</h2>
              <p className="text-[11px] font-mono store-text-muted">{mode.row.active} active · {mode.row.ghost} in scope</p>
            </div>
            <Section title="Holders">
              <ul className="space-y-1">
                {mode.holders.map((p) => (
                  <li key={p.id} className={`flex items-center gap-2 h-8 ${benched.has(p.id) ? 'opacity-60' : ''}`}>
                    <button type="button" onClick={() => onSelect(p)} className={`text-[12px] truncate text-left hover:store-accent ${benched.has(p.id) ? 'line-through store-text-muted' : 'store-text-body'}`}>{p.short_name}</button>
                    <span className="text-[11px] font-mono store-text-muted">{p.nation_code}</span>
                    <span className="ml-auto"><BenchButton id={p.id} benched={benched.has(p.id)} onBench={onBench} onRestore={onRestore} /></span>
                  </li>
                ))}
              </ul>
            </Section>
          </>
        ) : null}

        {mode?.type === 'net' ? (() => {
          const src = gnssDenied ? denied : interop
          const net = findNet(src, mode.row.id)
          const ghostNet = findNet(interop, mode.row.id)
          const tier = mode.row.tier ?? 'voice'
          const islands = src[tier === 'none' ? 'voice' : tier].islands
          const faded = new Set(ghostNet ? ghostNet.memberIds.filter((id) => !net?.memberIds.includes(id)) : [])
          const isl = net ? islands.filter((i) => i.netKeys.includes(net.key)) : []
          return (
            <>
              <div>
                <h2 className="text-[15px] store-display text-[var(--store-ink)] leading-tight text-balance">{mode.row.label}</h2>
                <p className="text-[11px] font-mono store-text-muted">{tier} tier · {net?.memberIds.length ?? 0} active members · {isl.length} island{isl.length === 1 ? '' : 's'}</p>
              </div>
              <label className="flex items-center gap-2 text-[11px] font-mono store-text-muted cursor-pointer">
                <input type="checkbox" checked={gnssDenied} onChange={(e) => setGnssDenied(e.target.checked)} className="accent-[var(--store-accent)]" />
                GNSS denied (pessimistic bound: every PNT-dependent bearer lost)
              </label>
              {net && ghostNet ? (
                <TalkGraph net={ghostNet} islands={interop[tier === 'none' ? 'voice' : tier].islands} platforms={platforms.filter((p) => !benched.has(p.id))} tier={tier === 'none' ? 'voice' : tier} fadedIds={faded} onSelect={onSelect} />
              ) : (
                <p className="text-[11px] font-mono store-text-muted">Nobody active on this net{gnssDenied ? ' once GNSS time is lost' : ''}.</p>
              )}
              {faded.size ? <p className="text-[11px] font-mono store-text-muted">Drops out: {[...faded].map((id) => platforms.find((p) => p.id === id)?.short_name ?? id).join(', ')}</p> : null}
              {isl.length > 1 ? (
                <p className="text-[11px] store-text-muted text-pretty">
                  {isl.length} islands: members share the standard but not a net. Check link variants (HF vs UHF legs) and whether a gateway unit is fitted for both.
                </p>
              ) : null}
            </>
          )
        })() : null}
      </div>
    </aside>
  )
}
