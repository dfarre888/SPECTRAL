'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Plane, Ship, Mountain } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { StorePanel } from '@/components/ui/store-surface'
import { SendToMapBar } from '@/components/force/SendToMapBar'
import { confidenceVariant } from '@/lib/force/effects'
import { FORCE_EFFECT_LABEL, type ForceDomain, type ForcePlatform, type NationForce } from '@/lib/force/types'

const DOMAIN_ICON = { air: Plane, ground: Mountain, maritime: Ship }

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

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {force.domain.map((d) => {
          const Icon = DOMAIN_ICON[d.domain]
          return (
            <button
              key={d.domain}
              type="button"
              onClick={() => setDomain(domain === d.domain ? 'all' : d.domain)}
              className="text-left"
            >
              <StorePanel className={`p-4 ${domain === d.domain ? 'border-[var(--store-accent-border)]' : ''}`}>
                <div className="mb-2 flex items-center gap-2">
                  <Icon className="h-4 w-4 text-[var(--store-accent)]" />
                  <p className="text-[10px] font-mono uppercase store-text-muted">{d.domain}</p>
                </div>
                <p className="font-mono text-2xl font-bold text-white tabular-nums">{d.count}</p>
                <p className="text-[10px] font-mono store-text-muted">
                  {d.high} high · {d.medium} med · {d.estimated} est
                </p>
              </StorePanel>
            </button>
          )
        })}
      </div>

      <StorePanel className="p-4">
        <p className="mb-2 text-[10px] font-mono uppercase tracking-wider store-text-muted">Effects</p>
        <div className="grid gap-2 md:grid-cols-2">
          {force.effects.map((e) => (
            <div key={e.effect} className="flex justify-between gap-3 text-xs">
              <span className="store-text-body">{FORCE_EFFECT_LABEL[e.effect]}</span>
              <span className="font-mono text-white tabular-nums">{e.count}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[10px] store-text-muted">
          {force.comms_count} comms rows · {force.sensors_count} sensors · type count is catalog depth, not ORBAT strength.
        </p>
      </StorePanel>

      {force.linked_uas.length > 0 && (
        <StorePanel className="p-4">
          <p className="mb-2 text-[10px] font-mono uppercase tracking-wider store-text-muted">Linked UAS (Spectral library)</p>
          <div className="flex flex-wrap gap-2">
            {force.linked_uas.slice(0, 16).map((u) => (
              <Link
                key={u.id}
                href={`/platforms/${u.id}`}
                className="rounded-md border border-[var(--store-line)] px-2 py-1 text-[11px] text-cyan hover:underline"
              >
                {u.name}
              </Link>
            ))}
          </div>
        </StorePanel>
      )}

      {force.linked_cuas.length > 0 && (
        <StorePanel className="p-4">
          <p className="mb-2 text-[10px] font-mono uppercase tracking-wider store-text-muted">Linked C-UAS</p>
          <div className="flex flex-wrap gap-2">
            {force.linked_cuas.slice(0, 12).map((u) => (
              <Link
                key={u.id}
                href={`/defeat?system=${u.id}`}
                className="rounded-md border border-[var(--store-line)] px-2 py-1 text-[11px] text-white"
              >
                {u.name}
              </Link>
            ))}
          </div>
        </StorePanel>
      )}

      <SendToMapBar blue={blue} red={red} selectedIds={selected} />

      <div className="overflow-x-auto rounded-2xl border border-[var(--store-line)]">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="bg-[var(--store-surface-2)] font-mono text-[10px] uppercase store-text-muted">
            <tr>
              <th className="px-3 py-2">Pkg</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Domain</th>
              <th className="px-3 py-2">Effect</th>
              <th className="px-3 py-2">Conf</th>
              <th className="px-3 py-2">Comms / sensors</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <PlatformRow key={p.id} platform={p} checked={selected.includes(p.id)} onToggle={() => toggle(p.id)} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PlatformRow({
  platform,
  checked,
  onToggle,
}: {
  platform: ForcePlatform
  checked: boolean
  onToggle: () => void
}) {
  return (
    <tr className="border-t border-[var(--store-line)]">
      <td className="px-3 py-2">
        <input type="checkbox" checked={checked} onChange={onToggle} aria-label={`Select ${platform.short_name}`} />
      </td>
      <td className="px-3 py-2">
        <p className="font-medium text-white">{platform.designation}</p>
        <p className="font-mono text-[10px] store-text-muted">
          {platform.short_name}
          {platform.ioc_year ? ` · IOC ${platform.ioc_year}` : ''}
          {platform.program_stage ? ` · ${platform.program_stage}` : ''}
        </p>
      </td>
      <td className="px-3 py-2 font-mono store-text-body">{platform.domain}</td>
      <td className="px-3 py-2 store-text-body">{FORCE_EFFECT_LABEL[platform.effect]}</td>
      <td className="px-3 py-2">
        <Badge variant={confidenceVariant(platform.nato_confidence)}>{platform.nato_confidence}</Badge>
      </td>
      <td className="px-3 py-2 font-mono store-text-muted">
        {platform.comms.length}/{platform.sensors.length}
        {platform.linked_uas[0] ? (
          <>
            {' · '}
            <Link href={`/platforms/${platform.linked_uas[0].id}`} className="text-cyan hover:underline">
              UAS
            </Link>
          </>
        ) : null}
      </td>
    </tr>
  )
}
