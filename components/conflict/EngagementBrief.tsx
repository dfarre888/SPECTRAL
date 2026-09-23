'use client'

/** Two-sided reading of an incident: what defeats the attacker, and how the attacker avoids it. */
import { useState } from 'react'
import Link from 'next/link'
import type { EngagementBrief as Brief, DefenceOption } from '@/lib/conflicts/engagement-brief'

type Side = 'defend' | 'attack'

function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}

function pkColour(o: DefenceOption): string {
  if (o.immune) return 'var(--wb-red)'
  return o.pk >= 70 ? '#4ADE80' : o.pk >= 40 ? '#FBBF24' : 'var(--wb-red)'
}

function OptionRow({ o, max }: { o: DefenceOption; max: number }) {
  const w = `${Math.max(2, (o.pk / max) * 100)}%`
  const colour = pkColour(o)
  return (
    <tr>
      <td>
        <span className="block text-[13px] text-[var(--store-ink)] font-medium">{o.system.name}</span>
        <span className="meta font-mono">
          {o.method} · {o.system.effective_range_m ? `${o.system.effective_range_m.toLocaleString('en-AU')} m` : 'range n/a'}
          {o.conflictValidated ? <span className="text-[#6EE7A0]"> · conflict-validated</span> : null}
        </span>
      </td>
      <td>
        <span className="flex items-center gap-3">
          <span className="relative block h-1.5 flex-1 min-w-[72px] rounded-full bg-[rgba(142,142,147,0.22)]" aria-hidden>
            <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: o.immune ? '2%' : w, background: colour, transition: 'width 250ms cubic-bezier(.22,1,.36,1)' }} />
          </span>
          <span className="w-[56px] text-right text-[13px] font-mono tabular-nums" style={{ color: colour }}>{o.immune ? 'Immune' : `${o.pk}%`}</span>
        </span>
      </td>
      <td className="num" title={o.chain.finding}>{pct(o.chain.cumulativePk)}</td>
      <td className="num">{pct(o.salvo3.cumulativePk)}</td>
    </tr>
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
    <section className="store-panel rounded-2xl p-6 space-y-5" aria-label="Engagement brief">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-[16px] store-display font-semibold tracking-[-0.01em] text-[var(--store-ink)] m-0 mr-1">Engagement brief</h3>
        {attacker ? (
          <div className="seg" role="group" aria-label="Side">
            <button type="button" aria-pressed={side === 'defend'} onClick={() => setSide('defend')}>Defend against it</button>
            <button type="button" aria-pressed={side === 'attack'} onClick={() => setSide('attack')}>Employ it</button>
          </div>
        ) : null}
        {brief.attackers.length > 1 ? (
          <div className="seg sm ml-auto" role="group" aria-label="Platform">
            {brief.attackers.map((a) => (
              <button key={a.platform.id} type="button" aria-pressed={attacker?.platform.id === a.platform.id} onClick={() => setOpenId(a.platform.id)}>{a.platform.name}</button>
            ))}
          </div>
        ) : null}
      </div>

      {!attacker ? (
        <p className="text-[13px] store-text-body m-0">
          {brief.defendersNamed.length ? `Named systems: ${brief.defendersNamed.map((d) => d.name).join(', ')}. ` : ''}
          No threat platform from this incident is in the library{brief.unmatched.length ? ` (unmatched: ${brief.unmatched.join(', ')})` : ''}.
        </p>
      ) : (
        <div className="space-y-6">
          <div className="pb-5 border-b fc-hair">
            <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
              <div className="min-w-0">
                <div className="text-[15px] font-semibold text-[var(--store-ink)] leading-snug text-balance">{attacker.platform.name}</div>
                <div className="text-[12px] store-text-muted mt-1">
                  {attacker.platform.country_of_origin ?? ''}{attacker.platform.manufacturer ? ` · ${attacker.platform.manufacturer}` : ''}
                </div>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1 pt-0.5">
                <Link href={`/platforms/${attacker.platform.id}`} className="text-[13px] text-[var(--wb-blue)] hover:underline">Open platform dossier</Link>
                <Link href={`/defeat`} className="text-[13px] text-[var(--wb-blue)] hover:underline">Open in Defeat Matrix</Link>
              </div>
            </div>
            {attacker.facts.length ? (
              <dl className="mt-4 grid grid-cols-2 sm:grid-cols-3 2xl:grid-cols-6 gap-x-6 gap-y-3 m-0">
                {attacker.facts.map((f) => (
                  <div key={f.label} className="min-w-0">
                    <dt className="text-[11.5px] store-text-muted">{f.label}</dt>
                    <dd className="text-[13px] text-[var(--store-ink)] m-0 mt-0.5 font-mono tabular-nums truncate" title={f.value}>{f.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {brief.defendersNamed.length ? <p className="text-[12px] store-text-muted mt-3 mb-0">Named defenders: {brief.defendersNamed.map((d) => d.name).join(', ')}</p> : null}
          </div>
          <div className="min-w-0">
            {side === 'defend' ? (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-3">
                  <span className="text-[13px] store-text-body">What defeats it, ranked by adjudicated single-engagement Pk</span>
                  <span className="text-[12px] font-mono tabular-nums store-text-muted">{options.length} systems in matrix</span>
                </div>
                {options.length ? (
                  <div className="rounded-xl border border-[var(--lacquer-line)] overflow-x-auto">
                    <table className="dt compact min-w-[560px] table-fixed">
                      <colgroup>
                        <col />
                        <col style={{ width: '34%' }} />
                        <col style={{ width: 96 }} />
                        <col style={{ width: 96 }} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th scope="col">System</th>
                          <th scope="col">Single-engagement Pk</th>
                          <th scope="col" className="text-right" title="Detect × track × engage">Kill chain</th>
                          <th scope="col" className="text-right">Salvo of 3</th>
                        </tr>
                      </thead>
                      <tbody>
                        {options.slice(0, 8).map((o) => <OptionRow key={o.system.id} o={o} max={max} />)}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-[13px] store-text-muted py-3 m-0">The defeat matrix has no adjudication for this platform yet.</p>
                )}
                {top ? (
                  <div className="mt-5 space-y-2 max-w-[78ch]">
                    <p className="text-[13px] text-[var(--store-ink)] m-0 text-pretty">{top.chain.finding}</p>
                    {top.response ? <p className="text-[13px] store-text-body m-0 text-pretty"><span className="store-text-muted">Recommended response: </span>{top.response}</p> : null}
                    {top.rationale ? <p className="text-[12px] store-text-muted m-0 text-pretty">{top.rationale}</p> : null}
                    <p className="text-[11.5px] store-text-muted m-0 pt-1">
                      Chain = detect × track × engage; band <span className="font-mono tabular-nums">{pct(top.chain.band.lo)} to {pct(top.chain.band.hi)}</span> ({top.chain.confidence}). Detect and track are OSINT stand-ins stated per stage.
                    </p>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <p className="text-[13px] store-text-body m-0 mb-3">Employing it: what to route around and what it can survive</p>
                <ul className="space-y-2 pl-4 m-0 list-disc marker:text-[var(--store-ink-mute)] max-w-[78ch]">
                  {(brief.exploit[attacker.platform.id] ?? []).map((x) => <li key={x} className="text-[13px] store-text-body text-pretty">{x}</li>)}
                  {options.filter((o) => o.pk >= 70).slice(0, 3).map((o) => (
                    <li key={o.system.id} className="text-[13px] text-[var(--wb-red)]">
                      Avoid {o.system.name}: <span className="font-mono tabular-nums">{o.pk}%</span> {o.method}{o.conflictValidated ? ', conflict-validated' : ''}
                    </li>
                  ))}
                </ul>
                {attacker.resilience.length ? (
                  <div className="mt-5">
                    <div className="text-[12px] store-text-muted mb-2">Resilience from the library record</div>
                    <ul className="space-y-1.5 pl-4 m-0 list-disc marker:text-[var(--store-ink-mute)] max-w-[78ch]">
                      {attacker.resilience.map((r) => <li key={r} className="text-[13px] store-text-body text-pretty">{r}</li>)}
                    </ul>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
