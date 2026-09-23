'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { DataTable, type DataColumn } from '@/components/ui/DataTable'
import { StorePanel } from '@/components/ui/store-surface'
import { ConfidenceTag } from '@/components/force/ConfidenceTag'
import { SendToMapBar } from '@/components/force/SendToMapBar'
import { FORCE_EFFECT_LABEL, type ForceDomain, type ForcePlatform, type NationForce } from '@/lib/force/types'

const DOMAIN_LABEL: Record<ForceDomain, string> = { air: 'Air', ground: 'Ground', maritime: 'Maritime' }
const CONF_RANK: Record<string, number> = { Confirmed: 0, Assessed: 1, Reported: 2, Suspected: 3, Estimated: 4 }

interface CountryOrbatClientProps {
  force: NationForce
  compareDefault: string
}

export function CountryOrbatClient({ force, compareDefault }: CountryOrbatClientProps) {
  const [selected, setSelected] = useState<string[]>(() =>
    force.platforms.filter((p) => p.effect === 'find' || p.effect === 'shield').slice(0, 8).map((p) => p.id),
  )
  const [domain, setDomain] = useState<ForceDomain | 'all'>('all')

  const rows = useMemo(
    () => (domain === 'all' ? force.platforms : force.platforms.filter((p) => p.domain === domain)),
    [domain, force.platforms],
  )

  const toggle = (id: string) => {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  }

  const red = force.nation.side === 'red' ? force.nation.code : compareDefault
  const blue = force.nation.side === 'red' ? compareDefault : force.nation.code
  const sideHue = force.nation.side === 'red' ? 'red' : 'blue'
  const maxEffect = Math.max(1, ...force.effects.map((e) => e.count))

  const columns = useMemo<DataColumn<ForcePlatform>[]>(
    () => [
      {
        key: 'type',
        header: 'Type',
        width: 300,
        sticky: true,
        sortValue: (p) => p.designation,
        cell: (p) => {
          const on = selected.includes(p.id)
          return (
            <div className="flex min-w-0 items-center gap-3">
              <input
                type="checkbox"
                checked={on}
                onChange={() => toggle(p.id)}
                aria-label={`Include ${p.short_name} in the package`}
                className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-[var(--wb-blue)]"
              />
              <div className="min-w-0">
                <span className="primary block truncate" title={p.designation}>{p.designation}</span>
                <span className="meta truncate font-mono">
                  {p.short_name}
                  {p.ioc_year ? ` · IOC ${p.ioc_year}` : ''}
                  {p.program_stage ? ` · ${p.program_stage.replace(/_/g, ' ')}` : ''}
                </span>
              </div>
            </div>
          )
        },
      },
      {
        key: 'domain',
        header: 'Domain',
        width: 110,
        sortValue: (p) => p.domain,
        cell: (p) => <span className="mono">{p.domain}</span>,
      },
      {
        key: 'effect',
        header: 'Effect',
        width: 210,
        sortValue: (p) => FORCE_EFFECT_LABEL[p.effect],
        cell: (p) => FORCE_EFFECT_LABEL[p.effect],
      },
      {
        key: 'conf',
        header: 'Confidence',
        width: 130,
        sortValue: (p) => CONF_RANK[p.nato_confidence] ?? 9,
        cell: (p) => <ConfidenceTag nato={p.nato_confidence} />,
      },
      {
        key: 'comms',
        header: 'Comms',
        width: 90,
        align: 'right',
        sortValue: (p) => p.comms.length,
        cell: (p) => <span className={p.comms.length ? 'text-[var(--store-ink)]' : 'store-text-muted'}>{p.comms.length}</span>,
      },
      {
        key: 'sensors',
        header: 'Sensors',
        width: 90,
        align: 'right',
        sortValue: (p) => p.sensors.length,
        cell: (p) => <span className={p.sensors.length ? 'text-[var(--store-ink)]' : 'store-text-muted'}>{p.sensors.length}</span>,
      },
      {
        key: 'linked',
        header: 'Spectral library',
        width: 150,
        cell: (p) =>
          p.linked_uas[0] ? (
            <Link href={`/platforms/${p.linked_uas[0].id}`} className="text-[var(--wb-blue)] hover:underline">
              Linked UAS
            </Link>
          ) : (
            <span className="store-text-muted">Not linked</span>
          ),
      },
    ],
    // Selection drives the checkbox state; toggle only closes over setSelected.
    [selected],
  )

  return (
    <div className="space-y-6">
      {/* Headline numbers: catalogue depth by domain, then linkage. */}
      <div className="fc-inst border-y fc-hair" aria-label="Force instruments">
        <div>
          <div className="k">Catalogue types</div>
          <div className={`v ${sideHue}`}>{force.catalog_count}</div>
          <div className="d">{force.comms_count} comms rows · {force.sensors_count} sensors</div>
        </div>
        {force.domain.map((d) => (
          <div key={d.domain}>
            <div className="k">{DOMAIN_LABEL[d.domain]}</div>
            <div className="v">{d.count}</div>
            <div className="d">{d.high} high · {d.medium} med · {d.estimated} est</div>
          </div>
        ))}
        <div>
          <div className="k">Linked in Spectral</div>
          <div className="v">{force.linked_uas.length}</div>
          <div className="d">UAS · {force.linked_cuas.length} C-UAS systems</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <StorePanel className="p-5">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <p className="wb-pane-title">Effects</p>
            <p className="text-[12px] store-text-muted">Type count is catalogue depth, not ORBAT strength</p>
          </div>
          <ul className="space-y-2.5">
            {force.effects.map((e) => (
              <li key={e.effect} className="grid grid-cols-[minmax(0,1fr)_minmax(80px,40%)_36px] items-center gap-3 text-[13px]">
                <span className="truncate store-text-body">{FORCE_EFFECT_LABEL[e.effect]}</span>
                <span className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${(e.count / maxEffect) * 100}%`, background: `var(--wb-${sideHue})` }}
                  />
                </span>
                <span className="text-right font-mono tabular-nums text-[var(--store-ink)]">{e.count}</span>
              </li>
            ))}
          </ul>
        </StorePanel>

        <StorePanel className="space-y-4 p-5">
          <div>
            <div className="mb-2.5 flex items-baseline justify-between gap-3">
              <p className="wb-pane-title">Linked UAS</p>
              <p className="text-[12px] store-text-muted">Spectral platform library</p>
            </div>
            {force.linked_uas.length ? (
              <div className="flex flex-wrap gap-1.5">
                {force.linked_uas.slice(0, 16).map((u) => (
                  <Link key={u.id} href={`/platforms/${u.id}`} className="btn-e xs" title={u.name}>
                    <span className="max-w-[240px] truncate">{u.name}</span>
                  </Link>
                ))}
                {force.linked_uas.length > 16 ? (
                  <span className="self-center text-[12px] store-text-muted">+{force.linked_uas.length - 16} more</span>
                ) : null}
              </div>
            ) : (
              <p className="text-[12px] store-text-muted">No UAS linked to this nation yet.</p>
            )}
          </div>
          <div className="border-t border-[var(--store-line)] pt-4">
            <p className="wb-pane-title mb-2.5">Linked C-UAS</p>
            {force.linked_cuas.length ? (
              <div className="flex flex-wrap gap-1.5">
                {force.linked_cuas.slice(0, 12).map((u) => (
                  <Link key={u.id} href={`/defeat?system=${u.id}`} className="btn-e xs" title={u.name}>
                    <span className="max-w-[240px] truncate">{u.name}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-[12px] store-text-muted">No C-UAS systems linked to this nation yet.</p>
            )}
          </div>
        </StorePanel>
      </div>

      <SendToMapBar blue={blue} red={red} selectedIds={selected} />

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="seg sm" role="group" aria-label="Filter by domain">
            <button type="button" aria-pressed={domain === 'all'} onClick={() => setDomain('all')}>
              All <span className="font-mono tabular-nums opacity-70">{force.platforms.length}</span>
            </button>
            {force.domain.map((d) => (
              <button
                key={d.domain}
                type="button"
                aria-pressed={domain === d.domain}
                onClick={() => setDomain(d.domain)}
              >
                {DOMAIN_LABEL[d.domain]} <span className="font-mono tabular-nums opacity-70">{d.count}</span>
              </button>
            ))}
          </div>
          <p className="ml-auto text-[12px] store-text-muted">
            <span className="font-mono tabular-nums text-[var(--store-ink)]">{selected.length}</span> in the package · tick a row to add or remove it
          </p>
        </div>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(p) => p.id}
          caption={`${force.nation.name} catalogue types`}
          compact
        />
      </div>
    </div>
  )
}
