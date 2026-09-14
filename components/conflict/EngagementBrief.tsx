'use client'

/** Two-sided reading of an incident: what defeats the attacker, and how the attacker avoids it. */
import { useState } from 'react'
import Link from 'next/link'
import type { EngagementBrief as Brief, DefenceOption } from '@/lib/conflicts/engagement-brief'

type Side = 'defend' | 'attack'

function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}

function OptionRow({ o, max }: { o: DefenceOption; max: number }) {
  const w = `${Math.max(2, (o.pk / max) * 100)}%`
  const colour = o.immune ? 'var(--wb-red)' : o.pk >= 70 ? '#4ADE80' : o.pk >= 40 ? '#FBBF24' : 'var(--wb-red)'
  return (
    <li className="py-2.5 border-b fc-hair grid grid-cols-[minmax(150px,1fr)_minmax(120px,2fr)_auto] gap-x-4 items-center">
      <span className="min-w-0">
        <span className="block text-[13px] text-[var(--store-ink)] truncate">{o.system.name}</span>
        <span className="block text-[11px] font-mono store-text-muted truncate">
          {o.method} · {o.system.effective_range_m ? `${o.system.effective_range_m} m` : 'range n/a'}{o.conflictValidated ? ' · conflict-validated' : ''}
        </span>
      </span>
      <span className="relative block h-1.5 rounded-full bg-[var(--store-surface-3)]">
        <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: w, background: colour, transition: 'width 250ms cubic-bezier(.22,1,.36,1)' }} />
      </span>
      <span className="text-right">
        <span className="block text-[13px] font-mono tabular-nums" style={{ color: colour }}>{o.immune ? 'immune' : `${o.pk}%`}</span>
        <span className="block text-[11px] font-mono store-text-muted" title={o.chain.finding}>
          chain {pct(o.chain.cumulativePk)} · ×3 {pct(o.salvo3.cumulativePk)}
        </span>
      </span>
    </li>
  )
}

export function EngagementBrief({ brief }: { brief: Brief }) {
  const [side, setSide] = useState<Side>('defend')
  const [openId, setOpenId] = useState<string | null>(brief.attackers[0]?.platform.id ?? null)
  const attacker = brief.attackers.find((a) => a.platform.id === openId) ?? brief.attackers[0] ?? null
  const options = attacker ? brief.options[attacker.platform.id] ?? [] : []
  const max = Math.max(1, ...options.map((o) => o.pk))
  const top = options[0]

  return (
    <section className="pt-5 border-t fc-hair space-y-4" aria-label="Engagement brief">
      <div className="flex flex-wrap items-center gap-2">
        <span className="wb-pane-title">Engagement brief</span>
        <div className="flex gap-2 ml-2" role="group" aria-label="Side">
          <button type="button" aria-pressed={side === 'defend'} onClick={() => setSide('defend')} className="btn-e sm">Defend against it</button>
          <button type="button" aria-pressed={side === 'attack'} onClick={() => setSide('attack')} className="btn-e sm">Employ it</button>
        </div>
        {brief.attackers.length > 1 ? (
          <div className="flex gap-2 ml-auto" role="group" aria-label="Platform">
            {brief.attackers.map((a) => (
              <button key={a.platform.id} type="button" aria-pressed={openId === a.platform.id} onClick={() => setOpenId(a.platform.id)} className="btn-e xs font-mono">{a.platform.name}</button>
            ))}
          </div>
        ) : null}
      </div>

      {!attacker ? (
        <p className="text-[12px] store-text-muted">
          {brief.defendersNamed.length ? `Named systems: ${brief.defendersNamed.map((d) => d.name).join(', ')}. ` : ''}
          No threat platform from this incident is in the library{brief.unmatched.length ? ` (unmatched: ${brief.unmatched.join(', ')})` : ''}.
        </p>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            {side === 'defend' ? (
              <>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-[12px] store-text-body">What defeats {attacker.platform.name}, ranked by adjudicated single-engagement Pk</span>
                  <span className="text-[11px] font-mono store-text-muted">{options.length} systems in matrix</span>
                </div>
                {options.length ? (
                  <ul>{options.slice(0, 8).map((o) => <OptionRow key={o.system.id} o={o} max={max} />)}</ul>
                ) : (
                  <p className="text-[12px] store-text-muted py-3">The defeat matrix has no adjudication for this platform yet.</p>
                )}
                {top ? (
                  <div className="mt-4 space-y-1.5">
                    <p className="text-[12px] text-[var(--store-ink)] m-0">{top.chain.finding}</p>
                    {top.response ? <p className="text-[12px] store-text-body m-0"><span className="store-text-muted">Recommended response: </span>{top.response}</p> : null}
                    {top.rationale ? <p className="text-[12px] store-text-muted m-0 text-pretty">{top.rationale}</p> : null}
                    <p className="text-[11px] font-mono store-text-muted m-0">Chain = detect × track × engage; band {pct(top.chain.band.lo)}–{pct(top.chain.band.hi)} ({top.chain.confidence}). Detect and track are OSINT stand-ins stated per stage.</p>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <span className="text-[12px] store-text-body block mb-1">Employing {attacker.platform.name}: what to route around and what it can survive</span>
                <ul className="space-y-1.5 pl-4 list-disc marker:text-[var(--store-ink-mute)]">
                  {(brief.exploit[attacker.platform.id] ?? []).map((x) => <li key={x} className="text-[12px] store-text-body">{x}</li>)}
                  {options.filter((o) => o.pk >= 70).slice(0, 3).map((o) => (
                    <li key={o.system.id} className="text-[12px] text-[var(--wb-red)]">Avoid {o.system.name}: {o.pk}% {o.method}{o.conflictValidated ? ', conflict-validated' : ''}</li>
                  ))}
                </ul>
                {attacker.resilience.length ? (
                  <div className="mt-4">
                    <div className="text-[11px] store-text-muted mb-1">Resilience from the library record</div>
                    <ul className="space-y-1 pl-4 list-disc marker:text-[var(--store-ink-mute)]">{attacker.resilience.map((r) => <li key={r} className="text-[12px] store-text-body">{r}</li>)}</ul>
                  </div>
                ) : null}
              </>
            )}
          </div>

          <aside className="lg:border-l fc-hair lg:pl-6 min-w-0">
            <div className="text-[15px] store-display font-semibold tracking-[-0.01em] text-[var(--store-ink)] leading-tight">{attacker.platform.name}</div>
            <div className="text-[11px] font-mono store-text-muted mt-0.5">{attacker.platform.country_of_origin ?? ''}{attacker.platform.manufacturer ? ` · ${attacker.platform.manufacturer}` : ''}</div>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[11px] font-mono m-0">
              {attacker.facts.map((f) => (<><dt key={`${f.label}-k`} className="store-text-muted">{f.label}</dt><dd key={`${f.label}-v`} className="text-[var(--store-ink)] m-0 tabular-nums">{f.value}</dd></>))}
            </dl>
            <div className="mt-3 flex flex-col gap-1">
              <Link href={`/platforms/${attacker.platform.id}`} className="text-[12px] text-[var(--wb-blue)] hover:underline">Open platform dossier</Link>
              <Link href={`/defeat`} className="text-[12px] text-[var(--wb-blue)] hover:underline">Open in Defeat Matrix</Link>
              {brief.defendersNamed.length ? <span className="text-[11px] font-mono store-text-muted mt-1">Named defenders: {brief.defendersNamed.map((d) => d.name).join(', ')}</span> : null}
            </div>
          </aside>
        </div>
      )}
    </section>
  )
}
